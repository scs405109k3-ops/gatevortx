import React, { useState, useEffect } from 'react';
import { X, Send, ChevronDown, Minus, Maximize2, Loader2, Tag } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';

interface Profile { id: string; name: string; email: string; }

interface ComposeModalProps {
  onClose: () => void;
  draft?: { id: string; to_user_id: string; subject: string; body: string; };
}

const ComposeModal: React.FC<ComposeModalProps> = ({ onClose, draft }) => {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(draft?.subject || '');
  const [body, setBody] = useState(draft?.body || '');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [toProfile, setToProfile] = useState<Profile | null>(null);
  const [searching, setSearching] = useState(false);

  // Populate to field from draft
  useEffect(() => {
    if (draft?.to_user_id) {
      supabase.from('profiles').select('id,name,email').eq('id', draft.to_user_id).single()
        .then(({ data }) => { if (data) { setToProfile(data as Profile); setTo(data.email); } });
    }
  }, [draft]);

  const searchRecipients = async (query: string) => {
    setTo(query);
    setToProfile(null);
    if (query.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .neq('id', user?.id)
      .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(5);
    setSuggestions((data as Profile[]) || []);
    setSearching(false);
  };

  const selectRecipient = (p: Profile) => {
    setToProfile(p);
    setTo(p.email);
    setSuggestions([]);
  };

  const saveDraft = async () => {
    if (!user || !toProfile) return;
    if (draft?.id) {
      await supabase.from('emails').update({ to_user_id: toProfile.id, subject, body }).eq('id', draft.id);
    } else {
      await supabase.from('emails').insert({ from_user_id: user.id, to_user_id: toProfile.id, subject, body, is_draft: true });
    }
    toast({ title: 'Draft saved' });
    onClose();
  };

  const sendEmail = async () => {
    if (!user || !toProfile) { toast({ title: 'Select a recipient', variant: 'destructive' }); return; }
    if (!subject.trim()) { toast({ title: 'Add a subject', variant: 'destructive' }); return; }
    setLoading(true);
    const payload = { from_user_id: user.id, to_user_id: toProfile.id, subject, body, is_draft: false };
    let error;
    if (draft?.id) {
      ({ error } = await supabase.from('emails').update(payload).eq('id', draft.id));
    } else {
      ({ error } = await supabase.from('emails').insert(payload));
    }
    setLoading(false);
    if (error) { toast({ title: 'Failed to send', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✉️ Email sent!' });
    onClose();
  };

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
          <div className="flex items-center px-4 py-2.5 gap-2">
            <span className="text-xs text-muted-foreground font-medium w-8">To</span>
            {toProfile ? (
              <div className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                {toProfile.name}
                <button onClick={() => { setToProfile(null); setTo(''); }} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <input
                value={to}
                onChange={e => searchRecipients(e.target.value)}
                placeholder="Search by name or email…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full bg-card border border-border rounded-xl shadow-xl z-10 overflow-hidden">
              {suggestions.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectRecipient(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                </button>
              ))}
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
            onClick={sendEmail}
            disabled={loading || !toProfile}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;
