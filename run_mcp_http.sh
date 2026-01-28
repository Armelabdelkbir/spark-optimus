#!/bin/bash
export PATH=$PATH:/home/armel/.local/bin
# Simple script to run the official Kubeflow Spark History MCP server over HTTP

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv not found. Please install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Ensure config exists
CONFIG_FILE="config.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ $CONFIG_FILE not found."
    exit 1
fi

echo "🚀 Launching Spark History MCP on http://localhost:18888..."
echo "📡 Official repo: https://github.com/kubeflow/mcp-apache-spark-history-server"

# Run the server using uvx
# This will listen on the port defined in config_aws.yaml
uvx --from mcp-apache-spark-history-server spark-mcp --config "$CONFIG_FILE"
