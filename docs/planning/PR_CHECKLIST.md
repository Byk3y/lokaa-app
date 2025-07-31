# PR Checklist: Phase 2 Slug Routing & UI

## Bug Fixes

- [x] Fixed post fetching by slug in PostDetailPage.tsx
  - Modified query to first get the space ID for the subdomain
  - Then used the space_id field directly to fetch the post instead of trying to join on spaces.subdomain
- [x] Fixed similar issue in PostLegacyRedirect.tsx
  - Updated the redirect logic to properly handle subdomain-to-space ID lookup
- [x] Fixed potential issues in SpaceSwitcher component
  - Added safer array checking before iteration
  - Removed excessive console logging
  - Fixed potential null reference errors
- [x] Fixed post creation error "Error submitting post"
  - Removed problematic join relationship query (author:users!user_id)
  - Implemented separate queries to fetch user and space data
  - Fixed type issues with navigateToPost function
- [x] Fixed slug generation for new posts
  - Removed client-side slug generation and fully relied on database trigger
  - Added a fallback mechanism to re-fetch the post if slug wasn't immediately available
  - Fixed URL generation to properly use the slug instead of post ID
- [x] Fixed slug-based URL navigation
  - Improved the navigateToPost function to explicitly use slugs instead of IDs
  - Added robust retry logic with exponential backoff for fetching slugs
  - Added manual slug generation and update if database trigger fails
  - Added extensive logging to debug slug generation issues

## Manual Testing Checklist

### URL Generation

- [ ] Post URLs now use the format `/:spaceSlug/space/:postSlug`
- [ ] Verify `getPostUrl(post, space)` returns the correct slug URL
- [ ] Verify "Copy link" functionality in posts correctly uses the slug URL

### Legacy URL Redirects

- [ ] `/spaces/:spaceId/posts/:postId` redirects to `/:spaceSlug/space/:postSlug`
- [ ] `/space/:subdomain/posts/:postId` redirects to `/:spaceSlug/space/:postSlug`
- [ ] Verify redirect works correctly using the browser's network inspector (301 status)

### PostCard Click Behavior

- [ ] Desktop: Clicking a post card opens the modal and pushes slug URL to history
- [ ] Desktop: URL changes without page reload when opening a post
- [ ] Mobile (<768px): Clicking a post card navigates to the full page slug URL

### Modal / Page Behavior

- [ ] Desktop: Closing the post modal navigates back in history
- [ ] Desktop: Browser back button closes the modal
- [ ] Desktop: Browser forward button reopens the modal
- [ ] Mobile: Back button works correctly on the full page view

### Post Creation Flow

- [ ] Creating a new post immediately uses the slug URL (not ID-based URL)
- [ ] Desktop: Creating a post opens the modal and pushes the slug URL to history
- [ ] Mobile: Creating a post navigates to the full page post view with slug URL
- [ ] Editing a post's title updates the URL if the slug changes
- [ ] Old slug URLs redirect to the new slug URL after title change

### URL Edge Cases

- [ ] Posts with duplicate titles generate unique slugs
- [ ] Posts with special characters in titles have properly formatted slugs
- [ ] Posts without slugs (older content) are handled gracefully

### SEO

- [ ] Verify canonical link is properly set in the HTML
- [ ] Verify OpenGraph meta tags are present for social sharing

## Performance

- [ ] Navigating between posts is smooth and responsive
- [ ] URL changes don't cause unnecessary re-renders or API calls

## Browser Compatibility

- [ ] Test in Chrome
- [ ] Test in Safari
- [ ] Test in Firefox
- [ ] Test on iOS mobile
- [ ] Test on Android mobile 