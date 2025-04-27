#!/bin/bash

# Script to apply our space branding fields migration
echo "Applying space branding fields migration..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Please install it using:"
    echo "npm install -g supabase"
    exit 1
fi

# Apply the migration using Supabase CLI
echo "Running migration via Supabase..."
cat src/migrations/add_space_branding_fields.sql | supabase db execute

# Check if the migration was successful
if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo "The spaces table now has the following new columns:"
    echo "- cover_image (text, nullable)"
    echo "- icon_image (text, nullable)"
    echo "- description (text, nullable)"
    echo "- primary_color (text, nullable, default '#00BFFF')"
    echo "- initials (text, nullable)"
    echo ""
    echo "Types have been updated in src/integrations/supabase/types.ts"
else
    echo "❌ Migration failed. Please check the error message above."
fi 