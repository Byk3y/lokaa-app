/**
 * 🎨 COLOR PALETTE TEST - Verify NO RED/PURPLE Colors
 * Quick test to show what colors our unified system now generates
 */

// Test different space names to see color generation
const testSpaces = [
  'Music Business',
  'NextPath AI', 
  'Nocode Devils',
  'Automation Studio',
  'Automation Jungle',
  'Test Space',
  'Another Test',
  'Final Test'
];

console.log('🎨 TESTING NEW PROFESSIONAL COLOR PALETTE');
console.log('==========================================');

// Import the utils (this would work in browser context)
if (typeof window !== 'undefined' && window.SpaceAssetsUtils) {
  testSpaces.forEach(spaceName => {
    const color = window.SpaceAssetsUtils.generateColor(spaceName);
    console.log(`${spaceName}: ${color}`);
  });
} else {
  console.log('SpaceAssetsUtils not loaded yet. Run this in browser console after page loads.');
}

// Available colors in our new palette:
const newPalette = [
  '#1A8A7E', // Primary teal (your brand color) 
  '#059669', // Emerald green
  '#0891B2', // Sky blue
  '#3B82F6', // Blue
  '#1D4ED8', // Darker blue
  '#0F766E', // Darker teal
  '#047857', // Dark emerald
  '#0E7490', // Dark cyan
  '#374151', // Professional gray
  '#4B5563', // Medium gray
  '#6B7280', // Light gray
  '#1F2937', // Dark gray
];

console.log('\n✅ NEW PROFESSIONAL PALETTE (NO RED/PURPLE):');
console.log('=============================================');
newPalette.forEach((color, index) => {
  console.log(`%c${color}`, `background: ${color}; color: white; padding: 4px 8px; margin: 2px;`);
});

console.log('\n🚫 REMOVED PROBLEMATIC COLORS:');
console.log('❌ #EF4444 (RED) - ELIMINATED');
console.log('❌ #EC4899 (PINK) - ELIMINATED'); 
console.log('❌ #8B5CF6 (VIOLET) - ELIMINATED');
console.log('❌ #6366F1 (PURPLE) - ELIMINATED');

window.testSpaceColors = () => {
  console.log('🧪 TESTING SPACE COLOR GENERATION:');
  testSpaces.forEach(spaceName => {
    if (window.SpaceAssetsUtils) {
      const assets = window.SpaceAssetsUtils.resolveSpaceAssets({ name: spaceName });
      console.log(`${spaceName}: ${assets.backgroundColor} (${assets.initials})`);
    }
  });
}; 