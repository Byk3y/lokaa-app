interface Category {
  id: string;
  label: string;
  icon: string;
}

interface CategoryFiltersProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function CategoryFilters({ 
  categories, 
  activeCategory, 
  onCategoryChange 
}: CategoryFiltersProps) {
  return (
    <section className="bg-white border-b border-gray-200 sticky top-16 z-10">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 relative">
        {/* Left gradient overlay */}
        <div className="absolute left-6 md:left-10 lg:left-16 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none hidden md:block"></div>
        
        {/* Right gradient overlay */}
        <div className="absolute right-6 md:right-10 lg:right-16 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
        
        <div className="overflow-x-auto hide-scrollbar py-1 sm:py-3">
          <div className="flex items-center space-x-3 min-w-max">
            {/* All categories button */}
            <button
              onClick={() => onCategoryChange('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center transition-all ${
                activeCategory === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">🌟</span> All
            </button>
            
            {/* Individual category buttons */}
            {categories.filter(cat => cat.id !== 'all').map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center transition-all whitespace-nowrap ${
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
