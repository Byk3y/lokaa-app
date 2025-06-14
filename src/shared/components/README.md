# Shared Components

This directory contains reusable UI components that are not specific to any feature. These components should be pure, presentational, and have minimal dependencies.

## Guidelines

When adding components to this directory, follow these guidelines:

1. **Reusability**: Components should be reusable across multiple features
2. **Purity**: Components should be pure, with minimal side effects
3. **Props API**: Components should have a clear and well-documented props API
4. **Styling**: Components should use the project's styling system consistently
5. **Testing**: Components should have unit tests
6. **Documentation**: Components should have documentation, especially for complex APIs

## Component Categories

Components in this directory should fall into one of these categories:

### UI Components

Basic UI building blocks like buttons, inputs, cards, etc.

### Layout Components

Components for page layout like grids, containers, dividers, etc.

### Feedback Components

Components for user feedback like loaders, alerts, toasts, etc.

### Data Display

Components for displaying data like tables, lists, charts, etc.

## Example Usage

```jsx
import { Button, Card, Avatar } from 'src/shared/components';

function MyFeatureComponent() {
  return (
    <Card>
      <Avatar src="/path/to/image.jpg" size="md" />
      <Button variant="primary">Click me</Button>
    </Card>
  );
}
``` 