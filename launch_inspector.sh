#!/bin/bash

# Script to launch the MCP Inspector UI for the AWS Spark MCP Server
# Handles environment isolation and official Kubeflow launch pattern

set -e

# Ensure Node.js and uv are in PATH
if ! command -v node &> /dev/null; then
    echo "❌ Error: node not found. Please install Node.js."
    exit 1
fi

if ! command -v uv &> /dev/null; then
    echo "❌ Error: uv not found."
    exit 1
fi

echo "✅ Using $(node -v)"
echo "✅ Using $(which uv)"

chmod +x mcp_aws_wrapper.sh

echo "🚀 Launching Inspector UI for the OFFICIAL Kubeflow Spark History MCP..."
echo "📡 documentation: https://github.com/kubeflow/mcp-apache-spark-history-server"

# Run the inspector pointing to our robust wrapper
npx -y @modelcontextprotocol/inspector ./mcp_aws_wrapper.sh
