import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis, ComposedChart, Area
} from 'recharts';
import {
    Clock, AlertTriangle, CheckCircle, Database, Zap,
    TrendingUp, Shield, Cpu, Info, Target, Boxes, Brain, Sword, Trophy, Activity
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Visualizer = ({ toolName, data, onSelectApp }) => {
    // Generic diagnostic logging for comparison tools to help fix zero-data issues
    if (toolName && toolName.startsWith('compare_')) {
        console.group(`📊 [Visualizer] Debugging: ${toolName}`);
        console.log("Raw data object:", data);
        const compData = (Array.isArray(data) && data.length > 0) ? data[0] : data;
        console.log("Extracted compData:", compData);
        console.log("Keys in compData:", Object.keys(compData || {}));
        console.groupEnd();
    }
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

    // 2. Jobs List -> Analytics Hub
    if (toolName === 'list_jobs' || toolName === 'list_slowest_jobs') {
        const jobs = Array.isArray(data) ? data : (data.jobs || []);
        if (!jobs.length) return <EmptyState />;

        const chartData = jobs
            .sort((a, b) => new Date(a.submissionTime) - new Date(b.submissionTime))
            .map(j => {
                const date = new Date(j.submissionTime);
                const duration = j.duration || (j.completionTime && j.submissionTime ? (new Date(j.completionTime) - new Date(j.submissionTime)) : 0);
                return {
                    id: `J${j.jobId}`,
                    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    duration: duration,
                    tasks: j.numTasks || 0,
                    status: j.status
                };
            }).slice(-30);

        // KPI Calculations
        const totalDurationMs = jobs.reduce((sum, j) => {
            const d = j.duration || (j.completionTime && j.submissionTime ? (new Date(j.completionTime) - new Date(j.submissionTime)) : 0);
            return sum + d;
        }, 0);
        const totalTasks = jobs.reduce((sum, j) => sum + (j.numTasks || 0), 0);
        const avgDuration = (totalDurationMs / (jobs.length || 1) / 1000).toFixed(2);
        const successRate = jobs.length ? ((jobs.filter(j => j.status === 'SUCCEEDED').length / jobs.length) * 100).toFixed(1) : 0;

        return (
            <div className="metrics-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>{toolName === 'list_slowest_jobs' ? '🐌 Slowest Jobs Timeline' : '⏱️ Job Performance Chronology'}</h3>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Last 30 Jobs</div>
                </div>

                {/* KPI Summary Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <DetailCard label="Total Jobs" value={jobs.length} />
                    <DetailCard label="Avg Duration" value={`${avgDuration}s`} />
                    <DetailCard label="Total Tasks" value={totalTasks.toLocaleString()} />
                    <DetailCard label="Success Rate" value={`${successRate}%`} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Job Health Timeline */}
                    <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color="var(--primary-glow)" /> Job Duration Timeline
                        </h4>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="time" stroke="#666" fontSize={9} tickLine={false} />
                                    <YAxis stroke="#4cc9f0" fontSize={9} tickLine={false} label={{ value: 'ms', angle: -90, position: 'insideLeft', fontSize: 9 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '8px' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Line type="monotone" dataKey="duration" stroke="var(--primary-glow)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary-glow)' }} activeDot={{ r: 6 }} name="Duration (ms)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Throughput Timeline */}
                    <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} color="#00C49F" /> Task Throughput
                        </h4>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="time" stroke="#666" fontSize={9} tickLine={false} />
                                    <YAxis stroke="#00C49F" fontSize={9} tickLine={false} label={{ value: 'Count', angle: 90, position: 'insideRight', fontSize: 9 }} orientation="right" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '8px' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Bar dataKey="tasks" fill="#00C49F" radius={[4, 4, 0, 0]} name="Task Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
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

    // 3. Bottlenecks -> Optimization Advisor
    if (toolName === 'get_job_bottlenecks') {
        const findings = [];

        // Comprehensive extraction from all possible backend keys
        if (data.critical) findings.push(...data.critical.map(f => ({ ...f, category: 'critical' })));
        if (data.warnings) findings.push(...data.warnings.map(f => ({ ...f, category: 'warning' })));
        if (data.info) findings.push(...data.info.map(f => ({ ...f, category: 'optimization' })));

        // Fallback for flat array or unknown schema
        if (findings.length === 0) {
            const raw = Array.isArray(data) ? data : (data.findings || []);
            findings.push(...raw.map(f => ({ ...f, category: 'warning' })));
        }

        return (
            <div className="metrics-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255, 0, 127, 0.1)', border: '1px solid rgba(255, 0, 127, 0.2)' }}>
                        <Brain size={32} color="#ff007f" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0 }}>Optimization Advisor</h3>
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '4px 0 0 0' }}>Deep-dive analysis of Spark job execution bottlenecks</p>
                    </div>
                </div>

                <div className="intelligence-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {findings.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem', width: '100%' }}>
                            <CheckCircle color="#00e676" size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p style={{ color: 'var(--text-dim)' }}>No optimization bottlenecks detected.</p>
                        </div>
                    ) : (
                        findings.map((f, i) => (
                            <div key={i} className={`ai-advisor-card ${f.category || 'warning'}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                                        {f.stageId !== undefined ? `Stage ${f.stageId}` : (f.title || f.name || 'Insight')}
                                    </h4>
                                    <span className="glass-pill" style={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                        {f.category?.toUpperCase() || 'ADVICE'}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.25rem', color: '#fff' }}>
                                    {f.description || (typeof f === 'string' ? f : JSON.stringify(f))}
                                </p>
                                {(f.recommendation || f.suggestion) && (
                                    <div style={{
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        fontSize: '0.8rem'
                                    }}>
                                        <div style={{ color: 'var(--primary-glow)', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.08em' }}>
                                            Recommendation
                                        </div>
                                        <div style={{ opacity: 0.9, lineHeight: 1.4 }}>{f.recommendation || f.suggestion}</div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
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

    // 11. Environment Comparison -> Side-by-Side Table
    if (toolName === 'compare_job_environments') {
        const compData = Array.isArray(data) && data.length > 0 ? data[0] : data;
        const sparkProps = compData.spark_properties || {};

        // Merge common and different for a unified view
        const common = sparkProps.common || {};
        const different = sparkProps.different || {};
        const only1 = sparkProps.only_in_app1 || {};
        const only2 = sparkProps.only_in_app2 || {};

        return (
            <div className="metrics-container">
                <h3>⚖️ Environment Comparison</h3>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Property</th>
                                <th>App 1</th>
                                <th>App 2</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Different Properties First */}
                            {Object.keys(different).map(key => (
                                <tr key={key} style={{ backgroundColor: 'rgba(255, 187, 40, 0.1)' }}>
                                    <td className="code-font">{key}</td>
                                    <td>{different[key].app1}</td>
                                    <td>{different[key].app2}</td>
                                    <td>⚠️ Changed</td>
                                </tr>
                            ))}
                            {/* Only in App 1 */}
                            {Object.keys(only1).map(key => (
                                <tr key={key} style={{ backgroundColor: 'rgba(255, 68, 68, 0.05)' }}>
                                    <td className="code-font">{key}</td>
                                    <td>{only1[key]}</td>
                                    <td>--</td>
                                    <td>❌ Missing</td>
                                </tr>
                            ))}
                            {/* Only in App 2 */}
                            {Object.keys(only2).map(key => (
                                <tr key={key} style={{ backgroundColor: 'rgba(0, 230, 118, 0.05)' }}>
                                    <td className="code-font">{key}</td>
                                    <td>--</td>
                                    <td>{only2[key]}</td>
                                    <td>✨ New</td>
                                </tr>
                            ))}
                            {/* Common Properties */}
                            {Object.keys(common).map(key => (
                                <tr key={key} style={{ opacity: 0.6 }}>
                                    <td className="code-font">{key}</td>
                                    <td>{common[key].app1}</td>
                                    <td>{common[key].app2}</td>
                                    <td>✅ Same</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 12. Performance Comparison -> Battle Scorecard
    if (toolName === 'compare_job_performance') {
        const compData = (Array.isArray(data) && data.length > 0) ? data[0] : data;
        const summary = compData.executor_metrics || compData.summary_performance || compData.performance_summary || compData.summary || {};
        const app1 = summary.app1 || compData.app1 || {};
        const app2 = summary.app2 || compData.app2 || {};
        const perf1 = compData.job_performance?.app1 || {};
        const perf2 = compData.job_performance?.app2 || {};
        const comparison = summary.comparison || compData.comparison || {};

        // Calculate Battle Scores
        const calculateScore = (app, perf) => {
            const duration = app.total_duration || app.duration || 0;
            if (!duration) return 0;
            const gc = app.total_gc_time || app.gc_time || 0;
            const gcPenalty = (gc / duration) * 100;
            const durationScore = Math.max(0, 100 - (duration / 100000) * 10);
            const tasks = perf.count || 1;
            const completed = perf.completed_count || 0;
            const taskScore = (completed / tasks) * 100;
            return Math.round((durationScore * 0.5) + (taskScore * 0.3) - (gcPenalty * 2));
        };

        const score1 = calculateScore(app1, perf1);
        const score2 = calculateScore(app2, perf2);
        const winner = score1 > score2 ? 1 : (score2 > score1 ? 2 : 0);

        return (
            <div className="metrics-container">
                <div className="battle-scorecard shadow-pulse">
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>APPLICATION 1</div>
                        <div className={`battle-circle ${winner === 1 ? 'winner' : ''}`}>
                            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{score1 || '--'}</div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>EFFICIENCY</div>
                            {winner === 1 && <Trophy size={20} color="var(--battle-gold)" style={{ position: 'absolute', top: -10, right: -10 }} />}
                        </div>
                    </div>

                    <div className="vs-logo">VS</div>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>APPLICATION 2</div>
                        <div className={`battle-circle ${winner === 2 ? 'winner' : ''}`}>
                            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{score2 || '--'}</div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>EFFICIENCY</div>
                            {winner === 2 && <Trophy size={20} color="var(--battle-gold)" style={{ position: 'absolute', top: -10, left: -10 }} />}
                        </div>
                    </div>
                </div>

                <div className="stats-grid-v2">
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary-glow)' }}>
                            <TrendingUp size={18} />
                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Efficiency Metrics</h4>
                        </div>
                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr><th>Metric</th><th>App 1</th><th>App 2</th><th>Ratio</th></tr>
                                </thead>
                                <tbody>
                                    {[
                                        { id: 'total_duration', label: 'Duration (ms)' },
                                        { id: 'completed_tasks', label: 'Tasks' },
                                        { id: 'total_shuffle_read', label: 'Shuffle Read' },
                                        { id: 'total_gc_time', label: 'GC Time' }
                                    ].map((m, idx) => {
                                        const shortId = m.id.replace('total_', '');
                                        const v1 = app1[m.id] !== undefined ? app1[m.id] : app1[shortId];
                                        const v2 = app2[m.id] !== undefined ? app2[m.id] : app2[shortId];
                                        const ratio = (v1 && v1 !== 0) ? (v2 / v1).toFixed(2) : '1.0';
                                        return (
                                            <tr key={idx}>
                                                <td style={{ fontSize: '0.85rem' }}>{m.label}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{v1?.toLocaleString() || '0'}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{v2?.toLocaleString() || '0'}</td>
                                                <td style={{ fontSize: '0.85rem', fontWeight: 700, color: parseFloat(ratio) < 0.95 ? '#00e676' : (parseFloat(ratio) > 1.05 ? '#ff4444' : 'inherit') }}>{ratio}x</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--battle-gold)' }}>
                            <Sword size={18} />
                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Performance Verdict</h4>
                        </div>
                        <div style={{ fontSize: '0.85rem', lineHeight: 1.6, opacity: 0.8 }}>
                            {winner === 0 ? (
                                <p>Applications are performing identically. Configuration is stable across both environments.</p>
                            ) : (
                                <p>
                                    App {winner} is the performance winner.
                                    {winner === 1 ? " Configuration 1 handles cycles more efficiently." : " Configuration 2 demonstrates superior parallelism."}
                                    We recommend prioritizing settings from App {winner} for production.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 13. SQL Plan Comparison -> Side-by-Side Operator Counts
    if (toolName === 'compare_sql_execution_plans') {
        const compData = (Array.isArray(data) && data.length > 0) ? data[0] : data;

        // Support both old and new schemas
        const planComp = compData.plan_structure || compData.sql_comparison || compData.plan_comparison || compData || {};
        const ops = planComp.node_type_comparison || planComp.operator_comparison || {};
        const complexity = planComp.complexity_metrics || {};

        // If we still didn't find specific comparison data, don't show the table
        if (!Object.keys(ops).length || ops === compData) return <EmptyState />;

        return (
            <div className="metrics-container">
                <h3>🔍 SQL Operator Comparison</h3>
                <div style={{ gridTemplateColumns: 'repeat(3, 1fr)', display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                    <DetailCard label="Node Count Ratio" value={`${complexity.node_count_ratio || '1.0'}x`} />
                    <DetailCard label="Edge Count Ratio" value={`${complexity.edge_count_ratio || '1.0'}x`} />
                    <DetailCard label="Duration Ratio" value={`${complexity.duration_ratio || '1.0'}x`} />
                </div>

                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Operator Type</th>
                                <th>App 1 Count</th>
                                <th>App 2 Count</th>
                                <th>Diff</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(ops).map(([op, counts]) => {
                                const diff = counts.app2_count - counts.app1_count;
                                return (
                                    <tr key={op} style={diff !== 0 ? { backgroundColor: 'rgba(0, 198, 255, 0.08)' } : {}}>
                                        <td>{op}</td>
                                        <td>{counts.app1_count}</td>
                                        <td>{counts.app2_count}</td>
                                        <td style={{ color: diff > 0 ? '#ff4444' : (diff < 0 ? '#00e676' : 'inherit'), fontWeight: 700 }}>
                                            {diff > 0 ? `+${diff}` : (diff < 0 ? diff : '0')}
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

    // Fallback: Raw JSON
    return (
        <div className="raw-json">
            <div className="json-header">Raw Output ({toolName})</div>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
};

const EmptyState = () => (
    <div style={{ padding: 40, textAlign: 'center', opacity: 0.6 }}>
        <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
        <div>No comparison data available for these applications.</div>
    </div>
);

const DetailCard = ({ label, value }) => (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-glow)' }}>{value}</div>
    </div>
);

export default Visualizer;
