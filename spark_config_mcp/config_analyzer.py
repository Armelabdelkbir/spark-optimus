"""AI-powered configuration analyzer using Gemini."""

import os
from datetime import datetime
from typing import Optional
from .models import SparkConfig, ExecutionMetrics, AnalysisResult, Recommendation, RecommendationSeverity


class ConfigAnalyzer:
    """Analyzes Spark configurations and generates recommendations."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the analyzer with OpenAI API.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.client = None
        
        if self.api_key:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key)
            except Exception as e:
                print(f"Warning: Could not initialize OpenAI API: {e}")
    
    def _create_analysis_prompt(self, config: SparkConfig, metrics: Optional[ExecutionMetrics]) -> str:
        """Create a detailed prompt for OpenAI analysis."""
        prompt = f"""You are a Spark performance expert. Analyze the following Spark configuration and execution metrics, then provide specific recommendations.

**Configuration Details:**
- Source: {config.source_file}
- App Name: {config.app_name or 'N/A'}
- Master: {config.master or 'N/A'}
- Deploy Mode: {config.deploy_mode or 'N/A'}
- Driver Memory: {config.driver_memory or 'N/A'}
- Executor Memory: {config.executor_memory or 'N/A'}
- Executor Cores: {config.executor_cores or 'N/A'}
- Number of Executors: {config.num_executors or 'N/A'}
- Default Parallelism: {config.default_parallelism or 'N/A'}
- Shuffle Partitions: {config.shuffle_partitions or 'N/A'}
- Dynamic Allocation: {config.dynamic_allocation_enabled}
"""
        
        if config.raw_configs:
            prompt += f"\n**Additional Configurations:**\n"
            for key, value in config.raw_configs.items():
                prompt += f"- {key}: {value}\n"
        
        if metrics:
            prompt += f"""
**Execution Metrics:**
- Application ID: {metrics.app_id}
- Duration: {metrics.duration_ms / 1000 if metrics.duration_ms else 'N/A'} seconds
- Total Tasks: {metrics.total_tasks}
- Failed Tasks: {metrics.failed_tasks}
- Total Stages: {metrics.total_stages}
- Failed Stages: {metrics.failed_stages}
- Executor Memory Used: {self._format_bytes(metrics.executor_memory_used)}
- Memory Spilled: {self._format_bytes(metrics.executor_memory_spilled)}
- Shuffle Read: {self._format_bytes(metrics.shuffle_read_bytes)}
- Shuffle Write: {self._format_bytes(metrics.shuffle_write_bytes)}
- Input Data: {self._format_bytes(metrics.input_bytes)}
- Output Data: {self._format_bytes(metrics.output_bytes)}
- GC Time: {metrics.gc_time_ms / 1000 if metrics.gc_time_ms else 'N/A'} seconds
"""
        
        prompt += """
**Your Task:**
Provide a structured analysis with:

1. **SUMMARY**: Brief overview of the configuration quality (2-3 sentences)

2. **CRITICAL ISSUES**: List any critical problems that severely impact performance
   Format: [CRITICAL] Category | Title | Current: X | Recommended: Y | Impact: Z

3. **WARNINGS**: List important issues that should be addressed
   Format: [WARNING] Category | Title | Current: X | Recommended: Y | Impact: Z

4. **SUGGESTIONS**: List optimization opportunities
   Format: [INFO] Category | Title | Current: X | Recommended: Y | Impact: Z

Categories should be one of: resource_allocation, performance_tuning, best_practices, reliability

Focus on:
- Resource allocation efficiency (driver/executor memory, cores)
- Parallelism and partition tuning
- Memory management and spilling
- GC overhead
- Dynamic allocation benefits
- Common anti-patterns
- Cost optimization

