import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, XCircle, Users, Clock, Building2, Phone, Shield, Loader2, Bell, Menu, LayoutDashboard, BarChart3, CalendarCheck, FileText } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Visitor } from '../../types/app';
import BottomNav from '../../components/BottomNav';
import StatusBadge from '../../components/StatusBadge';
import { toast } from '../../hooks/use-toast';
import { useNotifications } from '../../hooks/useNotifications';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Approvals', path: '/admin/visitors', icon: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> },
  { label: 'Visitors', path: '/admin/attendance', icon: <Users className="h-5 w-5" /> },
  { label: 'Settings', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

const PURPOSE_COLORS: Record<string, string> = {
  'Maintenance': 'text-blue-600',
  'Job Interview': 'text-primary',
  'Business Meeting': 'text-primary',
  'Delivery': 'text-blue-600',
  'Personal Visit': 'text-primary',
  'Vendor Meeting': 'text-primary',
  'Other': 'text-muted-foreground',
};

const AdminVisitorsPage: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvedQr, setApprovedQr] = useState<Visitor | null>(null);
  const { unreadCount } = useNotifications();

  const fetchVisitors = useCallback(async () => {
    const { data } = await supabase
      .from('visitors')
      .select('*, profiles:guard_id(name, company_name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const mapped = data.map((v: any) => ({
        ...v,
        guard_name: v.profiles?.name || 'Unknown Guard',
      }));
      setVisitors(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVisitors();
    const channel = supabase
      .channel('admin-visitors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => fetchVisitors())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchVisitors]);

  const handleDecision = async (visitor: Visitor, decision: 'approved' | 'rejected') => {
    setProcessingId(visitor.id);
    const { error } = await supabase
      .from('visitors')
      .update({ status: decision })
      .eq('id', visitor.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update visitor status', variant: 'destructive' });
      setProcessingId(null);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: visitor.guard_id,
      message: decision === 'approved'
        ? `✅ Visitor ${visitor.visitor_name} has been APPROVED – Allow Entry`
        : `❌ Visitor ${visitor.visitor_name} has been REJECTED`,
      type: `visitor_${decision}`,
      read: false,
    });

    toast({
      title: decision === 'approved' ? '✅ Visitor Approved' : '❌ Visitor Rejected',
      description: `${visitor.visitor_name} has been ${decision}`,
    });

    if (decision === 'approved') {
      setApprovedQr({ ...visitor, status: 'approved' });
    }
    setProcessingId(null);
  };

  const pending = visitors.filter(v => v.status === 'pending');
  const totalToday = visitors.filter(v => v.date === new Date().toISOString().split('T')[0]).length;

  return (
    <div className="mobile-container bg-background flex flex-col pb-24">
      {/* Header */}
      <header className="flex items-center bg-card px-4 py-3.5 border-b border-border">
        <button className="flex h-9 w-9 items-center justify-center text-primary mr-2">
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground px-1">GateFlow Admin</h1>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Visitors</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{visitors.length}</p>
            <p className="text-xs text-success font-medium mt-1">↑ Active today: {totalToday}</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pending</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{pending.length}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">
              {pending.length > 0 ? 'Needs urgent action' : 'All clear'}
            </p>
          </div>
        </div>

        {/* Pending Requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">Pending Visitor Requests</h2>
            <button className="text-sm font-semibold text-primary">View All</button>
          </div>

          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse mb-3" />)
          ) : pending.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <CheckCircle className="h-10 w-10 text-success mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">All requests handled!</p>
              <p className="text-xs text-muted-foreground mt-1">No pending visitor requests</p>
            </div>
          ) : pending.map(visitor => (
            <div key={visitor.id} className="bg-card rounded-2xl border border-border shadow-sm mb-3 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {visitor.photo_url ? (
                    <img src={visitor.photo_url} alt={visitor.visitor_name} className="h-14 w-14 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <svg className="h-7 w-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p className="font-bold text-foreground">{visitor.visitor_name}</p>
                      <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {new Date(visitor.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {visitor.company}{' '}
                      <span className={`font-semibold ${PURPOSE_COLORS[visitor.purpose] || 'text-primary'}`}>| {visitor.purpose}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {visitor.guard_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{visitor.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleDecision(visitor, 'approved')}
                    disabled={processingId === visitor.id}
                    className="flex-1 h-11 rounded-xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {processingId === visitor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    APPROVE
                  </button>
                  <button
                    onClick={() => handleDecision(visitor, 'rejected')}
                    disabled={processingId === visitor.id}
                    className="flex-1 h-11 rounded-xl bg-red-50 text-destructive font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all border border-red-100"
                  >
                    {processingId === visitor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    REJECT
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Show approved/rejected below */}
          {visitors.filter(v => v.status !== 'pending').length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-bold text-foreground mb-3">Recent Decisions</h2>
              <div className="space-y-2">
                {visitors.filter(v => v.status !== 'pending').slice(0, 5).map(visitor => (
                  <div key={visitor.id} className="bg-card rounded-xl px-4 py-3 border border-border flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {visitor.photo_url ? (
                        <img src={visitor.photo_url} alt={visitor.visitor_name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{visitor.visitor_name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{visitor.visitor_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{visitor.company}</p>
                    </div>
                    <StatusBadge status={visitor.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {approvedQr && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5" onClick={() => setApprovedQr(null)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-[360px] text-center" onClick={e => e.stopPropagation()}>
            <div className="h-12 w-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Visitor Approved!</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{approvedQr.visitor_name} · {approvedQr.company}</p>
            <div className="bg-white p-4 rounded-2xl inline-block mb-4">
              <QRCodeSVG
                value={JSON.stringify({ id: approvedQr.id, name: approvedQr.visitor_name, company: approvedQr.company, time: new Date().toISOString(), status: 'approved' })}
                size={180}
                level="M"
              />
            </div>
            <p className="text-xs text-muted-foreground mb-4">Show this QR pass at the gate</p>
            <button onClick={() => setApprovedQr(null)} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
              Close
            </button>
          </div>
        </div>
      )}

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default AdminVisitorsPage;
