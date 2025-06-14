import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { useSpace } from '@/hooks/useSpace';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

/**
 * Example component demonstrating best practices for using SpaceContext
 */
export default function SpaceContextExample() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { spaceData, loading, error, fetchSpaceData, clearCache } = useSpace();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // On component mount, fetch space data if we don't have it or it's for a different subdomain
  useEffect(() => {
    if (!subdomain) return;
    
    if (!spaceData || spaceData.subdomain !== subdomain) {
      fetchSpaceData(subdomain)
        .then(() => setLastRefresh(new Date()));
    } else {
      // We already have the data
      setLastRefresh(new Date());
    }
  }, [subdomain, spaceData, fetchSpaceData]);
  
  // Handle manual refresh
  const handleRefresh = async () => {
    if (!subdomain) return;
    
    // Show loading indicator
    // Force refresh by passing true as second argument
    await fetchSpaceData(subdomain, true);
    setLastRefresh(new Date());
  };
  
  // Handle cache clear
  const handleClearCache = () => {
    if (subdomain) {
      clearCache(subdomain);
      alert(`Cache cleared for ${subdomain}`);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {subdomain ? `Space: ${subdomain}` : 'No space selected'}
          
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription>
          {lastRefresh 
            ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}`
            : 'Not yet loaded'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-md">
            <p className="font-semibold">Error loading space data:</p>
            <p>{error.message}</p>
          </div>
        ) : !spaceData ? (
          <div className="text-center p-4">
            {loading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p>Loading space data...</p>
              </div>
            ) : (
              <p>No space data available</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Space Name</h3>
              <p className="text-lg">{spaceData.name}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Description</h3>
              <p>{spaceData.description || 'No description'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Privacy</h3>
                <p>{spaceData.is_private ? 'Private' : 'Public'}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">ID</h3>
                <p className="text-xs truncate">{spaceData.id}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          disabled={loading || !spaceData}
        >
          Clear Cache
        </Button>
        
        <Button 
          variant="default" 
          size="sm"
          onClick={handleRefresh}
          disabled={loading || !subdomain}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
} 