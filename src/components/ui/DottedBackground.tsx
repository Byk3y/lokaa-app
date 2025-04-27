import React, { ReactNode } from 'react';

interface DottedBackgroundProps {
  children: ReactNode;
  className?: string;
}

const DottedBackground: React.FC<DottedBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative rounded-2xl shadow-lg overflow-hidden ${className}`} style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}>
      {/* Main dotted background */}
      <div className="relative border border-gray-200 bg-gray-50 rounded-2xl overflow-hidden">
        {/* Dotted texture pattern overlay */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(#d1d1d1 0.8px, transparent 0.8px)', 
            backgroundSize: '14px 14px',
            opacity: 0.4
          }}
        />
        
        {/* Content */}
        <div className="relative bg-transparent z-0">
          {children}
        </div>
        
        {/* Peeled corner effect at top left */}
        <div 
          className="absolute -top-0.5 -left-0.5 w-16 h-16 origin-top-left transform -rotate-6"
          style={{
            background: 'linear-gradient(135deg, #fff 0%, #f9fafb 100%)',
            boxShadow: '2px 1px 3px rgba(0, 0, 0, 0.1)',
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            zIndex: 3
          }}
        >
          {/* Subtle paper texture for the peeled corner */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Subtle shadow line at the fold */}
          <div 
            className="absolute"
            style={{
              background: 'linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.08) 100%)',
              width: '150%',
              height: '1px',
              top: '60%',
              left: '-25%',
              transform: 'rotate(45deg)',
              transformOrigin: 'bottom right'
            }}
          />
        </div>
        
        {/* Shadow for the peeled corner */}
        <div 
          className="absolute top-0 left-0 w-16 h-16"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.06) 0%, transparent 70%)',
            clipPath: 'polygon(0 0, 14px 0, 0 14px)',
            zIndex: 2,
            transform: 'translate(-1px, -1px)'
          }}
        />
        
        {/* Subtle edge shadow effect */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: 'inset 0 0 5px rgba(0,0,0,0.03)' }} />
      </div>
    </div>
  );
};

export default DottedBackground; 