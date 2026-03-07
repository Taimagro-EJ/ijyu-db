import { supabase, Municipality } from '@/lib/supabase'
import MunicipalityList from '@/app/components/MunicipalityList'

export const revalidate = 3600

async function getMunicipalities(): Promise<Municipality[]> {
  const { data, error } = await supabase
    .from('municipality_overview')
    .select('*')
    .order('name')

  if (error) {
    console.error('Failed to fetch municipalities:', error)
    return []
  }
  return data as Municipality[]
}

export default async function Home() {
  const municipalities = await getMunicipalities()
  return <MunicipalityList municipalities={municipalities} />
}
