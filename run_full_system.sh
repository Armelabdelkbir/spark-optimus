#!/bin/bash
# Definitive Full Stack Script for Spark Optimus

# Cleanup existing
fuser -k 18888/tcp 3000/tcp 5173/tcp 18889/tcp || true

echo "🚀 Starting Official Spark History MCP (Port 18888)..."
./run_mcp_http.sh > mcp_server.log 2>&1 &

echo "⏳ Waiting for MCP Server to be ready on port 18888..."
# Wait for port 18888 to be available (max 60 seconds)
timeout=60
while ! nc -z localhost 18888; do
  sleep 1
  timeout=$((timeout-1))
  if [ "$timeout" -le 0 ]; then
    echo "❌ MCP Server failed to start on time. Check mcp_server.log"
    exit 1
  fi
done
echo "✅ MCP Server is up!"

echo "📡 Starting Backend Bridge (Port 3000)..."
if [ ! -d ".venv" ]; then
    uv venv
fi
uv pip install -r requirements.txt
uv run python server.py > bridge.log 2>&1 &

echo "💻 Launching React Dashboard (Port 5173)..."
cd dashboard

# Auto-install dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "📦 npm dependencies not found. Installing..."
    npm install
fi

npm run dev
