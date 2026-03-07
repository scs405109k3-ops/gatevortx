import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, FileText, Send, Loader2, User } from 'lucide-react';
import { supabase, LeaveRequest } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import StatusBadge from '../../components/StatusBadge';
import { toast } from '../../hooks/use-toast';

const NAV_ITEMS = [
  { label: 'Home', path: '/employee', icon: <User className="h-5 w-5" /> },
  { label: 'Attendance', path: '/employee/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/employee/leave', icon: <FileText className="h-5 w-5" /> },
];

const LeaveRequestPage: React.FC = () => {
  const { profile } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  const fetchLeaves = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', profile.id)
      .order('created_at', { ascending: false });
    setLeaves((data as LeaveRequest[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchLeaves();
    const ch = supabase.channel('employee-leaves')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests', filter: `employee_id=eq.${profile?.id}` }, () => fetchLeaves())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLeaves, profile]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.start_date) e.start_date = 'Required';
    if (!form.end_date) e.end_date = 'Required';
    else if (form.end_date < form.start_date) e.end_date = 'End date must be after start date';
    if (!form.reason.trim()) e.reason = 'Required';
    else if (form.reason.trim().length < 10) e.reason = 'Please provide more details (min 10 chars)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !profile) return;
    setSubmitting(true);

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: profile.id,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason.trim(),
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit leave request', variant: 'destructive' });
    } else {
      // Notify admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins) {
        await Promise.all(admins.map(admin =>
          supabase.from('notifications').insert({
            user_id: admin.id,
            message: `📋 Leave request from ${profile.name}: ${form.start_date} to ${form.end_date}`,
            type: 'leave_request',
            read: false,
          })
        ));
      }
      toast({ title: '✅ Leave Request Submitted', description: 'Your request has been sent to admin.' });
      setForm({ start_date: '', end_date: '', reason: '' });
      setShowForm(false);
      fetchLeaves();
    }
    setSubmitting(false);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="mobile-container bg-background flex flex-col pb-24">
      <div className="px-5 pt-12 pb-4 text-white" style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <h1 className="text-xl font-bold">Leave Requests</h1>
        <p className="text-blue-200 text-xs mt-0.5">Manage your time off</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Toggle Form */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
        >
          <FileText className="h-4 w-4" />
          {showForm ? 'Cancel' : 'New Leave Request'}
        </button>

        {/* Form */}
        {showForm && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-foreground">Leave Application</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  min={today}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className={`w-full h-11 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.start_date ? 'border-destructive' : 'border-border'}`}
                />
                {errors.start_date && <p className="text-xs text-destructive mt-1">{errors.start_date}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.start_date || today}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className={`w-full h-11 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.end_date ? 'border-destructive' : 'border-border'}`}
                />
                {errors.end_date && <p className="text-xs text-destructive mt-1">{errors.end_date}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason for Leave</label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Describe the reason for your leave request..."
                rows={3}
                className={`w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none ${errors.reason ? 'border-destructive' : 'border-border'}`}
              />
              {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason}</p>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all text-sm"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        )}

        {/* Leave History */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">My Leave Requests</h2>
          {loading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No leave requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map(leave => (
                <div key={leave.id} className="bg-card rounded-2xl border border-border p-4 animate-fade-in">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Applied {new Date(leave.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <StatusBadge status={leave.status} />
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">{leave.reason}</p>
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

export default LeaveRequestPage;
