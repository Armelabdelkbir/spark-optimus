"""Data models for Spark configuration analysis."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class RecommendationSeverity(Enum):
    """Severity levels for recommendations."""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


@dataclass
class SparkConfig:
    """Represents parsed Spark configuration."""
    source_file: str
    driver_memory: Optional[str] = None
    executor_memory: Optional[str] = None
    executor_cores: Optional[int] = None
    num_executors: Optional[int] = None
    default_parallelism: Optional[int] = None
    shuffle_partitions: Optional[int] = None
    dynamic_allocation_enabled: bool = False
    app_name: Optional[str] = None
    deploy_mode: Optional[str] = None
    master: Optional[str] = None
    raw_configs: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "source_file": self.source_file,
            "driver_memory": self.driver_memory,
            "executor_memory": self.executor_memory,
            "executor_cores": self.executor_cores,
            "num_executors": self.num_executors,
            "default_parallelism": self.default_parallelism,
            "shuffle_partitions": self.shuffle_partitions,
            "dynamic_allocation_enabled": self.dynamic_allocation_enabled,
            "app_name": self.app_name,
            "deploy_mode": self.deploy_mode,
            "master": self.master,
            "raw_configs": self.raw_configs
        }


@dataclass
class ExecutionMetrics:
    """Represents execution metrics from Spark History Server."""
    app_id: str
    app_name: str
    duration_ms: Optional[int] = None
    total_tasks: int = 0
    failed_tasks: int = 0
    total_stages: int = 0
    failed_stages: int = 0
    executor_memory_used: Optional[int] = None  # bytes
    executor_memory_spilled: Optional[int] = None  # bytes
    shuffle_read_bytes: Optional[int] = None
    shuffle_write_bytes: Optional[int] = None
    input_bytes: Optional[int] = None
    output_bytes: Optional[int] = None
    peak_memory_usage: Optional[int] = None
    gc_time_ms: Optional[int] = None
    raw_metrics: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "app_id": self.app_id,
            "app_name": self.app_name,
            "duration_ms": self.duration_ms,
            "total_tasks": self.total_tasks,
            "failed_tasks": self.failed_tasks,
            "total_stages": self.total_stages,
            "failed_stages": self.failed_stages,
            "executor_memory_used": self.executor_memory_used,
            "executor_memory_spilled": self.executor_memory_spilled,
            "shuffle_read_bytes": self.shuffle_read_bytes,
            "shuffle_write_bytes": self.shuffle_write_bytes,
            "input_bytes": self.input_bytes,
            "output_bytes": self.output_bytes,
            "peak_memory_usage": self.peak_memory_usage,
            "gc_time_ms": self.gc_time_ms,
            "raw_metrics": self.raw_metrics
        }


@dataclass
class Recommendation:
    """Represents a single recommendation."""
    severity: RecommendationSeverity
    category: str  # e.g., "resource_allocation", "performance_tuning", "best_practices"
    title: str
    description: str
    current_value: Optional[str] = None
    recommended_value: Optional[str] = None
    expected_impact: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "severity": self.severity.value,
            "category": self.category,
            "title": self.title,
            "description": self.description,
            "current_value": self.current_value,
            "recommended_value": self.recommended_value,
            "expected_impact": self.expected_impact
        }


@dataclass
class AnalysisResult:
    """Complete analysis result with recommendations."""
    config: SparkConfig
    metrics: Optional[ExecutionMetrics] = None
    recommendations: List[Recommendation] = field(default_factory=list)
    summary: str = ""
    analyzed_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "config": self.config.to_dict(),
            "metrics": self.metrics.to_dict() if self.metrics else None,
            "recommendations": [r.to_dict() for r in self.recommendations],
            "summary": self.summary,
            "analyzed_at": self.analyzed_at
        }
    
    def get_critical_recommendations(self) -> List[Recommendation]:
        """Get only critical recommendations."""
        return [r for r in self.recommendations if r.severity == RecommendationSeverity.CRITICAL]
    
    def get_by_category(self, category: str) -> List[Recommendation]:
        """Get recommendations by category."""
        return [r for r in self.recommendations if r.category == category]
