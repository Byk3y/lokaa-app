# 🏗️ Lokaa Development Scripts

This directory contains development tools and scripts that enhance the developer experience for the Lokaa app.

## 📋 Available Scripts

### Component Scaffolding

Generate complete feature modules with proper structure and boilerplate code.

#### Usage

```bash
# Via npm script (recommended)
npm run create:component ComponentName feature-name [type]
npm run create:feature ComponentName feature-name

# Direct script execution
./scripts/create-component.sh ComponentName feature-name [type]
```

#### Component Types

- **`feature`** (default) - Full feature module with hooks, types, services
- **`component`** - Simple component only
- **`shared`** - Shared component in `src/shared/components`
- **`page`** - Page component with routing

#### Examples

```bash
# Create a full notification feature
npm run create:component NotificationCenter notifications

# Create a shared UI component
npm run create:component Button ui shared

# Create a page component
npm run create:component SettingsPage settings page

# Create a simple component
npm run create:component UserCard users component
```

#### Generated Structure (Feature Type)

```
src/features/feature-name/
├── components/
│   ├── ComponentName.tsx          # Main React component
│   └── index.ts                   # Component exports
├── hooks/
│   ├── useComponentName.ts        # Custom hook with business logic
│   └── index.ts                   # Hook exports
├── types/
│   ├── ComponentName.types.ts     # TypeScript interfaces
│   └── index.ts                   # Type exports
├── services/
│   ├── ComponentNameService.ts    # API service class
│   └── index.ts                   # Service exports
├── __tests__/
│   └── ComponentName.test.tsx     # Unit tests
└── index.ts                       # Feature module exports
```

#### What Gets Generated

**For Feature Type:**
- ✅ React component with TypeScript interfaces
- ✅ Custom hook with data fetching logic
- ✅ Service class with CRUD operations
- ✅ TypeScript type definitions
- ✅ Unit test file with test setup
- ✅ Index files with proper exports
- ✅ Proper import paths and dependencies

**For Other Types:**
- ✅ Component with appropriate structure
- ✅ Test file
- ✅ Proper placement in directory structure

#### Post-Generation Steps

After generating a feature component:

1. **Update Service**: Modify the database table name in `ComponentNameService.ts`
2. **Define Types**: Add proper TypeScript interfaces in `ComponentName.types.ts`
3. **Implement Logic**: Add business logic in `useComponentName.ts`
4. **Design UI**: Implement the component design in `ComponentName.tsx`
5. **Add Tests**: Write comprehensive tests in `__tests__/ComponentName.test.tsx`

#### Import in Your App

```typescript
// Import the complete feature
import { ComponentName } from '@/features/feature-name';

// Import specific parts
import { ComponentName } from '@/features/feature-name/components';
import { useComponentName } from '@/features/feature-name/hooks';
import { ComponentNameService } from '@/features/feature-name/services';
```

### AI Migration Assistant

Generate database migration patterns, validate schema changes, and track migration history.

#### Usage

```bash
# Via npm script (recommended)
npm run ai:migration [command] [options]
npm run ai:patterns                    # List all patterns
npm run ai:history                     # View migration history

# Direct script execution
node scripts/ai-migration-assistant.js [command] [options]
```

#### Available Commands

```bash
# List all migration patterns
npm run ai:migration patterns

# Show specific pattern details
npm run ai:migration pattern create-table

# Search patterns by keyword
npm run ai:migration search security

# Generate migration from pattern
npm run ai:migration generate create-table '{"table_name":"notifications"}'

# Run validation checks
npm run ai:migration validate table-exists users

# View migration history
npm run ai:migration history

# Show migration summary
npm run ai:migration summary
```

#### Migration Patterns

- **create-table**: Complete table with RLS, triggers, indexes
- **add-column**: Add columns with proper defaults and constraints
- **create-rls-policy**: Row Level Security policies following Lokaa patterns
- **create-function**: Secure database functions with error handling
- **create-trigger**: Triggers for automatic data management
- **migration-cleanup**: Clean up old migration artifacts

