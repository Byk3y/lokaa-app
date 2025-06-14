/**
 * Generate a clean, URL-friendly slug from a string
 */
export function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove all non-alphanumeric chars except hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');     // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug with suffix if needed
 */
export function generateUniqueSlug(
  str: string, 
  existingCheck: (slug: string) => Promise<boolean>
): Promise<string> {
  return new Promise(async (resolve) => {
    const baseSlug = generateSlug(str);
    let currentSlug = baseSlug;
    let counter = 1;
    
    while (await existingCheck(currentSlug)) {
      currentSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    resolve(currentSlug);
  });
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0) return false;
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  if (slug.startsWith('-') || slug.endsWith('-')) return false;
  if (slug.includes('--')) return false; // No double hyphens
  return true;
}

/**
 * Sanitize and validate slug
 */
export function sanitizeSlug(input: string): { slug: string; isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!input || input.trim().length === 0) {
    errors.push("Input is required");
    return { slug: '', isValid: false, errors };
  }
  
  const slug = generateSlug(input);
  
  if (slug.length === 0) {
    errors.push("Input contains no valid characters for slug generation");
    return { slug: '', isValid: false, errors };
  }
  
  if (slug.length < 3) {
    errors.push("Slug must be at least 3 characters long");
  }
  
  if (slug.length > 63) {
    errors.push("Slug must be less than 64 characters long");
  }
  
  const isValid = errors.length === 0 && isValidSlug(slug);
  
  return { slug, isValid, errors };
} 