import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: 
// 1. Create a new project at https://supabase.com/
// 2. Go to Project Settings > API
// 3. Find your Project URL and anon key
// 4. Replace the placeholders below with your actual credentials

const supabaseUrl: string = 'https://ykuscphjyycrwzxustic.supabase.co'; // e.g., 'https://your-project-id.supabase.co'
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrdXNjcGhqeXljcnd6eHVzdGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDkzNDcsImV4cCI6MjA3NzUyNTM0N30.J8vkm8PG1NqgkJjCcj5xnD8-_Cqx58veK2huAuZqIlY'; // e.g., 'eyJhbGciOiJIUzI1NiIsIn...'

export const areSupabaseCredentialsSet =
    supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

let supabase: SupabaseClient | null = null;

if (areSupabaseCredentialsSet) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
        console.error("Error creating Supabase client:", error);
        // This might happen if the URL is invalid. We'll let the app show the warning.
        supabase = null;
    }
} else {
    console.warn("Supabase credentials are not set. The app will display a configuration screen. Please update supabaseClient.ts");
}

export { supabase };
