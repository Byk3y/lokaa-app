# Shared Utilities

This directory contains utility functions that are used across multiple features. These utilities should be pure, stateless, and focused on a single responsibility.

## Guidelines

When adding utilities to this directory, follow these guidelines:

1. **Pure Functions**: Utilities should be pure functions with no side effects
2. **Single Responsibility**: Each utility should do one thing and do it well
3. **Comprehensive Tests**: Utilities should have thorough unit tests
4. **TypeScript**: All utilities should be properly typed
5. **Documentation**: Include JSDoc comments for all exported functions

## Categories

Utilities are organized into categories:

### Date & Time

Functions for formatting, parsing, and manipulating dates and times.

### Formatting

Functions for formatting text, numbers, and other data types.

### Validation

Functions for validating data.

### Media

Functions for handling images, videos, and other media.

### Network

Functions for making API requests, handling responses, etc.

## Example Usage

```typescript
import { formatDate, validateEmail } from 'src/shared/utils';

const formattedDate = formatDate(new Date(), 'MMM dd, yyyy');
const isValidEmail = validateEmail('user@example.com');
``` 