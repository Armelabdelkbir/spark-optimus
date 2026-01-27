# 🚀 Spark Configuration Analyzer - Agent-Based Evaluation System

An intelligent system that analyzes Apache Spark configurations from Git repositories and correlates them with real-time execution data from the Spark History Server. Built as an MCP (Model Context Protocol) server for seamless AI agent integration.

## 🎯 Features

- **📄 Configuration Parsing**: Automatically parse `spark-defaults.conf` files and `spark-submit` scripts
- **📊 Metrics Integration**: Fetch real-time execution data from Spark History Server REST API
- **🤖 AI-Powered Analysis**: Use OpenAI to generate intelligent recommendations
- **🔍 Rule-Based Validation**: Built-in heuristics for common Spark anti-patterns
- **🎭 Demo Mode**: Works standalone with mock data for presentations
- **🔧 MCP Server**: Expose tools for AI agents to interact with Spark configurations

## 🏗️ Architecture

```
┌─────────────────┐
│  Git Repository │
│  (Spark Configs)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Config Parser  │      │ History Server   │
│                 │      │  REST API        │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         └────────┬───────────────┘
                  ▼
         ┌────────────────┐
         │   MCP Server   │
         │  (4 Tools)     │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │   AI Agent     │
         │   (OpenAI)     │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Recommendations│
         └────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- (Optional) Google AI API key for Gemini
- (Optional) Access to Spark History Server

### Installation

```bash
# Clone or navigate to the project
cd agent-spark

# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies and setup environment
uv venv
source .venv/bin/activate
uv pip install -e .

# (Optional) Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Run the Demo

```bash
# Run the standalone demo
uv run demo_agent.py
```

This will:
1. Parse the sample `deploy_job.sh` script
2. Parse the `spark-defaults.conf` file
3. Fetch mock execution metrics
4. Generate AI-powered recommendations

### Run as MCP Server

```bash
# Start the MCP server
uv run -m spark_config_mcp.server
```

The server exposes 4 tools for AI agents:
- `parse_spark_config` - Parse configuration files
- `fetch_app_metrics` - Get execution metrics
- `analyze_configuration` - Full analysis with OpenAI
- `get_recommendations` - Filtered recommendations

## 📚 MCP Tools Documentation

### 1. parse_spark_config

Parse Spark configuration files from a repository or file.

**Input:**
```json
{
  "path": "/path/to/config/file",
  "file_type": "auto"  // auto, spark-defaults, spark-submit, directory
}
```

**Output:**
```json
{
  "success": true,
  "config": {
    "source_file": "deploy_job.sh",
    "driver_memory": "20g",
    "executor_memory": "8g",
    "executor_cores": 4,
    "num_executors": 10,
    ...
  }
}
```

### 2. fetch_app_metrics

Fetch execution metrics from Spark History Server.

**Input:**
```json
{
  "app_identifier": "app-20260126-001",  // or app name pattern
  "use_mock": true
}
```

**Output:**
```json
{
  "success": true,
  "metrics": {
    "app_id": "app-20260126-001",
    "duration_ms": 1800000,
    "total_tasks": 500,
    "executor_memory_spilled": 5368709120,
    ...
  }
}
```

### 3. analyze_configuration

Perform comprehensive analysis with AI.

**Input:**
```json
{
  "config_path": "/path/to/config",
  "app_identifier": "Production_Pipeline",  // optional
  "use_mock_metrics": true
}
```

**Output:**
```json
{
  "success": true,
  "analysis": {
    "summary": "Configuration has critical issues...",
    "recommendations": [
      {
        "severity": "critical",
        "category": "resource_allocation",
        "title": "Excessive Driver Memory",
        "current_value": "20g",
        "recommended_value": "4g",
        "expected_impact": "Reduce costs by 75%"
      }
    ]
  }
}
```

### 4. get_recommendations

Get filtered, prioritized recommendations.

**Input:**
```json
{
  "config_path": "/path/to/config",
  "severity_filter": "critical",  // all, critical, warning, info
  "category_filter": "all"  // all, resource_allocation, performance_tuning, etc.
}
```

## 🎯 Use Cases

### Hackathon Demo

