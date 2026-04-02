import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

// ─── Content-based recommendations ───────────────────────
// Matches user's taste profile vector against coffee flavor categories
// Returns top coffees the user hasn't tried yet, sorted by match score

export function useRecommendations(limit = 10) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['recommendations', user?.id],
    enabled: !!user,
    staleTime: 300_000, // 5 min
    queryFn: async () => {
      if (!user) return [];

      // 1. Get user taste profile
      const { data: profile } = await supabase
        .from('taste_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // 2. Get coffees user already checked in
      const { data: tried } = await supabase
        .from('checkins')
        .select('coffee_id')
        .eq('user_id', user.id);
      const triedIds = new Set(tried?.map((c: any) => c.coffee_id) ?? []);

      // 3. Get all coffees with their community tasting notes
      const { data: coffees } = await supabase
        .from('coffees')
        .select(`
          id, name, origin_country, process_method, roast_level,
          roasteries:roastery_id ( name, is_verified ),
          checkins ( rating, tasting_notes )
        `)
        .limit(100);

      if (!coffees) return [];

      // 4. Score each coffee against taste profile
      const FLAVOR_MAP: Record<string, string[]> = {
        floral:    ['jasmine','rose','chamomile','lavender','orange blossom','floral'],
        fruity:    ['blueberry','peach','citrus','tropical','strawberry','stone fruit','lemon','lime','fruity'],
        sweet:     ['caramel','honey','vanilla','brown sugar','nougat','molasses','sweet'],
        nutty:     ['hazelnut','almond','cocoa','dark choc','peanut','nutty'],
        spice:     ['bergamot','cinnamon','clove','pepper','anise','spice'],
        roasted:   ['tobacco','cedar','smoky','burnt','charred','roasted'],
        fermented: ['winey','whiskey','funky','sour','kombucha','fermented'],
        earthy:    ['mushroom','wet soil','mossy','herbal','earthy'],
      };

      const userVector = profile ?? {
        floral: 0, fruity: 1, sweet: 1, nutty: 0,
        spice: 0, roasted: 0, fermented: 0, earthy: 0,
      };

      // Normalize user vector
      const uvValues = Object.values(userVector).filter(v => typeof v === 'number') as number[];
      const uvMag = Math.sqrt(uvValues.reduce((a, b) => a + b * b, 0)) || 1;

      const scored = coffees
        .filter((c: any) => !triedIds.has(c.id))
        .map((c: any) => {
          // Build coffee flavor vector from community notes
          const noteFreq: Record<string, number> = {};
          for (const ch of c.checkins ?? []) {
            for (const n of ch.tasting_notes ?? []) {
              noteFreq[n.toLowerCase()] = (noteFreq[n.toLowerCase()] ?? 0) + 1;
            }
          }

          const coffeeVector: Record<string, number> = {};
          for (const [dim, keys] of Object.entries(FLAVOR_MAP)) {
            coffeeVector[dim] = keys.reduce((a, k) => a + (noteFreq[k] ?? 0), 0);
          }

          // Cosine similarity
          const cvValues = Object.values(coffeeVector) as number[];
          const cvMag = Math.sqrt(cvValues.reduce((a, b) => a + b * b, 0)) || 1;
          const dot = Object.keys(FLAVOR_MAP).reduce((a, dim) => {
            return a + ((userVector as any)[dim] ?? 0) * (coffeeVector[dim] ?? 0);
          }, 0);
          const similarity = dot / (uvMag * cvMag);

          // BrewScore bonus
          const avgRating = c.checkins?.length
            ? c.checkins.reduce((a: number, b: any) => a + (b.rating ?? 0), 0) / c.checkins.length
            : 0;

          const matchScore = similarity * 0.7 + (avgRating / 5) * 0.3;

          return {
            ...c,
            match_score: Math.round(matchScore * 100),
            avg_rating: avgRating > 0 ? avgRating.toFixed(1) : null,
            checkin_count: c.checkins?.length ?? 0,
          };
        })
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, limit);

      return scored;
    },
  });
}

// ─── Trending coffees (last 7 days) ──────────────────────
export function useTrending(limit = 8) {
  return useQuery({
    queryKey: ['trending'],
    staleTime: 600_000, // 10 min
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('checkins')
        .select(`
          coffee_id,
          coffees:coffee_id ( id, name, origin_country, process_method, roast_level,
            roasteries:roastery_id ( name, is_verified )
          ),
          rating
        `)
        .gte('created_at', since)
        .limit(200);

      if (error || !data) return [];

      // Aggregate by coffee
      const agg: Record<string, { coffee: any; count: number; totalRating: number }> = {};
      for (const row of data) {
        const id = row.coffee_id;
        if (!agg[id]) agg[id] = { coffee: row.coffees, count: 0, totalRating: 0 };
        agg[id].count++;
        agg[id].totalRating += row.rating ?? 0;
      }

      return Object.values(agg)
        .map(({ coffee, count, totalRating }) => ({
          ...coffee,
          checkin_count: count,
          avg_rating: count > 0 ? (totalRating / count).toFixed(1) : null,
        }))
        .sort((a, b) => b.checkin_count - a.checkin_count)
        .slice(0, limit);
    },
  });
}

// ─── Brew guides ──────────────────────────────────────────
export function useBrewGuides() {
  return useQuery({
    queryKey: ['brew-guides'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brew_guides')
        .select('*')
        .order('method');
      if (error) throw error;
      return data ?? [];
    },
  });
}
