'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, Heart } from 'lucide-react';

export function PrayerRequestForm() {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from('prayer_requests').insert({
      title,
      body,
      category: category || null,
      visibility: 'public',
      is_anonymous: isAnonymous,
      status: 'open',
    });

    if (insertError) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Card className="rounded-[28px] border-[#DCE3EC] bg-white shadow-[0_18px_50px_rgba(7,27,61,0.08)]">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-success" />
          <h3 className="font-serif text-xl font-semibold text-[#071B3D]">Prayer Request Submitted</h3>
          <p className="mt-2 text-[#667487]">
            Thank you for sharing. Our community will be praying for you.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSuccess(false);
              setTitle('');
              setBody('');
              setCategory('');
              setIsAnonymous(false);
            }}
          >
            Submit Another Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px] border-[#DCE3EC] bg-white shadow-[0_18px_50px_rgba(7,27,61,0.08)]">
      <CardContent className="p-7">
        <div className="mb-5 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-xl font-semibold text-[#071B3D]">Submit a Prayer Request</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Brief summary of your request"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Your Request *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              placeholder="Share your prayer request with our community..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select a category (optional)</option>
              <option value="healing">Healing</option>
              <option value="family">Family</option>
              <option value="financial">Financial</option>
              <option value="spiritual">Spiritual</option>
              <option value="guidance">Guidance</option>
              <option value="salvation">Salvation</option>
              <option value="thanksgiving">Thanksgiving</option>
              <option value="other">Other</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Submit anonymously
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Heart className="mr-2 h-4 w-4" />
            )}
            Submit Prayer Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
