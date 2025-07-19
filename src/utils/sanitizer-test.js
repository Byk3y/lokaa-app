import { log } from '@/utils/logger';
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
log.debug('Utils', 'HTML Sanitizer Manual Test Instructions:');
log.debug('Utils', '=====================================');
log.debug('Utils', '1. Import the sanitizer in browser console:');
log.debug('Utils', '   import { sanitizePostContent } from "/src/utils/htmlSanitizer.js";');
log.debug('Utils', '');
log.debug('Utils', '2. Test each case:');
testCases.forEach((test, index) => {
  log.debug('Utils', `${index + 1}. ${test.name}:`);
  log.debug('Utils', `   Input: ${test.input}`);
  log.debug('Utils', `   Expected: ${test.expected}`);
  log.debug('Utils', `   Test: sanitizePostContent('${test.input}')`);
  log.debug('Utils', '');
});

log.debug('Utils', '3. Verify that dangerous content is removed and safe content is preserved.');
log.debug('Utils', '4. Check that external links have target="_blank" and rel="noopener noreferrer".');

export { testCases };