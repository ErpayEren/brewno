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

-- ─── BREWSCORE — Materialized view ───────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS coffee_brew_scores AS
SELECT
  c.id,
  c.name,
  c.origin_country,
  c.process_method,
  COUNT(ch.id)                                          AS checkin_count,
  ROUND(AVG(ch.rating)::numeric, 2)                    AS avg_rating,
  -- Recency factor: checkins in last 90 days weighted 2x
  ROUND((
    COALESCE(AVG(ch.rating) FILTER (WHERE ch.created_at > NOW() - INTERVAL '90 days'), AVG(ch.rating)) * 0.45 +
    LEAST(LOG(GREATEST(COUNT(ch.id), 1)) / 5.0, 1.0) * 0.15 +
    ROUND(AVG(ch.rating)::numeric, 2) / 5.0 * 0.40
  ) * 100)::numeric                                    AS brew_score
FROM coffees c
LEFT JOIN checkins ch ON ch.coffee_id = c.id
GROUP BY c.id, c.name, c.origin_country, c.process_method;

CREATE UNIQUE INDEX IF NOT EXISTS brew_scores_id_idx ON coffee_brew_scores (id);

-- Refresh function (call via cron or edge function)
CREATE OR REPLACE FUNCTION refresh_brew_scores()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY coffee_brew_scores;
END;
$$ LANGUAGE plpgsql;

