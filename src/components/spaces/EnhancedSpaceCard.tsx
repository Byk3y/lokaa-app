import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Space } from '../../types/space';

interface EnhancedSpaceCardProps {
  space: Space;
  onClick?: () => void;
  linkType?: 'about' | 'space';
  showDescription?: boolean;
}

const EnhancedSpaceCard: React.FC<EnhancedSpaceCardProps> = ({
  space,
  onClick,
  linkType = 'about',
  showDescription = false,
}) => {
  const { 
    name, 
    subdomain, 
    description, 
    cover_image, 
    icon_image, 
    primary_color = '#00BFFF',
    initials
  } = space;

  // Generate space link based on type
  const spaceLink = useMemo(() => {
    if (onClick) {
      return null; // No link if onClick provided
    }

    if (linkType === 'about') {
      return `/s/${subdomain}/about`;
    } else if (linkType === 'space') {
      return `/s/${subdomain}`;
    }
    
    return `/s/${subdomain}/about`; // Default
  }, [subdomain, linkType, onClick]);

  // Generate initials if icon not available
  const displayInitials = useMemo(() => {
    if (initials) return initials;
    
    // Generate from name if not provided
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [name, initials]);

  const cardContent = (
    <div className="space-card">
      {/* Cover image */}
      <div 
        className="space-card-cover" 
        style={{ 
          backgroundImage: cover_image ? `url(${cover_image})` : 'none',
          backgroundColor: !cover_image ? primary_color : undefined
        }}
      >
        {/* Icon or initials */}
        <div className="space-card-icon">
          {icon_image ? (
            <img src={icon_image} alt={`${name} icon`} />
          ) : (
            <div 
              className="space-card-initials"
              style={{ backgroundColor: primary_color }}
            >
              {displayInitials}
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="space-card-content">
        <h3 className="space-card-name">{name}</h3>
        
        {showDescription && description && (
          <p className="space-card-description">{description}</p>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <div className="space-card-container" onClick={onClick}>
        {cardContent}
      </div>
    );
  }

  if (spaceLink) {
    return (
      <Link to={spaceLink} className="space-card-container">
        {cardContent}
      </Link>
    );
  }

  return <div className="space-card-container">{cardContent}</div>;
};

export default EnhancedSpaceCard; 