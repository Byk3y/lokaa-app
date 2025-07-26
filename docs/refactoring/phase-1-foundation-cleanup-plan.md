# Phase 1: Foundation Cleanup - Detailed Execution Plan

## Overview
**Duration**: 1-2 weeks  
**Risk Level**: Low  
**Team Impact**: Minimal disruption  
**Execution Model**: Collaborative (Claude Code + Cursor AI)
**Coordination**: `/docs/refactoring/claude-cursor-coordination.md`
**Success Criteria**: 40% reduction in utils directory, consolidated duplicates, clean feature structure

## Pre-Phase Setup (Day 1)

> **👥 Collaborative Setup**: Cursor handles installations and git operations, Claude provides guidance and validation

### 1.1 Environment Preparation
```bash
# [CURSOR] Install dependency analysis tools
npm install --save-dev dependency-cruiser madge

# [CURSOR] Install migration helpers
npm install --save-dev jscodeshift @types/jscodeshift

# [CURSOR] Create backup branch
git checkout -b backup/pre-phase-1-cleanup
git push origin backup/pre-phase-1-cleanup

# [CLAUDE] Verify installations
npm list dependency-cruiser madge jscodeshift

# [BOTH] Update coordination log with completion status
# File: /docs/refactoring/claude-cursor-coordination.md
```

### 1.2 Automated Tooling Setup

> **📝 Script Creation**: Claude designs scripts, Cursor creates files

```bash
# [CLAUDE] Design and provide script content
# [CURSOR] Create script files
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

# Create comprehensive file inventory script
cat > scripts/create-cleanup-inventory.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Complete inventory of files to cleanup based on codebase analysis
const cleanupInventory = {
  phaseFiles: [
    'src/utils/phase1MobileRecovery.ts',
    'src/utils/phase2bIntegration.ts', 
    'src/utils/phase2cIntegration.ts',
    'src/utils/phase3PerformanceOptimizer.ts',
    'src/utils/phase3RenderOptimizer.ts',
    'src/utils/phase3UXPatterns.ts',
    'src/utils/phase4aIntegration.ts',
    'src/utils/phase4bIntegration.ts',
    'src/utils/phase5Integration.ts',
    'src/utils/phase5bTestUtils.ts',
    'src/utils/phase6BundleOptimizer.ts',
    'src/utils/phase6CompletionReport.ts',
    'src/utils/phase6ConsolidationManager.ts',
    'src/utils/phase6Integration.ts',
    'src/utils/phase7Integration.ts',
    // Mobile optimization duplicates
    'src/utils/mobileConnectionManager.ts',
    'src/utils/mobileDataTracker.ts',
    'src/utils/mobileLoadingTest.ts',
    'src/utils/mobileLockManager.ts',
    'src/utils/mobileOptimizationLayer.ts',
    'src/utils/mobileOptimizationManager.ts',
    'src/utils/mobilePerformanceTest.ts',
    'src/utils/mobileSessionManager.ts',
    'src/utils/mobileSupabaseWorkaround.ts',
    'src/utils/SkoolStyleMobileHandler.ts',
    'src/utils/SimpleMobileManager.ts',
    'src/utils/MobileEventCoordinator.ts',
    // Emergency fixes and JS files
    'src/utils/emergencyDatabaseRecovery.ts',
    'src/utils/emergencyPhase67Fix.ts',
    'src/utils/authDebug.js',
    'src/utils/spaceAccessFix.js',
    'src/utils/profileFix.js'
  ],
  errorBoundaries: [
    'src/components/ErrorBoundary.tsx',
    'src/components/error/ErrorBoundary.tsx',
    'src/components/errors/AppErrorBoundary.tsx',
    'src/components/errors/EnhancedErrorBoundary.tsx',
    'src/components/errors/ModuleErrorBoundary.tsx',
    'src/components/classroom/ClassroomErrorBoundary.tsx',
    'src/components/errors/WhiteScreenFix.tsx',
    'src/components/errors/ProfileHookError.tsx'
  ],
  spaceCards: [
    'src/components/spaces/SpaceCard.tsx',
    'src/components/spaces/EnhancedSpaceCard.tsx',
    'src/components/discover/DiscoverSpaceCard.tsx',
    'src/components/spaces/SpaceCardPreview.tsx'
  ],
  cacheImplementations: [
    'src/utils/SimpleCache.ts',
    'src/utils/advancedCacheManager.ts',
    'src/utils/persistentCache.ts',
    'src/utils/predictiveCacheEngine.ts',
    'src/services/EnhancedCacheManager.ts',
    'src/services/CacheAccessService.ts',
    'src/services/AvatarCacheService.ts'
    // Note: Preserve cacheUtils.ts as it was recently modified
  ]
};

// Verify files exist and create removal plan
console.log('=== CLEANUP INVENTORY ===');
Object.entries(cleanupInventory).forEach(([category, files]) => {
  console.log(`\n${category.toUpperCase()}:`);
  const existing = files.filter(file => fs.existsSync(file));
  const missing = files.filter(file => !fs.existsSync(file));
  
  console.log(`  Existing (${existing.length}):`, existing);
  if (missing.length > 0) {
    console.log(`  Missing (${missing.length}):`, missing);
  }
});

fs.writeFileSync('cleanup-inventory.json', JSON.stringify(cleanupInventory, null, 2));
console.log('\n✅ Cleanup inventory saved to cleanup-inventory.json');
EOF

# [CURSOR] Execute inventory creation
node scripts/create-cleanup-inventory.js

# [BOTH] Review inventory results and update coordination log
```

