#!/bin/bash

# Start both servers for Zuidplas Logistics Tool
# This script runs both the proxy server and HTTP server

echo "🚀 Starting Zuidplas Logistics Tool..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Starting servers..."
echo ""
echo "📝 IMPORTANT:"
echo "   - Proxy server will run on port 3001 (handles API calls)"
echo "   - HTTP server will run on port 8080 (serves static files)"
echo "   - Open http://localhost:8080 in your browser"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start proxy server in background
echo "🌐 Starting proxy server (port 3001)..."
npm start > /tmp/proxy-server.log 2>&1 &
PROXY_PID=$!

# Wait a moment for proxy to start
sleep 2

# Start HTTP server in background
echo "🌐 Starting HTTP server (port 8080)..."
python3 -m http.server 8080 > /tmp/http-server.log 2>&1 &
HTTP_PID=$!

echo ""
echo "✅ Both servers started!"
echo "   Proxy server PID: $PROXY_PID"
echo "   HTTP server PID: $HTTP_PID"
echo ""
echo "📝 Open http://localhost:8080 in your browser"
echo ""
echo "📋 Logs:"
echo "   Proxy server: tail -f /tmp/proxy-server.log"
echo "   HTTP server: tail -f /tmp/http-server.log"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $PROXY_PID 2>/dev/null
    kill $HTTP_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for user to stop
echo "Press Ctrl+C to stop..."
wait



