import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Database,
  Activity,
  Zap,
  Search,
  ArrowRight,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  RefreshCcw,
  Monitor
} from 'lucide-react';
import Visualizer from './components/Visualizer';
import { useSparkAPI } from './hooks/useSparkAPI';

const App = () => {
  console.log("🖥️ App Component Rendering...");
  const [activeTab, setActiveTab] = useState('applications');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [result, setResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [lastTool, setLastTool] = useState(''); // Track last tool for visualizer

  // Use the custom hook to connect to the intermediate server
  const { tools, loading, error, connected, callTool } = useSparkAPI();

  useEffect(() => {
    console.log("✅ App Component Mounted");
  }, []);

  const handleToolCall = async (toolName) => {
    try {
      setExecuting(true);
      setResult(null);
      setLastTool(toolName);

      const args = {};
      const needsAppId = [
        'get_application', 'list_jobs', 'list_slowest_jobs', 'list_stages', 'list_slowest_stages',
        'get_job_bottlenecks', 'get_resource_usage_timeline', 'list_slowest_sql_queries',
        'compare_sql_execution_plans', 'get_executor', 'get_executor_summary', 'get_stage'
      ].includes(toolName);

      if (needsAppId) {
        if (!selectedAppId) {
          const id = prompt("Please enter Application ID (e.g. local-1769...):");
          if (!id) {
            setExecuting(false);
            return;
          }
          setSelectedAppId(id);
          args.app_id = id;
        } else {
          args.app_id = selectedAppId;
        }
      }

      if (toolName === 'get_stage') {
        const stageId = prompt("Please enter Stage ID (integer):");
        if (!stageId) {
          setExecuting(false);
          return;
        }
        args.stage_id = parseInt(stageId, 10);
      }

      console.log(`🚀 Executing ${toolName}...`);
      const res = await callTool(toolName, args);
      console.log(`🏁 ${toolName} finished`);
      setResult(res);
    } catch (err) {
      console.error(`❌ Execution Error (${toolName}):`, err);
      setResult({ error: err.message || "Unknown error during tool execution" });
    } finally {
      setExecuting(false);
    }
  };

  // Tool categories for the sidebar and grid
  const categories = {
    applications: { label: 'Applications', icon: <Database size={20} />, tools: ['list_applications', 'get_application', 'get_environment'] },
    jobs: { label: 'Job Analysis', icon: <Activity size={20} />, tools: ['list_jobs', 'list_slowest_jobs', 'list_executors', 'get_executor_summary'] },
    stages: { label: 'Stage Deep-Dive', icon: <Zap size={20} />, tools: ['list_stages', 'list_slowest_stages', 'get_stage'] },
    optimization: { label: 'Intelligence', icon: <LayoutDashboard size={20} />, tools: ['get_job_bottlenecks', 'get_resource_usage_timeline', 'list_slowest_sql_queries'] }
  };

  // Connection Error Screen
  if (error) {
    return (
      <div style={{ backgroundColor: '#05050a', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <AlertTriangle size={64} color="#ff4444" style={{ marginBottom: '1rem' }} />
        <h1 style={{ marginBottom: '1rem' }}>MCP Connection Failed</h1>
        <div style={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 68, 68, 0.3)', maxWidth: '600px', marginBottom: '2rem' }}>
          <code>{error}</code>
        </div>
        <button className="button" onClick={() => window.location.reload()}>Retry Connection</button>
      </div>
    );
  }

  // Reset result when tab changes
  useEffect(() => {
    setResult(null);
    setLastTool('');
  }, [activeTab]);

  // Filter tools based on active category
  const activeCategoryTools = categories[activeTab]?.tools || [];
  const displayedTools = tools.filter(t => activeCategoryTools.includes(t.name));

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)', display: 'grid', placeItems: 'center', boxShadow: '0 0 20px rgba(0, 114, 255, 0.4)' }}>
            <Zap size={20} color="#fff" fill="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Spark Optimus</h1>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>AI-Powered Analytics</div>
          </div>
        </div>

        {/* Status Indicator */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            <span>Backend Status</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: connected ? '#00e676' : '#ff4444' }}>
              <span className={`status-dot ${connected ? 'status-pulse' : ''}`} style={{ background: connected ? '#00e676' : '#ff4444' }}></span>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {selectedAppId && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>Target Application</div>
              <div style={{ color: 'var(--primary-glow)', textOverflow: 'ellipsis', overflow: 'hidden' }}>{selectedAppId}</div>
              <button onClick={() => setSelectedAppId('')} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.7rem', padding: 0, marginTop: '4px', cursor: 'pointer' }}>Clear Target</button>
            </div>
          )}
        </div>

        <nav>
          <div className="nav-group">
            <span className="nav-label">Core Tools</span>
            {Object.entries(categories).map(([id, cat]) => (
              <div
                key={id}
                className={`nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </div>
            ))}
          </div>

          <div className="nav-group">
            <span className="nav-label">System</span>
            <div className="nav-item">
              <Settings size={20} />
              <span>Settings</span>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Tool Grid */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={18} color="var(--primary-glow)" />
            {categories[activeTab]?.label || 'Available'} Operations
          </h2>
          <div className="tool-grid">
            {displayedTools.length > 0 ? displayedTools.map(tool => (
              <div key={tool.name} className="tool-btn" onClick={() => handleToolCall(tool.name)}>
                <CheckCircle2 size={24} color="var(--primary-glow)" />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>{tool.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{tool.description ? tool.description.substring(0, 60) + '...' : ''}</span>
                </div>
              </div>
            )) : (
              <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No tools available for this category.</div>
            )}
          </div>
        </section>

        {/* Result & Output Area */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Execution Console</h2>
            {executing && <div className="loader"></div>}
          </div>

          <div className="card" style={{ minHeight: '400px', background: '#000', border: '1px solid #222' }}>
            {result ? (
              result.error ? (
                <div style={{ color: '#ff4444', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                  <AlertTriangle size={24} />
                  <span>{result.error}</span>
                </div>
              ) : (
                <div style={{ padding: '0.5rem' }}>
                  {/* Pass result.result because our backend wraps actual data in { result: ... } */}
                  <Visualizer toolName={lastTool} data={result.result} onSelectApp={setSelectedAppId} />
                </div>
              )
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '350px', color: 'var(--text-dim)' }}>
                <div style={{ textAlign: 'center' }}>
                  <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                  <p>Select a category and click a tool above to begin analysis.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
