import asyncio
import json
import traceback
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ToolCallRequest(BaseModel):
    name: str
    arguments: Dict[str, Any] = {}

MCP_URL = "http://localhost:18888/mcp"

@app.get("/api/status")
async def get_status():
    # We are always "connected" in the sense that we can try to connect
    return {"connected": True}

@app.get("/api/tools")
async def list_tools():
    print(f"🔍 Fetching tools from {MCP_URL}...")
    try:
        async with streamable_http_client(MCP_URL) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.list_tools()
                return result
    except Exception as e:
        print(f"❌ Error fetching tools: {e}")
        traceback.print_exc()
        raise HTTPException(503, str(e))

@app.post("/api/tools/call")
async def call_tool(req: ToolCallRequest):
    print(f"⚙️ Calling {req.name}...")
    try:
        async with streamable_http_client(MCP_URL) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(req.name, req.arguments)
                
                # Simple JSON unwrapping
                parsed = []
                if result.content:
                    for item in result.content:
                        if hasattr(item, 'text'):
                            try:
                                parsed.append(json.loads(item.text))
                            except:
                                parsed.append(item.text)
                        else:
                            parsed.append(item)
                
                return {"result": parsed, "isError": result.isError}
    except Exception as e:
        print(f"❌ Error calling tool: {e}")
        traceback.print_exc()
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
