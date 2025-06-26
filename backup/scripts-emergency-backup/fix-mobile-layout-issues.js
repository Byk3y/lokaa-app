/**
 * 🚨 Mobile Layout Issues Fix
 * 
 * Diagnoses and fixes layout positioning problems including:
 * - Elements hidden behind other UI elements
 * - Positioning issues requiring swiping
 * - Z-index conflicts
 * - Viewport/overflow issues
 */

class MobileLayoutFixer {
  constructor() {
    this.fixes = [];
    this.issues = [];
  }

  /**
   * Main diagnostic and fix function
   */
  diagnoseAndFix() {
    console.log('🔧 [MobileLayoutFixer] Starting layout diagnosis...');
    
    this.checkViewportIssues();
    this.checkZIndexConflicts();
    this.checkOverflowIssues();
    this.checkPositioningIssues();
    this.checkDebugElements();
    
    this.applyFixes();
    this.generateReport();
  }

  /**
   * Check for viewport and body style issues
   */
  checkViewportIssues() {
    const body = document.body;
    const html = document.documentElement;
    
    // Check for problematic body styles
    const bodyStyles = window.getComputedStyle(body);
    const htmlStyles = window.getComputedStyle(html);
    
    // Check for overflow issues
    if (bodyStyles.overflowX !== 'visible' && bodyStyles.overflowX !== 'auto') {
      this.issues.push({
        type: 'viewport',
        element: 'body',
        issue: `Body overflow-x is ${bodyStyles.overflowX}`,
        fix: 'Set body overflow-x to visible'
      });
      
      this.fixes.push(() => {
        body.style.overflowX = 'visible';
        console.log('✅ Fixed body overflow-x');
      });
    }
    
    // Check for width issues
    if (bodyStyles.width !== 'auto' && !bodyStyles.width.includes('100%')) {
      this.issues.push({
        type: 'viewport',
        element: 'body',
        issue: `Body width is ${bodyStyles.width}`,
        fix: 'Set body width to 100%'
      });
      
      this.fixes.push(() => {
        body.style.width = '100%';
        console.log('✅ Fixed body width');
      });
    }

    // Check viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      this.issues.push({
        type: 'viewport',
        element: 'meta',
        issue: 'Missing viewport meta tag',
        fix: 'Add viewport meta tag'
      });
      
      this.fixes.push(() => {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
        console.log('✅ Added viewport meta tag');
      });
    }
  }

  /**
   * Check for z-index conflicts
   */
  checkZIndexConflicts() {
    const elements = document.querySelectorAll('[class*="fixed"], [class*="absolute"], [style*="position"]');
    const zIndexElements = [];
    
    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.position === 'fixed' || styles.position === 'absolute') {
        const zIndex = parseInt(styles.zIndex) || 0;
        zIndexElements.push({
          element: el,
          zIndex,
          classes: el.className,
          position: styles.position
        });
      }
    });
    
    // Sort by z-index
    zIndexElements.sort((a, b) => b.zIndex - a.zIndex);
    
    // Check for conflicts
    const highZElements = zIndexElements.filter(item => item.zIndex > 9000);
    if (highZElements.length > 3) {
      this.issues.push({
        type: 'z-index',
        element: 'multiple',
        issue: `${highZElements.length} elements with very high z-index`,
        fix: 'Reduce z-index values to create proper stacking'
      });
      
      console.log('🔍 High z-index elements:', highZElements);
    }
  }

  /**
   * Check for overflow issues
   */
  checkOverflowIssues() {
    const containers = document.querySelectorAll('div, main, section');
    
    containers.forEach(container => {
      const styles = window.getComputedStyle(container);
      const rect = container.getBoundingClientRect();
      
      // Check if container extends beyond viewport
      if (rect.width > window.innerWidth + 20) { // 20px tolerance
        this.issues.push({
          type: 'overflow',
          element: container,
          issue: `Container width ${rect.width}px exceeds viewport ${window.innerWidth}px`,
          fix: 'Add overflow-x controls'
        });
        
        this.fixes.push(() => {
          if (!container.style.overflowX) {
            container.style.overflowX = 'auto';
            container.style.maxWidth = '100vw';
            console.log('✅ Fixed container overflow for:', container.className);
          }
        });
      }
    });
  }

  /**
   * Check for positioning issues
   */
  checkPositioningIssues() {
    // Check for elements that might be positioned off-screen
    const fixedElements = document.querySelectorAll('[class*="fixed"]');
    
    fixedElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      
      // Check if element is positioned outside viewport
      if (rect.right < 0 || rect.left > window.innerWidth || 
          rect.bottom < 0 || rect.top > window.innerHeight) {
        this.issues.push({
          type: 'positioning',
          element: el,
          issue: `Element positioned outside viewport: ${rect.left}, ${rect.top}`,
          fix: 'Reposition element within viewport'
        });
        
        this.fixes.push(() => {
          // Try to reposition common fixed elements
          if (el.className.includes('top-') && el.className.includes('right-')) {
            el.style.position = 'fixed';
            el.style.top = '1rem';
            el.style.right = '1rem';
            console.log('✅ Repositioned fixed element:', el.className);
          }
        });
      }
    });
  }

  /**
   * Check for remaining debug elements
   */
  checkDebugElements() {
    // Check for any remaining debug elements
    const debugElements = document.querySelectorAll('[class*="debug"], [class*="Debug"]');
    debugElements.forEach(el => {
      if (el.textContent.includes('debug') || el.textContent.includes('Debug')) {
        this.issues.push({
          type: 'debug',
          element: el,
          issue: 'Debug element still visible',
          fix: 'Hide debug element'
        });
        
        this.fixes.push(() => {
          el.style.display = 'none';
          console.log('✅ Hidden debug element:', el.textContent.slice(0, 50));
        });
      }
    });
  }

  /**
   * Apply all fixes
   */
  applyFixes() {
    console.log(`🔧 [MobileLayoutFixer] Applying ${this.fixes.length} fixes...`);
    
    this.fixes.forEach((fix, index) => {
      try {
        fix();
      } catch (error) {
        console.error(`❌ Fix ${index + 1} failed:`, error);
      }
    });
  }

  /**
   * Generate diagnostic report
   */
  generateReport() {
    console.log('\n📊 [MobileLayoutFixer] Layout Diagnostic Report');
    console.log('='.repeat(50));
    
    if (this.issues.length === 0) {
      console.log('✅ No layout issues detected!');
      return;
    }
    
    // Group issues by type
    const groupedIssues = this.issues.reduce((groups, issue) => {
      groups[issue.type] = groups[issue.type] || [];
      groups[issue.type].push(issue);
      return groups;
    }, {});
    
    Object.entries(groupedIssues).forEach(([type, issues]) => {
      console.log(`\n🔍 ${type.toUpperCase()} ISSUES (${issues.length}):`);
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.issue}`);
        console.log(`     Fix: ${issue.fix}`);
      });
    });
    
    console.log(`\n✅ Applied ${this.fixes.length} fixes`);
    console.log('\n🔧 To refresh layout: window.mobileLayoutFixer.diagnoseAndFix()');
  }

  /**
   * Force refresh all layout
   */
  forceRefreshLayout() {
    console.log('🔄 Force refreshing layout...');
    
    // Force reflow
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
    
    // Reset scroll positions
    window.scrollTo(0, 0);
    
    // Clear any transforms that might be causing issues
    const transformElements = document.querySelectorAll('[style*="transform"]');
    transformElements.forEach(el => {
      if (el.style.transform && el.style.transform.includes('translate')) {
        console.log('🔧 Clearing problematic transform:', el.className);
        el.style.transform = '';
      }
    });
    
    console.log('✅ Layout refresh complete');
  }

  /**
   * Quick fix for common mobile issues
   */
  quickMobileFix() {
    console.log('⚡ Applying quick mobile fixes...');
    
    // Fix viewport
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
    
    // Fix body styles
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';
    document.body.style.maxWidth = '100vw';
    
    // Fix common container issues
    const containers = document.querySelectorAll('.container, .max-w-screen, [class*="max-w"]');
    containers.forEach(container => {
      container.style.maxWidth = '100vw';
      container.style.overflowX = 'hidden';
    });
    
    // Hide any remaining debug elements
    const debugText = ['debug', 'Debug', 'Shell:', 'Skool Mobile'];
    debugText.forEach(text => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.includes(text)
      );
      elements.forEach(el => {
        if (el.textContent.trim().startsWith(text)) {
          el.style.display = 'none';
          console.log('✅ Hidden debug element:', text);
        }
      });
    });
    
    console.log('✅ Quick mobile fixes applied');
  }
}

// Initialize and run
const mobileLayoutFixer = new MobileLayoutFixer();

// Global access for testing
window.mobileLayoutFixer = mobileLayoutFixer;

// Auto-run on load
if (document.readyState === 'complete') {
  mobileLayoutFixer.diagnoseAndFix();
} else {
  window.addEventListener('load', () => {
    mobileLayoutFixer.diagnoseAndFix();
  });
}

console.log('🔧 Mobile Layout Fixer loaded. Run window.mobileLayoutFixer.quickMobileFix() for instant fixes'); 