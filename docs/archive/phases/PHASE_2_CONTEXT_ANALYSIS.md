# 🔍 Phase 2: UserSettings.tsx Context Analysis

## 📊 **Current State Assessment**

### **File Scale & Structure**
- **File**: `src/pages/UserSettings.tsx`
- **Lines**: 1,364 lines (confirmed via `wc -l`)
- **Target**: Reduce to ~200 lines (85% reduction)
- **Challenge**: Largest single page in codebase

### **Dependencies Analysis**

#### **External Dependencies**
```typescript
// React Core
import { useState, useRef, useEffect } from "react";
import React from 'react';

// Routing
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";

// UI Components
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Custom Components  
import ProfileImageUploader from "@/components/profile/ProfileImageUploader";
import ProfileDropdown from "../components/common/ProfileDropdown";
import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import ChatButton from '@/components/chat/ChatButton';
import ModernDropdownTrigger from "@/components/ModernDropdownTrigger";
import MinimalUpDownChevronIcon from "@/components/MinimalUpDownChevronIcon";

// Contexts & Stores
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useMembershipStore } from "@/features/spaces/store/membership-store";

// Types & Utils
import { Space } from "@/types/space";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { createPortal } from 'react-dom';

// CSS
import "../pages/UserSettingsStyles.css"; // Used by Discover.tsx
```

#### **Icon Dependencies (20+ icons)**
```typescript
import { 
  MessageCircle, User, Users, DollarSign, CircleUser, Bell, 
  MessageSquare, CreditCard, Clock, PaintBucket, Eye, 
  ChevronDown, ChevronRight, ChevronUp, Settings as SettingsIcon,
  Plus, Compass, Copy as CopyIcon, Search
} from "lucide-react";
```

---

## 🎯 **Component Structure Analysis**

### **1. Tab-Based Architecture**
UserSettings uses a **10-tab system**:

```typescript
const validTabs = [
  "spaces", "profile", "affiliates", "payouts", "account", 
  "notifications", "chat", "payment-methods", "payment-history", "theme"
];
```

**Current Implementation**: Massive conditional rendering in single component  
**Target**: Individual tab components in feature modules

### **2. State Management Complexity**
**Current State Variables (20+)**:
```typescript
// Navigation state
const [activeTab, setActiveTab] = useState(...)
const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false)
const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

// User profile state
const [bio, setBio] = useState("Here to learn")
const [firstName, setFirstName] = useState("")
const [lastName, setLastName] = useState("")
const [country, setCountry] = useState("")
const [socialLinks, setSocialLinks] = useState({...})
const [hideFromSearch, setHideFromSearch] = useState(false)

// Feature-specific state  
const [myersBriggs, setMyersBriggs] = useState("Don't show")
const [timezone, setTimezone] = useState('(GMT +01:00) Africa/Lagos')
const [copied, setCopied] = useState(false)
const [spaceSearchQuery, setSpaceSearchQuery] = useState("")

// Loading & editing state
const [userDataLoaded, setUserDataLoaded] = useState(false)
const [isEditingName, setIsEditingName] = useState(false)
const [isSavingName, setIsSavingName] = useState(false)
const [isSavingProfile, setIsSavingProfile] = useState(false)
const [loadingSpaces, setLoadingSpaces] = useState(true)

// Data state
const [userSpaces, setUserSpaces] = useState<Space[]>([])
```

### **3. Business Logic Functions**
**Core Functions**:
- `fetchUserDetails()` - Database user data loading
- `fetchUserSpaces()` - Space membership data
- `handleNameChange()` - One-time name update logic
- `handleSaveProfile()` - Profile data persistence
- `getUserInitials()` - Avatar fallback logic
- `handleTabChange()` - Navigation state management

---

## 🏗️ **Existing Feature Architecture**

### **Users Feature Status**
**Directory**: `src/features/users/`
**Structure**:
```
src/features/users/
├── index.ts ✅ (Public API exports)
├── api/ ✅ (API clients)
├── components/ ✅ (ProfileAvatar.tsx)
├── hooks/ ✅ (Custom hooks)
├── store/ ✅ (State management)
├── types/ ✅ (TypeScript types)  
└── README.md ✅ (Documentation)
```

**Current Components**:
- `ProfileAvatar.tsx` (78 lines) - Already extracted

**Missing Components**: All settings tabs, main layout, navigation

### **Related Patterns in Codebase**

#### **Tab Implementation Examples**
1. **SpaceSettings.tsx** (similar pattern):
   ```typescript
   const [activeTab, setActiveTab] = useState('general');
   // 13 settings tabs for spaces
   ```

2. **ProfileTabs.tsx** (clean implementation):
   ```typescript
   <Tabs defaultValue="about">
     <TabsList>
       <TabsTrigger value="about">About</TabsTrigger>
       <TabsTrigger value="posts">Posts</TabsTrigger>
       // ... more tabs
     </TabsList>
   ```

3. **SettingsSidebar.tsx** (modular approach):
   ```typescript
   const sidebarTabs: { key: SettingsTabKey; label: string; icon: React.ElementType }[]
   ```

---

## 🚧 **Decomposition Strategy**

### **Phase 2A: Core Infrastructure (1 hour)**

#### **1. Settings Layout Foundation**
**Target**: `src/features/users/components/settings/UserSettingsLayout.tsx`
**Responsibility**: Header, sidebar navigation, tab routing
**Lines**: ~80-100 lines

