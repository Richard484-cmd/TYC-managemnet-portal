export interface MediaAsset {
  id: string;
  title: string;
  description: string | null;
  media_type: 'image' | 'video';
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  published: boolean;
  created_at: string;
}
