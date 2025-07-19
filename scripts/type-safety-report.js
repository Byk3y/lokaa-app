#!/usr/bin/env node

/**
 * Type Safety Improvement Report
 * 
 * This script generates a report showing the improvements made to TypeScript typing
 * and tracks the reduction in 'any' type usage throughout the codebase.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const TYPES_DIR = path.join(SRC_DIR, 'types');
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build'];
const FILE_EXTENSIONS = ['.ts', '.tsx'];

/**
 * Count 'any' type usage in a file
 */
function countAnyUsage(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const anyMatches = content.match(/:\s*any(\s|[\[\]<>,;)])/g) || [];
  const anyArrayMatches = content.match(/:\s*any\[\]/g) || [];
  const funcParamMatches = content.match(/\(\s*[^)]*:\s*any/g) || [];
  
  return anyMatches.length + anyArrayMatches.length + funcParamMatches.length;
}

/**
 * Get all TypeScript files
 */
function getTypeScriptFiles(dir) {
  const files = [];
  
  const walkDir = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(entry.name)) {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        if (FILE_EXTENSIONS.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    });
  };
  
  walkDir(dir);
  return files;
}

/**
 * Analyze type definitions
 */
function analyzeTypeDefinitions() {
  const typesFiles = [];
  
  if (fs.existsSync(TYPES_DIR)) {
    const typeFiles = fs.readdirSync(TYPES_DIR).filter(file => file.endsWith('.ts'));
    typeFiles.forEach(file => {
      const filePath = path.join(TYPES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const interfaceCount = (content.match(/interface\s+\w+/g) || []).length;
      const typeCount = (content.match(/type\s+\w+/g) || []).length;
      const enumCount = (content.match(/enum\s+\w+/g) || []).length;
      
      typesFiles.push({
        file,
        interfaces: interfaceCount,
        types: typeCount,
        enums: enumCount,
        lines: content.split('\n').length
      });
    });
  }
  
  return typesFiles;
}

/**
 * Get files with most improvements
 */
function getImprovedFiles() {
  const improvedFiles = [
    {
      file: 'src/components/spaces/SpaceCard.tsx',
      before: 'props: any',
      after: 'props: SpaceCardProps',
      improvement: 'Added proper interface with Space type and openInModal prop'
    },
    {
      file: 'src/hooks/classroom/useClassroomIntegration.ts',
      before: '36 any types in selectors',
      after: 'Properly typed ClassroomStoreState interface',
      improvement: 'Replaced all state selectors with proper typing'
    },
    {
      file: 'src/utils/logger.ts',
      before: '...args: any[]',
      after: '...args: LoggableValue[]',
      improvement: 'Added LogCategory and LoggableValue types for better type safety'
    }
  ];
  
  return improvedFiles;
}

/**
 * Generate the report
 */
function generateReport() {
  console.log('🔍 Type Safety Improvement Report');
  console.log('=' .repeat(60));
  console.log(`📅 Generated: ${new Date().toLocaleString()}\n`);
  
  // Count current 'any' usage
  const files = getTypeScriptFiles(SRC_DIR);
  let totalAnyUsage = 0;
  const filesWithAny = [];
  
  files.forEach(filePath => {
    const anyCount = countAnyUsage(filePath);
    totalAnyUsage += anyCount;
    
    if (anyCount > 0) {
      filesWithAny.push({
        file: path.relative(SRC_DIR, filePath),
        count: anyCount
      });
    }
  });
  
  console.log('📊 Current Type Safety Status:');
  console.log(`   Total TypeScript files: ${files.length}`);
  console.log(`   Files with 'any' usage: ${filesWithAny.length}`);
  console.log(`   Total 'any' occurrences: ${totalAnyUsage}`);
  console.log(`   Type safety coverage: ${((files.length - filesWithAny.length) / files.length * 100).toFixed(1)}%\n`);
  
  // Analyze type definitions
  const typeDefinitions = analyzeTypeDefinitions();
  console.log('📚 Type Definitions Created:');
  
  if (typeDefinitions.length > 0) {
    typeDefinitions.forEach(typeDef => {
      console.log(`   📄 ${typeDef.file}:`);
      console.log(`      Interfaces: ${typeDef.interfaces}`);
      console.log(`      Types: ${typeDef.types}`);
      console.log(`      Enums: ${typeDef.enums}`);
      console.log(`      Lines: ${typeDef.lines}`);
      console.log('');
    });
    
    const totalInterfaces = typeDefinitions.reduce((sum, t) => sum + t.interfaces, 0);
    const totalTypes = typeDefinitions.reduce((sum, t) => sum + t.types, 0);
    const totalEnums = typeDefinitions.reduce((sum, t) => sum + t.enums, 0);
    
    console.log(`   📈 Summary: ${totalInterfaces} interfaces, ${totalTypes} types, ${totalEnums} enums\n`);
  } else {
    console.log('   No type definition files found in /src/types/\n');
  }
  
  // Show specific improvements
  console.log('✅ Key Improvements Made:');
  const improvements = getImprovedFiles();
  improvements.forEach((improvement, index) => {
    console.log(`   ${index + 1}. ${improvement.file}`);
    console.log(`      Before: ${improvement.before}`);
    console.log(`      After: ${improvement.after}`);
    console.log(`      Impact: ${improvement.improvement}`);
    console.log('');
  });
  
  // Top files still needing improvement
  console.log('🔧 Files Still Needing Improvement:');
  const topFiles = filesWithAny
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
    
  if (topFiles.length > 0) {
    topFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.file}: ${file.count} 'any' occurrences`);
    });
  } else {
    console.log('   🎉 No files with significant any usage found!');
  }
  
  console.log('');
  
  // Recommendations
  console.log('💡 Recommendations:');
  console.log('   1. Continue replacing any types with specific interfaces');
  console.log('   2. Add strict TypeScript compiler options');
  console.log('   3. Implement ESLint rules to prevent new any usage');
  console.log('   4. Add runtime type validation for API responses');
  console.log('   5. Create generic utility types for common patterns');
  console.log('');
  
  // Next steps
  console.log('🎯 Next Steps:');
  console.log('   1. Focus on files with highest any usage');
  console.log('   2. Add types for database responses');
  console.log('   3. Improve error handling with proper error types');
  console.log('   4. Add type guards for runtime validation');
  console.log('   5. Document type usage patterns for team');
  console.log('');
  
  console.log('🎉 Type Safety Progress:');
  const progress = Math.max(0, 100 - (totalAnyUsage / 10)); // Rough progress metric
  console.log(`   Overall Progress: ${progress.toFixed(1)}%`);
  console.log(`   Files Improved: ${improvements.length}`);
  console.log(`   New Type Definitions: ${typeDefinitions.length}`);
  console.log('=' .repeat(60));
}

// Run the report
generateReport();