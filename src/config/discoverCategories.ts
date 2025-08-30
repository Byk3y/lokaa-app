export interface DiscoverCategory {
  id: string;
  label: string;
  icon: string;
}

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  { id: 'all', label: 'All', icon: '🌟' },
  { id: 'hobbies', label: 'Hobbies', icon: '🎯' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'money', label: 'Money', icon: '💰' },
  { id: 'spirituality', label: 'Spirituality', icon: '🙏' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'health', label: 'Health', icon: '🏋️' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'self-improvement', label: 'Self-improvement', icon: '📚' },
  { id: 'relationships', label: 'Relationships', icon: '❤️' },
  { id: 'global', label: 'Global', icon: '🌍' },
  { id: 'personal-dev', label: 'Personal development', icon: '📈' },
];

export const getCategoryById = (id: string): DiscoverCategory | undefined => {
  return DISCOVER_CATEGORIES.find(category => category.id === id);
};

export const getCategoryLabel = (id: string): string => {
  const category = getCategoryById(id);
  return category?.label || id;
};
