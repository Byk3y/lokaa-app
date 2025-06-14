# PostDetailModal Component Structure

This folder contains the refactored version of the PostDetailModal component, split into smaller, more maintainable pieces.

## Component Structure

```
post-detail/
├── hooks/
│   ├── useComments.ts       # Manages comment state and operations
│   ├── usePostActions.ts    # Handles post actions like likes and pins
│   └── useScrollBehavior.ts # Controls scroll effects and sticky header
├── media/
│   ├── AttachmentsList.tsx  # Displays images, files, and links
│   ├── MediaGallery.tsx     # Coordinates display of all media types
│   └── VideoThumbnail.tsx   # Renders video thumbnails with controls
├── comments/
│   └── CommentInput.tsx     # Comment input field with attachments
├── index.ts                 # Exports all components and hooks
├── PostActions.tsx          # Like, Comment, Share buttons
├── PostContent.tsx          # Post title and text content
├── PostDetailModal.tsx      # Main container component
└── PostHeader.tsx           # Header with author info and actions
```

## Usage

The main entrypoint is `src/components/space/post-detail-modal.tsx` which exports the `PostDetailModal` component.

```jsx
import PostDetailModal from '@/components/space/post-detail-modal';

// Then in your component:
<PostDetailModal 
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  post={selectedPost}
  onCommentAdded={handleCommentAdded}
  onPinToggled={handlePinToggled}
/>
```

## Utility Functions

The component uses utility functions extracted into shared modules:

- `src/shared/utils/media-utils.ts` - For handling video information
- `src/shared/utils/file-utils.ts` - For file icons and formatting
- `src/shared/utils/avatar-utils.ts` - For avatar initials 