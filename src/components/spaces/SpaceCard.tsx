
import { Link } from "react-router-dom";
import { Users, MessageSquare, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

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
}: SpaceCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300 h-full flex flex-col">
      <div className="relative h-32 w-full">
        <img
          src={coverImage}
          alt={name}
          className="h-full w-full object-cover"
        />
        {isPaid && (
          <Badge className="absolute top-2 right-2 bg-lokaa-600">
            {price ? `$${price.toFixed(2)}/mo` : "Premium"}
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <h3 className="text-xl font-semibold truncate">{name}</h3>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{description}</p>
        
        <div className="flex text-sm text-gray-500 space-x-4">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{memberCount}</span>
          </div>
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>{postCount}</span>
          </div>
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-1" />
            <span>{upcomingEvents}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 border-t">
        <Link
          to={`/spaces/${id}`}
          className="text-lokaa-600 hover:text-lokaa-700 font-medium text-sm flex items-center"
        >
          View Space
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </CardFooter>
    </Card>
  );
}
