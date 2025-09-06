/**
 * Local SEO Utility
 * 
 * Manages local business schema generation and location-based SEO optimization
 * Phase 4.1: Local SEO Implementation
 */

import { log } from '@/utils/logger';
import { schemaGenerator, type LocalBusinessSchema } from './schemaGenerator';

export interface LocalBusinessData {
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
}

export interface LocationData {
  city: string;
  state?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  population?: number;
  timezone?: string;
}

class LocalSEO {
  private baseBusinessData: LocalBusinessData;
  private supportedLocations: LocationData[];

  constructor() {
    this.baseBusinessData = {
      name: 'Lokaa',
      description: 'Transform your passion into a profitable community. Connect with like-minded individuals, share knowledge, and build meaningful communities that generate revenue.',
      url: 'https://lokaa.app',
      address: {
        addressLocality: 'San Francisco', // Default location
        addressRegion: 'CA',
        addressCountry: 'US',
      },
      openingHours: [
        {
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '18:00',
        },
        {
          dayOfWeek: ['Saturday'],
          opens: '10:00',
          closes: '16:00',
        },
      ],
      priceRange: '$$',
      areaServed: ['United States', 'Canada', 'United Kingdom', 'Australia'],
      services: [
        {
          name: 'Community Building Platform',
          description: 'Create and manage online communities around your passion or expertise',
        },
        {
          name: 'Knowledge Sharing Tools',
          description: 'Share knowledge through courses, posts, and interactive content',
        },
        {
          name: 'Monetization Features',
          description: 'Turn your community into a revenue-generating platform',
        },
        {
          name: 'Member Management',
          description: 'Manage community members, permissions, and engagement',
        },
      ],
    };

    this.supportedLocations = [
      { city: 'San Francisco', state: 'CA', country: 'US', coordinates: { latitude: 37.7749, longitude: -122.4194 } },
      { city: 'New York', state: 'NY', country: 'US', coordinates: { latitude: 40.7128, longitude: -74.0060 } },
      { city: 'Los Angeles', state: 'CA', country: 'US', coordinates: { latitude: 34.0522, longitude: -118.2437 } },
      { city: 'Chicago', state: 'IL', country: 'US', coordinates: { latitude: 41.8781, longitude: -87.6298 } },
      { city: 'Boston', state: 'MA', country: 'US', coordinates: { latitude: 42.3601, longitude: -71.0589 } },
      { city: 'Seattle', state: 'WA', country: 'US', coordinates: { latitude: 47.6062, longitude: -122.3321 } },
      { city: 'Austin', state: 'TX', country: 'US', coordinates: { latitude: 30.2672, longitude: -97.7431 } },
      { city: 'Denver', state: 'CO', country: 'US', coordinates: { latitude: 39.7392, longitude: -104.9903 } },
      { city: 'Miami', state: 'FL', country: 'US', coordinates: { latitude: 25.7617, longitude: -80.1918 } },
      { city: 'Toronto', state: 'ON', country: 'CA', coordinates: { latitude: 43.6532, longitude: -79.3832 } },
      { city: 'Vancouver', state: 'BC', country: 'CA', coordinates: { latitude: 49.2827, longitude: -123.1207 } },
      { city: 'London', state: 'England', country: 'GB', coordinates: { latitude: 51.5074, longitude: -0.1278 } },
      { city: 'Sydney', state: 'NSW', country: 'AU', coordinates: { latitude: -33.8688, longitude: 151.2093 } },
      { city: 'Melbourne', state: 'VIC', country: 'AU', coordinates: { latitude: -37.8136, longitude: 144.9631 } },
    ];

    log.debug('LocalSEO', 'Local SEO utility initialized');
  }

