'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { CrmPipeline, CrmPipelineStage } from '@/lib/crm/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Power } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PipelineManagerClientProps {
  pipelines: CrmPipeline[];
  stagesByPipeline: Record<string, CrmPipelineStage[]>;
  canManage: boolean;
}

export function PipelineManagerClient({
  pipelines: initialPipelines,
  stagesByPipeline: initialStages,
  canManage,
}: PipelineManagerClientProps) {
  const supabase = createClient();
  const [pipelines, setPipelines] = useState<CrmPipeline[]>(initialPipelines);
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, CrmPipelineStage[]>>(initialStages);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDesc, setNewPipelineDesc] = useState('');
  const [creatingPipeline, setCreatingPipeline] = useState(false);
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(
    initialPipelines[0]?.id ?? null
  );

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) {
      toast.error('Pipeline name is required');
      return;
    }
    setCreatingPipeline(true);
    const { data, error } = await supabase
      .from('crm_pipelines')
      .insert({
        name: newPipelineName,
        description: newPipelineDesc || null,
        is_active: true,
        is_system: false,
      })
      .select('*')
      .single();
    setCreatingPipeline(false);
    if (error || !data) {
      toast.error('Failed to create pipeline');
      return;
    }
    setPipelines((prev) => [...prev, data as CrmPipeline]);
    setStagesByPipeline((prev) => ({ ...prev, [data.id]: [] }));
    setExpandedPipeline(data.id);
    setNewPipelineName('');
    setNewPipelineDesc('');
    toast.success('Pipeline created');
  };

  const handleTogglePipeline = async (pipelineId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('crm_pipelines')
      .update({ is_active: !currentActive })
      .eq('id', pipelineId);
    if (error) {
      toast.error('Failed to toggle pipeline');
      return;
    }
    setPipelines((prev) =>
      prev.map((p) => (p.id === pipelineId ? { ...p, is_active: !currentActive } : p))
    );
    toast.success(`Pipeline ${!currentActive ? 'activated' : 'deactivated'}`);
  };

  const handleAddStage = async (pipelineId: string) => {
    const currentStages = stagesByPipeline[pipelineId] ?? [];
    const newPosition = currentStages.length + 1;
    const { data, error } = await supabase
      .from('crm_pipeline_stages')
      .insert({
        pipeline_id: pipelineId,
        name: 'New Stage',
        position: newPosition,
        color: '#3b82f6',
        is_active: true,
        is_system: false,
      })
      .select('*')
      .single();
    if (error || !data) {
      toast.error('Failed to add stage');
      return;
    }
    setStagesByPipeline((prev) => ({
      ...prev,
      [pipelineId]: [...(prev[pipelineId] ?? []), data as CrmPipelineStage],
    }));
    toast.success('Stage added');
  };

  const handleUpdateStage = useCallback(
    async (pipelineId: string, stageId: string, field: string, value: string) => {
      setStagesByPipeline((prev) => ({
        ...prev,
        [pipelineId]: (prev[pipelineId] ?? []).map((s) =>
          s.id === stageId ? { ...s, [field]: value } : s
        ),
      }));
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .update({ [field]: value })
        .eq('id', stageId);
      if (error) {
        toast.error('Failed to update stage');
      }
    },
    [supabase]
  );

  const handleDeleteStage = async (pipelineId: string, stageId: string) => {
    const stage = stagesByPipeline[pipelineId]?.find((s) => s.id === stageId);
    if (stage?.is_system) {
      toast.error('System stages cannot be deleted');
      return;
    }
    const { error } = await supabase
      .from('crm_pipeline_stages')
      .delete()
      .eq('id', stageId);
    if (error) {
      toast.error('Failed to delete stage');
      return;
    }
    setStagesByPipeline((prev) => ({
      ...prev,
      [pipelineId]: (prev[pipelineId] ?? []).filter((s) => s.id !== stageId),
    }));
    toast.success('Stage deleted');
  };

  const handleReorderStage = async (pipelineId: string, stageId: string, direction: 'up' | 'down') => {
    const stages = stagesByPipeline[pipelineId] ?? [];
    const index = stages.findIndex((s) => s.id === stageId);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= stages.length) return;

    const updated = [...stages];
    const a = updated[index];
    const b = updated[swapIndex];
    const aPos = a.position;
    a.position = b.position;
    b.position = aPos;
    updated[index] = b;
    updated[swapIndex] = a;

    setStagesByPipeline((prev) => ({ ...prev, [pipelineId]: updated }));

    await Promise.all([
      supabase.from('crm_pipeline_stages').update({ position: a.position }).eq('id', a.id),
      supabase.from('crm_pipeline_stages').update({ position: b.position }).eq('id', b.id),
    ]);
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Pipeline Name</Label>
                <Input
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="e.g., Volunteer Follow-Up"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Input
                  value={newPipelineDesc}
                  onChange={(e) => setNewPipelineDesc(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <Button onClick={handleCreatePipeline} disabled={creatingPipeline} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Create Pipeline
            </Button>
          </CardContent>
        </Card>
      )}

      {pipelines.map((pipeline) => {
        const stages = stagesByPipeline[pipeline.id] ?? [];
        const isExpanded = expandedPipeline === pipeline.id;
        return (
          <Card key={pipeline.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 text-left"
                  onClick={() => setExpandedPipeline(isExpanded ? null : pipeline.id)}
                >
                  <CardTitle className="text-base">{pipeline.name}</CardTitle>
                  {pipeline.is_system && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      System
                    </span>
                  )}
                  {!pipeline.is_active && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                      Inactive
                    </span>
                  )}
                </button>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePipeline(pipeline.id, pipeline.is_active)}
                  >
                    <Power className="h-4 w-4" />
                    {pipeline.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
              </div>
              {pipeline.description && (
                <p className="text-sm text-muted-foreground">{pipeline.description}</p>
              )}
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      {canManage && (
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleReorderStage(pipeline.id, stage.id, 'up')}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <GripVertical className="h-4 w-4 rotate-180" />
                          </button>
                          <button
                            onClick={() => handleReorderStage(pipeline.id, stage.id, 'down')}
                            disabled={index === stages.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: stage.color ?? '#3b82f6' }}
                      />
                      {canManage && !stage.is_system ? (
                        <Input
                          value={stage.name}
                          onChange={(e) => handleUpdateStage(pipeline.id, stage.id, 'name', e.target.value)}
                          className="h-8 flex-1 text-sm"
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium">{stage.name}</span>
                      )}
                      {canManage && !stage.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteStage(pipeline.id, stage.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddStage(pipeline.id)}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add Stage
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
