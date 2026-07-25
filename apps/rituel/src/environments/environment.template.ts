// Copy this file to environment.ts and fill in your values.
// Get these from your Supabase project settings > API.
export const environment = {
  production: true,
  serverConfiguration: {
    supabaseUrl: 'https://<your-project-id>.supabase.co',
    supabaseAnonKey: '<your-anon-key>',
    vapidPublicKey: '<your-vapid-public-key>',
  },
};
