import React, { useState, useEffect } from 'react';
import { X, Send, Minus, Maximize2, Loader2, Users, UsersRound, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface Profile { id: string; name: string; email: string; role?: string; }

interface ComposeModalProps {
  onClose: () => void;
  draft?: { id: string; to_user_id: string; subject: string; body: string; };
}

const getRoleLabel = (role: string, orgType?: string) => {
  const isAcademic = orgType === 'school' || orgType === 'college';
  switch (role) {
    case 'admin': return 'Admin';
    case 'guard': return 'Security Guard';
    case 'teacher': return 'Teacher';
    case 'employee': return isAcademic ? 'Student' : 'Employee';
    default: return role;
  }
};

const ComposeModal: React.FC<ComposeModalProps> = ({ onClose, draft }) => {
  const { user, profile: authProfile } = useAuth();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(draft?.subject || '');
  const [body, setBody] = useState(draft?.body || '');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [companyUsers, setCompanyUsers] = useState<Profile[]>([]);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Multi-select recipients
  const [selectedRecipients, setSelectedRecipients] = useState<Profile[]>([]);
  // Bulk role (select all of a role)
  const [bulkRole, setBulkRole] = useState<string | null>(null);

  const isAdmin = authProfile?.role === 'admin';

  const allRecipients = bulkRole
    ? companyUsers.filter(u => u.role === bulkRole)
    : selectedRecipients;

  // Fetch company members for admin
  useEffect(() => {
    if (!authProfile?.company_name || !isAdmin) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('company_name', authProfile.company_name!)
        .neq('id', user?.id)
        .eq('is_active', true)
        .order('role')
        .order('name');
      setCompanyUsers((data as Profile[]) || []);
    };
    fetchUsers();
  }, [authProfile, user]);

  // Populate from draft
  useEffect(() => {
    if (draft?.to_user_id) {
      supabase.from('profiles').select('id,name,email,role').eq('id', draft.to_user_id).single()
        .then(({ data }) => {
          if (data) {
            setSelectedRecipients([data as Profile]);
            setTo('');
          }
        });
    }
  }, [draft]);

  const searchRecipients = async (query: string) => {
    setTo(query);
    setBulkRole(null);
    if (query.length < 2) {
      setSuggestions([]);
      if (!query) setShowDirectory(isAdmin);
      return;
    }
    setShowDirectory(false);
    if (isAdmin && companyUsers.length > 0) {
      const q = query.toLowerCase();
      const selectedIds = new Set(selectedRecipients.map(r => r.id));
      const filtered = companyUsers.filter(u =>
        !selectedIds.has(u.id) &&
        (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      );
      setSuggestions(filtered.slice(0, 8));
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .neq('id', user?.id)
      .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(5);
    const selectedIds = new Set(selectedRecipients.map(r => r.id));
    setSuggestions(((data as Profile[]) || []).filter(p => !selectedIds.has(p.id)));
  };

  const toggleRecipient = (p: Profile) => {
    setBulkRole(null);
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.id === p.id);
      if (exists) return prev.filter(r => r.id !== p.id);
      return [...prev, p];
    });
    setTo('');
    setSuggestions([]);
  };

  const removeRecipient = (id: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== id));
  };

  const selectBulkRole = (role: string) => {
    setBulkRole(role);
    setSelectedRecipients([]);
    setTo('');
    setSuggestions([]);
    setShowDirectory(false);
  };

  const clearAll = () => {
    setSelectedRecipients([]);
    setBulkRole(null);
    setTo('');
    setShowDirectory(false);
  };

  const isSelected = (id: string) => selectedRecipients.some(r => r.id === id);

  const saveDraft = async () => {
    if (!user || allRecipients.length === 0) return;
    const firstRecipient = allRecipients[0];
    if (draft?.id) {
      await supabase.from('emails').update({ to_user_id: firstRecipient.id, subject, body }).eq('id', draft.id);
    } else {
      await supabase.from('emails').insert({ from_user_id: user.id, to_user_id: firstRecipient.id, subject, body, is_draft: true });
    }
    toast({ title: 'Draft saved' });
    onClose();
  };

  const handleSendClick = () => {
    if (!user) return;
    if (!subject.trim()) { toast({ title: 'Add a subject', variant: 'destructive' }); return; }
    if (allRecipients.length === 0) { toast({ title: 'Select at least one recipient', variant: 'destructive' }); return; }

    // Show confirmation for 2+ recipients
    if (allRecipients.length > 1) {
      setShowConfirm(true);
      return;
    }
    executeSend();
  };

  const executeSend = async () => {
    if (!user) return;
    setShowConfirm(false);
    setLoading(true);

    const rows = allRecipients.map(r => ({
      from_user_id: user.id,
      to_user_id: r.id,
      subject,
      body,
      is_draft: false,
    }));

    let error;
    if (rows.length === 1 && draft?.id) {
      ({ error } = await supabase.from('emails').update(rows[0]).eq('id', draft.id));
    } else {
      ({ error } = await supabase.from('emails').insert(rows));
    }

    setLoading(false);
    if (error) {
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
      return;
    }

    const count = allRecipients.length;
    toast({
      title: count === 1 ? '✉️ Email sent!' : `✉️ Sent to ${count} recipients!`,
    });
    onClose();
  };

  const hasRecipient = allRecipients.length > 0;

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-3 bg-[hsl(220,26%,10%)] text-white px-4 py-2.5 rounded-t-xl shadow-2xl text-sm font-semibold"
        >
          <span className="truncate max-w-[180px]">{subject || 'New Message'}</span>
          <Maximize2 className="h-3.5 w-3.5 ml-2" />
          <X className="h-3.5 w-3.5" onClick={(e) => { e.stopPropagation(); onClose(); }} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 right-4 z-50 w-full max-w-md shadow-2xl rounded-t-xl overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="bg-[hsl(220,26%,10%)] text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold">{draft ? 'Edit Draft' : 'New Message'}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setMinimized(true)} className="text-white/60 hover:text-white p-1">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button onClick={saveDraft} className="text-white/60 hover:text-white p-1 text-xs font-medium">
              Save Draft
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white p-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card flex flex-col flex-1 overflow-hidden">
          {/* To */}
          <div className="relative border-b border-border">
            <div className="flex flex-wrap items-center px-4 py-2 gap-1.5 min-h-[42px]">
              <span className="text-xs text-muted-foreground font-medium w-8 flex-shrink-0">To</span>

              {/* Bulk role chip */}
              {bulkRole && (
                <div className="flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                  <UsersRound className="h-3 w-3" />
                  All {getRoleLabel(bulkRole, authProfile?.org_type)}s ({allRecipients.length})
                  <button onClick={clearAll} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Individual recipient chips */}
              {!bulkRole && selectedRecipients.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium"
                >
                  {r.name}
                  <button onClick={() => removeRecipient(r.id)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Input (hidden when bulk role is set) */}
              {!bulkRole && (
                <input
                  value={to}
                  onChange={e => searchRecipients(e.target.value)}
                  onFocus={() => { if (!to && isAdmin) setShowDirectory(true); }}
                  placeholder={selectedRecipients.length > 0 ? 'Add more…' : 'Search by name or email…'}
                  className="flex-1 min-w-[100px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              )}

              {isAdmin && !bulkRole && selectedRecipients.length === 0 && !to && (
                <button onClick={() => setShowDirectory(!showDirectory)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <Users className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search suggestions */}
            {suggestions.length > 0 && !showDirectory && (
              <div className="absolute left-0 right-0 top-full bg-card border border-border rounded-xl shadow-xl z-10 overflow-hidden max-h-48 overflow-y-auto">
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleRecipient(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left"
                  >
                    <div className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected(p.id) ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isSelected(p.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                    {p.role && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {getRoleLabel(p.role, authProfile?.org_type)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Company directory for admin */}
            {showDirectory && isAdmin && companyUsers.length > 0 && (
              <div className="absolute left-0 right-0 top-full bg-card border border-border rounded-xl shadow-xl z-10 overflow-hidden max-h-60 overflow-y-auto">
                {['guard', 'employee', 'teacher'].map(role => {
                  const users = companyUsers.filter(u => u.role === role);
                  if (users.length === 0) return null;
                  const roleLabel = getRoleLabel(role, authProfile?.org_type);
                  return (
                    <div key={role}>
                      <div className="px-4 py-1.5 bg-muted/50 sticky top-0 flex items-center justify-between z-10">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {roleLabel}s ({users.length})
                        </span>
                        <button
                          onClick={() => selectBulkRole(role)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          <UsersRound className="h-3 w-3" />
                          Select All
                        </button>
                      </div>
                      {users.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { toggleRecipient(p); }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted text-left"
                        >
                          <div className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected(p.id) ? 'bg-primary border-primary' : 'border-border'
                          }`}>
                            {isSelected(p.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="border-b border-border">
            <div className="flex items-center px-4 py-2.5 gap-2">
              <span className="text-xs text-muted-foreground font-medium w-8">Sub</span>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none font-medium"
              />
            </div>
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your message…"
            className="flex-1 px-4 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[180px]"
          />

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
            <button
              onClick={handleSendClick}
              disabled={loading || !hasRecipient}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {allRecipients.length > 1 ? `Send to ${allRecipients.length}` : 'Send'}
            </button>
            {allRecipients.length > 1 && !bulkRole && (
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground">
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Bulk Send
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to send this email to <strong>{allRecipients.length} recipients</strong>
                {bulkRole && (
                  <> (all {getRoleLabel(bulkRole, authProfile?.org_type)}s)</>
                )}
                .
              </p>
              <p className="text-xs text-muted-foreground">
                Subject: <span className="font-medium text-foreground">{subject}</span>
              </p>
              <div className="max-h-24 overflow-y-auto mt-2 space-y-0.5">
                {allRecipients.map(r => (
                  <p key={r.id} className="text-xs text-muted-foreground">
                    • {r.name} ({r.email})
                  </p>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeSend} className="bg-primary">
              <Send className="h-4 w-4 mr-1.5" />
              Send to {allRecipients.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ComposeModal;
