import { useState, useCallback, useEffect } from 'react';

/**
 * Simplified hook to talk to our custom Python Intermediate Server (server.py)
 * Running on port 3000.
 */
export function useSparkAPI() {
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [connected, setConnected] = useState(false);

    const API_BASE = "http://localhost:3000/api";

    useEffect(() => {
        checkStatus();
        // Poll status every 5 seconds or just fetch tools once
        fetchTools();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/status`);
            const data = await res.json();
            setConnected(data.connected);
        } catch (e) {
            setConnected(false);
        }
    };

    const fetchTools = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/tools`);
            if (!res.ok) throw new Error("Failed to fetch tools");
            const data = await res.json();
            setTools(data.tools || []);
            setConnected(true);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Backend unavailable. Is server.py running?");
            setConnected(false);
        } finally {
            setLoading(false);
        }
    };

    const callTool = useCallback(async (name, args = {}) => {
        try {
            console.log(`🔌 API: Calling ${name}`, args);
            const res = await fetch(`${API_BASE}/tools/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, arguments: args })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "API Call Failed");
            }

            const data = await res.json();
            return data;
        } catch (err) {
            console.error(`❌ API Error (${name}):`, err);
            throw err;
        }
    }, []);

    return { tools, loading, error, connected, callTool };
}
