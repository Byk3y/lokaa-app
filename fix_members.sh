#!/bin/bash

# Script to fix member visibility issues in Supabase

echo "Starting member visibility fix..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI not found. Please install it first."
    echo "npm install -g supabase"
    exit 1
fi

# Get the current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SQL_FILE="${DIR}/src/migrations/fix_space_members_direct.sql"

echo "Using SQL file: ${SQL_FILE}"

# Check if the SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "SQL file not found: ${SQL_FILE}"
    exit 1
fi

echo "Applying fix to database..."

# Run the SQL file against the local Supabase instance
npx supabase db reset

echo "Fix applied successfully!"
echo ""
echo "Now restart your development server with:"
echo "npm run dev"
echo ""
echo "Then navigate to the members page to see if the issue is resolved." 