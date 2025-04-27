import { Link } from "react-router-dom";
import { Users, MessageSquare, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMemo } from "react";

interface SpaceCardProps {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  memberCount: number;
  postCount: number;
  upcomingEvents: number;
  isPaid: boolean;
  price?: number;
  instructor?: string;
  subdomain?: string;
  onClick?: () => void; // Optional click handler for card selection
  linkType?: 'about' | 'space';
}

export default function SpaceCard({
  id,
  name,
  description,
  coverImage,
  memberCount,
  postCount,
  upcomingEvents,
  isPaid,
  price,
  instructor = "Community Admin",
  subdomain,
  onClick,
  linkType = 'about',
}: SpaceCardProps) {
  // Get instructor initial for avatar
  const getInitial = (name: string) => name.charAt(0).toUpperCase();
  
  // Determine the space link
  const spaceLink = useMemo(() => {
    // If onClick is provided, return null (will use onClick instead of href)
    if (onClick) return null;
    
    // Otherwise return the appropriate link based on linkType
    switch (linkType) {
      case 'about':
        return `/${subdomain}/about`;
      case 'space':
        return `/${subdomain}`;
      default:
        return `/${subdomain}/about`;
    }
  }, [onClick, subdomain, linkType]);

  // Format price display
  const priceDisplay = price ? `$${price.toFixed(2)}/mo` : "";
  
  return (
    <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col border border-gray-200" onClick={onClick}>
      <div className="relative h-52 w-full">
        <img
          src={coverImage || "/default-space-cover.jpg"}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/default-space-cover.jpg";
          }}
        />
        {isPaid && (
          <Badge className="absolute top-3 right-3 bg-purple-600 text-white font-medium px-3 py-1 rounded-full">
            {priceDisplay}
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-0 pt-4 px-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{name}</h3>
          </div>
          <Avatar className="h-10 w-10 bg-indigo-100 text-indigo-600">
            <AvatarFallback>{getInitial(instructor)}</AvatarFallback>
          </Avatar>
        </div>
        <p className="text-sm text-gray-500">by {instructor}</p>
      </CardHeader>
      
      <CardContent className="flex-grow px-5 py-3">
        <p className="text-gray-700 text-sm line-clamp-2 mb-4">{description}</p>
        
        <div className="grid grid-cols-3 text-sm text-gray-500 gap-2">
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
            <Users className="h-4 w-4 mb-1 text-gray-400" />
            <span className="font-medium">{memberCount}</span>
            <span className="text-xs">Members</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
            <MessageSquare className="h-4 w-4 mb-1 text-gray-400" />
            <span className="font-medium">{postCount}</span>
            <span className="text-xs">Posts</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
            <CalendarDays className="h-4 w-4 mb-1 text-gray-400" />
            <span className="font-medium">{upcomingEvents}</span>
            <span className="text-xs">Events</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 pb-4 px-5">
        {onClick ? (
          <button
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm py-2.5 px-4 rounded-full flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            View space
          </button>
        ) : (
        <a
            href={spaceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm py-2.5 px-4 rounded-full flex items-center justify-center transition-colors"
          >
            Learn more
        </a>
        )}
      </CardFooter>
    </Card>
  );
}
