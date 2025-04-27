import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type DebugResult = {
  ownedSpaces?: any[];
  accessRecords?: any[];
  error?: string;
};

export const UserSpaceDebugger = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [spaceId, setSpaceId] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState<'debug' | 'ensure' | 'fix-automation-jungle'>('debug');
  const [error, setError] = useState('');

  const handleDebug = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      setResult(null);
      
      const targetUserId = userId || user.id;
      
      const response = await fetch('/api/debug/user-space-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          spaceId: action === 'ensure' ? spaceId : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'An error occurred');
      }
      
      setResult(data.result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-medium mb-4">User Space Access Debugger</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action
          </label>
          <div className="flex space-x-2">
            <Button
              variant={action === 'debug' ? 'default' : 'outline'}
              onClick={() => setAction('debug')}
              size="sm"
            >
              Debug Access
            </Button>
            <Button
              variant={action === 'ensure' ? 'default' : 'outline'}
              onClick={() => setAction('ensure')}
              size="sm"
            >
              Ensure Access
            </Button>
            <Button
              variant={action === 'fix-automation-jungle' ? 'default' : 'outline'}
              onClick={() => setAction('fix-automation-jungle')}
              size="sm"
            >
              Fix Automation Jungle
            </Button>
          </div>
        </div>
        
        {action === 'ensure' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Space ID
            </label>
            <Input
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              placeholder="Enter space ID"
              className="w-full"
            />
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={handleDebug}
            disabled={loading || (action === 'ensure' && !spaceId)}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Run Debug Tool'
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-4">
            <h3 className="font-medium text-sm mb-2">Results:</h3>
            <div className="bg-gray-50 p-3 rounded-md overflow-auto max-h-96">
              <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSpaceDebugger; 