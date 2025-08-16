# 🎯 Landing Page Toggle System

This system allows you to easily switch between a **feature-focused landing page** (for new launches) and a **space cards landing page** (when you have real spaces).

## 🚀 Quick Start

### Method 1: Using the Script (Recommended)
```bash
npm run landing:feature
```

### Method 2: Manual Environment Variable
Add to your `.env` file:
```bash
# To show space cards (when you have real spaces)
VITE_SHOW_SPACE_CARDS=true

# To show feature-focused content (current state)
# Remove VITE_SHOW_SPACE_CARDS or set to false
```

## 📋 How It Works

### Current State (Feature-Focused)
- ✅ **No space cards** - avoids showing empty spaces
- ✅ **Value propositions** - highlights key benefits
- ✅ **Clear CTA** - "Start Building Your Community"
- ✅ **Professional appearance** - perfect for new launches

### When You Enable Space Cards
- ✅ **Shows real spaces** - when you have actual communities
- ✅ **Categories filter** - for browsing different types
- ✅ **Search functionality** - for finding specific spaces
- ✅ **Space preview modals** - for quick browsing

## 🔄 Automatic Fallback

The system is smart! If you enable space cards but no spaces exist in your database, it will automatically fall back to the feature-focused content.

## 🎨 Customization

### Adding More Features
Edit `src/views/LandingPage.tsx` and add more feature cards in the grid:

```jsx
{/* Feature 4 */}
<div className="text-center">
  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
    <span className="text-2xl">🔒</span>
  </div>
  <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
  <p className="text-gray-600">Enterprise-grade security for your community.</p>
</div>
```

### Changing Icons
Replace the emoji icons with Lucide React icons:

```jsx
import { Rocket, DollarSign, TrendingUp } from "lucide-react";

// Then in the feature card:
<Rocket className="w-8 h-8 text-teal-600" />
```

## 🚀 Deployment

### For Production
- **New launch**: Don't set `VITE_SHOW_SPACE_CARDS` (defaults to feature-focused)
- **When you have spaces**: Set `VITE_SHOW_SPACE_CARDS=true` in your production environment

### For Development
- Use `npm run landing:feature` to toggle between modes
- Restart your dev server after changes: `npm run dev`

## 📝 Notes

- The toggle only affects the landing page (`/`)
- The discover page (`/discover`) always shows space cards
- Changes require a dev server restart
- The system is designed to be production-ready

## 🎯 Best Practices

1. **Start with feature-focused** - Perfect for new launches
2. **Switch to space cards** - When you have 5+ real spaces
3. **Use automatic fallback** - Let the system handle empty states
4. **Test both modes** - Ensure both look professional 