#!/bin/bash
# 🚀 Production Setup Script for Lokaa Connect Spaces

set -e  # Exit on any error

echo "🚀 Starting Production Deployment Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
check_env_file() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found. Creating template..."
        cat > .env.production << EOL
# Production Environment Variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_ENVIRONMENT=production
VITE_APP_URL=https://yourdomain.com
VITE_APP_VERSION=1.0.0
EOL
        print_warning "Please update .env.production with your actual values before proceeding!"
        return 1
    else
        print_success ".env.production found"
        return 0
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing production dependencies..."
    npm ci --production=false
    print_success "Dependencies installed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    if npm run test; then
        print_success "All tests passed"
    else
        print_error "Tests failed. Please fix before deploying to production."
        exit 1
    fi
}

# Build for production
build_production() {
    print_status "Building for production..."
    
    # Clear previous build
    if [ -d "dist" ]; then
        rm -rf dist
        print_status "Cleared previous build"
    fi
    
    # Build with production environment
    NODE_ENV=production npm run build
    
    if [ -d "dist" ]; then
        print_success "Production build created successfully"
        
        # Show build size
        BUILD_SIZE=$(du -sh dist | cut -f1)
        print_status "Build size: $BUILD_SIZE"
        
        # Check for common issues
        if [ -f "dist/index.html" ]; then
            print_success "index.html generated"
        else
            print_error "index.html not found in build"
            exit 1
        fi
        
        # Check for service worker
        if [ -f "dist/sw.js" ]; then
            print_success "Service worker found"
        else
            print_warning "Service worker not found - PWA features may not work"
        fi
        
    else
        print_error "Build failed - dist directory not created"
        exit 1
    fi
}

# Security checks
security_checks() {
    print_status "Running security checks..."
    
    # Check for exposed secrets in build
    if grep -r "sk_" dist/ 2>/dev/null; then
        print_error "Potential secret keys found in build!"
        exit 1
    fi
    
    # Check for console.log in production build (should be stripped)
    if grep -r "console\.log" dist/js/ 2>/dev/null; then
        print_warning "console.log statements found in production build"
    fi
    
    print_success "Security checks completed"
}

# Performance analysis
performance_analysis() {
    print_status "Analyzing bundle performance..."
    
    # Check JavaScript bundle sizes
    print_status "JavaScript bundle sizes:"
    find dist/js -name "*.js" -exec du -sh {} \; | sort -hr
    
    # Check for large files
    LARGE_FILES=$(find dist -size +500k -type f)
    if [ -n "$LARGE_FILES" ]; then
        print_warning "Large files detected (>500KB):"
        echo "$LARGE_FILES"
    fi
    
    print_success "Performance analysis completed"
}

# Preview build locally
preview_build() {
    print_status "Starting preview server..."
    print_status "You can test your production build at http://localhost:4173"
    print_status "Press Ctrl+C to stop the preview server"
    npm run preview
}

# Deployment helpers
deployment_help() {
    echo ""
    print_status "🎯 Next Steps for Deployment:"
    echo ""
    echo "📦 Your production build is ready in the 'dist' folder"
    echo ""
    echo "🚀 Deploy to Vercel:"
    echo "   vercel --prod"
    echo ""
    echo "🚀 Deploy to Netlify:"
    echo "   netlify deploy --prod --dir=dist"
    echo ""
    echo "🚀 Deploy to AWS S3:"
    echo "   aws s3 sync dist/ s3://your-bucket-name --delete"
    echo ""
    echo "🔍 Don't forget to:"
    echo "   ✅ Update your Supabase project settings"
    echo "   ✅ Configure your custom domain"
    echo "   ✅ Set up SSL certificates"
    echo "   ✅ Test all functionality after deployment"
    echo ""
}

# Main execution flow
main() {
    print_status "🚀 Lokaa Connect Spaces - Production Setup"
    echo "=============================================="
    
    # Step 1: Check environment
    if ! check_env_file; then
        print_error "Please configure .env.production before proceeding"
        exit 1
    fi
    
    # Step 2: Install dependencies
    install_dependencies
    
    # Step 3: Run tests
    print_status "Skip tests? (y/N)"
    read -r skip_tests
    if [[ ! $skip_tests =~ ^[Yy]$ ]]; then
        run_tests
    fi
    
    # Step 4: Build
    build_production
    
    # Step 5: Security checks
    security_checks
    
    # Step 6: Performance analysis
    performance_analysis
    
    # Step 7: Ask if user wants to preview
    echo ""
    print_status "Would you like to preview the production build locally? (y/N)"
    read -r preview_choice
    
    if [[ $preview_choice =~ ^[Yy]$ ]]; then
        preview_build
    else
        deployment_help
    fi
    
    print_success "Production setup completed successfully! 🎉"
}

# Run main function
main "$@" 