Be specific with numbers and provide actionable recommendations.
"""
        
        return prompt
    
    def _format_bytes(self, bytes_value: Optional[int]) -> str:
        """Format bytes to human-readable string."""
        if bytes_value is None:
            return 'N/A'
        
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_value < 1024.0:
                return f"{bytes_value:.2f} {unit}"
            bytes_value /= 1024.0
        return f"{bytes_value:.2f} PB"
    
    def _parse_openai_response(self, response_text: str) -> tuple[str, list[Recommendation]]:
        """Parse the OpenAI chat response into structured format."""
        recommendations = []
        summary = ""
        
        lines = response_text.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            
            # Extract summary
            if 'SUMMARY' in line.upper() or (not summary and line and not line.startswith('[') and not line.startswith('#')):
                if not summary and line and not any(x in line.upper() for x in ['CRITICAL', 'WARNING', 'INFO', 'SUGGESTION']):
                    summary = line.replace('**SUMMARY**:', '').replace('SUMMARY:', '').strip()
                    continue
            
            # Parse recommendations
            if line.startswith('[CRITICAL]'):
                severity = RecommendationSeverity.CRITICAL
            elif line.startswith('[WARNING]'):
                severity = RecommendationSeverity.WARNING
            elif line.startswith('[INFO]'):
                severity = RecommendationSeverity.INFO
            else:
                continue
            
            # Parse format: [SEVERITY] Category | Title | Current: X | Recommended: Y | Impact: Z
            parts = line.split('|')
            if len(parts) >= 2:
                category_part = parts[0].split(']', 1)[1].strip() if ']' in parts[0] else 'general'
                title = parts[1].strip() if len(parts) > 1 else ''
                
                current_value = None
                recommended_value = None
                impact = None
                
                for part in parts[2:]:
                    part = part.strip()
                    if part.lower().startswith('current:'):
                        current_value = part.split(':', 1)[1].strip()
                    elif part.lower().startswith('recommended:'):
                        recommended_value = part.split(':', 1)[1].strip()
                    elif part.lower().startswith('impact:'):
                        impact = part.split(':', 1)[1].strip()
                
                recommendations.append(Recommendation(
                    severity=severity,
                    category=category_part.lower().replace(' ', '_'),
                    title=title,
                    description=f"{title}. {impact if impact else ''}",
                    current_value=current_value,
                    recommended_value=recommended_value,
                    expected_impact=impact
                ))
        
        if not summary:
            summary = "Configuration analyzed. See recommendations below."
        
        return summary, recommendations
    
    def analyze(self, config: SparkConfig, metrics: Optional[ExecutionMetrics] = None) -> AnalysisResult:
        """
        Analyze configuration and generate recommendations.
        
        Args:
            config: Parsed Spark configuration
            metrics: Optional execution metrics from History Server
            
        Returns:
            AnalysisResult with recommendations
        """
        result = AnalysisResult(
            config=config,
            metrics=metrics,
            analyzed_at=datetime.now().isoformat()
        )
        
        # Add rule-based recommendations (always available)
        result.recommendations.extend(self._rule_based_analysis(config, metrics))
        
        # Add AI-powered recommendations if OpenAI is available
        if self.client:
            try:
                prompt = self._create_analysis_prompt(config, metrics)
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a Spark performance expert."},
                        {"role": "user", "content": prompt}
                    ]
                )
                summary, ai_recommendations = self._parse_openai_response(response.choices[0].message.content)
                result.summary = summary
                result.recommendations.extend(ai_recommendations)
            except Exception as e:
                print(f"Warning: OpenAI analysis failed: {e}")
                result.summary = "Configuration analyzed using rule-based system."
        else:
            result.summary = "Configuration analyzed using rule-based system. Set OPENAI_API_KEY for AI-powered insights."
        
        return result
    
    def _rule_based_analysis(self, config: SparkConfig, metrics: Optional[ExecutionMetrics]) -> list[Recommendation]:
        """Generate recommendations using rule-based heuristics."""
        recommendations = []
        
        # Check driver memory
        if config.driver_memory:
            driver_mb = self._parse_memory_mb(config.driver_memory)
            if driver_mb and driver_mb > 10240:  # > 10GB
                recommendations.append(Recommendation(
                    severity=RecommendationSeverity.CRITICAL,
                    category="resource_allocation",
                    title="Excessive Driver Memory",
                    description="Driver memory is oversized for typical workloads. This wastes resources and increases costs.",
                    current_value=config.driver_memory,
                    recommended_value="2g-4g",
                    expected_impact="Reduce resource waste and costs by 50-75%"
                ))
        
        # Check shuffle partitions
        if config.shuffle_partitions and config.shuffle_partitions > 200:
            if metrics and metrics.input_bytes:
                input_gb = metrics.input_bytes / (1024**3)
                if input_gb < 10:  # Small dataset
                    recommendations.append(Recommendation(
                        severity=RecommendationSeverity.WARNING,
                        category="performance_tuning",
                        title="Inefficient Shuffle Partitions",
                        description="Too many shuffle partitions for dataset size causes overhead.",
                        current_value=str(config.shuffle_partitions),
                        recommended_value="50-100",
                        expected_impact="Reduce shuffle overhead by 30-40%"
                    ))
        
        # Check dynamic allocation
        if not config.dynamic_allocation_enabled:
            recommendations.append(Recommendation(
                severity=RecommendationSeverity.INFO,
                category="best_practices",
                title="Enable Dynamic Allocation",
                description="Dynamic allocation can optimize resource usage automatically.",
                current_value="false",
                recommended_value="true",
                expected_impact="Better resource utilization and cost savings"
            ))
        
        # Check memory spilling
        if metrics and metrics.executor_memory_spilled:
            spill_ratio = metrics.executor_memory_spilled / max(metrics.executor_memory_used or 1, 1)
            if spill_ratio > 0.1:  # > 10% spilling
                recommendations.append(Recommendation(
                    severity=RecommendationSeverity.WARNING,
                    category="performance_tuning",
                    title="High Memory Spilling",
                    description="Significant memory spilling detected. Increase executor memory.",
                    current_value=config.executor_memory or "unknown",
                    recommended_value="Increase by 50%",
                    expected_impact="Reduce disk I/O and improve performance by 20-30%"
                ))
        
        return recommendations
    
    def _parse_memory_mb(self, memory_str: str) -> Optional[int]:
        """Parse memory string to MB."""
        import re
        match = re.match(r'(\d+)([kmgt]?)', memory_str.lower())
        if not match:
            return None
        
        value = int(match.group(1))
        unit = match.group(2)
        
        multipliers = {'': 1, 'k': 1, 'm': 1, 'g': 1024, 't': 1024*1024}
        return value * multipliers.get(unit, 1)
