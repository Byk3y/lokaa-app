import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { seoManager } from '@/utils/seoManager';
import { SEOAnalytics } from '@/utils/analytics';
import { log } from '@/utils/logger';

/**
 * Features Page Component
 * SEO-optimized features showcase
 */
export default function FeaturesPage() {
  // 🎯 [Phase 2] SEO Optimization: Update meta tags for features page
  useEffect(() => {
    const initializeFeaturesSEO = async () => {
      try {
        await seoManager.updateSEO('landing'); // Using landing as fallback
        log.debug('Page', '🎯 [SEO] Features page meta tags updated');
        
        // Track SEO page view
        SEOAnalytics.trackPageView('features', window.location.href, [
          'community platform features',
          'monetization tools',
          'community building features',
          'online learning platform features'
        ]);
      } catch (error) {
        log.error('Page', '🎯 [SEO] Failed to update features page meta tags:', error);
      }
    };

    initializeFeaturesSEO();
  }, []);

  const features = [
    {
      title: "Community Building Tools",
      description: "Create and manage thriving communities with powerful engagement tools, member management, and content organization features.",
      icon: "🏗️",
      keywords: ["community building", "member management", "engagement tools"]
    },
    {
      title: "Monetization Features",
      description: "Turn your passion into profit with built-in payment processing, subscription management, and revenue analytics.",
      icon: "💰",
      keywords: ["monetization", "payment processing", "subscription management"]
    },
    {
      title: "Learning Spaces",
      description: "Create courses, lessons, and educational content to share knowledge and build learning communities.",
      icon: "📚",
      keywords: ["online learning", "courses", "educational content"]
    },
    {
      title: "Real-time Collaboration",
      description: "Engage members with live discussions, events, and interactive features that keep your community active.",
      icon: "💬",
      keywords: ["real-time collaboration", "live discussions", "community engagement"]
    },
    {
      title: "Analytics & Insights",
      description: "Track community growth, member engagement, and revenue metrics with comprehensive analytics dashboard.",
      icon: "📊",
      keywords: ["analytics", "community insights", "growth tracking"]
    },
    {
      title: "Custom Branding",
      description: "Personalize your community with custom themes, logos, and branding to match your unique style.",
      icon: "🎨",
      keywords: ["custom branding", "themes", "personalization"]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="text-3xl font-bold text-teal-600">
              Lokaa
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-gray-700 hover:text-teal-600">Home</Link>
              <Link to="/features" className="text-teal-600 font-medium">Features</Link>
              <Link to="/pricing" className="text-gray-700 hover:text-teal-600">Pricing</Link>
              <Link to="/blog" className="text-gray-700 hover:text-teal-600">Blog</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Powerful Features for Community Building & Monetization
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to build, grow, and monetize your community. From engagement tools to payment processing, 
            Lokaa provides all the features you need to turn your passion into a profitable community.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h2>
              <p className="text-gray-600 mb-4">{feature.description}</p>
              <div className="flex flex-wrap gap-2">
                {feature.keywords.map((keyword, idx) => (
                  <span key={idx} className="inline-block bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* SEO Content Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose Lokaa for Community Building?</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Complete Community Platform</h3>
              <p className="text-gray-600 mb-4">
                Lokaa provides everything you need to build and manage a thriving community. From member management 
                to content organization, our platform handles all the technical aspects so you can focus on creating value.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Member management and engagement tools</li>
                <li>• Content creation and organization</li>
                <li>• Real-time communication features</li>
                <li>• Mobile-responsive design</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Monetization Made Easy</h3>
              <p className="text-gray-600 mb-4">
                Turn your community into a revenue stream with our built-in monetization features. Accept payments, 
                manage subscriptions, and track your earnings all in one place.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Payment processing and subscriptions</li>
                <li>• Revenue analytics and reporting</li>
                <li>• Tiered membership options</li>
                <li>• Automated billing and invoicing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-teal-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Community?</h2>
          <p className="text-xl mb-6">
            Start building your community today with all the features you need to succeed. 
            Join thousands of creators who are already monetizing their passion.
          </p>
          <Link 
            to="/"
            className="inline-block bg-white text-teal-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            onClick={() => SEOAnalytics.trackConversion('features_cta_click', undefined, 'community platform features')}
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500">© {new Date().getFullYear()} Lokaa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
