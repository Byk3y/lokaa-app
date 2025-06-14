import React from 'react';
import { cn } from '@/lib/utils';

interface CategoryTagProps {
  name: string;
  variant?: 'default' | 'compact';
  className?: string;
}

// Generate consistent color based on category name
function getCategoryColor(name: string) {
  const colors = [
    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
    { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', hover: 'hover:bg-green-100' },
    { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
    { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
    { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', hover: 'hover:bg-pink-100' },
    { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hover: 'hover:bg-indigo-100' },
    { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', hover: 'hover:bg-teal-100' },
    { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', hover: 'hover:bg-cyan-100' },
  ];
  
  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) & 0xffffffff;
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function CategoryTag({ name, variant = 'default', className }: CategoryTagProps) {
  const baseClasses = "inline-flex items-center font-medium rounded-full transition-colors";
  const color = getCategoryColor(name);
  
  const variantClasses = {
    default: `px-2.5 py-1 text-xs ${color.bg} ${color.text} border ${color.border} ${color.hover}`,
    compact: `px-2 py-0.5 text-xs ${color.bg} ${color.text} border ${color.border}`
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {name}
    </span>
  );
} 