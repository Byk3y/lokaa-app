// This file was created to resolve a build error due to its absence.
// Please populate it with the necessary code for the Create Course Dialog. 

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image as ImageIcon } from "lucide-react"; // Renamed Image to avoid conflict
import type { CourseDisplayData } from "../ClassroomTab"; // For the onCreateCourse callback type

interface CreateCourseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateCourse: (courseData: {
    title: string;
    description: string;
    accessType: "open" | "paid";
    price: number | null;
    isPublished: boolean;
    currency: string;
    // allowAnnualUpgrade: boolean; // This state was in ClassroomTab, decide if needed here
  }) => Promise<void>;
  isCreating: boolean;
  spacePricingType?: 'free' | 'paid'; // To enforce business rules
  primaryColor: string;
}

export default function CreateCourseDialog({
  isOpen,
  onOpenChange,
  onCreateCourse,
  isCreating,
  spacePricingType,
  primaryColor,
}: CreateCourseDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState<"open" | "paid">("open");
  const [isPublished, setIsPublished] = useState(true);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>('NGN');
  // const [allowAnnualUpgrade, setAllowAnnualUpgrade] = useState(false); // Decide if needed

  useEffect(() => {
    if (isOpen) {
      // Reset form when dialog opens
      setTitle("");
      setDescription("");
      setAccessType("open");
      setIsPublished(true);
      setPrice("");
      setCurrency('NGN');
      // setAllowAnnualUpgrade(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    // Basic Validations (can be made more robust)
    if (!title.trim()) {
      alert("Course title required"); // Replace with toast
      return;
    }
    if (title.length > 50) {
      alert("Title too long (max 50 chars)"); // Replace with toast
      return;
    }
    if (description.length > 5000) {
      alert("Description too long (max 5000 chars)"); // Replace with toast
      return;
    }
    if (spacePricingType === 'paid' && accessType === 'paid') {
      alert("Paid spaces cannot have paid courses. Please set course access to 'Open'."); // Replace with toast
      return;
    }

    let priceValue: number | null = null;
    if (accessType === "paid") {
      if (!price.trim()) {
        alert("Price required for paid course"); // Replace with toast
        return;
      }
      priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue < 0) {
        alert("Invalid price. Must be a positive number."); // Replace with toast
        return;
      }
    }

    await onCreateCourse({
      title: title.trim(),
      description: description.trim(),
      accessType,
      price: priceValue,
      isPublished,
      currency,
      // allowAnnualUpgrade,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto !fixed !inset-0 !translate-x-0 !translate-y-0 m-auto">
        <DialogHeader className="pt-6 pb-4 px-6">
          <DialogTitle className="text-xl font-semibold">Add New Course</DialogTitle>
          <DialogDescription className="sr-only">
            Fill in the details below to create a new course for your space.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex flex-col gap-y-6">
              <div className="grid gap-1.5">
                <Label htmlFor="new-course-title-dialog">Course Title</Label>
                <Input 
                  id="new-course-title-dialog" 
                  placeholder="e.g., Mastering Digital Art" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                />
                <div className="text-xs text-gray-500 self-end text-right pr-1">
                  {title.length} / 50
                </div>
              </div>
              
              <div className="grid gap-1.5">
                <Label htmlFor="new-course-description-dialog">Course Description</Label>
                <Textarea 
                  id="new-course-description-dialog" 
                  placeholder="Provide a compelling description of your new course..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                  rows={4}
                />
                <div className="text-xs text-gray-500 self-end text-right pr-1">
                  {description.length} / 5000
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Cover Image</Label>
                  <span className="text-xs text-gray-500">1460 x 752 px (Coming soon)</span>
                </div>
                <div 
                  className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center h-48 relative opacity-75 cursor-not-allowed p-4 text-center"
                  title="Cover image upload coming soon"
                >
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Upload a cover image</p>
                  <p className="text-xs text-gray-400 mt-1">Feature coming soon</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Access Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div 
                    onClick={() => setAccessType("open")}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out 
                                ${accessType === "open" 
                                  ? 'border-primary ring-2 ring-primary shadow-md bg-primary/5' 
                                  : 'border-gray-300 hover:border-gray-400 bg-white'}`}
                    style={{borderColor: accessType === "open" ? primaryColor : undefined, ringColor: accessType === "open" ? primaryColor : undefined}}
                  >
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="new-access-open-dialog" 
                        name="new-access-type-dialog" 
                        value="open"
                        checked={accessType === "open"}
                        onChange={() => setAccessType("open")} 
                        className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                        style={{color: primaryColor, borderColor: primaryColor}}
                      />
                      <div>
                        <label htmlFor="new-access-open-dialog" className="font-semibold text-gray-800 block text-sm cursor-pointer">Open</label>
                        <span className="text-xs text-gray-500 block">All members can access.</span>
                      </div>
                    </div>
                  </div>
                  <div 
                    onClick={() => setAccessType("paid")}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out 
                                ${accessType === "paid" 
                                  ? 'border-primary ring-2 ring-primary shadow-md bg-primary/5' 
                                  : 'border-gray-300 hover:border-gray-400 bg-white'}`}
                    style={{borderColor: accessType === "paid" ? primaryColor : undefined, ringColor: accessType === "paid" ? primaryColor : undefined}}
                  >
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="new-access-paid-dialog" 
                        name="new-access-type-dialog" 
                        value="paid"
                        checked={accessType === "paid"}
                        onChange={() => setAccessType("paid")} 
                        className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                        style={{color: primaryColor, borderColor: primaryColor}}
                      />
                      <div>
                        <label htmlFor="new-access-paid-dialog" className="font-semibold text-gray-800 block text-sm cursor-pointer">Buy now</label>
                        <span className="text-xs text-gray-500 block">Members pay a 1-time price.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {accessType === "paid" && (
                <div className="grid grid-cols-5 gap-x-3 items-end">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="new-course-currency-dialog">Currency</Label>
                    <select 
                      id="new-course-currency-dialog"
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm bg-white"
                    >
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <Label htmlFor="new-course-price-dialog">Price ({currency === 'USD' ? '$' : '₦'})</Label>
                    <div className="relative">
                      <Input 
                        id="new-course-price-dialog" 
                        type="number"
                        placeholder={currency === 'USD' ? "49.99" : "9999"} 
                        value={price} 
                        onChange={(e) => setPrice(e.target.value)} 
                        className="text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}
                  
              <div className="space-y-2 pt-1">
                <Label className="text-sm font-medium">Visibility</Label>
                <div 
                  role="switch"
                  aria-checked={isPublished}
                  onClick={() => setIsPublished(prev => !prev)}
                  className={`flex items-center justify-between w-full p-3 rounded-lg border cursor-pointer transition-all duration-200 ease-in-out 
                              ${isPublished ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}
                >
                  <div className="flex items-center">
                    <div 
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out 
                                  ${isPublished ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div 
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out 
                                    ${isPublished ? 'translate-x-5' : 'translate-x-0'}`}
                      ></div>
                    </div>
                    <div className="ml-3">
                      <span className={`font-medium ${isPublished ? 'text-green-700' : 'text-gray-700'}`}>
                        {isPublished ? 'Published' : 'Draft'}
                      </span>
                      <p className={`text-xs ${isPublished ? 'text-green-600' : 'text-gray-500'}`}>
                        {isPublished 
                          ? 'Visible to all space members.' 
                          : 'Only visible to you and space admins.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 flex sm:justify-between items-center">
          <div></div>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-6"
              disabled={isCreating}
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleSubmit}
              className="text-white px-6"
              style={{ backgroundColor: primaryColor }}
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isCreating ? "ADDING..." : "ADD"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 