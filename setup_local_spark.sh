#!/bin/bash

# Automated Spark Local Setup Script
# This script installs Apache Spark and configures History Server

set -e  # Exit on error

echo "🚀 Setting up Apache Spark locally..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Step 1: Check/Install Java
echo -e "\n${YELLOW}Step 1: Checking Java installation...${NC}"
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
    echo -e "${GREEN}✓ Java is already installed: $JAVA_VERSION${NC}"
else
    echo -e "${YELLOW}Installing OpenJDK 11...${NC}"
    sudo apt update
    sudo apt install -y openjdk-11-jdk
    echo -e "${GREEN}✓ Java installed${NC}"
fi

# Step 2: Download and Install Spark
echo -e "\n${YELLOW}Step 2: Installing Apache Spark...${NC}"

SPARK_VERSION="3.5.3"
HADOOP_VERSION="3"
SPARK_DIR="spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}"
SPARK_TAR="${SPARK_DIR}.tgz"

if [ -d "/opt/spark" ]; then
    echo -e "${GREEN}✓ Spark is already installed at /opt/spark${NC}"
else
    cd ~
    
    if [ ! -f "$SPARK_TAR" ]; then
        echo "Downloading Spark ${SPARK_VERSION}..."
        # Use archive.apache.org for reliable downloads
        wget "https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/${SPARK_TAR}"
    fi
    
    echo "Extracting Spark..."
    tar -xzf "$SPARK_TAR"
    
    echo "Moving to /opt/spark..."
    sudo mv "$SPARK_DIR" /opt/spark
    
    echo -e "${GREEN}✓ Spark installed${NC}"
fi

# Step 3: Configure Environment Variables
echo -e "\n${YELLOW}Step 3: Configuring environment variables...${NC}"

if ! grep -q "SPARK_HOME" ~/.bashrc; then
    echo "Adding Spark to PATH..."
    cat >> ~/.bashrc << 'EOF'

# Apache Spark Configuration
export SPARK_HOME=/opt/spark
export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin
export PYSPARK_PYTHON=python3
EOF
    echo -e "${GREEN}✓ Environment variables added to ~/.bashrc${NC}"
else
    echo -e "${GREEN}✓ Environment variables already configured${NC}"
fi

# Source the bashrc for current session
export SPARK_HOME=/opt/spark
export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin
export PYSPARK_PYTHON=python3

# Step 4: Create Event Log Directory
echo -e "\n${YELLOW}Step 4: Creating event log directory...${NC}"
mkdir -p ~/spark-events
echo -e "${GREEN}✓ Event log directory created at ~/spark-events${NC}"

# Step 5: Configure Spark
echo -e "\n${YELLOW}Step 5: Configuring Spark for event logging...${NC}"

if [ ! -f "/opt/spark/conf/spark-defaults.conf" ]; then
    sudo cp /opt/spark/conf/spark-defaults.conf.template /opt/spark/conf/spark-defaults.conf
fi

# Add event logging configuration if not already present
if ! sudo grep -q "spark.eventLog.enabled" /opt/spark/conf/spark-defaults.conf; then
    sudo tee -a /opt/spark/conf/spark-defaults.conf > /dev/null << EOF

# Event Logging Configuration (added by setup script)
spark.eventLog.enabled           true
spark.eventLog.dir               file://$HOME/spark-events
spark.history.fs.logDirectory    file://$HOME/spark-events
EOF
    echo -e "${GREEN}✓ Spark configured for event logging${NC}"
else
    echo -e "${GREEN}✓ Event logging already configured${NC}"
fi

# Step 6: Create test job
echo -e "\n${YELLOW}Step 6: Creating test Spark job...${NC}"

cat > ~/test_spark_job.py << 'EOF'
from pyspark.sql import SparkSession
import time

print("Starting Spark job with intentionally bad configuration...")

# Create Spark session with bad configs (for demo)
spark = SparkSession.builder \
    .appName("TestJob_BadConfig_Demo") \
    .config("spark.driver.memory", "2g") \
    .config("spark.executor.memory", "1g") \
    .config("spark.sql.shuffle.partitions", "200") \
    .getOrCreate()

print("Generating sample data...")
# Create sample data
data = [(i, f"name_{i % 1000}", i * 100) for i in range(100000)]
df = spark.createDataFrame(data, ["id", "name", "value"])

print("Performing aggregations...")
# Perform some operations that will generate metrics
result = df.groupBy("name").agg({"value": "sum", "id": "count"})
result = result.orderBy("name")

# Force computation
count = result.count()
print(f"Result count: {count}")
result.show(10)

# Add some delay to generate more metrics
time.sleep(2)

print("Job completed!")
spark.stop()
EOF

echo -e "${GREEN}✓ Test job created at ~/test_spark_job.py${NC}"

# Step 7: Start History Server
echo -e "\n${YELLOW}Step 7: Starting Spark History Server...${NC}"

# Check if already running
if lsof -Pi :18080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}History Server is already running on port 18080${NC}"
else
    $SPARK_HOME/sbin/start-history-server.sh
    sleep 3
    
    if lsof -Pi :18080 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓ History Server started on http://localhost:18080${NC}"
    else
        echo -e "${RED}✗ Failed to start History Server${NC}"
        echo "Check logs at: /opt/spark/logs/"
    fi
fi

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Spark Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Reload your shell or run: source ~/.bashrc"
echo "2. Run test job: spark-submit ~/test_spark_job.py"
echo "3. View History Server: http://localhost:18080"
echo "4. Update .env file in agent-spark directory:"
echo "   SPARK_HISTORY_SERVER_URL=http://localhost:18080"
echo "   USE_MOCK_DATA=false"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  Start History Server:  start-history-server.sh"
echo "  Stop History Server:   stop-history-server.sh"
echo "  Run test job:          spark-submit ~/test_spark_job.py"
echo "  View applications:     curl http://localhost:18080/api/v1/applications"
echo ""
echo -e "${GREEN}Happy Spark testing! 🚀${NC}"
