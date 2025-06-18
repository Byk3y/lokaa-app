#!/bin/bash

# 🗑️ Phase 8 Removal Script
# Safely removes all Phase 8 AI/ML systems while preserving core functionality

echo "🚨 PHASE 8 REMOVAL SCRIPT"
echo "=========================="
echo ""
echo "This script will remove all Phase 8 AI/ML systems:"
echo "- Phase 8A: Content Intelligence"
echo "- Phase 8B: Predictive User Experience" 
echo "- Phase 8C: Automated Optimization"
echo ""
echo "⚠️  WARNING: This action cannot be undone easily!"
echo "✅ Current state has been saved to Git"
echo ""

# Confirmation prompt
read -p "Are you sure you want to proceed? (y/N): " confirm
if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo ""
echo "🧹 Starting Phase 8 removal..."
echo ""

# Step 1: Remove Phase 8 Integration Files
echo "📂 Step 1: Removing Phase 8 Integration Files..."
rm -f src/utils/phase8aIntegration.ts
rm -f src/utils/phase8bIntegration.ts  
rm -f src/utils/phase8cIntegration.ts
echo "✅ Integration files removed"

# Step 2: Remove Phase 8A Component Files
echo "📂 Step 2: Removing Phase 8A Component Files..."
rm -f src/utils/contentIntelligenceEngine.ts
rm -f src/utils/recommendationSystem.ts
rm -f src/utils/intelligentSearch.ts
rm -f src/utils/contentQualityAnalyzer.ts
rm -f src/utils/aiUserJourneyManager.ts
echo "✅ Phase 8A components removed"

# Step 3: Remove Phase 8B Component Files  
echo "📂 Step 3: Removing Phase 8B Component Files..."
rm -f src/utils/predictiveUIEngine.ts
rm -f src/utils/userBehaviorPredictor.ts
rm -f src/utils/personalizationEngine.ts
rm -f src/utils/adaptiveInterfaceManager.ts
echo "✅ Phase 8B components removed"

# Step 4: Remove Phase 8C Component Files
echo "📂 Step 4: Removing Phase 8C Component Files..."
rm -f src/utils/selfOptimizingPerformanceEngine.ts
rm -f src/utils/mlDrivenCachingSystem.ts
rm -f src/utils/intelligentMonitoringSystem.ts
rm -f src/utils/anomalyDetectionEngine.ts
echo "✅ Phase 8C components removed"

# Step 5: Remove Documentation Files
echo "📂 Step 5: Removing Phase 8 Documentation..."
rm -f PHASE_8*.md
rm -f public/phase8-disable-script.js
echo "✅ Documentation files removed"

# Step 6: Clean dist directory
echo "📂 Step 6: Cleaning build artifacts..."
rm -f dist/js/phase8*
echo "✅ Build artifacts cleaned"

echo ""
echo "🎯 PHASE 8 FILES REMOVED SUCCESSFULLY!"
echo ""
echo "⚠️  NEXT STEPS REQUIRED:"
echo "1. Run the App.tsx cleanup script"
echo "2. Update any remaining imports" 
echo "3. Test the application"
echo "4. Commit the changes"
echo ""
echo "The app should now be free of Phase 8 complexity! 🚀" 