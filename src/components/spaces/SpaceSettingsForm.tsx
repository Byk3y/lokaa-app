import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/types/supabase";

const spaceFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long").max(50, "Name must be less than 50 characters long"),
  description: z.string().max(500, "Description must be less than 500 characters long").optional(),
  subdomain: z.string()
    .min(3, "Subdomain must be at least 3 characters long")
    .max(20, "Subdomain must be less than 20 characters long")
    .regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"),
  pricingType: z.enum(["free", "paid"]),
  pricePerMonth: z.string().optional(),
  primaryColor: z.string(),
});

type SpaceFormValues = z.infer<typeof spaceFormSchema>;

interface SpaceSettingsFormProps {
  space: Database['public']['Tables']['spaces']['Row'];
}

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

export default function SpaceSettingsForm({ space }: SpaceSettingsFormProps) {
  const { user } = useOptimizedAuth();
  const [loading, setLoading] = useState(false);
  const [subdomainChanged, setSubdomainChanged] = useState(false);

  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      name: space.name,
      description: space.description || "",
      subdomain: space.subdomain,
      pricingType: space.pricing_type,
      pricePerMonth: space.price_per_month?.toString() || "0",
      primaryColor: space.primary_color || "#7c3aed",
    },
  });

  const pricingType = form.watch("pricingType");
  const primaryColor = form.watch("primaryColor");
  
  const onSubmit = async (data: SpaceFormValues) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Check if subdomain is already taken (only if changed)
      if (data.subdomain !== space.subdomain) {
        const { data: existingSpace, error: checkError } = await getSupabaseClient()
          .from('spaces')
          .select('id')
          .eq('subdomain', data.subdomain)
          .single();
          
        if (existingSpace) {
          form.setError('subdomain', { 
            type: 'manual', 
            message: 'This subdomain is already taken' 
          });
          setLoading(false);
          return;
        }
      }
      
      const updatedSpace = {
        name: data.name,
        description: data.description || "",
        subdomain: data.subdomain,
        pricing_type: data.pricingType,
        price_per_month: data.pricingType === 'paid' ? parseFloat(data.pricePerMonth || "0") : 0,
        primary_color: data.primaryColor,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await getSupabaseClient()
        .from('spaces')
        .update(updatedSpace)
        .eq('id', space.id);
        
      if (error) throw error;
      
      toast({
        title: "Settings updated",
        description: "Your space settings have been updated successfully.",
      });
      
    } catch (error: unknown) {
      console.error('Error updating space:', error);
      toast({
        title: "Error updating space",
        description: (error instanceof Error ? error.message : String(error)) || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="general" className="max-w-2xl">
      <TabsList className="mb-6">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
      </TabsList>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Space Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        This is the name of your community space.
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
                          className="resize-none h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description to help people understand what your space is about.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="subdomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subdomain</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Input 
                            {...field}
                            onChange={e => {
                              field.onChange(e);
                              setSubdomainChanged(true);
                            }}
                          />
                          <span className="ml-2 text-muted-foreground">.lokaa.so</span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        This will be the URL for your space: https://{field.value || "your-space"}.lokaa.so
                      </FormDescription>
                      {subdomainChanged && (
                        <Alert variant="warning" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Changing your subdomain will change your space's URL. Make sure to inform your members.
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Space Appearance</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
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
                        This color will be used for buttons, links, and other accent elements in your space.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Preview</h3>
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-20 rounded" style={{ backgroundColor: primaryColor }}></div>
                      <span className="text-sm text-gray-500">Primary Color</span>
                    </div>
                    <div>
                      <button className="px-4 py-2 rounded-md text-white" style={{ backgroundColor: primaryColor }}>
                        Button Example
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                      <span className="text-sm font-medium" style={{ color: primaryColor }}>Text with primary color</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Space Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="pricingType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Pricing Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="free" id="free" />
                            <Label htmlFor="free">Free - Anyone can join without payment</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="paid" id="paid" />
                            <Label htmlFor="paid">Paid - Members pay a monthly subscription</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {pricingType === "paid" && (
                  <FormField
                    control={form.control}
                    name="pricePerMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per month ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" step="0.01" placeholder="9.99" {...field} />
                        </FormControl>
                        <FormDescription>
                          The monthly subscription price for your space.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {space.pricing_type === "free" && pricingType === "paid" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      When switching from free to paid, only new members will be required to pay. Existing members will keep their free access.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <div className="mt-6">
            <Button 
              type="submit" 
              className="w-full bg-lokaa-600 hover:bg-lokaa-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}
