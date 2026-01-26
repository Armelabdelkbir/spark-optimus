# Setting Up Local Spark with History Server

This guide will help you install Apache Spark locally and run the History Server for real testing.

## Prerequisites

- Java 8 or 11 (required for Spark)
- At least 4GB RAM available
- Linux/macOS (you're on Linux ✅)

## Step 1: Install Java (if not already installed)

```bash
# Check if Java is installed
java -version

# If not installed, install OpenJDK 11
sudo apt update
sudo apt install openjdk-11-jdk -y

# Verify installation
java -version
```

## Step 2: Download and Install Spark

```bash
# Navigate to your home directory
cd ~

# Download Spark 3.5.0 (latest stable)
wget https://dlcdn.apache.org/spark/spark-3.5.0/spark-3.5.0-bin-hadoop3.tgz

# Extract
tar -xzf spark-3.5.0-bin-hadoop3.tgz

# Move to a permanent location
sudo mv spark-3.5.0-bin-hadoop3 /opt/spark

# Add to PATH (add these lines to ~/.bashrc)
echo 'export SPARK_HOME=/opt/spark' >> ~/.bashrc
echo 'export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin' >> ~/.bashrc
echo 'export PYSPARK_PYTHON=python3' >> ~/.bashrc

# Reload bashrc
source ~/.bashrc

# Verify installation
spark-submit --version
```

## Step 3: Configure Spark for Event Logging

```bash
# Create event log directory
mkdir -p ~/spark-events

# Configure Spark
cd /opt/spark/conf
sudo cp spark-defaults.conf.template spark-defaults.conf

# Add these configurations
sudo tee -a spark-defaults.conf << EOF

# Event Logging Configuration
spark.eventLog.enabled           true
spark.eventLog.dir               file:///home/$USER/spark-events
spark.history.fs.logDirectory    file:///home/$USER/spark-events
EOF
```

## Step 4: Start Spark History Server

```bash
# Start the History Server
start-history-server.sh

# The server will start on http://localhost:18080
# You should see output like:
# "Started HistoryServer at http://localhost:18080"
```

## Step 5: Run a Test Spark Job

Create a simple test job to generate event logs:

```bash
# Create a test Python script
cat > ~/test_spark_job.py << 'EOF'
from pyspark.sql import SparkSession

# Create Spark session
spark = SparkSession.builder \
    .appName("TestJob_BadConfig") \
    .config("spark.driver.memory", "20g") \
    .config("spark.executor.memory", "8g") \
    .config("spark.sql.shuffle.partitions", "200") \
    .getOrCreate()

# Create sample data
data = [(i, f"name_{i}", i * 100) for i in range(1000000)]
df = spark.createDataFrame(data, ["id", "name", "value"])

# Perform some operations
result = df.groupBy("name").sum("value")
result.show(10)

# Stop Spark
spark.stop()
EOF

# Run the job
spark-submit ~/test_spark_job.py
```

## Step 6: Verify History Server

```bash
# Open browser to http://localhost:18080
# Or use curl to test the API
curl http://localhost:18080/api/v1/applications

# You should see your application listed
```

## Step 7: Test with Your Analyzer

Update your `.env` file:

```bash
cd /home/armel/Desktop/agent-spark

# Create .env file
cat > .env << EOF
GEMINI_API_KEY=your_api_key_here
SPARK_HISTORY_SERVER_URL=http://localhost:18080
USE_MOCK_DATA=false
EOF
```

Now run your analyzer:

```bash
# Get the application ID from History Server
APP_ID=$(curl -s http://localhost:18080/api/v1/applications | python3 -c "import sys, json; apps = json.load(sys.stdin); print(apps[0]['id'] if apps else 'none')")

# Test the analyzer with real data
./venv/bin/python -c "
from spark_config_mcp.history_server_client import HistoryServerClient
from spark_config_mcp.config_analyzer import ConfigAnalyzer
from spark_config_mcp.spark_config_parser import SparkConfigParser

# Use real History Server
client = HistoryServerClient(use_mock=False)
parser = SparkConfigParser()
analyzer = ConfigAnalyzer()

# Parse your config
config = parser.parse_file('demo_repo/deploy_job.sh')

# Fetch real metrics
metrics = client.get_application_metrics('$APP_ID')
if metrics:
    print('✅ Successfully fetched real metrics!')
    print(f'App: {metrics.app_name}')
    print(f'Duration: {metrics.duration_ms/1000 if metrics.duration_ms else 0} seconds')
    
    # Analyze
    analysis = analyzer.analyze(config, metrics)
    print(f'\nRecommendations: {len(analysis.recommendations)}')
    for rec in analysis.recommendations:
        print(f'  [{rec.severity.value.upper()}] {rec.title}')
else:
    print('❌ No metrics found')
"
```

## Useful Commands

```bash
# Start History Server
start-history-server.sh

# Stop History Server
stop-history-server.sh

# View History Server logs
tail -f /opt/spark/logs/spark-*-org.apache.spark.deploy.history.HistoryServer-*.out

# List all applications
curl http://localhost:18080/api/v1/applications | jq

# Get specific application details
curl http://localhost:18080/api/v1/applications/<app-id> | jq
```

## Troubleshooting

### History Server won't start
```bash
# Check if port 18080 is already in use
sudo lsof -i :18080

# Kill the process if needed
sudo kill -9 <PID>
```

### No applications showing up
```bash
# Check event log directory
ls -la ~/spark-events

# Verify Spark configuration
cat /opt/spark/conf/spark-defaults.conf | grep eventLog
```

### Java not found
```bash
# Set JAVA_HOME explicitly
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64' >> ~/.bashrc
```

## Quick Setup Script

Want to automate this? Run:

```bash
cd /home/armel/Desktop/agent-spark
chmod +x setup_local_spark.sh
./setup_local_spark.sh
```

This will install everything automatically!

---

**Next Steps:**
1. Install Java if needed
2. Download and install Spark
3. Start History Server
4. Run test job
5. Test your analyzer with real data! 🚀
