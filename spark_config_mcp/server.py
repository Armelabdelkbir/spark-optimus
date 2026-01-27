"""MCP Server for Spark Configuration Analysis."""

import json
import asyncio
from typing import Any
from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
import mcp.server.stdio

from .spark_config_parser import SparkConfigParser
from .history_server_client import HistoryServerClient
from .config_analyzer import ConfigAnalyzer


# Initialize components
parser = SparkConfigParser()
history_client = HistoryServerClient()
analyzer = ConfigAnalyzer()

# Create MCP server
server = Server("spark-config-analyzer")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools for Spark configuration analysis."""
    return [
        Tool(
            name="parse_spark_config",
            description="Parse Spark configuration files from a Git repository or file path. "
                       "Extracts settings from spark-defaults.conf and spark-submit scripts.",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to configuration file or directory containing Spark configs"
                    },
                    "file_type": {
                        "type": "string",
                        "enum": ["auto", "spark-defaults", "spark-submit", "directory"],
                        "description": "Type of configuration source (auto-detect by default)",
                        "default": "auto"
                    }
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="fetch_app_metrics",
            description="Fetch execution metrics from Spark History Server for a specific application. "
                       "Supports both real History Server API and mock data for demos.",
            inputSchema={
                "type": "object",
                "properties": {
                    "app_identifier": {
                        "type": "string",
                        "description": "Application ID (e.g., app-20260126-001) or application name pattern"
                    },
                    "use_mock": {
                        "type": "boolean",
                        "description": "Use mock data instead of real History Server",
                        "default": True
                    }
                },
                "required": ["app_identifier"]
            }
        ),
        Tool(
            name="analyze_configuration",
            description="Analyze Spark configuration and correlate with execution metrics. "
                       "Uses AI (Gemini) and rule-based analysis to identify issues and generate recommendations.",
            inputSchema={
                "type": "object",
                "properties": {
                    "config_path": {
                        "type": "string",
                        "description": "Path to Spark configuration file or directory"
                    },
                    "app_identifier": {
                        "type": "string",
                        "description": "Optional: Application ID or name to fetch metrics for correlation"
                    },
                    "use_mock_metrics": {
                        "type": "boolean",
                        "description": "Use mock execution metrics for demo",
                        "default": True
                    }
                },
                "required": ["config_path"]
            }
        ),
        Tool(
            name="get_recommendations",
            description="Get prioritized, actionable recommendations for Spark configuration optimization. "
                       "Categorizes recommendations by severity and type (resource allocation, performance tuning, best practices).",
            inputSchema={
                "type": "object",
                "properties": {
                    "config_path": {
                        "type": "string",
                        "description": "Path to Spark configuration file"
                    },
                    "app_identifier": {
                        "type": "string",
                        "description": "Optional: Application ID or name for context"
                    },
                    "severity_filter": {
                        "type": "string",
                        "enum": ["all", "critical", "warning", "info"],
                        "description": "Filter recommendations by severity",
                        "default": "all"
                    },
                    "category_filter": {
                        "type": "string",
                        "enum": ["all", "resource_allocation", "performance_tuning", "best_practices", "reliability"],
                        "description": "Filter recommendations by category",
                        "default": "all"
                    }
                },
                "required": ["config_path"]
            }
        ),
        Tool(
            name="analyze_with_ai",
            description="Bridge tool to get AI optimizations from ANY data source. "
                        "Paste raw JSON or text (e.g. from AWS Spark MCP tools) to get intelligent recommendations.",
            inputSchema={
                "type": "object",
                "properties": {
                    "context": {
                        "type": "string",
                        "description": "Raw data, JSON, or logs to analyze"
                    },
                    "user_question": {
                        "type": "string",
                        "description": "Optional specific question for the AI"
                    }
                },
                "required": ["context"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle tool calls."""
    
    if name == "parse_spark_config":
        path = arguments["path"]
        file_type = arguments.get("file_type", "auto")
        
        try:
            if file_type == "directory":
                configs = parser.parse_directory(path)
                result = {
                    "success": True,
                    "configs": [config.to_dict() for config in configs],
                    "count": len(configs)
                }
            else:
                config = parser.parse_file(path)
                result = {
                    "success": True,
                    "config": config.to_dict()
                }
            
            return [TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({"success": False, "error": str(e)}, indent=2)
            )]
    
    elif name == "fetch_app_metrics":
        app_identifier = arguments["app_identifier"]
        use_mock = arguments.get("use_mock", True)
        
        try:
            # Temporarily override mock setting
            original_mock = history_client.use_mock
            history_client.use_mock = use_mock
            
            metrics = history_client.find_application_by_name(app_identifier)
            
            # Restore original setting
            history_client.use_mock = original_mock
            
            if metrics:
                result = {
                    "success": True,
                    "metrics": metrics.to_dict()
                }
            else:
                result = {
                    "success": False,
                    "error": f"Application '{app_identifier}' not found"
                }
            
            return [TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({"success": False, "error": str(e)}, indent=2)
            )]
    
    elif name == "analyze_configuration":
        config_path = arguments["config_path"]
        app_identifier = arguments.get("app_identifier")
        use_mock_metrics = arguments.get("use_mock_metrics", True)
        
        try:
            # Parse configuration
            config = parser.parse_file(config_path)
            
            # Fetch metrics if app identifier provided
            metrics = None
            if app_identifier:
                original_mock = history_client.use_mock
                history_client.use_mock = use_mock_metrics
                metrics = history_client.find_application_by_name(app_identifier)
                history_client.use_mock = original_mock
            
            # Analyze
            analysis = analyzer.analyze(config, metrics)
            
            result = {
                "success": True,
                "analysis": analysis.to_dict()
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({"success": False, "error": str(e)}, indent=2)
            )]
    
    elif name == "get_recommendations":
        config_path = arguments["config_path"]
        app_identifier = arguments.get("app_identifier")
        severity_filter = arguments.get("severity_filter", "all")
        category_filter = arguments.get("category_filter", "all")
        
        try:
            # Parse and analyze
            config = parser.parse_file(config_path)
            
            metrics = None
            if app_identifier:
                metrics = history_client.find_application_by_name(app_identifier)
            
            analysis = analyzer.analyze(config, metrics)
            
            # Filter recommendations
            recommendations = analysis.recommendations
            
            if severity_filter != "all":
                from .models import RecommendationSeverity
                severity_map = {
                    "critical": RecommendationSeverity.CRITICAL,
                    "warning": RecommendationSeverity.WARNING,
                    "info": RecommendationSeverity.INFO
                }
                recommendations = [r for r in recommendations if r.severity == severity_map[severity_filter]]
            
            if category_filter != "all":
                recommendations = [r for r in recommendations if r.category == category_filter]
            
            result = {
                "success": True,
                "summary": analysis.summary,
                "recommendations": [r.to_dict() for r in recommendations],
                "total_count": len(recommendations),
                "critical_count": len([r for r in recommendations if r.severity.value == "critical"]),
                "warning_count": len([r for r in recommendations if r.severity.value == "warning"]),
                "info_count": len([r for r in recommendations if r.severity.value == "info"])
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({"success": False, "error": str(e)}, indent=2)
            )]
    
    elif name == "analyze_with_ai":
        context = arguments["context"]
        user_question = arguments.get("user_question")
        
        try:
            # Call the new generic analyzer method
            recommendation = analyzer.analyze_text(context, user_question)
            
            result = {
                "success": True,
                "recommendation": recommendation
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({"success": False, "error": str(e)}, indent=2)
            )]
    
    else:
        return [TextContent(
            type="text",
            text=json.dumps({"success": False, "error": f"Unknown tool: {name}"})
        )]


async def main():
    """Run the MCP server."""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
