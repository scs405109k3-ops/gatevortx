import React, { useEffect, useState } from 'react';
import { Users, Search } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Visitor } from '../../types/app';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import StatusBadge from '../../components/StatusBadge';
import { Shield } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/guard', icon: <Shield className="h-5 w-5" /> },
  { label: 'Visitors', path: '/guard/visitors', icon: <Users className="h-5 w-5" /> },
];

const VisitorStatusPage: React.FC = () => {
  const { profile } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('visitors')
        .select('*')
        .eq('guard_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setVisitors((data as Visitor[]) || []);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel('guard-all-visitors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors', filter: `guard_id=eq.${profile.id}` }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const filtered = visitors.filter(v => {
    const matchSearch = !search ||
      v.visitor_name.toLowerCase().includes(search.toLowerCase()) ||
      v.company.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || v.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="mobile-container bg-background flex flex-col pb-20">
      <div className="px-5 pt-12 pb-4 text-white" style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <h1 className="text-xl font-bold">All Visitors</h1>
        <p className="text-blue-200 text-xs mt-0.5">Track approval status</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search visitors..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No visitors found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(visitor => (
              <div key={visitor.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm animate-fade-in">
                <div className="flex items-start gap-3">
                  {visitor.photo_url ? (
                    <img src={visitor.photo_url} alt={visitor.visitor_name} className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">{visitor.visitor_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">{visitor.visitor_name}</p>
                      <StatusBadge status={visitor.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{visitor.company}</p>
                    <p className="text-xs text-muted-foreground">Purpose: {visitor.purpose}</p>
                    <p className="text-xs text-muted-foreground">Meets: {visitor.person_to_meet}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(visitor.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default VisitorStatusPage;
