import { createClient } from '@/lib/supabase/server';
import { BookOpen, Drama, DoorOpen, Flower2, HandCoins, Heart, Monitor, Music, UserRound, Users, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  music: Music,
  users: Users,
  'book-open': BookOpen,
  'hand-coins': HandCoins,
  heart: Heart,
  drama: Drama,
  'door-open': DoorOpen,
  'user-round': UserRound,
  'flower-2': Flower2,
  monitor: Monitor,
};

export function getMinistryIcon(iconKey: string): LucideIcon {
  return ICONS[iconKey] ?? Users;
}

export interface PublicMinistry {
  id: string;
  slug: string;
  name: string;
  description: string;
  meeting_text: string;
  icon_key: string;
  tone: string;
  sort_order: number;
  photos: string[];
}

interface PublicMinistryRow extends Omit<PublicMinistry, 'photos'> {
  photos: { image_url: string; sort_order: number }[];
}

export async function getPublishedPublicMinistries(): Promise<PublicMinistry[] | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('public_ministries')
      .select('id, slug, name, description, meeting_text, icon_key, tone, sort_order, photos:public_ministry_photos(image_url, sort_order)')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('public ministries load failed', error);
      return null;
    }

    return ((data ?? []) as PublicMinistryRow[]).map(({ photos, ...ministry }) => ({
      ...ministry,
      photos: [...photos].sort((a, b) => a.sort_order - b.sort_order).map((photo) => photo.image_url),
    }));
  } catch (error) {
    console.error('public ministries load failed', error);
    return null;
  }
}
