export interface WebsiteMinistryPhoto {
  id: string;
  image_url: string;
  storage_path: string | null;
  sort_order: number;
}

export interface WebsiteMinistry {
  id: string;
  slug: string;
  name: string;
  meeting_text: string;
  photos: WebsiteMinistryPhoto[];
}
