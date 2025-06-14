# ADR 003: Space Feed as Root Path

## Status

Accepted

## Context

Previously, the feed component for spaces was accessible via a dedicated URL path: `/:spaceSlug/space/feed`. This created an unnecessary level of nesting in the URL structure and didn't align with the principle that the feed is the default view for a space.

## Decision

We have decided to make the Space feed the default root path:
- Changed: `/:spaceSlug/space/feed` 
- To: `/:spaceSlug/space`

For backward compatibility, we've implemented a redirect from the old `/feed` path to the new root path. This ensures that any existing links or bookmarks continue to work properly.

Other space tab routes remain unchanged:
- `/classroom`
- `/calendar`
- `/members`
- `/leaderboards`
- etc.

## Implementation Details

1. The index route for `/:subdomain/space` now renders the `SpaceTabContent` component directly
2. A redirect was added from `/:subdomain/space/feed` to `/:subdomain/space`
3. Navigation components (SpaceNav, BottomNav) were updated to handle the new URL structure
4. The `isActive` function in navigation components was updated to check for both `/feed` and root space paths

## Consequences

### Positive

- Cleaner URL structure with less nesting
- Better alignment with UX principles (feed as default view)
- More consistent with web conventions where the root path typically shows the primary content

### Negative

- Temporary maintenance of redirect for backward compatibility
- Some confusion may occur during the transition period for users who are used to the old URL structure

### Neutral

- Documentation and onboarding materials need to be updated to reflect the new URL structure

## Related Work

- Updates to mobile navigation components
- Adjustments to the space shell layout and tab navigation 