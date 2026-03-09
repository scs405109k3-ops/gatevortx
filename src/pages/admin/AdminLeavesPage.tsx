import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Users, Calendar, Loader2, FileText, LayoutDashboard, BarChart3, CalendarCheck } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { LeaveRequest } from '../../types/app';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import { toast } from '../../hooks/use-toast';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Visitors', path: '/admin/visitors', icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance', path: '/admin/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leaves', path: '/admin/leaves', icon: <FileText className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

const AdminLeavesPage: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const fetchLeaves = useCallback(async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select('*, profiles:employee_id(name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setLeaves(data.map((l: any) => ({ ...l, employee_name: l.profiles?.name || 'Unknown' })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaves();
    const ch = supabase.channel('admin-leaves')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => fetchLeaves())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLeaves]);

  const handleDecision = async (leave: LeaveRequest, decision: 'approved' | 'rejected') => {
    setProcessingId(leave.id);
    const { error } = await supabase.from('leave_requests').update({ status: decision }).eq('id', leave.id);
    if (error) { toast({ title: 'Error', variant: 'destructive' }); setProcessingId(null); return; }

    await supabase.from('notifications').insert({
      user_id: leave.employee_id,
      message: decision === 'approved'
        ? `✅ Your leave request (${leave.start_date} – ${leave.end_date}) has been approved`
        : `❌ Your leave request (${leave.start_date} – ${leave.end_date}) has been rejected`,
      type: `leave_${decision}`,
      read: false,
    });

    toast({ title: decision === 'approved' ? '✅ Leave Approved' : '❌ Leave Rejected' });
    setProcessingId(null);
  };

  const filtered = leaves.filter(l => filter === 'all' || l.status === filter);

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <TopBar title="Leave Requests" subtitle="Admin" backPath="/admin" />

      <div className="px-5 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${leaves.filter(l => l.status === f).length})`}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No {filter} leave requests</p>
            </div>
          ) : filtered.map(leave => (
            <div key={leave.id} className="bg-card rounded-2xl border border-border shadow-sm p-4 animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">{leave.employee_name?.charAt(0) || '?'}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{leave.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(leave.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <StatusBadge status={leave.status} />
              </div>

              <div className="bg-muted rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-foreground font-medium">
                  {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="bg-muted rounded-xl px-3 py-2 mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
                <p className="text-sm text-foreground">{leave.reason}</p>
              </div>

              {leave.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision(leave, 'rejected')}
                    disabled={processingId === leave.id}
                    className="flex-1 h-11 rounded-xl border-2 border-destructive text-destructive font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {processingId === leave.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    REJECT
                  </button>
                  <button
                    onClick={() => handleDecision(leave, 'approved')}
                    disabled={processingId === leave.id}
                    className="flex-1 h-11 rounded-xl bg-success text-success-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {processingId === leave.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    APPROVE
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default AdminLeavesPage;
