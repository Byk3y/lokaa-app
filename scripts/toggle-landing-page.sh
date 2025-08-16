#!/bin/bash

# 🎯 Landing Page Toggle Script
# Easily switch between feature-focused and space cards landing page

ENV_FILE=".env"
TEMP_FILE=".env.temp"

echo "🎯 Lokaa Landing Page Toggle"
echo "=============================="

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found. Creating one..."
    touch "$ENV_FILE"
fi

# Check current state
if grep -q "VITE_SHOW_SPACE_CARDS=true" "$ENV_FILE"; then
    CURRENT_MODE="SPACE CARDS"
    NEW_MODE="FEATURE-FOCUSED"
    ACTION="disable"
else
    CURRENT_MODE="FEATURE-FOCUSED"
    NEW_MODE="SPACE CARDS"
    ACTION="enable"
fi

echo "Current mode: $CURRENT_MODE"
echo "Switching to: $NEW_MODE"
echo ""

# Confirm action
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Perform the toggle
if [ "$ACTION" = "enable" ]; then
    # Enable space cards
    if grep -q "VITE_SHOW_SPACE_CARDS" "$ENV_FILE"; then
        # Update existing line
        sed 's/VITE_SHOW_SPACE_CARDS=.*/VITE_SHOW_SPACE_CARDS=true/' "$ENV_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$ENV_FILE"
    else
        # Add new line
        echo "VITE_SHOW_SPACE_CARDS=true" >> "$ENV_FILE"
    fi
    echo "✅ Space cards ENABLED"
    echo "   Add VITE_SHOW_SPACE_CARDS=true to your .env file"
else
    # Disable space cards
    if grep -q "VITE_SHOW_SPACE_CARDS" "$ENV_FILE"; then
        # Remove the line
        grep -v "VITE_SHOW_SPACE_CARDS" "$ENV_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$ENV_FILE"
    fi
    echo "✅ Feature-focused content ENABLED"
    echo "   Removed VITE_SHOW_SPACE_CARDS from your .env file"
fi

echo ""
echo "🔄 Restart your development server to see changes:"
echo "   npm run dev"
echo ""
echo "📝 Note: The landing page will automatically show feature-focused content"
echo "   if space cards are enabled but no spaces exist in your database." 