import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Space } from '@/types/space';
import { cn } from '@/utils/cn';

interface SpacesListProps {
  spaces: Space[];
  className?: string;
}

export function SpacesList({ spaces, className }: SpacesListProps) {
  if (!spaces || spaces.length === 0) {
    return (
      <div className={cn("text-center p-4", className)}>
        <p className="text-gray-500">No spaces found</p>
        <Link to="/create-space" className="text-blue-600 hover:underline mt-2 inline-block">
          Create your first space
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", className)}>
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  );
}

interface SpaceCardProps {
  space: Space;
}

function SpaceCard({ space }: SpaceCardProps) {
  return (
    <Link
      to={`/s/${space.subdomain || space.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
          {space.cover_image ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${space.cover_image || "/default-space-cover.jpg"})` }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                {space.name.substring(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{space.name}</h3>
          {space.description && (
            <p className="text-sm text-gray-500 truncate">{space.description}</p>
          )}
          
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{space.members || space.member_count || 0} members</span>
            <span>{space.posts || space.post_count || 0} posts</span>
          </div>
        </div>
      </div>
    </Link>
  );
} 