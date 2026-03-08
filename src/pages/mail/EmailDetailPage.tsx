import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Star, Reply, Tag, MoreVertical, CheckCheck } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';
import { format } from 'date-fns';

interface EmailDetail {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
  recipient_name?: string;
  recipient_email?: string;
}

const EmailDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('emails').select('*').eq('id', id).single();
      if (!data) { setLoading(false); return; }

      const profileIds = [data.from_user_id, data.to_user_id];
      const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', profileIds);
      const profileMap: Record<string, { name: string; email: string }> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = { name: p.name, email: p.email }; });

      setEmail({
        ...data,
        sender_name: profileMap[data.from_user_id]?.name || 'Unknown',
        sender_email: profileMap[data.from_user_id]?.email || '',
        recipient_name: profileMap[data.to_user_id]?.name || 'Unknown',
        recipient_email: profileMap[data.to_user_id]?.email || '',
      });

      // Mark as read if recipient
      if (data.to_user_id === user?.id && !data.is_read) {
        await supabase.from('emails').update({ is_read: true }).eq('id', id);
      }
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const toggleStar = async () => {
    if (!email) return;
    await supabase.from('emails').update({ is_starred: !email.is_starred }).eq('id', email.id);
    setEmail(prev => prev ? { ...prev, is_starred: !prev.is_starred } : prev);
  };

  const deleteEmail = async () => {
    if (!email || !user) return;
    const field = email.from_user_id === user.id ? 'deleted_by_sender' : 'deleted_by_recipient';
    await supabase.from('emails').update({ [field]: true }).eq('id', email.id);
    toast({ title: 'Moved to Trash' });
    navigate(-1);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!email) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <p>Email not found</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-border bg-card flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <button onClick={toggleStar} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <Star className={`h-5 w-5 ${email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
        </button>
        <button onClick={deleteEmail} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-destructive">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 max-w-3xl w-full mx-auto">
        <h1 className="text-xl font-bold text-foreground mb-5">{email.subject || '(no subject)'}</h1>

        {/* Sender info */}
        <div className="flex items-start gap-3 mb-6 pb-6 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold">{email.sender_name?.charAt(0) || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{email.sender_name}</p>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {format(new Date(email.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{email.sender_email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              To: <span className="text-foreground">{email.recipient_name}</span> &lt;{email.recipient_email}&gt;
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-[200px]">
          {email.body || <span className="text-muted-foreground italic">(no content)</span>}
        </div>
      </div>
    </div>
  );
};

export default EmailDetailPage;
