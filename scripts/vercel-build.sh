#!/bin/bash

# Vercel Build Script for Vite Project
# This script ensures the build is properly configured for Vite

echo "🚀 Starting Vercel build for Vite project..."

# Run the build
npm run build

# Validate build output
if [ ! -d "dist" ]; then
    echo "❌ Build failed: dist directory not found"
    exit 1
fi

# Check for Next.js artifacts (should not exist)
if [ -f "dist/routes-manifest.json" ]; then
    echo "❌ Build failed: Next.js routes-manifest.json found in dist"
    rm -f dist/routes-manifest.json
fi

if [ -d "dist/.next" ]; then
    echo "❌ Build failed: Next.js .next directory found in dist"
    rm -rf dist/.next
fi

# Ensure index.html exists
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build failed: index.html not found in dist"
    exit 1
fi

echo "✅ Build completed successfully for Vite project"
echo "📁 Build output: dist/"
ls -la dist/

exit 0 