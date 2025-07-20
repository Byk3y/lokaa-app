# Phase 1: Foundation Cleanup - Detailed Execution Plan

## Overview
**Duration**: 1-2 weeks  
**Risk Level**: Low  
**Team Impact**: Minimal disruption  
**Success Criteria**: 40% reduction in utils directory, consolidated duplicates, clean feature structure

## Pre-Phase Setup (Day 1)

### 1.1 Environment Preparation
```bash
# Install dependency analysis tools
npm install --save-dev dependency-cruiser madge

# Install migration helpers
npm install --save-dev jscodeshift @types/jscodeshift

# Create backup branch
git checkout -b backup/pre-phase-1-cleanup
git push origin backup/pre-phase-1-cleanup
```

### 1.2 Automated Tooling Setup
```bash
# Create dependency analysis script
cat > scripts/analyze-dependencies.js << 'EOF'
const madge = require('madge');

async function analyzeDependencies() {
  const result = await madge('src/', {
    fileExtensions: ['ts', 'tsx'],
    excludeRegExp: ['node_modules', 'dist']
  });
  
  console.log('Circular dependencies:', result.circular());
  console.log('Dependency graph:', result.obj());
}

analyzeDependencies();
EOF

# Create file usage analysis script
cat > scripts/analyze-file-usage.js << 'EOF'
const fs = require('fs');
const path = require('path');

function findUnusedFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  }
  
  walk(dir);
  return files;
}

const utilsFiles = findUnusedFiles('src/utils');
console.log('Utils files found:', utilsFiles.length);
utilsFiles.forEach(file => console.log('-', file));
EOF
```

### 1.3 Testing Infrastructure
```bash
# Create cleanup validation tests
mkdir -p src/__tests__/cleanup
cat > src/__tests__/cleanup/phase-1-validation.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('Phase 1 Cleanup Validation', () => {
  it('should not have phase-specific files', () => {
    // This test will fail if phase files still exist
    const phaseFiles = [
      'src/utils/phase1MobileRecovery.ts',
      'src/utils/phase2Integration.ts',
      // Add all phase files here
    ];
    
    phaseFiles.forEach(file => {
      expect(() => require(file)).toThrow();
    });
  });

  it('should have consolidated ErrorBoundary components', () => {
    // Test that only one ErrorBoundary exists
    const errorBoundaries = [
      'src/components/errors/ErrorBoundary.tsx',
      'src/components/errors/AppErrorBoundary.tsx',
      // Add all ErrorBoundary files here
    ];
    
    // Only one should exist after consolidation
    const existingCount = errorBoundaries.filter(file => {
      try {
        require(file);
        return true;
      } catch {
        return false;
      }
    }).length;
    
    expect(existingCount).toBe(1);
  });
});
EOF
```

## Week 1: Dead Code Removal

### Day 2-3: Phase Files Cleanup

#### Step 1: Identify and Document Phase Files
```bash
# Run analysis to find all phase files
find src/utils -name "phase*.ts" -o -name "*Fix.js" > phase-files-to-remove.txt

# Create removal script with safety checks
cat > scripts/remove-phase-files.js << 'EOF'
const fs = require('fs');
const path = require('path');

const filesToRemove = fs.readFileSync('phase-files-to-remove.txt', 'utf8')
  .split('\n')
  .filter(line => line.trim());

console.log(`Found ${filesToRemove.length} phase files to remove`);

// Safety check: ensure files exist and are not imported
filesToRemove.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`Will remove: ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});

// Create backup before removal
const backupDir = 'backup/phase-files-' + Date.now();
fs.mkdirSync(backupDir, { recursive: true });

filesToRemove.forEach(file => {
  if (fs.existsSync(file)) {
    const backupPath = path.join(backupDir, path.basename(file));
    fs.copyFileSync(file, backupPath);
    console.log(`Backed up: ${file} -> ${backupPath}`);
  }
});
EOF
```

#### Step 2: Execute Removal with Validation
```bash
# Run removal script
node scripts/remove-phase-files.js

# Verify no broken imports
npm run lint

# Run tests to ensure nothing broke
npm run test

# Commit changes
git add .
git commit -m "feat: remove phase-specific development files (Phase 1 cleanup)"
```

### Day 4-5: Duplicate Component Consolidation

#### Step 1: ErrorBoundary Consolidation
```bash
# Create consolidated ErrorBoundary
cat > src/shared/components/ErrorBoundary.tsx << 'EOF'
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>Please refresh the page or contact support.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
EOF

