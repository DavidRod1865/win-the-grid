# Super Bowl Squares Calculator

A modern, mobile-friendly web application for creating and managing Super Bowl squares games. Features both free and premium tiers with localStorage and Supabase integration.

## 🎯 Features

### Free Tier (No Account Required)
- ✅ Create and edit 10x10 squares grids
- ✅ 10 comprehensive payout templates with descriptions
- ✅ Add participant names to boxes
- ✅ Generate random numbers (0-9) for rows/columns
- ✅ Basic PDF export
- ✅ Mobile-responsive design
- ✅ Data persistence via localStorage

### Premium Tier (Free Account)
- 🔜 Grid sharing with join codes
- 🔜 Real-time collaboration
- 🔜 Enhanced Excel exports
- 🔜 Game day mode with live scoring
- 🔜 Cloud backup and sync
- 🔜 Multiple grids management
- 🔜 PWA features

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **Free Storage**: localStorage
- **Premium Storage**: Supabase (Database + Auth + Realtime)
- **Exports**: jsPDF, xlsx, html2canvas

### Storage Abstraction
The app uses a hybrid storage approach:
- **StorageFactory**: Automatically selects provider based on user authentication
- **LocalStorageProvider**: Handles free tier functionality
- **SupabaseProvider**: Handles premium tier functionality

## 📊 Database Schema

The Supabase schema is ready and includes:

### Tables
- `grids`: Main grid data, settings, and metadata
- `grid_boxes`: Individual box participants (0-99 per grid)
- `game_events`: Live scoring and game history

### Key Features
- Row Level Security (RLS) for access control
- Automatic join code generation
- Real-time updates support
- Audit trail for scoring events

## 🚀 Setup Instructions

### 1. Development Setup
```bash
npm install
npm run dev
```

### 2. Supabase Configuration (For Premium Features)
1. Create a Supabase project
2. Copy `.env.example` to `.env.local`
3. Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

### 3. Database Setup
Run the SQL files in order:
```bash
# In your Supabase SQL editor:
1. sql/schema.sql      # Creates tables and functions
2. sql/rls.sql         # Sets up security policies  
3. sql/functions.sql   # Adds helper functions
```

## 🔄 Current Implementation Status

### ✅ Completed
- Storage abstraction layer
- Feature gating system
- Upgrade prompts and modals
- Free tier functionality
- SQL schema and functions

### 🔜 Next Steps (Pending Supabase Keys)
1. **Authentication**: Magic link login implementation
2. **Sharing**: Join codes and shareable URLs
3. **Real-time**: Live collaboration features
4. **Game Day**: Live scoring mode
5. **Mobile**: PWA and optimization

## 💡 User Experience

### Free User Journey
1. Visit site → Create grid locally
2. Fill names → Generate numbers → Export PDF
3. See "Share Grid" → Upgrade prompt → Optional signup

### Premium User Journey  
1. Sign up → Import existing grid (if any)
2. Create shareable grid → Get join code
3. Share with others → Real-time collaboration
4. Game day → Live scoring mode

## 🔧 Development Notes

### Feature Detection
```typescript
import { getFeatures } from '@/lib/storage';

const features = getFeatures();
if (features.canShare) {
  // Show sharing UI
} else {
  // Show upgrade prompt
}
```

### Storage Usage
```typescript
import { StorageFactory } from '@/lib/storage';

// Automatically uses correct provider
const gridId = await StorageFactory.getInstance().saveGrid(gridState);
```

## 📱 Mobile Optimizations

The app is designed mobile-first with:
- Touch-friendly grid squares (44px minimum)
- Responsive breakpoints
- Progressive enhancement for premium features
- Future PWA support for premium users

## 🎮 Game Day Mode (Premium)

Planned features for live game experience:
- Fullscreen grid display
- Live score input (admin only)
- Auto-highlight winners
- Real-time updates for all viewers
- TV-optimized layout

## 🔒 Security

- Row Level Security (RLS) on all tables
- Grid creators control their grids
- Public read access for sharing
- Secure join code generation
- No sensitive data exposure

## 📈 Monetization Strategy

**Free Tier**: Full local functionality to showcase value
**Premium Tier**: Collaboration and advanced features
**No Payments**: Keep it simple with just account signup

This approach maximizes user adoption while providing clear upgrade incentives.

---

## Getting Started (Development)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.