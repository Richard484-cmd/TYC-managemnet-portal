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
    const body = await req.json() as { meetingId?: string; action?: "create_room" | "cancel" };
    if (!body.meetingId) return json({ error: "Meeting ID is required" }, 400);

    const { data: meeting } = await adminClient
      .from("virtual_meetings")
      .select("id, organizer_id, provider_room_name, starts_at, ends_at, capacity, status")
      .eq("id", body.meetingId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!meeting) return json({ error: "Meeting not found" }, 404);
    if (meeting.organizer_id !== authData.user.id) {
      const { data: isStaff } = await adminClient.rpc("can_access_virtual_meeting", { p_user: authData.user.id, p_meeting: meeting.id });
      if (!isStaff) return json({ error: "Not authorized" }, 403);
    }

    if (body.action === "cancel") {
      if (meeting.status === "completed" || meeting.status === "cancelled") {
        return json({ error: "Meeting cannot be cancelled" }, 400);
      }
      const { error } = await adminClient.from("virtual_meetings").update({ status: "cancelled" }).eq("id", meeting.id);
      if (error) return json({ error: "Could not cancel meeting" }, 500);
      return json({ success: true, status: "cancelled" });
    }

    // Default action: create_room
    if (!meeting.provider_room_name) return json({ error: "Meeting has no provider room configured" }, 400);
    if (meeting.status === "cancelled") return json({ error: "Cannot create a room for a cancelled meeting" }, 400);

    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) return json({ error: "Live meeting service is awaiting provider configuration" }, 503);

    const startSec = Math.floor(new Date(meeting.starts_at).getTime() / 1000);
    const endSec = Math.floor(new Date(meeting.ends_at).getTime() / 1000);

    const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: { Authorization: `Bearer ${dailyApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: meeting.provider_room_name,
        privacy: "private",
        properties: {
          nbf: startSec,
          exp: endSec + 3600,
          max_participants: meeting.capacity ?? undefined,
          enable_screenshare: true,
          enable_chat: true,
          enable_people_ui: true,
          enable_prejoin_ui: true,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true,
        },
      }),
    });

    if (!roomResponse.ok) {
      const errBody = await roomResponse.text();
      console.error("Daily room creation failed", errBody);
      // Room may already exist — try to fetch it
      const existingResponse = await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(meeting.provider_room_name)}`, {
        headers: { Authorization: `Bearer ${dailyApiKey}` },
      });
      if (existingResponse.ok) {
        return json({ success: true, roomUrl: (await existingResponse.json()).url });
      }
      return json({ error: "Could not create the meeting room" }, 502);
    }

    const room = await roomResponse.json() as { url: string };
    return json({ success: true, roomUrl: room.url });
  } catch (error) {
    console.error("virtual-meeting-manage failed", error);
    return json({ error: "Meeting management is temporarily unavailable" }, 500);
  }
});
