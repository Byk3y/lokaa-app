/**
 * Schema Generator Utility
 * 
 * Generates JSON-LD structured data for SEO optimization
 * Supports multiple schema types for different content types
 */

import { log } from '@/utils/logger';
import type { SpaceContent, PostContent, CourseContent, ProfileContent } from './sitemapTypes';

export interface SchemaData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface OrganizationSchema extends SchemaData {
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  contactPoint?: {
    '@type': 'ContactPoint';
    telephone?: string;
    contactType: string;
    email?: string;
  };
  address?: {
    '@type': 'PostalAddress';
    addressCountry: string;
    addressLocality?: string;
    addressRegion?: string;
  };
}

export interface LocalBusinessSchema extends SchemaData {
  '@type': 'LocalBusiness';
  name: string;
  description: string;
  url: string;
  telephone?: string;
  email?: string;
  address: {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
  openingHoursSpecification?: {
    '@type': 'OpeningHoursSpecification';
    dayOfWeek: string[];
    opens: string;
    closes: string;
  }[];
  priceRange?: string;
  paymentAccepted?: string[];
  currenciesAccepted?: string[];
  areaServed?: {
    '@type': 'GeoCircle' | 'Country' | 'State' | 'City';
    name: string;
  }[];
  serviceArea?: {
    '@type': 'GeoCircle' | 'Country' | 'State' | 'City';
    name: string;
  };
  hasOfferCatalog?: {
    '@type': 'OfferCatalog';
    name: string;
    itemListElement: {
      '@type': 'Offer';
      itemOffered: {
        '@type': 'Service';
        name: string;
        description: string;
      };
    }[];
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  review?: {
    '@type': 'Review';
    author: {
      '@type': 'Person';
      name: string;
    };
    reviewRating: {
      '@type': 'Rating';
      ratingValue: number;
      bestRating?: number;
      worstRating?: number;
    };
    reviewBody?: string;
    datePublished?: string;
  }[];
}

export interface WebSiteSchema extends SchemaData {
  '@type': 'WebSite';
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: {
      '@type': 'EntryPoint';
      urlTemplate: string;
    };
    'query-input': string;
  };
}

export interface CourseSchema extends SchemaData {
  '@type': 'Course';
  name: string;
  description?: string;
  provider: {
    '@type': 'Organization';
    name: string;
    url: string;
  };
  courseCode?: string;
  educationalLevel?: string;
  teaches?: string;
  inLanguage?: string;
  isAccessibleForFree?: boolean;
  offers?: {
    '@type': 'Offer';
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
  image?: string;
  dateCreated?: string;
  dateModified?: string;
}

export interface ArticleSchema extends SchemaData {
  '@type': 'Article';
  headline: string;
  description?: string;
  image?: string | string[];
  author: {
    '@type': 'Person';
    name: string;
    url?: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
  mainEntityOfPage?: {
    '@type': 'WebPage';
    '@id': string;
  };
  articleSection?: string;
  wordCount?: number;
}

export interface PersonSchema extends SchemaData {
  '@type': 'Person';
  name: string;
  url?: string;
  image?: string;
  description?: string;
  jobTitle?: string;
  worksFor?: {
    '@type': 'Organization';
    name: string;
  };
  sameAs?: string[];
  knowsAbout?: string[];
}

export interface EventSchema extends SchemaData {
  '@type': 'Event';
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: {
    '@type': 'Place';
    name: string;
    address?: {
      '@type': 'PostalAddress';
      addressLocality: string;
      addressRegion?: string;
      addressCountry: string;
    };
  };
  organizer?: {
    '@type': 'Organization';
    name: string;
    url?: string;
  };
  eventStatus?: string;
  eventAttendanceMode?: string;
}

export interface BreadcrumbListSchema extends SchemaData {
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

export interface FAQPageSchema extends SchemaData {
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

/**
 * Schema Generator Class
 */
export class SchemaGenerator {
  private baseUrl: string;
  private organizationName: string;

  constructor(baseUrl = 'https://lokaa.app', organizationName = 'Lokaa') {
    this.baseUrl = baseUrl;
    this.organizationName = organizationName;
  }

  /**
   * Generate Organization schema
   */
  generateOrganizationSchema(): OrganizationSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.organizationName,
      url: this.baseUrl,
      logo: `${this.baseUrl}/lokaa-logo.svg`,
      description: 'Transform Your Passion Into a Profitable Community - Build and join thriving communities on Lokaa',
      sameAs: [
        'https://twitter.com/lokaa_app',
        'https://linkedin.com/company/lokaa',
        'https://github.com/lokaa'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        email: 'support@lokaa.app'
      },
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'US'
      }
    };
  }

