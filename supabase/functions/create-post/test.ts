import { assertEquals } from 'std/testing/asserts.ts';
import { APIValidation, SpaceIdSchema } from '../_shared/validation.ts';
import { z } from 'zod';

// Mock data
const validPost = {
  metadata: {
    timestamp: Date.now(),
    version: '1.0.0',
    source: 'web'
  },
  data: {
    title: 'Test Post',
    content: 'This is a test post',
    spaceId: '123e4567-e89b-12d3-a456-426614174000',
    tags: ['test', 'validation']
  }
};

const invalidPost = {
  metadata: {
    timestamp: 'invalid', // Should be number
    version: '1.0.0'
  },
  data: {
    title: '', // Too short
    content: 'x'.repeat(60000), // Too long
    spaceId: 'invalid-uuid',
    tags: ['1', '2', '3', '4', '5', '6'] // Too many tags
  }
};

// Test schema
const testSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be less than 50,000 characters'),
  spaceId: SpaceIdSchema,
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').optional()
});

Deno.test('API Validation - Valid Post', async () => {
  const validation = APIValidation.getInstance();
  const result = await validation.validateRequest(
    '/test',
    validPost,
    testSchema
  );

  assertEquals(result.isValid, true);
  assertEquals(result.errors.length, 0);
  assertEquals(result.sanitizedData?.title, 'Test Post');
});

Deno.test('API Validation - Invalid Post', async () => {
  const validation = APIValidation.getInstance();
  const result = await validation.validateRequest(
    '/test',
    invalidPost,
    testSchema
  );

  assertEquals(result.isValid, false);
  assertEquals(result.errors.length > 0, true);
  assertEquals(result.sanitizedData, undefined);
});

Deno.test('API Validation - Rate Limiting', async () => {
  const validation = APIValidation.getInstance();
  const result = await validation.checkRateLimit('/test', 'test-user');

  assertEquals(result.allowed, true);
  assertEquals(typeof result.remaining, 'number');
  assertEquals(typeof result.resetAt, 'number');
});

Deno.test('API Validation - Response Validation', async () => {
  const validation = APIValidation.getInstance();
  const validResponse = {
    data: {
      title: 'Test Post',
      content: 'This is a test post',
      spaceId: '123e4567-e89b-12d3-a456-426614174000'
    }
  };

  const result = await validation.validateResponse(
    '/test',
    validResponse.data,
    testSchema
  );

  assertEquals(result.isValid, true);
  assertEquals(result.errors.length, 0);
  assertEquals(result.sanitizedData?.title, 'Test Post');
}); 