'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BUCKET = 'member-media';
const MAX_BYTES = 100 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export function MediaUploadPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;

    if (![...IMAGE_TYPES, ...VIDEO_TYPES].includes(file.type) || file.size > MAX_BYTES) {
      setMessage('Choose a supported image or video up to 100 MB.');
      return;
    }

    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const assetId = crypto.randomUUID();
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const path = `${user.id}/${assetId}.${extension}`;
    const mediaType = IMAGE_TYPES.includes(file.type) ? 'image' : 'video';

    try {
      const { error: recordError } = await supabase.from('media_assets').insert({
        title: file.name,
        media_type: mediaType,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        published: true,
      });
      if (recordError) throw recordError;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) {
        await supabase.from('media_assets').delete().eq('id', assetId);
        throw uploadError;
      }

      setMessage('Media uploaded and available to signed-in members.');
      router.refresh();
    } catch (cause) {
      console.error('media upload failed', cause);
      setMessage('The media could not be uploaded. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={inputRef} type="file" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')} className="hidden" onChange={handleFiles} />
        <Button onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {busy ? 'Uploading' : 'Upload image or video'}
        </Button>
        <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF, MP4, WebM, or MOV up to 100 MB.</p>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
