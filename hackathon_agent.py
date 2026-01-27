import asyncio
import json
import os
import sys
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from openai import OpenAI
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Load environment variables
load_dotenv()

class UnifiedSparkAgent:
    def __init__(self):
        # Support custom AI endpoints (OpenAI-compatible)
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        
        self.openai_client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )
        # Using gpt-4o as default, but this should work with any compatible endpoint
        self.model = os.getenv("OPENAI_MODEL_NAME", "gpt-4o")
        self.tools_metadata = {}
        self.sessions = []

    async def _connect_to_server(self, name: str, params: StdioServerParameters):
        """Connect to a single MCP server and store its session."""
        print(f"📡 Connecting to {name}...")
        try:
            transport = stdio_client(params)
            read, write = await transport.__aenter__()
            session = ClientSession(read, write)
            await session.initialize()
            
            # Fetch tools
            response = await session.list_tools()
            for tool in response.tools:
                # Store tool and its origin session
                self.tools_metadata[tool.name] = {
                    "tool": tool,
                    "session": session,
                    "server_name": name
                }
            
            self.sessions.append((transport, session))
            print(f"✅ {name} connected with {len(response.tools)} tools.")
        except Exception as e:
            print(f"❌ Failed to connect to {name}: {e}")

    def _mcp_to_openai_tool(self, mcp_tool) -> Dict[str, Any]:
        """Convert MCP tool schema to OpenAI function calling format."""
        return {
            "type": "function",
            "function": {
                "name": mcp_tool.name,
                "description": mcp_tool.description,
                "parameters": mcp_tool.inputSchema
            }
        }

    async def start(self):
        """Initialize connections to all servers."""
        # 1. Connect to Spark Optimus (Local)
        # Handle machine portability by resolving uv path
        uv_path = os.popen("which uv").read().strip() or "uv"
        optimus_params = StdioServerParameters(
            command=uv_path,
            args=["run", "-m", "spark_config_mcp.server"],
            env={**os.environ}
        )
        await self._connect_to_server("Spark Optimus (Git/Config)", optimus_params)

        # 2. Connect to AWS Community MCP (Raw Metrics)
        # We use our robust wrapper to ensure clean execution and isolation
        aws_params = StdioServerParameters(
            command="./mcp_aws_wrapper.sh",
            args=[],
            env={
                "PATH": os.environ.get("PATH", ""),
                "HOME": os.environ.get("HOME", "")
            }
        )
        await self._connect_to_server("AWS Spark History (Metrics)", aws_params)

    async def stop(self):
        """Close all connections."""
        for transport, session in self.sessions:
            await transport.__aexit__(None, None, None)

    async def run_chat(self):
        """Start an interactive chat session."""
        print("\n" + "="*80)
        print("🤖 UNIFIED SPARK OPTIMIZATION AGENT")
        print(f"Connected to AI: {self.openai_client.base_url}")
        print("I have access to Git configs and real History Server metrics.")
        print("Try: 'Find bottlenecks in my recent job' or 'Analyze my git configurations'")
        print("="*80 + "\n")

        messages = [
            {"role": "system", "content": "You are a world-class Spark Performance Engineer. Use the provided tools to investigate configurations and execution metrics. Always correlate Git configs with real execution data to provide recommendations."}
        ]

        while True:
            try:
                user_msg = input("👤 User: ")
                if user_msg.lower() in ["exit", "quit", "q"]:
                    break
                
                messages.append({"role": "user", "content": user_msg})
                
                # Main thinking/tool loop
                while True:
                    openai_tools = [self._mcp_to_openai_tool(meta["tool"]) for meta in self.tools_metadata.values()]
                    
                    response = self.openai_client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        tools=openai_tools,
                        tool_choice="auto"
                    )
                    
                    assistant_msg = response.choices[0].message
                    messages.append(assistant_msg)

                    if assistant_msg.tool_calls:
                        for tool_call in assistant_msg.tool_calls:
                            tool_name = tool_call.function.name
                            tool_args = json.loads(tool_call.function.arguments)
                            
                            print(f"🔧 Calling tool: {tool_name} (from {self.tools_metadata[tool_name]['server_name']})...")
                            
                            # Execute tool on the correct session
                            session = self.tools_metadata[tool_name]["session"]
                            result = await session.call_tool(tool_name, tool_args)
                            
                            # Log tool result
                            content = result.content[0].text if result.content else "Success"
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "name": tool_name,
                                "content": content
                            })
                    else:
                        print(f"\n🤖 Agent: {assistant_msg.content}\n")
                        break
                        
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"⚠️ Error: {e}")

async def main():
    agent = UnifiedSparkAgent()
    try:
        await agent.start()
        await agent.run_chat()
    finally:
        await agent.stop()

if __name__ == "__main__":
    asyncio.run(main())
