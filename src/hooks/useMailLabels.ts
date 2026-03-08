import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';

export interface MailLabel {
  id: string;
  name: string;
  color: string;
  user_id: string;
}

export const useMailLabels = () => {
  const { user } = useAuth();
  const [labels, setLabels] = useState<MailLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabels = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('email_labels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setLabels((data as MailLabel[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLabels(); }, [user]);

  const createLabel = async (name: string, color: string) => {
    if (!user) return;
    await supabase.from('email_labels').insert({ user_id: user.id, name, color });
    fetchLabels();
  };

  const deleteLabel = async (id: string) => {
    await supabase.from('email_labels').delete().eq('id', id);
    fetchLabels();
  };

  return { labels, loading, createLabel, deleteLabel, refetch: fetchLabels };
};
