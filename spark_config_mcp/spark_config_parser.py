"""Parser for Spark configuration files and scripts."""

import re
import os
from pathlib import Path
from typing import List, Optional
from .models import SparkConfig


class SparkConfigParser:
    """Parses Spark configuration from various sources."""
    
    @staticmethod
    def parse_memory_to_mb(memory_str: str) -> Optional[int]:
        """Convert memory string (e.g., '20g', '512m') to MB."""
        if not memory_str:
            return None
        
        memory_str = memory_str.lower().strip()
        match = re.match(r'(\d+(?:\.\d+)?)\s*([kmgt]?)b?', memory_str)
        
        if not match:
            return None
        
        value, unit = match.groups()
        value = float(value)
        
        multipliers = {
            '': 1,  # bytes
            'k': 1 / 1024,
            'm': 1,
            'g': 1024,
            't': 1024 * 1024
        }
        
        return int(value * multipliers.get(unit, 1))
    
    def parse_spark_defaults(self, file_path: str) -> SparkConfig:
        """Parse spark-defaults.conf file."""
        config = SparkConfig(source_file=file_path)
        
        if not os.path.exists(file_path):
            return config
        
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                
                # Skip comments and empty lines
                if not line or line.startswith('#'):
                    continue
                
                # Parse key-value pairs (space or = separated)
                parts = re.split(r'\s+|=', line, maxsplit=1)
                if len(parts) != 2:
                    continue
                
                key, value = parts[0].strip(), parts[1].strip()
                config.raw_configs[key] = value
                
                # Extract known configurations
                if key == 'spark.driver.memory':
                    config.driver_memory = value
                elif key == 'spark.executor.memory':
                    config.executor_memory = value
                elif key == 'spark.executor.cores':
                    config.executor_cores = int(value)
                elif key == 'spark.executor.instances':
                    config.num_executors = int(value)
                elif key == 'spark.default.parallelism':
                    config.default_parallelism = int(value)
                elif key == 'spark.sql.shuffle.partitions':
                    config.shuffle_partitions = int(value)
                elif key == 'spark.dynamicAllocation.enabled':
                    config.dynamic_allocation_enabled = value.lower() == 'true'
                elif key == 'spark.app.name':
                    config.app_name = value
        
        return config
    
    def parse_spark_submit_script(self, file_path: str) -> SparkConfig:
        """Parse spark-submit script to extract configuration."""
        config = SparkConfig(source_file=file_path)
        
        if not os.path.exists(file_path):
            return config
        
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        # Join lines that end with backslash
        command_lines = []
        i = 0
        while i < len(lines):
            line = lines[i].rstrip('\n')
            # If line ends with backslash, join with next lines
            while line.endswith('\\') and i + 1 < len(lines):
                line = line[:-1].strip() + ' ' + lines[i + 1].strip().rstrip('\n')
                i += 1
            command_lines.append(line)
            i += 1
        
        # Find the spark-submit command
        full_command = ' '.join(command_lines)
        
        # Extract APP_NAME variable if present
        app_name_match = re.search(r'APP_NAME=["\'](.*?)["\']', full_command)
        if app_name_match:
            config.app_name = app_name_match.group(1)
        
        # Parse command-line arguments
        patterns = {
            'master': r'--master\s+(\S+)',
            'deploy_mode': r'--deploy-mode\s+(\S+)',
            'driver_memory': r'--driver-memory\s+(\S+)',
            'executor_memory': r'--executor-memory\s+(\S+)',
            'executor_cores': r'--executor-cores\s+(\d+)',
            'num_executors': r'--num-executors\s+(\d+)',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, full_command)
            if match:
                value = match.group(1)
                if key in ['executor_cores', 'num_executors']:
                    setattr(config, key, int(value))
                else:
                    setattr(config, key, value)
        
        # Parse --conf flags
        conf_pattern = r'--conf\s+([^\s=]+)=(\S+)'
        for match in re.finditer(conf_pattern, full_command):
            key, value = match.groups()
            config.raw_configs[key] = value
            
            if key == 'spark.default.parallelism':
                config.default_parallelism = int(value)
            elif key == 'spark.sql.shuffle.partitions':
                config.shuffle_partitions = int(value)
            elif key == 'spark.dynamicAllocation.enabled':
                config.dynamic_allocation_enabled = value.lower() == 'true'
        
        # Check for --name flag if app_name not set
        if not config.app_name:
            name_flag_match = re.search(r'--name\s+(\S+)', full_command)
            if name_flag_match:
                config.app_name = name_flag_match.group(1)
        
        return config
    
    def parse_directory(self, directory: str) -> List[SparkConfig]:
        """Parse all Spark configuration files in a directory."""
        configs = []
        dir_path = Path(directory)
        
        if not dir_path.exists():
            return configs
        
        # Look for spark-defaults.conf files
        for conf_file in dir_path.rglob('spark-defaults.conf'):
            configs.append(self.parse_spark_defaults(str(conf_file)))
        
        # Look for shell scripts that might contain spark-submit
        for script_file in dir_path.rglob('*.sh'):
            with open(script_file, 'r') as f:
                if 'spark-submit' in f.read():
                    configs.append(self.parse_spark_submit_script(str(script_file)))
        
        return configs
    
    def parse_file(self, file_path: str) -> SparkConfig:
        """Parse a single configuration file (auto-detect type)."""
        if file_path.endswith('spark-defaults.conf'):
            return self.parse_spark_defaults(file_path)
        elif file_path.endswith('.sh'):
            return self.parse_spark_submit_script(file_path)
        else:
            # Try to detect based on content
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    content = f.read()
                    if 'spark-submit' in content:
                        return self.parse_spark_submit_script(file_path)
            
            return self.parse_spark_defaults(file_path)