#### Example: Create User Notifications Table

```bash
npm run ai:migration generate create-table '{
  "table_name": "user_notifications",
  "columns": "user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,\n  notification_type TEXT NOT NULL,\n  title TEXT NOT NULL,\n  message TEXT,\n  is_read BOOLEAN DEFAULT false,",
  "additional_indexes": "CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);"
}'
```

This generates complete SQL with:
- ✅ RLS enabled
- ✅ Updated_at trigger
- ✅ Proper indexes
- ✅ Pre-flight checklist

#### Schema Validation

```bash
# Check if table exists
npm run ai:migration validate table-exists user_notifications

# Check if column exists
npm run ai:migration validate column-exists users email

# Check if RLS is enabled
npm run ai:migration validate rls-enabled spaces

# Check if policy exists
npm run ai:migration validate policy-exists users user_select_own
```

#### Migration History

All AI-applied migrations are automatically tracked:

```json
{
  "id": "ai_1734728400000",
  "timestamp": "2024-12-20T20:00:00.000Z",
  "type": "Table Operations",
  "description": "Create user notifications table",
  "pattern": "create-table",
  "variables": {"table_name": "user_notifications"},
  "sql": "CREATE TABLE...",
  "appliedBy": "AI Assistant",
  "status": "applied",
  "rollback": "DROP TABLE public.user_notifications;"
}
```

### Enhanced Debug Utilities

Comprehensive debugging toolkit for performance analysis, component tracking, and bundle optimization.

#### Usage

```bash
# Via npm script (recommended)
npm run debug:[command]

# Direct script execution
node scripts/debug-utilities.js [command]
```

#### Available Commands

```bash
# Component performance analysis
npm run debug:components

# Bundle structure analysis
npm run debug:bundle

# Performance regression detection
npm run debug:regression

# Establish performance baseline
npm run debug:baseline

# Generate comprehensive debug report
npm run debug:report

# Launch debug dashboard info
npm run debug:dashboard
```

#### Component Render Tracking

Analyze React component performance and identify optimization opportunities:

```bash
npm run debug:components
```

**Output includes:**
- ✅ Slow components (>16ms render time)
- ✅ Excessive re-renders analysis
- ✅ Optimization recommendations with impact/effort ratings
- ✅ Performance report saved to `docs/debug-reports/`

**Example output:**
```
🐌 Slow Components:
⚠️  FeedTab: 23ms avg (156 renders)
⚠️  RichTextEditor: 28ms avg (67 renders)

💡 Optimization Opportunities:
FeedTab:
  • Consider React.memo() for expensive calculations
    Impact: high | Effort: medium
```

#### Bundle Analysis

Analyze bundle structure, identify large chunks, and get optimization recommendations:

```bash
npm run debug:bundle
```

**Features:**
- ✅ Bundle size analysis with warnings
- ✅ Chunk size optimization recommendations
- ✅ Tree shaking opportunities
- ✅ Bundle visualization generation
- ✅ Actionable improvement suggestions

#### Performance Regression Detection

Monitor performance over time and detect regressions:

```bash
# Establish baseline (run once)
npm run debug:baseline

# Check for regressions (run regularly)
npm run debug:regression
```

**Tracks:**
- ✅ Build time changes
- ✅ Bundle size increases
- ✅ Component render performance
- ✅ Memory usage patterns

#### Browser Integration

When the dev server is running, access debug utilities in the browser console:

```javascript
// Available in browser console (development only)
window.debugUtilities.showDashboard()     // Show visual dashboard
window.debugUtilities.getMetrics()        // Get current metrics
window.debugUtilities.analyzeComponents() // Component analysis
window.debugUtilities.checkMemory()       // Memory usage check
window.debugUtilities.generateReport()    // Full debug report
window.debugUtilities.startProfiling()    // Start profiling session
window.debugUtilities.stopProfiling()     // Stop profiling session
```

#### Debug Dashboard

Visual debugging interface with real-time metrics:

