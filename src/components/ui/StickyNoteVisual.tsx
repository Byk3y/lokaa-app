import React from 'react';

interface StickyNoteVisualProps {
  text?: string;
  className?: string;
}

/**
 * A decorative component that emulates a sticky note with a push pin.
 */
export default function StickyNoteVisual({ 
  text = "Highlight key ideas, and bring your space to life.", 
  className = "" 
}: StickyNoteVisualProps) {
  return (
    // Container with 3D perspective
    <div className={`relative w-[250px] h-[250px] font-sans ${className}`} style={{ perspective: '1000px' }}>

      {/* The Sticky Note Container (Top Layer) */}
      <div
        className="absolute top-0 left-0 w-[220px] h-[220px] drop-shadow-xl"
        style={{
          transform: 'rotateX(4deg) rotateZ(-5deg)',
          transformOrigin: 'top center',
        }}
      >
        <div className="relative w-full h-full bg-[#FFF59D] p-5 shadow-md rounded-sm">
          {/* Paper texture */}
          <div 
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage: 'linear-gradient(90deg, rgba(212, 202, 144, 0.07) 50%, transparent 50%), linear-gradient(rgba(212, 202, 144, 0.05) 50%, transparent 50%)',
              backgroundSize: '2px 2px',
            }}
          />
          {/* Paper curl */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/5 to-transparent"
            style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 80%, 0 95%)' }}
          />

          <p
            className="text-lg text-slate-800/90 leading-relaxed"
            style={{ fontFamily: "'Kalam', cursive", fontWeight: 400 }}
          >
            {text}
          </p>

          {/* Red Push Pin */}
          <div
            className="absolute w-4 h-4 rounded-full bg-red-600 shadow-md"
            style={{
              top: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            <div className="absolute w-1 h-1 bg-white/40 rounded-full top-0.5 left-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
} 