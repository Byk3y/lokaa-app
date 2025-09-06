/**
 * Location Landing Page Component
 * 
 * Renders location-specific landing pages for local SEO
 * Phase 4.1: Local SEO Implementation
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { seoManager } from '@/utils/seoManager';
import { locationContentGenerator, type LocationContent } from '@/utils/locationContentGenerator';
import { log } from '@/utils/logger';

interface LocationLandingPageProps {
  city?: string;
  industry?: string;
}

const LocationLandingPage: React.FC<LocationLandingPageProps> = ({ 
  city: propCity, 
  industry 
}) => {
  const { city: paramCity } = useParams<{ city: string }>();
  const city = propCity || paramCity;

  useEffect(() => {
    if (!city) {
      log.warn('LocationLandingPage', 'No city provided for location landing page');
      return;
    }

    try {
      // Generate location content
      const locationContent = locationContentGenerator.generateLocationContent(city, industry);
      
      // Apply local SEO
      seoManager.applyLocalSEO(city, {
        updateTitle: true,
        updateDescription: true,
        addLocalSchema: true,
        addLocalKeywords: true,
      });

      // Add local FAQ schema
      seoManager.addLocalFAQSchema(city);

      log.debug('LocationLandingPage', `Location landing page loaded for ${city}`);
    } catch (error) {
      log.error('LocationLandingPage', `Failed to load location landing page for ${city}:`, error);
    }
  }, [city, industry]);

  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">City Not Found</h1>
          <p className="text-gray-600">Please select a valid city to view communities.</p>
        </div>
      </div>
    );
  }

  const locationContent = locationContentGenerator.generateLocationContent(city, industry);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Join {city} Communities
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Connect with local professionals, share knowledge, and turn your passion into profit
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Explore Communities
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Create Community
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {locationContent.stats.memberCount.toLocaleString()}+
              </div>
              <div className="text-gray-600">Active Members</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {locationContent.stats.communityCount}+
              </div>
              <div className="text-gray-600">Communities</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {locationContent.stats.successStories}+
              </div>
              <div className="text-gray-600">Success Stories</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {locationContent.stats.averageRating.toFixed(1)}★
              </div>
              <div className="text-gray-600">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {locationContent.headings.map((heading, index) => (
            <div key={index} className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{heading}</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                {locationContent.content[index]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            What {city} Professionals Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {locationContent.testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">"{testimonial.quote}"</p>
                <div className="font-semibold text-gray-900">{testimonial.name}</div>
                <div className="text-sm text-gray-500">
                  {testimonial.role}
                  {testimonial.company && ` at ${testimonial.company}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto">
            {locationContent.faq.map((faq, index) => (
              <div key={index} className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Join {city} Communities?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Start connecting with like-minded professionals in {city} today
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Get Started Now
          </button>
        </div>
      </section>
    </div>
  );
};

export default LocationLandingPage;
