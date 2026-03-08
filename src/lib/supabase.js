import { createClient } from '@supabase/supabase-js'

// Get credentials from environment variables or use the provided ones for now
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nrmmjdtaufsdrpnngpxa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybW1qZHRhdWZzZHJwbm5ncHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTI0OTcsImV4cCI6MjA4ODU2ODQ5N30.v_DNykB8Vdk3wuS2Tnic7_OetC53l5gY8pnOp_WnwUQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
