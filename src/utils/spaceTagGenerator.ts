interface SpaceForTagging {
  name: string;
  description: string | null;
}

interface TagRule {
  keywords: string[];
  tags: string[];
}

// Improved tag generation with better rule structure and keyword matching
const TAG_RULES: TagRule[] = [
  {
    keywords: ['calligraphy', 'art', 'design', 'creative', 'painting', 'drawing'],
    tags: ['hobbies', 'self-improvement']
  },
  {
    keywords: ['pickleball', 'sport', 'fitness', 'workout', 'exercise', 'athletic', 'training'],
    tags: ['sports', 'health']
  },
  {
    keywords: ['founder', 'business', 'financial', 'crypto', 'investing', 'entrepreneur', 'startup', 'finance'],
    tags: ['money', 'personal-dev']
  },
  {
    keywords: ['marketing', 'tech', 'coding', 'programming', 'development', 'software', 'web', 'app'],
    tags: ['tech', 'money']
  },
  {
    keywords: ['hormone', 'health', 'wellness', 'nutrition', 'diet', 'medical', 'healing'],
    tags: ['health', 'self-improvement']
  },
  {
    keywords: ['photo', 'photography', 'camera', 'visual', 'instagram'],
    tags: ['hobbies', 'tech']
  },
  {
    keywords: ['automation', 'ai', 'machine learning', 'productivity'],
    tags: ['tech', 'self-improvement']
  },
  {
    keywords: ['music', 'instrument', 'singing', 'audio', 'sound', 'band'],
    tags: ['music', 'hobbies']
  },
  {
    keywords: ['relationship', 'dating', 'love', 'marriage', 'romance'],
    tags: ['relationships', 'self-improvement']
  },
  {
    keywords: ['spiritual', 'meditation', 'mindfulness', 'prayer', 'faith', 'religion'],
    tags: ['spirituality', 'self-improvement']
  },
  {
    keywords: ['travel', 'adventure', 'explore', 'world', 'culture'],
    tags: ['global', 'personal-dev']
  },
  {
    keywords: ['education', 'learning', 'study', 'knowledge', 'skill'],
    tags: ['personal-dev', 'self-improvement']
  }
];

/**
 * Generates tags for a space based on its name and description
 * @param space Space object with name and description
 * @returns Array of relevant category tags
 */
export function generateTags(space: SpaceForTagging): string[] {
  if (!space || !space.name) return ['personal-dev', 'self-improvement'];

  const tags = new Set<string>();
  const text = `${space.name.toLowerCase()} ${(space.description || '').toLowerCase()}`;

  // Apply tag rules based on keyword matches
  for (const rule of TAG_RULES) {
    const hasMatch = rule.keywords.some(keyword => text.includes(keyword));
    if (hasMatch) {
      rule.tags.forEach(tag => tags.add(tag));
      break; // Use first matching rule to avoid tag overlap
    }
  }

  // Always add default tags if no specific categories were found
  if (tags.size === 0) {
    tags.add('personal-dev');
    tags.add('self-improvement');
  }

  return Array.from(tags);
}

/**
 * Checks if a space matches a specific category
 * @param space Space object with name and description  
 * @param categoryId Category ID to check against
 * @returns Boolean indicating if space belongs to category
 */
export function spaceMatchesCategory(space: SpaceForTagging, categoryId: string): boolean {
  if (categoryId === 'all') return true;
  
  const spaceTags = generateTags(space);
  return spaceTags.includes(categoryId);
}
