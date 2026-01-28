import { useState, useCallback, useEffect } from 'react';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export function useMCP(serverUrl = 'http://localhost:18889/mcp') {
    const [client, setClient] = useState(null);
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        let activeTransport = null;
        console.log("🛠️ useMCP Hook Initializing...");

        async function connect() {
            try {
                setLoading(true);
                const absoluteUrl = serverUrl.startsWith('http')
                    ? serverUrl
                    : new URL(serverUrl, window.location.origin).toString();

                console.log(`📡 Attempting MCP connection to: ${absoluteUrl}`);

                const url = new URL(absoluteUrl);
                const transport = new SSEClientTransport(url);
                activeTransport = transport;

                const mcpClient = new Client(
                    { name: "spark-optimus-dashboard", version: "1.0.0" },
                    { capabilities: {} }
                );

                console.log("🔌 Connecting transport...");
                await mcpClient.connect(transport);
                console.log("✅ MCP Transport Connected");

                console.log("📋 Listing tools...");
                const toolResponse = await mcpClient.listTools();
                console.log(`✅ Received ${toolResponse.tools?.length || 0} tools`);

                setTools(toolResponse.tools || []);
                setClient(mcpClient);
                setConnected(true);
                setError(null);
            } catch (err) {
                console.error("❌ MCP Hook Error:", err);
                setError(err.message || "Failed to connect to MCP server");
                setConnected(false);
            } finally {
                setLoading(false);
                console.log("🏁 useMCP Hook Initialization Finished");
            }
        }

        connect();

        return () => {
            console.log("🧹 useMCP Hook Cleanup");
        };
    }, [serverUrl]);

    const callTool = useCallback(async (name, args = {}) => {
        if (!client) throw new Error("MCP Client not connected");
        try {
            console.log(`⚙️ Calling tool: ${name}`, args);
            const result = await client.callTool({ name, arguments: args });
            console.log(`✅ Tool ${name} result received`);
            return result;
        } catch (err) {
            console.error(`❌ Tool execution failed (${name}):`, err);
            throw err;
        }
    }, [client]);

    return { tools, loading, error, connected, callTool };
}
