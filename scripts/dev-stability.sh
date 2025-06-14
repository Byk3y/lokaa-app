#!/bin/bash

# Development Environment Stability Script
# Prevents multiple server conflicts and resource exhaustion

echo "🔧 Development Environment Stability Check"
echo "========================================"

# Function to clean up development processes
cleanup_dev_processes() {
    echo "🧹 Cleaning up development processes..."
    
    # Kill any vite or npm dev processes
    pkill -f "node.*vite" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    
    # Kill any processes using our port range
    for port in {8080..8086}; do
        pid=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pid" ]; then
            echo "🔄 Killing process $pid on port $port"
            kill -9 $pid 2>/dev/null || true
        fi
    done
    
    sleep 2
    echo "✅ Process cleanup complete"
}

# Function to validate environment
validate_environment() {
    echo "🔍 Validating development environment..."
    
    # Check Node.js version
    node_version=$(node --version)
    echo "📦 Node.js: $node_version"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found! Run this script from project root."
        exit 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Check for port availability
    for port in {8080..8082}; do
        if lsof -ti:$port >/dev/null 2>&1; then
            echo "⚠️  Port $port is in use"
        else
            echo "✅ Port $port is available"
            break
        fi
    done
    
    echo "✅ Environment validation complete"
}

# Function to start clean development server
start_clean_server() {
    echo "🚀 Starting clean development server..."
    
    # Set environment variables for stability
    export NODE_OPTIONS="--max-old-space-size=4096"
    export VITE_PORT=8080
    
    # Start development server with optimized settings
    echo "🌟 Starting server with optimized settings..."
    echo "   - Memory limit: 4GB"
    echo "   - Target port: 8080"
    echo "   - React Fast Refresh: Enabled"
    
    npm run dev
}

# Main execution
main() {
    echo "🎯 Starting development environment stabilization..."
    
    cleanup_dev_processes
    validate_environment
    start_clean_server
}

# Execute if script is run directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi 