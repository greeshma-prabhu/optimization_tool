#!/bin/bash
# Create public directory and copy all static files
mkdir -p public
cp *.html public/
cp -r js public/
cp -r css public/ 2>/dev/null || true
echo "Build complete!"
