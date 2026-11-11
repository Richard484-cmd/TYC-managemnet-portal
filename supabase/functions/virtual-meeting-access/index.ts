import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Meeting service is unavailable" }, 503);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return json({ error: "Authentication required" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const payload = await req.json() as { meetingId?: string };
    if (!payload.meetingId) return json({ error: "Meeting not found" }, 400);

    const { data: meeting } = await adminClient
      .from("virtual_meetings")
      .select("id, title, starts_at, ends_at, status, provider, provider_room_name, organizer_id, capacity")
      .eq("id", payload.meetingId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!meeting || meeting.provider !== "daily" || !meeting.provider_room_name) {
      return json({ error: "Meeting is not available" }, 404);
    }

    const { data: allowed } = await adminClient.rpc("can_access_virtual_meeting", {
      p_user: authData.user.id,
      p_meeting: meeting.id,
    });
    if (!allowed) return json({ error: "You are not eligible to join this meeting" }, 403);

    const now = Date.now();
    const start = new Date(meeting.starts_at).getTime();
    const end = new Date(meeting.ends_at).getTime();
    if (meeting.status === "cancelled" || meeting.status === "completed" || now < start - 15 * 60 * 1000 || now > end + 30 * 60 * 1000) {
      return json({ error: "This meeting is not open for joining" }, 403);
    }

    if (meeting.capacity && meeting.capacity > 0) {
      const { count } = await adminClient
        .from("virtual_meeting_participants")
        .select("id", { count: "exact", head: true })
        .eq("meeting_id", meeting.id)
        .in("status", ["joined", "attended"]);
      if (count !== null && count >= meeting.capacity) {
        return json({ error: "This meeting has reached its participant capacity" }, 403);
      }
    }

    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) return json({ error: "Live meeting service is awaiting provider configuration" }, 503);

    const { data: profile } = await adminClient
      .from("users")
      .select("display_name, first_name, last_name")
      .eq("id", authData.user.id)
      .maybeSingle();
    const displayName = profile?.display_name || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Church member";
    const isHost = meeting.organizer_id === authData.user.id;
    const tokenExpiry = Math.min(end + 60 * 60 * 1000, now + 2 * 60 * 60 * 1000);

    const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: { Authorization: `Bearer ${dailyApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          room_name: meeting.provider_room_name,
          user_id: authData.user.id,
          user_name: displayName,
          is_owner: isHost,
          nbf: Math.floor((now - 60_000) / 1000),
          exp: Math.floor(tokenExpiry / 1000),
          eject_at_token_exp: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });
    if (!tokenResponse.ok) return json({ error: "Could not prepare secure meeting access" }, 502);
    const tokenBody = await tokenResponse.json() as { token?: string };
    if (!tokenBody.token) return json({ error: "Could not prepare secure meeting access" }, 502);

    const roomResponse = await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(meeting.provider_room_name)}`, {
      headers: { Authorization: `Bearer ${dailyApiKey}` },
    });
    if (!roomResponse.ok) return json({ error: "Could not locate the meeting room" }, 502);
    const roomBody = await roomResponse.json() as { url?: string };
    if (!roomBody.url) return json({ error: "Could not locate the meeting room" }, 502);

    return json({
      provider: "daily",
      roomUrl: roomBody.url,
      token: tokenBody.token,
      meeting: { id: meeting.id, title: meeting.title, startsAt: meeting.starts_at, endsAt: meeting.ends_at },
    });
  } catch (error) {
    console.error("virtual meeting access failed", error);
    return json({ error: "Meeting access is temporarily unavailable" }, 500);
  }
});
