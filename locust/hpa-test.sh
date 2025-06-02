#!/bin/bash

# HPA Load Testing Script for Todo App
# This script generates CPU load to test Horizontal Pod Autoscaler

set -e

echo "🚀 Starting HPA Load Test for Todo App"
echo "========================================"

# Configuration
AUTH_URL="http://34.22.249.41:30081"
TODO_URL="http://34.22.249.41:30082"
FRONTEND_URL="http://34.22.249.41:30080"
INSIGHTS_URL="https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app"

# Test parameters
USERS=${1:-50}
SPAWN_RATE=${2:-10}
DURATION=${3:-300}

echo "📊 Test Configuration:"
echo "  Users: $USERS"
echo "  Spawn Rate: $SPAWN_RATE/sec"
echo "  Duration: ${DURATION}s"
echo "  Target URLs:"
echo "    - Auth: $AUTH_URL"
echo "    - Todo: $TODO_URL"
echo "    - Frontend: $FRONTEND_URL"
echo "    - AI Insights: $INSIGHTS_URL"
echo ""

# Pre-test health checks
echo "🔍 Pre-test Health Checks:"
echo -n "  Auth Service: "
if curl -s "$AUTH_URL/health" > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
    exit 1
fi

echo -n "  Todo Service: "
if curl -s "$TODO_URL/health" > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
    exit 1
fi

echo -n "  Frontend: "
if curl -s "$FRONTEND_URL" > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
    exit 1
fi

echo ""

# Check initial HPA status
echo "📈 Initial HPA Status:"
kubectl get hpa -n todo-app || echo "HPA not found!"
echo ""

echo "📊 Initial Pod Status:"
kubectl get pods -n todo-app
echo ""

# Start monitoring in background
echo "🔍 Starting HPA monitoring (background)..."
kubectl get hpa -n todo-app -w > hpa-monitor.log &
HPA_MONITOR_PID=$!

kubectl top pods -n todo-app -w > cpu-monitor.log &
CPU_MONITOR_PID=$!

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    kill $HPA_MONITOR_PID 2>/dev/null || true
    kill $CPU_MONITOR_PID 2>/dev/null || true
    echo "✅ Cleanup completed"
}

trap cleanup EXIT

# Start load test
echo "🔥 Starting Load Test..."
echo "   Use Ctrl+C to stop early"
echo ""

# Run the CPU intensive load test
locust -f locustfile.py CPUIntensiveUser \
    --host $AUTH_URL \
    --auth-url $AUTH_URL \
    --todo-url $TODO_URL \
    --frontend-url $FRONTEND_URL \
    --insights-url $INSIGHTS_URL \
    -u $USERS \
    -r $SPAWN_RATE \
    -t ${DURATION}s \
    --headless \
    --only-summary

echo ""
echo "📊 Post-test HPA Status:"
kubectl get hpa -n todo-app
echo ""

echo "📊 Final Pod Status:"
kubectl get pods -n todo-app
echo ""

echo "📈 CPU Usage:"
kubectl top pods -n todo-app
echo ""

echo "🎉 HPA Load Test Completed!"
echo ""
echo "📁 Log files created:"
echo "  - hpa-monitor.log: HPA scaling events"
echo "  - cpu-monitor.log: CPU usage over time"
echo ""
echo "🔍 To analyze results:"
echo "  tail -n 20 hpa-monitor.log"
echo "  tail -n 20 cpu-monitor.log" 