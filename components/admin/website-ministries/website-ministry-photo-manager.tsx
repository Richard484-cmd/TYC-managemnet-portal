'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { WebsiteMinistryCard } from './website-ministry-card';
import type { WebsiteMinistry, WebsiteMinistryPhoto } from './website-ministry-types';

interface WebsiteMinistryPhotoManagerProps {
  ministries: WebsiteMinistry[];
  canManage: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'ministry-photos';

export function WebsiteMinistryPhotoManager({ ministries, canManage }: WebsiteMinistryPhotoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setError(id: string, message: string | null) {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }

  function openPicker(id: string) {
    setActiveId(id);
    fileInputRef.current?.click();
  }

  async function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    const ministry = ministries.find((m) => m.id === activeId);
    if (files.length === 0 || !ministry) return;

    const valid = files.filter((file) => ALLOWED_TYPES.includes(file.type) && file.size <= MAX_BYTES);
    const skipped = files.length - valid.length;
    if (valid.length === 0) {
      setError(ministry.id, 'Please choose JPEG, PNG or WebP photos up to 5 MB each.');
      setActiveId(null);
      return;
    }

    setBusyId(ministry.id);
    setError(ministry.id, null);

    const supabase = createClient();
    let nextSortOrder = Math.max(-1, ...ministry.photos.map((photo) => photo.sort_order)) + 1;
    let failed = 0;
    let saved = 0;

    for (let index = 0; index < valid.length; index += 1) {
      try {
        await uploadPhoto(supabase, ministry.id, ministry.slug, valid[index], index, nextSortOrder);
        saved += 1;
      } catch (cause) {
        console.error('ministry photo upload failed', cause);
        failed += 1;
      }
      nextSortOrder += 1;
    }

    if (saved > 0) router.refresh();

    const problems = failed + skipped;
    if (problems > 0) {
      setError(ministry.id, `${problems} ${problems === 1 ? 'photo' : 'photos'} could not be saved. Check the file type and size, then try again.`);
    }
    setBusyId(null);
    setActiveId(null);
  }

  async function removePhoto(ministry: WebsiteMinistry, photo: WebsiteMinistryPhoto) {
    if (!window.confirm('Remove this photo from the ministry slideshow?')) return;

    setBusyId(ministry.id);
    setError(ministry.id, null);

    try {
      const supabase = createClient();
      const { data: deleted, error: deleteError } = await supabase
        .from('public_ministry_photos')
        .delete()
        .eq('id', photo.id)
        .select('id');
      if (deleteError) throw deleteError;
      if (!deleted || deleted.length === 0) throw new Error('Photo not removed');

      if (photo.storage_path) {
        const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
        if (storageError) console.error('ministry photo file removal failed', storageError);
      }

      router.refresh();
    } catch (cause) {
      console.error('ministry photo removal failed', cause);
      setError(ministry.id, 'The photo could not be removed. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={handleFilesChange}
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {ministries.map((ministry) => (
          <WebsiteMinistryCard
            key={ministry.id}
            ministry={ministry}
            canManage={canManage}
            busy={busyId === ministry.id}
            error={errors[ministry.id]}
            onAddPhotos={() => openPicker(ministry.id)}
            onRemovePhoto={(photo) => removePhoto(ministry, photo)}
          />
        ))}
      </div>
    </>
  );
}

async function uploadPhoto(
  supabase: ReturnType<typeof createClient>,
  ministryId: string,
  slug: string,
  file: File,
  index: number,
  sortOrder: number,
) {
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${slug}/${Date.now()}-${index}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: inserted, error: insertError } = await supabase
    .from('public_ministry_photos')
    .insert({ ministry_id: ministryId, image_url: publicData.publicUrl, storage_path: path, sort_order: sortOrder })
    .select('id');
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }
  if (!inserted || inserted.length === 0) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error('Photo not saved');
  }
}
