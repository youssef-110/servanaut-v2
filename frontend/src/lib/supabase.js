// Optional direct Supabase client (anon key) for future realtime features.
// All data currently flows through the backend API, which owns the
// service-role connection — this client is exported for extension points
// like realtime alert subscriptions.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
