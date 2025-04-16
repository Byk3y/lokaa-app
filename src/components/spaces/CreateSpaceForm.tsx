
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SpaceTemplates } from "./SpaceTemplates";

const spaceFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long").max(50, "Name must be less than 50 characters long"),
  description: z.string().max(500, "Description must be less than 500 characters long").optional(),
  color: z.string().default("#7c3aed"),
});

type SpaceFormValues = z.infer<typeof spaceFormSchema>;

const COLOR_OPTIONS = [
  { name: "Purple", value: "#7c3aed", class: "bg-lokaa-600" },
  { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
  { name: "Green", value: "#10b981", class: "bg-green-500" },
  { name: "Orange", value: "#f97316", class: "bg-orange-500" },
  { name: "Red", value: "#ef4444", class: "bg-red-500" },
  { name: "Pink", value: "#ec4899", class: "bg-pink-500" },
  { name: "Teal", value: "#14b8a6", class: "bg-teal-500" },
  { name: "Black", value: "#171717", class: "bg-neutral-800" },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreateSpaceForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Fix for excessively deep type instantiation - explicitly define the param type
  const { communityId } = useParams<{ communityId: string }>();
  const [searchParams] = useSearchParams();
  const spaceType = searchParams.get('type');
  
  if (!spaceType) {
    return <div>Invalid space type</div>;
  }

  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#7c3aed",
    },
  });

  const onSubmit = async (data: SpaceFormValues) => {
    if (!user || !communityId) return;
    
    setLoading(true);
    
    try {
      const slug = generateSlug(data.name);
      
      // Check if slug is already taken in this community
      const { data: existingSpace, error: checkError } = await supabase
        .from('spaces_new')
        .select('id')
        .eq('community_id', communityId)
        .eq('slug', slug)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
        
      if (existingSpace) {
        form.setError('name', { 
          type: 'manual', 
          message: 'A space with this name already exists in this community' 
        });
        setLoading(false);
        return;
      }
      
      const newSpace = {
        name: data.name,
        description: data.description || "",
        slug: slug, // Add the slug property to the newSpace object
        community_id: communityId,
        owner_id: user.id,
        type: spaceType,
        color: data.color,
        settings: {},
      };
      
      const { data: space, error } = await supabase
        .from('spaces_new')
        .insert(newSpace)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: "Space created successfully!",
        description: `${data.name} has been created.`,
      });
      
      // Navigate to the new space using the generated slug since the response doesn't include it
      navigate(`/c/${communityId}/s/${slug}`);
    } catch (error: any) {
      console.error('Error creating space:', error);
      toast({
        title: "Error creating space",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create New Space</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`My ${spaceType} Space`} {...field} />
                  </FormControl>
                  <FormDescription>
                    This is what members will see when browsing spaces.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this space is about..." 
                      className="resize-none h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description to help people understand what this space is about.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space Color Theme</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-3">
                      {COLOR_OPTIONS.map((color) => (
                        <div key={color.value} className="text-center">
                          <button
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={`h-10 w-10 rounded-full ${color.class} mx-auto mb-1 flex items-center justify-center transition-all ${
                              field.value === color.value 
                                ? 'ring-2 ring-offset-2 ring-black' 
                                : 'hover:scale-110'
                            }`}
                            aria-label={`Select ${color.name} color`}
                          >
                            {field.value === color.value && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            )}
                          </button>
                          <p className="text-xs font-medium">{color.name}</p>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription>
                    This color will be used for accent elements in your space.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-lokaa-600 hover:bg-lokaa-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Space...
                </>
              ) : (
                "Create Space"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
