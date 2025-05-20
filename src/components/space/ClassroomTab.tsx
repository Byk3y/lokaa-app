import { useState, useEffect, useCallback } from "react";
import { Book, Video, GraduationCap, FileText, LucideIcon, Plus, Calendar, Users, Image, Search, Loader2, Pencil, Trash2, PlayCircle } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/types/supabase";
import { CourseCardSkeleton } from "./CourseCardSkeleton";
import { ModuleListSkeleton } from "./ModuleListSkeleton";
import AddModuleDialog from "./dialogs/AddModuleDialog";
import EditModuleDialog from "./dialogs/EditModuleDialog";
import DeleteModuleConfirmDialog from "./dialogs/DeleteModuleConfirmDialog";
import AddLessonDialog from "./dialogs/AddLessonDialog";
import EditLessonDialog from "./dialogs/EditLessonDialog";
import LessonContentDialog from "./dialogs/LessonContentDialog"; // Import the new dialog

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
    pricing_type?: 'free' | 'paid';
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

// Define an interface for the Course structure (can be simplified or removed if CourseDisplayData is sufficient)
interface Course {
  id: string;
  title: string;
  description: string;
  weeks: number;
  students: number;
  imageUrl: string;
  enrolled: boolean;
}

// More specific types for fetched course content
export interface CourseLessonData { // From course_lessons table
  id: string;
  module_id: string;
  title: string;
  content_type: 'text' | 'video_embed' | 'external_link';
  content_text?: string | null;
  content_url?: string | null;
  lesson_order: number;
  // TODO: Potentially add 'completed' status later from lesson_completions
}

interface CourseModuleData { // From course_modules table
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  module_order: number;
  release_delay_days?: number | null; // Added for Drip Content
}

export interface CourseModuleWithLessons extends CourseModuleData { // Added export
  lessons: CourseLessonData[];
}

// Define a more specific type for the courses state based on DB structure + UI needs
interface CourseDisplayData {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null; // from courses table
  access_type: 'open' | 'paid';
  price?: number | null;
  is_published: boolean;
  currency?: string;
  // UI specific or joined data, like in your original Course interface:
  weeks?: number; // This might come from module count or a dedicated field later
  students?: number; // This would be a count from enrollments
  enrolled?: boolean; // For the current user
  // Add other fields from your DB courses table as needed for display
  creator_id?: string;
  space_id?: string;
  progress?: number; // Optional: 0-100, for enrolled users, for future use
}

