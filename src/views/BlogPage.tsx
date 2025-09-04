import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { seoManager } from '@/utils/seoManager';
import { SEOAnalytics } from '@/utils/analytics';
import { log } from '@/utils/logger';

/**
 * Blog Page Component
 * Content marketing hub for SEO-optimized blog posts
 */
export default function BlogPage() {
  // 🎯 [Phase 2] SEO Optimization: Update meta tags for blog page
  useEffect(() => {
    const initializeBlogSEO = async () => {
      try {
        await seoManager.updateSEO('landing'); // Using landing as fallback
        log.debug('Page', '🎯 [SEO] Blog page meta tags updated');
        
        // Track SEO page view
        SEOAnalytics.trackPageView('blog', window.location.href, [
          'community building blog',
          'monetize your passion blog',
          'online learning communities blog',
          'passion communities blog'
        ]);
      } catch (error) {
        log.error('Page', '🎯 [SEO] Failed to update blog page meta tags:', error);
      }
    };

    initializeBlogSEO();
  }, []);

  // Sample blog posts for SEO content
  const blogPosts = [
    {
      id: 1,
      title: "How to Turn Your Passion Into a Profitable Community",
      excerpt: "Learn the step-by-step process of building and monetizing your passion community on Lokaa. Discover proven strategies for community growth and revenue generation.",
      slug: "turn-passion-into-profitable-community",
      date: "2024-01-15",
      category: "Community Building"
    },
    {
      id: 2,
      title: "10 Ways to Monetize Your Expertise Online",
      excerpt: "Explore different monetization strategies for your knowledge and skills. From community subscriptions to premium courses, find the right approach for you.",
      slug: "monetize-expertise-online",
      date: "2024-01-10",
      category: "Monetization"
    },
    {
      id: 3,
      title: "Building Learning Communities That Thrive",
      excerpt: "Discover the key principles of creating engaged learning communities. Learn how to foster knowledge sharing and collaborative learning.",
      slug: "building-learning-communities",
      date: "2024-01-05",
      category: "Learning Communities"
    },
    {
      id: 4,
      title: "The Complete Guide to Community Platform Features",
      excerpt: "Understand all the tools and features available on Lokaa for building and managing your community. Maximize your community's potential.",
      slug: "community-platform-features",
      date: "2024-01-01",
      category: "Platform Features"
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
              <Link to="/features" className="text-gray-700 hover:text-teal-600">Features</Link>
              <Link to="/pricing" className="text-gray-700 hover:text-teal-600">Pricing</Link>
              <Link to="/blog" className="text-teal-600 font-medium">Blog</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Community Building & Monetization Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Learn how to build thriving communities, monetize your expertise, and turn your passion into profit. 
            Get insights, strategies, and tips from successful community creators.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {blogPosts.map((post) => (
            <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center mb-3">
                  <span className="inline-block bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                  <span className="ml-3 text-sm text-gray-500">{post.date}</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  <Link 
                    to={`/blog/${post.slug}`}
                    className="hover:text-teal-600 transition-colors"
                    onClick={() => SEOAnalytics.trackClickThrough('blog_list', `/blog/${post.slug}`, post.title)}
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <Link 
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium"
                  onClick={() => SEOAnalytics.trackClickThrough('blog_list', `/blog/${post.slug}`, post.title)}
                >
                  Read more →
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-teal-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Community?</h2>
          <p className="text-xl mb-6">
            Start your journey to building a profitable community today. Join thousands of creators who are already monetizing their passion.
          </p>
          <Link 
            to="/"
            className="inline-block bg-white text-teal-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            onClick={() => SEOAnalytics.trackConversion('blog_cta_click', undefined, 'community building')}
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