  /**
   * Generate local business schema for a specific location
   */
  generateLocalBusinessSchema(location?: string): LocalBusinessSchema {
    if (!location) {
      return schemaGenerator.generateLocalBusinessSchema(this.baseBusinessData);
    }

    const locationData = this.findLocationData(location);
    if (!locationData) {
      log.warn('LocalSEO', `Location not found: ${location}, using default`);
      return schemaGenerator.generateLocalBusinessSchema(this.baseBusinessData);
    }

    const locationSpecificData: LocalBusinessData = {
      ...this.baseBusinessData,
      name: `Lokaa - ${locationData.city} Community Platform`,
      description: `Connect with ${locationData.city} communities and turn your passion into profit. Join local ${locationData.city} communities on Lokaa.`,
      address: {
        ...this.baseBusinessData.address,
        addressLocality: locationData.city,
        addressRegion: locationData.state,
        addressCountry: locationData.country,
      },
      geo: locationData.coordinates ? {
        latitude: locationData.coordinates.latitude,
        longitude: locationData.coordinates.longitude,
      } : undefined,
      areaServed: [locationData.city, locationData.country],
    };

    return schemaGenerator.generateLocalBusinessSchema(locationSpecificData);
  }

  /**
   * Generate multiple location-specific schemas
   */
  generateMultipleLocationSchemas(locations: string[]): LocalBusinessSchema[] {
    return locations.map(location => this.generateLocalBusinessSchema(location));
  }

  /**
   * Get all supported locations
   */
  getSupportedLocations(): LocationData[] {
    return [...this.supportedLocations];
  }

  /**
   * Add a new supported location
   */
  addSupportedLocation(location: LocationData): void {
    this.supportedLocations.push(location);
    log.debug('LocalSEO', `Added new location: ${location.city}, ${location.country}`);
  }

  /**
   * Find location data by city name
   */
  private findLocationData(city: string): LocationData | undefined {
    return this.supportedLocations.find(
      loc => loc.city.toLowerCase() === city.toLowerCase()
    );
  }

  /**
   * Generate local keywords for a specific location
   */
  generateLocalKeywords(city: string, baseKeywords: string[] = []): string[] {
    const localKeywords = [
      `${city} community platform`,
      `${city} online communities`,
      `communities in ${city}`,
      `${city} passion communities`,
      `local ${city} communities`,
      `${city} community building`,
      `${city} knowledge sharing`,
      `${city} online learning`,
      `${city} professional networking`,
      `${city} interest groups`,
    ];

    return [...baseKeywords, ...localKeywords];
  }

  /**
   * Generate location-specific meta description
   */
  generateLocalMetaDescription(city: string, baseDescription: string): string {
    return `Join ${city} communities on Lokaa. Connect with local ${city} professionals, share knowledge, and turn your passion into profit. Find ${city} communities today!`;
  }

  /**
   * Generate location-specific title
   */
  generateLocalTitle(city: string, baseTitle: string): string {
    return `${baseTitle} - ${city} Communities | Lokaa`;
  }

  /**
   * Get location-based FAQ content
   */
  generateLocalFAQ(city: string): Array<{ question: string; answer: string }> {
    return [
      {
        question: `Are there ${city} communities on Lokaa?`,
        answer: `Yes! Lokaa hosts numerous ${city} communities where local professionals and enthusiasts connect, share knowledge, and collaborate on projects.`,
      },
      {
        question: `How do I find ${city} communities?`,
        answer: `Use our location-based search to find ${city} communities by category, interest, or keyword. Browse through technology, business, creative, and other categories.`,
      },
      {
        question: `Can I create a ${city} community?`,
        answer: `Absolutely! You can create your own ${city} community around any passion or expertise. Our platform provides all the tools you need to build and grow your community.`,
      },
      {
        question: `Are ${city} communities free to join?`,
        answer: `Many ${city} communities on Lokaa are free to join. Some premium communities may have membership fees, but you can always find free communities that match your interests.`,
      },
      {
        question: `How do I connect with other ${city} professionals?`,
        answer: `Join relevant ${city} communities, participate in discussions, attend virtual events, and use our networking features to connect with like-minded professionals in your area.`,
      },
    ];
  }
}

// Export singleton instance
export const localSEO = new LocalSEO();
