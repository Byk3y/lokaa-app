interface Category {
  id: string;
  label: string;
  icon: string;
  mobileOnly?: boolean;
}

// Shared categories constant that can be reused across the app
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

interface CategoriesFilterProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

export default function CategoriesFilter({
  activeCategory,
  setActiveCategory
}: CategoriesFilterProps) {
  return (
    <section className="bg-white border-b border-gray-200 sticky top-16 z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 relative">
        {/* Left fade indicator for scroll */}
        <div className="absolute left-4 md:left-6 lg:left-10 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none hidden md:block"></div>
        
        {/* Right fade indicator for scroll */}
        <div className="absolute right-4 md:right-6 lg:right-10 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
        
        {/* Scrollable categories with reduced padding */}
        <div className="overflow-x-auto hide-scrollbar py-2">
          <div className="flex items-center space-x-2 min-w-max">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  activeCategory === category.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{category.icon}</span> {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 