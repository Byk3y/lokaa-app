import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Temporarily using string for tableName due to Supabase generated type mismatches
// type TableName = "spaces" | "comments" | "posts" | "users" | 
//   "course_enrollments" | "courses" | "course_lessons" | 
//   "event_attendees" | "events" | "payments" | "referrals" | "space_access";

interface ColumnDetail {
  column_name: string;
  data_type: string;
  example_value: unknown;
  is_nullable: string; // Changed to string for broader compatibility
}

interface SchemaDebugData {
  columns: string[] | null;
  sample: Record<string, unknown> | null;
  columnsDetail: ColumnDetail[] | null;
  rawQueryResults?: Record<string, unknown>[];
}

export default function SchemaDebugger() {
  const { user } = useAuth();
  const [schemaData, setSchemaData] = useState<SchemaDebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string>('spaces'); // Changed to string
  
  useEffect(() => {
    async function fetchSchema() {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First, let's try to get a sample record to see the columns
        const { data: sampleData, error: sampleError } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(tableName as any) // tableName is now string, Supabase will handle if valid
          .select('*')
          .limit(1);
          
        if (sampleError) {
          console.error(`Error fetching sample from ${tableName}:`, sampleError);
          setError(sampleError.message);
          return;
        }
        
        if (!sampleData || sampleData.length === 0) {
          setError(`No records found in the ${tableName} table`);
          setLoading(false);
          return;
        }

        // Store the schema information
        const columns = Object.keys(sampleData[0]);
        const sample = sampleData[0] as unknown as Record<string, unknown>;
        
        // Instead of querying information_schema directly (which TypeScript doesn't permit),
        // we'll infer data types from the sample data
        const columnDetails = columns.map(colName => {
          const value = sample[colName];
          const dataType = value === null ? 'null' : typeof value;
          return {
            column_name: colName,
            data_type: dataType,
            example_value: value,
            is_nullable: value === null ? 'YES' : 'NO' // Made this more definite
          };
        }) as ColumnDetail[]; // Explicit cast here
        
        setSchemaData({
          columns,
          sample,
          columnsDetail: columnDetails
        });
      } catch (err: unknown) {
        console.error("Error in schema debugger:", err);
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSchema();
  }, [user, tableName]);
  
  // For direct database query
  const runRawQuery = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(tableName as any)
        .select('*')
        .limit(5);
        
      if (error) throw error;
      
      setSchemaData(prev => ({
        ...prev,
        rawQueryResults: data as unknown as Record<string, unknown>[],
        columns: prev?.columns || null,
        sample: prev?.sample || null,
        columnsDetail: prev?.columnsDetail || null,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for table name changes with type checking
  const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // value is string
    // Basic validation or allow any string for now if TableName type is too restrictive
    setTableName(value);
  };
  
  if (!user) {
    return <div className="p-8">Please log in to use this tool</div>;
  }
  
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Schema Debugger</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Table Name
        </label>
        <div className="flex gap-2">
          <select
            value={tableName}
            onChange={(e) => setTableName(e.target.value)} // e.target.value is string
            className="border rounded px-3 py-2 w-full"
          >
            {/* Consider dynamically populating these or ensuring they align with actual available tables */}
            <option value="spaces">spaces</option>
            <option value="comments">comments</option>
            <option value="posts">posts</option>
            <option value="users">users</option>
            <option value="course_enrollments">course_enrollments</option>
            <option value="courses">courses</option>
            <option value="course_lessons">course_lessons</option>
            <option value="event_attendees">event_attendees</option>
            <option value="events">events</option>
            <option value="payments">payments</option>
            <option value="referrals">referrals</option>
            <option value="space_access">space_access</option>
          </select>
          <button 
            onClick={() => {
              setLoading(true);
              setTimeout(() => window.location.reload(), 100);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Load
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 mb-4 rounded-md border border-red-200">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-gray-500">Loading schema information...</div>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">{tableName} Table Columns</h2>
            {schemaData?.columns ? (
              <div className="grid grid-cols-3 gap-2">
                {schemaData.columns.map((column: string) => (
                  <div 
                    key={column} 
                    className="bg-teal-50 p-2 rounded-md border border-teal-100"
                  >
                    {column}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No column information available</div>
            )}
          </div>
          
          {schemaData?.columnsDetail && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Column Details (Inferred from Data)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 bg-gray-50">Column Name</th>
                      <th className="border border-gray-200 px-4 py-2 bg-gray-50">Data Type</th>
                      <th className="border border-gray-200 px-4 py-2 bg-gray-50">Nullable?</th>
                      <th className="border border-gray-200 px-4 py-2 bg-gray-50">Example Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schemaData.columnsDetail.map((col: ColumnDetail) => (
                      <tr key={col.column_name}>
                        <td className="border border-gray-200 px-4 py-2">{col.column_name}</td>
                        <td className="border border-gray-200 px-4 py-2">{col.data_type}</td>
                        <td className="border border-gray-200 px-4 py-2">{col.is_nullable}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          {col.example_value === null ? 'null' : 
                           typeof col.example_value === 'object' ? 
                           JSON.stringify(col.example_value) : 
                           String(col.example_value).substring(0, 50)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Sample Data</h2>
            {schemaData?.sample ? (
              <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-xs">
                {JSON.stringify(schemaData.sample, null, 2)}
              </pre>
            ) : (
              <div className="text-gray-500">No sample data available</div>
            )}
          </div>
          
          <button
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
            onClick={runRawQuery}
          >
            Fetch More Sample Data
          </button>
          
          {schemaData?.rawQueryResults && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Raw Query Results (5 Records)</h2>
              <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-xs">
                {JSON.stringify(schemaData.rawQueryResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 