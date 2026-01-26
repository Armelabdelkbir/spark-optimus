"""Client for Spark History Server REST API."""

import json
import os
from typing import List, Optional, Dict, Any
from .models import ExecutionMetrics


class HistoryServerClient:
    """Client to fetch execution metrics from Spark History Server."""
    
    def __init__(self, base_url: Optional[str] = None, use_mock: bool = False):
        """
        Initialize the History Server client.
        
        Args:
            base_url: Base URL of Spark History Server (e.g., http://localhost:18080)
            use_mock: If True, use mock data instead of real API calls
        """
        self.base_url = base_url or os.getenv('SPARK_HISTORY_SERVER_URL', 'http://localhost:18080')
        self.use_mock = use_mock or os.getenv('USE_MOCK_DATA', 'true').lower() == 'true'
        self.api_version = 'v1'
    
    def _get_mock_metrics(self, app_id: str) -> Optional[ExecutionMetrics]:
        """Return mock metrics for demo purposes."""
        # Check if mock data file exists
        mock_file = os.path.join(os.path.dirname(__file__), '..', 'mock_data', 'history_server_response.json')
        
        if os.path.exists(mock_file):
            with open(mock_file, 'r') as f:
                mock_data = json.load(f)
                
            # Find matching application
            for app in mock_data.get('applications', []):
                if app['id'] == app_id or app.get('name', '') == app_id:
                    return self._parse_metrics(app)
        
        # Default mock data if file doesn't exist
        return ExecutionMetrics(
            app_id=app_id,
            app_name="Production_Data_Pipeline_v1",
            duration_ms=1800000,  # 30 minutes
            total_tasks=500,
            failed_tasks=5,
            total_stages=10,
            failed_stages=0,
            executor_memory_used=60 * 1024 * 1024 * 1024,  # 60GB
            executor_memory_spilled=5 * 1024 * 1024 * 1024,  # 5GB spilled
            shuffle_read_bytes=20 * 1024 * 1024 * 1024,  # 20GB
            shuffle_write_bytes=15 * 1024 * 1024 * 1024,  # 15GB
            input_bytes=50 * 1024 * 1024 * 1024,  # 50GB
            output_bytes=30 * 1024 * 1024 * 1024,  # 30GB
            peak_memory_usage=75 * 1024 * 1024 * 1024,  # 75GB
            gc_time_ms=120000,  # 2 minutes GC time
            raw_metrics={
                "executorCount": 10,
                "driverMemory": "20g",
                "executorMemory": "8g",
                "memorySpillage": "high",
                "gcTimePercentage": 6.67
            }
        )
    
    def _parse_metrics(self, app_data: Dict[str, Any]) -> ExecutionMetrics:
        """Parse application data into ExecutionMetrics."""
        metrics = ExecutionMetrics(
            app_id=app_data.get('id', ''),
            app_name=app_data.get('name', ''),
            raw_metrics=app_data
        )
        
        # Parse attempts (use the latest attempt)
        attempts = app_data.get('attempts', [])
        if attempts:
            latest_attempt = attempts[-1]
            metrics.duration_ms = latest_attempt.get('duration')
        
        # Parse executor metrics if available
        executor_summary = app_data.get('executorSummary', {})
        if executor_summary:
            metrics.executor_memory_used = executor_summary.get('memoryUsed', 0)
            metrics.executor_memory_spilled = executor_summary.get('diskUsed', 0)
        
        # Parse stage metrics
        stages = app_data.get('stages', [])
        metrics.total_stages = len(stages)
        metrics.failed_stages = sum(1 for s in stages if s.get('status') == 'FAILED')
        
        # Aggregate task metrics
        for stage in stages:
            metrics.total_tasks += stage.get('numTasks', 0)
            metrics.failed_tasks += stage.get('numFailedTasks', 0)
            
            # Aggregate shuffle metrics
            if 'shuffleReadBytes' in stage:
                metrics.shuffle_read_bytes = (metrics.shuffle_read_bytes or 0) + stage['shuffleReadBytes']
            if 'shuffleWriteBytes' in stage:
                metrics.shuffle_write_bytes = (metrics.shuffle_write_bytes or 0) + stage['shuffleWriteBytes']
            if 'inputBytes' in stage:
                metrics.input_bytes = (metrics.input_bytes or 0) + stage['inputBytes']
            if 'outputBytes' in stage:
                metrics.output_bytes = (metrics.output_bytes or 0) + stage['outputBytes']
        
        return metrics
    
    def get_application_metrics(self, app_id: str) -> Optional[ExecutionMetrics]:
        """
        Fetch metrics for a specific application.
        
        Args:
            app_id: Application ID or name pattern
            
        Returns:
            ExecutionMetrics object or None if not found
        """
        if self.use_mock:
            return self._get_mock_metrics(app_id)
        
        try:
            import requests
            
            # Try to fetch from real History Server
            url = f"{self.base_url}/api/{self.api_version}/applications/{app_id}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                app_data = response.json()
                return self._parse_metrics(app_data)
            else:
                print(f"Failed to fetch metrics: {response.status_code}")
                return self._get_mock_metrics(app_id)
                
        except Exception as e:
            print(f"Error fetching from History Server: {e}")
            print("Falling back to mock data...")
            return self._get_mock_metrics(app_id)
    
    def list_applications(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        List recent applications.
        
        Args:
            limit: Maximum number of applications to return
            
        Returns:
            List of application summaries
        """
        if self.use_mock:
            mock_file = os.path.join(os.path.dirname(__file__), '..', 'mock_data', 'history_server_response.json')
            if os.path.exists(mock_file):
                with open(mock_file, 'r') as f:
                    mock_data = json.load(f)
                    return mock_data.get('applications', [])[:limit]
            
            return [{
                "id": "app-20260126-001",
                "name": "Production_Data_Pipeline_v1",
                "startTime": "2026-01-26T14:00:00Z",
                "endTime": "2026-01-26T14:30:00Z"
            }]
        
        try:
            import requests
            
            url = f"{self.base_url}/api/{self.api_version}/applications"
            response = requests.get(url, params={'limit': limit}, timeout=5)
            
            if response.status_code == 200:
                return response.json()
            else:
                return []
                
        except Exception as e:
            print(f"Error listing applications: {e}")
            return []
    
    def find_application_by_name(self, name_pattern: str) -> Optional[ExecutionMetrics]:
        """
        Find application by name pattern and return its metrics.
        
        Args:
            name_pattern: Application name or pattern to search for
            
        Returns:
            ExecutionMetrics for the first matching application
        """
        apps = self.list_applications(limit=100)
        
        for app in apps:
            if name_pattern.lower() in app.get('name', '').lower():
                return self.get_application_metrics(app['id'])
        
        # If no match found, try using the pattern as app_id
        return self.get_application_metrics(name_pattern)
