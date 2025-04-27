import React from 'react';
import { Link } from 'react-router-dom';
import { Space } from '../../types/space';
import { Users } from 'lucide-react';

interface SpacesListProps {
  spaces: Space[];
  loading: boolean;
}

export default function SpacesList({ spaces, loading }: SpacesListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(3).fill(null).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
            <div className="h-8 bg-gray-200 rounded mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">You haven't joined any spaces yet</h2>
        <p className="text-gray-600 mb-6">Join existing spaces or create your own</p>
        <div className="flex justify-center gap-4">
          <Link 
            to="/create-space" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Space
          </Link>
          <Link 
            to="/discover?force=discover" 
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Discover Spaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {spaces.map((space) => (
        <Link 
          key={space.id} 
          to={`/space/${space.subdomain || space.id}`}
          className="block group"
        >
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-500 relative">
              {space.cover_image ? (
                <img 
                  src={space.cover_image} 
                  alt={space.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "/default-space-cover.jpg";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                  {space.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                {space.name}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{space.description}</p>
              <div className="flex items-center mt-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Users size={16} className="mr-1" />
                  <span>{space.members || space.member_count || 0} members</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 