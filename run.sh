#!/bin/bash

# Zuidplas Logistics Tool - Run Script
# This script helps you run the project locally

echo "🚀 Zuidplas Logistics Tool - Starting..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "⚠️  Warning: Node.js version should be 14 or higher"
    echo "   Current version: $(node -v)"
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if port 3001 is available
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 3001 is already in use!"
    echo "   The proxy server might already be running."
    echo "   Press Ctrl+C to stop it, or use a different port."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🌐 Starting proxy server on port 3001..."
echo "   The proxy server is required for API calls to work."
echo ""
echo "📝 To access the application:"
echo "   1. Open http://localhost:3001 in your browser"
echo "   2. Or open index.html directly (for static files)"
echo ""
echo "⚠️  Note: For Vercel deployment, you don't need this proxy server."
echo "   The serverless functions in /api/ handle authentication."
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the proxy server
npm start



