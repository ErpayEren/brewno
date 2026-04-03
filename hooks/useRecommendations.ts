import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

// ─── Content-based recommendations ───────────────────────
// Delegates scoring to the get_recommendations() Supabase RPC.
// Uses pgvector cosine similarity (70%) + BrewScore (30%) server-side,
// supporting thousands of coffees without client-side computation.

export type Recommendation = {
  id: string;
  name: string;
  origin_country: string | null;
  process_method: string | null;
  roast_level: string | null;
  match_score: number;
  avg_rating: string | null;
  brew_score: number | null;
  explanation: string;
};

export function useRecommendations(limit = 10) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['recommendations', user?.id],
    enabled: !!user,
    staleTime: 300_000, // 5 min
    queryFn: async (): Promise<Recommendation[]> => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_recommendations', {
        p_user_id: user.id,
        p_limit: limit,
      });

      if (error || !data) return [];

      const results: Recommendation[] = (data as any[]).map((r) => ({
        id: r.coffee_id,
        name: r.name,
        origin_country: r.origin_country,
        process_method: r.process_method,
        roast_level: r.roast_level,
        match_score: Math.round(r.match_score ?? 0),
        avg_rating: r.avg_rating > 0 ? parseFloat(r.avg_rating).toFixed(1) : null,
        brew_score: r.brew_score ? Number(r.brew_score) : null,
        explanation: r.explanation ?? 'Matched to your taste profile',
      }));

      // Log impressions fire-and-forget (no await, non-blocking)
      void Promise.resolve(
        supabase
          .from('recommendation_logs')
          .insert(
            results.map((r) => ({
              user_id: user.id,
              coffee_id: r.id,
              score: r.match_score,
              reason: 'content' as const,
              shown_at: new Date().toISOString(),
              clicked: false,
            }))
          )
      ).catch(() => {});

      return results;
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

