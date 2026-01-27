#!/bin/bash
# Wrapper to ensure Spark MCP server is silent on stdout
# and doesn't load conflicting project environment variables

# 1. Clean the environment thoroughly
# We must hide .env because spark-mcp (pydantic) loads it automatically
ENV_HIDDEN=false
if [ -f ".env" ]; then
    mv .env .env.aws_tmp
    ENV_HIDDEN=true
fi

# Cleanup to restore .env
cleanup() {
    if [ "$ENV_HIDDEN" = true ]; then
        mv .env.aws_tmp .env
    fi
}
trap cleanup EXIT

# 2. Run the server in a PRISTINE environment
# env -i ensures NO variables from the user session leak into the server
export SHS_MCP_CONFIG="config_aws.yaml"
env -i \
    HOME="$HOME" \
    PATH="$PATH" \
    SHS_MCP_CONFIG="$SHS_MCP_CONFIG" \
    /home/armel/.local/bin/uvx --from mcp-apache-spark-history-server spark-mcp --config "$SHS_MCP_CONFIG"
