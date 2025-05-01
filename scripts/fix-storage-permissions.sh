#!/bin/bash

# Script to fix media storage bucket permissions
echo "Fixing media storage bucket permissions..."

# Apply the migration using Supabase CLI with npx
echo "Running simplified migration..."
cat src/migrations/fix_media_storage_permissions.sql | npx supabase db execute

# Check if the migration was successful
if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo "The 'media' storage bucket has been recreated with simpler permissions:"
    echo "- Public read access for everyone"
    echo "- Upload access for authenticated users"
    echo "- Update/delete access for file owners only"
    echo ""
    echo "This should fix the storage access issues."
else
    echo "❌ Migration failed. Please check the error message above."
fi 