#### **2. Settings Navigation Sidebar**  
**Target**: `src/features/users/components/settings/SettingsSidebar.tsx`
**Responsibility**: Menu items, active state, navigation logic
**Lines**: ~60-80 lines

#### **3. Settings Tab Router**
**Target**: `src/features/users/components/settings/SettingsTabRouter.tsx`
**Responsibility**: Tab content rendering, route sync
**Lines**: ~40-60 lines

---

### **Phase 2B: Tab Components (2-3 hours)**

#### **Profile Tab** (Priority 1 - Most Complex)
**Target**: `src/features/users/components/settings/tabs/ProfileSettingsTab.tsx`
**Features**: 
- Profile image upload integration
- Name editing (one-time only)  
- Bio & country management
- Social links management
- Privacy settings (hide from search)
**Lines**: ~200-250 lines

#### **Spaces Tab** (Priority 2 - Data Heavy)
**Target**: `src/features/users/components/settings/tabs/SpacesSettingsTab.tsx`
**Features**:
- Space listing with search
- Drag & drop reordering  
- Pin/unpin functionality
- Space filtering
**Lines**: ~150-200 lines

#### **Account Tab** (Priority 3 - Security)
**Target**: `src/features/users/components/settings/tabs/AccountSettingsTab.tsx`
**Features**:
- Email management
- Password change
- Session management  
- Account deletion
**Lines**: ~100-150 lines

#### **Simple Tabs** (Priority 4 - Quick Wins)
1. **NotificationsSettingsTab.tsx** (~80-100 lines)
2. **ChatSettingsTab.tsx** (~120-150 lines) 
3. **ThemeSettingsTab.tsx** (~60-80 lines)
4. **PaymentMethodsTab.tsx** (~80-100 lines)
5. **PaymentHistoryTab.tsx** (~80-100 lines)
6. **AffiliatesTab.tsx** (~100-120 lines)
7. **PayoutsTab.tsx** (~60-80 lines)

---

### **Phase 2C: Shared Utilities (30 minutes)**

#### **Settings Hooks**
**Target**: `src/features/users/hooks/`
- `useUserProfile.ts` - Profile data management
- `useUserSpaces.ts` - Space data with search/filter
- `useSettingsNavigation.ts` - Tab routing logic

#### **Settings Types**
**Target**: `src/features/users/types/settings.ts`
```typescript
export interface SocialLinks {
  website?: string;
  instagram?: string;
  x?: string;
  youtube?: string;  
  linkedin?: string;
  facebook?: string;
}

export interface UserProfileData {
  firstName: string;
  lastName: string;
  bio: string;
  country: string;
  socialLinks: SocialLinks;
  hideFromSearch: boolean;
}

export type SettingsTab = 
  | "spaces" | "profile" | "affiliates" | "payouts" 
  | "account" | "notifications" | "chat" 
  | "payment-methods" | "payment-history" | "theme";
```

---

## ⚠️ **Migration Risks & Dependencies**

### **Critical Dependencies**
1. **ProfileImageUploader** - External component, needs integration
2. **UserSettingsStyles.css** - Used by Discover.tsx, requires careful handling
3. **URL Routing** - `/settings/:tab` patterns must be preserved
4. **Auth Context** - Heavy dependency on `useOptimizedAuth`

### **Breaking Change Risks**
1. **Import Paths** - `App.tsx` imports UserSettings directly
2. **CSS Dependencies** - Discover.tsx imports UserSettingsStyles.css
3. **Component Props** - Tab routing via URL params

### **Data Migration Challenges**  
1. **Supabase Queries** - Complex space membership joins
2. **State Persistence** - Form state across tab navigation
3. **Real-time Updates** - Profile image context integration

---

## 📈 **Success Metrics**

### **Phase 2 Completion Targets**
- **Lines Reduced**: 1,364 → ~200 lines (85% reduction)
- **Components Created**: 10+ focused components
- **Features Modularized**: All 10 settings tabs
- **Build Time**: Maintained (<12s)
- **Functionality**: 100% preserved

### **Quality Indicators**
- ✅ **Single Responsibility** - Each tab = one feature
- ✅ **Reusable Hooks** - Shared state logic
- ✅ **Type Safety** - Strong TypeScript definitions  
- ✅ **Performance** - No unnecessary re-renders
- ✅ **Accessibility** - Preserved keyboard navigation

---

## 🎯 **Phase 2 Execution Plan**

### **Step 1: Infrastructure** (45 minutes)
1. Create settings layout foundation
2. Build navigation sidebar  
3. Implement tab router
4. Test basic navigation

### **Step 2: High-Priority Tabs** (90 minutes)
1. Extract Profile tab (complex)
2. Extract Spaces tab (data-heavy)
3. Extract Account tab (security)
4. Verify core functionality

### **Step 3: Remaining Tabs** (60 minutes)  
1. Extract all simple tabs
2. Create shared utilities
3. Update type definitions
4. Test complete flow

### **Step 4: Integration** (15 minutes)
1. Update main UserSettings.tsx
2. Update imports in App.tsx  
3. Run build verification
4. Create completion documentation

---

**Total Estimated Time**: 3.5 hours  
**Complexity**: Medium-High (due to state complexity)  
**Risk Level**: Medium (routing & CSS dependencies)

---

*Phase 2 context analysis completed - Ready for systematic decomposition* 