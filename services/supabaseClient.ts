
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

const supabaseUrl = CONFIG.supabaseUrl;
const supabaseKey = CONFIG.supabaseAnonKey;

// Create client only if keys are present
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseConfigured = () => {
  return !!supabase;
};
