export interface Category {
  id: string;
  label: string;
  icon: string;
  mobileOnly?: boolean;
}

export const categories: Category[] = [
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