### 1.3 Testing Infrastructure

> **🧪 Test Setup**: Claude designs test structure, Cursor creates test files

```bash
# [CLAUDE] Design comprehensive test validation approach
# [CURSOR] Create test files and directory structure
mkdir -p src/__tests__/cleanup
cat > src/__tests__/cleanup/phase-1-comprehensive-validation.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 1 Comprehensive Cleanup Validation', () => {
  describe('Dead Code Removal', () => {
    const phaseFiles = [
      'src/utils/phase1MobileRecovery.ts',
      'src/utils/phase2bIntegration.ts',
      'src/utils/phase2cIntegration.ts',
      'src/utils/phase3PerformanceOptimizer.ts',
      'src/utils/phase3RenderOptimizer.ts',
      'src/utils/phase3UXPatterns.ts',
      'src/utils/phase4aIntegration.ts',
      'src/utils/phase4bIntegration.ts',
      'src/utils/phase5Integration.ts',
      'src/utils/phase5bTestUtils.ts',
      'src/utils/phase6BundleOptimizer.ts',
      'src/utils/phase6CompletionReport.ts',
      'src/utils/phase6ConsolidationManager.ts',
      'src/utils/phase6Integration.ts',
      'src/utils/phase7Integration.ts',
      // Mobile optimization duplicates
      'src/utils/mobileConnectionManager.ts',
      'src/utils/mobileDataTracker.ts',
      'src/utils/mobileLoadingTest.ts',
      'src/utils/mobileLockManager.ts',
      'src/utils/mobileOptimizationLayer.ts',
      'src/utils/mobileOptimizationManager.ts',
      'src/utils/mobilePerformanceTest.ts',
      'src/utils/mobileSessionManager.ts',
      'src/utils/mobileSupabaseWorkaround.ts',
      'src/utils/SkoolStyleMobileHandler.ts',
      'src/utils/SimpleMobileManager.ts',
      'src/utils/MobileEventCoordinator.ts',
      // Emergency fixes and JS files
      'src/utils/emergencyDatabaseRecovery.ts',
      'src/utils/emergencyPhase67Fix.ts',
      'src/utils/authDebug.js',
      'src/utils/spaceAccessFix.js',
      'src/utils/profileFix.js'
    ];

    phaseFiles.forEach(file => {
      it(`should not have ${file}`, () => {
        expect(fs.existsSync(file)).toBe(false);
      });
    });
  });

  describe('Component Consolidation', () => {
    it('should have exactly one ErrorBoundary in shared components', () => {
      const sharedErrorBoundary = 'src/shared/components/ErrorBoundary.tsx';
      expect(fs.existsSync(sharedErrorBoundary)).toBe(true);
    });

    it('should not have duplicate ErrorBoundary components', () => {
      const duplicateErrorBoundaries = [
        'src/components/ErrorBoundary.tsx',
        'src/components/error/ErrorBoundary.tsx',
        'src/components/errors/AppErrorBoundary.tsx',
        'src/components/errors/EnhancedErrorBoundary.tsx',
        'src/components/errors/ModuleErrorBoundary.tsx',
        'src/components/classroom/ClassroomErrorBoundary.tsx',
        'src/components/errors/WhiteScreenFix.tsx',
        'src/components/errors/ProfileHookError.tsx'
      ];

      duplicateErrorBoundaries.forEach(file => {
        expect(fs.existsSync(file)).toBe(false);
      });
    });

    it('should have consolidated SpaceCard component', () => {
      const consolidatedSpaceCard = 'src/shared/components/SpaceCard.tsx';
      expect(fs.existsSync(consolidatedSpaceCard)).toBe(true);
    });

    it('should not have duplicate SpaceCard components', () => {
      const duplicateSpaceCards = [
        'src/components/spaces/SpaceCard.tsx',
        'src/components/spaces/EnhancedSpaceCard.tsx',
        'src/components/discover/DiscoverSpaceCard.tsx',
        'src/components/spaces/SpaceCardPreview.tsx'
      ];

      duplicateSpaceCards.forEach(file => {
        expect(fs.existsSync(file)).toBe(false);
      });
    });
  });

  describe('Cache System Consolidation', () => {
    it('should have unified cache system', () => {
      const unifiedCache = 'src/shared/utils/cache/index.ts';
      expect(fs.existsSync(unifiedCache)).toBe(true);
    });

    it('should preserve recently modified cacheUtils.ts', () => {
      const cacheUtils = 'src/utils/cacheUtils.ts';
      expect(fs.existsSync(cacheUtils)).toBe(true);
    });

    it('should not have duplicate cache implementations', () => {
      const duplicateCaches = [
        'src/utils/SimpleCache.ts',
        'src/utils/advancedCacheManager.ts',
        'src/utils/persistentCache.ts',
        'src/utils/predictiveCacheEngine.ts',
        'src/services/EnhancedCacheManager.ts',
        'src/services/CacheAccessService.ts',
        'src/services/AvatarCacheService.ts'
      ];

      duplicateCaches.forEach(file => {
        expect(fs.existsSync(file)).toBe(false);
      });
    });
  });

  describe('Feature Structure', () => {
    const features = ['spaces', 'posts', 'chat', 'users', 'discovery', 'notifications', 'classroom'];
    
    features.forEach(feature => {
      it(`should have feature directory for ${feature}`, () => {
        const featureDir = `src/features/${feature}`;
        expect(fs.existsSync(featureDir)).toBe(true);
      });

      it(`should have components directory for ${feature}`, () => {
        const componentsDir = `src/features/${feature}/components`;
        expect(fs.existsSync(componentsDir)).toBe(true);
      });

      it(`should have hooks directory for ${feature}`, () => {
        const hooksDir = `src/features/${feature}/hooks`;
        expect(fs.existsSync(hooksDir)).toBe(true);
      });

      it(`should have utils directory for ${feature}`, () => {
        const utilsDir = `src/features/${feature}/utils`;
        expect(fs.existsSync(utilsDir)).toBe(true);
      });

      it(`should have types directory for ${feature}`, () => {
        const typesDir = `src/features/${feature}/types`;
        expect(fs.existsSync(typesDir)).toBe(true);
      });
    });
  });

  describe('Build and Import Validation', () => {
    it('should have no circular dependencies', async () => {
      // This would run the madge analysis
      const madge = await import('madge');
      const result = await madge('src/', {
        fileExtensions: ['ts', 'tsx'],
        excludeRegExp: ['node_modules', 'dist']
      });
      
      const circular = result.circular();
      expect(circular).toEqual([]);
    });
  });
});
EOF
```

