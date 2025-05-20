import { useState } from "react";
import PostCard from "./PostCard";

export default function PostCardDemo() {
  // Sample post data
  const samplePosts = [
    {
      id: "1",
      author: {
        id: "user1",
        name: "Jane Smith",
        avatar: "https://i.pravatar.cc/300?img=1"
      },
      content: "Just joined this space! Looking forward to connecting with everyone and learning together. What's everyone working on right now?",
      createdAt: new Date(Date.now() - 3600000 * 2),
      likes: 12,
      comments: 5
    },
    {
      id: "2",
      author: {
        id: "user2",
        name: "John Doe",
        avatar: "https://i.pravatar.cc/300?img=2"
      },
      content: "I just published a new tutorial on React hooks. Check it out and let me know what you think! I'm especially interested in feedback on the useEffect examples.",
      createdAt: new Date(Date.now() - 3600000 * 24),
      likes: 24,
      comments: 8
    },
    {
      id: "3",
      author: {
        id: "user3",
        name: "Alex Johnson",
        avatar: "https://i.pravatar.cc/300?img=3"
      },
      content: "Has anyone here used the new Supabase Edge Functions? I'm considering using them for my next project and would love to hear about real-world experiences.",
      createdAt: new Date(Date.now() - 3600000 * 48),
      likes: 7,
      comments: 15
    }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#111827] mb-6">Post Card Demo</h1>
      
      <div className="space-y-6">
        {samplePosts.map(post => (
          <PostCard
            key={post.id}
            author={post.author}
            content={post.content}
            createdAt={post.createdAt}
            likes={post.likes}
            comments={post.comments}
          />
        ))}
      </div>
    </div>
  );
} 