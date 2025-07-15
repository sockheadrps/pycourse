import { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  "https://nppzafjyevzkazglvili.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHphZmp5ZXZ6a2F6Z2x2aWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MTEyNzksImV4cCI6MjA1ODM4NzI3OX0.vwndB3sKSs5y1Udbh5eKn6L3Zc0QAEOxyw777v22Yi8"
);