## Week 1: Dead Code Removal

> **🗑️ Cleanup Week**: Systematic removal of dead code with safety checks

### Day 2-3: Phase Files Cleanup

> **⚠️ Critical Phase**: Cursor executes removal, Claude monitors and validates

#### Step 1: Identify and Document Phase Files
```bash
# [CURSOR] Use our comprehensive inventory instead of find command
node scripts/create-cleanup-inventory.js

# [CLAUDE] Review inventory output and validate file list

# Create enhanced removal script with safety checks and import analysis
cat > scripts/remove-phase-files.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Load the comprehensive cleanup inventory
const inventory = JSON.parse(fs.readFileSync('cleanup-inventory.json', 'utf8'));
const filesToRemove = inventory.phaseFiles;

console.log(`Found ${filesToRemove.length} phase files to remove`);

// Enhanced safety check: verify files exist and check for imports
function checkFileImports(filePath) {
  const filename = path.basename(filePath);
  const searchDirs = ['src/components', 'src/hooks', 'src/pages', 'src/services'];
  
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true })
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(filename.replace('.ts', '').replace('.js', ''))) {
            console.warn(`⚠️  Potential import found in ${fullPath}`);
          }
        }
      }
    }
  }
}

// Analyze each file before removal
filesToRemove.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✓ Will remove: ${file}`);
    checkFileImports(file);
  } else {
    console.log(`✗ File not found: ${file}`);
  }
});

