import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Star, Mail, MailOpen, CheckCheck } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export interface EmailRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
  recipient_name?: string;
  recipient_email?: string;
}

interface EmailListProps {
  folder: 'inbox' | 'sent' | 'starred' | 'drafts' | 'trash';
  title: string;
  labelId?: string;
}

const EmailList: React.FC<EmailListProps> = ({ folder, title, labelId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchEmails = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase.from('emails').select('*');

    if (folder === 'inbox') {
      query = query.eq('to_user_id', user.id).eq('is_draft', false).eq('deleted_by_recipient', false);
    } else if (folder === 'sent') {
      query = query.eq('from_user_id', user.id).eq('is_draft', false).eq('deleted_by_sender', false);
    } else if (folder === 'starred') {
      query = query.eq('to_user_id', user.id).eq('is_starred', true).eq('deleted_by_recipient', false);
    } else if (folder === 'drafts') {
      query = query.eq('from_user_id', user.id).eq('is_draft', true);
    } else if (folder === 'trash') {
      query = query.or(`and(from_user_id.eq.${user.id},deleted_by_sender.eq.true),and(to_user_id.eq.${user.id},deleted_by_recipient.eq.true)`);
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,body.ilike.%${search}%`);
    }

    const { data: emailData } = await query.order('created_at', { ascending: false });

    if (!emailData || emailData.length === 0) {
      setEmails([]);
      setLoading(false);
      return;
    }

    // Fetch profile names
    const profileIds = [...new Set([
      ...emailData.map((e: any) => e.from_user_id),
      ...emailData.map((e: any) => e.to_user_id),
    ])];
    const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', profileIds);
    const profileMap: Record<string, { name: string; email: string }> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = { name: p.name, email: p.email }; });

    const rows: EmailRow[] = emailData.map((e: any) => ({
      ...e,
      sender_name: profileMap[e.from_user_id]?.name || 'Unknown',
      sender_email: profileMap[e.from_user_id]?.email || '',
      recipient_name: profileMap[e.to_user_id]?.name || 'Unknown',
      recipient_email: profileMap[e.to_user_id]?.email || '',
    }));

    setEmails(rows);
    setLoading(false);
  }, [user, folder, search]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`emails-${folder}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, fetchEmails)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, folder]);

  const openEmail = async (email: EmailRow) => {
    if (folder === 'inbox' && !email.is_read) {
      await supabase.from('emails').update({ is_read: true }).eq('id', email.id);
    }
    if (folder === 'drafts') {
      navigate(`/mail/compose/${email.id}`);
    } else {
      navigate(`/mail/email/${email.id}`);
    }
  };

  const toggleStar = async (e: React.MouseEvent, email: EmailRow) => {
    e.stopPropagation();
    await supabase.from('emails').update({ is_starred: !email.is_starred }).eq('id', email.id);
    fetchEmails();
  };

  const displayName = (email: EmailRow) =>
    folder === 'sent' || folder === 'drafts' ? `To: ${email.recipient_name}` : email.sender_name;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <button onClick={fetchEmails} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 md:px-6 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search emails…"
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">No emails here</p>
            <p className="text-sm text-muted-foreground">{search ? 'Try a different search term' : `Your ${title.toLowerCase()} is empty`}</p>
          </div>
        ) : (
          emails.map(email => {
            const unread = folder === 'inbox' && !email.is_read;
            return (
              <button
                key={email.id}
                onClick={() => openEmail(email)}
                className={`w-full flex items-start gap-3 px-4 md:px-6 py-3.5 border-b border-border text-left hover:bg-muted/50 transition-colors ${unread ? 'bg-primary/5' : ''}`}
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-sm">
                    {(folder === 'sent' || folder === 'drafts' ? email.recipient_name : email.sender_name)?.charAt(0) || '?'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm truncate ${unread ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                      {displayName(email)}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {email.subject || '(no subject)'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {email.body.slice(0, 80)}
                  </p>
                </div>

                {/* Star */}
                <button
                  onClick={(e) => toggleStar(e, email)}
                  className="flex-shrink-0 mt-1 p-1 text-muted-foreground hover:text-yellow-500 transition-colors"
                >
                  <Star className={`h-4 w-4 ${email.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </button>

                {/* Unread dot */}
                {unread && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EmailList;
