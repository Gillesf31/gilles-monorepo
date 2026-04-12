import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SupabaseClient');

export function provideSupabaseClient(url: string, anonKey: string) {
  return {
    provide: SUPABASE_CLIENT,
    useValue: createClient(url, anonKey),
  };
}
