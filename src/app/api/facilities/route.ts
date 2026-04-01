import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const municipalityId = searchParams.get('municipality_id')
  const category = searchParams.get('category')

  if (!municipalityId || !category) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('facility_details')
    .select('facility_name, brand_name, lat, lng, is_24h, has_imax, distance_from_center_km')
    .eq('municipality_id', municipalityId)
    .eq('category', category)
    .order('distance_from_center_km', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
