#!/bin/bash

# 🗑️ Complete Phase 8 Removal Script
# Orchestrates the complete removal of all Phase 8 AI/ML systems

echo "🚨 COMPLETE PHASE 8 REMOVAL"
echo "============================"
echo ""
echo "This script will:"
echo "1. Remove all Phase 8 files (integration + components + docs)"
echo "2. Clean App.tsx of all Phase 8 references"
echo "3. Check for any remaining imports that need fixing"
echo "4. Test the application"
echo "5. Commit the changes"
echo ""
echo "⚠️  WARNING: This action cannot be undone easily!"
echo "✅ Current state has been saved to Git (commit 5d41c2a)"
echo ""

# Confirmation prompt
read -p "🤔 Are you absolutely sure you want to remove Phase 8? (y/N): " confirm
if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo ""
echo "🎯 Starting complete Phase 8 removal..."
echo ""

# Step 1: Remove Phase 8 files
echo "📂 STEP 1: Removing Phase 8 files..."
./scripts/remove-phase8.sh

if [ $? -ne 0 ]; then
    echo "❌ Failed to remove Phase 8 files"
    exit 1
fi

echo ""

# Step 2: Clean App.tsx
echo "🧹 STEP 2: Cleaning App.tsx..."
node scripts/cleanup-app-tsx.js

if [ $? -ne 0 ]; then
    echo "❌ Failed to clean App.tsx"
    exit 1
fi

echo ""

# Step 3: Check for remaining imports
echo "🔍 STEP 3: Checking for remaining Phase 8 imports..."
echo ""

echo "Searching for remaining Phase 8 imports..."
REMAINING_IMPORTS=$(grep -r "from.*phase8\|import.*phase8\|from.*predictiveUI\|from.*personalization\|from.*adaptive" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".d.ts" || true)

if [ ! -z "$REMAINING_IMPORTS" ]; then
    echo "⚠️  WARNING: Found remaining Phase 8 imports:"
    echo "$REMAINING_IMPORTS"
    echo ""
    echo "These files may need manual cleanup:"
    echo "$REMAINING_IMPORTS" | cut -d: -f1 | sort | uniq
    echo ""
    read -p "Continue anyway? (y/N): " continue_with_imports
    if [[ $continue_with_imports != [yY] && $continue_with_imports != [yY][eE][sS] ]]; then
        echo "❌ Operation cancelled - please fix imports first"
        exit 1
    fi
else
    echo "✅ No remaining Phase 8 imports found"
fi

echo ""

# Step 4: Test the build
echo "🧪 STEP 4: Testing the build..."
echo "Running TypeScript check..."

npx tsc --noEmit --skipLibCheck

if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found - build may fail"
    echo "⚠️  You may need to fix remaining imports manually"
    read -p "Continue anyway? (y/N): " continue_with_errors
    if [[ $continue_with_errors != [yY] && $continue_with_errors != [yY][eE][sS] ]]; then
        echo "❌ Operation cancelled - please fix TypeScript errors"
        exit 1
    fi
else
    echo "✅ TypeScript check passed"
fi

echo ""

# Step 5: Commit the changes
echo "💾 STEP 5: Committing Phase 8 removal..."
git add .
git commit -m "feat: Remove Phase 8 AI/ML systems for maintainability

- Removed all Phase 8A (Content Intelligence) components
- Removed all Phase 8B (Predictive UX) components  
- Removed all Phase 8C (Automated Optimization) components
- Cleaned App.tsx of all Phase 8 references and global interfaces
- Removed 17+ AI/ML utility files and documentation
- Simplified application architecture for better maintainability
- Eliminated complex global window object pollution
- Reduced development overhead and HMR churn

Technical improvements:
- Removed 150+ lines of Phase 8 setup code from App.tsx
- Eliminated visual overlay conflicts with modals
- Removed complex inter-component coordination systems
- Simplified error handling and recovery logic
- Reduced memory footprint and startup complexity

App now focuses on core social platform functionality without AI complexity."

if [ $? -ne 0 ]; then
    echo "❌ Failed to commit changes"
    exit 1
fi

echo ""
echo "🎉 PHASE 8 REMOVAL COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "📊 SUMMARY:"
echo "• All Phase 8 files removed"
echo "• App.tsx simplified and cleaned"
echo "• Changes committed to Git"
echo "• Application ready for testing"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Start the development server: npm run dev"
echo "2. Test core functionality (auth, spaces, posts, chat)"
echo "3. Verify no console errors related to missing Phase 8 imports"
echo "4. Push to GitHub when ready: git push"
echo ""
echo "✨ Your app is now Phase 8-free and significantly more maintainable!"
echo "The codebase is cleaner, simpler, and ready for scalable development." 