# Create migration script for ErrorBoundary usage
cat > scripts/migrate-error-boundaries.js << 'EOF'
const jscodeshift = require('jscodeshift');
const fs = require('fs');
const path = require('path');

function migrateErrorBoundaries() {
  const files = [
    'src/components/errors/ErrorBoundary.tsx',
    'src/components/errors/AppErrorBoundary.tsx',
    'src/components/errors/EnhancedErrorBoundary.tsx',
    // Add all ErrorBoundary files
  ];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      // Update imports to use new consolidated ErrorBoundary
      const source = fs.readFileSync(file, 'utf8');
      const root = jscodeshift(source);
      
      root
        .find(jscodeshift.ImportDeclaration)
        .forEach(path => {
          if (path.value.source.value.includes('ErrorBoundary')) {
            path.value.source.value = '@/shared/components/ErrorBoundary';
          }
        });
      
      fs.writeFileSync(file, root.toSource());
    }
  });
}

migrateErrorBoundaries();
EOF
```

#### Step 2: SpaceCard Consolidation
```bash
# Analyze SpaceCard variations
find src/components -name "*SpaceCard*" > spacecard-variations.txt

# Create consolidated SpaceCard with feature flags
cat > src/shared/components/SpaceCard.tsx << 'EOF'
import React from 'react';

interface SpaceCardProps {
  space: {
    id: string;
    name: string;
    description?: string;
    coverImage?: string;
    memberCount?: number;
  };
  variant?: 'default' | 'compact' | 'featured' | 'discovery';
  onClick?: () => void;
  className?: string;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({
  space,
  variant = 'default',
  onClick,
  className = ''
}) => {
  const baseClasses = 'space-card rounded-lg overflow-hidden cursor-pointer transition-all';
  const variantClasses = {
    default: 'bg-white shadow-md hover:shadow-lg',
    compact: 'bg-gray-50 border border-gray-200',
    featured: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
    discovery: 'bg-white border-2 border-blue-200 hover:border-blue-400'
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {space.coverImage && (
        <div className="space-card-image h-32 bg-cover bg-center" 
             style={{ backgroundImage: `url(${space.coverImage})` }} />
      )}
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{space.name}</h3>
        {space.description && (
          <p className="text-sm text-gray-600 mb-2">{space.description}</p>
        )}
        {space.memberCount && (
          <p className="text-xs text-gray-500">{space.memberCount} members</p>
        )}
      </div>
    </div>
  );
};
EOF
```

### Day 6-7: Cache System Consolidation

#### Step 1: Analyze Cache Implementations
```bash
# Find all cache-related files
find src -name "*cache*" -o -name "*Cache*" > cache-implementations.txt

# Create unified cache strategy
cat > src/shared/utils/cache/UnifiedCache.ts << 'EOF'
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items
}

interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class UnifiedCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private defaultTtl: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTtl = options.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  set(key: string, value: T, ttl?: number): void {
    // Clean expired items
    this.cleanup();

    // Remove oldest if at max size
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }
}

// Export singleton instances for common use cases
export const userCache = new UnifiedCache({ ttl: 10 * 60 * 1000 }); // 10 minutes
export const spaceCache = new UnifiedCache({ ttl: 5 * 60 * 1000 }); // 5 minutes
export const postCache = new UnifiedCache({ ttl: 2 * 60 * 1000 }); // 2 minutes
EOF
```

## Week 2: Feature Structure Setup

### Day 8-9: Create Feature Directory Structure

#### Step 1: Create Missing Feature Directories
```bash
# Create feature directory structure
mkdir -p src/features/{spaces,posts,chat,users,discovery,notifications,classroom}/{components,hooks,utils,types}

# Create index files for each feature
for feature in spaces posts chat users discovery notifications classroom; do
  cat > src/features/$feature/index.ts << EOF
// $feature feature exports
export * from './components';
export * from './hooks';
export * from './utils';
export * from './types';
EOF

  cat > src/features/$feature/components/index.ts << EOF
// $feature components
EOF

  cat > src/features/$feature/hooks/index.ts << EOF
// $feature hooks
EOF

  cat > src/features/$feature/utils/index.ts << EOF
// $feature utilities
EOF

  cat > src/features/$feature/types/index.ts << EOF
