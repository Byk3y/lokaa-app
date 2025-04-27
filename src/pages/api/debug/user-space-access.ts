import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create authenticated Supabase client
  const supabase = createServerSupabaseClient({ req, res });

  // Check if the user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  try {
    const { action, spaceId } = req.body;

    // Validate required fields
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Check if user has admin role (optional extra security)
    // const { data: userRoles } = await supabase
    //   .from('user_roles')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .eq('role', 'admin');
    
    // if (!userRoles || userRoles.length === 0) {
    //   return res.status(403).json({ error: 'Forbidden: Admin access required' });
    // }

    let result: any = {};

    if (action === 'debug') {
      // Get user's owned spaces
      const { data: ownedSpaces, error: ownedSpacesError } = await supabase
        .from('spaces')
        .select('*')
        .eq('created_by', userId);

      if (ownedSpacesError) {
        return res.status(500).json({ error: ownedSpacesError.message });
      }

      // Get space access records
      const { data: accessRecords, error: accessError } = await supabase
        .from('space_access')
        .select('*')
        .eq('user_id', userId);

      if (accessError) {
        return res.status(500).json({ error: accessError.message });
      }

      result = {
        userId,
        ownedSpaces,
        accessRecords,
      };
    } 
    else if (action === 'ensure') {
      if (!spaceId) {
        return res.status(400).json({ error: 'Space ID is required for ensure action' });
      }

      // Check if space exists
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();

      if (spaceError) {
        return res.status(404).json({ error: 'Space not found' });
      }

      // Check if user already has access
      const { data: existingAccess, error: accessCheckError } = await supabase
        .from('space_access')
        .select('*')
        .eq('user_id', userId)
        .eq('space_id', spaceId);

      if (accessCheckError) {
        return res.status(500).json({ error: accessCheckError.message });
      }

      // If no access record exists, create one
      if (!existingAccess || existingAccess.length === 0) {
        const { data: newAccess, error: createAccessError } = await supabase
          .from('space_access')
          .insert([
            {
              user_id: userId,
              space_id: spaceId,
              role: 'member',
              status: 'active',
            },
          ]);

        if (createAccessError) {
          return res.status(500).json({ error: createAccessError.message });
        }

        result = {
          status: 'access_granted',
          space,
        };
      } else {
        result = {
          status: 'access_already_exists',
          existingAccess,
        };
      }
    }
    else if (action === 'fix-automation-jungle') {
      // Special fix for Automation Jungle space access issues
      const AUTOMATION_JUNGLE_ID = process.env.AUTOMATION_JUNGLE_SPACE_ID;
      
      if (!AUTOMATION_JUNGLE_ID) {
        return res.status(500).json({ error: 'Automation Jungle space ID not configured' });
      }

      // Check if user already has access
      const { data: existingAccess, error: accessCheckError } = await supabase
        .from('space_access')
        .select('*')
        .eq('user_id', userId)
        .eq('space_id', AUTOMATION_JUNGLE_ID);

      if (accessCheckError) {
        return res.status(500).json({ error: accessCheckError.message });
      }

      // If no access record exists, create one
      if (!existingAccess || existingAccess.length === 0) {
        const { data: newAccess, error: createAccessError } = await supabase
          .from('space_access')
          .insert([
            {
              user_id: userId,
              space_id: AUTOMATION_JUNGLE_ID,
              role: 'member',
              status: 'active',
            },
          ]);

        if (createAccessError) {
          return res.status(500).json({ error: createAccessError.message });
        }

        result = {
          status: 'automation_jungle_access_granted',
        };
      } else {
        result = {
          status: 'automation_jungle_access_already_exists',
        };
      }
    }
    else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('Debug API error:', error.message);
    return res.status(500).json({ error: 'An error occurred on the server' });
  }
} 