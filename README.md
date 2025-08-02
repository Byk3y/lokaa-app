# Lokaa Connect Spaces

[![Security-Validation CI](https://github.com/lokaa/lokaa-app/actions/workflows/validate.yml/badge.svg)](https://github.com/lokaa/lokaa-app/actions/workflows/validate.yml)

A platform for creating and managing collaborative spaces.

🚀 **Live App**: https://lokaa-app.vercel.app

**Latest Version**: 0.0.3 with deployment fixes

## Project Status

⚠️ **NOTICE: Code Refactoring In Progress** ⚠️

This codebase is currently undergoing a significant refactoring to improve maintainability, scalability, and developer experience. See the [refactoring documentation](./docs/refactoring/README.md) for details.

## Architecture

The application is being migrated to a feature-first architecture as documented in [ADR-001](./docs/adr/001-feature-first-organization.md).

State management is being migrated to Zustand as documented in [ADR-002](./docs/adr/002-zustand-for-state-management.md).

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

### Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linting
- `npm run test` - Run tests

### DevTools

The application includes development-only console helpers for testing and debugging. These are automatically loaded in development mode and exposed to `window.lokaaTest`.

#### Available Tools

**Bridge Testing:**
```javascript
// Test the SupabaseIndexedDBBridge mock
await window.lokaaTest.bridge.initialize();
window.lokaaTest.bridge.getHealthStatus();
window.lokaaTest.bridge.getMetrics();

// Test space operations
await window.lokaaTest.bridge.getSpaceMembers('space-id');
await window.lokaaTest.bridge.getMemberCounts('space-id');
```

**File Validation Testing:**
```javascript
// Create test files
const testFile = window.lokaaTest.fileValidation.createTestFile('test.jpg', 'image/jpeg', 2048);

// Test image validation
await window.lokaaTest.fileValidation.testImageValidation(testFile);

// Test file metadata validation
await window.lokaaTest.fileValidation.testFileMetadata(testFile, 'image');

// Get file type configurations
window.lokaaTest.fileValidation.getConfigs();
```

**Supabase Mock Testing:**
```javascript
// Get mock information
window.lokaaTest.supabase.mockInfo;

// Test connection
await window.lokaaTest.supabase.testConnection();

// Access client directly
window.lokaaTest.supabase.client;
```

**Utility Functions:**
```javascript
// Environment information
window.lokaaTest.utils.getEnvInfo();

// Storage helpers
window.lokaaTest.utils.storage.inspect();
window.lokaaTest.utils.storage.clear();

// Generate test data
window.lokaaTest.utils.generateTestData.user('user-123');
window.lokaaTest.utils.generateTestData.space('test-space');
window.lokaaTest.utils.generateTestData.post('test-post');
```

#### Usage

1. Start the development server: `npm run dev`
2. Open browser console
3. Access tools via `window.lokaaTest`
4. All operations are logged to console for debugging

**Note:** DevTools are only available in development mode (`NODE_ENV=development`) and will not be loaded in production builds.

## Documentation

- [Architecture Decision Records](./docs/adr/index.md)
- [Refactoring Log](./docs/refactoring/README.md)
- [Source Code Organization](./src/README.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

### Security Validation

All PRs must pass the Security-Validation CI workflow before merging. This ensures:

- Test coverage remains above 90%
- No validation tests are skipped
- All security-related tests pass

The workflow runs automatically on every PR and can be manually triggered. Check the [Security-Validation CI](.github/workflows/validate.yml) configuration for details.

## License

This project is proprietary and confidential.

# Lokaa

A modern, community-driven web application inspired by Skool.com, designed for seamless discussions, media sharing, and collaborative engagement. This project emphasizes a beautiful, accessible, and responsive user experience, with robust real-time features powered by Supabase.

## Features

- **Feed & Posts**
  - Dynamic feed with `PostCard` previews.
  - Rich media support (images, videos, thumbnails).
  - Category tagging with fallback logic.
  - Real-time like and comment counts, synchronized across views.

- **Post Detail Modal**
  - Full post view in a responsive modal (`PostDetailModal`).
  - Sticky header appears on scroll for context and quick actions.
  - Optimistic UI for likes and comments.
  - "Jump to latest comment" button for easy navigation.
  - Accessibility-first: ARIA roles, hidden titles/descriptions, keyboard navigation.

- **Comments**
  - Threaded comment section with real-time updates.
  - Redesigned comment box: action buttons appear only when typing.
  - Scroll-to-latest and smooth transitions.

- **Space Setup Guide**
  - Onboarding guide for new spaces.
  - Dismissible with persistent state (localStorage).
  - Reappears for admins/owners if not completed.

- **General UX**
  - Inspired by Skool.com's clean, modern design.
  - Responsive layouts and smooth transitions.
  - Accessibility compliance (Radix UI, ARIA).

- **Post Pinning**
  - Admin Post Pinning: Space owners and admins can pin important posts to the top of the feed
  - Category-specific Pinning: Pin posts in specific categories or globally
  - Auto-unpinning: When a new post is pinned and the limit of 4 pinned posts is reached, the oldest pinned post is automatically unpinned
  - Drag and Drop Reordering: Easily reorder pinned posts by dragging them to your preferred order
  - Visual Indicators: Clear visual indication of pinned posts with a yellow accent and pin icon

## Tech Stack

- **Frontend:** React, Next.js, Radix UI, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Realtime)
- **State Management:** React Context, SWR
- **Media Handling:** Custom video thumbnail extraction, image optimization

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Yarn or npm
- Supabase project (see below)

### Installation

```bash
git clone https://github.com/your-org/lokaa.git
cd lokaa
yarn install
# or
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

2. (Optional) Configure other environment variables as needed.

### Running Locally

```bash
yarn dev
# or
npm run dev
```

Visit [https://lokaa.app](https://lokaa.app).

### Supabase Setup

- Create a Supabase project.
- Run the provided SQL migrations (see `/supabase/migrations`).
- Configure storage buckets for media uploads.

## Project Structure

```
/components
  /FeedTab
  /PostCard
  /PostDetailModal
  /CommentBox
  /SpaceSetupGuide
/lib
/pages
/public
/styles
/supabase
```

- **components/**: All major UI components, each with focused logic and styling.
- **lib/**: Utility functions (e.g., media handling, Supabase helpers).
- **pages/**: Next.js routes.
- **supabase/**: SQL migrations, types, and Supabase client setup.

## Key UX & Design Decisions

- **Sticky Headers:** Only appear on scroll, with smooth transitions and no content jumps.
- **Modal Interactions:** Like/comment actions are decoupled from modal open/close logic.
- **Accessibility:** All dialogs and modals use ARIA roles, visually hidden titles, and keyboard navigation.
- **Optimistic Updates:** UI updates instantly for likes/comments, with rollback on error.
- **Persistent Onboarding:** Space Setup Guide state is stored in localStorage, with admin logic for reappearance.

## Contributing

1. Fork the repo and create your branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -am 'Add new feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a pull request

### Security

The application uses a dual-layer security system:

1. Session Management
   - JWT tokens stored in localStorage
   - Automatic refresh every 15 minutes
   - Token rotation on suspicious activity
   - 440 status code indicates session expiry or token reuse

2. CSRF Protection
   - One-time use tokens with 15-minute expiry
   - Required for all non-GET requests
   - Automatic token handling via `fetchWithCsrf` wrapper

#### Getting a CSRF Token

```typescript
// Using fetchWithCsrf wrapper (recommended)
const { fetchWithCsrf } = useSecureSession();
const response = await fetchWithCsrf('/api/posts', {
  method: 'POST',
  body: JSON.stringify(data)
});

// Manual token retrieval
const response = await fetch('/api/auth/csrf');
const { token } = await response.json();
```

#### Status Codes

- `440`: Session expired or token reuse detected
  - Client should redirect to login
  - All cached data should be cleared
  - New session required

- `403`: CSRF validation failed
  - Missing or invalid CSRF token
  - Token expired
  - New token required via `/api/auth/csrf`

#### Security Events

The following events are logged for monitoring:

- `security.token_reuse`: Detected token reuse attempt
- `security.csrf_fail`: CSRF validation failure
- `session.refresh`: Successful session refresh
- `session.expire`: Session expiration

#### Development

Run security tests:
```bash
npm run test:security
```

Security test coverage must be at least 90% to pass CI.

## License

[MIT](LICENSE)

---

**Tips:**
- For detailed component usage, see the JSDoc comments in each file.
- For troubleshooting, check the Supabase logs and browser console.
- For design inspiration, see [Skool.com](https://www.skool.com/).

mkdir .cursor

touch .cursor/mcp.json

{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "<your-personal-access-token>"
      ]
    }
  }
}

## How to Use

1. **Pinning Posts**:
   - As an admin, you'll see a pin icon in the post actions menu for each post
   - Click the pin icon to pin the post to the top of the feed
   - You can pin up to 4 posts per category

2. **Unpinning Posts**:
   - Click the pin icon again on a pinned post to unpin it
   - When you reach the limit of 4 pinned posts and pin a new one, the oldest pinned post will be automatically unpinned

3. **Reordering Pinned Posts**:
   - Hover over a pinned post to see the drag handle (vertical dots)
   - Click and hold the drag handle, then drag the post to your desired position
   - Release to drop the post in its new position
   - The order will be saved automatically

## Technical Implementation

The feature is built with:
- Supabase database for storing pin status, position, and category
- Custom triggers to handle auto-unpinning logic
- React Beautiful DND for drag-and-drop reordering
- Optimistic UI updates for a smooth user experience

# Slug-based Post URLs

## Overview

The platform now uses slug-based URLs for posts. Instead of using post IDs in URLs, we now use a readable slug derived from the post title. This improves SEO, user experience, and makes URLs more shareable.

## Features

- All post URLs now follow the pattern: `/:spaceSlug/space/:postSlug`
- Post creation automatically generates a slug from the title
- When a post is created, users are immediately taken to the slug URL
  - On desktop: Opens modal and updates browser URL
  - On mobile: Navigates to full page view with slug URL
- Legacy URLs (`/spaces/:spaceId/posts/:postId` and `/space/:subdomain/posts/:postId`) are automatically redirected to the new slug format
- Editing a post title updates the slug and URL

## Implementation

- Slugs are generated in the database using PostgreSQL triggers
- `generateSlug()` and `getUniqueSlug()` utilities ensure slugs are URL-friendly and unique within a space
- `getPostUrl()` utility returns the correct slug-based URL format
- Post creation flow has been updated to navigate to the slug URL immediately after saving
- SEO improvements with canonical URL tags pointing to the slug URL

## Testing

You can run tests with:

```bash
npm run test
```

## Manual Testing

Follow the checklist in `PR_CHECKLIST.md` to verify the slug behavior.
