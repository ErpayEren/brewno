import { Platform } from 'react-native';
// Only load the URL polyfill on native — it conflicts with the browser's native URL implementation
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? '';

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey
  ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? '';

// Custom SecureStore adapter — guards against SSR where localStorage is undefined
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return Promise.resolve(null);
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Type exports from database schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      coffees: {
        Row: {
          id: string;
          name: string;
          roastery_id: string | null;
          origin_country: string | null;
          origin_region: string | null;
          process_method: string | null;
          roast_level: string | null;
          altitude_masl: number | null;
          variety: string | null;
          description: string | null;
          barcode: string | null;
          flavor_embedding: number[] | null;
          created_at: string;
        };
      };
      coffee_brew_scores: {
        Row: {
          id: string;
          name: string;
          origin_country: string | null;
          process_method: string | null;
          checkin_count: number;
          avg_rating: number | null;
          brew_score: number | null;
        };
      };
      flavors: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          dimension: string | null;
          weight: number;
          created_at: string;
        };
      };
      cafes: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          is_specialty: boolean;
          created_at: string;
        };
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          coffee_id: string;
          cafe_id: string | null;
          rating: number;
          brew_method: string | null;
          notes: string | null;
          photo_url: string | null;
          tasting_notes: string[] | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['checkins']['Row'], 'id' | 'created_at'>;
      };
      roasteries: {
        Row: {
          id: string;
          name: string;
          slug: string;
          location: string | null;
          is_verified: boolean;
          created_at: string;
        };
      };
    };
  };
};
