import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const BASE_URL = 'https://www.ijyu-data.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: municipalities } = await supabase
    .from('municipalities')
    .select('slug')
    .order('id');

  const municipalityUrls: MetadataRoute.Sitemap = (municipalities ?? []).map((m) => ({
    url: `${BASE_URL}/municipalities/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    ...municipalityUrls,
  ];
}
