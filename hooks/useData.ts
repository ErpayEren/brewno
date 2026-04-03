import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

// ─── Feed ─────────────────────────────────────────────────────────────────────
export function useFeed(filter: string = 'All') {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Realtime subscription — invalidate feed on new checkins/likes
  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, () => {
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['feed', filter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('checkins')
        .select(`
          id, rating, notes, photo_url, tasting_notes, brew_method, created_at,
          users:user_id ( id, username, avatar_url ),
          coffees:coffee_id ( id, name, origin_country, origin_region, process_method, roast_level,
            roasteries:roastery_id ( name, is_verified ) ),
          cafes:cafe_id ( id, name, address ),
          likes ( user_id ),
          comments ( id )
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (filter === 'Following' && user) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const ids = follows?.map((f: any) => f.following_id) ?? [];
        if (ids.length > 0) query = query.in('user_id', ids);
        else return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

// ─── Like/Unlike ─────────────────────────────────────────────────────────────
export function useLike() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ checkinId, liked }: { checkinId: string; liked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (liked) {
        await supabase.from('likes').delete()
          .eq('user_id', user.id).eq('checkin_id', checkinId);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, checkin_id: checkinId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

// ─── Coffees ─────────────────────────────────────────────────────────────────
export function useCoffees(query: string = '', filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: ['coffees', query, filters],
    queryFn: async () => {
      let q = supabase
        .from('coffees')
        .select(`
          id, name, origin_country, origin_region, process_method, roast_level, altitude_masl, variety,
          roasteries:roastery_id ( name, is_verified ),
          checkins ( id, rating )
        `);

      if (query) {
        q = q.or(`name.ilike.%${query}%,origin_country.ilike.%${query}%,origin_region.ilike.%${query}%`);
      }
      if (filters.Process && filters.Process !== 'All') {
        q = q.ilike('process_method', `%${filters.Process}%`);
      }
      if (filters.Roast && filters.Roast !== 'All') {
        q = q.ilike('roast_level', `%${filters.Roast}%`);
      }
      if (filters.Origin && filters.Origin !== 'All') {
        q = q.ilike('origin_country', `%${filters.Origin}%`);
      }

      const { data, error } = await q.limit(50);
      if (error) throw error;

      return (data ?? [])
        .map((c: any) => {
          const checkinCount = c.checkins?.length ?? 0;
          const avgRating = checkinCount
            ? c.checkins.reduce((a: number, b: any) => a + (b.rating ?? 0), 0) / checkinCount
            : 0;
          // Approximate BrewScore from available data (mirrors materialized view formula)
          const brewScore = Math.round(
            (avgRating / 5) * 0.45 * 100 +
            Math.min(Math.log(Math.max(checkinCount, 1)) / 5, 1) * 0.15 * 100 +
            (avgRating / 5) * 0.40 * 100
          );
          return {
            ...c,
            checkin_count: checkinCount,
            avg_rating: checkinCount ? avgRating.toFixed(1) : null,
            brew_score: checkinCount ? brewScore : null,
          };
        })
        // Sort by brew_score descending so highest-rated coffees appear first
        .sort((a: any, b: any) => (b.brew_score ?? 0) - (a.brew_score ?? 0));
    },
    staleTime: 60_000,
  });
}

// ─── Cafes (with distance placeholder) ───────────────────────────────────────
export function useCafes(searchQuery: string = '') {
  return useQuery({
    queryKey: ['cafes', searchQuery],
    queryFn: async () => {
      let q = supabase
        .from('cafes')
        .select(`id, name, address, lat, lng, is_specialty`)
        .eq('is_specialty', true)
        .order('name');

      if (searchQuery) {
        q = q.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await q.limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

// ─── Submit Check-in ──────────────────────────────────────────────────────────
export function useSubmitCheckin() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: {
      coffee_id: string;
      cafe_id: string | null;
      rating: number;
      notes: string;
      tasting_notes: string[];
      brew_method: string | null;
      photo_url: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('checkins')
        .insert({ user_id: user.id, ...payload })
        .select()
        .single();
      if (error) throw error;

      // Try to award badges after check-in
      await checkAndAwardBadges(user.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// ─── Profile ─────────────────────────────────────────────────────────────────
export function useProfile(userId?: string) {
  const { user } = useAuthStore();
  const id = userId ?? user?.id;

  return useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, username, full_name, avatar_url, bio, location, created_at,
          checkins ( id, rating, created_at,
            coffees:coffee_id ( name, origin_country ),
            cafes:cafe_id ( name )
          ),
          followers:follows!following_id ( follower_id ),
          following:follows!follower_id ( following_id ),
          wishlists ( coffee_id,
            coffees:coffee_id ( id, name, origin_country )
          ),
          user_badges (
            earned_at,
            badges:badge_id ( id, name, icon, description )
          )
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

// ─── Follow / Unfollow ────────────────────────────────────────────────────────
export function useFollow() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ targetId, isFollowing }: { targetId: string; isFollowing: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (isFollowing) {
        await supabase.from('follows').delete()
          .eq('follower_id', user.id).eq('following_id', targetId);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export function useWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ coffeeId, inWishlist }: { coffeeId: string; inWishlist: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (inWishlist) {
        await supabase.from('wishlists').delete()
          .eq('user_id', user.id).eq('coffee_id', coffeeId);
      } else {
        await supabase.from('wishlists').insert({ user_id: user.id, coffee_id: coffeeId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}

// ─── Barcode Lookup ───────────────────────────────────────────────────────────
export async function lookupBarcode(barcode: string) {
  const { data, error } = await supabase
    .from('coffees')
    .select('id, name, origin_country, roasteries:roastery_id(name)')
    .eq('barcode', barcode)
    .single();
  return { coffee: data, error };
}

// ─── Similar Coffees ──────────────────────────────────────────────────────────
export function useSimilarCoffees(coffeeId: string, originCountry?: string | null, processMethod?: string | null) {
  return useQuery({
    queryKey: ['similar', coffeeId, originCountry, processMethod],
    enabled: !!coffeeId && (!!originCountry || !!processMethod),
    queryFn: async () => {
      // Score: same origin = 2pts, same process = 1pt — fetch candidates then rank client-side
      let q = supabase
        .from('coffees')
        .select(`
          id, name, origin_country, process_method, roast_level,
          roasteries:roastery_id ( name, is_verified ),
          checkins ( rating )
        `)
        .neq('id', coffeeId)
        .limit(40);

      // Prefer same origin
      if (originCountry) {
        q = q.eq('origin_country', originCountry);
      }

      const { data, error } = await q;
      if (error) throw error;

      const scored = (data ?? []).map((c: any) => {
        let score = 0;
        if (c.origin_country === originCountry) score += 2;
        if (c.process_method === processMethod) score += 1;
        const avg = c.checkins?.length
          ? c.checkins.reduce((a: number, b: any) => a + (b.rating ?? 0), 0) / c.checkins.length
          : 0;
        return { ...c, _score: score, avg_rating: avg > 0 ? avg.toFixed(1) : null };
      });

      return scored
        .sort((a, b) => b._score - a._score || parseFloat(b.avg_rating ?? '0') - parseFloat(a.avg_rating ?? '0'))
        .slice(0, 6);
    },
    staleTime: 120_000,
  });
}

// ─── Badge Engine ─────────────────────────────────────────────────────────────
async function checkAndAwardBadges(userId: string) {
  try {
    // Get user stats
    const { data: checkins } = await supabase
      .from('checkins')
      .select('id, coffees:coffee_id(origin_country, process_method)')
      .eq('user_id', userId);

    if (!checkins) return;

    const count = checkins.length;
    const countries = new Set(checkins.map((c: any) => c.coffees?.origin_country).filter(Boolean));
    const naturalCount = checkins.filter((c: any) => c.coffees?.process_method?.toLowerCase().includes('natural')).length;

    const { data: allBadges } = await supabase.from('badges').select('id, name');
    const { data: earned } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId);
    const earnedIds = new Set(earned?.map((e: any) => e.badge_id));

    const toAward: string[] = [];
    for (const badge of allBadges ?? []) {
      if (earnedIds.has(badge.id)) continue;
      if (badge.name === 'First Pour' && count >= 1) toAward.push(badge.id);
      if (badge.name === '10 Check-ins' && count >= 10) toAward.push(badge.id);
      if (badge.name === '100 Check-ins' && count >= 100) toAward.push(badge.id);
      if (badge.name === 'World Traveler' && countries.size >= 5) toAward.push(badge.id);
      if (badge.name === 'Globe Trotter' && countries.size >= 10) toAward.push(badge.id);
      if (badge.name === 'Natural Lover' && naturalCount >= 10) toAward.push(badge.id);
    }

    if (toAward.length > 0) {
      await supabase.from('user_badges').insert(
        toAward.map(badge_id => ({ user_id: userId, badge_id }))
      );
    }
  } catch { /* non-blocking */ }
}

// ─── Recommendation click tracking ────────────────────────────────────────────
// Call when user navigates to a coffee that was shown as a recommendation.
// Marks the most recent unclicked log entry for that user+coffee pair.
export async function logRecommendationClick(userId: string, coffeeId: string) {
  try {
    await supabase
      .from('recommendation_logs')
      .update({ clicked: true })
      .eq('user_id', userId)
      .eq('coffee_id', coffeeId)
      .eq('clicked', false);
  } catch { /* non-blocking */ }
}
