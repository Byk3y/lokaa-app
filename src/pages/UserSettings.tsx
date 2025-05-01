import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, EyeOff, Settings, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("communities");
  
  // Get user's initials
  const getUserInitials = () => {
    if (!user) return "NA";
    
    if (user.user_metadata?.firstName && user.user_metadata?.lastName) {
      return `${user.user_metadata.firstName.charAt(0)}${user.user_metadata.lastName.charAt(0)}`;
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return "NA";
  };

  const communities = [
    {
      id: "nextpath-ai",
      name: "nextpath ai",
      members: "1 member",
      type: "Free",
      logo: "NA"
    },
    {
      id: "ai-automation",
      name: "AI Automation Society",
      members: "51k members",
      type: "Free",
      logo: "AIS"
    },
    {
      id: "skoolers",
      name: "Skoolers",
      members: "51.4k members",
      type: "Free",
      logo: "SK"
    },
    {
      id: "automation-university",
      name: "Automation University",
      members: "3k members",
      type: "Free",
      logo: "AU"
    },
    {
      id: "ai-automations",
      name: "AI Automations by Kia",
      members: "3.5k members",
      type: "Free",
      logo: "AIK"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/skool-logo.svg" 
              alt="Skool" 
              className="h-8" 
              onError={(e) => {
                // Fallback to text if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="text-3xl font-bold">
              <span className="text-[#405DE6]">s</span>
              <span className="text-[#5B51D8]">k</span>
              <span className="text-[#833AB4]">o</span>
              <span className="text-[#C13584]">o</span>
              <span className="text-[#E1306C]">l</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold">
              {getUserInitials()}
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto py-8 px-6">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64">
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="bg-amber-500 w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold mx-auto mt-6 mb-2">
                {getUserInitials()}
              </div>
              
              <nav className="py-6">
                <div className={`px-6 py-3 ${activeTab === "communities" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("communities")}
                  >
                    Communities
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "profile" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("profile")}
                  >
                    Profile
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "affiliates" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("affiliates")}
                  >
                    Affiliates
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "payouts" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("payouts")}
                  >
                    Payouts
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "account" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("account")}
                  >
                    Account
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "notifications" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("notifications")}
                  >
                    Notifications
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "chat" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("chat")}
                  >
                    Chat
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "payment-methods" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("payment-methods")}
                  >
                    Payment methods
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "payment-history" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("payment-history")}
                  >
                    Payment history
                  </button>
                </div>
                
                <div className={`px-6 py-3 ${activeTab === "theme" ? "bg-amber-100" : ""}`}>
                  <button
                    className="w-full text-left font-medium"
                    onClick={() => setActiveTab("theme")}
                  >
                    Theme
                  </button>
                </div>
              </nav>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg p-6">
              {activeTab === "communities" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Communities</h2>
                  <p className="text-gray-600 mb-6">Drag and drop to reorder, pin to sidebar, or hide.</p>
                  
                  <div className="space-y-4">
                    {communities.map((community) => (
                      <div key={community.id} className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {community.logo}
                          </div>
                          <div>
                            <h3 className="font-medium">{community.name}</h3>
                            <p className="text-sm text-gray-500">{community.members} • {community.type}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            className="px-4"
                          >
                            SETTINGS
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-5 w-5 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-5 w-5 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab !== "communities" && (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <h3 className="text-xl font-medium text-gray-600 mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</h3>
                    <p className="text-gray-500">This section is under development</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 