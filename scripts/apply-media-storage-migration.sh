#!/bin/bash

# Script to apply media storage bucket migration
echo "Applying media storage bucket migration..."

# Apply the migration using Supabase CLI with npx
echo "Running migration via Supabase..."
cat src/migrations/create_media_storage_bucket.sql | npx supabase db execute

# Check if the migration was successful
if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo "The 'media' storage bucket has been created with the following policies:"
    echo "- Read access for authenticated users"
    echo "- Insert access for authenticated users"
    echo "- Update/delete access for file owners"
    echo "- Public read access for files in the 'public' folder"
    echo ""
    echo "Now you can upload media files to Supabase storage!"
else
    echo "❌ Migration failed. Please check the error message above."
fi 