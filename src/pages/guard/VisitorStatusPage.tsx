import React, { useEffect, useState } from 'react';
import { Users, Search, LogOut, Loader2, QrCode, X, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import StatusBadge from '../../components/StatusBadge';
import { Home, ClipboardList, UserCheck, User } from 'lucide-react';
import { toast } from '../../hooks/use-toast';

interface VisitorWithCheckout {
  id: string;
  visitor_name: string;
  phone: string;
  company: string;
  purpose: string;
  person_to_meet: string;
  photo_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  guard_id: string;
  created_at: string;
  date: string;
  checked_out_at?: string;
}

const NAV_ITEMS = [
  { label: 'Home', path: '/guard', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/guard/attendance', icon: <UserCheck className="h-5 w-5" /> },
  { label: 'Visitors', path: '/guard/visitors', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Add', path: '/guard/add-visitor', icon: <Users className="h-5 w-5" /> },
  { label: 'Profile', path: '/guard/profile', icon: <User className="h-5 w-5" /> },
];

const VisitorStatusPage: React.FC = () => {
  const { profile } = useAuth();
  const [visitors, setVisitors] = useState<VisitorWithCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [qrVisitor, setQrVisitor] = useState<VisitorWithCheckout | null>(null);

  const fetchVisitors = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('visitors')
      .select('*')
      .eq('guard_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setVisitors((data as VisitorWithCheckout[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!profile) return;
    fetchVisitors();

    const channel = supabase
      .channel('guard-all-visitors')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'visitors',
        filter: `guard_id=eq.${profile.id}`,
      }, (payload) => {
        const updated = payload.new as VisitorWithCheckout;
        // Auto-show QR when admin approves
        if (updated.status === 'approved') {
          setQrVisitor(updated);
          toast({ title: '✅ Visitor Approved!', description: `${updated.visitor_name} has been approved. Show QR pass.` });
        } else if (updated.status === 'rejected') {
          toast({ title: '❌ Visitor Rejected', description: `${updated.visitor_name} was rejected by admin.`, variant: 'destructive' });
        }
        fetchVisitors();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const markVisitorCheckout = async (visitorId: string, visitorName: string) => {
    setCheckingOut(visitorId);
    try {
      const { error } = await supabase
        .from('visitors')
        .update({ checked_out_at: new Date().toISOString() } as any)
        .eq('id', visitorId);
      if (error) throw error;
      setVisitors(prev =>
        prev.map(v => v.id === visitorId ? { ...v, checked_out_at: new Date().toISOString() } : v)
      );
      toast({ title: '👋 Visitor Left', description: `${visitorName} checked out successfully.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update checkout.', variant: 'destructive' });
    } finally {
      setCheckingOut(null);
    }
  };

  const filtered = visitors.filter(v => {
    const matchSearch = !search ||
      v.visitor_name.toLowerCase().includes(search.toLowerCase()) ||
      v.person_to_meet.toLowerCase().includes(search.toLowerCase()) ||
      v.company.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || v.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <div className="px-5 pt-12 pb-4 text-white" style={{ background: 'var(--gradient-brand)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/guard')} className="bg-white/20 rounded-lg p-2 active:scale-95 transition-all">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Visitor Log</h1>
            <p className="text-primary-foreground/70 text-xs mt-0.5">Track all visitors & departures</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search visitors or person to meet..."
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
              <div key={visitor.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-start gap-3 p-4">
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
                    <p className="text-xs text-muted-foreground truncate">🏢 {visitor.company}</p>
                    <p className="text-xs text-muted-foreground">📋 {visitor.purpose}</p>
                    <p className="text-xs font-medium text-primary truncate">👤 Meets: {visitor.person_to_meet}</p>

                    {/* Times row */}
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        🕐 In: {new Date(visitor.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {visitor.checked_out_at && (
                        <span className="text-xs text-success font-medium">
                          🚪 Out: {new Date(visitor.checked_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions for approved visitors */}
                {visitor.status === 'approved' && (
                  <div className="border-t border-border px-4 py-2.5 flex gap-2">
                    {/* Show QR Pass */}
                    <button
                      onClick={() => setQrVisitor(visitor)}
                      className="flex-1 h-9 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <QrCode className="h-4 w-4" />
                      Show QR Pass
                    </button>
                    {!visitor.checked_out_at && (
                      <button
                        onClick={() => markVisitorCheckout(visitor.id, visitor.visitor_name)}
                        disabled={checkingOut === visitor.id}
                        className="flex-1 h-9 rounded-xl bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {checkingOut === visitor.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <LogOut className="h-4 w-4" />
                        }
                        Mark Left
                      </button>
                    )}
                  </div>
                )}

                {visitor.checked_out_at && (
                  <div className="border-t border-border px-4 py-2.5 bg-success/5">
                    <p className="text-xs text-success font-semibold text-center">✓ Visitor has left the premises</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Pass Modal */}
      {qrVisitor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5" onClick={() => setQrVisitor(null)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-[340px] text-center relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setQrVisitor(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="h-12 w-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <QrCode className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Visitor Pass</h3>
            <p className="text-sm text-muted-foreground mt-0.5 mb-1">{qrVisitor.visitor_name}</p>
            <p className="text-xs text-primary font-medium mb-4">
              Meets: {qrVisitor.person_to_meet}
            </p>

            <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-sm">
              <QRCodeSVG
                value={JSON.stringify({
                  id: qrVisitor.id,
                  name: qrVisitor.visitor_name,
                  meets: qrVisitor.person_to_meet,
                  purpose: qrVisitor.purpose,
                  company: qrVisitor.company,
                  time: new Date().toISOString(),
                  status: 'approved',
                })}
                size={180}
                level="M"
              />
            </div>
            <p className="text-xs text-muted-foreground mb-2">📋 Purpose: {qrVisitor.purpose}</p>
            <p className="text-xs text-muted-foreground mb-4">🏢 From: {qrVisitor.company}</p>

            <button
              onClick={() => setQrVisitor(null)}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default VisitorStatusPage;