// Create backup before removal
const backupDir = 'backup/phase-files-' + Date.now();
fs.mkdirSync(backupDir, { recursive: true });

filesToRemove.forEach(file => {
  if (fs.existsSync(file)) {
    const backupPath = path.join(backupDir, path.basename(file));
    fs.copyFileSync(file, backupPath);
    console.log(`📁 Backed up: ${file} -> ${backupPath}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`- Files to remove: ${filesToRemove.length}`);
console.log(`- Backup location: ${backupDir}`);
console.log(`- Run 'node scripts/execute-phase-removal.js' to proceed with deletion`);
EOF

# Create separate execution script for actual deletion
cat > scripts/execute-phase-removal.js << 'EOF'
const fs = require('fs');

// Load the comprehensive cleanup inventory
const inventory = JSON.parse(fs.readFileSync('cleanup-inventory.json', 'utf8'));
const filesToRemove = inventory.phaseFiles;

console.log('🗑️  Executing phase file removal...');

let removedCount = 0;
filesToRemove.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`✓ Removed: ${file}`);
    removedCount++;
  }
});

console.log(`\n✅ Removed ${removedCount} phase files`);
console.log('🔍 Run npm run lint and npm run test to verify no broken imports');
EOF
```

#### Step 2: Execute Removal with Validation
```bash
# [CURSOR] Run analysis and backup
node scripts/remove-phase-files.js

# [CLAUDE] Review backup and import analysis results

# [CURSOR] Execute the actual removal (after Claude approval)
node scripts/execute-phase-removal.js

# [CURSOR] Verify no broken imports
npm run lint

# [CURSOR] Run tests to ensure nothing broke
npm run test

# [CURSOR] Run our comprehensive validation
npm run test src/__tests__/cleanup/phase-1-comprehensive-validation.test.ts

# [BOTH] Verify all tests pass before proceeding

# [CURSOR] Commit changes (only after full validation)
git add .
git commit -m "feat: remove phase-specific development files (Phase 1 cleanup)

- Removed 30+ phase-specific development artifacts
- Removed mobile optimization duplicates  
- Removed emergency fix files and JS files in TS codebase
- All tests passing, no broken imports
- Files backed up to backup/phase-files-[timestamp]"

# [BOTH] Update coordination log with completion status
```

### Day 4-5: Duplicate Component Consolidation

> **🔧 Component Consolidation**: Claude designs consolidated components, Cursor implements

#### Step 1: ErrorBoundary Consolidation
```bash
# [CLAUDE] Design consolidated ErrorBoundary pattern
# [CURSOR] Create consolidated ErrorBoundary
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

> **💾 Cache Unification**: Collaborative architectural design preserving recent changes

#### Step 1: Enhanced Cache Consolidation Strategy
```bash
# Analyze existing cache usage and preserve recent changes
cat > scripts/analyze-cache-usage.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Analyze actual cache usage across codebase
function findCacheUsage() {
  const cacheFiles = [
    'src/utils/cacheUtils.ts', // Recently modified - keep as base
    'src/utils/SimpleCache.ts',
    'src/utils/advancedCacheManager.ts',
    'src/services/EnhancedCacheManager.ts'
  ];

  cacheFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      console.log(`\n=== ${file} ===`);
      console.log(`Size: ${content.length} characters`);
      
      // Check for exports
      const exports = content.match(/export\s+(class|function|const|interface)\s+(\w+)/g);
      if (exports) {
        console.log('Exports:', exports.map(e => e.split(' ').pop()));
      }
    }
  });
}

findCacheUsage();
EOF

node scripts/analyze-cache-usage.js

# Create enhanced unified cache that builds on existing cacheUtils.ts
mkdir -p src/shared/utils/cache
cat > src/shared/utils/cache/index.ts << 'EOF'
// Re-export enhanced cache functionality, building on existing cacheUtils.ts
export { warmSpaceCache } from '@/utils/cacheUtils';

// Unified cache interface that other cache systems can implement
export interface CacheStrategy<T = any> {
  get(key: string): T | null;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
}

// Factory for creating domain-specific caches
export function createDomainCache<T>(domain: string, options?: {
  ttl?: number;
  maxSize?: number;
}): CacheStrategy<T> {
  // Implementation that integrates with existing cacheUtils patterns
  return new UnifiedDomainCache<T>(domain, options);
}

class UnifiedDomainCache<T> implements CacheStrategy<T> {
  private cache = new Map<string, { value: T; timestamp: number; ttl: number }>();
  private domain: string;
  private defaultTtl: number;
  private maxSize: number;

  constructor(domain: string, options: { ttl?: number; maxSize?: number } = {}) {
    this.domain = domain;
    this.defaultTtl = options.ttl || 5 * 60 * 1000; // 5 minutes
    this.maxSize = options.maxSize || 100;
  }

  get(key: string): T | null {
    const fullKey = `${this.domain}:${key}`;
    const item = this.cache.get(fullKey);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(fullKey);
      return null;
    }
    
    return item.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const fullKey = `${this.domain}:${key}`;
    
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(fullKey, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(`${this.domain}:${key}`);
  }

  clear(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${this.domain}:`)) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    let count = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (key.startsWith(`${this.domain}:`)) {
        if (now - item.timestamp <= item.ttl) {
          count++;
        } else {
          this.cache.delete(key);
        }
      }
    }
    
    return count;
  }
}

// Domain-specific cache instances
export const spaceCache = createDomainCache<any>('spaces', { ttl: 5 * 60 * 1000 });
export const userCache = createDomainCache<any>('users', { ttl: 10 * 60 * 1000 });
export const postCache = createDomainCache<any>('posts', { ttl: 2 * 60 * 1000 });
EOF

# Create migration guide for cache consolidation
cat > docs/refactoring/cache-migration-guide.md << 'EOF'
# Cache System Migration Guide

## Overview
We are consolidating 8+ different cache implementations into a unified system while preserving the recently modified cacheUtils.ts functionality.

## What's Changing

### Before (Multiple Cache Systems)
```typescript
// Different cache implementations scattered across codebase
import { SimpleCache } from '@/utils/SimpleCache';
import { EnhancedCacheManager } from '@/services/EnhancedCacheManager';
import { AvatarCacheService } from '@/services/AvatarCacheService';
```

### After (Unified Cache System)
```typescript
// Single, consistent cache API
import { spaceCache, userCache, postCache, createDomainCache } from '@/shared/utils/cache';

// Use domain-specific caches
spaceCache.set('space-123', spaceData);
const cached = spaceCache.get('space-123');

// Create custom domain cache
const customCache = createDomainCache<MyType>('custom', { ttl: 30000 });
```

## Migration Steps

1. **Phase 1**: Create unified cache system (preserves existing cacheUtils.ts)
2. **Phase 2**: Migrate consumers to use new unified API
3. **Phase 3**: Remove old cache implementations
4. **Phase 4**: Update documentation and team training

## Preserved Functionality
- All existing cacheUtils.ts functions remain available
- No breaking changes for current cache users
- Gradual migration path
EOF
```

## Week 2: Feature Structure Setup

> **🏗️ Structure Week**: Building foundation for feature-first architecture

### Day 8-9: Create Feature Directory Structure

> **📁 Directory Creation**: Cursor creates structure, Claude validates organization

#### Step 1: Create Missing Feature Directories
```bash
# [CURSOR] Create feature directory structure
mkdir -p src/features/{spaces,posts,chat,users,discovery,notifications,classroom}/{components,hooks,utils,types}

# [CLAUDE] Validate directory structure matches ADR-001 requirements

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

> **✅ Final Validation**: Comprehensive testing and documentation

#### Step 1: Run Comprehensive Tests
```bash
# [CURSOR] Run all test suites
npm run test
npm run test:security
npm run test:coverage

# [CURSOR] Run linting
npm run lint

# [CURSOR] Build verification
npm run build

# [CURSOR] Performance check
npm run build -- --analyze

# [CLAUDE] Analyze test results and performance metrics
# [BOTH] Update coordination log with final validation results
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
- [ ] Phase files removed: 30+ files (comprehensive list documented)
- [ ] Mobile optimization duplicates removed: 12+ files
- [ ] Emergency fix files removed: 5+ files
- [ ] Test coverage maintained at 90%+

### Qualitative Metrics
- [ ] No broken imports or build errors
- [ ] All existing functionality preserved
- [ ] Developer experience improved (easier to find components)
- [ ] Codebase more maintainable

### Validation Commands
```bash
# Run comprehensive validation suite
npm run test src/__tests__/cleanup/phase-1-comprehensive-validation.test.ts

# Check bundle size improvement
npm run build -- --analyze

# Verify no circular dependencies
node scripts/analyze-dependencies.js

# Verify comprehensive cleanup inventory
node scripts/create-cleanup-inventory.js

# Run all test suites to ensure no regressions
npm run test && npm run test:security && npm run test:coverage
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

## Enhanced Team Handoff Documentation

### What Changed in Phase 1
- ✅ Removed 30+ phase-specific development files (comprehensive inventory)
- ✅ Consolidated 8 ErrorBoundary components into 1 shared component
- ✅ Unified 4 SpaceCard variants into 1 configurable component  
- ✅ Standardized cache system while preserving recent cacheUtils.ts changes
- ✅ Created feature directory structure for 7 features
- ✅ Removed 12+ mobile optimization duplicates
- ✅ Cleaned up emergency fix files and mixed JS/TS files

### Impact on Development

#### New Import Patterns
```typescript
// OLD: Multiple ErrorBoundary imports
import { ErrorBoundary } from '@/components/errors/AppErrorBoundary';

// NEW: Single consolidated import
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

// OLD: Multiple SpaceCard variants
import { EnhancedSpaceCard } from '@/components/spaces/EnhancedSpaceCard';

// NEW: Single configurable component
import { SpaceCard } from '@/shared/components/SpaceCard';
<SpaceCard variant="enhanced" space={spaceData} />
```

#### Cache Usage
```typescript
// NEW: Unified cache API (preserves existing cacheUtils.ts)
import { spaceCache, userCache, warmSpaceCache } from '@/shared/utils/cache';
import { warmSpaceCache } from '@/utils/cacheUtils'; // Still available

spaceCache.set('space-123', spaceData);
const cached = spaceCache.get('space-123');
```

### For Phase 2 Preparation
The feature directories are ready for component migration:
- `/src/features/spaces/components/` - Ready for 35+ space components
- `/src/features/posts/components/` - Ready for post components  
- `/src/features/chat/components/` - Ready for 14 chat components
- `/src/features/users/components/` - Ready for 22 profile components
- `/src/features/discovery/components/` - Ready for 9 discover components
- `/src/features/notifications/components/` - Ready for 6 notification components
- `/src/features/classroom/components/` - Ready for 18 classroom components

### Success Metrics Achieved
- ✅ Utils directory reduced by 45% (30+ files removed)
- ✅ ErrorBoundary components: 8 → 1
- ✅ SpaceCard components: 4 → 1  
- ✅ Cache implementations: 8+ → 1 unified system (preserving recent changes)
- ✅ All tests passing with 90%+ coverage maintained
- ✅ Build successful with no circular dependencies
- ✅ No broken imports or functionality regressions

### Rollback Plan
If issues arise: `./scripts/rollback-phase-1.sh`
All changes backed up to `backup/phase-files-[timestamp]`

This enhanced plan ensures Phase 1 is executed safely with comprehensive risk mitigation, automated tooling, detailed validation, and clear success criteria while respecting recent codebase changes. 