import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, CalendarCheck, FileText, User, ChevronLeft, Loader2, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import { toast } from '../../hooks/use-toast';

const NAV_ITEMS = [
  { label: 'Home', path: '/teacher', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/teacher/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/teacher/leave', icon: <FileText className="h-5 w-5" /> },
  { label: 'Profile', path: '/teacher/profile', icon: <User className="h-5 w-5" /> },
];

interface LeaveRow {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const TeacherLeaveRequestPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', profile.id)
      .order('created_at', { ascending: false });
    setLeaves((data as LeaveRow[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !startDate || !endDate || !reason.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('leave_requests').insert({
      employee_id: profile.id,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: 'Could not submit leave request.', variant: 'destructive' });
    } else {
      toast({ title: '✅ Leave Requested', description: 'Your leave request has been submitted.' });
      setShowForm(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchLeaves();
    }
    setSubmitting(false);
  };

  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-amber-600" />;
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <div className="px-5 pt-12 pb-5 text-white" style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/teacher')} className="bg-white/20 rounded-lg p-2">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Leave Requests</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-white/20 rounded-lg p-2">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)
        ) : leaves.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No leave requests</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm font-semibold text-primary">
              + Request Leave
            </button>
          </div>
        ) : (
          leaves.map(l => (
            <div key={l.id} className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-foreground">{l.reason}</p>
                <div className="flex items-center gap-1">
                  {statusIcon(l.status)}
                  <span className={`text-xs font-semibold capitalize ${l.status === 'approved' ? 'text-green-600' : l.status === 'rejected' ? 'text-destructive' : 'text-amber-600'}`}>
                    {l.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(l.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowForm(false)}>
          <div className="w-full bg-card rounded-t-3xl p-6 pb-10 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">Request Leave</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Reason</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for leave..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground" />
              </div>
              <button type="submit" disabled={submitting || !startDate || !endDate || !reason.trim()}
                className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all shadow-lg shadow-primary/30">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {submitting ? 'Submitting…' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default TeacherLeaveRequestPage;
