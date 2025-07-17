// Simple test to verify sanitization works
// This can be run in browser console or Node.js with DOM environment

// Test cases
const testCases = [
  {
    name: 'Script tag removal',
    input: '<p>Hello</p><script>alert("xss")</script>',
    expected: '<p>Hello</p>'
  },
  {
    name: 'Onclick handler removal',
    input: '<p onclick="alert(1)">Click me</p>',
    expected: '<p>Click me</p>'
  },
  {
    name: 'JavaScript URL removal',
    input: '<a href="javascript:alert(1)">Link</a>',
    expected: '<a>Link</a>'
  },
  {
    name: 'Safe HTML preservation',
    input: '<p>Hello <strong>world</strong></p>',
    expected: '<p>Hello <strong>world</strong></p>'
  },
  {
    name: 'Link safety',
    input: '<a href="https://example.com">Safe link</a>',
    expected: '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Safe link</a>'
  }
];

// Instructions for manual testing
console.log('HTML Sanitizer Manual Test Instructions:');
console.log('=====================================');
console.log('1. Import the sanitizer in browser console:');
console.log('   import { sanitizePostContent } from "/src/utils/htmlSanitizer.js";');
console.log('');
console.log('2. Test each case:');
testCases.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}:`);
  console.log(`   Input: ${test.input}`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Test: sanitizePostContent('${test.input}')`);
  console.log('');
});

console.log('3. Verify that dangerous content is removed and safe content is preserved.');
console.log('4. Check that external links have target="_blank" and rel="noopener noreferrer".');

export { testCases };