// $feature types
EOF
done
```

#### Step 2: Create Migration Tracking
```bash
# Create migration tracking file
cat > docs/refactoring/migration-progress.md << 'EOF'
# Migration Progress Tracker

## Phase 1: Foundation Cleanup ✅
- [x] Remove phase-specific files
- [x] Consolidate ErrorBoundary components
- [x] Consolidate SpaceCard components
- [x] Implement unified cache system
- [x] Create feature directory structure

## Phase 2: Component Migration (Pending)
- [ ] Move space components
- [ ] Move chat components
- [ ] Move profile components
- [ ] Move discover components
- [ ] Move notification components
- [ ] Move classroom components

## Phase 3: Hooks Migration (Pending)
- [ ] Move space hooks
- [ ] Move post hooks
- [ ] Move comment hooks
- [ ] Move user hooks

## Phase 4: Utils Migration (Pending)
- [ ] Move feature-specific utilities
- [ ] Standardize shared utilities
- [ ] Remove duplicate utilities

## Success Metrics
- Bundle size reduction: Target 40-50%
- Test coverage: Maintain 90%+
- Build time: No increase
- Developer experience: Improved file location
EOF
```

### Day 10: Validation and Documentation

#### Step 1: Run Comprehensive Tests
```bash
# Run all test suites
npm run test
npm run test:security
npm run test:coverage

# Run linting
npm run lint

# Build verification
npm run build

# Performance check
npm run build -- --analyze
```

#### Step 2: Create Rollback Plan
```bash
# Create rollback script
cat > scripts/rollback-phase-1.sh << 'EOF'
#!/bin/bash

echo "Rolling back Phase 1 changes..."

# Restore from backup branch
git checkout backup/pre-phase-1-cleanup
git checkout -b rollback/phase-1-$(date +%Y%m%d)

# Restore specific files if needed
if [ -d "backup/phase-files-*" ]; then
  echo "Restoring phase files..."
  cp -r backup/phase-files-*/* src/utils/
fi

echo "Rollback complete. Review changes and merge if satisfied."
EOF

chmod +x scripts/rollback-phase-1.sh
```

## Success Criteria & Validation

### Quantitative Metrics
- [ ] Utils directory size reduced by 40-50%
- [ ] Number of ErrorBoundary components: 1 (down from 8)
- [ ] Number of SpaceCard components: 1 (down from 4)
- [ ] Cache implementations: 1 unified system (down from 8+)
- [ ] Phase files removed: 27 files
- [ ] Test coverage maintained at 90%+

### Qualitative Metrics
- [ ] No broken imports or build errors
- [ ] All existing functionality preserved
- [ ] Developer experience improved (easier to find components)
- [ ] Codebase more maintainable

### Validation Commands
```bash
# Run validation suite
npm run test:cleanup-validation

# Check bundle size
npm run build -- --analyze

# Verify no circular dependencies
node scripts/analyze-dependencies.js

# Check file usage
node scripts/analyze-file-usage.js
```

## Risk Mitigation

### Safety Measures
1. **Backup Branch**: Created before any changes
2. **Incremental Commits**: Each major change committed separately
3. **Automated Testing**: Comprehensive test suite runs after each change
4. **Rollback Script**: Quick rollback capability
5. **Dependency Analysis**: Prevents circular dependencies

### Rollback Triggers
- Any test failures
- Build errors
- Performance regression > 10%
- Developer complaints about functionality

## Next Phase Preparation

### Phase 2 Readiness Checklist
- [ ] Feature directories created and documented
- [ ] Consolidated components working correctly
- [ ] Unified cache system implemented
- [ ] Migration tracking system in place
- [ ] Team briefed on new structure
- [ ] Automated tools for dependency analysis ready

### Phase 2 Dependencies
- Dependency cruiser configuration
- Import update scripts
- Feature flag system for gradual rollout
- Component migration templates

## Team Communication

### Daily Standup Updates
- Day 1: Tooling setup complete
- Day 3: Phase files removed, tests passing
- Day 5: ErrorBoundary consolidation complete
- Day 7: Cache system unified
- Day 9: Feature structure created
- Day 10: Validation complete, ready for Phase 2

### Documentation Updates
- Update CLAUDE.md with new patterns
- Document consolidated component usage
- Create migration guide for team
- Update architecture documentation

This detailed plan ensures Phase 1 is executed safely with proper risk mitigation, automated tooling, and clear success criteria. 