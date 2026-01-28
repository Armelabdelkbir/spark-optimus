#!/bin/bash
# Definitive Full Stack Script for Spark Optimus

# Cleanup existing
fuser -k 18888/tcp 18889/tcp 5173/tcp || true

echo "🚀 Starting Official Spark History MCP (Port 18888)..."
./run_mcp_http.sh > mcp_server.log 2>&1 &

echo "📡 Starting Backend Bridge (Port 3000)..."
if [ ! -d ".venv" ]; then
    uv venv
fi
uv pip install -r requirements.txt
uv run python server.py > bridge.log 2>&1 &

sleep 4

echo "💻 Launching React Dashboard (Port 5173)..."
cd dashboard

# Auto-install dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "📦 npm dependencies not found. Installing..."
    npm install
fi

npm run dev
