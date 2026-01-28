import asyncio
import json
import traceback
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

async def list_apps():
    url = "http://localhost:18888/mcp"
    print(f"📡 Connecting to MCP server at {url} ...")
    
    try:
        async with streamable_http_client(url) as (read, write, get_session_id):
            async with ClientSession(read, write) as session:
                await session.initialize()
                print("✅ Connected!")
                result = await session.call_tool("list_applications", {})
                print(f"Result: {result}")
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(list_apps())
