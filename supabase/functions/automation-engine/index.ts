import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EventPayload {
  event_type: string;
  event_key?: string;
  payload: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
  member_id?: string;
  contact_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const action = body.action ?? "process";

    if (action === "emit") {
      return await emitEvent(supabase, body as EventPayload);
    }
    if (action === "process") {
      return await processQueue(supabase, body.batchSize ?? 10);
    }
    if (action === "resume") {
      return await resumeWaiting(supabase, body.batchSize ?? 10);
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: emit, process, resume" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// EMIT EVENT — insert into event queue
// ============================================================================

async function emitEvent(
  supabase: ReturnType<typeof createClient>,
  event: EventPayload
): Promise<Response> {
  // Idempotency: check if event_key already exists
  if (event.event_key) {
    const { data: existing } = await supabase
      .from("automation_event_queue")
      .select("id")
      .eq("event_key", event.event_key)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ message: "Event already processed", event_key: event.event_key }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const { data, error } = await supabase
    .from("automation_event_queue")
    .insert({
      event_type: event.event_type,
      event_key: event.event_key ?? null,
      payload: event.payload,
      entity_type: event.entity_type ?? null,
      entity_id: event.entity_id ?? null,
      member_id: event.member_id ?? null,
      contact_id: event.contact_id ?? null,
      status: "pending",
    })
    .select()
    .maybeSingle();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Process this event immediately
  await processEvent(supabase, data);

  return new Response(
    JSON.stringify({ success: true, event_id: data.id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// PROCESS QUEUE — process pending events
// ============================================================================

async function processQueue(
  supabase: ReturnType<typeof createClient>,
  batchSize: number
): Promise<Response> {
  const { data: events, error } = await supabase
    .from("automation_event_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error || !events) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "No events" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    // Mark as processing
    await supabase
      .from("automation_event_queue")
      .update({ status: "processing" })
      .eq("id", event.id);

    try {
      await processEvent(supabase, event);
      await supabase
        .from("automation_event_queue")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("id", event.id);
      processed++;
    } catch (err) {
      await supabase
        .from("automation_event_queue")
        .update({ status: "failed", error_message: err.message, processed_at: new Date().toISOString() })
        .eq("id", event.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ processed, failed, total: events.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// RESUME WAITING — resume delayed executions whose wait has expired
// ============================================================================

async function resumeWaiting(
  supabase: ReturnType<typeof createClient>,
  batchSize: number
): Promise<Response> {
  const now = new Date().toISOString();
  const { data: executions, error } = await supabase
    .from("automation_executions")
    .select("*")
    .eq("status", "waiting")
    .lte("waiting_until", now)
    .order("waiting_until", { ascending: true })
    .limit(batchSize);

  if (error || !executions) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "No waiting executions" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let resumed = 0;
  let failed = 0;

  for (const exec of executions) {
    try {
      await runExecution(supabase, exec);
      resumed++;
    } catch (err) {
      await supabase
        .from("automation_executions")
        .update({ status: "failed", error_message: err.message, completed_at: new Date().toISOString() })
        .eq("id", exec.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ resumed, failed, total: executions.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// PROCESS EVENT — find matching workflows and create executions
// ============================================================================

async function processEvent(
  supabase: ReturnType<typeof createClient>,
  event: any
): Promise<void> {
  // Find active automations with matching trigger_event
  const { data: automations, error } = await supabase
    .from("automations")
    .select("*, automation_steps(*)")
    .eq("status", "active")
    .eq("trigger_event", event.event_type)
    .is("deleted_at", null);

  if (error || !automations) return;

  for (const automation of automations) {
    const steps = (automation.automation_steps as any[]) ?? [];
    const triggerStep = steps.find((s) => s.step_type === "trigger" && s.is_enabled);
    if (!triggerStep) continue;

    // Check for duplicate execution via event_key
    if (event.event_key) {
      const { data: existingExec } = await supabase
        .from("automation_executions")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("event_key", event.event_key)
        .maybeSingle();
      if (existingExec) continue;
    }

    // Build execution context from event
    const context: Record<string, unknown> = {
      event_type: event.event_type,
      event_payload: event.payload,
    };
    if (event.member_id) context.member_id = event.member_id;
    if (event.contact_id) context.contact_id = event.contact_id;
    if (event.entity_type) context.entity_type = event.entity_type;
    if (event.entity_id) context.entity_id = event.entity_id;

    // Also extract from payload
    const payload = event.payload as Record<string, unknown>;
    if (payload.member_id) context.member_id = payload.member_id;
    if (payload.contact_id) context.contact_id = payload.contact_id;
    if (payload.visitor_id) context.visitor_id = payload.visitor_id;
    if (payload.transaction_id) context.transaction_id = payload.transaction_id;
    if (payload.event_id) context.event_id = payload.event_id;
    if (payload.follow_up_id) context.follow_up_id = payload.follow_up_id;
    if (payload.tag_id) context.tag_id = payload.tag_id;

    // Create execution
    const sortedSteps = steps.sort((a: any, b: any) => a.position - b.position);
    const firstStep = sortedSteps[0];
    if (!firstStep) continue;

    const { data: execution, error: execError } = await supabase
      .from("automation_executions")
      .insert({
        automation_id: automation.id,
        status: "running",
        current_step_id: firstStep.id,
        current_step_position: 0,
        context,
        trigger_event: event.event_type,
        trigger_payload: event.payload,
        event_key: event.event_key ?? null,
        is_test: false,
        started_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (execError || !execution) continue;

    // Update automation last_executed_at and execution_count
    await supabase
      .from("automations")
      .update({
        last_executed_at: new Date().toISOString(),
        execution_count: (automation.execution_count ?? 0) + 1,
      })
      .eq("id", automation.id);

    // Run the execution
    try {
      await runExecution(supabase, execution);
    } catch (err) {
      await supabase
        .from("automation_executions")
        .update({
          status: "failed",
          error_message: err.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id);
    }
  }
}

// ============================================================================
// RUN EXECUTION — process steps sequentially
// ============================================================================

async function runExecution(
  supabase: ReturnType<typeof createClient>,
  execution: any
): Promise<void> {
  // Fetch automation steps
  const { data: steps, error } = await supabase
    .from("automation_steps")
    .select("*")
    .eq("automation_id", execution.automation_id)
    .eq("is_enabled", true)
    .order("position", { ascending: true });

  if (error || !steps || steps.length === 0) {
    await supabase
      .from("automation_executions")
      .update({ status: "failed", error_message: "No steps found", completed_at: new Date().toISOString() })
      .eq("id", execution.id);
    return;
  }

  // Mark as running
  await supabase
    .from("automation_executions")
    .update({ status: "running" })
    .eq("id", execution.id);

  const context = execution.context as Record<string, unknown>;

  // Find where to resume from
  let startIdx = execution.current_step_position ?? 0;

  for (let i = startIdx; i < steps.length; i++) {
    const step = steps[i];
    const startTime = Date.now();

    // Update current step
    await supabase
      .from("automation_executions")
      .update({ current_step_id: step.id, current_step_position: i })
      .eq("id", execution.id);

    let logStatus = "successful";
    let logError: string | null = null;
    let logResult: Record<string, unknown> | null = null;
    let shouldStop = false;

    try {
      if (step.step_type === "trigger") {
        logResult = { message: "Trigger fired" };
      } else if (step.step_type === "condition") {
        const result = await evaluateCondition(supabase, step, context);
        if (!result.passed) {
          logStatus = "skipped";
          logResult = { reason: result.reason ?? "Condition not met" };
          // Skip remaining steps — condition failed
          shouldStop = true;
        } else {
          logResult = { message: "Condition passed" };
        }
      } else if (step.step_type === "action") {
        const result = await executeAction(supabase, step, context);
        logResult = result;
      } else if (step.step_type === "delay") {
        const config = step.config as Record<string, unknown>;
        const duration = parseInt(String(config.duration ?? "1"), 10);
        const unit = String(config.unit ?? "days");
        const resumeAt = computeResumeTime(duration, unit);

        await supabase
          .from("automation_executions")
          .update({
            status: "waiting",
            waiting_until: resumeAt,
            current_step_position: i + 1,
          })
          .eq("id", execution.id);

        logResult = { resume_at: resumeAt };

        // Log the delay step
        await supabase.from("automation_execution_logs").insert({
          execution_id: execution.id,
          automation_id: execution.automation_id,
          step_id: step.id,
          step_type: step.step_type,
          step_key: step.step_key,
          step_name: step.name,
          config: step.config,
          status: "successful",
          result: logResult,
          duration_ms: Date.now() - startTime,
          member_id: context.member_id ?? null,
          contact_id: context.contact_id ?? null,
          started_at: new Date(Date.now() - (Date.now() - startTime)).toISOString(),
          completed_at: new Date().toISOString(),
        });

        // Stop processing — will resume when scheduled
        return;
      }
    } catch (err) {
      logStatus = "failed";
      logError = err.message;
      shouldStop = true;
    }

    // Log the step
    await supabase.from("automation_execution_logs").insert({
      execution_id: execution.id,
      automation_id: execution.automation_id,
      step_id: step.id,
      step_type: step.step_type,
      step_key: step.step_key,
      step_name: step.name,
      config: step.config,
      status: logStatus,
      result: logResult,
      error_message: logError,
      duration_ms: Date.now() - startTime,
      member_id: context.member_id ?? null,
      contact_id: context.contact_id ?? null,
      started_at: new Date(Date.now() - (Date.now() - startTime)).toISOString(),
      completed_at: new Date().toISOString(),
    });

    if (shouldStop && logStatus === "failed") {
      await supabase
        .from("automation_executions")
        .update({
          status: "failed",
          error_message: logError,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id);
      return;
    }

    if (shouldStop && logStatus === "skipped") {
      // Condition failed — skip remaining steps, mark as successful (condition skip is not an error)
      await supabase
        .from("automation_executions")
        .update({
          status: "successful",
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id);
      return;
    }
  }

  // All steps completed
  await supabase
    .from("automation_executions")
    .update({
      status: "successful",
      completed_at: new Date().toISOString(),
      waiting_until: null,
    })
    .eq("id", execution.id);
}

// ============================================================================
// CONDITION EVALUATORS
// ============================================================================

async function evaluateCondition(
  supabase: ReturnType<typeof createClient>,
  step: any,
  context: Record<string, unknown>
): Promise<{ passed: boolean; reason?: string }> {
  const config = step.config as Record<string, unknown>;
  const operator = String(config.operator ?? "equals");
  const conditionKey = step.step_key;

  if (conditionKey === "membership_status") {
    const memberId = context.member_id as string;
    if (!memberId) return { passed: false, reason: "No member in context" };
    const { data: member } = await supabase
      .from("members")
      .select("status_key")
      .eq("id", memberId)
      .maybeSingle();
    const actual = member?.status_key;
    const expected = String(config.value ?? "");
    return { passed: compareValues(actual, expected, operator) };
  }

  if (conditionKey === "tag") {
    const tagId = String(config.tag_id ?? "");
    const entityId = (context.member_id ?? context.contact_id ?? context.entity_id) as string;
    const entityType = context.member_id ? "member" : "contact";
    if (!entityId) return { passed: false, reason: "No entity in context" };
    const { data: tagAssign } = await supabase
      .from("tag_assignments")
      .select("id")
      .eq("tag_id", tagId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    const hasTag = !!tagAssign;
    if (operator === "contains") return { passed: hasTag };
    if (operator === "not_contains") return { passed: !hasTag };
    return { passed: hasTag };
  }

  if (conditionKey === "department") {
    const memberId = context.member_id as string;
    if (!memberId) return { passed: false, reason: "No member in context" };
    const deptId = String(config.department_id ?? "");
    const { data: deptMember } = await supabase
      .from("department_members")
      .select("id")
      .eq("department_id", deptId)
      .eq("member_id", memberId)
      .maybeSingle();
    const isIn = !!deptMember;
    if (operator === "equals") return { passed: isIn };
    if (operator === "not_equals") return { passed: !isIn };
    return { passed: isIn };
  }

  if (conditionKey === "group") {
    const memberId = context.member_id as string;
    if (!memberId) return { passed: false, reason: "No member in context" };
    const groupId = String(config.group_id ?? "");
    const { data: groupMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("member_id", memberId)
      .maybeSingle();
    const isIn = !!groupMember;
    if (operator === "equals") return { passed: isIn };
    if (operator === "not_equals") return { passed: !isIn };
    return { passed: isIn };
  }

  if (conditionKey === "pipeline_stage") {
    const contactId = context.contact_id as string;
    if (!contactId) return { passed: false, reason: "No contact in context" };
    const stageId = String(config.stage_id ?? "");
    const { data: contact } = await supabase
      .from("contacts")
      .select("crm_stage_id")
      .eq("id", contactId)
      .maybeSingle();
    const actual = contact?.crm_stage_id;
    if (operator === "equals") return { passed: actual === stageId };
    if (operator === "not_equals") return { passed: actual !== stageId };
    return { passed: false };
  }

  if (conditionKey === "attendance_percentage") {
    const memberId = context.member_id as string;
    if (!memberId) return { passed: false, reason: "No member in context" };
    const { count: total } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("member_id", memberId);
    const { count: present } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("member_id", memberId)
      .in("status", ["present", "late"]);
    const pct = total && total > 0 ? ((present ?? 0) / total) * 100 : 0;
    const threshold = parseFloat(String(config.value ?? "0"));
    return { passed: compareNumbers(pct, threshold, operator) };
  }

  if (conditionKey === "payment_status") {
    const txnId = (context.transaction_id ?? context.entity_id) as string;
    if (!txnId) return { passed: false, reason: "No transaction in context" };
    const { data: txn } = await supabase
      .from("giving_transactions")
      .select("status")
      .eq("id", txnId)
      .maybeSingle();
    const actual = txn?.status;
    const expected = String(config.value ?? "");
    return { passed: compareValues(actual, expected, operator) };
  }

  return { passed: true };
}

function compareValues(actual: unknown, expected: string, operator: string): boolean {
  const a = String(actual ?? "");
  const e = expected;
  switch (operator) {
    case "equals": return a === e;
    case "not_equals": return a !== e;
    case "contains": return a.includes(e);
    case "not_contains": return !a.includes(e);
    default: return a === e;
  }
}

function compareNumbers(actual: number, expected: number, operator: string): boolean {
  switch (operator) {
    case "equals": return actual === expected;
    case "not_equals": return actual !== expected;
    case "greater_than": return actual > expected;
    case "less_than": return actual < expected;
    case "greater_than_equal": return actual >= expected;
    case "less_than_equal": return actual <= expected;
    default: return actual === expected;
  }
}

// ============================================================================
// ACTION EXECUTORS
// ============================================================================

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  step: any,
  context: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const config = step.config as Record<string, unknown>;
  const actionKey = step.step_key;
  const memberId = context.member_id as string | undefined;
  const contactId = context.contact_id as string | undefined;
  const visitorId = context.visitor_id as string | undefined;
  const entityId = (memberId ?? contactId ?? visitorId) as string | undefined;
  const entityType = memberId ? "member" : contactId ? "contact" : "visitor";

  if (actionKey === "add_tag") {
    const tagId = String(config.tag_id ?? "");
    if (!tagId || !entityId) throw new Error("Missing tag_id or entity");
    // Check if tag already assigned (idempotency)
    const { data: existing } = await supabase
      .from("tag_assignments")
      .select("id")
      .eq("tag_id", tagId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    if (existing) return { message: "Tag already assigned", tag_id: tagId };
    const { error } = await supabase.from("tag_assignments").insert({
      tag_id: tagId,
      entity_type: entityType,
      entity_id: entityId,
    });
    if (error) throw new Error(`Failed to add tag: ${error.message}`);
    return { message: "Tag added", tag_id: tagId };
  }

  if (actionKey === "remove_tag") {
    const tagId = String(config.tag_id ?? "");
    if (!tagId || !entityId) throw new Error("Missing tag_id or entity");
    const { error } = await supabase
      .from("tag_assignments")
      .delete()
      .eq("tag_id", tagId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
    if (error) throw new Error(`Failed to remove tag: ${error.message}`);
    return { message: "Tag removed", tag_id: tagId };
  }

  if (actionKey === "create_tag") {
    const tagName = String(config.tag_name ?? "");
    if (!tagName) throw new Error("Missing tag_name");
    const slug = tagName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    // Check if tag exists
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .ilike("name", tagName)
      .maybeSingle();
    let tagId = existing?.id;
    if (!tagId) {
      const { data: newTag, error } = await supabase
        .from("tags")
        .insert({ name: tagName, slug })
        .select()
        .maybeSingle();
      if (error) throw new Error(`Failed to create tag: ${error.message}`);
      tagId = newTag?.id;
    }
    if (tagId && entityId) {
      await supabase.from("tag_assignments").insert({
        tag_id: tagId,
        entity_type: entityType,
        entity_id: entityId,
      }).then(() => {});
    }
    return { message: "Tag created/assigned", tag_id: tagId };
  }

  if (actionKey === "assign_user") {
    const userId = String(config.user_id ?? "");
    if (!userId) throw new Error("Missing user_id");
    if (contactId) {
      const { error } = await supabase
        .from("contacts")
        .update({ assigned_to: userId })
        .eq("id", contactId);
      if (error) throw new Error(`Failed to assign user: ${error.message}`);
      return { message: "Contact assigned", user_id: userId };
    }
    throw new Error("No contact in context to assign");
  }

  if (actionKey === "move_pipeline_stage") {
    const stageId = String(config.stage_id ?? "");
    if (!stageId || !contactId) throw new Error("Missing stage_id or contact");
    // Get current stage
    const { data: contact } = await supabase
      .from("contacts")
      .select("crm_stage_id")
      .eq("id", contactId)
      .maybeSingle();
    const fromStage = contact?.crm_stage_id;
    const { error } = await supabase
      .from("contacts")
      .update({ crm_stage_id: stageId })
      .eq("id", contactId);
    if (error) throw new Error(`Failed to move stage: ${error.message}`);
    // Log movement
    await supabase.from("contact_movements").insert({
      contact_id: contactId,
      from_stage: fromStage,
      to_stage: stageId,
      reason: "Automation",
    });
    return { message: "Pipeline stage moved", from: fromStage, to: stageId };
  }

  if (actionKey === "send_notification") {
    const title = String(config.title ?? "");
    const notifBody = String(config.body ?? "");
    const userId = (context.assigned_user_id ?? memberId) as string;
    if (!title) throw new Error("Missing notification title");
    // Try to find the user_id for the member
    let targetUserId = userId;
    if (!targetUserId && memberId) {
      const { data: member } = await supabase
        .from("members")
        .select("user_id")
        .eq("id", memberId)
        .maybeSingle();
      targetUserId = member?.user_id;
    }
    if (!targetUserId) throw new Error("No user to notify");
    const { error } = await supabase.from("notifications").insert({
      user_id: targetUserId,
      type: "automation",
      title,
      body: notifBody,
    });
    if (error) throw new Error(`Failed to send notification: ${error.message}`);
    return { message: "Notification sent", user_id: targetUserId };
  }

  if (actionKey === "send_email" || actionKey === "send_sms") {
    const templateId = String(config.template_id ?? "");
    const channel = actionKey === "send_email" ? "email" : "sms";
    if (!templateId) throw new Error("Missing template_id");
    // Fetch template
    const { data: template } = await supabase
      .from("communication_templates")
      .select("subject, body")
      .eq("id", templateId)
      .maybeSingle();
    if (!template) throw new Error("Template not found");
    // Resolve recipient
    let recipientEmail: string | null = null;
    let recipientPhone: string | null = null;
    let recipientName: string | null = null;
    if (memberId) {
      const { data: member } = await supabase
        .from("members")
        .select("first_name, last_name, email, phone")
        .eq("id", memberId)
        .maybeSingle();
      if (member) {
        recipientEmail = member.email;
        recipientPhone = member.phone;
        recipientName = `${member.first_name} ${member.last_name}`.trim();
      }
    }
    // Create communication log
    const { error: logError } = await supabase.from("communication_logs").insert({
      channel,
      template_id: templateId,
      contact_id: contactId ?? null,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      subject: template.subject,
      status: "pending",
      message_type: "automation",
    });
    if (logError) throw new Error(`Failed to log communication: ${logError.message}`);
    return { message: `${channel} queued`, template_id: templateId };
  }

  if (actionKey === "create_followup") {
    const type = String(config.type ?? "general");
    const priority = String(config.priority ?? "normal");
    const assignedTo = (config.assigned_to as string) ?? null;
    const { error } = await supabase.from("follow_ups").insert({
      visitor_id: visitorId ?? null,
      member_id: memberId ?? null,
      contact_id: contactId ?? null,
      type,
      priority,
      status: "pending",
      assigned_to: assignedTo,
    });
    if (error) throw new Error(`Failed to create follow-up: ${error.message}`);
    return { message: "Follow-up created", type };
  }

  throw new Error(`Unknown action: ${actionKey}`);
}

// ============================================================================
// UTILITIES
// ============================================================================

function computeResumeTime(duration: number, unit: string): string {
  const now = new Date();
  switch (unit) {
    case "minutes": now.setMinutes(now.getMinutes() + duration); break;
    case "hours": now.setHours(now.getHours() + duration); break;
    case "days": now.setDate(now.getDate() + duration); break;
    case "weeks": now.setDate(now.getDate() + duration * 7); break;
    default: now.setDate(now.getDate() + duration);
  }
  return now.toISOString();
}
