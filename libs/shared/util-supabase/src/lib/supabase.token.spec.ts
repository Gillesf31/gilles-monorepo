import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT, provideSupabaseClient } from './supabase.token';

describe('provideSupabaseClient', () => {
  it('registers a Supabase client in Angular DI', () => {
    TestBed.configureTestingModule({
      providers: [
        provideSupabaseClient(
          'https://example.supabase.co',
          'anon-key-for-tests',
        ),
      ],
    });

    const client = TestBed.inject(SUPABASE_CLIENT);

    expect(client.from).toEqual(expect.any(Function));
  });
});
