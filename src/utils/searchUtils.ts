/**
 * Highlights search terms in text content with partial matching
 * @param text - The text content to highlight
 * @param searchQuery - The search query to highlight
 * @returns HTML string with highlighted search terms
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!text || !searchQuery) {
    return text;
  }

  // Split search query into words and clean them
  const searchWords = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex chars

  if (searchWords.length === 0) {
    return text;
  }

  let highlightedText = text;

  // Highlight each search word
  searchWords.forEach(word => {
    // Create regex that matches the word as a whole word or part of a larger word
    // This will match "implementation" when searching for "implementations"
    // Also handles common word variations (s, ed, ing, etc.)
    const wordVariations = [
      word,                    // exact match
      word.replace(/s$/, ''),  // remove 's' (implementations -> implementation)
      word.replace(/ed$/, ''), // remove 'ed' (implemented -> implement)
      word.replace(/ing$/, ''), // remove 'ing' (implementing -> implement)
      word.replace(/er$/, ''),  // remove 'er' (implementer -> implement)
      word.replace(/est$/, ''), // remove 'est' (implementest -> implement)
    ].filter((variation, index, array) => array.indexOf(variation) === index); // remove duplicates

    // Create regex pattern that matches any of the word variations
    const pattern = `(${wordVariations.join('|')})`;
    const regex = new RegExp(pattern, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  });

  return highlightedText;
}

/**
 * Safely renders HTML content with search highlighting
 * @param text - The text content to highlight
 * @param searchQuery - The search query to highlight
 * @returns Object with __html property for dangerouslySetInnerHTML
 */
export function createHighlightedContent(text: string, searchQuery: string): { __html: string } {
  return {
    __html: highlightSearchTerms(text, searchQuery)
  };
} 