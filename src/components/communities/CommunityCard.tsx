
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface CommunityCardProps {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  member_count?: number;
  owner_id?: string;
  is_paid?: boolean;
  price_per_month?: number;
}

export default function CommunityCard({ 
  id, 
  name, 
  description, 
  cover_image, 
  member_count, 
  is_paid, 
  price_per_month 
}: CommunityCardProps) {
  
  return (
    <Card className="overflow-hidden h-full hover:shadow-md transition-shadow">
      <Link to={`/communities/${id}`} className="block h-full">
        <div className="h-24 bg-gradient-to-r from-lokaa-600 to-lokaa-400 relative">
          {cover_image && (
            <img 
              src={cover_image} 
              alt={name} 
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        <CardHeader className="pt-4 pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-2">
                <AvatarImage src={cover_image} />
                <AvatarFallback className="bg-lokaa-100 text-lokaa-700">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{name}</CardTitle>
                {is_paid && (
                  <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200">
                    ${price_per_month?.toFixed(2)}/month
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <CardDescription className="line-clamp-2 h-10">
            {description || "Join this community to connect with like-minded people."}
          </CardDescription>
        </CardContent>
        
        <CardFooter className="flex justify-between text-sm text-gray-500 pt-0">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{member_count || 0} members</span>
          </div>
          {is_paid ? (
            <Badge variant="secondary" className="bg-lokaa-50 text-lokaa-700 border-lokaa-100">
              Paid
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100">
              Free
            </Badge>
          )}
        </CardFooter>
      </Link>
    </Card>
  );
}
