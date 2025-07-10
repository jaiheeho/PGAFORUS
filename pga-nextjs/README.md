# PGA FOR US - Golf Fantasy Betting Platform

A modern fantasy golf betting application built with Next.js, featuring real-time PGA Tour leaderboard integration and social betting features.

## 🏌️‍♂️ Features

### Core Functionality
- **Fantasy Golf Betting**: Select 5 PGA players and earn points based on tournament performance
- **Real-time Leaderboard**: Live tournament standings with scoring updates
- **Points System**: 
  - 1st place = +3 points
  - Top 10 finish = +1 point
  - 11-30th place = 0 points
  - 31st place or worse = -1 point
  - Cut/Withdrawal = -1 point

### User Features
- **Google OAuth Authentication**: Secure login with Google accounts
- **Bet Management**: Create, view, and delete betting selections
- **Results Tracking**: Real-time points calculation and rankings
- **Player Database**: Comprehensive player information and statistics
- **Responsive Design**: Mobile-friendly interface with modern UI

### Technical Features
- **Next.js 15**: Latest React framework with App Router
- **TypeScript**: Full type safety throughout the application
- **Supabase**: Backend database for bet storage and user management
- **NextAuth.js**: Authentication handling with Google OAuth
- **Tailwind CSS**: Modern styling with component-based design
- **Real-time Data**: PGA Tour leaderboard scraping with fallback data
- **SWR**: Client-side data fetching with caching

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Google OAuth credentials

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pga-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # NextAuth Configuration
   NEXTAUTH_SECRET=your_nextauth_secret_key
   NEXTAUTH_URL=http://localhost:3000

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # JWT Secret (fallback)
   JWT_SECRET=your_jwt_secret_key
   ```

### Supabase Setup

1. **Create a new Supabase project**
2. **Create the bets table**:
   ```sql
   CREATE TABLE bets (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_email TEXT NOT NULL,
     user_name TEXT,
     players TEXT[] NOT NULL,
     tournament_name TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Add RLS policies
   ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view their own bets" ON bets
     FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

   CREATE POLICY "Users can insert their own bets" ON bets
     FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

   CREATE POLICY "Users can delete their own bets" ON bets
     FOR DELETE USING (auth.jwt() ->> 'email' = user_email);
   ```

### Google OAuth Setup

1. **Go to Google Cloud Console**
2. **Create OAuth 2.0 credentials**
3. **Add authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)

### Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to see the application.

## 📱 Application Structure

### Pages
- **Home** (`/`): Dashboard with navigation and quick stats
- **Leaderboard** (`/leaderboard`): Current tournament standings
- **Betting Results** (`/bet`): User's fantasy points and rankings  
- **Manage Bets** (`/manage`): Create and manage player selections
- **Players** (`/players`): Player database and statistics

### API Routes
- `/api/auth/[...nextauth]`: NextAuth authentication
- `/api/bets`: Bet CRUD operations
- `/api/results`: Calculate betting results and points
- `/api/leaderboard`: Tournament leaderboard data
- `/api/players`: Player database

### Components
- **UI Components**: Reusable components (Button, Card, etc.)
- **Layout**: Navigation and page structure
- **Auth Components**: Login forms and user management
- **Player Cards**: Player information display
- **Loading Spinners**: Loading state indicators

## 🎯 Usage Guide

### Creating a Bet
1. **Sign in** with your Google account
2. **Navigate** to "Manage Bets"
3. **Click** "Create New Bet"
4. **Search and select** exactly 5 PGA players
5. **Submit** your selections

### Viewing Results
1. **Go to** "Betting Results" page
2. **View** your total points and player performance
3. **Compare** rankings with other users

### Managing Bets
1. **Access** "Manage Bets" page
2. **View** all your current tournament picks
3. **Delete** bets if needed (before tournament starts)

## 🔧 Development

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Lucide React icons
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Data Fetching**: SWR for client-side, native fetch for server-side
- **Web Scraping**: Cheerio for PGA Tour data extraction

### Key Dependencies
```json
{
  "next": "15.3.5",
  "react": "^19.0.0",
  "typescript": "^5",
  "next-auth": "^4.24.11",
  "@supabase/supabase-js": "^2.50.3",
  "tailwindcss": "^4",
  "swr": "^2.3.4",
  "cheerio": "^1.1.0",
  "lucide-react": "^0.525.0"
}
```

### Architecture Decisions
- **App Router**: Using Next.js 15 App Router for modern routing
- **Server Components**: Leveraging React Server Components for performance
- **Type Safety**: Full TypeScript coverage for reliability
- **Authentication Strategy**: NextAuth.js for OAuth handling
- **Data Persistence**: Supabase for scalable database operations
- **Real-time Updates**: SWR for automatic data synchronization

## 🚀 Deployment

### Vercel (Recommended)
1. **Connect** your GitHub repository to Vercel
2. **Add** environment variables in Vercel dashboard
3. **Deploy** automatically on push to main branch

### Environment Variables for Production
- Update `NEXTAUTH_URL` to your production domain
- Ensure Google OAuth redirect URIs include production URLs
- Verify Supabase RLS policies are properly configured

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Commit** your changes
4. **Push** to the branch
5. **Create** a Pull Request

## 📞 Support

For questions or issues, please create an issue in the GitHub repository.
