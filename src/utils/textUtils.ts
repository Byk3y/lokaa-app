/**
 * Text utility functions for formatting and processing text content
 */

/**
 * Auto-capitalizes a title string using title case rules
 * @param text - The text to capitalize
 * @returns The capitalized text
 */
export const autoCapitalizeTitle = (text: string): string => {
  if (!text) return text;
  
  // Split into words
  const words = text.trim().split(/\s+/);
  
  // Words that should remain lowercase (unless they're the first or last word)
  const lowercaseWords = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'is', 'it', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'
  ]);
  
  return words.map((word, index) => {
    // Always capitalize first and last word
    if (index === 0 || index === words.length - 1) {
      return capitalizeWord(word);
    }
    
    // Check if word should remain lowercase
    const lowerWord = word.toLowerCase();
    if (lowercaseWords.has(lowerWord)) {
      return lowerWord;
    }
    
    // Capitalize other words
    return capitalizeWord(word);
  }).join(' ');
};

/**
 * Capitalizes the first letter of a word and handles special cases
 * @param word - The word to capitalize
 * @returns The capitalized word
 */
const capitalizeWord = (word: string): string => {
  if (!word) return word;
  
  // Handle words with hyphens (e.g., "self-driving")
  if (word.includes('-')) {
    return word.split('-').map(part => capitalizeWord(part)).join('-');
  }
  
  // Handle words with apostrophes (e.g., "don't")
  if (word.includes("'")) {
    return word.split("'").map(part => capitalizeWord(part)).join("'");
  }
  
  // Handle words with periods (e.g., "e.g.", "i.e.")
  if (word.includes('.')) {
    const parts = word.split('.');
    if (parts.length > 1 && parts.every(part => part.length <= 2)) {
      // Likely an abbreviation like "e.g." or "i.e."
      return word.toUpperCase();
    }
  }
  
  // Regular capitalization
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

/**
 * Formats text as a title with smart capitalization
 * @param text - The text to format
 * @returns The formatted title
 */
export const formatAsTitle = (text: string): string => {
  if (!text) return text;
  
  // Remove extra whitespace
  const cleaned = text.trim().replace(/\s+/g, ' ');
  
  // Apply title case
  return autoCapitalizeTitle(cleaned);
}; 