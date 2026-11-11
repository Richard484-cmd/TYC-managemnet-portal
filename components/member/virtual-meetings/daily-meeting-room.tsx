'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Mic, Video, Wifi } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import type { MeetingAccessResponse } from '@/lib/virtual-meetings/types';

interface DailyMeetingRoomProps {
  meetingId: string;
}

export function DailyMeetingRoom({ meetingId }: DailyMeetingRoomProps) {
  const [access, setAccess] = useState<MeetingAccessResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadAccess = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (!cancelled) setMessage('Please sign in again before joining this meeting.');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/virtual-meeting-access`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ meetingId }),
        });
        const body = await response.json() as Partial<MeetingAccessResponse> & { error?: string };
        if (!response.ok || !body.roomUrl || !body.token || !body.meeting) {
          if (!cancelled) setMessage(body.error ?? 'This meeting could not be opened right now.');
          return;
        }
        if (!cancelled) setAccess(body as MeetingAccessResponse);
      } catch (error) {
        console.error('Meeting access request failed', error);
        if (!cancelled) setMessage('We could not connect to the meeting service. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadAccess();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-2xl bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-sm text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /> Preparing your secure meeting access</div>
      </div>
    );
  }

  if (message || !access) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-700" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Meeting unavailable</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{message ?? 'This meeting could not be opened right now.'}</p>
        <p className="mt-4 max-w-md text-xs leading-5 text-slate-500">If this is your first meeting, allow camera and microphone access when your browser asks. A stable Wi-Fi or mobile connection is recommended.</p>
      </div>
    );
  }

  const roomUrl = `${access.roomUrl}?t=${encodeURIComponent(access.token)}`;
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-xl">
      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-3 text-xs text-slate-300">
        <span className="font-semibold text-white">{access.meeting.title}</span>
        <span className="inline-flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-emerald-400" /> Secure connection</span>
        <span className="inline-flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" /> Microphone</span>
        <span className="inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5" /> Camera</span>
      </div>
      <iframe
        title={access.meeting.title}
        src={roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="h-[min(72vh,720px)] min-h-[520px] w-full border-0"
      />
    </div>
  );
}
