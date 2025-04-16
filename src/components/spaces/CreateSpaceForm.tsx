
import { useState } from "react";
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
import { SpaceColorPicker } from "./SpaceColorPicker";
import { spaceFormSchema, type SpaceFormValues } from "./spaceFormSchema";
import { generateSlug } from "@/utils/slugUtils";

export default function CreateSpaceForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const params = useParams();
  const communityId = params.communityId;
  
  const [searchParams] = useSearchParams();
  const spaceType = searchParams.get('type');
  
  if (!spaceType) {
    return <div>Invalid space type</div>;
  }

  // Using useForm without explicit generic to avoid deep instantiation
  const form = useForm({
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
        slug: slug,
        community_id: communityId,
        owner_id: user.id,
        type: spaceType,
        color: data.color,
        settings: {},
      };
      
      const { error } = await supabase
        .from('spaces_new')
        .insert(newSpace)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: "Space created successfully!",
        description: `${data.name} has been created.`,
      });
      
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
            
            <SpaceColorPicker form={form} />
            
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