// Utility function to get embed URL for videos
const getEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  let embedUrl: string | null = null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    if (hostname.includes('youtube.com')) {
      if (pathname.includes('/embed/')) {
        embedUrl = url; // Already an embed URL
      } else if (pathname.includes('/watch')) {
        const videoId = searchParams.get('v');
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (hostname.includes('youtu.be')) {
      const videoId = pathname.substring(1); // Remove leading '/'
      if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (hostname.includes('vimeo.com')) {
      if (pathname.startsWith('/video/') || pathname.startsWith('/player.vimeo.com/video/')) { // Already an embed or common player URL path
         embedUrl = url.replace('vimeo.com/','player.vimeo.com/video/').replace('/video/','/'); // Normalize to player.vimeo.com/video/
         if(url.includes('player.vimeo.com/video/')) embedUrl = url; // if already player.vimeo.com format
         else {
            const parts = pathname.split('/');
            const videoId = parts[parts.length -1];
            if(videoId && !isNaN(Number(videoId))) embedUrl = `https://player.vimeo.com/video/${videoId}`;
         }
      } else {
        const videoId = pathname.substring(1);
        if (videoId && !isNaN(Number(videoId))) embedUrl = `https://player.vimeo.com/video/${videoId}`;
      }
    }
    // Add other providers here if needed, e.g., Wistia, Loom

  } catch (error) {
    console.warn("Invalid URL provided for embedding:", url, error);
    return null; // Invalid URL format
  }
  
  // Basic check if it looks like an embeddable path from common services, even if not converted above
  if (!embedUrl && (url.includes('/embed') || url.includes('/player') || url.includes('/video/'))) {
    // Let's be cautious and assume it might be an embed link if it contains these keywords
    // but only if it passes a basic https check to avoid trying to embed relative paths or weird strings.
    if(url.startsWith('https://')){
        return url;
    }
  }

  return embedUrl;
};

const getYouTubeThumbnailUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  let videoId: string | null = null;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    if (hostname.includes('youtube.com')) {
      if (pathname.includes('/embed/')) {
        const parts = pathname.split('/');
        videoId = parts[parts.length - 1];
      } else if (pathname.includes('/watch')) {
        videoId = searchParams.get('v');
      }
    } else if (hostname.includes('youtu.be')) {
      videoId = pathname.substring(1);
    }

    if (videoId) {
      return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`; // Medium quality thumbnail
    }
  } catch (error) {
    console.warn("Invalid URL for YouTube thumbnail:", url, error);
    return null;
  }
  return null;
};

const isModuleAccessible = (
  module: CourseModuleWithLessons,
  enrollmentDate: string | null,
  isCourseOwner: boolean
): boolean => {
  if (isCourseOwner || !enrollmentDate || typeof module.release_delay_days !== 'number' || module.release_delay_days <= 0) {
    return true; // Always accessible to owner, or if no enrollment date, or no delay / immediate release
  }

  const now = new Date();
  const enrolledAt = new Date(enrollmentDate);
  const releaseDate = new Date(enrolledAt);
  releaseDate.setDate(enrolledAt.getDate() + module.release_delay_days);

  return now >= releaseDate;
};

const getModuleReleaseDateString = (
  module: CourseModuleWithLessons,
  enrollmentDate: string | null
): string | null => {
  if (!enrollmentDate || typeof module.release_delay_days !== 'number' || module.release_delay_days <= 0) {
    return null;
  }
  const enrolledAt = new Date(enrollmentDate);
  const releaseDate = new Date(enrolledAt);
  releaseDate.setDate(enrolledAt.getDate() + module.release_delay_days);
  return releaseDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function ClassroomTab({ space }: ClassroomTabProps) {
  const { user } = useAuth();
  const isOwner = user?.id === space.owner_id;
  
  // Sample course card for demonstration in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Updated courses state to use CourseDisplayData and initialize empty
  const [courses, setCourses] = useState<CourseDisplayData[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("all-courses");

  // Effect to switch tab if owner is viewing "my-courses"
  useEffect(() => {
    if (isOwner && activeTab === "my-courses") {
      setActiveTab("all-courses");
    }
  }, [isOwner, activeTab]);
  
  // Fetch courses when the component mounts or space.id changes
  useEffect(() => {
    const fetchCoursesAndEnrollments = async () => {
      if (!space.id || !user?.id) { // Ensure user.id is available for enrollment checks
        setIsLoadingCourses(false);
        if (!user?.id) console.log("Fetch courses waiting for user ID");
        return;
      }
      setIsLoadingCourses(true);
      try {
        // 1. Fetch all courses for the space
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(
            'id, title, description, image_url, access_type, price, is_published, creator_id, space_id, currency'
          )
          .eq('space_id', space.id)
          .order('created_at', { ascending: false });

        if (coursesError) {
          console.error("Error fetching courses:", coursesError);
          toast({ title: "Error Fetching Courses", description: coursesError.message, variant: "destructive" });
          setCourses([]);
          setIsLoadingCourses(false);
          return;
        }

        if (!coursesData || coursesData.length === 0) {
          setCourses([]);
          setIsLoadingCourses(false);
          return;
        }

        const courseIds = coursesData.map(c => c.id);

        // 2. Fetch all enrollments for these courses
        const { data: allEnrollmentsData, error: allEnrollmentsError } = await supabase
          .from('course_enrollments')
          .select('course_id, user_id')
          .in('course_id', courseIds);

        if (allEnrollmentsError) {
          console.error("Error fetching all enrollments:", allEnrollmentsError);
          // Continue with courses data but counts/enrollment status might be off
        }
        
        // 3. Create a map for quick lookup of student counts
        const studentCounts = new Map<string, number>();
        if (allEnrollmentsData) {
          allEnrollmentsData.forEach(enrollment => {
            // Exclude space owner from student counts
            if (enrollment.user_id !== space.owner_id) { 
            studentCounts.set(enrollment.course_id, (studentCounts.get(enrollment.course_id) || 0) + 1);
            }
          });
        }

        // 4. Create a set for quick lookup of current user's enrollments
        const currentUserEnrollmentSet = new Set<string>();
        if (allEnrollmentsData && user?.id) {
          allEnrollmentsData
            .filter(e => e.user_id === user.id)
            .forEach(e => currentUserEnrollmentSet.add(e.course_id));
        }
        
        const displayData: CourseDisplayData[] = coursesData.map((course: Tables<'courses'> & { currency?: string }) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            image_url: course.image_url,
            access_type: course.access_type as 'open' | 'paid',
            price: course.price,
            is_published: course.is_published,
            currency: course.currency || 'NGN',
            creator_id: course.creator_id,
            space_id: course.space_id,
          enrolled: currentUserEnrollmentSet.has(course.id),
          students: studentCounts.get(course.id) || 0,
          weeks: 0, // Keep weeks as 0 for now, to be populated later
          progress: currentUserEnrollmentSet.has(course.id) ? 0 : undefined, // Placeholder: 0% for enrolled, undefined otherwise
        }));

        // This filtering is for extra safety in case RLS doesn't work as expected
        // Only owners and admins should see unpublished courses
        const filteredCourses = isOwner 
          ? displayData // Owners see all courses
          : displayData.filter(course => course.is_published); // Non-owners only see published
        
        setCourses(filteredCourses);

      } catch (err) {
        console.error("Unexpected error fetching courses and enrollments:", err);
        toast({ title: "Unexpected Error", description: "Could not fetch course data.", variant: "destructive" });
        setCourses([]);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCoursesAndEnrollments();
  }, [space.id, user?.id, supabase, isOwner]); // Added isOwner to dependency array
  
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
        (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : filteredCourses;

  // State for the new course modal
  const [isCreateCourseDialogOpen, setIsCreateCourseDialogOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [accessType, setAccessType] = useState<"open" | "paid">("open");
  const [isPublished, setIsPublished] = useState(true);
  const [coursePrice, setCoursePrice] = useState("");
  const [courseCurrency, setCourseCurrency] = useState<string>('NGN');
  const [allowAnnualUpgrade, setAllowAnnualUpgrade] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false); // Loading state
  
  // State for the edit course modal
  const [isEditCourseDialogOpen, setIsEditCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDisplayData | null>(null);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");
  const [editAccessType, setEditAccessType] = useState<"open" | "paid">("open");
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editCoursePrice, setEditCoursePrice] = useState("");
  const [editCourseCurrency, setEditCourseCurrency] = useState<string>('NGN');
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
  
  // State for enrollment actions
  const [isProcessingEnrollment, setIsProcessingEnrollment] = useState<string | null>(null); // Stores courseId being processed

  // State for viewing course content
  const [viewingCourseContent, setViewingCourseContent] = useState<CourseDisplayData | null>(null);
  const [isLoadingCourseContent, setIsLoadingCourseContent] = useState(false);
  const [currentCourseModules, setCurrentCourseModules] = useState<CourseModuleWithLessons[]>([]); 
  const [currentUserEnrollmentDateForViewedCourse, setCurrentUserEnrollmentDateForViewedCourse] = useState<string | null>(null);

  // State for viewing individual lesson content
  const [viewingLesson, setViewingLesson] = useState<CourseLessonData | null>(null);
  const [isLessonContentDialogOpen, setIsLessonContentDialogOpen] = useState(false);
  
  // State for Add New Module dialog
  const [isAddModuleDialogOpen, setIsAddModuleDialogOpen] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  // State for Edit Module dialog
  const [isEditModuleDialogOpen, setIsEditModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModuleWithLessons | null>(null);
  const [isUpdatingModule, setIsUpdatingModule] = useState(false);

  // State for Delete Module confirm dialog
  const [isDeleteModuleConfirmOpen, setIsDeleteModuleConfirmOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModuleWithLessons | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);

  // State for Add Lesson dialog
  const [isAddLessonDialogOpen, setIsAddLessonDialogOpen] = useState(false);
  const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonContentType, setNewLessonContentType] = useState<'text' | 'video_embed' | 'external_link'>('text');
  const [newLessonContentText, setNewLessonContentText] = useState("");
  const [newLessonContentUrl, setNewLessonContentUrl] = useState("");
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  
  // State for Edit Lesson dialog
  const [isEditLessonDialogOpen, setIsEditLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLessonData | null>(null);
  const [isUpdatingLesson, setIsUpdatingLesson] = useState(false);
  
  // Primary color from space or default
  const primaryColor = space?.primary_color || "#26A69A";

  // Callback to fetch modules and lessons
  const fetchCourseContentDetails = useCallback(async () => {
      if (!viewingCourseContent?.id || !user?.id) {
        setCurrentCourseModules([]);
        setCurrentUserEnrollmentDateForViewedCourse(null); 
        return;
      }
      setIsLoadingCourseContent(true);
      setCurrentUserEnrollmentDateForViewedCourse(null); 

      try {
        // Fetch enrollment date if the user is enrolled and not the owner/creator
        // Ensure viewingCourseContent and viewingCourseContent.creator_id are defined
        if (viewingCourseContent && viewingCourseContent.enrolled && user.id !== viewingCourseContent.creator_id && user.id !== space.owner_id) {
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from('course_enrollments')
            .select('created_at')
            .eq('course_id', viewingCourseContent.id)
            .eq('user_id', user.id)
            .single(); 

          if (enrollmentError) {
            console.error("Error fetching enrollment date:", enrollmentError);
            // Proceed without enrollment date, modules might not lock correctly
          } else if (enrollmentData && typeof (enrollmentData as any).created_at === 'string') {
            setCurrentUserEnrollmentDateForViewedCourse((enrollmentData as any).created_at);
          } else {
            // Handle case where enrollmentData is null (no record) or created_at is not a string
            console.log("No enrollment record found or created_at is not in expected format for course:", viewingCourseContent.id, "user:", user.id);
          }
        }

        const { data: modulesData, error: modulesError } = await supabase
          .from('course_modules')
          .select('*')
          .eq('course_id', viewingCourseContent.id)
          .order('module_order', { ascending: true });

        if (modulesError) throw modulesError;
        if (!modulesData) {
          setCurrentCourseModules([]);
          setIsLoadingCourseContent(false);
          return;
        }

        const modulesWithLessons: CourseModuleWithLessons[] = await Promise.all(
          modulesData.map(async (module) => {
            const { data: lessonsData, error: lessonsError } = await supabase
              .from('course_lessons')
              .select('*')
              .eq('module_id', module.id)
              .order('lesson_order', { ascending: true });
            
            if (lessonsError) {
              console.error(`Error fetching lessons for module ${module.id}:`, lessonsError);
            return { ...module, lessons: [] };
            }
            return { ...module, lessons: (lessonsData as CourseLessonData[]) || [] };
          })
        );
        setCurrentCourseModules(modulesWithLessons);
      } catch (error: any) {
        console.error("Error fetching course content details:", error);
        toast({ title: "Error Loading Content", description: error.message, variant: "destructive" });
      setCurrentCourseModules([]);
      } finally {
        setIsLoadingCourseContent(false);
      }
  }, [viewingCourseContent, user?.id, supabase, toast, space.owner_id]); // Added space.owner_id and updated viewingCourseContent dependency

  // useEffect to fetch modules and lessons when viewingCourseContent changes
  useEffect(() => {
    fetchCourseContentDetails();
  }, [fetchCourseContentDetails]); // Now depends on the memoized callback

  const handleNewCourse = () => {
    if (isOwner) {
      // Reset form when opening
      setCourseTitle("");
      setCourseDescription("");
      setAccessType("open");
      setIsPublished(true);
      setCoursePrice("");
      setCourseCurrency('NGN');
      setAllowAnnualUpgrade(false);
      // Open the modal
      setIsCreateCourseDialogOpen(true);
    } else {
      toast({
        title: "Permission denied",
        description: "Only space owners can create courses",
        variant: "destructive"
      });
    }
  };

  const handleCreateCourse = async () => {
    setIsCreatingCourse(true);
    // Validate inputs
    if (!courseTitle.trim()) {
      toast({
        title: "Course title required",
        description: "Please enter a title for your course",
        variant: "destructive"
      });
      setIsCreatingCourse(false);
      return;
    }

    if (courseTitle.length > 50) {
      toast({
        title: "Title too long",
        description: "Course title must be 50 characters or less",
        variant: "destructive"
      });
      setIsCreatingCourse(false);
      return;
    }

    if (courseDescription.length > 5000) {
      toast({
        title: "Description too long",
        description: "Course description must be 5000 characters or less",
        variant: "destructive"
      });
      setIsCreatingCourse(false);
      return;
    }

    // Business rule: only free spaces can have a paid course
    if (space.pricing_type === 'paid' && accessType === 'paid') {
      toast({
        title: "Action not allowed",
        description: "Paid spaces cannot have paid courses at this time. Please set course access to 'Open'.",
        variant: "destructive"
      });
      setIsCreatingCourse(false);
      return;
    }

    let priceValue: number | null = null;
    if (accessType === "paid") {
      if (!coursePrice.trim()) {
        toast({
          title: "Price required",
          description: "Please enter a price for your paid course",
          variant: "destructive"
        });
        setIsCreatingCourse(false);
        return;
      }
      priceValue = parseFloat(coursePrice);
      if (isNaN(priceValue) || priceValue < 0) {
        toast({
          title: "Invalid price",
          description: "Please enter a valid positive price.",
          variant: "destructive"
        });
        setIsCreatingCourse(false);
        return;
      }
    }

    if (!user || !space.id) {
      toast({
        title: "Error",
        description: "User or Space information is missing.",
        variant: "destructive"
      });
      setIsCreatingCourse(false);
      return;
    }

    // Insert into Supabase
    const { data: newCourseData, error: insertError } = await supabase
      .from('courses')
      .insert({
        title: courseTitle.trim(),
        description: courseDescription.trim(),
        access_type: accessType,
        price: priceValue,
        is_published: isPublished,
        space_id: space.id,
        creator_id: user?.id,
        currency: courseCurrency,
      })
      .select()
      .single();

    setIsCreatingCourse(false);

    if (insertError) {
      console.error("Error creating course:", insertError);
      toast({
        title: "Failed to Create Course",
        description: insertError.message,
        variant: "destructive"
      });
      return;
    }

    if (newCourseData) {
      toast({
        title: "Course Created!",
        description: `"${newCourseData.title}" has been successfully created.`,
      });
      // Add to local state to update UI immediately
      // Map to CourseDisplayData before adding
      const newDisplayCourse: CourseDisplayData = {
        id: newCourseData.id,
        title: newCourseData.title,
        description: newCourseData.description,
        image_url: newCourseData.image_url,
        access_type: newCourseData.access_type as 'open' | 'paid',
        price: newCourseData.price,
        is_published: newCourseData.is_published,
        currency: courseCurrency,
        creator_id: newCourseData.creator_id,
        space_id: newCourseData.space_id,
        enrolled: false,
        weeks: 0,
        students: 0
      };
      setCourses(prevCourses => [newDisplayCourse, ...prevCourses]);
      setIsCreateCourseDialogOpen(false);
    }
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

  const handleOpenEditCourseDialog = (course: CourseDisplayData) => {
    if (!isOwner) { // Or check course.creator_id === user?.id
      toast({
        title: "Permission Denied",
        description: "You do not have permission to edit this course.",
        variant: "destructive",
      });
      return;
    }
    setEditingCourse(course);
    setEditCourseTitle(course.title);
    setEditCourseDescription(course.description || "");
    setEditAccessType(course.access_type);
    setEditIsPublished(course.is_published);
    setEditCoursePrice(course.price?.toString() || "");
    setEditCourseCurrency(course.currency || 'NGN');
    setIsEditCourseDialogOpen(true);
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    setIsUpdatingCourse(true);
    
    // Validation for title and description
    if (!editCourseTitle.trim()) {
      toast({
        title: "Course title required",
        description: "Please enter a title for your course",
        variant: "destructive"
      });
      setIsUpdatingCourse(false);
      return;
    }
    if (editCourseTitle.length > 50) {
      toast({
        title: "Title too long",
        description: "Course title must be 50 characters or less",
        variant: "destructive"
      });
      setIsUpdatingCourse(false);
      return;
    }
    if (editCourseDescription.length > 5000) {
      toast({
        title: "Description too long",
        description: "Course description must be 5000 characters or less",
        variant: "destructive"
      });
      setIsUpdatingCourse(false);
      return;
    }

    // Business rule: only free spaces can have a paid course
    if (space.pricing_type === 'paid' && editAccessType === 'paid') {
      toast({
        title: "Action not allowed",
        description: "Paid spaces cannot have paid courses at this time. Please set course access to 'Open'.",
        variant: "destructive"
      });
      setIsUpdatingCourse(false);
      return;
    }

    let priceValue: number | null = null;
    if (editAccessType === "paid") {
      if (!editCoursePrice.trim()) {
        toast({
          title: "Price required",
          description: "Please enter a price for your paid course",
          variant: "destructive"
        });
        setIsUpdatingCourse(false);
        return;
      }
      priceValue = parseFloat(editCoursePrice);
      if (isNaN(priceValue) || priceValue < 0) {
        toast({
          title: "Invalid price",
          description: "Please enter a valid positive price.",
          variant: "destructive"
        });
        setIsUpdatingCourse(false);
        return;
      }
    }
    
    // TODO: Implement Supabase update call
    console.log("Attempting to update course:", editingCourse.id, {
      title: editCourseTitle,
      description: editCourseDescription,
      access_type: editAccessType,
      price: priceValue,
      is_published: editIsPublished,
    });

    try {
      const { data: updatedCourseData, error: updateError } = await supabase
        .from('courses')
        .update({
          title: editCourseTitle.trim(),
          description: editCourseDescription.trim(),
          access_type: editAccessType,
          price: priceValue,
          is_published: editIsPublished,
          currency: editCourseCurrency,
          // image_url: newImageUrl, // If image editing is added
        })
        .eq('id', editingCourse.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (updatedCourseData) {
        toast({
          title: "Course Updated!",
          description: `"${updatedCourseData.title}" has been successfully updated.`,
        });
        // Update local state
        setCourses(prevCourses => 
          prevCourses.map(c => 
            c.id === updatedCourseData.id 
            ? { ...c, ...updatedCourseData, 
                // Ensure all fields of CourseDisplayData are present if not returned by select()
                title: updatedCourseData.title,
                description: updatedCourseData.description,
                image_url: updatedCourseData.image_url,
                access_type: updatedCourseData.access_type as 'open' | 'paid',
                price: updatedCourseData.price,
                is_published: updatedCourseData.is_published,
                currency: updatedCourseData.currency,
                // Retain existing students/weeks/enrolled if not part of update
                students: c.students, 
                weeks: c.weeks,
                enrolled: c.enrolled
              } 
            : c
          )
        );
        setIsEditCourseDialogOpen(false);
        setEditingCourse(null); // Clear editing state
      }
    } catch (error: any) {
      console.error("Error updating course:", error);
      toast({
        title: "Failed to Update Course",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCourse(false);
    }
  };

  const handleEnroll = async (courseToEnroll: CourseDisplayData) => {
    if (!user?.id) {
      toast({ title: "Login Required", description: "You must be logged in to enroll.", variant: "destructive" });
      return;
    }

    // Prevent space owner from "enrolling" via this button
    if (isOwner) {
      toast({ title: "Action Not Applicable", description: "As the space owner, you already have full access to manage this course.", variant: "default" });
      // Optionally, if an owner clicks an "Enroll" button somehow (UI should prevent this),
      // we could direct them to view the content.
      const courseToView = courses.find(c => c.id === courseToEnroll.id);
      if (courseToView) setViewingCourseContent(courseToView);
      return;
    }

    setIsProcessingEnrollment(courseToEnroll.id);
    try {
      // Check if already enrolled (though UI should prevent this call if so)
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('course_id', courseToEnroll.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingEnrollment) {
        toast({ title: "Already Enrolled", description: "You are already enrolled in this course." });
        setIsProcessingEnrollment(null);
        // If somehow they clicked enroll on an already enrolled course, take them to content
        setViewingCourseContent(courseToEnroll);
        return;
      }

      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({ course_id: courseToEnroll.id, user_id: user.id });

      if (enrollError) throw enrollError;

      toast({ title: "Successfully Enrolled!", description: "You can now access this course.", variant: "default" });
      // Update local state
      setCourses(prevCourses => prevCourses.map(c => 
        c.id === courseToEnroll.id 
        ? { ...c, enrolled: true, students: (c.students || 0) + 1, progress: c.progress !== undefined ? c.progress : 0 } // ensure progress is set
        : c
      ));
      // Navigate to course content after successful enrollment
      setViewingCourseContent(courseToEnroll);

    } catch (error: any) {
      console.error("Error enrolling in course:", error);
      toast({
        title: "Enrollment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingEnrollment(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!user?.id) {
      toast({ title: "Login Required", description: "You must be logged in to unenroll.", variant: "destructive" });
      return;
    }
    setIsProcessingEnrollment(courseId);
    try {
      const { error: unenrollError } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('course_id', courseId)
        .eq('user_id', user.id);

      if (unenrollError) throw unenrollError;

      toast({ title: "Successfully Unenrolled", description: "You are no longer enrolled in this course.", variant: "default" });
      // Update local state
      setCourses(prevCourses => prevCourses.map(c => 
        c.id === courseId 
        ? { ...c, enrolled: false, students: Math.max(0, (c.students || 0) - 1) } // Ensure students don't go below 0
        : c
      ));
    } catch (error: any) {
      console.error("Error unenrolling from course:", error);
      toast({ title: "Unenrollment Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessingEnrollment(null);
    }
  };

  const handleOpenAddModuleDialog = () => {
    setIsAddModuleDialogOpen(true);
  };

  const handleCreateModule = async (title: string, description: string, releaseDelayDays: number | null) => {
    if (!viewingCourseContent?.id || !user?.id) {
      toast({ title: "Error", description: "Course or user information is missing.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Module title required", description: "Please enter a title for the module.", variant: "destructive" });
      return;
    }

    setIsCreatingModule(true);
    try {
      const newModuleOrder = currentCourseModules.length + 1;

      const { data: newModule, error } = await supabase
        .from('course_modules')
        .insert({
          course_id: viewingCourseContent.id,
          title: title.trim(),
          description: description.trim(),
          module_order: newModuleOrder,
          release_delay_days: releaseDelayDays,
        })
        .select()
        .single();

      if (error) throw error;

      if (newModule) {
        setCurrentCourseModules(prevModules => [
          ...prevModules,
          { ...newModule, lessons: [] }, // Add with empty lessons array
        ]);
        toast({ title: "Module Added", description: `"${newModule.title}" has been successfully added.` });
        setIsAddModuleDialogOpen(false); // Close dialog on success
      }
    } catch (error: any) {
      console.error("Error creating module:", error);
      toast({ title: "Failed to Add Module", description: error.message, variant: "destructive" });
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleOpenEditModuleDialog = (moduleToEdit: CourseModuleWithLessons) => {
    setEditingModule(moduleToEdit);
    setIsEditModuleDialogOpen(true);
  };

  const handleUpdateModule = async (moduleId: string, title: string, description: string, releaseDelayDays: number | null) => {
    if (!title.trim()) { // Basic validation can stay, or be fully in dialog
      toast({ title: "Module title required", description: "Please enter a title for the module.", variant: "destructive" });
      return;
    }
    setIsUpdatingModule(true);
    try {
      const { data: updatedModule, error } = await supabase
        .from('course_modules')
        .update({
          title: title.trim(), // Uses passed-in title
          description: description.trim(), // Uses passed-in description
          release_delay_days: releaseDelayDays, // Uses passed-in releaseDelayDays
        })
        .eq('id', moduleId) // Uses passed-in moduleId
        .select()
        .single();

      if (error) throw error;

      if (updatedModule) {
        setCurrentCourseModules(prevModules => 
          prevModules.map(mod => 
            mod.id === updatedModule.id ? { ...mod, ...updatedModule } : mod
          )
        );
        toast({ title: "Module Updated", description: `\"${updatedModule.title}\" has been successfully updated.` });
        setIsEditModuleDialogOpen(false);
        setEditingModule(null);
      }
    } catch (error: any) {
      console.error("Error updating module:", error);
      toast({ title: "Failed to Update Module", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingModule(false);
    }
  };

  const handleOpenDeleteModuleConfirm = (module: CourseModuleWithLessons) => {
    setModuleToDelete(module);
    setIsDeleteModuleConfirmOpen(true);
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete || !viewingCourseContent?.id) {
      toast({ title: "Error", description: "Module or course data missing.", variant: "destructive" });
      return;
    }

    setIsDeletingModule(true);
    try {
      // 1. Delete all lessons associated with the module
      const { error: lessonsError } = await supabase
        .from('course_lessons')
        .delete()
        .eq('module_id', moduleToDelete.id);

      if (lessonsError) {
        console.error("Error deleting lessons for module:", lessonsError);
        throw new Error(`Failed to delete lessons: ${lessonsError.message}`);
      }

      // 2. Delete the module itself
      const { error: moduleError } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleToDelete.id);

      if (moduleError) {
        console.error("Error deleting module:", moduleError);
        throw new Error(`Failed to delete module: ${moduleError.message}`);
      }

      // 3. Re-order subsequent modules for the current course
      const { data: subsequentModules, error: fetchSubsequentError } = await supabase
        .from('course_modules')
        .select('id, module_order')
        .eq('course_id', viewingCourseContent.id) // Ensure we only reorder for the current course
        .gt('module_order', moduleToDelete.module_order)
        .order('module_order', { ascending: true });

      if (fetchSubsequentError) {
        console.error("Error fetching subsequent modules for reordering:", fetchSubsequentError);
        throw new Error(`Failed to fetch modules for reorder: ${fetchSubsequentError.message}`);
      }

      if (subsequentModules && subsequentModules.length > 0) {
        const updatePromises = subsequentModules.map(mod => 
          supabase
            .from('course_modules')
            .update({ module_order: mod.module_order - 1 })
            .eq('id', mod.id)
        );
        // Await all update promises
        const updateResults = await Promise.all(updatePromises);
        // Check for errors in any of the updates
        for (let i = 0; i < updateResults.length; i++) {
          const result = updateResults[i];
          if (result.error) {
            const failedModuleId = subsequentModules[i].id;
            console.error(`Error reordering module ${failedModuleId}:`, result.error);
            throw new Error(`Failed to reorder module ${failedModuleId}: ${result.error.message}`);
          }
        }
      }

      toast({ title: "Module Deleted", description: `"${moduleToDelete.title}" and its lessons have been successfully deleted and modules reordered.` });
      
      // 4. Refresh the module list from the DB
      await fetchCourseContentDetails(); 

      setIsDeleteModuleConfirmOpen(false);
      setModuleToDelete(null);

    } catch (error: any) {
      console.error("Detailed error during module deletion process:", error);
      toast({ title: "Failed to Delete Module", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsDeletingModule(false);
    }
  };

  const handleOpenAddLessonDialog = (moduleId: string) => {
    setAddingLessonToModuleId(moduleId);
    setNewLessonTitle("");
    setNewLessonContentType('text');
    setNewLessonContentText("");
    setNewLessonContentUrl("");
    setIsAddLessonDialogOpen(true);
  };

  const handleCreateLesson = async () => {
    if (!addingLessonToModuleId) {
      toast({ title: "Error", description: "Module ID is missing. Cannot add lesson.", variant: "destructive" });
      return;
    }
    if (!newLessonTitle.trim()) {
      toast({ title: "Lesson title required", description: "Please enter a title for the lesson.", variant: "destructive" });
      return;
    }

    let contentIsValid = true;
    let errorMessage = "";

    if (newLessonContentType === 'text' && !newLessonContentText.trim()) {
      contentIsValid = false;
      errorMessage = "Text content cannot be empty.";
    } else if ((newLessonContentType === 'video_embed' || newLessonContentType === 'external_link') && !newLessonContentUrl.trim()) {
      contentIsValid = false;
      errorMessage = "URL cannot be empty for video embeds or external links.";
    } else if ((newLessonContentType === 'video_embed' || newLessonContentType === 'external_link') && newLessonContentUrl.trim()) {
      try {
        new URL(newLessonContentUrl);
      } catch (_) {
        contentIsValid = false;
        errorMessage = "Please enter a valid URL (e.g., starting with http:// or https://).";
      }
    }

    if (!contentIsValid) {
      toast({ title: "Invalid Content", description: errorMessage, variant: "destructive" });
      return;
    }

    setIsCreatingLesson(true);
    try {
      const targetModule = currentCourseModules.find(m => m.id === addingLessonToModuleId);
      if (!targetModule) {
        toast({ title: "Error", description: "Target module not found.", variant: "destructive" });
        setIsCreatingLesson(false);
        return;
      }
      const newLessonOrder = targetModule.lessons.length + 1;

      const lessonDataToInsert: Omit<Tables<'course_lessons'>, 'id' | 'created_at' | 'updated_at'> = {
        module_id: addingLessonToModuleId,
        title: newLessonTitle.trim(),
        content_type: newLessonContentType,
        lesson_order: newLessonOrder,
        content_text: newLessonContentType === 'text' ? newLessonContentText.trim() : null,
        content_url: (newLessonContentType === 'video_embed' || newLessonContentType === 'external_link') ? newLessonContentUrl.trim() : null,
      };

      const { data: newLesson, error } = await supabase
        .from('course_lessons')
        .insert(lessonDataToInsert)
        .select()
        .single();

      if (error) throw error;

      if (newLesson) {
        setCurrentCourseModules(prevModules => 
          prevModules.map(mod => {
            if (mod.id === addingLessonToModuleId) {
              return {
                ...mod,
                lessons: [...mod.lessons, newLesson as CourseLessonData].sort((a,b) => a.lesson_order - b.lesson_order) // Add and re-sort
              };
            }
            return mod;
          })
        );
        toast({ title: "Lesson Added", description: `"${newLesson.title}" has been successfully added.` });
        setIsAddLessonDialogOpen(false);
        // Form fields are reset by handleOpenAddLessonDialog when it's next opened
      }
    } catch (error: any) {
      console.error("Error creating lesson:", error);
      toast({ title: "Failed to Add Lesson", description: error.message, variant: "destructive" });
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const handleOpenEditLessonDialog = (lesson: CourseLessonData) => {
    setEditingLesson(lesson);
    setIsEditLessonDialogOpen(true);
  };

  const handleUpdateLesson = async (lessonId: string, lessonDataToUpdate: Partial<Tables<'course_lessons'>>) => {
    if (lessonDataToUpdate.title !== undefined && !lessonDataToUpdate.title.trim()) {
        toast({ title: "Lesson title required", description: "Please enter a title for the lesson.", variant: "destructive" });
        return;
    }
    setIsUpdatingLesson(true);
    try {
      const { data: updatedLesson, error } = await supabase
        .from('course_lessons')
        .update(lessonDataToUpdate)
        .eq('id', lessonId)
        .select()
        .single();

      if (error) throw error;

      if (updatedLesson) {
        setCurrentCourseModules(prevModules => 
          prevModules.map(mod => {
            if (mod.id === updatedLesson.module_id) {
              return {
                ...mod,
                lessons: mod.lessons.map(l => 
                  l.id === updatedLesson.id ? (updatedLesson as CourseLessonData) : l
                ).sort((a,b) => a.lesson_order - b.lesson_order)
              };
            }
            return mod;
          })
        );
        toast({ title: "Lesson Updated", description: `\"${updatedLesson.title}\" has been successfully updated.` });
        setIsEditLessonDialogOpen(false);
        setEditingLesson(null); 
      }
    } catch (error: any) {
      console.error("Error updating lesson:", error);
      toast({ title: "Failed to Update Lesson", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingLesson(false);
    }
  };

  return (
    <div className="w-full bg-[#F5FAFA] p-6 rounded-xl">
      {/* New Course Modal */}
      <Dialog open={isCreateCourseDialogOpen} onOpenChange={setIsCreateCourseDialogOpen}>
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
                    <Label htmlFor="new-course-title" className="text-sm font-medium">Course Title</Label>
                <Input 
                      id="new-course-title" 
                      placeholder="e.g., Mastering Digital Art" 
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                      className="text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                />
                    <div className="text-xs text-gray-500 self-end text-right pr-1">
                  {courseTitle.length} / 50
                </div>
              </div>
              
                  <div className="grid gap-1.5">
                    <Label htmlFor="new-course-description" className="text-sm font-medium">Course Description</Label>
                <Textarea 
                      id="new-course-description" 
                      placeholder="Provide a compelling description of your new course..."
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                      className="min-h-[100px] text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                      rows={4}
                />
                    <div className="text-xs text-gray-500 self-end text-right pr-1">
                  {courseDescription.length} / 5000
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
                      <Image className="h-12 w-12 text-gray-400 mb-2" />
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
                      >
                        <div className="flex items-center">
                  <input 
                    type="radio" 
                            id="new-access-open" 
                            name="new-access-type" 
                    value="open"
                    checked={accessType === "open"}
                            onChange={() => setAccessType("open")} 
                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                  />
                  <div>
                            <label htmlFor="new-access-open" className="font-semibold text-gray-800 block text-sm cursor-pointer">Open</label>
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
                      >
                        <div className="flex items-center">
                  <input 
                    type="radio" 
                            id="new-access-paid" 
                            name="new-access-type" 
                    value="paid"
                    checked={accessType === "paid"}
                            onChange={() => setAccessType("paid")} 
                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                  />
                  <div>
                            <label htmlFor="new-access-paid" className="font-semibold text-gray-800 block text-sm cursor-pointer">Buy now</label>
                            <span className="text-xs text-gray-500 block">Members pay a 1-time price.</span>
                          </div>
                        </div>
                  </div>
                </div>
              </div>
              
              {accessType === "paid" && (
                     <div className="grid grid-cols-5 gap-x-3 items-end"> 
                        {/* Currency Selector */}
                        <div className="col-span-2 space-y-1.5">
                          <Label htmlFor="new-course-currency" className="text-sm font-medium">Currency</Label>
                          <select 
                            id="new-course-currency"
                            value={courseCurrency} 
                            onChange={(e) => setCourseCurrency(e.target.value)}
                            className="w-full text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm bg-white"
                          >
                            <option value="NGN">NGN (₦)</option>
                            <option value="USD">USD ($)</option>
                          </select>
                        </div>

                        {/* Price Input */}
                        <div className="col-span-3 space-y-1.5">
                          <Label htmlFor="new-course-price" className="text-sm font-medium">Price ({courseCurrency === 'USD' ? '$' : '₦'})</Label>
                          <div className="relative">
                            <Input 
                              id="new-course-price" 
                              type="number"
                              placeholder={courseCurrency === 'USD' ? "49.99" : "9999"} 
                              value={coursePrice} 
                              onChange={(e) => setCoursePrice(e.target.value)} 
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
                      onClick={togglePublished}
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
              <div>
                
              </div>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateCourseDialogOpen(false)}
                  className="px-6"
                  disabled={isCreatingCourse}
                >
                  CANCEL
                </Button>
                <Button 
                  onClick={handleCreateCourse}
                  className="bg-[#26A69A] hover:bg-[#20877A] text-white px-6"
                  disabled={isCreatingCourse}
                >
                  {isCreatingCourse ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isCreatingCourse ? "ADDING..." : "ADD"}
                </Button>
              </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={isEditCourseDialogOpen} onOpenChange={setIsEditCourseDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto !fixed !inset-0 !translate-x-0 !translate-y-0 m-auto">
          <DialogHeader className="pt-6 pb-4 px-6">
            <DialogTitle className="text-xl font-semibold">Edit Course</DialogTitle>
            <DialogDescription className="sr-only">
              Modify the details of your course.
            </DialogDescription>
          </DialogHeader>
          
          {editingCourse && (
            <>
              <div className="px-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="flex flex-col gap-y-6">
                    <div className="grid gap-1.5">
                      <Label htmlFor="edit-course-title" className="text-sm font-medium">Course Title</Label>
                      <Input 
                        id="edit-course-title" 
                        placeholder="e.g., Introduction to Web Development" 
                        value={editCourseTitle}
                        onChange={(e) => setEditCourseTitle(e.target.value)}
                        className="text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                      />
                      <div className="text-xs text-gray-500 self-end text-right pr-1">
                        {editCourseTitle.length} / 50
                      </div>
                    </div>
                    
                    <div className="grid gap-1.5">
                      <Label htmlFor="edit-course-description" className="text-sm font-medium">Course Description</Label>
                      <Textarea 
                        id="edit-course-description" 
                        placeholder="Describe your course in detail..." 
                        value={editCourseDescription}
                        onChange={(e) => setEditCourseDescription(e.target.value)}
                        className="min-h-[100px] text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
                        rows={4}
                      />
                      <div className="text-xs text-gray-500 self-end text-right pr-1">
                        {editCourseDescription.length} / 5000
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
                        <Image className="h-12 w-12 text-gray-400 mb-2" />
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
                          onClick={() => setEditAccessType("open")}
                          className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out 
                                      ${editAccessType === "open" 
                                        ? 'border-primary ring-2 ring-primary shadow-md bg-primary/5' 
                                        : 'border-gray-300 hover:border-gray-400 bg-white'}`}
                        >
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="edit-access-open" 
                              name="edit-access-type" 
                              value="open"
                              checked={editAccessType === "open"}
                              onChange={() => setEditAccessType("open")}
                              className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                            />
                            <div>
                              <label htmlFor="edit-access-open" className="font-semibold text-gray-800 block text-sm cursor-pointer">Open</label>
                              <span className="text-xs text-gray-500 block">All members can access.</span>
                            </div>
                </div>
              </div>
              
                        <div 
                          onClick={() => setEditAccessType("paid")}
                          className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out 
                                      ${editAccessType === "paid" 
                                        ? 'border-primary ring-2 ring-primary shadow-md bg-primary/5' 
                                        : 'border-gray-300 hover:border-gray-400 bg-white'}`}
                        >
              <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="edit-access-paid" 
                              name="edit-access-type" 
                              value="paid"
                              checked={editAccessType === "paid"}
                              onChange={() => setEditAccessType("paid")}
                              className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-3 shrink-0"
                            />
                            <div>
                              <label htmlFor="edit-access-paid" className="font-semibold text-gray-800 block text-sm cursor-pointer">Buy now</label>
                              <span className="text-xs text-gray-500 block">Members pay a 1-time price.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Price and Currency Section (if accessType is 'paid') */}
                    {editAccessType === "paid" && (
                      <div className="grid grid-cols-5 gap-x-3 items-end"> {/* Grid for Currency and Price */}
                        {/* Currency Selector */}
                        <div className="col-span-2 space-y-1.5">
                          <Label htmlFor="edit-course-currency" className="text-sm font-medium">Currency</Label>
                          <select 
                            id="edit-course-currency"
                            value={editCourseCurrency}
                            onChange={(e) => setEditCourseCurrency(e.target.value)}
                            className="w-full text-base py-2.5 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm bg-white"
                          >
                            <option value="NGN">NGN (₦)</option>
                            <option value="USD">USD ($)</option>
                          </select>
                        </div>

                        {/* Price Input - takes 3/5 width */}
                        <div className="col-span-3 space-y-1.5">
                          <Label htmlFor="edit-course-price" className="text-sm font-medium">
                            Price ({editCourseCurrency === 'USD' ? '$' : '₦'}) 
                          </Label>
                          <div className="relative">
                            <Input 
                              id="edit-course-price" 
                              type="number"
                              placeholder={editCourseCurrency === 'USD' ? "49.99" : "9999"} 
                              value={editCoursePrice}
                              onChange={(e) => setEditCoursePrice(e.target.value)}
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
                        aria-checked={editIsPublished}
                        onClick={() => setEditIsPublished(prev => !prev)}
                        className={`flex items-center justify-between w-full p-3 rounded-lg border cursor-pointer transition-all duration-200 ease-in-out 
                                    ${editIsPublished ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}
                      >
                        <div className="flex items-center">
                          <div 
                            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out 
                                        ${editIsPublished ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <div 
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out 
                                          ${editIsPublished ? 'translate-x-5' : 'translate-x-0'}`}
                    ></div>
                          </div>
                          <div className="ml-3">
                            <span className={`font-medium ${editIsPublished ? 'text-green-700' : 'text-gray-700'}`}>
                              {editIsPublished ? 'Published' : 'Draft'}
                            </span>
                            <p className={`text-xs ${editIsPublished ? 'text-green-600' : 'text-gray-500'}`}>
                              {editIsPublished 
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
              <div>
                  {/* Optional: Add a delete button here later */}
              </div>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                    onClick={() => {
                      setIsEditCourseDialogOpen(false);
                      setEditingCourse(null); // Clear editing state on cancel
                    }}
                  className="px-6"
                    disabled={isUpdatingCourse}
                >
                  CANCEL
                </Button>
                <Button 
                    onClick={handleUpdateCourse}
                    className="bg-[#26A69A] hover:bg-[#20877A] text-white px-6"
                    disabled={isUpdatingCourse}
                >
                    {isUpdatingCourse ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                    {isUpdatingCourse ? "SAVING..." : "SAVE CHANGES"}
                </Button>
              </div>
            </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lesson Content Modal - Replaced with component */}
      <LessonContentDialog
        isOpen={isLessonContentDialogOpen}
        onOpenChange={(isOpen) => {
          setIsLessonContentDialogOpen(isOpen);
          if (!isOpen) setViewingLesson(null); // Clear lesson when closing dialog
        }}
        lesson={viewingLesson}
        getEmbedUrl={getEmbedUrl} // Pass the helper function
      />

      {/* Add Module Modal - Replaced with component below */}
      <AddModuleDialog
        isOpen={isAddModuleDialogOpen}
        onOpenChange={setIsAddModuleDialogOpen}
        onCreateModule={handleCreateModule}
        isCreating={isCreatingModule}
        primaryColor={primaryColor}
      />

      {/* Edit Module Modal */}
      <EditModuleDialog
        isOpen={isEditModuleDialogOpen}
        onOpenChange={(isOpen) => {
          setIsEditModuleDialogOpen(isOpen);
          if (!isOpen) setEditingModule(null);
        }}
        moduleToEdit={editingModule}
        onUpdateModule={handleUpdateModule}
        isUpdating={isUpdatingModule}
        primaryColor={primaryColor}
      />

      {/* Delete Module Confirmation Dialog - Replaced with component */}
      <DeleteModuleConfirmDialog
        isOpen={isDeleteModuleConfirmOpen}
        onOpenChange={(isOpen) => {
          setIsDeleteModuleConfirmOpen(isOpen);
          if (!isOpen) setModuleToDelete(null); // Clear module to delete when dialog closes
        }}
        moduleToDelete={moduleToDelete}
        onConfirmDelete={handleDeleteModule}
        isDeleting={isDeletingModule}
      />

      {/* Add Lesson Dialog (Initial Structure) */}
      <Dialog open={isAddLessonDialogOpen} onOpenChange={setIsAddLessonDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
            {addingLessonToModuleId && (
              <DialogDescription>
                To module: {currentCourseModules.find(m => m.id === addingLessonToModuleId)?.title || 'Unknown Module'}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="lesson-title">Lesson Title</Label>
              <Input 
                id="lesson-title" 
                value={newLessonTitle} 
                onChange={(e) => setNewLessonTitle(e.target.value)} 
                placeholder="e.g., Understanding Core Concepts"
                className="text-base py-2.5 px-3"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Content Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {(['text', 'video_embed', 'external_link'] as const).map((type) => {
                  let label = "Text";
                  if (type === 'video_embed') label = "Video Embed";
                  if (type === 'external_link') label = "External Link";
                  return (
                    <div 
                      key={type}
                      onClick={() => setNewLessonContentType(type)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out text-sm 
                                  ${newLessonContentType === type 
                                    ? 'border-primary ring-2 ring-primary shadow-sm bg-primary/5' 
                                    : 'border-gray-300 hover:border-gray-400 bg-white'}`}
                    >
                      <div className="flex items-center">
                        <input 
                          type="radio" 
                          id={`lesson-type-${type}`} 
                          name="lesson-content-type" 
                          value={type}
                          checked={newLessonContentType === type}
                          onChange={() => setNewLessonContentType(type)} 
                          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary mr-2 shrink-0"
                        />
                        <label htmlFor={`lesson-type-${type}`} className="font-medium text-gray-700 cursor-pointer">{label}</label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {newLessonContentType === 'text' && (
              <div className="grid gap-1.5">
                <Label htmlFor="lesson-content-text">Lesson Content</Label>
                <Textarea 
                  id="lesson-content-text"
                  value={newLessonContentText}
                  onChange={(e) => setNewLessonContentText(e.target.value)}
                  placeholder="Enter the text content for this lesson..."
                  rows={6}
                  className="text-base py-2.5 px-3 min-h-[120px]"
                />
              </div>
            )}

            {(newLessonContentType === 'video_embed' || newLessonContentType === 'external_link') && (
              <div className="grid gap-1.5">
                <Label htmlFor="lesson-content-url">
                  {newLessonContentType === 'video_embed' ? 'Video Embed URL' : 'External Link URL'}
                </Label>
                <Input 
                  id="lesson-content-url"
                  type="url"
                  value={newLessonContentUrl}
                  onChange={(e) => setNewLessonContentUrl(e.target.value)}
                  placeholder={newLessonContentType === 'video_embed' 
                                ? "e.g., https://www.youtube.com/embed/VIDEO_ID" 
                                : "e.g., https://example.com/resource"}
                  className="text-base py-2.5 px-3"
                />
                {newLessonContentType === 'video_embed' && (
                  <p className="text-xs text-gray-500 pl-1">Tip: Use the embed URL from YouTube, Vimeo, etc.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLessonDialogOpen(false)} disabled={isCreatingLesson}>
              Cancel
            </Button>
            <Button onClick={handleCreateLesson} disabled={isCreatingLesson} style={{ backgroundColor: primaryColor, color: 'white'}}>
              {isCreatingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isCreatingLesson ? "Adding..." : "Add Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Dialog */} 
      <EditLessonDialog
        isOpen={isEditLessonDialogOpen}
        onOpenChange={(isOpen) => {
          setIsEditLessonDialogOpen(isOpen);
          if (!isOpen) setEditingLesson(null);
        }}
        lessonToEdit={editingLesson}
        onUpdateLesson={handleUpdateLesson}
        isUpdating={isUpdatingLesson}
        primaryColor={primaryColor}
      />

      {viewingCourseContent ? (
        // ============== COURSE CONTENT VIEW ============== 
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <Button 
            variant="outline" 
            onClick={() => {
              setViewingCourseContent(null);
              setCurrentCourseModules([]); // Clear modules when going back
            }}
            className="mb-6"
          >
            &larr; Back to Courses
          </Button>
          <h2 className="text-2xl font-semibold text-[#37474F] mb-2">{viewingCourseContent.title}</h2>
          <p className="text-gray-600 mb-6 line-clamp-3">{viewingCourseContent.description || "No description."}</p>
          
          {isLoadingCourseContent ? (
            <ModuleListSkeleton />
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-[#37474F]">Modules</h3>
                {isOwner && (
                  <Button onClick={handleOpenAddModuleDialog} size="sm" style={{ backgroundColor: primaryColor, color: 'white'}}>
                    <Plus className="mr-2 h-4 w-4" /> Add New Module
                  </Button>
                )}
              </div>
              {currentCourseModules.length > 0 ? (
                <div className="space-y-4">
                  {currentCourseModules.map(module => { // Outer map: explicit block
                    const accessible = isModuleAccessible(module, currentUserEnrollmentDateForViewedCourse, isOwner);
                    const releaseDateString = getModuleReleaseDateString(module, currentUserEnrollmentDateForViewedCourse);

                    return ( // Parenthesis for the return statement of the outer map's callback
                      <div key={module.id} className={`p-4 border rounded-lg bg-white relative group ${!accessible ? 'opacity-70 bg-gray-50' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-semibold text-lg text-gray-700 mb-1 pr-10 ${!accessible ? 'text-gray-500' : ''}`}>{module.title}</h4>
                            {module.description && <p className={`text-sm text-gray-600 mb-3 ${!accessible ? 'text-gray-500' : ''}`}>{module.description}</p>}
                            {!accessible && releaseDateString && (
                              <Badge variant="outline" className="mb-2 text-sm font-normal bg-amber-50 border-amber-300 text-amber-700">
                                <Calendar className="mr-2 h-3.5 w-3.5" />
                                Unlocks on {releaseDateString}
                              </Badge>
                            )}
                            {!accessible && !releaseDateString && !isOwner && (
                              <Badge variant="outline" className="mb-2 text-sm font-normal bg-gray-100 border-gray-300 text-gray-600">
                                <Calendar className="mr-2 h-3.5 w-3.5" />
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                          {isOwner && (
                            <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" className="h-7 w-7 p-0" onClick={() => handleOpenEditModuleDialog(module)}>
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit Module</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:border-red-300"
                                onClick={() => handleOpenDeleteModuleConfirm(module)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete Module</span>
                              </Button>
                            </div>
                          )}
                        </div>

                        {module.lessons && module.lessons.length > 0 ? ( // Ternary for lessons
                          <ul className={`space-y-2 pl-4 mt-2 border-t pt-3 ${!accessible ? 'pointer-events-none filter grayscale-[50%]' : ''}`}>
                            {module.lessons.map(lesson => ( // Inner map for lessons: implicit return for li
                            <li 
                              key={lesson.id} 
                                className={`p-3 border-l-2 border-gray-200 hover:bg-gray-50 rounded-r-md transition-colors duration-150 flex justify-between items-center group/lesson-item ${!accessible ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              onClick={() => {
                                  if (accessible) {
                                setViewingLesson(lesson);
                                setIsLessonContentDialogOpen(true);
                                  }
                                }}
                              >
                                <span className="text-gray-700 flex-grow mr-2 truncate" title={lesson.title}>{lesson.title}</span>
                                
                                <div className="flex items-center shrink-0">
                                  {/* Icon rendering logic block */}
                                  {lesson.content_type === 'video_embed' ? 
                                    (() => { // IIFE for video thumbnail
                                      const thumbnailUrl = getYouTubeThumbnailUrl(lesson.content_url);
                                      if (thumbnailUrl) {
                                        return ( // Parenthesis for this inner return
                                          <div className="relative w-24 h-14 rounded overflow-hidden shadow shrink-0 group/thumb mr-2">
                                            <img src={thumbnailUrl} alt={`Thumbnail for ${lesson.title}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200">
                                              <PlayCircle className="h-6 w-6 text-white" />
                                            </div>
                                          </div>
                                        ); // Closing parenthesis for inner return
                                      } else {
                                        return <Video className="h-5 w-5 text-gray-500 shrink-0 mr-2" />; 
                                      }
                                    })() // IIFE invoked
                                  : lesson.content_type === 'external_link' ? 
                                    ( <FileText className="h-4 w-4 text-gray-500 shrink-0 mr-2" /> ) // Ternary branch
                                  : 
                                    ( <FileText className="h-3.5 w-3.5 text-gray-500 shrink-0 mr-2" /> ) // Ternary branch
                                  } {/* Closing brace for icon rendering logic block */}

                                  {isOwner && (
                                    <Button 
                                      variant="ghost" 
                                      className="h-7 w-7 p-0 opacity-0 group-hover/lesson-item:opacity-100 transition-opacity text-gray-500 hover:text-primary"
                                      onClick={(e) => {
                                        e.stopPropagation(); 
                                        handleOpenEditLessonDialog(lesson);
                                      }}
                                      title="Edit Lesson"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      <span className="sr-only">Edit Lesson</span>
                                    </Button>
                                  )}
                                </div> {/* Closing div for icon and edit button area */}
                              </li> // Closing li
                            ))} {/* Closing for module.lessons.map: )) */}
                        </ul>
                        ) : ( // Else for lessons ternary
                          <p className={`text-sm text-gray-500 italic ${!accessible ? 'filter grayscale-[50%]' : ''}`}>No lessons in this module yet.</p>
                        )} {/* Closing parenthesis for lessons ternary */}

                        {isOwner && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-sm"
                              onClick={() => handleOpenAddLessonDialog(module.id)}
                              style={{borderColor: primaryColor, color: primaryColor}}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Add New Lesson to this Module
                            </Button>
                          </div>
                        )}
                      </div> // Closing main div for the module
                    ); // Closing parenthesis for the return statement of the outer map's callback
                  })} {/* Closing for outer map: } for block, ) for map call */}
                </div>
              ) : (
                <p>No modules available for this course yet.</p>
              )} {/* Closing parenthesis for currentCourseModules.length > 0 ternary*/}
            </div>
          )}
        </div>
      ) : (
        // ============== COURSES GRID VIEW ============== 
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
                  {!isOwner && (
                  <TabsTrigger 
                    value="my-courses"
                    className={`px-3 text-sm ${activeTab === "my-courses" ? "bg-[#E0F2F1] text-[#26A69A]" : ""}`}
                  >
                    My Courses
                  </TabsTrigger>
                  )}
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
              
              {/* {isOwner && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-sm whitespace-nowrap"
                  onClick={handleNewCourse}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Course
                </Button>
              )} Removed this button as per user request - owners use the placeholder card */}
            </div>
          </div>
          
          {/* Course grid */}
          {isLoadingCourses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <CourseCardSkeleton key={index} />
              ))}
            </div>
          ) : searchedCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* "New Course" Card - only for space owner */}
              {isOwner && activeTab === "all-courses" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center min-h-[280px] border-2 border-dashed border-gray-300 hover:border-primary group"
                  onClick={handleNewCourse}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNewCourse(); }}
                  aria-label="Create new course"
                >
                  <Plus className="h-14 w-14 text-primary mb-4 transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-1 group-hover:text-primary transition-colors duration-300">Create New Course</h3>
                  <p className="text-sm text-gray-500 text-center">Expand your classroom by adding a new course.</p>
                </motion.div>
              )}

              {/* Actual Course Cards */}
              {searchedCourses.map((course) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }} // Stagger animation
                  className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out overflow-hidden flex flex-col group relative ${
                    !isOwner && course.enrolled ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (!isOwner && course.enrolled) {
                      setViewingCourseContent(course);
                    }
                  }}
                >
                  {/* DRAFT Badge - Improved Styling & Position */}
                  {!course.is_published && (
                    <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 px-2.5 py-1 rounded-md text-xs font-semibold z-10 shadow">
                      DRAFT
                    </div>
                  )}

                  <div className="relative w-full h-40 bg-gray-200 group-hover:opacity-90 transition-opacity duration-300"> {/* Reduced height from h-48 to h-40 */}
                    {course.image_url ? (
                      <img src={course.image_url} alt={course.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <Book className="h-12 w-12 text-slate-400" /> {/* Reduced icon size slightly */}
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow"> {/* Reduced padding from p-5 to p-4 */}
                    <h3 
                      className="text-md font-semibold text-gray-800 mb-1 truncate group-hover:text-primary transition-colors duration-200"  /* Reduced font size, margin */
                      title={course.title}
                    >
                      {course.title || "Untitled Course"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-grow min-h-[40px]" title={course.description ?? undefined}> {/* Reduced min-height, margin */}
                      {course.description || "No description available."}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2.5"> {/* Reduced margin */}
                      {isOwner && (
                        <span className="flex items-center">
                          <Users className="h-3.5 w-3.5 mr-1 text-gray-400" /> {course.students} student{course.students !== 1 && 's'}
                        </span>
                      )}
                          {course.access_type === 'paid' && course.price != null && (
                        <span 
                          className={`font-semibold text-gray-700 text-base ${!isOwner ? 'ml-auto' : ''}`} // if not owner, push price to the right
                          style={{color: primaryColor}}
                        >
                          {course.currency === 'USD' ? '$' : '₦'}
                          {course.currency === 'NGN' 
                            ? new Intl.NumberFormat('en-NG').format(course.price) 
                            : course.price.toFixed(2)}
                            </span>
                          )}
                      </div>

                    {/* Separator - subtle line */}
                    <Separator className="my-3 bg-gray-100" />

                    <div className="mt-auto"> 
                      <div className="flex flex-col space-y-2">
                        {isOwner ? (
                          // Owner buttons
                          <>
                      <Button 
                        size="sm" 
                              className="w-full font-medium"
                              style={{ 
                                backgroundColor: primaryColor, 
                                color: 'white',
                              }}
                              onClick={(e) => { 
                                e.stopPropagation(); // Prevent card click if owner clicks button
                            setViewingCourseContent(course); 
                              }}
                            >
                              {course.is_published ? "View Course" : "Preview & Edit"}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={(e) => { 
                                e.stopPropagation(); // Prevent card click
                                handleOpenEditCourseDialog(course); 
                              }}
                            >
                              Edit Details
                            </Button>
                          </>
                        ) : course.enrolled ? (
                          // Non-owner, enrolled: No buttons, card is clickable
                          // Optional: Add a subtle hint that the card is clickable, e.g. an icon or text on hover
                          // For now, the cursor change and direct navigation on click should suffice.
                          <div className="text-center py-2">
                            {!isOwner && course.enrolled && course.progress !== undefined && (
                              <div className="mb-2 px-1">
                                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                                  <span>Progress</span>
                                  <span>{course.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${course.progress}%`, backgroundColor: primaryColor }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            <span className="text-sm text-gray-500">You are enrolled. Click card to view.</span>
                          </div>
                        ) : (
                          // Non-owner, not enrolled buttons
                          <Button 
                            size="sm" 
                            className="w-full font-medium"
                            style={{ 
                              backgroundColor: primaryColor, 
                              color: 'white',
                              opacity: isProcessingEnrollment === course.id ? 0.7 : 1
                            }}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              if (course.access_type === 'open' || (course.access_type === 'paid' && (!course.price || course.price === 0))) {
                                handleEnroll(course); // Pass the full course object
                              } else if (course.access_type === 'paid') {
                                toast({ 
                                  title: "Paid Course", 
                                  description: `Enrollment for "${course.title}" is through a purchase process. This is coming soon!` 
                                });
                              }
                            }}
                            disabled={isProcessingEnrollment === course.id} 
                          >
                            {isProcessingEnrollment === course.id ? ( 
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                            {course.access_type === 'open' || (course.access_type === 'paid' && (!course.price || course.price === 0))
                              ? "Enroll & View Course" // Updated text
                              : `Buy for ${course.currency === 'USD' ? '$' : '₦'}${course.currency === 'NGN' ? new Intl.NumberFormat('en-NG').format(course.price) : course.price.toFixed(2)}` 
                            }
                        </Button>
                      )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
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
        </div>
      </div>
      )}
    </div>
  );
} 