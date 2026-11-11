'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Zap,
  GitBranch,
  Play,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Power,
  Archive,
  AlertCircle,
  Loader2,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  TRIGGER_REGISTRY,
  CONDITION_REGISTRY,
  ACTION_REGISTRY,
  getTriggerDef,
  getConditionDef,
  getActionDef,
} from '@/lib/automation/registry';
import {
  OPERATORS,
  DELAY_UNITS,
  STEP_TYPE_COLORS,
} from '@/lib/automation/constants';
import { WorkflowStatusBadge } from '@/components/admin/automation/automation-badges';
import type {
  Automation,
  AutomationStep,
  StepType,
  WorkflowStatus,
} from '@/lib/automation/types';

export function AutomationBuilderClient({
  automation,
  steps: initialSteps,
  selectionData,
}: {
  automation: Automation;
  steps: AutomationStep[];
  selectionData: {
    users: { id: string; display_name: string }[];
    tags: { id: string; name: string }[];
    pipelineStages: { id: string; name: string; pipeline_name: string }[];
    departments: { id: string; name: string }[];
    groups: { id: string; name: string }[];
    membershipStatuses: { status_key: string; name: string }[];
    templates: { id: string; name: string; channel: string }[];
  };
}) {
  const supabase = createClient();
  const [name, setName] = useState(automation.name);
  const [description, setDescription] = useState(automation.description ?? '');
  const [status, setStatus] = useState<WorkflowStatus>(automation.status);
  const [steps, setSteps] = useState<AutomationStep[]>(initialSteps);
  const [saving, setSaving] = useState(false);
  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);

  const triggerStep = steps.find((s) => s.step_type === 'trigger');
  const hasTrigger = !!triggerStep;
  const isValid = hasTrigger && name.trim().length > 0;
  const canActivate = isValid && steps.filter((s) => s.step_type === 'action' && s.is_enabled).length > 0;

  const handleSaveWorkflow = async () => {
    if (!name.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('automations')
      .update({
        name: name.trim(),
        description: description.trim() || null,
      })
      .eq('id', automation.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save workflow');
      return;
    }
    toast.success('Workflow saved');
  };

  const handleStatusChange = async (newStatus: WorkflowStatus) => {
    if (newStatus === 'active' && !canActivate) {
      toast.error('Cannot activate: workflow needs a trigger and at least one action');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('automations')
      .update({ status: newStatus, is_enabled: newStatus === 'active' })
      .eq('id', automation.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to update workflow status');
      return;
    }
    setStatus(newStatus);
    toast.success(`Workflow ${newStatus}`);
  };

  const addStep = async (stepType: StepType, stepKey: string) => {
    const maxPosition = steps.length > 0 ? Math.max(...steps.map((s) => s.position)) : 0;
    const def = stepType === 'trigger' ? getTriggerDef(stepKey) :
                stepType === 'condition' ? getConditionDef(stepKey) :
                stepType === 'action' ? getActionDef(stepKey) : null;
    const stepName = def?.label ?? stepKey;

    const { data, error } = await supabase
      .from('automation_steps')
      .insert({
        automation_id: automation.id,
        step_type: stepType,
        step_key: stepKey,
        name: stepName,
        config: {},
        position: maxPosition + 1,
        is_enabled: true,
      })
      .select()
      .maybeSingle();

    if (error || !data) {
      toast.error('Failed to add step');
      return;
    }
    setSteps([...steps, data as AutomationStep]);
    setAddStepDialogOpen(false);
    toast.success(`${stepName} step added`);
  };

  const updateStep = async (stepId: string, updates: Partial<AutomationStep>) => {
    const { data, error } = await supabase
      .from('automation_steps')
      .update(updates)
      .eq('id', stepId)
      .select()
      .maybeSingle();
    if (error || !data) {
      toast.error('Failed to update step');
      return;
    }
    setSteps(steps.map((s) => (s.id === stepId ? (data as AutomationStep) : s)));
  };

  const deleteStep = async (stepId: string) => {
    const { error } = await supabase
      .from('automation_steps')
      .delete()
      .eq('id', stepId);
    if (error) {
      toast.error('Failed to delete step');
      return;
    }
    setSteps(steps.filter((s) => s.id !== stepId));
    toast.success('Step deleted');
  };

  const moveStep = async (stepId: string, direction: 'up' | 'down') => {
    const sorted = [...steps].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const stepA = sorted[idx];
    const stepB = sorted[swapIdx];
    const posA = stepA.position;
    const posB = stepB.position;

    await supabase.from('automation_steps').update({ position: posB }).eq('id', stepA.id);
    await supabase.from('automation_steps').update({ position: posA }).eq('id', stepB.id);

    setSteps(steps.map((s) => {
      if (s.id === stepA.id) return { ...s, position: posB };
      if (s.id === stepB.id) return { ...s, position: posA };
      return s;
    }));
  };

  const sortedSteps = [...steps].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <WorkflowStatusBadge status={status} />
              </div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workflow name..."
                className="text-lg font-semibold"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)..."
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleSaveWorkflow} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
              {status !== 'active' && (
                <Button size="sm" onClick={() => handleStatusChange('active')} disabled={!canActivate || saving}>
                  <Power className="h-4 w-4" />
                  Activate
                </Button>
              )}
              {status === 'active' && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('paused')} disabled={saving}>
                  Pause
                </Button>
              )}
              {status !== 'archived' && (
                <Button size="sm" variant="ghost" onClick={() => handleStatusChange('archived')} disabled={saving}>
                  <Archive className="h-4 w-4" />
                  Archive
                </Button>
              )}
            </div>
          </div>
          {!hasTrigger && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              This workflow needs a trigger before it can be activated.
            </div>
          )}
          {hasTrigger && !canActivate && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Add at least one action step to activate this workflow.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Workflow Steps */}
      <div className="space-y-2">
        {sortedSteps.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">No steps yet. Add a trigger to get started.</p>
          </div>
        )}
        {sortedSteps.map((step, idx) => (
          <div key={step.id}>
            <StepCard
              step={step}
              isFirst={idx === 0}
              isLast={idx === sortedSteps.length - 1}
              selectionData={selectionData}
              onUpdate={(updates) => updateStep(step.id, updates)}
              onDelete={() => deleteStep(step.id)}
              onMoveUp={() => moveStep(step.id, 'up')}
              onMoveDown={() => moveStep(step.id, 'down')}
            />
            {idx < sortedSteps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Step Button */}
      <Dialog open={addStepDialogOpen} onOpenChange={setAddStepDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Workflow Step</DialogTitle>
          </DialogHeader>
          <AddStepPanel onAdd={addStep} hasTrigger={hasTrigger} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Step Card
// ============================================================================

function StepCard({
  step,
  isFirst,
  isLast,
  selectionData,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  step: AutomationStep;
  isFirst: boolean;
  isLast: boolean;
  selectionData: any;
  onUpdate: (updates: Partial<AutomationStep>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const icon = step.step_type === 'trigger' ? Zap :
               step.step_type === 'condition' ? GitBranch :
               step.step_type === 'action' ? Play : Clock;
  const Icon = icon;
  const colorClass = STEP_TYPE_COLORS[step.step_type] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  const def = step.step_type === 'trigger' ? getTriggerDef(step.step_key) :
              step.step_type === 'condition' ? getConditionDef(step.step_key) :
              step.step_type === 'action' ? getActionDef(step.step_key) : null;

  return (
    <div className={cn('rounded-lg border p-4', colorClass)}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{step.step_type}</span>
              <span className="text-sm font-medium">{def?.label ?? step.step_key}</span>
            </div>
            <div className="flex items-center gap-1">
              {!isFirst && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
              {!isLast && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Step Configuration */}
          <div className="mt-3">
            <StepConfigEditor step={step} selectionData={selectionData} onUpdate={onUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step Config Editor
// ============================================================================

function StepConfigEditor({
  step,
  selectionData,
  onUpdate,
}: {
  step: AutomationStep;
  selectionData: any;
  onUpdate: (updates: Partial<AutomationStep>) => void;
}) {
  const config = step.config || {};

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    onUpdate({ config: newConfig });
  };

  // Delay step
  if (step.step_type === 'delay') {
    const duration = (config.duration as string) || '1';
    const unit = (config.unit as string) || 'days';
    return (
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Duration</Label>
          <Input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => updateConfig('duration', e.target.value)}
            className="h-8 w-24"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unit</Label>
          <Select value={unit} onValueChange={(v) => updateConfig('unit', v)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DELAY_UNITS.map((u) => (
                <SelectItem key={u.key} value={u.key}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Trigger/Condition/Action — render config fields from registry
  const def = step.step_type === 'trigger' ? getTriggerDef(step.step_key) :
              step.step_type === 'condition' ? getConditionDef(step.step_key) :
              step.step_type === 'action' ? getActionDef(step.step_key) : null;

  if (!def || !def.configFields || def.configFields.length === 0) {
    if (step.step_type === 'condition') {
      return <ConditionConfigEditor step={step} selectionData={selectionData} onUpdate={onUpdate} />;
    }
    return <p className="text-xs opacity-60">No configuration needed.</p>;
  }

  return (
    <div className="space-y-3">
      {def.configFields.map((field) => (
        <ConfigFieldInput
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={(v) => updateConfig(field.key, v)}
          selectionData={selectionData}
        />
      ))}
      {step.step_type === 'condition' && (
        <ConditionConfigEditor step={step} selectionData={selectionData} onUpdate={onUpdate} />
      )}
    </div>
  );
}

// ============================================================================
// Condition Config Editor (operator + value)
// ============================================================================

function ConditionConfigEditor({
  step,
  selectionData,
  onUpdate,
}: {
  step: AutomationStep;
  selectionData: any;
  onUpdate: (updates: Partial<AutomationStep>) => void;
}) {
  const def = getConditionDef(step.step_key);
  if (!def) return null;

  const config = step.config || {};
  const operator = (config.operator as string) || def.operators[0];

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    onUpdate({ config: newConfig });
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Operator</Label>
        <Select value={operator} onValueChange={(v) => updateConfig('operator', v)}>
          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {def.operators.map((op) => (
              <SelectItem key={op} value={op}>
                {OPERATORS.find((o) => o.key === op)?.label ?? op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {def.configFields.map((field) => (
        <ConfigFieldInput
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={(v) => updateConfig(field.key, v)}
          selectionData={selectionData}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Config Field Input
// ============================================================================

function ConfigFieldInput({
  field,
  value,
  onChange,
  selectionData,
}: {
  field: any;
  value: any;
  onChange: (v: string) => void;
  selectionData: any;
}) {
  const labelEl = <Label className="text-xs">{field.label}{field.required && <span className="text-red-500"> *</span>}</Label>;

  if (field.type === 'select' && field.options) {
    return (
      <div className="space-y-1">
        {labelEl}
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {field.options.map((opt: any) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'user') {
    return (
      <div className="space-y-1">
        {labelEl}
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Select user..." /></SelectTrigger>
          <SelectContent>
            {(selectionData.users ?? []).map((u: any) => (
              <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'tag') {
    return (
      <div className="space-y-1">
        {labelEl}
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Select tag..." /></SelectTrigger>
          <SelectContent>
            {(selectionData.tags ?? []).map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'pipeline_stage') {
    return (
      <div className="space-y-1">
        {labelEl}
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Select stage..." /></SelectTrigger>
          <SelectContent>
            {(selectionData.pipelineStages ?? []).map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name} ({s.pipeline_name})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'department') {
    return (
      <div className="space-y-1">
        {labelEl}
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Select department..." /></SelectTrigger>
          <SelectContent>
            {(selectionData.departments ?? []).map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'group') {
    return (
      <div className="space-y-1">
        {labelEl}
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Select group..." /></SelectTrigger>
          <SelectContent>
            {(selectionData.groups ?? []).map((g: any) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'membership_status') {
    return (
      <div className="space-y-1">
        {labelEl}
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Select status..." /></SelectTrigger>
          <SelectContent>
            {(selectionData.membershipStatuses ?? []).map((m: any) => (
              <SelectItem key={m.status_key} value={m.status_key}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'template') {
    return (
      <div className="space-y-1">
        {labelEl}
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Select template..." /></SelectTrigger>
          <SelectContent>
            {(selectionData.templates ?? []).map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name} ({t.channel})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Default: text/number
  return (
    <div className="space-y-1">
      {labelEl}
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="h-8 w-44"
      />
    </div>
  );
}

// ============================================================================
// Add Step Panel
// ============================================================================

function AddStepPanel({
  onAdd,
  hasTrigger,
}: {
  onAdd: (stepType: StepType, stepKey: string) => void;
  hasTrigger: boolean;
}) {
  const [tab, setTab] = useState<StepType>(hasTrigger ? 'action' : 'trigger');

  const sections: { type: StepType; label: string; items: { key: string; label: string; description: string }[] }[] = [
    {
      type: 'trigger',
      label: 'Triggers',
      items: hasTrigger ? [] : TRIGGER_REGISTRY.map((t) => ({ key: t.key, label: t.label, description: t.description })),
    },
    {
      type: 'condition',
      label: 'Conditions',
      items: CONDITION_REGISTRY.map((c) => ({ key: c.key, label: c.label, description: c.description })),
    },
    {
      type: 'action',
      label: 'Actions',
      items: ACTION_REGISTRY.map((a) => ({ key: a.key, label: a.label, description: a.description })),
    },
    {
      type: 'delay',
      label: 'Delays',
      items: [{ key: 'wait', label: 'Wait/Delay', description: 'Wait for a specified duration before continuing' }],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <Button
            key={s.type}
            size="sm"
            variant={tab === s.type ? 'default' : 'outline'}
            onClick={() => setTab(s.type)}
            disabled={s.type === 'trigger' && hasTrigger}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {sections.find((s) => s.type === tab)?.items.map((item) => (
          <button
            key={item.key}
            onClick={() => onAdd(tab, item.key)}
            className="flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/50"
          >
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </button>
        )) ?? <p className="text-sm text-muted-foreground">No items available.</p>}
        {tab === 'trigger' && hasTrigger && (
          <p className="py-4 text-center text-sm text-muted-foreground">A workflow can only have one trigger.</p>
        )}
      </div>
    </div>
  );
}
