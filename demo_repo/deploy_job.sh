#!/bin/bash

echo "Deploying Production Job..."

# This is a sample spark-submit command with INTENTIONALLY BAD configs
# for the hackathon demo.

# BAD PRACTICE: Allocating 20G driver memory for a small job
APP_NAME="Production_Data_Pipeline_v1"

spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --driver-memory 20g \
  --executor-memory 8g \
  --executor-cores 4 \
  --num-executors 10 \
  --conf spark.default.parallelism=100 \
  --conf spark.sql.shuffle.partitions=200 \
  --class com.company.etl.Main \
  s3://my-bucket/jars/etl-job-1.0.jar \
  --input s3://data/input \
  --output s3://data/output

echo "Job Submitted!"
