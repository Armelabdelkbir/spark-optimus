#!/bin/bash
# Unified script to run both the MCP Server and the React Dashboard

# Kill existing processes on ports
fuser -k 18888/tcp 5173/tcp || true

echo "🚀 Starting Spark Optimus Full Stack..."

# 1. Start the MCP Server in the background
echo "📡 Starting MCP Server on http://localhost:18888..."
./run_mcp_http.sh > mcp_server.log 2>&1 &
MCP_PID=$!

# Wait for server to be ready
sleep 3

# 2. Start the React Dashboard
echo "💻 Starting React Dashboard..."
cd dashboard
npm run dev
