#!/usr/bin/env node

/**
 * 🤖 AI Migration Assistant for Lokaa App
 * 
 * This tool provides AI assistants with:
 * - Migration pattern library
 * - Schema validation helpers  
 * - Migration history tracking
 * - Pre-flight validation checks
 * 
 * Designed for AI-driven development using Supabase MCP
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.cyan}🏗️  ${msg}${colors.reset}\n`),
  pattern: (name, desc) => console.log(`${colors.magenta}📋 ${name}${colors.reset}: ${desc}`)
};

/**
 * Migration Pattern Library
 * Common database operation templates for AI assistants
 */
class MigrationPatternLibrary {
  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }

  initializePatterns() {
    // Table Operations
    this.addPattern('create-table', {
      category: 'Table Operations',
      description: 'Create a new table with common patterns',
      template: `
-- Create table with RLS enabled
CREATE TABLE IF NOT EXISTS public.{table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  {columns}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_{table_name}_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_{table_name}_updated_at
  BEFORE UPDATE ON public.{table_name}
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_{table_name}_updated_at();

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_{table_name}_created_at ON public.{table_name}(created_at);
{additional_indexes}`,
      variables: ['table_name', 'columns', 'additional_indexes'],
      example: {
        table_name: 'user_preferences',
        columns: `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,`,
        additional_indexes: `CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);`
      }
    });

    this.addPattern('add-column', {
      category: 'Schema Changes',
      description: 'Add a new column with proper defaults and constraints',
      template: `
-- Add column with default value
ALTER TABLE public.{table_name} 
ADD COLUMN IF NOT EXISTS {column_name} {column_type} {constraints};

-- Add index if needed for queries
{create_index}

-- Update existing rows if needed
{update_existing}`,
      variables: ['table_name', 'column_name', 'column_type', 'constraints', 'create_index', 'update_existing'],
      example: {
        table_name: 'spaces',
        column_name: 'subscription_tier',
        column_type: 'TEXT',
        constraints: 'DEFAULT \'free\' NOT NULL',
        create_index: 'CREATE INDEX IF NOT EXISTS idx_spaces_subscription_tier ON public.spaces(subscription_tier);',
        update_existing: '-- UPDATE public.spaces SET subscription_tier = \'free\' WHERE subscription_tier IS NULL;'
      }
    });

    this.addPattern('create-rls-policy', {
      category: 'Security',
      description: 'Create RLS policies following Lokaa patterns',
      template: `
-- Policy for authenticated users to {action} their own records
CREATE POLICY "policy_{table_name}_{action}_{scope}" ON public.{table_name}
  FOR {sql_action} TO authenticated
  USING ({using_condition})
  {with_check};

-- Policy for public access (if needed)
{public_policy}`,
      variables: ['table_name', 'action', 'scope', 'sql_action', 'using_condition', 'with_check', 'public_policy'],
      example: {
        table_name: 'user_preferences',
        action: 'select',
        scope: 'own',
        sql_action: 'SELECT',
        using_condition: 'auth.uid() = user_id',
        with_check: '',
        public_policy: '-- No public access needed for user preferences'
      }
    });

    this.addPattern('create-function', {
      category: 'Functions',
      description: 'Create secure database functions with proper error handling',
      template: `
-- Function: {function_name}
-- Purpose: {purpose}
CREATE OR REPLACE FUNCTION public.{function_name}({parameters})
RETURNS {return_type}
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public, auth -- Secure search path
AS $$
DECLARE
  {declarations}
BEGIN
  -- Validate inputs
  {input_validation}
  
  -- Check permissions
  {permission_checks}
  
  -- Main logic
  {main_logic}
  
  RETURN {return_statement};
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'Error in {function_name}: % %', SQLERRM, SQLSTATE;
    RAISE EXCEPTION 'Function {function_name} failed: %', SQLERRM;
END;
$$;`,
      variables: ['function_name', 'purpose', 'parameters', 'return_type', 'declarations', 'input_validation', 'permission_checks', 'main_logic', 'return_statement'],
      example: {
        function_name: 'update_user_profile_safely',
        purpose: 'Update user profile with validation and permissions',
        parameters: 'user_id UUID, profile_data JSONB',
        return_type: 'JSONB',
        declarations: 'current_user_id UUID;',
        input_validation: `IF user_id IS NULL OR profile_data IS NULL THEN
    RAISE EXCEPTION 'User ID and profile data are required';
  END IF;`,
        permission_checks: `current_user_id := auth.uid();
  IF current_user_id != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot update another user''s profile';
  END IF;`,
        main_logic: `UPDATE auth.users 
  SET raw_user_meta_data = profile_data
  WHERE id = user_id;`,
        return_statement: '(SELECT raw_user_meta_data FROM auth.users WHERE id = user_id)'
      }
    });

    this.addPattern('create-trigger', {
      category: 'Automation',
      description: 'Create triggers for automatic data management',
      template: `
-- Trigger function: {trigger_function_name}
CREATE OR REPLACE FUNCTION public.{trigger_function_name}()
RETURNS TRIGGER AS $$
BEGIN
  {trigger_logic}
  RETURN {return_value};
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS {trigger_name} ON public.{table_name};
CREATE TRIGGER {trigger_name}
  {timing} {events} ON public.{table_name}
  FOR EACH ROW
  EXECUTE FUNCTION public.{trigger_function_name}();`,
      variables: ['trigger_function_name', 'trigger_logic', 'return_value', 'trigger_name', 'table_name', 'timing', 'events'],
      example: {
        trigger_function_name: 'update_space_member_count',
        trigger_logic: `IF TG_OP = 'INSERT' THEN
    UPDATE public.spaces 
    SET member_count = member_count + 1 
    WHERE id = NEW.space_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spaces 
    SET member_count = member_count - 1 
    WHERE id = OLD.space_id;
  END IF;`,
        return_value: 'COALESCE(NEW, OLD)',
        trigger_name: 'trigger_update_space_member_count',
        table_name: 'space_members',
        timing: 'AFTER',
        events: 'INSERT OR DELETE'
      }
    });

    this.addPattern('migration-cleanup', {
      category: 'Maintenance', 
      description: 'Clean up old migration artifacts and optimize database',
      template: `
-- Clean up migration: {migration_name}
-- Date: {date}

-- Drop old objects that are no longer needed
{drop_statements}

-- Update statistics
ANALYZE {affected_tables};

-- Vacuum if needed
{vacuum_statements}

-- Verify cleanup
{verification_queries}`,
      variables: ['migration_name', 'date', 'drop_statements', 'affected_tables', 'vacuum_statements', 'verification_queries'],
      example: {
        migration_name: 'remove_deprecated_views',
        date: new Date().toISOString().split('T')[0],
        drop_statements: `DROP VIEW IF EXISTS public.old_user_stats_view CASCADE;
DROP FUNCTION IF EXISTS public.deprecated_function();`,
        affected_tables: 'public.users, public.spaces',
        vacuum_statements: '-- VACUUM ANALYZE public.users;',
        verification_queries: `-- Verify no dependencies remain
SELECT * FROM information_schema.views WHERE table_name LIKE '%old%';`
      }
    });
  }

  addPattern(name, pattern) {
    this.patterns.set(name, pattern);
  }

  getPattern(name) {
    return this.patterns.get(name);
  }

  getAllPatterns() {
    return Array.from(this.patterns.entries());
  }

  searchPatterns(query) {
    const results = [];
    for (const [name, pattern] of this.patterns) {
      if (name.includes(query) || 
          pattern.description.toLowerCase().includes(query.toLowerCase()) ||
          pattern.category.toLowerCase().includes(query.toLowerCase())) {
        results.push([name, pattern]);
      }
    }
    return results;
  }

  generateMigration(patternName, variables = {}) {
    const pattern = this.getPattern(patternName);
    if (!pattern) {
      throw new Error(`Pattern '${patternName}' not found`);
    }

    let sql = pattern.template;
    
    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      sql = sql.replace(regex, value || '');
    }

    // Clean up any remaining placeholders
    sql = sql.replace(/\{[^}]+\}/g, '-- TODO: Replace this placeholder');

    return {
      sql,
      pattern: pattern,
      variables: variables
    };
  }
}

