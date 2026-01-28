import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Clock, AlertTriangle, CheckCircle, Database } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Visualizer = ({ toolName, data, onSelectApp }) => {
    if (!data) return null;

    // 1. Applications List -> Table
    if (toolName === 'list_applications') {
        const apps = Array.isArray(data) ? data : (data.applications || []);
        if (!apps.length) return <EmptyState />;

        return (
            <div className="metrics-container">
                <h3>🚀 Application Overview</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                    Click an <strong>App ID</strong> to set it as the target for deep-dive analysis.
                </p>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Attempts</th>
                                <th>Duration (s)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apps.map((app, idx) => {
                                const lastAttempt = app.attempts?.[app.attempts.length - 1] || {};
                                const duration = lastAttempt.duration ? (lastAttempt.duration / 1000).toFixed(1) : 'N/A';
                                return (
                                    <tr key={idx}>
                                        <td>
                                            <button
                                                onClick={() => onSelectApp && onSelectApp(app.id)}
                                                className="code-font"
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    textDecoration: 'underline', padding: 0, textAlign: 'left'
                                                }}
                                                title="Set as Target Application"
                                            >
                                                {app.id}
                                            </button>
                                        </td>
                                        <td>{app.name}</td>
                                        <td>{app.attempts?.length || 0}</td>
                                        <td>{duration}s</td>
                                        <td>
                                            <span className={`badge ${lastAttempt.completed ? 'success' : 'running'}`}>
                                                {lastAttempt.completed ? 'Completed' : 'Running'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 2. Jobs List -> Timeline/Bar Chart
    if (toolName === 'list_jobs' || toolName === 'list_slowest_jobs') {
        const jobs = Array.isArray(data) ? data : (data.jobs || []);
        const chartData = jobs.map(j => ({
            id: `Job ${j.jobId}`,
            duration: j.duration || 0,
            tasks: j.numTasks || 0, // Ensure tasks are captured
            status: j.status
        })).slice(0, 20);

        return (
            <div className="metrics-container">
                <h3>{toolName === 'list_slowest_jobs' ? '🐌 Slowest Jobs Analysis' : '⏱️ Job Performance Timeline'}</h3>
                <div style={{ height: 300, marginTop: '20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="id" stroke="#888" />
                            <YAxis yAxisId="left" stroke="#8884d8" label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Task Count', angle: 90, position: 'insideRight' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="duration" fill={toolName === 'list_slowest_jobs' ? '#FF8042' : '#8884d8'} name="Duration (ms)" />
                            <Bar yAxisId="right" dataKey="tasks" fill="#82ca9d" name="Task Count" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    // 3. Single Application Detail
    if (toolName === 'get_application') {
        const app = Array.isArray(data) && data.length > 0 ? data[0] : data;
        if (!app || !app.id) return <EmptyState />;

        // Flatten attempts if present
        const lastAttempt = app.attempts?.[app.attempts.length - 1] || {};

        return (
            <div className="metrics-container">
                <h3>ℹ️ Application Details: {app.name}</h3>
                <div className="grid-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <DetailCard label="App ID" value={app.id} />
                    <DetailCard label="Spark User" value={lastAttempt.sparkUser || 'N/A'} />
                    <DetailCard label="Version" value={lastAttempt.appSparkVersion || 'N/A'} />
                    <DetailCard label="Duration" value={lastAttempt.duration ? `${(lastAttempt.duration / 1000).toFixed(1)}s` : 'N/A'} />
                    <DetailCard label="Start Time" value={lastAttempt.startTime || 'N/A'} />
                    <DetailCard label="End Time" value={lastAttempt.endTime || 'Running'} />
                </div>
            </div>
        );
    }

    // 4. Stages List
    if (toolName === 'list_stages' || toolName === 'list_slowest_stages') {
        const stages = Array.isArray(data) ? data : (data.stages || []);
        if (!stages.length) return <EmptyState />;

        return (
            <div className="metrics-container">
                <h3>{toolName === 'list_slowest_stages' ? '🐌 Slowest Stages' : '📑 Stages Overview'}</h3>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Stage ID</th>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Tasks (C/F/T)</th>
                                <th>Duration (s)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stages.map((stage, idx) => {
                                const duration = stage.executorRunTime ? (stage.executorRunTime / 1000).toFixed(2) : 'N/A';
                                return (
                                    <tr key={idx}>
                                        <td>{stage.stageId}</td>
                                        <td>{stage.name}</td>
                                        <td><span className={`badge ${stage.status === 'COMPLETE' ? 'success' : 'running'}`}>{stage.status}</span></td>
                                        <td>{stage.numCompleteTasks}/{stage.numFailedTasks}/{stage.numTasks}</td>
                                        <td>{duration}s</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 3. Bottlenecks -> Alert Cards
    if (toolName === 'get_job_bottlenecks') {
        const findings = data.critical ? data.critical : (Array.isArray(data) ? data : []);

        return (
            <div className="metrics-container">
                <h3>🚨 Critical Bottlenecks Identified</h3>
                <div className="cards-grid">
                    {findings.length === 0 ? <p>No critical bottlenecks found! 🎉</p> :
                        findings.map((finding, idx) => (
                            <div key={idx} className="alert-card">
                                <div className="alert-header">
                                    <AlertTriangle color="#FFBB28" size={20} />
                                    <h4>{finding.stageId ? `Stage ${finding.stageId}` : 'General Issue'}</h4>
                                </div>
                                <p>{finding.description || JSON.stringify(finding)}</p>
                                {finding.recommendation && (
                                    <div className="recommendation">
                                        <strong>💡 Fix:</strong> {finding.recommendation}
                                    </div>
                                )}
                            </div>
                        ))
                    }
                </div>
            </div>
        );
    }

    // 6. Resource Timeline -> KPI Cards
    if (toolName === 'get_resource_usage_timeline') {
        const summaryData = Array.isArray(data) && data.length > 0 ? data[0] : data;
        const stats = summaryData.summary || {};

        if (stats.peak_executors === undefined && stats.total_events === undefined) return <EmptyState />;

        return (
            <div className="metrics-container">
                <h3>⚡ Resource Strategy Dashboard</h3>
                <div className="grid-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <DetailCard label="Peak Executors" value={stats.peak_executors} />
                    <DetailCard label="Peak Cores" value={stats.peak_cores} />
                    <DetailCard label="Executor Additions" value={stats.executor_additions} />
                    <DetailCard label="Executor Removals" value={stats.executor_removals} />
                    <DetailCard label="Stage Executions" value={stats.stage_executions} />
                    <DetailCard label="Total Events" value={stats.total_events} />
                </div>

                {/* Insight / Suggestion */}
                <div className="alert-card" style={{ marginTop: '1rem' }}>
                    <div className="alert-header">
                        <Database size={20} color="#00C49F" />
                        <h4>Resource Efficiency</h4>
                    </div>
                    <p>
                        {stats.executor_removals > stats.executor_additions ?
                            "📉 Executors are being aggressively removed. This indicates dynamic allocation is scaling down correctly when idle." :
                            stats.executor_additions > 10 ?
                                "📈 High executor churn detected. Check if dynamic allocation is thrashing." :
                                "✅ Resource allocation seems stable."
                        }
                    </p>
                </div>
            </div>
        );
    }

    // 7. Executor Summary -> Statistics Grid
    if (toolName === 'get_executor_summary') {
        const stats = Array.isArray(data) && data.length > 0 ? data[0] : data;
        if (!stats.total_executors) return <EmptyState />;

        return (
            <div className="metrics-container">
                <h3>🤖 Executor Statistics</h3>
                <div className="grid-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <DetailCard label="Total Executors" value={stats.total_executors} />
                    <DetailCard label="Active Executors" value={stats.active_executors} />
                    <DetailCard label="Memory Used" value={stats.memory_used} />
                    <DetailCard label="Disk Used" value={stats.disk_used} />
                    <DetailCard label="Completed Tasks" value={stats.completed_tasks} />
                    <DetailCard label="Failed Tasks" value={stats.failed_tasks} />
                    <DetailCard label="Shuffle Read" value={stats.total_shuffle_read} />
                    <DetailCard label="Shuffle Write" value={stats.total_shuffle_write} />
                </div>
            </div>
        );
    }

    // 8. List Executors -> Table
    if (toolName === 'list_executors') {
        const executors = Array.isArray(data) ? data : (data.executors || []);
        if (!executors.length) return <EmptyState />;

        return (
            <div className="metrics-container">
                <h3>💻 Executors List</h3>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Host Port</th>
                                <th>Active/Dead</th>
                                <th>Memory Used</th>
                                <th>Disk Used</th>
                                <th>Total Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {executors.map((ex, idx) => (
                                <tr key={idx}>
                                    <td>{ex.id}</td>
                                    <td>{ex.hostPort}</td>
                                    <td>{ex.isActive ? '✅ Active' : '❌ Dead'}</td>
                                    <td>{ex.memoryUsed}</td>
                                    <td>{ex.diskUsed}</td>
                                    <td>{ex.totalTasks}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 9. Environment Info -> Key-Value Table
    if (toolName === 'get_environment') {
        const envData = Array.isArray(data) && data.length > 0 ? data[0] : data;
        const sparkProps = envData.sparkProperties || [];
        const sysProps = envData.systemProperties || [];

        return (
            <div className="metrics-container">
                <h3>⚙️ Environment Configuration</h3>

                <h4>Spark Properties</h4>
                <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table>
                        <thead><tr><th>Name</th><th>Value</th></tr></thead>
                        <tbody>
                            {sparkProps.map((p, idx) => (
                                <tr key={`sp-${idx}`}><td>{p[0]}</td><td>{p[1]}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <h4 style={{ marginTop: '1rem' }}>System Properties</h4>
                <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table>
                        <thead><tr><th>Name</th><th>Value</th></tr></thead>
                        <tbody>
                            {sysProps.map((p, idx) => (
                                <tr key={`sys-${idx}`}><td>{p[0]}</td><td>{p[1]}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 10. Slowest SQL Queries -> Table
    if (toolName === 'list_slowest_sql_queries') {
        const queries = Array.isArray(data) ? data : [];
        if (!queries.length) return <EmptyState />;

        return (
            <div className="metrics-container">
                <h3>🐢 Slowest SQL Queries</h3>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Description</th>
                                <th>Duration (ms)</th>
                                <th>Start Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {queries.map((q, idx) => (
                                <tr key={idx}>
                                    <td>{q.id}</td>
                                    <td>{q.description}</td>
                                    <td>{q.duration}</td>
                                    <td>{q.submissionTime}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Fallback: Raw JSON
    return (
        <div className="raw-json">
            <div className="json-header">Raw Output</div>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
};

const EmptyState = () => (
    <div style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>No data available</div>
);

const DetailCard = ({ label, value }) => (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-glow)' }}>{value}</div>
    </div>
);

export default Visualizer;
