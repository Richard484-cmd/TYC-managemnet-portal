'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WorkflowStatusBadge } from '@/components/admin/automation/automation-badges';
import { getTriggerDef, TRIGGER_REGISTRY } from '@/lib/automation/registry';
import type { Automation } from '@/lib/automation/types';
import Link from 'next/link';

export function AutomationListClient({
  initialAutomations,
}: {
  initialAutomations: Automation[];
}) {
  const supabase = createClient();
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerKey, setTriggerKey] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!triggerKey) {
      toast.error('Please select a trigger');
      return;
    }

    setSaving(true);
    const triggerDef = getTriggerDef(triggerKey);

    // Create the automation
    const { data: autoData, error: autoError } = await supabase
      .from('automations')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        trigger_event: triggerDef?.eventType ?? triggerKey,
        action_type: 'add_tag',
        action_config: {},
        status: 'draft',
        is_enabled: false,
      })
      .select()
      .maybeSingle();

    if (autoError || !autoData) {
      setSaving(false);
      toast.error('Failed to create workflow');
      return;
    }

    const automationId = (autoData as any).id;

    // Create the trigger step
    await supabase.from('automation_steps').insert({
      automation_id: automationId,
      step_type: 'trigger',
      step_key: triggerKey,
      name: triggerDef?.label ?? triggerKey,
      config: {},
      position: 1,
      is_enabled: true,
    });

    setSaving(false);
    setDialogOpen(false);
    setName('');
    setDescription('');
    setTriggerKey('');

    // Navigate to the builder
    window.location.href = `/admin/automations/${automationId}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Automation Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Workflow Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New Visitor Welcome"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What does this workflow do?"
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger</Label>
                <select
                  value={triggerKey}
                  onChange={(e) => setTriggerKey(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Select a trigger...</option>
                  {TRIGGER_REGISTRY.map((t: any) => (
                    <option key={t.key} value={t.key}>{t.label} — {t.description}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {automations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Zap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No automation workflows yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {automations.map((auto) => {
            const triggerDef = getTriggerDef(
              auto.steps?.find((s) => s.step_type === 'trigger')?.step_key ?? ''
            );
            return (
              <Link key={auto.id} href={`/admin/automations/${auto.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{auto.name}</p>
                        {auto.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {auto.description}
                          </p>
                        )}
                        {triggerDef && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Trigger: {triggerDef.label}
                          </p>
                        )}
                      </div>
                      <WorkflowStatusBadge status={auto.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{auto.execution_count} executions</span>
                      {auto.last_executed_at && (
                        <span>Last: {new Date(auto.last_executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
