/**
 * Schema Markup Component
 * 
 * React component for rendering JSON-LD structured data
 * Supports multiple schema types and validation
 */

import React, { useEffect, useState } from 'react';
import { log } from '@/utils/logger';
import { schemaGenerator, type SchemaData } from '@/utils/schemaGenerator';

interface SchemaMarkupProps {
  schemas: SchemaData[];
  validate?: boolean;
  onValidationError?: (errors: string[]) => void;
}

/**
 * Schema Markup Component
 * 
 * Renders JSON-LD structured data in the document head
 * Automatically validates schemas if validation is enabled
 */
export const SchemaMarkup: React.FC<SchemaMarkupProps> = ({
  schemas,
  validate = false,
  onValidationError
}) => {
  const [renderedSchemas, setRenderedSchemas] = useState<SchemaData[]>([]);

  useEffect(() => {
    if (!schemas || schemas.length === 0) {
      return;
    }

    // Validate schemas if validation is enabled
    if (validate) {
      const validationErrors: string[] = [];
      
      schemas.forEach((schema, index) => {
        const validation = schemaGenerator.validateSchema(schema);
        if (!validation.isValid) {
          validationErrors.push(`Schema ${index}: ${validation.errors.join(', ')}`);
        }
      });

      if (validationErrors.length > 0) {
        log.warn('SchemaMarkup', 'Schema validation errors:', validationErrors);
        onValidationError?.(validationErrors);
      }
    }

    // Clear existing schema scripts
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-schema="dynamic"]');
    existingScripts.forEach(script => script.remove());

    // Render new schemas
    schemas.forEach((schema, index) => {
      try {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-schema', 'dynamic');
        script.setAttribute('data-schema-index', index.toString());
        script.textContent = JSON.stringify(schema, null, 0);
        
        document.head.appendChild(script);
        
        log.debug('SchemaMarkup', `Rendered schema ${index}:`, schema['@type']);
      } catch (error) {
        log.error('SchemaMarkup', `Failed to render schema ${index}:`, error);
      }
    });

    setRenderedSchemas(schemas);

    // Cleanup function
    return () => {
      const scriptsToRemove = document.querySelectorAll('script[type="application/ld+json"][data-schema="dynamic"]');
      scriptsToRemove.forEach(script => script.remove());
    };
  }, [schemas, validate, onValidationError]);

  // This component doesn't render anything visible
  return null;
};

/**
 * Organization Schema Component
 * 
 * Pre-configured component for organization schema
 */
export const OrganizationSchema: React.FC<{
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
}> = ({ name, url, logo, description }) => {
  const schema = schemaGenerator.generateOrganizationSchema();
  
  // Override with props if provided
  if (name) schema.name = name;
  if (url) schema.url = url;
  if (logo) schema.logo = logo;
  if (description) schema.description = description;

  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * WebSite Schema Component
 * 
 * Pre-configured component for website schema with search action
 */
export const WebSiteSchema: React.FC<{
  name?: string;
  url?: string;
  description?: string;
  searchUrl?: string;
}> = ({ name, url, description, searchUrl }) => {
  const schema = schemaGenerator.generateWebSiteSchema();
  
  // Override with props if provided
  if (name) schema.name = name;
  if (url) schema.url = url;
  if (description) schema.description = description;
  if (searchUrl) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrl
      },
      'query-input': 'required name=search_term_string'
    };
  }

  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * Course Schema Component
 * 
 * Pre-configured component for course schema
 */
export const CourseSchema: React.FC<{
  course: {
    title: string;
    description?: string;
    slug: string;
    cover_image?: string;
    created_at: string;
    updated_at: string;
  };
  space: {
    name: string;
    subdomain: string;
  };
}> = ({ course, space }) => {
  const schema = schemaGenerator.generateCourseSchema(course, space);
  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * Article Schema Component
 * 
 * Pre-configured component for article schema
 */
export const ArticleSchema: React.FC<{
  post: {
    title?: string;
    content: string;
    slug: string;
    created_at: string;
    updated_at: string;
    media_urls?: any[];
  };
  space: {
    name: string;
    subdomain: string;
    cover_image?: string;
  };
  author: {
    full_name?: string;
    profile_url?: string;
  };
}> = ({ post, space, author }) => {
  const schema = schemaGenerator.generateArticleSchema(post, space, author);
  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * Person Schema Component
 * 
 * Pre-configured component for person schema
 */
export const PersonSchema: React.FC<{
  profile: {
    full_name?: string;
    profile_url?: string;
    avatar_url?: string;
    bio?: string;
  };
}> = ({ profile }) => {
  const schema = schemaGenerator.generatePersonSchema(profile);
  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * Breadcrumb Schema Component
 * 
 * Pre-configured component for breadcrumb schema
 */
export const BreadcrumbSchema: React.FC<{
  breadcrumbs: Array<{ name: string; url: string }>;
}> = ({ breadcrumbs }) => {
  const schema = schemaGenerator.generateBreadcrumbSchema(breadcrumbs);
  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * FAQ Schema Component
 * 
 * Pre-configured component for FAQ schema
 */
export const FAQSchema: React.FC<{
  faqs: Array<{ question: string; answer: string }>;
}> = ({ faqs }) => {
  const schema = schemaGenerator.generateFAQPageSchema(faqs);
  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * Event Schema Component
 * 
 * Pre-configured component for event schema
 */
export const EventSchema: React.FC<{
  event: {
    name: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: string;
  };
  space: {
    name: string;
    subdomain: string;
  };
}> = ({ event, space }) => {
  const schema = schemaGenerator.generateEventSchema({ ...event, space });
  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * Space Schema Component
 * 
 * Pre-configured component for space schema
 */
export const SpaceSchema: React.FC<{
  space: {
    name: string;
    subdomain: string;
    description?: string;
    cover_image?: string;
    member_count?: number;
  };
}> = ({ space }) => {
  const schema = schemaGenerator.generateSpaceSchema(space);
  return <SchemaMarkup schemas={[schema]} />;
};

/**
 * Page Schema Component
 * 
 * Comprehensive component that generates all relevant schemas for a page
 */
export const PageSchema: React.FC<{
  pageType: 'landing' | 'space' | 'post' | 'course' | 'profile';
  data: any;
  validate?: boolean;
  onValidationError?: (errors: string[]) => void;
}> = ({ pageType, data, validate, onValidationError }) => {
  const schemas = schemaGenerator.generatePageSchemas(pageType, data);
  return <SchemaMarkup schemas={schemas} validate={validate} onValidationError={onValidationError} />;
};

export default SchemaMarkup;
