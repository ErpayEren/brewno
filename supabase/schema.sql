-- ═══════════════════════════════════════════════════════
-- BREWNO — Complete Database Schema with RLS
-- Idempotent: safe to run multiple times
-- ═══════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── TABLES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roasteries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  location TEXT,
  website TEXT,
  instagram TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coffees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  roastery_id UUID REFERENCES roasteries(id),
  origin_country TEXT,
  origin_region TEXT,
  process_method TEXT,
  roast_level TEXT,
  altitude_masl INTEGER,
  variety TEXT,
  description TEXT,
  barcode TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search vector
ALTER TABLE coffees ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS coffees_search_idx ON coffees USING GIN(search_vector);
CREATE OR REPLACE FUNCTION update_coffees_search()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.origin_country, '') || ' ' ||
    COALESCE(NEW.origin_region, '') || ' ' ||
    COALESCE(NEW.variety, '') || ' ' ||
    COALESCE(NEW.process_method, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS coffees_search_trigger ON coffees;
CREATE TRIGGER coffees_search_trigger
  BEFORE INSERT OR UPDATE ON coffees
  FOR EACH ROW EXECUTE FUNCTION update_coffees_search();

CREATE TABLE IF NOT EXISTS cafes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Turkey',
  lat FLOAT,
  lng FLOAT,
  google_place_id TEXT,
  is_specialty BOOLEAN DEFAULT TRUE,
  instagram TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  coffee_id UUID REFERENCES coffees(id),
  cafe_id UUID REFERENCES cafes(id),
  rating FLOAT CHECK(rating >= 0.5 AND rating <= 5),
  brew_method TEXT,
  notes TEXT,
  photo_url TEXT,
  tasting_notes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, checkin_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlists (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  coffee_id UUID REFERENCES coffees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, coffee_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  criteria JSONB
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, badge_id)
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffees ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE roasteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- ─── POLICIES — drop first so re-runs are safe ────────────
-- users
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can view all profiles"  ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- coffees / cafes / roasteries / badges — public read
DROP POLICY IF EXISTS "Anyone can view coffees"     ON coffees;
DROP POLICY IF EXISTS "Anyone can view cafes"       ON cafes;
DROP POLICY IF EXISTS "Anyone can view roasteries"  ON roasteries;
DROP POLICY IF EXISTS "Anyone can view badges"      ON badges;
CREATE POLICY "Anyone can view coffees"    ON coffees    FOR SELECT USING (true);
CREATE POLICY "Anyone can view cafes"      ON cafes      FOR SELECT USING (true);
CREATE POLICY "Anyone can view roasteries" ON roasteries FOR SELECT USING (true);
CREATE POLICY "Anyone can view badges"     ON badges     FOR SELECT USING (true);

-- checkins
DROP POLICY IF EXISTS "Anyone can view checkins"               ON checkins;
DROP POLICY IF EXISTS "Authenticated users can insert checkins" ON checkins;
DROP POLICY IF EXISTS "Users can update own checkins"          ON checkins;
DROP POLICY IF EXISTS "Users can delete own checkins"          ON checkins;
CREATE POLICY "Anyone can view checkins"                ON checkins FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert checkins" ON checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins"           ON checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins"           ON checkins FOR DELETE USING (auth.uid() = user_id);

-- likes
DROP POLICY IF EXISTS "Anyone can view likes"      ON likes;
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
CREATE POLICY "Anyone can view likes"      ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON likes FOR ALL    USING (auth.uid() = user_id);

-- comments
DROP POLICY IF EXISTS "Anyone can view comments"      ON comments;
DROP POLICY IF EXISTS "Users can insert comments"     ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Anyone can view comments"      ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments"     ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- follows
DROP POLICY IF EXISTS "Anyone can view follows"      ON follows;
DROP POLICY IF EXISTS "Users can manage own follows" ON follows;
CREATE POLICY "Anyone can view follows"      ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON follows FOR ALL    USING (auth.uid() = follower_id);

-- wishlists
DROP POLICY IF EXISTS "Users can view own wishlist"   ON wishlists;
DROP POLICY IF EXISTS "Users can manage own wishlist" ON wishlists;
CREATE POLICY "Users can view own wishlist"   ON wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own wishlist" ON wishlists FOR ALL    USING (auth.uid() = user_id);

-- user_badges
DROP POLICY IF EXISTS "Users can view own badges"  ON user_badges;
DROP POLICY IF EXISTS "System can insert badges"   ON user_badges;
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert badges"  ON user_badges FOR INSERT WITH CHECK (true);

-- ─── AUTO-CREATE USER PROFILE TRIGGER ──────────────────────
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ─── REALTIME — safe to run multiple times ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'checkins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE checkins;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE likes;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'follows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE follows;
  END IF;
END $$;
