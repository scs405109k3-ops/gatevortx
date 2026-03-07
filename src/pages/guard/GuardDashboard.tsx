import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Clock, CheckCircle, XCircle, Shield } from 'lucide-react';
import { supabase, Visitor } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/guard', icon: <Shield className="h-5 w-5" /> },
  { label: 'Visitors', path: '/guard/visitors', icon: <Users className="h-5 w-5" /> },
];

const GuardDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('visitors')
        .select('*')
        .eq('guard_id', profile.id)
        .eq('date', today)
        .order('created_at', { ascending: false });
      setVisitors((data as Visitor[]) || []);
      setLoading(false);
    };
    fetch();

    // Realtime subscription
    const channel = supabase
      .channel('guard-visitors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors', filter: `guard_id=eq.${profile.id}` },
        () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, today]);

  const stats = {
    total: visitors.length,
    pending: visitors.filter(v => v.status === 'pending').length,
    approved: visitors.filter(v => v.status === 'approved').length,
    rejected: visitors.filter(v => v.status === 'rejected').length,
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-20">
      <TopBar title="Guard Dashboard" subtitle="Security Guard" />

      <div className="px-5 py-5 space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Today', value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
            { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
            { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-red-50 text-red-600' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <div className={`h-10 w-10 rounded-xl ${stat.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Add Visitor CTA */}
        <button
          onClick={() => navigate('/guard/add-visitor')}
          className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all text-base"
        >
          <div className="h-8 w-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Plus className="h-5 w-5" />
          </div>
          Add New Visitor
        </button>

        {/* Today's Visitors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Today's Visitors</h2>
            <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-2xl p-4 border border-border h-24 animate-pulse bg-muted" />
              ))}
            </div>
          ) : visitors.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 border border-border text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No visitors today</p>
              <p className="text-xs text-muted-foreground mt-1">Tap the button above to add a visitor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visitors.map(visitor => (
                <div key={visitor.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm animate-fade-in">
                  <div className="flex items-start gap-3">
                    {visitor.photo_url ? (
                      <img src={visitor.photo_url} alt={visitor.visitor_name} className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-lg">{visitor.visitor_name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground text-sm truncate">{visitor.visitor_name}</p>
                        <StatusBadge status={visitor.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{visitor.company}</p>
                      <p className="text-xs text-muted-foreground">Meets: {visitor.person_to_meet}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(visitor.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default GuardDashboard;
