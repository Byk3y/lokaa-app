import { SupabaseSpacesList } from '@/components/examples/SupabaseSpacesList';

export default function SupabaseExample() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Supabase Integration Example</h1>
      <p className="mb-6">
        This page demonstrates fetching data from Supabase. The component below
        is loading spaces directly from the database.
      </p>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <SupabaseSpacesList />
      </div>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">How it works</h2>
        <p className="mb-2">
          The component uses the Supabase client to fetch data from the 'spaces' table.
          It demonstrates:
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li>Setting up state for data, loading, and error handling</li>
          <li>Using useEffect to fetch data when the component mounts</li>
          <li>Handling loading states, errors, and empty data scenarios</li>
          <li>Displaying the fetched data in a list format</li>
        </ul>
      </div>
    </div>
  );
} 