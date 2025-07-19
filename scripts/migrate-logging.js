#!/usr/bin/env node

/**
 * Logging Migration Script
 * 
 * This script helps migrate console.log statements to use the production-safe logger.
 * It provides analysis, automated migration, and verification capabilities.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build'];
const EXCLUDED_FILES = ['migrate-logging.js', 'logger.ts', 'developmentLogger.ts'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Logging patterns to detect
const CONSOLE_PATTERNS = [
  /console\.log\s*\(/g,
  /console\.warn\s*\(/g,
  /console\.error\s*\(/g,
  /console\.debug\s*\(/g,
  /console\.info\s*\(/g,
  /console\.trace\s*\(/g,
  /console\.table\s*\(/g,
  /console\.group\s*\(/g,
  /console\.groupEnd\s*\(/g,
  /console\.time\s*\(/g,
  /console\.timeEnd\s*\(/g,
  /console\.assert\s*\(/g
];

// Migration mappings
const MIGRATION_MAPPINGS = {
  'console.log': 'log.debug',
  'console.warn': 'log.warn',
  'console.error': 'log.error',
  'console.debug': 'log.debug',
  'console.info': 'log.info',
  'console.trace': 'log.debug',
  'console.table': 'log.table',
  'console.group': 'log.group',
  'console.groupEnd': 'log.groupEnd',
  'console.time': 'log.time',
  'console.timeEnd': 'log.timeEnd',
  'console.assert': 'log.assert'
};

class LoggingMigrator {
  constructor() {
    this.stats = {
      totalFiles: 0,
      filesWithConsole: 0,
      totalConsoleStatements: 0,
      migrationCandidates: 0,
      filesModified: 0,
      errorsEncountered: 0
    };
  }

  /**
   * Analyze current logging usage
   */
  analyze() {
    console.log('🔍 Analyzing logging usage...\n');
    
    const files = this.getSourceFiles();
    const analysis = {
      fileBreakdown: [],
      categoryBreakdown: {},
      patternBreakdown: {},
      recommendations: []
    };

    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      const consoleMatches = this.findConsoleStatements(content);
      
      this.stats.totalFiles++;
      
      if (consoleMatches.length > 0) {
        this.stats.filesWithConsole++;
        this.stats.totalConsoleStatements += consoleMatches.length;
        
        analysis.fileBreakdown.push({
          file: path.relative(SRC_DIR, filePath),
          count: consoleMatches.length,
          patterns: consoleMatches.map(match => match.type)
        });
        
        // Analyze patterns
        consoleMatches.forEach(match => {
          analysis.patternBreakdown[match.type] = (analysis.patternBreakdown[match.type] || 0) + 1;
        });
      }
    });

    this.printAnalysis(analysis);
    return analysis;
  }

  /**
   * Find console statements in content
   */
  findConsoleStatements(content) {
    const matches = [];
    
    CONSOLE_PATTERNS.forEach(pattern => {
      const patternMatches = content.matchAll(pattern);
      for (const match of patternMatches) {
        matches.push({
          type: match[0].replace(/\s*\($/, ''),
          index: match.index,
          line: this.getLineNumber(content, match.index)
        });
      }
    });
    
    return matches.sort((a, b) => a.index - b.index);
  }

  /**
   * Get line number from index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Get all source files
   */
  getSourceFiles() {
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
          if (FILE_EXTENSIONS.includes(path.extname(entry.name)) && 
              !EXCLUDED_FILES.includes(entry.name)) {
            files.push(fullPath);
          }
        }
      });
    };
    
    walkDir(SRC_DIR);
    return files;
  }

  /**
   * Print analysis results
   */
  printAnalysis(analysis) {
    console.log('📊 Logging Analysis Report');
    console.log('=' .repeat(50));
    console.log(`Total files analyzed: ${this.stats.totalFiles}`);
    console.log(`Files with console statements: ${this.stats.filesWithConsole}`);
    console.log(`Total console statements: ${this.stats.totalConsoleStatements}`);
    console.log();
    
    console.log('📈 Pattern Breakdown:');
    Object.entries(analysis.patternBreakdown)
      .sort(([,a], [,b]) => b - a)
      .forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count} statements`);
      });
    console.log();
    
    console.log('🔥 Top 10 Files with Most Console Statements:');
    analysis.fileBreakdown
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.file}: ${file.count} statements`);
      });
    console.log();
    
    // Recommendations
    console.log('💡 Recommendations:');
    if (this.stats.totalConsoleStatements > 1000) {
      console.log('  ⚠️  High logging volume detected - consider batch migration');
    }
    
    if (analysis.patternBreakdown['console.log'] > 500) {
      console.log('  🔧 Many console.log statements - prioritize these for migration');
    }
    
    if (analysis.patternBreakdown['console.error'] > 100) {
      console.log('  🚨 Many console.error statements - these should remain but be categorized');
    }
    
    console.log('  📦 Use: npm run migrate-logging -- --migrate to start migration');
    console.log('  🧪 Use: npm run migrate-logging -- --dry-run to preview changes');
    console.log();
  }

  /**
   * Migrate console statements to logger
   */
  migrate(dryRun = false) {
    console.log(`🔄 ${dryRun ? 'Previewing' : 'Starting'} logging migration...\n`);
    
    const files = this.getSourceFiles();
    const modifications = [];
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      const consoleMatches = this.findConsoleStatements(content);
      
      if (consoleMatches.length > 0) {
        const modified = this.migrateFile(filePath, content, consoleMatches, dryRun);
        if (modified) {
          modifications.push({
            file: path.relative(SRC_DIR, filePath),
            changes: consoleMatches.length
          });
        }
      }
    });
    
    if (dryRun) {
      console.log('🔍 Dry run completed - no files modified');
      console.log(`Would modify ${modifications.length} files`);
    } else {
      console.log(`✅ Migration completed - modified ${modifications.length} files`);
    }
    
    return modifications;
  }

  /**
   * Migrate a single file
   */
  migrateFile(filePath, content, consoleMatches, dryRun) {
    let modified = content;
    let hasChanges = false;
    
    // Add import if not present
    if (!content.includes('import { log }') && !content.includes('import { logger }')) {
      const importStatement = "import { log } from '@/utils/logger';\n";
      modified = importStatement + modified;
      hasChanges = true;
    }
    
    // Replace console statements
    Object.entries(MIGRATION_MAPPINGS).forEach(([from, to]) => {
      const pattern = new RegExp(from.replace('.', '\\.') + '\\s*\\(', 'g');
      const matches = modified.match(pattern);
      
      if (matches) {
        // For most cases, we need to add a category parameter
        modified = modified.replace(pattern, (match) => {
          const category = this.inferCategory(filePath);
          return `${to}('${category}', `;
        });
        hasChanges = true;
      }
    });
    
    if (hasChanges && !dryRun) {
      try {
        fs.writeFileSync(filePath, modified, 'utf8');
        this.stats.filesModified++;
      } catch (error) {
        console.error(`❌ Error modifying ${filePath}:`, error.message);
        this.stats.errorsEncountered++;
        return false;
      }
    }
    
    return hasChanges;
  }

  /**
   * Infer category from file path
   */
  inferCategory(filePath) {
    const relativePath = path.relative(SRC_DIR, filePath);
    const parts = relativePath.split(path.sep);
    
    // Extract meaningful category from path
    if (parts.includes('components')) {
      return 'Component';
    } else if (parts.includes('utils')) {
      return 'Utils';
    } else if (parts.includes('hooks')) {
      return 'Hook';
    } else if (parts.includes('services')) {
      return 'Service';
    } else if (parts.includes('pages')) {
      return 'Page';
    } else if (parts.includes('contexts')) {
      return 'Context';
    } else if (parts.includes('stores')) {
      return 'Store';
    } else {
      return 'App';
    }
  }

  /**
   * Validate migration
   */
  validate() {
    console.log('🔍 Validating migration...\n');
    
    const files = this.getSourceFiles();
    const issues = [];
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      const consoleMatches = this.findConsoleStatements(content);
      
      if (consoleMatches.length > 0) {
        issues.push({
          file: path.relative(SRC_DIR, filePath),
          remainingConsole: consoleMatches.length
        });
      }
    });
    
    if (issues.length === 0) {
      console.log('✅ Migration validation passed - no console statements found');
    } else {
      console.log(`⚠️  Found ${issues.length} files with remaining console statements:`);
      issues.forEach(issue => {
        console.log(`  - ${issue.file}: ${issue.remainingConsole} statements`);
      });
    }
    
    return issues;
  }
}

// CLI interface
function main() {
  const migrator = new LoggingMigrator();
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Logging Migration Script Usage:

  node migrate-logging.js [options]

Options:
  --analyze     Analyze current logging usage
  --migrate     Migrate console statements to logger
  --dry-run     Preview migration changes without modifying files
  --validate    Validate migration completion
  --help        Show this help message

Examples:
  node migrate-logging.js --analyze
  node migrate-logging.js --dry-run
  node migrate-logging.js --migrate
  node migrate-logging.js --validate
    `);
    return;
  }
  
  if (args.includes('--analyze')) {
    migrator.analyze();
  } else if (args.includes('--dry-run')) {
    migrator.migrate(true);
  } else if (args.includes('--migrate')) {
    migrator.migrate(false);
  } else if (args.includes('--validate')) {
    migrator.validate();
  } else {
    // Default to analysis
    migrator.analyze();
  }
}

// ES module entry point - check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default LoggingMigrator;