#!/usr/bin/env node

// 🧹 App.tsx Phase 8 Cleanup Script
// Automatically removes all Phase 8 references from App.tsx

const fs = require('fs');
const path = require('path');

const APP_TSX_PATH = path.join(process.cwd(), 'src/App.tsx');

console.log('🧹 CLEANING APP.TSX OF PHASE 8 REFERENCES');
console.log('=========================================\n');

try {
  // Read current App.tsx
  const originalContent = fs.readFileSync(APP_TSX_PATH, 'utf8');
  console.log('📖 Reading App.tsx...');
  
  let cleanedContent = originalContent;
  
  // Step 1: Remove the entire Phase 8 global interfaces section (lines ~736-888)
  console.log('🔧 Step 1: Removing Phase 8 global interfaces...');
  const phase8SectionRegex = /\/\/ Global debugging interfaces for development\s+if \(typeof window !== 'undefined'\) \{[\s\S]*?import '@\/utils\/mobileConsoleValidation';/;
  cleanedContent = cleanedContent.replace(phase8SectionRegex, '// Global debugging interfaces for development preserved for other tools\nimport \'@/utils/mobileConsoleValidation\';');
  
  // Step 2: Remove Phase 8 cleanup code in useEffect
  console.log('🔧 Step 2: Removing Phase 8 cleanup code...');
  const phase8CleanupRegex = /\/\/ Phase 8A: Shutdown Content Intelligence systems[\s\S]*?\/\/ Phase 8C: Shutdown Automated Optimization systems[\s\S]*?\}\s*catch \(error\) \{[\s\S]*?\}/;
  cleanedContent = cleanedContent.replace(phase8CleanupRegex, '// Other cleanup handled by component unmount');
  
  // Step 3: Remove Phase 8 visual overlay prevention useEffect
  console.log('🔧 Step 3: Removing Phase 8 visual overlay prevention...');
  const phase8ProtectionRegex = /\/\/ Add Phase 8 visual overlay prevention[\s\S]*?useEffect\(\(\) => \{[\s\S]*?}, \[\]\);/;
  cleanedContent = cleanedContent.replace(phase8ProtectionRegex, '');
  
  // Step 4: Clean up any remaining Phase 8 references
  console.log('🔧 Step 4: Cleaning remaining Phase 8 references...');
  
  // Remove any standalone Phase 8 comments
  cleanedContent = cleanedContent.replace(/\/\/ Phase 8[A-C]?:.*$/gm, '');
  
  // Remove empty lines that may have been left behind (max 2 consecutive)
  cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Step 5: Ensure Phase 8 protection flags are removed but keep other important global flags
  console.log('🔧 Step 5: Cleaning global Phase 8 flags...');
  const flagsToRemove = [
    '__DISABLE_PHASE8_VISUALS__',
    '__DISABLE_PHASE_8__', 
    '__DISABLE_AI_OVERLAYS__',
    '__DISABLE_PHASE_8_VISUAL_OVERLAYS__',
    '__ENABLE_REALTIME_DASHBOARD__'
  ];
  
  flagsToRemove.forEach(flag => {
    const flagRegex = new RegExp(`\\(window as any\\)\\.${flag}\\s*=\\s*[^;]+;\\s*`, 'g');
    cleanedContent = cleanedContent.replace(flagRegex, '');
  });
  
  // Step 6: Add a clean comment about the simplification
  console.log('🔧 Step 6: Adding simplification comment...');
  const simplificationComment = `
// ✅ SIMPLIFIED: Phase 8 AI/ML systems removed for maintainability
// The app now focuses on core functionality without complex AI overlays
`;
  
  // Insert the comment after the imports
  const lastImportRegex = /(import '[^']+';)\s*(\n\s*export default function App)/;
  cleanedContent = cleanedContent.replace(lastImportRegex, `$1${simplificationComment}$2`);
  
  // Step 7: Write the cleaned content
  console.log('💾 Writing cleaned App.tsx...');
  fs.writeFileSync(APP_TSX_PATH, cleanedContent);
  
  // Step 8: Show summary
  console.log('\n✅ APP.TSX CLEANUP COMPLETED!');
  console.log('=============================');
  
  const originalLines = originalContent.split('\n').length;
  const cleanedLines = cleanedContent.split('\n').length;
  const removedLines = originalLines - cleanedLines;
  
  console.log(`📊 Lines removed: ${removedLines}`);
  console.log(`📊 Original size: ${originalLines} lines`);
  console.log(`📊 New size: ${cleanedLines} lines`);
  console.log(`📊 Reduction: ${Math.round((removedLines / originalLines) * 100)}%`);
  
  console.log('\n🎯 Phase 8 references cleaned from App.tsx!');
  console.log('The app should now be significantly simpler and more maintainable.');
  
} catch (error) {
  console.error('❌ Error cleaning App.tsx:', error.message);
  process.exit(1);
} 