Perfect for demonstrating:
- ✅ Works without real Spark cluster
- ✅ Mock data included
- ✅ Instant analysis results
- ✅ Visual recommendations

### Real-World Integration

Connect to production systems:
1. Set `SPARK_HISTORY_SERVER_URL` to your History Server
2. Set `USE_MOCK_DATA=false`
3. Point to your Git repository with Spark configs
4. Get real-time recommendations

### CI/CD Integration

Add to your pipeline:
```bash
# Analyze configs before deployment
python -c "
from spark_config_mcp.spark_config_parser import SparkConfigParser
from spark_config_mcp.config_analyzer import ConfigAnalyzer

parser = SparkConfigParser()
analyzer = ConfigAnalyzer()

config = parser.parse_file('deploy_job.sh')
analysis = analyzer.analyze(config)

critical = [r for r in analysis.recommendations if r.severity.value == 'critical']
if critical:
    print('CRITICAL ISSUES FOUND!')
    exit(1)
"
# Start the AWS Community MCP for Spark
uv run -m mcp_apache_spark_history_server
```

## 📁 Project Structure

```
agent-spark/
├── spark_config_mcp/          # Main package
│   ├── __init__.py
│   ├── server.py              # MCP server
│   ├── models.py              # Data models
│   ├── spark_config_parser.py # Config parser
│   ├── history_server_client.py # API client
│   └── config_analyzer.py     # AI analyzer
├── demo_repo/                 # Sample configs
│   ├── deploy_job.sh          # Spark-submit script
│   └── spark-defaults.conf    # Config file
├── mock_data/                 # Demo data
│   └── history_server_response.json
├── demo_agent.py              # Standalone demo
├── requirements.txt
├── pyproject.toml
└── README.md
```

## 🔧 Configuration

### Environment Variables

- `OPENAI_API_KEY` - OpenAI API key (optional, enables AI analysis)
- `SPARK_HISTORY_SERVER_URL` - History Server URL (default: `http://localhost:18080`)
- `USE_MOCK_DATA` - Use mock data (default: `true`)

## 🎨 Example Output

```
🔴 CRITICAL ISSUES:

   Excessive Driver Memory
   Category: resource_allocation
   Current: 20g
   Recommended: 4g
   Impact: Reduce resource waste and costs by 75%

⚠️  WARNINGS:

   Inefficient Shuffle Partitions
   Category: performance_tuning
   Current: 200
   Recommended: 50-100
   Impact: Reduce shuffle overhead by 30-40%

💡 SUGGESTIONS:

   Enable Dynamic Allocation
   Category: best_practices
   Current: false
   Recommended: true
   Impact: Better resource utilization and cost savings
```

## 🤝 Contributing

This is a hackathon project! Feel free to:
- Add more rule-based checks
- Improve AI prompts
- Add support for more config formats
- Enhance the demo

## 📝 License

MIT License - feel free to use for your hackathon or production!

## 🎓 Hackathon Tips

### Presentation Points

1. **Problem**: Spark configs are complex, often misconfigured, wasting resources
2. **Solution**: AI-powered analysis that correlates configs with actual performance
3. **Innovation**: MCP server enables any AI agent to analyze Spark configs
4. **Impact**: Reduce cloud costs, improve performance, prevent issues

### Demo Flow

1. Show the bad config (`deploy_job.sh` with 20GB driver memory)
2. Run the analyzer
3. Show critical recommendations
4. Explain the cost/performance impact
5. (Bonus) Show MCP server integration with AI agent

### Key Differentiators

- ✅ **Agent-based**: Works with any AI agent via MCP
- ✅ **Correlation**: Links configs to actual execution metrics
- ✅ **Actionable**: Specific recommendations, not just warnings
- ✅ **Production-ready**: Works with real History Server
- ✅ **Demo-friendly**: Mock data for presentations

## 🚀 Next Steps

1. **Add more parsers**: Support for Databricks notebooks, EMR configs
2. **Historical analysis**: Track config changes over time
3. **Cost estimation**: Calculate actual $ savings
4. **Auto-fix**: Generate optimized configs automatically
5. **Dashboard**: Web UI for visualization

---

**Built for hackathons, ready for production!** 🎉
