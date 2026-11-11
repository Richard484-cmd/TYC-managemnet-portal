'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GivingCategory } from '@/lib/giving/types';

export function GivingCategoriesClient({
  initialCategories,
}: {
  initialCategories: GivingCategory[];
}) {
  const supabase = createClient();
  const [categories, setCategories] = useState<GivingCategory[]>(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GivingCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fundCode, setFundCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFundCode('');
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (cat: GivingCategory) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description ?? '');
    setFundCode(cat.fund_code ?? '');
    setIsActive(cat.is_active);
    setDialogOpen(true);
  };

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);

    if (editing) {
      const { data, error } = await supabase
        .from('giving_categories')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          fund_code: fundCode.trim() || null,
          is_active: isActive,
        })
        .eq('id', editing.id)
        .select()
        .maybeSingle();

      setSaving(false);
      if (error || !data) {
        toast.error('Failed to update category');
        return;
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === editing.id ? (data as GivingCategory) : c))
      );
      toast.success('Category updated');
    } else {
      const { data, error } = await supabase
        .from('giving_categories')
        .insert({
          name: name.trim(),
          slug: slugify(name),
          description: description.trim() || null,
          fund_code: fundCode.trim() || null,
          is_active: isActive,
          sort_order: categories.length + 1,
        })
        .select()
        .maybeSingle();

      setSaving(false);
      if (error || !data) {
        toast.error('Failed to create category');
        return;
      }
      setCategories((prev) => [...prev, data as GivingCategory]);
      toast.success('Category created');
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit Category' : 'Add Giving Category'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tithes"
                />
              </div>
              <div className="space-y-2">
                <Label>Fund Code (optional)</Label>
                <Input
                  value={fundCode}
                  onChange={(e) => setFundCode(e.target.value)}
                  placeholder="e.g. TITHE"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{cat.name}</p>
                  {cat.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  )}
                  {cat.fund_code && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Code: {cat.fund_code}
                    </p>
                  )}
                  <span
                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      cat.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(cat)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