/**
 * Schema Validation Helper
 * Pre-flight checks for database migrations
 */
class SchemaValidationHelper {
  constructor() {
    this.checks = [];
    this.initializeChecks();
  }

  initializeChecks() {
    this.addCheck('table-exists', 'Check if table exists', (tableName) => {
      return `
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = '${tableName}'
);`;
    });

    this.addCheck('column-exists', 'Check if column exists', (tableName, columnName) => {
      return `
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = '${tableName}' 
  AND column_name = '${columnName}'
);`;
    });

    this.addCheck('constraint-exists', 'Check if constraint exists', (tableName, constraintName) => {
      return `
SELECT EXISTS (
  SELECT FROM information_schema.table_constraints 
  WHERE table_schema = 'public' 
  AND table_name = '${tableName}' 
  AND constraint_name = '${constraintName}'
);`;
    });

    this.addCheck('index-exists', 'Check if index exists', (indexName) => {
      return `
SELECT EXISTS (
  SELECT FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND indexname = '${indexName}'
);`;
    });

    this.addCheck('function-exists', 'Check if function exists', (functionName) => {
      return `
SELECT EXISTS (
  SELECT FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = '${functionName}'
);`;
    });

    this.addCheck('policy-exists', 'Check if RLS policy exists', (tableName, policyName) => {
      return `
SELECT EXISTS (
  SELECT FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = '${tableName}' 
  AND policyname = '${policyName}'
);`;
    });

    this.addCheck('rls-enabled', 'Check if RLS is enabled on table', (tableName) => {
      return `
SELECT relrowsecurity as rls_enabled 
FROM pg_class 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
WHERE nspname = 'public' 
AND relname = '${tableName}';`;
    });

    this.addCheck('table-size', 'Check table size and row count', (tableName) => {
      return `
SELECT 
  pg_size_pretty(pg_total_relation_size('public.${tableName}')) as size,
  (SELECT count(*) FROM public.${tableName}) as row_count;`;
    });
  }

