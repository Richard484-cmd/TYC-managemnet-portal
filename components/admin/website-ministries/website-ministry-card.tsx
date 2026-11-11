import { ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { WebsiteMinistry, WebsiteMinistryPhoto } from './website-ministry-types';

interface WebsiteMinistryCardProps {
  ministry: WebsiteMinistry;
  canManage: boolean;
  busy: boolean;
  error: string | undefined;
  onAddPhotos: () => void;
  onRemovePhoto: (photo: WebsiteMinistryPhoto) => void;
}

export function WebsiteMinistryCard({ ministry, canManage, busy, error, onAddPhotos, onRemovePhoto }: WebsiteMinistryCardProps) {
  const photoCount = ministry.photos.length;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{ministry.name}</h3>
            <p className="text-xs text-muted-foreground">{ministry.meeting_text}</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
          </span>
        </div>

        {photoCount > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {ministry.photos.map((photo, index) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <img src={photo.image_url} alt={`${ministry.name} photo ${index + 1}`} className="h-full w-full object-cover" />
                {canManage && (
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    disabled={busy}
                    onClick={() => onRemovePhoto(photo)}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow transition hover:bg-background disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[16/7] flex-col items-center justify-center gap-2 rounded-md bg-muted text-xs text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
            No photos yet
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {canManage && (
          <Button variant="outline" size="sm" className="w-full" disabled={busy} onClick={onAddPhotos}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Add photos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