  /**
   * Generate WebSite schema with search action
   */
  generateWebSiteSchema(): WebSiteSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.organizationName,
      url: this.baseUrl,
      description: 'Discover and build thriving communities on Lokaa - the platform where passion meets profit',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  /**
   * Generate Course schema
   */
  generateCourseSchema(course: CourseContent, space: SpaceContent): CourseSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: course.description || `Learn ${course.title} in the ${space.name} community`,
      provider: {
        '@type': 'Organization',
        name: space.name,
        url: `${this.baseUrl}/${space.subdomain}`
      },
      courseCode: course.slug,
      educationalLevel: 'Beginner to Advanced',
      teaches: course.title,
      inLanguage: 'en',
      isAccessibleForFree: true,
      image: course.cover_image || space.cover_image,
      dateCreated: course.created_at,
      dateModified: course.updated_at
    };
  }

  /**
   * Generate Article schema for posts
   */
  generateArticleSchema(post: PostContent, space: SpaceContent, author: ProfileContent): ArticleSchema {
    const wordCount = post.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title || post.content.substring(0, 100),
      description: post.content.replace(/<[^>]*>/g, '').substring(0, 160),
      image: this.extractPostImages(post),
      author: {
        '@type': 'Person',
        name: author.full_name || 'Community Member',
        url: author.profile_url ? `${this.baseUrl}/@${author.profile_url}` : undefined
      },
      publisher: {
        '@type': 'Organization',
        name: space.name,
        logo: {
          '@type': 'ImageObject',
          url: space.cover_image || `${this.baseUrl}/lokaa-logo.svg`
        }
      },
      datePublished: post.created_at,
      dateModified: post.updated_at,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${this.baseUrl}/${space.subdomain}/space/${post.slug}`
      },
      articleSection: 'Community Content',
      wordCount
    };
  }

  /**
   * Generate Person schema for user profiles
   */
  generatePersonSchema(profile: ProfileContent): PersonSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.full_name || 'Community Member',
      url: profile.profile_url ? `${this.baseUrl}/@${profile.profile_url}` : undefined,
      image: profile.avatar_url,
      description: profile.bio,
      jobTitle: 'Community Member',
      worksFor: {
        '@type': 'Organization',
        name: this.organizationName
      },
      sameAs: []
    };
  }

  /**
   * Generate Event schema
   */
  generateEventSchema(event: {
    name: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: string;
    space: SpaceContent;
  }): EventSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location ? {
        '@type': 'Place',
        name: event.location
      } : undefined,
      organizer: {
        '@type': 'Organization',
        name: event.space.name,
        url: `${this.baseUrl}/${event.space.subdomain}`
      },
      eventStatus: 'EventScheduled',
      eventAttendanceMode: 'OnlineEventAttendanceMode'
    };
  }

  /**
   * Generate BreadcrumbList schema
   */
  generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): BreadcrumbListSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };
  }

  /**
   * Generate FAQPage schema
   */
  generateFAQPageSchema(faqs: Array<{ question: string; answer: string }>): FAQPageSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  }

  /**
   * Generate space-specific schema
   */
  generateSpaceSchema(space: SpaceContent): SchemaData {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: space.name,
      description: space.description || `Join the ${space.name} community on Lokaa`,
      url: `${this.baseUrl}/${space.subdomain}`,
      logo: space.cover_image,
      memberOf: {
        '@type': 'Organization',
        name: this.organizationName,
        url: this.baseUrl
      },
      numberOfEmployees: space.member_count || 0
    };
  }

  /**
   * Generate multiple schemas for a page
   */
  generatePageSchemas(pageType: 'landing' | 'space' | 'post' | 'course' | 'profile', data: any): SchemaData[] {
    const schemas: SchemaData[] = [];

    // Always include organization and website schemas
    schemas.push(this.generateOrganizationSchema());
    schemas.push(this.generateWebSiteSchema());

    switch (pageType) {
      case 'landing':
        // Add FAQ schema for landing page with SEO-optimized questions
        schemas.push(this.generateFAQPageSchema([
          {
            question: 'How do I turn my passion into revenue on Lokaa?',
            answer: 'Lokaa provides built-in monetization tools that allow you to create paid communities, offer premium content, and generate sustainable revenue from your expertise. You can set subscription fees, create exclusive content, and build income-generating communities around your passion.'
          },
          {
            question: 'What are the best ways to monetize my expertise?',
            answer: 'Our platform offers multiple monetization strategies including community subscriptions, premium courses, exclusive content access, and member-only features. You can also create tiered membership levels to maximize revenue from your community.'
          },
          {
            question: 'How much can I earn from my community?',
            answer: 'Earnings vary based on community size, engagement, and pricing strategy. Many creators generate significant monthly revenue by building engaged communities around their expertise. Our platform provides analytics to help you optimize your monetization strategy.'
          },
          {
            question: 'What tools help me build income-generating communities?',
            answer: 'Lokaa offers comprehensive community building tools including content management, member engagement features, payment processing, analytics dashboard, and automated marketing tools to help you grow and monetize your community effectively.'
          },
          {
            question: 'How do I find communities that share my passion?',
            answer: 'Use our discovery features to search for communities by category, interest, or keyword. Browse through technology, music, business, health, and other categories to find like-minded people and learning communities that match your interests.'
          }
        ]));
        break;

      case 'space':
        if (data.space) {
          schemas.push(this.generateSpaceSchema(data.space));
        }
        break;

      case 'post':
        if (data.post && data.space && data.author) {
          schemas.push(this.generateArticleSchema(data.post, data.space, data.author));
        }
        break;

      case 'course':
        if (data.course && data.space) {
          schemas.push(this.generateCourseSchema(data.course, data.space));
        }
        break;

      case 'profile':
        if (data.profile) {
          schemas.push(this.generatePersonSchema(data.profile));
        }
        break;
    }

    return schemas;
  }

  /**
   * Extract images from post content
   */
  private extractPostImages(post: PostContent): string[] {
    if (!post.media_urls || !Array.isArray(post.media_urls)) {
      return [];
    }

    return post.media_urls
      .filter(media => media.type === 'file' && media.fileType?.startsWith('image/'))
      .map(media => media.url);
  }

  /**
   * Validate schema data
   */
  /**
   * Generate LocalBusiness schema for local SEO
   */
  generateLocalBusinessSchema(businessData: {
    name: string;
    description: string;
    url: string;
    telephone?: string;
    email?: string;
    address: {
      streetAddress?: string;
      addressLocality: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry: string;
    };
    geo?: {
      latitude: number;
      longitude: number;
    };
    openingHours?: Array<{
      dayOfWeek: string[];
      opens: string;
      closes: string;
    }>;
    priceRange?: string;
    areaServed?: string[];
    services?: Array<{
      name: string;
      description: string;
    }>;
    aggregateRating?: {
      ratingValue: number;
      reviewCount: number;
      bestRating?: number;
      worstRating?: number;
    };
  }): LocalBusinessSchema {
    const schema: LocalBusinessSchema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: businessData.name,
      description: businessData.description,
      url: businessData.url,
      address: {
        '@type': 'PostalAddress',
        addressCountry: businessData.address.addressCountry,
        addressLocality: businessData.address.addressLocality,
        ...(businessData.address.streetAddress && { streetAddress: businessData.address.streetAddress }),
        ...(businessData.address.addressRegion && { addressRegion: businessData.address.addressRegion }),
        ...(businessData.address.postalCode && { postalCode: businessData.address.postalCode }),
      },
    };

    // Add optional fields
    if (businessData.telephone) {
      schema.telephone = businessData.telephone;
    }
    if (businessData.email) {
      schema.email = businessData.email;
    }
    if (businessData.geo) {
      schema.geo = {
        '@type': 'GeoCoordinates',
        latitude: businessData.geo.latitude,
        longitude: businessData.geo.longitude,
      };
    }
    if (businessData.openingHours) {
      schema.openingHoursSpecification = businessData.openingHours.map(hours => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: hours.dayOfWeek,
        opens: hours.opens,
        closes: hours.closes,
      }));
    }
    if (businessData.priceRange) {
      schema.priceRange = businessData.priceRange;
    }
    if (businessData.areaServed) {
      schema.areaServed = businessData.areaServed.map(area => ({
        '@type': 'Country',
        name: area,
      }));
    }
    if (businessData.services) {
      schema.hasOfferCatalog = {
        '@type': 'OfferCatalog',
        name: 'Services',
        itemListElement: businessData.services.map(service => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: service.name,
            description: service.description,
          },
        })),
      };
    }
    if (businessData.aggregateRating) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: businessData.aggregateRating.ratingValue,
        reviewCount: businessData.aggregateRating.reviewCount,
        bestRating: businessData.aggregateRating.bestRating || 5,
        worstRating: businessData.aggregateRating.worstRating || 1,
      };
    }

    return schema;
  }

  /**
   * Generate location-specific schema for different cities
   */
  generateLocationSpecificSchema(city: string, baseBusinessData: any): LocalBusinessSchema {
    return this.generateLocalBusinessSchema({
      ...baseBusinessData,
      name: `Lokaa - ${city} Community Platform`,
      description: `Connect with ${city} communities and turn your passion into profit. Join local ${city} communities on Lokaa.`,
      address: {
        ...baseBusinessData.address,
        addressLocality: city,
      },
      areaServed: [city, baseBusinessData.address.addressCountry],
    });
  }

  validateSchema(schema: SchemaData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema['@context']) {
      errors.push('Missing @context property');
    }

    if (!schema['@type']) {
      errors.push('Missing @type property');
    }

    if (schema['@context'] !== 'https://schema.org') {
      errors.push('Invalid @context - must be https://schema.org');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const schemaGenerator = new SchemaGenerator();