-- ─── TASTE PROFILES — user flavor vectors ────────────────
CREATE TABLE IF NOT EXISTS taste_profiles (
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  floral        FLOAT DEFAULT 0,
  fruity        FLOAT DEFAULT 0,
  sweet         FLOAT DEFAULT 0,
  nutty         FLOAT DEFAULT 0,
  spice         FLOAT DEFAULT 0,
  roasted       FLOAT DEFAULT 0,
  fermented     FLOAT DEFAULT 0,
  earthy        FLOAT DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE taste_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own taste profile" ON taste_profiles;
DROP POLICY IF EXISTS "Users can manage own taste profile" ON taste_profiles;
CREATE POLICY "Users can view own taste profile"   ON taste_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own taste profile" ON taste_profiles FOR ALL    USING (auth.uid() = user_id);

-- ─── BREW GUIDES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brew_guides (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  method      TEXT NOT NULL UNIQUE,  -- V60, Espresso, Chemex, etc.
  title       TEXT NOT NULL,
  description TEXT,
  steps       JSONB NOT NULL,        -- [{step, instruction, duration_sec}]
  ratio       TEXT,                  -- "1:15"
  temp_c      INTEGER,
  grind_size  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brew_guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view brew guides" ON brew_guides;
CREATE POLICY "Anyone can view brew guides" ON brew_guides FOR SELECT USING (true);

-- ─── COFFEE RECOMMENDATIONS log ──────────────────────────
CREATE TABLE IF NOT EXISTS recommendation_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  coffee_id   UUID REFERENCES coffees(id) ON DELETE CASCADE,
  score       FLOAT,
  reason      TEXT,  -- 'collaborative' | 'content' | 'trending'
  shown_at    TIMESTAMPTZ DEFAULT NOW(),
  clicked     BOOLEAN DEFAULT FALSE
);

ALTER TABLE recommendation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendation_logs;
CREATE POLICY "Users can view own recommendations" ON recommendation_logs FOR SELECT USING (auth.uid() = user_id);

-- ─── AUTO-UPDATE TASTE PROFILE after checkin ─────────────
CREATE OR REPLACE FUNCTION update_taste_profile()
RETURNS trigger AS $$
DECLARE
  v_floral    FLOAT := 0;
  v_fruity    FLOAT := 0;
  v_sweet     FLOAT := 0;
  v_nutty     FLOAT := 0;
  v_spice     FLOAT := 0;
  v_roasted   FLOAT := 0;
  v_fermented FLOAT := 0;
  v_earthy    FLOAT := 0;
  note        TEXT;
BEGIN
  -- Map tasting notes to flavor dimensions
  FOREACH note IN ARRAY COALESCE(NEW.tasting_notes, ARRAY[]::TEXT[]) LOOP
    CASE LOWER(note)
      WHEN 'jasmine','rose','chamomile','lavender','orange blossom','floral' THEN v_floral    := v_floral    + 1;
      WHEN 'blueberry','peach','citrus','tropical','strawberry','stone fruit','lemon','lime','fruity' THEN v_fruity := v_fruity + 1;
      WHEN 'caramel','honey','vanilla','brown sugar','nougat','molasses','sweet' THEN v_sweet  := v_sweet    + 1;
      WHEN 'hazelnut','almond','cocoa','dark choc','peanut','nutty' THEN v_nutty               := v_nutty    + 1;
      WHEN 'bergamot','cinnamon','clove','pepper','anise','spice'   THEN v_spice               := v_spice    + 1;
      WHEN 'tobacco','cedar','smoky','burnt','charred','roasted'    THEN v_roasted             := v_roasted  + 1;
      WHEN 'winey','whiskey','funky','sour','kombucha','fermented'  THEN v_fermented           := v_fermented+ 1;
      WHEN 'mushroom','wet soil','mossy','herbal','earthy'          THEN v_earthy              := v_earthy   + 1;
      ELSE NULL;
    END CASE;
  END LOOP;

  -- Upsert with exponential moving average (alpha=0.3) for smooth updates
  INSERT INTO taste_profiles (user_id, floral, fruity, sweet, nutty, spice, roasted, fermented, earthy, updated_at)
  VALUES (NEW.user_id, v_floral, v_fruity, v_sweet, v_nutty, v_spice, v_roasted, v_fermented, v_earthy, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    floral    = taste_profiles.floral    * 0.7 + EXCLUDED.floral    * 0.3,
    fruity    = taste_profiles.fruity    * 0.7 + EXCLUDED.fruity    * 0.3,
    sweet     = taste_profiles.sweet     * 0.7 + EXCLUDED.sweet     * 0.3,
    nutty     = taste_profiles.nutty     * 0.7 + EXCLUDED.nutty     * 0.3,
    spice     = taste_profiles.spice     * 0.7 + EXCLUDED.spice     * 0.3,
    roasted   = taste_profiles.roasted   * 0.7 + EXCLUDED.roasted   * 0.3,
    fermented = taste_profiles.fermented * 0.7 + EXCLUDED.fermented * 0.3,
    earthy    = taste_profiles.earthy    * 0.7 + EXCLUDED.earthy    * 0.3,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_checkin_update_taste ON checkins;
CREATE TRIGGER on_checkin_update_taste
  AFTER INSERT ON checkins
  FOR EACH ROW EXECUTE FUNCTION update_taste_profile();

-- ─── VECTOR EMBEDDINGS ────────────────────────────────────
-- Requires pgvector extension (available in Supabase by default)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to coffees (8-dimensional, matches taste_profiles dimensions)
ALTER TABLE coffees ADD COLUMN IF NOT EXISTS flavor_embedding vector(8);

-- HNSW index for fast approximate nearest-neighbour search
CREATE INDEX IF NOT EXISTS coffees_embedding_hnsw_idx
  ON coffees USING hnsw (flavor_embedding vector_cosine_ops);

-- ─── FLAVOR ONTOLOGY ──────────────────────────────────────
-- Hierarchical flavor table: dimension roots → categories → leaf notes
-- Replaces hardcoded FLAVOR_MAP and supports dynamic updates
CREATE TABLE IF NOT EXISTS flavors (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  parent_id  UUID REFERENCES flavors(id),
  dimension  TEXT CHECK (dimension IN (
    'floral','fruity','sweet','nutty','spice','roasted','fermented','earthy'
  )),
  weight     FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flavors_dimension_idx ON flavors(dimension);
CREATE INDEX IF NOT EXISTS flavors_parent_idx    ON flavors(parent_id);

ALTER TABLE flavors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view flavors" ON flavors;
CREATE POLICY "Anyone can view flavors" ON flavors FOR SELECT USING (true);

-- ─── COFFEE ↔ FLAVOR many-to-many ────────────────────────
CREATE TABLE IF NOT EXISTS coffee_flavors (
  coffee_id  UUID REFERENCES coffees(id)  ON DELETE CASCADE,
  flavor_id  UUID REFERENCES flavors(id)  ON DELETE CASCADE,
  source     TEXT CHECK (source IN ('roaster','community','ml')) DEFAULT 'community',
  confidence FLOAT DEFAULT 1.0,
  PRIMARY KEY (coffee_id, flavor_id, source)
);

CREATE INDEX IF NOT EXISTS coffee_flavors_coffee_idx ON coffee_flavors(coffee_id);
CREATE INDEX IF NOT EXISTS coffee_flavors_flavor_idx ON coffee_flavors(flavor_id);

ALTER TABLE coffee_flavors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view coffee flavors" ON coffee_flavors;
CREATE POLICY "Anyone can view coffee flavors" ON coffee_flavors FOR SELECT USING (true);

-- ─── SEED FLAVOR ONTOLOGY ─────────────────────────────────
-- Dimension roots first, then sub-categories, then leaf notes
-- ON CONFLICT DO NOTHING makes this idempotent
INSERT INTO flavors (name, slug, dimension) VALUES
  -- Dimension roots
  ('floral',    'floral',    'floral'),
  ('fruity',    'fruity',    'fruity'),
  ('sweet',     'sweet',     'sweet'),
  ('nutty',     'nutty',     'nutty'),
  ('spice',     'spice',     'spice'),
  ('roasted',   'roasted',   'roasted'),
  ('fermented', 'fermented', 'fermented'),
  ('earthy',    'earthy',    'earthy')
ON CONFLICT (slug) DO NOTHING;

-- Floral leaf notes
INSERT INTO flavors (name, slug, dimension, parent_id)
SELECT note, slug, 'floral', f.id
FROM (VALUES
  ('jasmine',       'jasmine'),
  ('rose',          'rose'),
  ('chamomile',     'chamomile'),
  ('lavender',      'lavender'),
  ('orange blossom','orange-blossom')
) AS t(note, slug)
JOIN flavors f ON f.slug = 'floral'
ON CONFLICT (slug) DO NOTHING;

-- Fruity sub-categories and leaf notes
INSERT INTO flavors (name, slug, dimension, parent_id)
SELECT note, slug, 'fruity', f.id
FROM (VALUES
  ('blueberry',   'blueberry'),
  ('strawberry',  'strawberry'),
  ('raspberry',   'raspberry'),
  ('peach',       'peach'),
  ('apricot',     'apricot'),
  ('citrus',      'citrus'),
  ('lemon',       'lemon'),
  ('lime',        'lime'),
  ('orange',      'orange'),
  ('tropical',    'tropical'),
  ('mango',       'mango'),
  ('pineapple',   'pineapple'),
  ('stone fruit', 'stone-fruit'),
  ('cherry',      'cherry'),
  ('fig',         'fig')
) AS t(note, slug)
JOIN flavors f ON f.slug = 'fruity'
ON CONFLICT (slug) DO NOTHING;

-- Sweet leaf notes
INSERT INTO flavors (name, slug, dimension, parent_id)
SELECT note, slug, 'sweet', f.id
FROM (VALUES
  ('caramel',     'caramel'),
  ('honey',       'honey'),
  ('vanilla',     'vanilla'),
  ('brown sugar', 'brown-sugar'),
  ('nougat',      'nougat'),
  ('molasses',    'molasses'),
  ('toffee',      'toffee'),
  ('maple syrup', 'maple-syrup'),
  ('praline',     'praline')
) AS t(note, slug)
JOIN flavors f ON f.slug = 'sweet'
ON CONFLICT (slug) DO NOTHING;

-- Nutty leaf notes
INSERT INTO flavors (name, slug, dimension, parent_id)
SELECT note, slug, 'nutty', f.id
FROM (VALUES
  ('hazelnut',   'hazelnut'),
  ('almond',     'almond'),
  ('peanut',     'peanut'),
  ('walnut',     'walnut'),
  ('cocoa',      'cocoa'),
  ('dark choc',  'dark-choc'),
  ('milk choc',  'milk-choc'),
  ('marzipan',   'marzipan')
) AS t(note, slug)
JOIN flavors f ON f.slug = 'nutty'
ON CONFLICT (slug) DO NOTHING;

-- Spice leaf notes
INSERT INTO flavors (name, slug, dimension, parent_id)
SELECT note, slug, 'spice', f.id
FROM (VALUES
  ('bergamot',  'bergamot'),
  ('cinnamon',  'cinnamon'),
  ('clove',     'clove'),
  ('pepper',    'pepper'),
  ('anise',     'anise'),
  ('cardamom',  'cardamom'),
  ('ginger',    'ginger'),
  ('nutmeg',    'nutmeg')
) AS t(note, slug)
JOIN flavors f ON f.slug = 'spice'
ON CONFLICT (slug) DO NOTHING;

-- Roasted leaf notes
INSERT INTO flavors (name, slug, dimension, parent_id)
SELECT note, slug, 'roasted', f.id
FROM (VALUES
  ('tobacco', 'tobacco'),
  ('cedar',   'cedar'),
  ('smoky',   'smoky'),
  ('burnt',   'burnt'),
  ('charred', 'charred'),
  ('ash',     'ash'),
  ('leather', 'leather'),
  ('rubber',  'rubber')
) AS t(note, slug)
JOIN flavors f ON f.slug = 'roasted'
ON CONFLICT (slug) DO NOTHING;

-- Fermented leaf notes
INSERT INTO flavors (name, slug, dimension, parent_id)
SELECT note, slug, 'fermented', f.id
FROM (VALUES
  ('winey',    'winey'),
  ('whiskey',  'whiskey'),
  ('funky',    'funky'),
  ('sour',     'sour'),
  ('kombucha', 'kombucha'),
  ('vinegar',  'vinegar'),
  ('beer',     'beer'),
  ('brandy',   'brandy')
) AS t(note, slug)
JOIN flavors f ON f.slug = 'fermented'
ON CONFLICT (slug) DO NOTHING;

-- Earthy leaf notes
INSERT INTO flavors (name, slug, dimension, parent_id)
SELECT note, slug, 'earthy', f.id
FROM (VALUES
  ('mushroom', 'mushroom'),
  ('wet soil', 'wet-soil'),
  ('mossy',    'mossy'),
  ('herbal',   'herbal'),
  ('hay',      'hay'),
  ('woody',    'woody'),
  ('cereal',   'cereal'),
  ('grass',    'grass')
) AS t(note, slug)
JOIN flavors f ON f.slug = 'earthy'
ON CONFLICT (slug) DO NOTHING;

-- ─── COMPUTE COFFEE EMBEDDING ─────────────────────────────
-- Builds an 8-dimensional flavor vector for a coffee from
-- community tasting notes in the last 90 days.
-- Uses the flavors ontology table for note → dimension mapping,
-- so new flavors added to the table are picked up automatically.
-- Call: SELECT compute_coffee_embedding('<coffee_uuid>');
CREATE OR REPLACE FUNCTION compute_coffee_embedding(p_coffee_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  dim_counts RECORD;
  v_total    FLOAT;
BEGIN
  -- Join tasting notes against flavors ontology to count per dimension
  SELECT
    COALESCE(SUM(CASE WHEN f.dimension = 'floral'    THEN 1 ELSE 0 END), 0)::FLOAT AS v_floral,
    COALESCE(SUM(CASE WHEN f.dimension = 'fruity'    THEN 1 ELSE 0 END), 0)::FLOAT AS v_fruity,
    COALESCE(SUM(CASE WHEN f.dimension = 'sweet'     THEN 1 ELSE 0 END), 0)::FLOAT AS v_sweet,
    COALESCE(SUM(CASE WHEN f.dimension = 'nutty'     THEN 1 ELSE 0 END), 0)::FLOAT AS v_nutty,
    COALESCE(SUM(CASE WHEN f.dimension = 'spice'     THEN 1 ELSE 0 END), 0)::FLOAT AS v_spice,
    COALESCE(SUM(CASE WHEN f.dimension = 'roasted'   THEN 1 ELSE 0 END), 0)::FLOAT AS v_roasted,
    COALESCE(SUM(CASE WHEN f.dimension = 'fermented' THEN 1 ELSE 0 END), 0)::FLOAT AS v_fermented,
    COALESCE(SUM(CASE WHEN f.dimension = 'earthy'    THEN 1 ELSE 0 END), 0)::FLOAT AS v_earthy
  INTO dim_counts
  FROM checkins ch, unnest(ch.tasting_notes) AS note(val)
  JOIN flavors f ON LOWER(note.val) = LOWER(f.name)
  WHERE ch.coffee_id = p_coffee_id
    AND ch.created_at > NOW() - INTERVAL '90 days'
    AND f.dimension IS NOT NULL;

  v_total := SQRT(
    dim_counts.v_floral^2    + dim_counts.v_fruity^2    +
    dim_counts.v_sweet^2     + dim_counts.v_nutty^2     +
    dim_counts.v_spice^2     + dim_counts.v_roasted^2   +
    dim_counts.v_fermented^2 + dim_counts.v_earthy^2
  );

  IF v_total > 0 THEN
    UPDATE coffees
    SET flavor_embedding = ARRAY[
      dim_counts.v_floral    / v_total,
      dim_counts.v_fruity    / v_total,
      dim_counts.v_sweet     / v_total,
      dim_counts.v_nutty     / v_total,
      dim_counts.v_spice     / v_total,
      dim_counts.v_roasted   / v_total,
      dim_counts.v_fermented / v_total,
      dim_counts.v_earthy    / v_total
    ]::vector(8)
    WHERE id = p_coffee_id;
  END IF;
END;
$$;

-- ─── GET RECOMMENDATIONS RPC ──────────────────────────────
-- Returns top N coffee recommendations for a user.
-- Scoring: 70% cosine similarity (embedding) + 30% BrewScore.
-- Falls back to BrewScore-only when embeddings are unavailable.
-- Includes an explanation string for UI display.
CREATE OR REPLACE FUNCTION get_recommendations(
  p_user_id UUID,
  p_limit   INT DEFAULT 10
)
RETURNS TABLE (
  coffee_id      UUID,
  name           TEXT,
  origin_country TEXT,
  process_method TEXT,
  roast_level    TEXT,
  match_score    FLOAT,
  avg_rating     FLOAT,
  brew_score     NUMERIC,
  explanation    TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile   taste_profiles%ROWTYPE;
  user_vec    vector(8);
  v_total     FLOAT;
  top_dim     TEXT;
  has_profile BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_profile FROM taste_profiles WHERE user_id = p_user_id;

  IF FOUND THEN
    v_total := SQRT(
      COALESCE(v_profile.floral,    0)^2 + COALESCE(v_profile.fruity,    0)^2 +
      COALESCE(v_profile.sweet,     0)^2 + COALESCE(v_profile.nutty,     0)^2 +
      COALESCE(v_profile.spice,     0)^2 + COALESCE(v_profile.roasted,   0)^2 +
      COALESCE(v_profile.fermented, 0)^2 + COALESCE(v_profile.earthy,    0)^2
    );

    IF v_total > 0 THEN
      has_profile := TRUE;
      user_vec := ARRAY[
        COALESCE(v_profile.floral,    0) / v_total,
        COALESCE(v_profile.fruity,    0) / v_total,
        COALESCE(v_profile.sweet,     0) / v_total,
        COALESCE(v_profile.nutty,     0) / v_total,
        COALESCE(v_profile.spice,     0) / v_total,
        COALESCE(v_profile.roasted,   0) / v_total,
        COALESCE(v_profile.fermented, 0) / v_total,
        COALESCE(v_profile.earthy,    0) / v_total
      ]::vector(8);

      -- Find the user's strongest flavor dimension for explanation text
      SELECT dim INTO top_dim
      FROM (VALUES
        ('floral',    COALESCE(v_profile.floral,    0)),
        ('fruity',    COALESCE(v_profile.fruity,    0)),
        ('sweet',     COALESCE(v_profile.sweet,     0)),
        ('nutty',     COALESCE(v_profile.nutty,     0)),
        ('spice',     COALESCE(v_profile.spice,     0)),
        ('roasted',   COALESCE(v_profile.roasted,   0)),
        ('fermented', COALESCE(v_profile.fermented, 0)),
        ('earthy',    COALESCE(v_profile.earthy,    0))
      ) AS t(dim, val)
      ORDER BY val DESC
      LIMIT 1;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.origin_country,
    c.process_method,
    c.roast_level,
    -- Scoring: embedding similarity (70%) + BrewScore normalised (30%)
    -- Falls back to BrewScore-only when no embedding or no profile
    ROUND((
      CASE
        WHEN has_profile AND c.flavor_embedding IS NOT NULL
          THEN (1.0 - (c.flavor_embedding <=> user_vec)) * 70.0
        ELSE 0.0
      END
      + COALESCE(cbs.brew_score, 50.0) / 100.0 * 30.0
    ))::FLOAT                              AS match_score,
    COALESCE(cbs.avg_rating, 0)::FLOAT     AS avg_rating,
    COALESCE(cbs.brew_score, 50)::NUMERIC  AS brew_score,
    CASE
      WHEN NOT has_profile OR c.flavor_embedding IS NULL
        THEN 'Popular among specialty coffee lovers'
      WHEN (1.0 - (c.flavor_embedding <=> user_vec)) >= 0.85
        THEN 'Perfect match for your taste profile'
      WHEN top_dim = 'floral'
        THEN 'Because you love floral notes'
      WHEN top_dim = 'fruity'
        THEN 'Because you love fruity coffees'
      WHEN top_dim = 'sweet'
        THEN 'Because you love sweet notes'
      WHEN top_dim = 'nutty'
        THEN 'Because you love nutty & chocolatey flavors'
      WHEN top_dim = 'spice'
        THEN 'Because you love spicy & complex notes'
      WHEN top_dim = 'roasted'
        THEN 'Because you love deep roasted flavors'
      WHEN top_dim = 'fermented'
        THEN 'Because you love bold fermented notes'
      WHEN top_dim = 'earthy'
        THEN 'Because you love earthy & herbal notes'
      ELSE 'Matched to your taste profile'
    END                                    AS explanation
  FROM coffees c
  LEFT JOIN coffee_brew_scores cbs ON cbs.id = c.id
  WHERE c.id NOT IN (
    SELECT coffee_id FROM checkins WHERE user_id = p_user_id
  )
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$;

-- ─── RECOMMENDATION LOGS — add insert/update policies ─────
DROP POLICY IF EXISTS "Users can insert own recommendation logs" ON recommendation_logs;
DROP POLICY IF EXISTS "Users can update own recommendation logs" ON recommendation_logs;
CREATE POLICY "Users can insert own recommendation logs"
  ON recommendation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendation logs"
  ON recommendation_logs FOR UPDATE USING (auth.uid() = user_id);
