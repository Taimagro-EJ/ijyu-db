import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Municipality = {
  id: string
  name: string
  name_kana: string
  prefecture: string
  region: string
  lat: number | null
  lng: number | null
  slug: string
  is_featured: boolean
  image_url: string | null
  avg_temp_annual: number | null
  avg_temp_jan: number | null
  avg_temp_jul: number | null
  precipitation_annual: number | null
  sunshine_hours_annual: number | null
  min_temp_winter: number | null
  rent_1ldk_estimate: number | null
  total_monthly_cost_single: number | null
  total_monthly_cost_family: number | null
  car_necessity_score: number | null
  time_to_tokyo: number | null
  nearest_shinkansen: string | null
  nearest_airport: string | null
  public_transport_score: number | null
  criminal_rate: number | null
  lifestyle_score: number | null;
  score_costperf: number | null;
  score_shopping: number | null;
  score_gourmet: number | null;
  score_fitness: number | null;
  score_entertainment: number | null;
  score_childcare: number | null;
  score_medical: number | null;
  cafe_starbucks: number | null;
  gym_24h_count: number | null;
  cinema_count: number | null;
  cinema_has_imax: boolean | null;
  mall_count: number | null;
  mall_best_tier: string | null;
  waiting_children: number | null;
  pediatric_clinics: number | null;
}
