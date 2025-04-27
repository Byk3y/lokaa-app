import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Star, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JoinedSpacesSection from "@/components/dashboard/JoinedSpacesSection";
import FeaturedSpaces from "@/components/dashboard/FeaturedSpaces";
import { useAuth } from "@/contexts/AuthContext";
import useSpacesData from "@/hooks/useSpacesData";
import DashboardLayout from '../components/dashboard/DashboardLayout';
import SpacesList from '../components/spaces/SpacesList';
import { fetchUserSpaces } from '../utils/spaceUtils';
import { Bell, Plus } from 'lucide-react';
import { Space } from '../types/space';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const { 
    joinedSpaces, 
    setJoinedSpaces, 
    trendingSpaces, 
    featuredSpaces,
    loading: spacesDataLoading 
  } = useSpacesData();
  
  // Analytics data (this would come from Supabase in a real implementation)
  const analytics = {
    totalMembers: 0,
    activeMembers: 0,
    totalPosts: 0,
    totalRevenue: 0.00
  };

  const isCreator = user?.role === 'creator';

  useEffect(() => {
    console.log('Dashboard: Component mounted');
    
    // If no user, redirect to signin
    if (!user) {
      console.log('Dashboard: No user found, redirecting to signin');
      navigate('/signin');
      return;
    }
    
    // Special handling for test account
    if (user.email === 'francischukwuma706@gmail.com') {
      console.log('Dashboard: Test account detected, redirecting to discover page');
      navigate('/discover');
      return;
    }

    const loadSpaces = async () => {
      console.log('Dashboard: Loading spaces for user');
      setLoading(true);
      
      try {
        // Fetch user spaces
        const userSpaces = await fetchUserSpaces(user.id);
        console.log('Dashboard: Fetched spaces:', userSpaces);
        
        if (userSpaces && userSpaces.length > 0) {
          setSpaces(userSpaces);
          
          // If there are spaces, redirect to the first one
          if (window.location.pathname === '/dashboard') {
            console.log('Dashboard: Redirecting to first space:', userSpaces[0].subdomain);
            navigate(`/space/${userSpaces[0].subdomain}`);
          }
        } else {
          console.log('Dashboard: No spaces found, redirecting to discover page');
          
          // If no spaces found, redirect to the discover page
          if (window.location.pathname === '/dashboard') {
            console.log('Dashboard: Redirecting to discover page');
            navigate('/discover');
          }
        }
      } catch (error) {
        console.error('Dashboard: Error loading spaces:', error);
        setSpaces([]);
        
        // On error, redirect to discover page
        if (window.location.pathname === '/dashboard') {
          console.log('Dashboard: Error occurred, redirecting to discover page');
          navigate('/discover');
        }
      } finally {
        setLoading(false);
      }
    };

    loadSpaces();
  }, [user, navigate]);

  const createNewSpace = () => {
    navigate('/create-space');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Your Spaces</h1>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
            
            <button
              onClick={createNewSpace}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-5 w-5 mr-1" />
              New Space
            </button>
          </div>
        </div>

        <SpacesList spaces={spaces} loading={loading} />
      </div>
    </DashboardLayout>
  );
}
