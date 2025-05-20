import { NextApiRequest, NextApiResponse } from 'next';
// import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'; // Old import
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // New import

// Define interfaces for the debug result
interface DebugSpace {
  id: string;
  name: string;
  subdomain: string;
  owner_id: string;
  // Add other relevant space properties from your 'spaces' table if needed
  [key: string]: unknown; // Allow other properties since select('*') is used
}

interface DebugSpaceInfoForMember {
  name: string;
  subdomain: string;
}

interface DebugMemberRecord {
  user_id: string;
  space_id: string;
  role?: string; // Assuming role is a field in space_members
  is_active?: boolean;
  space: DebugSpaceInfoForMember | null; // space can be null if join fails or no match
  // Add other relevant member properties from your 'space_members' table if needed
  [key: string]: unknown; // Allow other properties since select('*') is used for member record itself
}

interface DebugResult {
  userId: string;
  ownedSpaces: DebugSpace[] | null;
  memberRecords: DebugMemberRecord[] | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create authenticated Supabase client using @supabase/ssr
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          // res.setHeader('Set-Cookie', ...) needs to be handled carefully for multiple cookies
          // For simplicity in this API route, we'll assume single cookie operations or rely on Supabase's internal handling if it sets multiple.
          // A more robust solution might involve a cookie serialization library if multiple cookies are set by Supabase client.
          // However, for typical auth operations, Supabase client often manages its cookie itself.
          // Let's try a direct approach.
          // Note: This might need adjustment if Supabase sets multiple cookies that need to be merged.
          // A common pattern is to use an array for Set-Cookie header.
          let setCookieHeader = res.getHeader('Set-Cookie') || [];
          if (!Array.isArray(setCookieHeader)) {
            setCookieHeader = [String(setCookieHeader)];
          }
          
          const cookieParts = [`${name}=${value}`];
          if (options.domain) cookieParts.push(`Domain=${options.domain}`);
          if (options.path) cookieParts.push(`Path=${options.path}`);
          if (options.expires) cookieParts.push(`Expires=${options.expires.toUTCString()}`);
          if (options.maxAge) cookieParts.push(`Max-Age=${options.maxAge}`);
          if (options.sameSite) cookieParts.push(`SameSite=${options.sameSite}`);
          if (options.secure) cookieParts.push('Secure');
          if (options.httpOnly) cookieParts.push('HttpOnly');
          
          setCookieHeader.push(cookieParts.join('; '));
          res.setHeader('Set-Cookie', setCookieHeader);
        },
        remove(name: string, options: CookieOptions) {
          let setCookieHeader = res.getHeader('Set-Cookie') || [];
          if (!Array.isArray(setCookieHeader)) {
            setCookieHeader = [String(setCookieHeader)];
          }
          const cookieParts = [`${name}=; Path=${options.path || '/'}; Max-Age=0`];
          if (options.domain) cookieParts.push(`Domain=${options.domain}`);
          // No need for other options like Secure, HttpOnly for a deletion cookie (Max-Age=0 does the job)
          
          setCookieHeader.push(cookieParts.join('; '));
          res.setHeader('Set-Cookie', setCookieHeader);
        },
      },
    }
  );

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

    let result: DebugResult | null = null;

    if (action === 'debug') {
      // Get user's owned spaces
      const { data: ownedSpaces, error: ownedSpacesError } = await supabase
        .from('spaces')
        .select('*')
        .eq('owner_id', userId); // Assuming owner_id is the correct field, not created_by

      if (ownedSpacesError) {
        return res.status(500).json({ error: ownedSpacesError.message });
      }

      // Get space member records
      const { data: memberRecords, error: memberError } = await supabase
        .from('space_members') // Changed from space_access
        .select('*, space:spaces(name, subdomain)') // Fetching all member fields + space info
        .eq('user_id', userId);

      if (memberError) {
        return res.status(500).json({ error: memberError.message });
      }

      result = {
        userId,
        ownedSpaces,
        memberRecords, // Changed from accessRecords
      };
    } 
    // TODO: The 'ensure' action needs a complete review and refactor for space_members.
    // Direct manipulation of space_members from an API route like this is discouraged.
    // Consider an admin-specific RPC if this functionality is required.

    // TODO: The 'fix-automation-jungle' action is outdated and relies on space_access.
    // It needs removal or a complete refactor if specific admin fixes are needed for space_members.

    else if (action !== 'debug') { // If action is not debug and others are commented out
      return res.status(400).json({ error: 'Invalid or disabled action' });
    }

    return res.status(200).json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred on the server';
    console.error('Debug API error:', message);
    return res.status(500).json({ error: message });
  }
} 