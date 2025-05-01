import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import useSpacesData from '@/hooks/useSpacesData';
import SpaceCardGrid from '@/components/spaces/SpaceCardGrid';

const categories = [
  { id: 'all', label: 'All', icon: '•' },
  { id: 'hobbies', label: 'Hobbies', icon: '🎨' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'money', label: 'Money', icon: '💰' },
  { id: 'spirituality', label: 'Spirituality', icon: '🙏' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'health', label: 'Health', icon: '🏥' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'self-improvement', label: 'Self-improvement', icon: '📚' },
  { id: 'relationships', label: 'Relationships', icon: '❤️' },
  { id: 'global', label: 'Global', icon: '🌍' },
];

const Discovery = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  // Use the spaces data hook to get spaces
  const { 
    filteredSpaces, 
    loading: isLoading, 
    searchQuery, 
    setSearchQuery,
    setActiveCategory: setActiveSpacesCategory 
  } = useSpacesData(activeCategory);

  // Update category in both local state and hook
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setActiveSpacesCategory(category);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Create Space Button */}
        <div className="text-center mb-8">
          <Link to="/create-space">
            <button className="px-6 py-2.5 text-sm font-medium text-white rounded-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 transition-all shadow-sm">
              Create a Space
            </button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for anything"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-12 py-3 text-base rounded-full border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                ${category.id === activeCategory 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => handleCategoryChange(category.id)}
            >
              <span className="mr-1">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* Spaces Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-6 text-gray-800 text-center">Discover Spaces</h3>
          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-gray-300 rounded-full border-t-teal-600"></div>
            </div>
          ) : filteredSpaces.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-5 max-w-md mx-auto">
                No spaces found matching your criteria. Try a different search or category.
          </p>
          <Link 
            to="/discover" 
            className="px-5 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors inline-block"
          >
                Explore More on Discover
          </Link>
            </div>
          ) : (
            <SpaceCardGrid spaces={filteredSpaces} isLoading={isLoading} />
          )}
        </div>
      </div>
    </section>
  );
};

export default Discovery; 