# 🤖 AI Migration Patterns for Lokaa App

This document provides AI assistants with comprehensive migration patterns, validation helpers, and best practices for database schema changes.

## 🎯 **Purpose**

The AI Migration Assistant is designed specifically for AI-driven development using Supabase MCP. Instead of generating file-based migrations, it provides:

- **Pattern Library**: Reusable SQL templates for common operations
- **Validation Helpers**: Pre-flight checks before applying changes
- **History Tracking**: Record of all AI-applied migrations
- **Best Practices**: Security and performance guidelines

## 📋 **Available Migration Patterns**

### **Table Operations**

#### **create-table**
Create a new table with RLS, triggers, and indexes
```sql
-- Example: User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
```

### **Schema Changes**

#### **add-column**
Add columns with proper defaults and constraints
```sql
-- Example: Add subscription tier to spaces
ALTER TABLE public.spaces 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spaces_subscription_tier 
ON public.spaces(subscription_tier);
```

### **Security**

#### **create-rls-policy**
Create Row Level Security policies following Lokaa patterns
```sql
-- Example: User preferences access policy
CREATE POLICY "policy_user_preferences_select_own" ON public.user_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

### **Functions**

#### **create-function**
Create secure database functions with error handling
```sql
-- Example: Safe profile update function
CREATE OR REPLACE FUNCTION public.update_user_profile_safely(
  user_id UUID, 
  profile_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Validate inputs
  IF user_id IS NULL OR profile_data IS NULL THEN
    RAISE EXCEPTION 'User ID and profile data are required';
  END IF;
  
  -- Check permissions
  current_user_id := auth.uid();
  IF current_user_id != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot update another user profile';
  END IF;
  
  -- Update profile
  UPDATE auth.users 
  SET raw_user_meta_data = profile_data
  WHERE id = user_id;
  
  RETURN (SELECT raw_user_meta_data FROM auth.users WHERE id = user_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_user_profile_safely: % %', SQLERRM, SQLSTATE;
    RAISE EXCEPTION 'Profile update failed: %', SQLERRM;
END;
$$;
```

### **Automation**

#### **create-trigger**
Create triggers for automatic data management
```sql
-- Example: Auto-update space member count
CREATE OR REPLACE FUNCTION public.update_space_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spaces 
    SET member_count = member_count + 1 
    WHERE id = NEW.space_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spaces 
    SET member_count = member_count - 1 
    WHERE id = OLD.space_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_space_member_count
  AFTER INSERT OR DELETE ON public.space_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_space_member_count();
```

### **Maintenance**

#### **migration-cleanup**
Clean up old migration artifacts
```sql
-- Example: Remove deprecated objects
DROP VIEW IF EXISTS public.old_user_stats_view CASCADE;
DROP FUNCTION IF EXISTS public.deprecated_function();

-- Update statistics
ANALYZE public.users, public.spaces;

-- Verify cleanup
SELECT * FROM information_schema.views WHERE table_name LIKE '%old%';
```

## 🔍 **Schema Validation Helpers**

### **Pre-Flight Checks**

Before applying any migration, run these validation queries:

#### **table-exists**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'your_table_name'
);
```

#### **column-exists**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'your_table' 
  AND column_name = 'your_column'
);
```

#### **rls-enabled**
```sql
SELECT relrowsecurity as rls_enabled 
FROM pg_class 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
WHERE nspname = 'public' 
AND relname = 'your_table_name';
```

#### **policy-exists**
```sql
SELECT EXISTS (
  SELECT FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'your_table' 
  AND policyname = 'your_policy'
);
```

## 📊 **Migration History Tracking**

Every AI-applied migration is automatically tracked with:

- **Unique ID**: Timestamp-based identifier
- **Pattern Used**: Which pattern template was applied
- **Variables**: All substituted values
- **SQL Code**: Complete SQL that was executed
- **Validation**: Pre-flight checks performed
- **Rollback Info**: How to undo the change

### **History Record Example**
```json
{
  "id": "ai_1734728400000",
  "timestamp": "2024-12-20T20:00:00.000Z",
  "type": "Table Operations",
  "description": "Create user preferences table",
  "pattern": "create-table",
  "variables": {
    "table_name": "user_preferences",
    "columns": "user_id UUID, theme TEXT, language TEXT"
  },
  "sql": "CREATE TABLE...",
  "appliedBy": "AI Assistant",
  "status": "applied",
  "rollback": "DROP TABLE public.user_preferences;",
  "validation": "Pre-flight checks passed"
}
```

## 🛠️ **Usage Examples**

### **Using the CLI Tool**

```bash
# List all available patterns
npm run ai:patterns

# Show specific pattern details
npm run ai:migration pattern create-table

# Search patterns by keyword
npm run ai:migration search security

# Generate validation query
npm run ai:migration validate table-exists users

# View migration history
npm run ai:history
```

### **Using Programmatically**

```javascript
import { AIMigrationAssistant } from './scripts/ai-migration-assistant.js';

const assistant = new AIMigrationAssistant();

// Generate migration from pattern
const migration = assistant.generateMigration('create-table', {
  table_name: 'user_preferences',
  columns: 'user_id UUID, theme TEXT'
});

// Record the migration
assistant.recordMigration({
  description: 'Create user preferences table',
  pattern: migration.pattern,
  variables: migration.variables,
  sql: migration.sql
});
```

## 🚨 **Best Practices for AI Assistants**

### **1. Always Use Pre-Flight Validation**
- Check if objects exist before creating/dropping
- Verify dependencies are in place
- Validate permissions before applying

### **2. Follow Security Patterns**
- Enable RLS on all new tables
- Use `SECURITY DEFINER` with `SET search_path`
- Validate user permissions in functions

### **3. Record Everything**
- Log all applied migrations
- Include rollback instructions
- Track pattern usage for improvements

### **4. Use Supabase MCP for Application**
- Apply migrations via `mcp_supabase_apply_migration`
- Validate with `mcp_supabase_execute_sql`
- Monitor with `mcp_supabase_get_advisors`

### **5. Error Handling**
- Always include exception handling in functions
- Log errors with context
- Provide meaningful error messages

## 🔄 **Rollback Procedures**

### **Table Operations**
```sql
-- Rollback create-table
DROP TABLE IF EXISTS public.table_name CASCADE;
```

### **Schema Changes**
```sql
-- Rollback add-column
ALTER TABLE public.table_name DROP COLUMN IF EXISTS column_name;
```

### **Security Changes**
```sql
-- Rollback RLS policy
DROP POLICY IF EXISTS "policy_name" ON public.table_name;
```

### **Functions**
```sql
-- Rollback function
DROP FUNCTION IF EXISTS public.function_name(parameter_types);
```

## 📈 **Migration Categories**

- **Table Operations**: CREATE, ALTER, DROP tables
- **Schema Changes**: ADD/DROP columns, constraints, indexes
- **Security**: RLS policies, permissions, functions
- **Automation**: Triggers, procedures, automation
- **Maintenance**: Cleanup, optimization, monitoring

## 🎯 **Success Criteria**

A successful migration should:
- ✅ Pass all pre-flight validation checks
- ✅ Include proper error handling
- ✅ Follow security best practices
- ✅ Be recorded in migration history
- ✅ Include rollback procedures
- ✅ Pass post-migration validation

---

*This pattern library is designed to enhance AI assistant productivity while maintaining database security and reliability in the Lokaa platform.*