- **Performance Metrics**: Load times, Core Web Vitals
- **Component Analysis**: Render tracking, slow component identification
- **Memory Monitoring**: Usage tracking, leak detection
- **Bundle Information**: Size analysis, optimization opportunities

**Access:**
- Browser console: `window.debugUtilities.showDashboard()`
- Keyboard shortcut: `Ctrl+Shift+D` (when dashboard is open)

#### Comprehensive Debug Report

Generate a complete analysis of your application:

```bash
npm run debug:report
```

**Report includes:**
- 📊 Component performance analysis
- 📦 Bundle structure analysis
- 📈 Performance regression check
- 🧠 Memory usage analysis
- 💡 Prioritized recommendations
- 📋 Overall health score

**Report saved to:** `docs/debug-reports/comprehensive-debug-[timestamp].json`

#### Performance Baseline

Establish performance baselines for regression detection:

```bash
npm run debug:baseline
```

**Captures:**
- Build time metrics
- Bundle size measurements
- Component render performance
- Memory usage patterns

**Use cases:**
- Before major refactoring
- After performance optimizations
- Regular performance monitoring
- CI/CD integration

### Other Development Scripts

#### Environment Management

```bash
# Clean development environment
npm run dev:clean

# Toggle landing page features  
npm run landing:feature
```

#### Database & Migration

```bash
# Apply database migration
./scripts/apply-migration.sh

# Apply educational content migration
./scripts/apply-educational-content-migration.sh
```

#### Code Quality

```bash
# Fix callback syntax issues
node scripts/fix-callback-syntax.js

# Check test coverage
npm run check:coverage

# Migrate console.log to proper logger
node scripts/migrate-logging.js
```

## 🛠️ Development Workflow

### Creating a New Feature

1. **Generate Structure**:
   ```bash
   npm run create:component UserProfile user-management
   ```

2. **Define Types** (`src/features/user-management/types/UserProfile.types.ts`):
   ```typescript
   export interface UserProfileData {
     id: string;
     name: string;
     email: string;
     avatar_url?: string;
   }
   ```

3. **Update Service** (`src/features/user-management/services/UserProfileService.ts`):
   ```typescript
   // Update table name from 'your_table_name' to 'user_profiles'
   .from('user_profiles')
   ```

4. **Implement Hook** (`src/features/user-management/hooks/useUserProfile.ts`):
   ```typescript
   // Add your data fetching and business logic
   ```

5. **Design Component** (`src/features/user-management/components/UserProfile.tsx`):
   ```typescript
   // Implement your UI design
   ```

6. **Add Tests** (`src/features/user-management/__tests__/UserProfile.test.tsx`):
   ```typescript
   // Write comprehensive unit tests
   ```

### Best Practices

- ✅ Use PascalCase for component names
- ✅ Use kebab-case for feature directory names
- ✅ Follow the generated structure patterns
- ✅ Update service table names immediately after generation
- ✅ Write tests for all generated components
- ✅ Use the feature's index.ts for clean imports

## 🎯 Benefits

### Developer Productivity

- **10x Faster Setup**: Generate complete feature in 30 seconds vs 30 minutes
- **Consistent Structure**: All features follow the same architectural patterns
- **Zero Boilerplate Errors**: Properly formatted code with correct imports
- **Test Coverage**: Unit tests included by default

### Code Quality

- **TypeScript First**: Proper interfaces and type safety
- **Best Practices**: Follows established patterns in the codebase
- **Import Consistency**: Correct relative imports and export structure
- **Service Integration**: Ready-to-use Supabase integration

### Team Benefits

- **Faster Onboarding**: New developers can create features immediately
- **Architectural Compliance**: Enforces feature-first organization
- **Review Efficiency**: Less time fixing structural issues in PRs
- **Consistency**: All team members generate the same quality structure

## 🚀 Future Enhancements

Coming soon:
- AI Migration Assistant with pattern library
- Enhanced debugging utilities
- Bundle analysis tools
- Component render tracking

---

*Generated scaffolding follows the feature-first architecture documented in [ADR-001](../docs/adr/001-feature-first-organization.md)*
