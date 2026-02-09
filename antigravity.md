# Antigravity Project Context

This file stores critical project metadata to ensure consistency and avoid errors in multi-project environments.

## Supabase Configuration
- **Active Project ID**: `nmddvthcsyppyjncqfsk`
- **Project Name**: `francischukwuma706@icloud.com's Project`
- **Organization**: `lokaa` (`pyzthjtfaocfzxocllna`)
- **Region**: `eu-west-2` (London)

## Important Database State
- **REPLICA IDENTITY FULL**: Applied to the following tables to ensure reliable real-time filtering for `UPDATE` and `DELETE` events:
    - `posts`
    - `post_comments`
    - `chat_messages`
    - `chat_conversations`
    - `notifications`
    - `space_members`
    - `space_events`

## Critical Hooks & Services
- **Real-time Manager**: `RealtimeManager.ts`
- **Unified Real-time Hook**: `useRealtime.ts`
- **Chat Real-time**: `ChatRealtimeService.ts`
