
import { z } from "zod";

// Define the space form schema with proper typing
export const spaceFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long").max(50, "Name must be less than 50 characters long"),
  description: z.string().max(500, "Description must be less than 500 characters long").optional(),
  color: z.string().default("#7c3aed"),
});

// Export the type separately to avoid circular references
export type SpaceFormValues = z.infer<typeof spaceFormSchema>;
