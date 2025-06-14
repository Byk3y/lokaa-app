// REAL MEMBERS DATA - Copy and paste into browser console
console.log('🔧 LOADING REAL MEMBERS FROM DATABASE');

const spaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
const userId = '1fca49da-3a53-4a0f-aeb3-63b567f35f84';

// REAL MEMBERS from your actual database (excluding banned users)
const realMembers = [
  {
    id: 'fe8a7784-0b41-4c1f-a867-681675ad7f67',
    userId: 'f6064ebb-564a-49d2-a146-fb8615fd7ae2',
    fullName: 'Insane Prompts',
    role: 'member',
    status: 'active',
    avatarUrl: 'https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/avatars/profiles/f6064ebb-564a-49d2-a146-fb8615fd7ae2/1747187200815.jpg',
    joinedAt: '2025-05-11T21:41:37.044243+00:00',
    isOnline: false,
    lastActiveAt: '2025-06-13T09:17:22.769831+00:00',
    activityScore: 85,
    bio: 'Space member'
  },
  {
    id: '63a8aab5-8d9b-4e97-acbc-d46e3080baa8',
    userId: '1fca49da-3a53-4a0f-aeb3-63b567f35f84',
    fullName: 'Francis Swift',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/avatars/profiles/1fca49da-3a53-4a0f-aeb3-63b567f35f84/1746272119121.jpg',
    joinedAt: '2025-05-03T19:52:19.423826+00:00',
    isOnline: true,
    lastActiveAt: '2025-06-13T12:29:08.33453+00:00',
    activityScore: 100,
    bio: 'Space administrator'
  },
  {
    id: 'ec9c451f-52c2-424a-8902-9f702aa5212e',
    userId: '5909b6aa-cba9-45ed-a002-d18474a8c6e6',
    fullName: 'Magic Prompts',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/avatars/profiles/5909b6aa-cba9-45ed-a002-d18474a8c6e6/1747186754249.jpg',
    joinedAt: '2025-05-11T22:43:43.263276+00:00',
    isOnline: false,
    lastActiveAt: '2025-06-13T09:26:20.549547+00:00',
    activityScore: 90,
    bio: 'Space administrator'
  },
  {
    id: '677ecd95-06d1-4a52-afad-01d8c2fe370c',
    userId: '15f808fd-82ea-4f98-8533-95786f811544',
    fullName: 'lokaa account',
    role: 'member',
    status: 'active',
    avatarUrl: null,
    joinedAt: '2025-05-17T09:35:46.991+00:00',
    isOnline: false,
    lastActiveAt: null,
    activityScore: 10,
    bio: 'Space member'
  },
  {
    id: '163d649b-5cd7-4846-8799-3fd864a44629',
    userId: '73b7ee41-6cef-443e-aaca-da5df5f012cf',
    fullName: 'Nodesfarm',
    role: 'member',
    status: 'active',
    avatarUrl: 'https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/avatars/profiles/73b7ee41-6cef-443e-aaca-da5df5f012cf/1749508773428.jpg',
    joinedAt: '2025-05-18T18:41:08.420156+00:00',
    isOnline: false,
    lastActiveAt: '2025-06-09T22:43:51+00:00',
    activityScore: 45,
    bio: 'Space member'
  },
  {
    id: '9cacc0ae-1327-474d-a0fd-9d8bc184bac0',
    userId: '3353ac98-5cd3-4dab-a6b4-a8899d7a7b19',
    fullName: 'Anxietycores',
    role: 'member',
    status: 'active',
    avatarUrl: null,
    joinedAt: '2025-05-19T17:08:33.182841+00:00',
    isOnline: false,
    lastActiveAt: '2025-06-07T08:55:47.675008+00:00',
    activityScore: 30,
    bio: 'Space member'
  }
];

console.log('✅ REAL MEMBERS from your database:');
realMembers.forEach(member => {
  console.log(`  - ${member.fullName} (${member.role}) - ${member.isOnline ? 'Online' : 'Offline'}`);
});

console.log('\\n📊 Member breakdown:');
console.log(`  - Total active members: ${realMembers.length}`);
console.log(`  - Admins: ${realMembers.filter(m => m.role === 'admin').length}`);
console.log(`  - Members: ${realMembers.filter(m => m.role === 'member').length}`);
console.log(`  - Online now: ${realMembers.filter(m => m.isOnline).length}`);

// Save to localStorage with the correct cache key format
const cacheKey = `members_cache_${spaceId}`;
try {
  localStorage.setItem(cacheKey, JSON.stringify(realMembers));
  console.log('✅ Saved REAL members to localStorage');
} catch (e) {
  console.error('❌ Error saving to localStorage:', e);
}

// Also save member count
const countCacheKey = `member_count_${spaceId}`;
const countData = { count: realMembers.length, lastFetched: Date.now() };
localStorage.setItem(countCacheKey, JSON.stringify(countData));
console.log(`✅ Saved real member count: ${countData.count}`);

// Clear any fake cache
console.log('🧹 Clearing fake cache...');
try {
  const keysToCheck = [
    `members_list_fallback_${spaceId}`,
    `space_members_${spaceId}`,
    `cached_members_${spaceId}`
  ];
  
  keysToCheck.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared cache key: ${key}`);
    }
  });
} catch (e) {
  console.warn('⚠️ Error clearing cache:', e);
}

console.log('\\n🔄 REFRESH THE PAGE NOW (Cmd+R or Ctrl+R)');
console.log('\\n🎯 Expected results with REAL data:');
console.log('- Members section should show "Space Members (6)"');
console.log('- Should display your ACTUAL members:');
console.log('  • Insane Prompts (Member)');
console.log('  • Francis Swift (Admin) - YOU');
console.log('  • Magic Prompts (Admin)');
console.log('  • lokaa account (Member)');
console.log('  • Nodesfarm (Member)');
console.log('  • Anxietycores (Member)');
console.log('- All with their real avatars and activity status'); 