"""Demo script to showcase the Spark Config Analyzer."""

import json
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from spark_config_mcp.spark_config_parser import SparkConfigParser
from spark_config_mcp.history_server_client import HistoryServerClient
from spark_config_mcp.config_analyzer import ConfigAnalyzer


def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")


def print_config(config):
    """Print configuration details."""
    print(f"📄 Source: {config.source_file}")
    print(f"📱 App Name: {config.app_name or 'N/A'}")
    print(f"🖥️  Master: {config.master or 'N/A'}")
    print(f"🚀 Deploy Mode: {config.deploy_mode or 'N/A'}")
    print(f"\n💾 Resource Allocation:")
    print(f"   Driver Memory:    {config.driver_memory or 'N/A'}")
    print(f"   Executor Memory:  {config.executor_memory or 'N/A'}")
    print(f"   Executor Cores:   {config.executor_cores or 'N/A'}")
    print(f"   Num Executors:    {config.num_executors or 'N/A'}")
    print(f"\n⚡ Parallelism:")
    print(f"   Default Parallelism:  {config.default_parallelism or 'N/A'}")
    print(f"   Shuffle Partitions:   {config.shuffle_partitions or 'N/A'}")
    print(f"   Dynamic Allocation:   {config.dynamic_allocation_enabled}")


def print_metrics(metrics):
    """Print execution metrics."""
    print(f"🆔 App ID: {metrics.app_id}")
    print(f"📱 App Name: {metrics.app_name}")
    print(f"⏱️  Duration: {metrics.duration_ms / 1000 if metrics.duration_ms else 'N/A'} seconds")
    print(f"\n📊 Task Statistics:")
    print(f"   Total Tasks:   {metrics.total_tasks}")
    print(f"   Failed Tasks:  {metrics.failed_tasks}")
    print(f"   Total Stages:  {metrics.total_stages}")
    print(f"   Failed Stages: {metrics.failed_stages}")
    
    if metrics.executor_memory_used:
        print(f"\n💾 Memory Usage:")
        print(f"   Memory Used:    {metrics.executor_memory_used / (1024**3):.2f} GB")
        print(f"   Memory Spilled: {metrics.executor_memory_spilled / (1024**3) if metrics.executor_memory_spilled else 0:.2f} GB")
    
    if metrics.shuffle_read_bytes:
        print(f"\n🔀 Shuffle Metrics:")
        print(f"   Shuffle Read:  {metrics.shuffle_read_bytes / (1024**3):.2f} GB")
        print(f"   Shuffle Write: {metrics.shuffle_write_bytes / (1024**3) if metrics.shuffle_write_bytes else 0:.2f} GB")
    
    if metrics.gc_time_ms:
        print(f"\n🗑️  GC Time: {metrics.gc_time_ms / 1000:.2f} seconds")


def print_recommendations(analysis):
    """Print analysis recommendations."""
    print(f"📝 Summary: {analysis.summary}\n")
    
    # Group by severity
    critical = [r for r in analysis.recommendations if r.severity.value == "critical"]
    warnings = [r for r in analysis.recommendations if r.severity.value == "warning"]
    info = [r for r in analysis.recommendations if r.severity.value == "info"]
    
    if critical:
        print("🔴 CRITICAL ISSUES:")
        for rec in critical:
            print(f"\n   {rec.title}")
            print(f"   Category: {rec.category}")
            if rec.current_value:
                print(f"   Current: {rec.current_value}")
            if rec.recommended_value:
                print(f"   Recommended: {rec.recommended_value}")
            if rec.expected_impact:
                print(f"   Impact: {rec.expected_impact}")
    
    if warnings:
        print("\n⚠️  WARNINGS:")
        for rec in warnings:
            print(f"\n   {rec.title}")
            print(f"   Category: {rec.category}")
            if rec.current_value:
                print(f"   Current: {rec.current_value}")
            if rec.recommended_value:
                print(f"   Recommended: {rec.recommended_value}")
            if rec.expected_impact:
                print(f"   Impact: {rec.expected_impact}")
    
    if info:
        print("\n💡 SUGGESTIONS:")
        for rec in info:
            print(f"\n   {rec.title}")
            print(f"   Category: {rec.category}")
            if rec.current_value:
                print(f"   Current: {rec.current_value}")
            if rec.recommended_value:
                print(f"   Recommended: {rec.recommended_value}")
            if rec.expected_impact:
                print(f"   Impact: {rec.expected_impact}")


def main():
    """Run the demo."""
    print_header("🚀 Spark Configuration Analyzer - Hackathon Demo")
    
    # Initialize components
    parser = SparkConfigParser()
    history_client = HistoryServerClient(use_mock=True)
    analyzer = ConfigAnalyzer()
    
    # Demo 1: Parse spark-submit script
    print_header("Demo 1: Parsing spark-submit Script")
    script_path = os.path.join(os.path.dirname(__file__), "demo_repo", "deploy_job.sh")
    config1 = parser.parse_spark_submit_script(script_path)
    print_config(config1)
    
    # Demo 2: Parse spark-defaults.conf
    print_header("Demo 2: Parsing spark-defaults.conf")
    conf_path = os.path.join(os.path.dirname(__file__), "demo_repo", "spark-defaults.conf")
    config2 = parser.parse_spark_defaults(conf_path)
    print_config(config2)
    
    # Demo 3: Fetch execution metrics
    print_header("Demo 3: Fetching Execution Metrics from History Server")
    print("📡 Connecting to Spark History Server (using mock data)...")
    metrics = history_client.find_application_by_name("Production_Data_Pipeline_v1")
    if metrics:
        print_metrics(metrics)
    else:
        print("❌ No metrics found")
    
    # Demo 4: Analyze configuration with metrics
    print_header("Demo 4: AI-Powered Configuration Analysis")
    print("🤖 Analyzing configuration and correlating with execution metrics...")
    analysis = analyzer.analyze(config1, metrics)
    print_recommendations(analysis)
    
    # Summary
    print_header("📊 Analysis Summary")
    print(f"Total Recommendations: {len(analysis.recommendations)}")
    print(f"Critical Issues: {len([r for r in analysis.recommendations if r.severity.value == 'critical'])}")
    print(f"Warnings: {len([r for r in analysis.recommendations if r.severity.value == 'warning'])}")
    print(f"Suggestions: {len([r for r in analysis.recommendations if r.severity.value == 'info'])}")
    
    print("\n✅ Demo completed successfully!")
    print("\n💡 Next Steps:")
    print("   1. Set GEMINI_API_KEY environment variable for AI-powered insights")
    print("   2. Connect to a real Spark History Server by setting SPARK_HISTORY_SERVER_URL")
    print("   3. Use the MCP server with AI agents for interactive analysis")
    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    main()
