'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { UserPlus, Trash2, Loader2 } from 'lucide-react';
import type { UnitMember } from '@/lib/organization/schema';

interface MemberManagerProps {
  entityType: 'department' | 'ministry' | 'group';
  entityId: string;
  members: UnitMember[];
  roleOptions: { value: string; label: string }[];
  canManage: boolean;
}

export function MemberManager({ entityType, entityId, members, roleOptions, canManage }: MemberManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, startSave] = useTransition();
  const [removing, startRemove] = useTransition();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; first_name: string; last_name: string; email: string | null }[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [searching, setSearching] = useState(false);

  const supabase = createClient();
  const joinTable = `${entityType}_members`;
  const entityCol = `${entityType}_id`;

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from('members')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
      .is('deleted_at', null)
      .limit(10);
    const existingIds = new Set(members.map((m) => m.member_id));
    setSearchResults((data ?? []).filter((m) => !existingIds.has(m.id)));
    setSearching(false);
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;
    startSave(async () => {
      const { error } = await supabase.from(joinTable).insert({
        [entityCol]: entityId,
        member_id: selectedMember,
        role: selectedRole,
      });
      if (error) {
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Member added.' });
      setOpen(false);
      setSelectedMember('');
      setSelectedRole('member');
      setSearchTerm('');
      setSearchResults([]);
      router.refresh();
    });
  };

  const handleRemoveMember = async (membershipId: string) => {
    startRemove(async () => {
      const { error } = await supabase.from(joinTable).delete().eq('id', membershipId);
      if (error) {
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Member removed.' });
      router.refresh();
    });
  };

  const getRoleLabel = (role: string) => roleOptions.find((r) => r.value === role)?.label ?? role.replace(/_/g, ' ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Members ({members.length})</h3>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Member</DialogTitle>
                <DialogDescription>Search for a member and assign a role.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
                  {searchResults.length > 0 && (
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                      {searchResults.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMember(m.id)}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                            selectedMember === m.id ? 'bg-primary/10' : ''
                          }`}
                        >
                          <span className="font-medium">{m.first_name} {m.last_name}</span>
                          {m.email && <span className="text-xs text-muted-foreground">{m.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchTerm.length >= 2 && searchResults.length === 0 && !searching && (
                    <p className="text-xs text-muted-foreground">No members found.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAddMember} disabled={saving || !selectedMember}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState title="No members yet" description="Add members to this unit to get started." />
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const initials = `${m.first_name[0] ?? ''}${m.last_name[0] ?? ''}`.toUpperCase();
            return (
              <div key={m.membership_id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-muted-foreground">{m.email || m.phone || 'No contact'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{getRoleLabel(m.role)}</Badge>
                  {canManage && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(m.membership_id)}
                      disabled={removing}
                    >
                      {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
