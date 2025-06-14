import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSpace } from '@/hooks/useSpace';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PostgrestError } from '@supabase/supabase-js';

// Placeholder interfaces for better typing
interface DebugSpaceInfo {
  id: string;
  name: string;
  // Add other relevant space properties as needed
}

interface DebugMemberInfo {
  id: string;
  user_id: string;
  username?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  // Add other relevant member properties as needed
}

interface DebugUserInfo {
  id: string;
  email?: string;
  // Add other relevant user properties as needed
}

interface DiagnosticResult {
  success: boolean;
  space?: DebugSpaceInfo;      // Typed from any
  members?: DebugMemberInfo[]; // Typed from any[]
  member_count?: number;
  user_info?: DebugUserInfo;   // Typed from any
  timestamp?: string;
  error?: string;
  detail?: string;
}

interface FixResult {
  success: boolean;
  space_id?: string;
  space_name?: string;
  fixed_count?: number;
  message?: string;
  error?: string;
  detail?: string;
}

export default function SpaceDebugPage() {
  const { spaceSubdomain } = useParams<{ spaceSubdomain: string }>();
  const { spaceData, loading: spaceLoading } = useSpace();
  const { user } = useOptimizedAuth();
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  // Run diagnostic
  const runDiagnostic = useCallback(async () => {
    if (!spaceData?.id) {
      toast({
        title: "Error",
        description: "Space data not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setDiagnostic(null);

    try {
      // Destructure with new names and cast the entire RPC response object
      const { data: rpcResponseData, error: rpcError } = await getSupabaseClient().rpc(
        'debug_space_members',
        { space_id_param: spaceData.id }
      ) as unknown as { data: DiagnosticResult | null; error: PostgrestError | null };

      if (rpcError) {
        throw rpcError;
      }

      // The rpcResponseData is now correctly typed as DiagnosticResult | null
      setDiagnostic(rpcResponseData);
      console.log("Diagnostic results:", rpcResponseData);
    } catch (err) {
      console.error("Error running diagnostic:", err);
      toast({
        title: "Diagnostic Failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [spaceData]);

  // Fix members
  const fixMembers = async () => {
    if (!spaceData?.id) {
      toast({
        title: "Error",
        description: "Space data not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setFixing(true);
    setFixResult(null);

    try {
      // Rename variables and cast the entire RPC response object
      const { data: fixRpcResponseData, error: fixRpcError } = await getSupabaseClient().rpc(
        'fix_space_members',
        { space_id_param: spaceData.id }
      ) as unknown as { data: FixResult | null; error: PostgrestError | null };

      if (fixRpcError) {
        throw fixRpcError;
      }

      // The fixRpcResponseData is now correctly typed as FixResult | null
      setFixResult(fixRpcResponseData);
      console.log("Fix results:", fixRpcResponseData);

      if (fixRpcResponseData?.success) {
        toast({
          title: "Fix Applied",
          description: fixRpcResponseData?.message || "Member visibility issues have been fixed.",
        });
        
        // Run diagnostic again to see the changes
        runDiagnostic();
      }
    } catch (err) {
      console.error("Error fixing members:", err);
      toast({
        title: "Fix Failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  // Run diagnostic on page load
  useEffect(() => {
    if (spaceData?.id && !diagnostic && !loading) {
      runDiagnostic();
    }
  }, [spaceData, diagnostic, loading, runDiagnostic]); // Correct dependencies

  // Check if user is authorized (owner or admin)
  const isAuthorized = () => {
    if (!user || !spaceData) return false;
    return user.id === spaceData.owner_id;
  };

  if (spaceLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized()) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>
            You don't have permission to access this debug page. Only space owners can use this tool.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Space Debug Tools</h1>
        <p className="text-gray-500 mt-2">Diagnose and fix member visibility issues for your space</p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>About this tool</AlertTitle>
        <AlertDescription>
          This tool helps diagnose and fix issues with member visibility in your space. If members
          are not showing up correctly in the members tab, you can use this tool to fix the problem.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Space Information</CardTitle>
            <CardDescription>Basic information about your space</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Space Name:</span>
                <span>{spaceData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Subdomain:</span>
                <span>{spaceSubdomain}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Space ID:</span>
                <span className="font-mono text-xs">{spaceData?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Owner ID:</span>
                <span className="font-mono text-xs">{spaceData?.owner_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Created:</span>
                <span>{spaceData?.created_at ? new Date(spaceData.created_at).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={runDiagnostic} 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Run Diagnostic
            </Button>
            <Button 
              onClick={fixMembers} 
              disabled={fixing || !diagnostic?.success}
            >
              {fixing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Fix Member Visibility
            </Button>
          </CardFooter>
        </Card>

        {diagnostic && (
          <Tabs defaultValue="members">
            <TabsList className="mb-4">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>Member List</span>
                    <Badge className="ml-2">{diagnostic.member_count || 0} members</Badge>
                  </CardTitle>
                  <CardDescription>
                    Complete list of members in this space according to database records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {diagnostic.success ? (
                    <div className="space-y-4">
                      {diagnostic.members && diagnostic.members.length > 0 ? (
                        <div className="divide-y">
                          {diagnostic.members.map((member: DebugMemberInfo) => (
                            <div key={member.id} className="py-3 flex justify-between items-center">
                              <div>
                                <div className="font-medium">{member.full_name || 'Unnamed User'}</div>
                                <div className="text-sm text-gray-500">@{member.username || 'user'}</div>
                              </div>
                              <div className="flex gap-2 items-center">
                                <Badge variant={member.role === 'owner' ? 'default' : 'outline'}>
                                  {member.role}
                                </Badge>
                                <Badge variant={member.is_active ? 'outline' : 'destructive'} className="text-xs">
                                  {member.is_active ? 'active' : 'inactive'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                          <p>No members found in the database for this space</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {diagnostic.error || 'Unknown error occurred while fetching members'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Diagnostic Details</CardTitle>
                  <CardDescription>Technical details about this space</CardDescription>
                </CardHeader>
                <CardContent>
                  {diagnostic.success ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Space Information</h3>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(diagnostic.space, null, 2)}
                        </pre>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">Current User</h3>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(diagnostic.user_info, null, 2)}
                        </pre>
                      </div>
                      {fixResult && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-medium mb-2">Fix Result</h3>
                            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                              {JSON.stringify(fixResult, null, 2)}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {diagnostic.error || 'Unknown error occurred while fetching details'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="raw">
              <Card>
                <CardHeader>
                  <CardTitle>Raw Diagnostic Data</CardTitle>
                  <CardDescription>Complete JSON response from diagnostic function</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto h-96">
                    {JSON.stringify(diagnostic, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
} 