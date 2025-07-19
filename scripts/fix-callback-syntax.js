#!/usr/bin/env node

/**
 * Fix Callback Syntax Errors
 * 
 * This script fixes callback syntax errors like log.error('App',); 
 * which should be proper callback functions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Patterns to fix callback syntax issues
const CALLBACK_FIXES = [
  // Fix malformed callbacks like .catch(log.error('App',);
  {
    pattern: /\.catch\(log\.error\('([^']+)',\s*\)\s*;/g,
    replacement: ".catch(err => log.error('$1', 'Error occurred:', err));"
  },
  // Fix malformed callbacks like .catch(log.debug('App',);
  {
    pattern: /\.catch\(log\.debug\('([^']+)',\s*\)\s*;/g,
    replacement: ".catch(err => log.debug('$1', 'Debug error:', err));"
  },
  // Fix malformed callbacks like .catch(log.warn('App',);
  {
    pattern: /\.catch\(log\.warn\('([^']+)',\s*\)\s*;/g,
    replacement: ".catch(err => log.warn('$1', 'Warning:', err));"
  },
  // Fix malformed callbacks like .then(log.debug('App',);
  {
    pattern: /\.then\(log\.debug\('([^']+)',\s*\)\s*;/g,
    replacement: ".then(result => log.debug('$1', 'Success:', result));"
  },
  // Fix malformed callbacks like .then(log.info('App',);
  {
    pattern: /\.then\(log\.info\('([^']+)',\s*\)\s*;/g,
    replacement: ".then(result => log.info('$1', 'Success:', result));"
  }
];

/**
 * Get all source files
 */
function getSourceFiles() {
  const files = [];
  
  const walkDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      
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
  
  walkDir(SRC_DIR);
  return files;
}

/**
 * Fix callback syntax errors in a file
 */
function fixFileSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let hasChanges = false;
  
  // Apply callback fixes
  CALLBACK_FIXES.forEach(fix => {
    const before = modified;
    modified = modified.replace(fix.pattern, fix.replacement);
    if (modified !== before) {
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, modified, 'utf8');
    return true;
  }
  
  return false;
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Fixing callback syntax errors...\n');
  
  const files = getSourceFiles();
  let fixedCount = 0;
  
  files.forEach(filePath => {
    if (fixFileSyntax(filePath)) {
      fixedCount++;
      console.log(`✅ Fixed callbacks: ${path.relative(SRC_DIR, filePath)}`);
    }
  });
  
  console.log(`\n🎉 Fixed callback syntax errors in ${fixedCount} files`);
}

// ES module entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;