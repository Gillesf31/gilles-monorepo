// Copy this file to environment.prod.ts and fill in your values
// Get these from your Supabase project settings > API
export const environment = {
  production: true,
  supabase: {
    url: 'https://<your-project-id>.supabase.co',
    anonKey: '<your-anon-key>',
  },
};