#!/bin/bash

# Zuidplas Logistics Tool - Vercel Development Script
# This script runs the project using Vercel's dev server

echo "🚀 Zuidplas Logistics Tool - Vercel Dev Mode"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed!"
    echo ""
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo ""
fi

echo "✅ Vercel CLI version: $(vercel --version)"
echo ""

# Check if .vercel directory exists (project linked)
if [ ! -d ".vercel" ]; then
    echo "🔗 Linking project to Vercel..."
    echo "   You may need to login and select your project."
    vercel link
    echo ""
fi

echo "🌐 Starting Vercel dev server..."
echo "   This will use the serverless functions in /api/"
echo ""
echo "📝 The application will be available at:"
echo "   http://localhost:3000"
echo ""
echo "⚠️  IMPORTANT: Make sure you've set environment variables in Vercel:"
echo "   - FLORINET_USERNAME"
echo "   - FLORINET_PASSWORD"
echo ""
echo "   Go to: Vercel Dashboard → Your Project → Settings → Environment Variables"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Vercel dev server
vercel dev