  addCheck(name, description, queryGenerator) {
    this.checks.push({ name, description, queryGenerator });
  }

  getCheck(name) {
    return this.checks.find(check => check.name === name);
  }

  getAllChecks() {
    return this.checks;
  }

  generateValidationQueries(checkName, ...args) {
    const check = this.getCheck(checkName);
    if (!check) {
      throw new Error(`Validation check '${checkName}' not found`);
    }
    return check.queryGenerator(...args);
  }

  generatePreFlightChecklist(migration) {
    const checklist = [];
    
    // Basic infrastructure checks
    checklist.push({
      category: 'Infrastructure',
      checks: [
        'Verify database connection',
        'Check available disk space',
        'Confirm backup exists',
        'Validate user permissions'
      ]
    });

    // Pattern-specific checks
    if (migration.pattern) {
      checklist.push({
        category: `${migration.pattern.category} Validation`,
        checks: [
          `Validate ${migration.pattern.description}`,
          'Check for naming conflicts',
          'Verify dependencies exist',
          'Test rollback procedure'
        ]
      });
    }

    return checklist;
  }
}

/**
 * Migration History Tracker
 * Track AI-applied database changes
 */
class MigrationHistoryTracker {
  constructor() {
    this.historyFile = path.join(PROJECT_ROOT, 'docs', 'ai-migration-history.json');
    this.history = this.loadHistory();
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        return JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
      }
    } catch (error) {
      log.warning(`Could not load migration history: ${error.message}`);
    }
    return { migrations: [], version: '1.0.0' };
  }

  saveHistory() {
    try {
      const dir = path.dirname(this.historyFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      log.error(`Could not save migration history: ${error.message}`);
    }
  }

  recordMigration(migration) {
    const record = {
      id: `ai_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: migration.pattern?.category || 'Custom',
      description: migration.description || 'AI-applied migration',
      pattern: migration.pattern?.name || 'custom',
      variables: migration.variables || {},
      sql: migration.sql,
      appliedBy: 'AI Assistant',
      status: 'applied',
      rollback: migration.rollback || null,
      validation: migration.validation || null
    };

    this.history.migrations.push(record);
    this.saveHistory();
    return record;
  }

  getRecentMigrations(limit = 10) {
    return this.history.migrations
      .slice(-limit)
      .reverse();
  }

  getMigrationsByPattern(pattern) {
    return this.history.migrations.filter(m => m.pattern === pattern);
  }

  generateMigrationSummary() {
    const summary = {
      total: this.history.migrations.length,
      byType: {},
      byMonth: {},
      recent: this.getRecentMigrations(5)
    };

    this.history.migrations.forEach(migration => {
      // Count by type
      summary.byType[migration.type] = (summary.byType[migration.type] || 0) + 1;
      
      // Count by month
      const month = migration.timestamp.substring(0, 7); // YYYY-MM
      summary.byMonth[month] = (summary.byMonth[month] || 0) + 1;
    });

    return summary;
  }
}

/**
 * Main AI Migration Assistant Class
 */
class AIMigrationAssistant {
  constructor() {
    this.patternLibrary = new MigrationPatternLibrary();
    this.validator = new SchemaValidationHelper();
    this.tracker = new MigrationHistoryTracker();
  }

  showHelp() {
    log.section('🤖 AI Migration Assistant');
    console.log('This tool provides AI assistants with migration patterns, validation, and history tracking.\n');
    
    console.log('Usage:');
    console.log('  node scripts/ai-migration-assistant.js [command] [options]\n');
    
    console.log('Commands:');
    console.log('  patterns                  List all available migration patterns');
    console.log('  pattern <name>            Show details for a specific pattern');
    console.log('  search <query>            Search patterns by keyword');
    console.log('  generate <pattern> [vars] Generate migration from pattern');
    console.log('  validate <check> [args]   Run validation check');
    console.log('  history                   Show migration history');
    console.log('  summary                   Show migration summary');
    console.log('  help                      Show this help message\n');
    
    console.log('Examples:');
    console.log('  node scripts/ai-migration-assistant.js patterns');
    console.log('  node scripts/ai-migration-assistant.js pattern create-table');
    console.log('  node scripts/ai-migration-assistant.js search security');
    console.log('  node scripts/ai-migration-assistant.js validate table-exists users');
    console.log('  node scripts/ai-migration-assistant.js history');
  }

  listPatterns() {
    log.section('📋 Available Migration Patterns');
    
    const patternsByCategory = {};
    this.patternLibrary.getAllPatterns().forEach(([name, pattern]) => {
      if (!patternsByCategory[pattern.category]) {
        patternsByCategory[pattern.category] = [];
      }
      patternsByCategory[pattern.category].push([name, pattern]);
    });

    Object.entries(patternsByCategory).forEach(([category, patterns]) => {
      console.log(`\n${colors.bold}${colors.cyan}${category}${colors.reset}`);
      patterns.forEach(([name, pattern]) => {
        log.pattern(name, pattern.description);
      });
    });
  }

  showPattern(name) {
    const pattern = this.patternLibrary.getPattern(name);
    if (!pattern) {
      log.error(`Pattern '${name}' not found`);
      return;
    }

    log.section(`📋 Pattern: ${name}`);
    console.log(`Category: ${pattern.category}`);
    console.log(`Description: ${pattern.description}\n`);
    
    console.log(`${colors.bold}Variables:${colors.reset}`);
    pattern.variables.forEach(variable => {
      console.log(`  ${colors.yellow}{${variable}}${colors.reset}`);
    });
    
    if (pattern.example) {
      console.log(`\n${colors.bold}Example Variables:${colors.reset}`);
      Object.entries(pattern.example).forEach(([key, value]) => {
        console.log(`  ${colors.yellow}${key}${colors.reset}: ${value}`);
      });
    }
    
    console.log(`\n${colors.bold}Template:${colors.reset}`);
    console.log(pattern.template);
  }

  searchPatterns(query) {
    const results = this.patternLibrary.searchPatterns(query);
    
    log.section(`🔍 Search Results for: "${query}"`);
    
    if (results.length === 0) {
      log.warning('No patterns found matching your search');
      return;
    }

    results.forEach(([name, pattern]) => {
      log.pattern(name, `[${pattern.category}] ${pattern.description}`);
    });
  }

  generateMigration(patternName, variablesStr = '') {
    try {
      const variables = variablesStr ? JSON.parse(variablesStr) : {};
      const migration = this.patternLibrary.generateMigration(patternName, variables);
      
      log.section(`🏗️  Generated Migration: ${patternName}`);
      console.log(migration.sql);
      
      // Generate pre-flight checklist
      const checklist = this.validator.generatePreFlightChecklist(migration);
      console.log(`\n${colors.bold}Pre-Flight Checklist:${colors.reset}`);
      checklist.forEach(category => {
        console.log(`\n${colors.cyan}${category.category}:${colors.reset}`);
        category.checks.forEach(check => {
          console.log(`  □ ${check}`);
        });
      });

      return migration;
    } catch (error) {
      log.error(`Error generating migration: ${error.message}`);
    }
  }

  runValidation(checkName, ...args) {
    try {
      const query = this.validator.generateValidationQueries(checkName, ...args);
      
      log.section(`🔍 Validation Query: ${checkName}`);
      console.log('Run this query in Supabase to validate:');
      console.log(query);
      
      return query;
    } catch (error) {
      log.error(`Error generating validation: ${error.message}`);
    }
  }

  showHistory() {
    const recent = this.tracker.getRecentMigrations();
    
    log.section('📊 Recent Migration History');
    
    if (recent.length === 0) {
      log.warning('No migration history found');
      return;
    }

    recent.forEach(migration => {
      console.log(`\n${colors.bold}${migration.id}${colors.reset} (${migration.timestamp})`);
      console.log(`Type: ${migration.type}`);
      console.log(`Pattern: ${migration.pattern}`);
      console.log(`Description: ${migration.description}`);
      console.log(`Status: ${colors.green}${migration.status}${colors.reset}`);
    });
  }

  showSummary() {
    const summary = this.tracker.generateMigrationSummary();
    
    log.section('📊 Migration Summary');
    
    console.log(`Total Migrations: ${summary.total}\n`);
    
    if (Object.keys(summary.byType).length > 0) {
      console.log(`${colors.bold}By Type:${colors.reset}`);
      Object.entries(summary.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    
    if (Object.keys(summary.byMonth).length > 0) {
      console.log(`\n${colors.bold}By Month:${colors.reset}`);
      Object.entries(summary.byMonth).forEach(([month, count]) => {
        console.log(`  ${month}: ${count}`);
      });
    }

    if (summary.recent.length > 0) {
      console.log(`\n${colors.bold}Recent Migrations:${colors.reset}`);
      summary.recent.forEach(migration => {
        console.log(`  ${migration.id}: ${migration.description}`);
      });
    }
  }

  recordMigration(migrationData) {
    return this.tracker.recordMigration(migrationData);
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const assistant = new AIMigrationAssistant();

  if (args.length === 0) {
    assistant.showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'patterns':
      assistant.listPatterns();
      break;
      
    case 'pattern':
      if (args[1]) {
        assistant.showPattern(args[1]);
      } else {
        log.error('Please specify a pattern name');
      }
      break;
      
    case 'search':
      if (args[1]) {
        assistant.searchPatterns(args[1]);
      } else {
        log.error('Please specify a search query');
      }
      break;
      
    case 'generate':
      if (args[1]) {
        assistant.generateMigration(args[1], args[2]);
      } else {
        log.error('Please specify a pattern name');
      }
      break;
      
    case 'validate':
      if (args[1]) {
        assistant.runValidation(args[1], ...args.slice(2));
      } else {
        log.error('Please specify a validation check');
      }
      break;
      
    case 'history':
      assistant.showHistory();
      break;
      
    case 'summary':
      assistant.showSummary();
      break;
      
    case 'help':
    default:
      assistant.showHelp();
      break;
  }
}

// Export for programmatic use
export {
  AIMigrationAssistant,
  MigrationPatternLibrary,
  SchemaValidationHelper,
  MigrationHistoryTracker
};

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
