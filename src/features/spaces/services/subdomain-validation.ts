import { validateSubdomain, isSubdomainAvailable } from '@/shared/services/database';
import { generateUniqueSlug } from '@/shared/utils/slug-generator';

/**
 * Enhanced subdomain validation for space features
 */
export interface SubdomainSuggestion {
  original: string;
  suggestion: string;
  available: boolean;
  reason?: string;
}

/**
 * Generate subdomain suggestions based on space name
 */
export async function generateSubdomainSuggestions(spaceName: string): Promise<SubdomainSuggestion[]> {
  const suggestions: SubdomainSuggestion[] = [];
  
  // Base suggestion from space name
  const baseSlug = spaceName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (baseSlug.length >= 3) {
    const baseResult = await isSubdomainAvailable(baseSlug);
    suggestions.push({
      original: spaceName,
      suggestion: baseSlug,
      available: baseResult.success ? (baseResult.available || false) : false,
      reason: baseResult.success ? undefined : 'Validation error'
    });
    
    // Add numbered variations if base is taken
    if (baseResult.success && !baseResult.available) {
      for (let i = 2; i <= 5; i++) {
        const numberedSlug = `${baseSlug}-${i}`;
        const numberedResult = await isSubdomainAvailable(numberedSlug);
        suggestions.push({
          original: spaceName,
          suggestion: numberedSlug,
          available: numberedResult.success ? (numberedResult.available || false) : false,
          reason: numberedResult.success ? undefined : 'Validation error'
        });
        
        // Stop if we find an available one
        if (numberedResult.success && numberedResult.available) {
          break;
        }
      }
    }
  }
  
  // Add word-based variations
  const words = spaceName.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  if (words.length > 1) {
    // First word + last word
    const firstLast = `${words[0]}-${words[words.length - 1]}`;
    if (firstLast !== baseSlug && firstLast.length >= 3) {
      const firstLastResult = await isSubdomainAvailable(firstLast);
      suggestions.push({
        original: spaceName,
        suggestion: firstLast,
        available: firstLastResult.success ? (firstLastResult.available || false) : false,
        reason: firstLastResult.success ? undefined : 'Validation error'
      });
    }
    
    // Acronym from first letters
    const acronym = words.map(word => word[0]).join('');
    if (acronym.length >= 3) {
      const acronymResult = await isSubdomainAvailable(acronym);
      suggestions.push({
        original: spaceName,
        suggestion: acronym,
        available: acronymResult.success ? (acronymResult.available || false) : false,
        reason: acronymResult.success ? undefined : 'Validation error'
      });
    }
  }
  
  return suggestions;
}

/**
 * Validate and suggest subdomain for space creation
 */
export async function validateAndSuggestSubdomain(subdomain: string, spaceName?: string) {
  const validationResult = await validateSubdomain(subdomain);
  
  let suggestions: SubdomainSuggestion[] = [];
  
  // If validation failed or subdomain is taken, generate suggestions
  if (!validationResult.success || !validationResult.available) {
    if (spaceName) {
      suggestions = await generateSubdomainSuggestions(spaceName);
    } else {
      // Generate simple numeric suggestions based on the provided subdomain
      const baseSlug = subdomain
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      if (baseSlug.length >= 3) {
        for (let i = 1; i <= 3; i++) {
          const numberedSlug = `${baseSlug}-${i}`;
          const result = await isSubdomainAvailable(numberedSlug);
          suggestions.push({
            original: subdomain,
            suggestion: numberedSlug,
            available: result.success ? (result.available || false) : false,
            reason: result.success ? undefined : 'Validation error'
          });
        }
      }
    }
  }
  
  return {
    validation: validationResult,
    suggestions: suggestions.filter(s => s.available).slice(0, 5) // Return top 5 available suggestions
  };
}

/**
 * Get next available subdomain with automatic suffix
 */
export async function getNextAvailableSubdomain(baseSubdomain: string): Promise<string> {
  const checkAvailability = async (slug: string): Promise<boolean> => {
    const result = await isSubdomainAvailable(slug);
    return result.success ? !(result.available || false) : true; // Return true if NOT available (for generateUniqueSlug)
  };
  
  return await generateUniqueSlug(baseSubdomain, checkAvailability);
}

/**
 * Batch validate multiple subdomains
 */
export async function validateMultipleSubdomains(subdomains: string[]): Promise<{
  subdomain: string;
  result: Awaited<ReturnType<typeof validateSubdomain>>;
}[]> {
  const results = await Promise.all(
    subdomains.map(async (subdomain) => ({
      subdomain,
      result: await validateSubdomain(subdomain)
    }))
  );
  
  return results;
}

/**
 * Export core validation functions for direct use
 */
export { validateSubdomain, isSubdomainAvailable }; 