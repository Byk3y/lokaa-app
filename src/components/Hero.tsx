import { useState } from 'react';

const Hero = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        {/* Hero Title */}
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-4">
          Create a space.
          <br />
          Find your place.
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          Bring people together with posts, chats, and monetized spaces — all in one place.
        </p>

        {/* CTA Button */}
        <button
          className="px-8 py-3 text-lg font-medium text-white rounded-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 transition-all shadow-sm"
        >
          Launch your own space
        </button>
      </div>
    </section>
  );
};

export default Hero; 