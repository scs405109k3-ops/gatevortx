import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, XCircle, Users, Clock, Building2, Phone, UserCheck, Shield, Loader2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Visitor } from '../../types/app';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import { toast } from '../../hooks/use-toast';
import {
  LayoutDashboard,
  BarChart3,
  CalendarCheck,
  FileText,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Visitors', path: '/admin/visitors', icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance', path: '/admin/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leaves', path: '/admin/leaves', icon: <FileText className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

const AdminVisitorsPage: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvedQr, setApprovedQr] = useState<Visitor | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const fetchVisitors = useCallback(async () => {
    const { data } = await supabase
      .from('visitors')
      .select('*, profiles:guard_id(name)')
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

    // Notify the guard
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

  const filtered = visitors.filter(v => filter === 'all' || v.status === filter);

  return (
    <div className="mobile-container bg-background flex flex-col pb-24">
      <TopBar title="Visitor Approvals" subtitle="Admin" />

      <div className="px-5 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${visitors.filter(v => v.status === f).length})`}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No {filter} requests</p>
            </div>
          ) : filtered.map(visitor => (
            <div key={visitor.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-fade-in">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {visitor.photo_url ? (
                    <img src={visitor.photo_url} alt={visitor.visitor_name} className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-xl">{visitor.visitor_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-foreground">{visitor.visitor_name}</p>
                      <StatusBadge status={visitor.status} />
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />{visitor.company}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{visitor.phone}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />Meets: {visitor.person_to_meet}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{new Date(visitor.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" />Guard: {visitor.guard_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 bg-muted rounded-xl px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">Purpose</p>
                  <p className="text-sm text-foreground">{visitor.purpose}</p>
                </div>

                {visitor.status === 'pending' && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleDecision(visitor, 'rejected')}
                      disabled={processingId === visitor.id}
                      className="flex-1 h-11 rounded-xl border-2 border-destructive text-destructive font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {processingId === visitor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      REJECT
                    </button>
                    <button
                      onClick={() => handleDecision(visitor, 'approved')}
                      disabled={processingId === visitor.id}
                      className="flex-1 h-11 rounded-xl bg-success text-success-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {processingId === visitor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      APPROVE
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Modal */}
      {approvedQr && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5" onClick={() => setApprovedQr(null)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-[360px] text-center animate-fade-in" onClick={e => e.stopPropagation()}>
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
