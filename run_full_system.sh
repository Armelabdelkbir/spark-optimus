#!/bin/bash
# Definitive Full Stack Script for Spark Optimus

# Cleanup existing
fuser -k 18888/tcp 18889/tcp 5173/tcp || true

echo "🚀 Starting Official Spark History MCP (Port 18888)..."
./run_mcp_http.sh > mcp_server.log 2>&1 &

echo "📡 Starting Backend Bridge (Port 18889)..."
uv run python mcp_bridge.py > bridge.log 2>&1 &

sleep 4

echo "💻 Launching React Dashboard (Port 5173)..."
cd dashboard
npm run dev
