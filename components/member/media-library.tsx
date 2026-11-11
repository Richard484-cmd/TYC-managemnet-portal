'use client';

import { useState } from 'react';
import { Download, Image as ImageIcon, Loader2, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import type { MediaAsset } from '@/lib/media/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BUCKET = 'member-media';

export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadAsset(asset: MediaAsset) {
    setDownloadingId(asset.id);
    setError(null);

    try {
      const { data, error: signedUrlError } = await createClient().storage
        .from(BUCKET)
        .createSignedUrl(asset.storage_path, 120, { download: asset.title });
      if (signedUrlError || !data?.signedUrl) throw signedUrlError ?? new Error('Download unavailable');

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = asset.title;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (cause) {
      console.error('media download failed', cause);
      setError('This file could not be downloaded. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No media available yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">New church photos and videos will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <Card key={asset.id} className="overflow-hidden transition-shadow hover:shadow-md">
            <div className="relative aspect-video bg-slate-950">
              {asset.media_type === 'video' ? (
                <video src={asset.storage_path} controls preload="metadata" className="h-full w-full object-cover" aria-label={asset.title} />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#092A5F] to-[#031A3A] text-white">
                  <ImageIcon className="h-12 w-12 text-[#F4B942]" />
                </div>
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {asset.media_type === 'video' ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                {asset.media_type}
              </span>
            </div>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="font-semibold">{asset.title}</h2>
                {asset.description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{asset.description}</p>}
              </div>
              <Button className="w-full" onClick={() => void downloadAsset(asset)} disabled={downloadingId === asset.id}>
                {downloadingId === asset.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {downloadingId === asset.id ? 'Preparing download' : 'Download'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
