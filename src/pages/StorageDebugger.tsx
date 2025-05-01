import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const StorageDebugger = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bucketInfo, setBucketInfo] = useState<any>(null);
  const [bucketFiles, setBucketFiles] = useState<any[]>([]);
  const [bucketError, setBucketError] = useState('');
  const [directoryName, setDirectoryName] = useState('test-directory');
  const [directoryStatus, setDirectoryStatus] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteFileName, setDeleteFileName] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('');
  const [permissionsResult, setPermissionsResult] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        checkBucket();
      }
    } catch (error: any) {
      console.error('Error checking session:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkBucket = async () => {
    try {
      setBucketError('');
      // Get bucket info
      const { data: bucketData, error: bucketError } = await supabase
        .storage
        .getBucket('media');

      if (bucketError) throw bucketError;
      setBucketInfo(bucketData);

      // List files in bucket
      const { data: filesData, error: filesError } = await supabase
        .storage
        .from('media')
        .list();

      if (filesError) throw filesError;
      setBucketFiles(filesData || []);
    } catch (error: any) {
      console.error('Error checking bucket:', error.message);
      setBucketError(error.message);
    }
  };

  const createDirectory = async () => {
    try {
      setDirectoryStatus('Creating directory...');
      // To create a directory in Supabase storage, you upload a placeholder file
      const placeholderFile = new Blob([''], { type: 'text/plain' });
      const file = new File([placeholderFile], '.placeholder', { type: 'text/plain' });
      
      const { data, error } = await supabase
        .storage
        .from('media')
        .upload(`${directoryName}/.placeholder`, file);

      if (error) throw error;
      setDirectoryStatus(`Directory "${directoryName}" created successfully`);
      checkBucket(); // Refresh bucket info
    } catch (error: any) {
      console.error('Error creating directory:', error.message);
      setDirectoryStatus(`Error: ${error.message}`);
    }
  };

  const uploadTestFile = async () => {
    if (!directoryName) {
      setUploadStatus('Please specify a directory name');
      return;
    }

    try {
      setUploadStatus('Uploading test file...');
      // Create a test file with random content
      const testContent = `Test file content ${new Date().toISOString()}`;
      const testFile = new Blob([testContent], { type: 'text/plain' });
      const file = new File([testFile], `test-${Date.now()}.txt`, { type: 'text/plain' });
      
      const { data, error } = await supabase
        .storage
        .from('media')
        .upload(`${directoryName}/${file.name}`, file);

      if (error) throw error;
      setUploadStatus(`Test file uploaded successfully to "${directoryName}"`);
      checkBucket(); // Refresh bucket info
    } catch (error: any) {
      console.error('Error uploading test file:', error.message);
      setUploadStatus(`Error: ${error.message}`);
    }
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file first');
      return;
    }

    if (!directoryName) {
      setUploadStatus('Please specify a directory name');
      return;
    }

    try {
      setUploadStatus('Uploading file...');
      
      const { data, error } = await supabase
        .storage
        .from('media')
        .upload(`${directoryName}/${selectedFile.name}`, selectedFile);

      if (error) throw error;
      setUploadStatus(`File "${selectedFile.name}" uploaded successfully to "${directoryName}"`);
      setSelectedFile(null);
      // Reset the file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      checkBucket(); // Refresh bucket info
    } catch (error: any) {
      console.error('Error uploading file:', error.message);
      setUploadStatus(`Error: ${error.message}`);
    }
  };

  const deleteTestFile = async () => {
    if (!deleteFileName) {
      setDeleteStatus('Please specify a file name to delete');
      return;
    }

    try {
      setDeleteStatus('Deleting file...');
      
      const { data, error } = await supabase
        .storage
        .from('media')
        .remove([deleteFileName]);

      if (error) throw error;
      setDeleteStatus(`File "${deleteFileName}" deleted successfully`);
      setDeleteFileName('');
      checkBucket(); // Refresh bucket info
    } catch (error: any) {
      console.error('Error deleting file:', error.message);
      setDeleteStatus(`Error: ${error.message}`);
    }
  };

  const testBucketPermissions = async () => {
    try {
      setPermissionsResult('Testing bucket permissions...');
      let results = [];

      // Test 1: List files
      try {
        const { data, error } = await supabase.storage.from('media').list();
        if (error) throw error;
        results.push('✅ Can list files');
      } catch (error: any) {
        results.push(`❌ Cannot list files: ${error.message}`);
      }

      // Test 2: Upload a small test file
      try {
        const testContent = 'Permission test';
        const testFile = new Blob([testContent], { type: 'text/plain' });
        const file = new File([testFile], `permission-test-${Date.now()}.txt`, { type: 'text/plain' });
        
        const { data, error } = await supabase
          .storage
          .from('media')
          .upload(`permission-tests/${file.name}`, file);
        
        if (error) throw error;
        results.push(`✅ Can upload file: ${file.name}`);
        
        // If upload succeeded, try to delete the file
        try {
          const { error: deleteError } = await supabase
            .storage
            .from('media')
            .remove([`permission-tests/${file.name}`]);
          
          if (deleteError) throw deleteError;
          results.push(`✅ Can delete file: ${file.name}`);
        } catch (deleteError: any) {
          results.push(`❌ Cannot delete file: ${deleteError.message}`);
        }
      } catch (error: any) {
        results.push(`❌ Cannot upload file: ${error.message}`);
      }

      setPermissionsResult(results.join('\n'));
    } catch (error: any) {
      console.error('Error testing permissions:', error.message);
      setPermissionsResult(`Error testing permissions: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You need to be logged in to use the Storage Debugger.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Supabase Storage Debugger</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
          <CardDescription>Details about your current session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>User ID:</strong> {session.user?.id}
            </div>
            <div>
              <strong>Email:</strong> {session.user?.email}
            </div>
            <div>
              <strong>Token expires:</strong> {new Date(session.expires_at * 1000).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bucket Information</CardTitle>
          <CardDescription>Information about the 'media' bucket</CardDescription>
        </CardHeader>
        <CardContent>
          {bucketError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{bucketError}</AlertDescription>
            </Alert>
          ) : bucketInfo ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div>
                  <strong>Bucket ID:</strong> {bucketInfo.id}
                </div>
                <div>
                  <strong>Name:</strong> {bucketInfo.name}
                </div>
                <div>
                  <strong>Public:</strong> {bucketInfo.public ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Created at:</strong> {new Date(bucketInfo.created_at).toLocaleString()}
                </div>
                <div>
                  <strong>Updated at:</strong> {new Date(bucketInfo.updated_at).toLocaleString()}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Files in Bucket</h3>
                {bucketFiles.length === 0 ? (
                  <p>No files found in the bucket.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {bucketFiles.map((file, index) => (
                      <li key={index}>
                        {file.name} {file.id && `(ID: ${file.id})`}
                        {file.metadata && ` - ${JSON.stringify(file.metadata)}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <Button onClick={checkBucket} className="mt-2">
                Refresh Bucket Info
              </Button>
            </div>
          ) : (
            <p>No bucket information available.</p>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Directory</CardTitle>
            <CardDescription>Create a new directory in the 'media' bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="directory-name">Directory Name</Label>
                <Input
                  id="directory-name"
                  value={directoryName}
                  onChange={(e) => setDirectoryName(e.target.value)}
                  placeholder="Enter directory name"
                />
              </div>
              
              <Button onClick={createDirectory}>Create Directory</Button>
              
              {directoryStatus && (
                <p className={directoryStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                  {directoryStatus}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>Upload files to the specified directory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upload-directory">Upload to Directory</Label>
                <Input
                  id="upload-directory"
                  value={directoryName}
                  onChange={(e) => setDirectoryName(e.target.value)}
                  placeholder="Enter directory name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={uploadSelectedFile} disabled={!selectedFile}>
                  Upload Selected File
                </Button>
                <Button variant="outline" onClick={uploadTestFile}>
                  Upload Test File
                </Button>
              </div>
              
              {uploadStatus && (
                <p className={uploadStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                  {uploadStatus}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Delete File</CardTitle>
            <CardDescription>Delete a file from the 'media' bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delete-file">File Path to Delete</Label>
                <Input
                  id="delete-file"
                  value={deleteFileName}
                  onChange={(e) => setDeleteFileName(e.target.value)}
                  placeholder="e.g., test-directory/file.txt"
                />
              </div>
              
              <Button 
                variant="destructive" 
                onClick={deleteTestFile}
                disabled={!deleteFileName}
              >
                Delete File
              </Button>
              
              {deleteStatus && (
                <p className={deleteStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                  {deleteStatus}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Permissions</CardTitle>
            <CardDescription>Test your permissions on the 'media' bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={testBucketPermissions}>
                Run Permissions Test
              </Button>
              
              {permissionsResult && (
                <pre className="bg-slate-100 p-3 rounded text-sm whitespace-pre-wrap">
                  {permissionsResult}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StorageDebugger; 