// REFACTORED: This component has been completely refactored into smaller, manageable components
// The original 2,200+ line monolith has been broken down into:
// - CourseGrid: Course display and grid layout
// - CourseCard: Individual course display with enrollment logic  
// - CreateCourseCard: Space owner course creation
// - SearchBar: Course search functionality
// - EmptyState: Clean empty state handling
// - CourseCardSkeleton: Loading state component
// And many more focused components

import ClassroomTabRefactored from './ClassroomTabRefactored';
export default ClassroomTabRefactored;