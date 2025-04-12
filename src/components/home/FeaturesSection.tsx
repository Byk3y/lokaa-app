
import { 
  Users, MessageSquare, Calendar, BookOpen, CreditCard, Award, Globe, Shield 
} from "lucide-react";

const features = [
  {
    icon: <Users className="h-8 w-8 text-lokaa-600" />,
    title: "Community Spaces",
    description: "Create dedicated spaces for your communities with custom branding and subdomain."
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-lokaa-600" />,
    title: "Engaging Feed",
    description: "Build an interactive feed with posts, comments, and reactions to foster community engagement."
  },
  {
    icon: <Calendar className="h-8 w-8 text-lokaa-600" />,
    title: "Event Management",
    description: "Schedule and host events with RSVPs, reminders, and calendar integration."
  },
  {
    icon: <BookOpen className="h-8 w-8 text-lokaa-600" />,
    title: "Course Platform",
    description: "Create and sell courses with modules, lessons, and progress tracking."
  },
  {
    icon: <CreditCard className="h-8 w-8 text-lokaa-600" />,
    title: "Local Payments",
    description: "Accept payments via Flutterwave, Paystack, M-Pesa, and MercadoPago."
  },
  {
    icon: <Award className="h-8 w-8 text-lokaa-600" />,
    title: "Gamification",
    description: "Boost engagement with points, badges, and leaderboards to reward active members."
  },
  {
    icon: <Globe className="h-8 w-8 text-lokaa-600" />,
    title: "Optimized Experience",
    description: "Built for emerging markets with low data usage and offline support."
  },
  {
    icon: <Shield className="h-8 w-8 text-lokaa-600" />,
    title: "Referral System",
    description: "Grow your community with built-in referral tools that reward members."
  }
];

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to build your community</h2>
          <p className="text-xl text-gray-600">
            Powerful tools designed specifically for creators in emerging markets to connect, engage, and monetize.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="h-14 w-14 rounded-lg bg-lokaa-50 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
