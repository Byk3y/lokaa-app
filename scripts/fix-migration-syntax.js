#!/usr/bin/env node

/**
 * Fix Migration Syntax Errors
 * 
 * This script fixes the syntax errors introduced by the logging migration
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

// Patterns to fix
const SYNTAX_FIXES = [
  // Fix malformed log.debug calls with extra parentheses
  {
    pattern: /log\.debug\('([^']+)',\s*\(/g,
    replacement: "log.debug('$1', "
  },
  // Fix malformed log.info calls
  {
    pattern: /log\.info\('([^']+)',\s*\(/g,
    replacement: "log.info('$1', "
  },
  // Fix malformed log.warn calls
  {
    pattern: /log\.warn\('([^']+)',\s*\(/g,
    replacement: "log.warn('$1', "
  },
  // Fix malformed log.error calls
  {
    pattern: /log\.error\('([^']+)',\s*\(/g,
    replacement: "log.error('$1', "
  },
  // Fix malformed callback patterns like log.error('App',);
  {
    pattern: /log\.error\('([^']+)',\s*\)\s*;/g,
    replacement: "err => log.error('$1', 'Error occurred:', err);"
  },
  // Fix malformed callback patterns for other log levels
  {
    pattern: /log\.debug\('([^']+)',\s*\)\s*;/g,
    replacement: "msg => log.debug('$1', 'Debug message:', msg);"
  },
  // Fix double parentheses pattern like log.group('Utils',('text');
  {
    pattern: /log\.group\('([^']+)',\s*\(/g,
    replacement: "log.group('$1', "
  },
  // Fix double parentheses pattern like log.debug('Utils',('text');
  {
    pattern: /log\.debug\('([^']+)',\s*\(/g,
    replacement: "log.debug('$1', "
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
 * Fix syntax errors in a file
 */
function fixFileSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let hasChanges = false;
  
  // Apply syntax fixes
  SYNTAX_FIXES.forEach(fix => {
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
  console.log('🔧 Fixing migration syntax errors...\n');
  
  const files = getSourceFiles();
  let fixedCount = 0;
  
  files.forEach(filePath => {
    if (fixFileSyntax(filePath)) {
      fixedCount++;
      console.log(`✅ Fixed: ${path.relative(SRC_DIR, filePath)}`);
    }
  });
  
  console.log(`\n🎉 Fixed syntax errors in ${fixedCount} files`);
}

// ES module entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;