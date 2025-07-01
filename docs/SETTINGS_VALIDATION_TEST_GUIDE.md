# Settings Validation Test Guide

This guide outlines how to test the Phase 2 security implementation for settings validation.

## 1. Automated Tests

Run the automated test suite in the browser console:

```javascript
window.settingsValidationTest.runAllTests()
```

This will test all validation schemas with both valid and invalid data.

## 2. Manual Testing Steps

### General Settings Tab

1. **Name Field**
   - Try entering a name less than 3 characters
   - Try entering a name with special characters
   - Try entering a name longer than 30 characters
   - Verify error messages appear correctly

2. **Description Field**
   - Try entering a description longer than 150 characters
   - Verify error message appears correctly

3. **Subdomain Field**
   - Try entering uppercase letters (should auto-convert to lowercase)
   - Try entering special characters (should be removed)
   - Try entering spaces (should be removed)
   - Verify error messages appear correctly

4. **Support Email Field**
   - Try entering an invalid email format
   - Verify error message appears correctly

5. **File Uploads**
   - Try uploading non-image files for icon/cover
   - Try uploading files larger than limits
   - Verify error messages appear correctly

### About Page Tab

1. **About Description**
   - Try entering extremely long text (>50,000 chars)
   - Verify error message appears correctly

2. **Short Description**
   - Try entering text longer than 200 characters
   - Verify error message appears correctly

3. **Intro Media**
   - Try entering invalid URLs
   - Try selecting invalid media types
   - Verify error messages appear correctly

### Rules Tab

1. **Rule Text**
   - Try adding empty rules
   - Try adding rules longer than 500 characters
   - Verify error messages appear correctly

2. **Rule Operations**
   - Try adding multiple rules
   - Try editing rules
   - Try deleting rules
   - Verify validation occurs on each operation

### Categories Tab

1. **Category Names**
   - Try adding categories with names less than 2 characters
   - Try adding categories with names longer than 50 characters
   - Verify error messages appear correctly

2. **Category Icons**
   - Try adding non-emoji icons
   - Try adding multiple emoji icons
   - Verify error messages appear correctly

### Pricing Tab

1. **Price Input**
   - Try entering negative numbers
   - Try entering zero
   - Try entering non-numeric values
   - Try entering prices above 999
   - Verify error messages appear correctly

2. **Pricing Type**
   - Try switching between free and paid
   - Verify trial toggle only appears for paid
   - Verify validation occurs on type change

### Tabs Tab

1. **Feature Toggles**
   - Try toggling each feature
   - Verify validation occurs on toggle
   - Verify error messages appear correctly

## 3. Cross-Browser Testing

Test all the above in:
- Chrome
- Safari
- Firefox
- Mobile browsers

## 4. Mobile-Specific Tests

1. **Network Conditions**
   - Test with slow network
   - Test with offline mode
   - Verify validation still works
   - Verify error messages are visible

2. **Touch Interactions**
   - Verify error messages are tap-friendly
   - Verify form controls are properly sized
   - Test with different screen sizes

## 5. Error Message Verification

For each test case above, verify that:
1. Error messages are clear and helpful
2. Error states are visually distinct
3. Error messages disappear when input becomes valid
4. Form-level errors appear at the top
5. Field-level errors appear near fields

## 6. Success States

For each settings tab, verify that:
1. Valid changes are saved successfully
2. Success messages appear
3. Changes persist after page reload
4. Real-time validation feedback works

## 7. Security Verification

1. **XSS Prevention**
   - Try entering script tags in text fields
   - Try entering HTML in text fields
   - Verify content is properly escaped

2. **SQL Injection Prevention**
   - Try entering SQL commands in text fields
   - Verify content is properly sanitized

3. **File Upload Security**
   - Try uploading malicious file types
   - Verify file type validation works
   - Verify file size limits work

## 8. Performance Testing

1. **Validation Speed**
   - Verify validation is responsive
   - Test with large datasets
   - Monitor browser performance

2. **Memory Usage**
   - Monitor memory usage during testing
   - Verify no memory leaks
   - Test with extended usage

## Expected Results

After running all tests:
1. All automated tests should pass
2. Manual tests should show proper validation
3. Error messages should be clear and helpful
4. Changes should persist correctly
5. Security measures should prevent invalid input
6. Performance should remain stable

## Reporting Issues

If you find any issues:
1. Document the exact steps to reproduce
2. Note the browser/device used
3. Include any error messages
4. Take screenshots if possible
5. Note the expected vs actual behavior 