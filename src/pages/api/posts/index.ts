import { getSupabaseClient } from '@/integrations/supabase/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, content, space_id } = req.body;

    if (!space_id) {
      return res.status(400).json({ error: 'Space ID is required' });
    }

    // Check if user is a member or admin of the space
    const { data: membership, error: membershipError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', space_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        title: title || null,
        content,
        space_id,
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return res.status(500).json({ error: 'Error creating post' });
    }

    return res.status(200).json(post);
  } catch (error) {
    console.error('Error in posts API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 