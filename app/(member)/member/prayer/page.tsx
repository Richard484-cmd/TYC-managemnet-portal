import { getCurrentUser } from '@/lib/auth/session';
import { memberNavItems } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { MemberPrayerForm, PrayerStatusBadge } from '@/components/admin/prayer/prayer-components';
import { getCategoryLabel } from '@/lib/prayer/constants';
import type { PrayerRequest, PrayerMemberUpdate } from '@/lib/prayer/types';
import { Heart, Lock, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function MemberPrayerPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to access prayer requests.</p>
          <Button asChild className="mt-4">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  const supabase = createClient();

  // Get the member record for this user
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  // Fetch the user's own prayer requests
  const { data: myRequests } = await supabase
    .from('prayer_requests')
    .select('*')
    .eq('submitted_by', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const requests = (myRequests ?? []) as PrayerRequest[];

  // Fetch member updates for each request
  const requestIds = requests.map((r) => r.id);
  let updatesMap = new Map<string, PrayerMemberUpdate[]>();
  if (requestIds.length > 0) {
    const { data: updates } = await supabase
      .from('prayer_member_updates')
      .select('*')
      .in('prayer_request_id', requestIds)
      .order('created_at', { ascending: false });
    (updates ?? []).forEach((u: any) => {
      const existing = updatesMap.get(u.prayer_request_id) ?? [];
      existing.push(u as PrayerMemberUpdate);
      updatesMap.set(u.prayer_request_id, existing);
    });
  }

  // Fetch public prayer requests for the community wall
  const { data: publicRequests } = await supabase
    .from('prayer_requests')
    .select('id, title, body, category, is_anonymous, created_at')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <AppShell items={memberNavItems} label="Member Portal" user={user} isAdmin={false}>
      <div className="space-y-6">
        <PageHeader
          title="Prayer"
          description="Share your prayer requests and pray for our community"
        />

        {/* Submit Prayer Request */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-5 w-5 text-primary" />
              Submit a Prayer Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MemberPrayerForm
              userId={user.id}
              memberId={member?.id ?? null}
            />
          </CardContent>
        </Card>

        {/* My Prayer Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Prayer Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                You haven&apos;t submitted any prayer requests yet.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => {
                  const updates = updatesMap.get(req.id) ?? [];
                  return (
                    <div key={req.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold">{req.title}</h4>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{req.body}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {req.category && (
                              <span className="rounded-full bg-muted px-2 py-0.5">{getCategoryLabel(req.category)}</span>
                            )}
                            <PrayerStatusBadge status={req.status} />
                            {req.visibility === 'private' && (
                              <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
                            )}
                            {req.visibility === 'pastoral_only' && (
                              <span className="inline-flex items-center gap-1"><EyeOff className="h-3 w-3" /> Pastoral Only</span>
                            )}
                            <span>· {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            {req.prayer_count > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Heart className="h-3 w-3" /> {req.prayer_count} praying
                              </span>
                            )}
                          </div>
                          {updates.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              {updates.map((u) => (
                                <div key={u.id} className="rounded-lg bg-muted/50 p-2.5">
                                  <p className="text-xs">{u.content}</p>
                                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Community Prayer Wall */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Community Prayer Wall</CardTitle>
          </CardHeader>
          <CardContent>
            {publicRequests && publicRequests.length > 0 ? (
              <div className="space-y-3">
                {publicRequests.map((request: any) => (
                  <div key={request.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Heart className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium">{request.title}</h4>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.is_anonymous ? 'Anonymous' : 'Community Member'} · {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No public prayer requests yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
