'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  TemplateEditorForm,
  CommunicationStatusBadge,
} from '@/components/admin/communication/communication-components';
import type { CommunicationTemplate } from '@/lib/communication/types';
import { getChannelLabel } from '@/lib/communication/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Pencil, Copy, Power } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateManagementClientProps {
  templates: CommunicationTemplate[];
  currentUserId: string;
  canManage: boolean;
}

export function TemplateManagementClient({
  templates: initialTemplates,
  currentUserId,
  canManage,
}: TemplateManagementClientProps) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<CommunicationTemplate[]>(initialTemplates);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [editing, setEditing] = useState<CommunicationTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const filtered = templates.filter((t) => {
    if (channelFilter !== 'all' && t.channel !== channelFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.identifier.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async (data: Partial<CommunicationTemplate>) => {
    if (editing) {
      const { error } = await supabase
        .from('communication_templates')
        .update({ ...data, updated_by: currentUserId })
        .eq('id', editing.id);
      if (error) {
        toast.error('Failed to update template');
        return;
      }
      setTemplates((prev) => prev.map((t) => t.id === editing.id ? { ...t, ...data } as CommunicationTemplate : t));
      toast.success('Template updated');
    } else {
      const { data: newTemplate, error } = await supabase
        .from('communication_templates')
        .insert({ ...data, created_by: currentUserId, updated_by: currentUserId })
        .select('*')
        .single();
      if (error || !newTemplate) {
        toast.error('Failed to create template');
        return;
      }
      setTemplates((prev) => [newTemplate as CommunicationTemplate, ...prev]);
      toast.success('Template created');
    }
    setShowForm(false);
    setEditing(null);
    setCreating(false);
  };

  const handleDuplicate = async (t: CommunicationTemplate) => {
    const { data, error } = await supabase
      .from('communication_templates')
      .insert({
        identifier: `${t.identifier}_copy`,
        name: `${t.name} (Copy)`,
        description: t.description,
        channel: t.channel,
        subject: t.subject,
        body: t.body,
        is_active: true,
        is_system: false,
        created_by: currentUserId,
        updated_by: currentUserId,
      })
      .select('*')
      .single();
    if (error || !data) {
      toast.error('Failed to duplicate template');
      return;
    }
    setTemplates((prev) => [data as CommunicationTemplate, ...prev]);
    toast.success('Template duplicated');
  };

  const handleToggleActive = async (t: CommunicationTemplate) => {
    const { error } = await supabase
      .from('communication_templates')
      .update({ is_active: !t.is_active, updated_by: currentUserId })
      .eq('id', t.id);
    if (error) {
      toast.error('Failed to update template');
      return;
    }
    setTemplates((prev) => prev.map((p) => p.id === t.id ? { ...p, is_active: !p.is_active } : p));
    toast.success(`Template ${t.is_active ? 'deactivated' : 'activated'}`);
  };

  if (showForm || creating) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {editing ? 'Edit Template' : 'New Template'}
          </h3>
          <TemplateEditorForm
            template={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); setCreating(false); }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full sm:w-64"
        />
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="in_app">In-App</SelectItem>
          </SelectContent>
        </Select>
        {canManage && (
          <Button size="sm" onClick={() => { setCreating(true); setEditing(null); }} className="ml-auto">
            <Plus className="mr-1 h-4 w-4" />
            New Template
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No templates found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{t.name}</h4>
                      {t.is_system && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[0.65rem] font-semibold text-blue-700">System</span>
                      )}
                      <span className={t.is_active ? 'rounded-full bg-green-100 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700' : 'rounded-full bg-gray-100 px-2 py-0.5 text-[0.65rem] font-semibold text-gray-500'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getChannelLabel(t.channel)} · {t.identifier}
                    </p>
                    {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                    {t.subject && <p className="mt-1 text-xs text-muted-foreground">Subject: {t.subject}</p>}
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setShowForm(true); setCreating(false); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive(t)}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
