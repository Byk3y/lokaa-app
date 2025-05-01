import { useState } from "react";
import { Book, Video, GraduationCap, FileText, LucideIcon, Plus, Calendar, Users, Image, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ClassroomTabProps {
  space: {
    id: string;
    name: string;
    subdomain?: string;
    description?: string | null;
    about_description?: string | null;
    cover_image?: string | null;
    icon_image?: string | null;
    primary_color?: string | null;
    owner_id?: string;
  };
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  lessons: number;
  completed?: boolean;
}

export default function ClassroomTab({ space }: ClassroomTabProps) {
  const { user } = useAuth();
  const isOwner = user?.id === space.owner_id;
  
  // Sample course card for demonstration in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Empty courses array to show only the "New course" card initially
  const [courses, setCourses] = useState<any[]>(
    isDevelopment 
      ? [
          {
            id: 'sample-course-1',
            title: 'Introduction to AI',
            description: 'Learn the fundamentals of artificial intelligence and machine learning',
            weeks: 6,
            students: 27,
            imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80',
            enrolled: true
          },
          {
            id: 'sample-course-2',
            title: 'Data Science Essentials',
            description: 'Master the core concepts of data analysis and visualization',
            weeks: 4,
            students: 15,
            imageUrl: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=600&auto=format&fit=crop&q=80',
            enrolled: false
          }
        ] 
      : []
  );
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("all-courses");
  
  // Filter courses based on the active tab
  const filteredCourses = activeTab === "my-courses" 
    ? courses.filter(course => course.enrolled) 
    : courses;
    
  // Count of enrolled courses
  const enrolledCoursesCount = courses.filter(course => course.enrolled).length;

  // Search functionality
  const [searchTerm, setSearchTerm] = useState("");

  const searchedCourses = searchTerm 
    ? filteredCourses.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredCourses;

  // State for the new course modal
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [accessType, setAccessType] = useState<"open" | "paid">("open");
  const [isPublished, setIsPublished] = useState(true);
  const [coursePrice, setCoursePrice] = useState("");
  const [allowAnnualUpgrade, setAllowAnnualUpgrade] = useState(false);
  
  // Primary color from space or default
  const primaryColor = space?.primary_color || "#26A69A";

  const handleNewCourse = () => {
    if (isOwner) {
      // Reset form when opening
      setCourseTitle("");
      setCourseDescription("");
      setAccessType("open");
      setIsPublished(true);
      setCoursePrice("");
      setAllowAnnualUpgrade(false);
      // Open the modal
      setShowNewCourseModal(true);
    } else {
      toast({
        title: "Permission denied",
        description: "Only space owners can create courses",
        variant: "destructive"
      });
    }
  };

  const handleCreateCourse = () => {
    // Validate inputs
    if (!courseTitle.trim()) {
      toast({
        title: "Course title required",
        description: "Please enter a title for your course",
        variant: "destructive"
      });
      return;
    }

    if (courseTitle.length > 50) {
      toast({
        title: "Title too long",
        description: "Course title must be 50 characters or less",
        variant: "destructive"
      });
      return;
    }

    if (courseDescription.length > 500) {
      toast({
        title: "Description too long",
        description: "Course description must be 500 characters or less",
        variant: "destructive"
      });
      return;
    }

    // Validate price if access type is paid
    if (accessType === "paid" && !coursePrice.trim()) {
      toast({
        title: "Price required",
        description: "Please enter a price for your paid course",
        variant: "destructive"
      });
      return;
    }

    // Just a placeholder for now
    const priceInfo = accessType === "paid" ? ` for $${coursePrice}` : "";
    const upgradeInfo = accessType === "paid" && allowAnnualUpgrade ? " (allows annual upgrade)" : "";
    
    toast({
      title: "Course creation coming soon",
      description: `Creating ${accessType} course: ${courseTitle}${priceInfo}${upgradeInfo} (${isPublished ? "Published" : "Draft"})`,
    });
    setShowNewCourseModal(false);
  };

  // Handle radio button change for access type
  const handleAccessTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccessType(e.target.value as "open" | "paid");
  };

  // Toggle published status
  const togglePublished = () => {
    setIsPublished(prev => !prev);
  };
  
  // Toggle annual upgrade option
  const toggleAnnualUpgrade = () => {
    setAllowAnnualUpgrade(prev => !prev);
  };

  return (
    <div className="w-full bg-[#F5FAFA] p-6 rounded-xl">
      {/* New Course Modal */}
      <Dialog open={showNewCourseModal} onOpenChange={setShowNewCourseModal}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto !fixed !inset-0 !translate-x-0 !translate-y-0 m-auto">
          <div className="pt-6 pb-4">
            <h2 className="text-lg font-semibold">Add course</h2>
            
            <div className="grid gap-6 mt-6">
              <div className="grid gap-2">
                <Input 
                  id="course-title" 
                  placeholder="Course name" 
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="text-base"
                />
                <div className="text-right text-xs text-gray-400">
                  {courseTitle.length} / 50
                </div>
              </div>
              
              <div className="grid gap-2">
                <Textarea 
                  id="course-description" 
                  placeholder="Course description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="min-h-[120px] text-base"
                />
                <div className="text-right text-xs text-gray-400">
                  {courseDescription.length} / 500
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center p-4 border-r border-gray-200">
                  <input 
                    type="radio" 
                    id="access-open" 
                    name="access-type" 
                    value="open"
                    checked={accessType === "open"}
                    className="h-4 w-4 text-blue-500 border-gray-300 mr-3" 
                    onChange={handleAccessTypeChange}
                  />
                  <div>
                    <label htmlFor="access-open" className="font-medium text-gray-900 block text-base">Open</label>
                    <span className="text-sm text-gray-500">All members can access.</span>
                  </div>
                </div>
                <div className="flex items-center p-4">
                  <input 
                    type="radio" 
                    id="access-paid" 
                    name="access-type" 
                    value="paid"
                    checked={accessType === "paid"}
                    className="h-4 w-4 text-blue-500 border-gray-300 mr-3" 
                    onChange={handleAccessTypeChange}
                  />
                  <div>
                    <label htmlFor="access-paid" className="font-medium text-gray-900 block text-base">Buy now</label>
                    <span className="text-sm text-gray-500">Members pay a 1-time price to unlock.</span>
                  </div>
                </div>
              </div>
              
              {/* One-time purchase price - only shown when "Buy now" is selected */}
              {accessType === "paid" && (
                <>
                  <div className="grid gap-3">
                    <label className="text-sm text-gray-500">One-time purchase price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">$</span>
                      <Input
                        type="text"
                        value={coursePrice}
                        onChange={(e) => setCoursePrice(e.target.value)}
                        className="pl-8 text-base"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div 
                      className={`relative inline-block w-12 h-6 ${allowAnnualUpgrade ? 'bg-gray-300' : 'bg-gray-200'} rounded-full cursor-pointer mr-3`}
                      onClick={toggleAnnualUpgrade}
                    >
                      <div 
                        className={`absolute ${allowAnnualUpgrade ? 'right-1' : 'left-1'} top-1 w-4 h-4 ${allowAnnualUpgrade ? 'bg-gray-600' : 'bg-gray-400'} rounded-full transition-all duration-200`}
                      ></div>
                    </div>
                    <span className="text-gray-700">Or when members upgrade to annual</span>
                  </div>
                </>
              )}
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-medium">Cover</span>
                  <span className="text-sm text-gray-500">1460 x 752 px</span>
                </div>
                <div className="bg-gray-200 rounded-lg flex items-center justify-center h-48 relative">
                  <div className="text-blue-500 cursor-pointer">Upload</div>
                  <button className="absolute bottom-3 right-3 bg-white text-gray-700 px-4 py-2 rounded-md border border-gray-300 font-medium">
                    CHANGE
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center">
                  <span className="mr-2 text-green-600 font-medium">Published</span>
                  <div 
                    className={`relative inline-block w-12 h-6 ${isPublished ? 'bg-green-100' : 'bg-gray-200'} rounded-full cursor-pointer`}
                    onClick={togglePublished}
                  >
                    <div 
                      className={`absolute ${isPublished ? 'right-1' : 'left-1'} top-1 w-4 h-4 ${isPublished ? 'bg-green-600' : 'bg-gray-400'} rounded-full transition-all duration-200`}
                    ></div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewCourseModal(false)}
                    className="px-6"
                  >
                    CANCEL
                  </Button>
                  <Button 
                    onClick={handleCreateCourse}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6"
                  >
                    ADD
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-8">
        {/* Header section */}
        {/* Remove the header section marked with red borders */}
        
        {/* Courses section with tabs */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-[#37474F]">Courses</h2>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="h-9">
                  <TabsTrigger 
                    value="all-courses"
                    className={`px-3 text-sm ${activeTab === "all-courses" ? "bg-[#E0F2F1] text-[#26A69A]" : ""}`}
                  >
                    All Courses
                  </TabsTrigger>
                  <TabsTrigger 
                    value="my-courses"
                    className={`px-3 text-sm ${activeTab === "my-courses" ? "bg-[#E0F2F1] text-[#26A69A]" : ""}`}
                  >
                    My Courses
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex gap-2 items-center">
              {/* Search input */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 pl-9 h-9 text-sm"
                />
              </div>
              
              {isOwner && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-sm whitespace-nowrap"
                  onClick={handleNewCourse}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Course
                </Button>
              )}
            </div>
          </div>
          
          {/* Course grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Course card - always visible for owners */}
            {isOwner && (
              <motion.div 
                whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                className="h-64 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={handleNewCourse}
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-gray-600 font-medium">New course</p>
              </motion.div>
            )}
            
            {/* Empty state message if no courses */}
            {searchedCourses.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  {searchTerm ? 'No courses match your search' : 'No courses available yet'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchTerm 
                    ? 'Try a different search term or check back later for more courses' 
                    : activeTab === "my-courses" 
                      ? "You haven't enrolled in any courses yet" 
                      : "This space doesn't have any courses yet. Check back later for educational content."
                  }
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
            
            {/* Courses */}
            {searchedCourses.map((course) => (
              <motion.div 
                key={course.id}
                whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                className="h-64 rounded-xl border border-gray-200 cursor-pointer overflow-hidden bg-white"
              >
                <div 
                  className="h-1/2 bg-gradient-to-r from-blue-500 to-indigo-600 relative"
                  style={{
                    backgroundImage: course.imageUrl ? `url(${course.imageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Overlay for better text visibility */}
                  {course.imageUrl && (
                    <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  )}
                  
                  {/* Enrolled badge */}
                  {course.enrolled && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white border-0">
                        Enrolled
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[#37474F] text-lg mb-1 line-clamp-1">{course.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 h-10">{course.description}</p>
                  <div className="flex items-center mt-3 text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span className="mr-3">{course.weeks || 4} weeks</span>
                    <Users className="h-3 w-3 mr-1" />
                    <span>{course.students || 0} students</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 