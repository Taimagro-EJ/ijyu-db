// src/app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase';

const BASE_URL = 'https://ijyu-db.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  const { data: municipalities } = await supabase
    .from('municipalities')
    .select('slug, updated_at')
    .order('id');

  const municipalityUrls: MetadataRoute.Sitemap = (municipalities ?? []).map((m) => ({
    url: `${BASE_URL}/municipalities/${m.slug}`,
    lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...municipalityUrls,
  ];
}
