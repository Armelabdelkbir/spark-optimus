# ⚡ Spark Optimus Dashboard
> **AI-Powered Analytics & Agentic Control for Apache Spark**

![Spark Optimus Banner](https://img.shields.io/badge/Status-Beta-blue?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge) ![Stack](https://img.shields.io/badge/Tech-React_•_FastAPI_•_MCP-orange?style=for-the-badge)

**Spark Optimus** is a next-generation observability and intelligence platform for Apache Spark. It combines a high-performance React dashboard with an **MCP (Model Context Protocol)** backend to allow AI agents to inspect, analyze, and optimize Spark jobs in real-time.

---

## 🚀 Features

- **📊 Real-Time Observability**: View Applications, Jobs, Stages, and Executors with live status updates.
- **🤖 Agentic AI Integration**: Built on the **Model Context Protocol (MCP)**, enabling Claude/Gemini agents to directly interact with your Spark cluster.
- **⚡ Resource Strategy Dashboard**: Visualize dynamic allocation, executor churn, and peak resource usage.
- **🐢 Bottleneck Detection**: Automatically identify slow tasks, skew, and inefficient SQL queries.
- **💡 Smart Insights**: Get auto-generated efficiency scores and recommendations.

---



---

## 🏁 Quick Start (Demo Mode)

Follow these steps to set up the full stack on a new machine for a demo.

### 1️⃣ Prerequisites

Ensure you have the following installed:
*   **Node.js 18+** & `npm`
*   **Python 3.10+**
*   **uv** (The ultra-fast Python package manager)
    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```

### 2️⃣ Clone & Setup

```bash
git clone https://github.com/your-repo/agent-spark.git
cd agent-spark

# Create a virtual environment (optional but recommended)
uv venv
source .venv/bin/activate
```

### 3️⃣ Configuration

Create a `.env` file (or just use the example for the demo):
```bash
cp .env.example .env
```
*Note: The demo runs with **mock data** by default, so you don't need a real Spark cluster running!*

### 4️⃣ 🚀 Launch Everything!

We have a "turbo" script that launches the MCP Server, the Backend Bridge, and the Frontend Dashboard all at once.

```bash
./run_full_system.sh
```

**Access the Dashboard:**
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🎮 Demo Walkthrough

1.  **Landing Page**: Open the dashboard. You'll see the **Applications** list populated with demo data.
2.  **Drill Down**: Click on `TestJob_BadConfig_Demo`.
3.  **Job Analysis**: Go to the **Job Analysis** tab to see the Gantt chart of job execution.
4.  **Resource Strategy**: Switch to **Intelligence** -> **Resource Usage** to see the **new KPI Cards** and Efficiency insights.
5.  **Agent Integration**: Explain that all data fetching is happening via **MCP Tool Calls**, meaning an AI agent could be doing this fully autonomously.

---

## 🐛 Troubleshooting

*   **Ports in use?**
    The script tries to kill processes on ports `18888`, `18889`, and `5173`. If it fails, manually check:
    ```bash
    lsof -i :18888
    kill -9 <PID>
    ```

*   **No Data?**
    Ensure the `mock_data` folder exists and `USE_MOCK_DATA=true` is set in your environment or config.

---

*Built with ❤️ for the Agentic AI Hackathon.*
