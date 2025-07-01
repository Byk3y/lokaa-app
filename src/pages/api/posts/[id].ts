import { getSupabaseClient } from '@/integrations/supabase/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    // Get the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, space:spaces(id)')
      .eq('id', id)
      .single();

    if (postError) {
      if (postError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Post not found' });
      }
      console.error('Error fetching post:', postError);
      return res.status(500).json({ error: 'Error fetching post' });
    }

    // Check if user is a member of the space
    const { data: membership, error: membershipError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', post.space.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    return res.status(200).json(post);
  } catch (error) {
    console.error('Error in posts API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 