import asyncio
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_aws_mcp():
    # Configure parameters for the AWS Spark History Server MCP
    server_params = StdioServerParameters(
        command="./mcp_aws_wrapper.sh",
        args=[],
        env={
            "PATH": os.environ.get("PATH", ""),
            "HOME": os.environ.get("HOME", "")
        }
    )

    print("🚀 Connecting to AWS Spark History Server MCP via wrapper...")
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # Initialize the session
                await session.initialize()
                
                # List available tools
                print("\n✅ Successfully connected! Fetching tools...\n")
                response = await session.list_tools()
                
                if not response.tools:
                    print("⚠️  No tools found on the server.")
                else:
                    print(f"🛠️  Found {len(response.tools)} tools:")
                    for tool in response.tools:
                        print(f"  - {tool.name}: {tool.description[:100]}...")
                        
                print("\n✨ Test completed successfully!")
                
    except Exception as e:
        print(f"\n❌ Error connecting to MCP server: {e}")

if __name__ == "__main__":
    asyncio.run(test_aws_mcp())
