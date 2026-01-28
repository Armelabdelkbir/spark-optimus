import asyncio
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="MCP Bridge Service")

# 🔓 Enable CORS for everything (since it's a local dashboard bridge)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration for the real MCP server
MCP_URL = "http://localhost:18888/mcp"

@app.api_route("/mcp", methods=["GET", "POST", "DELETE", "OPTIONS"])
async def proxy_mcp(request: Request):
    """
    Unified Proxy for MCP.
    - GET: For SSE (EventSource)
    - POST: For JSON-RPC commands
    - DELETE: For session cleanup
    """
    method = request.method
    
    # Simple header filtering to avoid interference
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "connection", "content-length")}
    
    body = await request.body()
    
    async with httpx.AsyncClient(timeout=None) as client:
        if method == "GET":
            # 📡 Handle SSE Streaming
            async def event_generator():
                async with client.stream("GET", MCP_URL, headers=headers) as response:
                    async for line in response.aiter_lines():
                        if line:
                            yield f"{line}\n"
                        else:
                            yield "\n"
            
            return StreamingResponse(event_generator(), media_type="text/event-stream")
        
        else:
            # 📨 Handle POST/DELETE
            response = await client.request(
                method,
                MCP_URL,
                content=body,
                headers=headers,
                params=request.query_params
            )
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )

@app.get("/")
def health():
    return {"status": "Bridge is active", "proxying_to": MCP_URL}

if __name__ == "__main__":
    print(f"🚀 MCP Bridge running on http://localhost:18889")
    print(f"📡 Proxying requests to {MCP_URL}")
    uvicorn.run(app, host="0.0.0.0", port=18889)
