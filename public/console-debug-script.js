// 🔍 White Cast Debug Script
// Copy and paste this entire script into your browser console while the white cast is visible

console.log('🔍 Starting White Cast Debug Analysis...');

// Function to scan for overlays
function scanForWhiteCastOverlays() {
    console.log('🔍 Scanning for potential white cast overlays...');
    
    const suspiciousOverlays = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const position = styles.position;
        const zIndex = styles.zIndex;
        const background = styles.backgroundColor;
        const backdropFilter = styles.backdropFilter;
        const opacity = styles.opacity;
        
        // Check for overlay characteristics that could cause white cast
        if (
            (position === 'fixed' || position === 'absolute') &&
            (zIndex && parseInt(zIndex) > 40) &&
            (
                background.includes('white') || 
                background.includes('rgba(255') ||
                background.includes('rgb(255') ||
                backdropFilter !== 'none' ||
                el.className.includes('overlay') ||
                el.className.includes('backdrop') ||
                el.className.includes('modal') ||
                parseFloat(opacity) < 0.9
            )
        ) {
            suspiciousOverlays.push({
                element: el,
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                zIndex: zIndex,
                background: background,
                position: position,
                backdropFilter: backdropFilter,
                opacity: opacity,
                rect: el.getBoundingClientRect()
            });
        }
    });
    
    console.log(`Found ${suspiciousOverlays.length} suspicious overlays:`);
    suspiciousOverlays.forEach((overlay, index) => {
        console.log(`${index + 1}. ${overlay.tagName}${overlay.id ? '#' + overlay.id : ''}${overlay.className ? '.' + overlay.className.split(' ').join('.') : ''}`);
        console.log(`   Z-index: ${overlay.zIndex}, Background: ${overlay.background}`);
        console.log(`   Position: ${overlay.position}, Opacity: ${overlay.opacity}`);
        console.log(`   Size: ${overlay.rect.width}x${overlay.rect.height}`);
        console.log(`   Element:`, overlay.element);
        console.log('---');
    });
    
    return suspiciousOverlays;
}

// Function to test phase implementations
function testPhaseImplementations() {
    console.log('🧪 Testing Phase Implementations...');
    
    // Test Phase 8A
    if (window.phase8a) {
        console.log('✅ Phase 8A found');
        try {
            const status = window.phase8a.getStatus();
            console.log('Phase 8A Status:', status);
        } catch (e) {
            console.log('❌ Phase 8A status error:', e);
        }
    } else {
        console.log('❌ Phase 8A not found');
    }
    
    // Test Phase 8B
    if (window.phase8b) {
        console.log('✅ Phase 8B found');
        try {
            const status = window.phase8b.getStatus();
            console.log('Phase 8B Status:', status);
            
            const adaptations = window.phase8b.getAdaptations();
            console.log('Phase 8B Active Adaptations:', adaptations);
        } catch (e) {
            console.log('❌ Phase 8B status error:', e);
        }
    } else {
        console.log('❌ Phase 8B not found');
    }
    
    // Test Phase 8C
    if (window.phase8cIntegration) {
        console.log('✅ Phase 8C found');
        try {
            const status = window.phase8cIntegration.getStatus();
            console.log('Phase 8C Status:', status);
        } catch (e) {
            console.log('❌ Phase 8C status error:', e);
        }
    } else {
        console.log('❌ Phase 8C not found');
    }
}

// Function to attempt fixes
function attemptWhiteCastFix() {
    console.log('🔧 Attempting to fix white cast...');
    
    const overlays = scanForWhiteCastOverlays();
    let removedCount = 0;
    
    overlays.forEach((overlay, index) => {
        try {
            console.log(`Attempting to remove overlay ${index + 1}:`, overlay.element);
            
            // Try different removal strategies
            if (overlay.element.classList.contains('modal') || 
                overlay.element.classList.contains('overlay') ||
                overlay.element.classList.contains('backdrop')) {
                
                overlay.element.style.display = 'none';
                console.log(`✅ Hidden overlay ${index + 1}`);
                removedCount++;
            } else if (overlay.background.includes('white') && parseInt(overlay.zIndex) > 50) {
                overlay.element.style.backgroundColor = 'transparent';
                console.log(`✅ Made overlay ${index + 1} transparent`);
                removedCount++;
            }
        } catch (error) {
            console.log(`❌ Failed to fix overlay ${index + 1}:`, error);
        }
    });
    
    // Try phase-specific resets
    try {
        if (window.phase8b && window.phase8b.resetAdaptations) {
            window.phase8b.resetAdaptations();
            console.log('✅ Phase 8B adaptations reset');
        }
    } catch (e) {
        console.log('❌ Phase 8B reset failed:', e);
    }
    
    try {
        if (window.phase8a && window.phase8a.clearHistory) {
            window.phase8a.clearHistory();
            console.log('✅ Phase 8A history cleared');
        }
    } catch (e) {
        console.log('❌ Phase 8A reset failed:', e);
    }
    
    console.log(`🔧 Fix attempt completed. Modified ${removedCount} overlays.`);
}

// Function to create debug interface
function createWhiteCastDebugInterface() {
    // Check if interface already exists
    if (document.getElementById('white-cast-debug')) {
        console.log('Debug interface already exists');
        return;
    }
    
    const debugPanel = document.createElement('div');
    debugPanel.id = 'white-cast-debug';
    debugPanel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: white;
        border: 2px solid #007bff;
        border-radius: 8px;
        padding: 15px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    debugPanel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #007bff;">🔍 White Cast Debug</div>
        <button onclick="scanForWhiteCastOverlays()" style="width: 100%; margin: 3px 0; padding: 5px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Scan Overlays</button>
        <button onclick="testPhaseImplementations()" style="width: 100%; margin: 3px 0; padding: 5px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Test Phases</button>
        <button onclick="attemptWhiteCastFix()" style="width: 100%; margin: 3px 0; padding: 5px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Attempt Fix</button>
        <button onclick="document.getElementById('white-cast-debug').remove()" style="width: 100%; margin: 3px 0; padding: 5px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Close Debug</button>
    `;
    
    document.body.appendChild(debugPanel);
    console.log('✅ Debug interface created in top-right corner');
}

// Make functions globally available
window.scanForWhiteCastOverlays = scanForWhiteCastOverlays;
window.testPhaseImplementations = testPhaseImplementations;
window.attemptWhiteCastFix = attemptWhiteCastFix;
window.createWhiteCastDebugInterface = createWhiteCastDebugInterface;

// Auto-run analysis
console.log('🔍 Running initial analysis...');
scanForWhiteCastOverlays();
testPhaseImplementations();

console.log(`
🔍 White Cast Debug Commands Available:
- scanForWhiteCastOverlays() - Scan for potential overlays
- testPhaseImplementations() - Check phase implementation status  
- attemptWhiteCastFix() - Try to fix the white cast
- createWhiteCastDebugInterface() - Create visual debug panel

💡 Usage:
1. First run scanForWhiteCastOverlays() to identify suspicious elements
2. Run testPhaseImplementations() to check phase status
3. If overlays found, run attemptWhiteCastFix() to try removing them
4. Use createWhiteCastDebugInterface() for a visual interface
`);

// Create the visual interface automatically
createWhiteCastDebugInterface(); 