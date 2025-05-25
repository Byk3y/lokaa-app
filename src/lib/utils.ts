/**
 * @deprecated These utilities have been moved to the shared utils.
 * Import from '@/shared/utils' instead.
 */

import { cn as sharedCn } from '@/shared/utils/format/classNames';
import { type ClassValue } from "clsx";

/**
 * Combines multiple class names using clsx and tailwind-merge
 * to prevent conflicts with utility classes
 * 
 * @deprecated Use cn from '@/shared/utils' instead
 */
export function cn(...inputs: ClassValue[]) {
  return sharedCn(...inputs);
}
