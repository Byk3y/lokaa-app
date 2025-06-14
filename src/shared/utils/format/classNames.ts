/**
 * Class Name Utilities
 * 
 * Utilities for working with CSS class names.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge
 * to prevent conflicts with utility classes.
 * 
 * @param inputs - Class names to combine
 * @returns Merged class name string
 * 
 * @example
 * // Returns "text-red-500 p-4 font-bold"
 * cn("text-red-500", "p-4", "font-bold")
 * 
 * @example
 * // Returns "p-4 text-blue-500" (resolving the conflicting classes)
 * cn("p-2 text-red-500", "p-4 text-blue-500")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
} 