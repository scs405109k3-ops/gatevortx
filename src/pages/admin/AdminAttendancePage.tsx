import React, { useEffect, useState, useCallback } from 'react';
import { Users, Search, UserCheck, UserX, LayoutDashboard, BarChart3, CalendarCheck, FileText, Shield, Clock } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Visitors', path: '/admin/visitors', icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance', path: '/admin/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leaves', path: '/admin/leaves', icon: <FileText className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

interface AttendanceWithEmployee {
  id: string;
  employee_id: string;
  guard_id?: string;
  employee_name?: string;
  guard_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  checked_out_at?: string;
  status: 'present' | 'absent' | 'late';
}

const AdminAttendancePage: React.FC = () => {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [orgTimings, setOrgTimings] = useState<{ start: string; end: string } | null>(null);

  // Fetch admin's org timings
  useEffect(() => {
    if (!profile) return;
    setOrgTimings({
      start: (profile as any)?.work_start_time?.slice(0, 5) || '09:00',
      end: (profile as any)?.work_end_time?.slice(0, 5) || '17:00',
    });
  }, [profile]);

  const fetchAttendance = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    // Collect all unique profile IDs (employees + guards)
    const profileIds = [...new Set([
      ...data.map((r: any) => r.employee_id),
      ...data.map((r: any) => r.guard_id).filter(Boolean),
    ])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, role')
      .in('id', profileIds);

    const profileMap: Record<string, { name: string; role: string }> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = { name: p.name, role: p.role }; });

    setRecords(data.map((r: any) => ({
      ...r,
      employee_name: profileMap[r.employee_id]?.name || 'Unknown',
      guard_name: r.guard_id ? (profileMap[r.guard_id]?.name || 'Unknown Guard') : undefined,
    })));
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchAttendance();
  }, [fetchAttendance]);

  const filtered = records.filter(r =>
    !search || (r.employee_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <TopBar title="Attendance" subtitle="Admin" backPath="/admin" />

      <div className="px-5 py-4 space-y-4">
        {/* Date Picker */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Present', value: stats.present, icon: UserCheck, color: 'bg-green-50 text-green-600' },
            { label: 'Absent', value: stats.absent, icon: UserX, color: 'bg-red-50 text-red-600' },
            { label: 'Late', value: stats.late, icon: Users, color: 'bg-yellow-50 text-yellow-600' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card rounded-2xl p-3 border border-border text-center">
                <div className={`h-8 w-8 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-1`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No attendance records</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => (
              <div key={record.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{record.employee_name?.charAt(0) || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{record.employee_name}</p>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {record.check_in && (
                        <p className="text-xs text-muted-foreground">
                          In: <span className="text-foreground font-medium">
                            {new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      )}
                      {record.check_out && (
                        <p className="text-xs text-muted-foreground">
                          Out: <span className="text-foreground font-medium">
                            {new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      )}
                      {record.checked_out_at && (
                        <p className="text-xs text-muted-foreground">
                          Left: <span className="text-foreground font-medium">
                            {new Date(record.checked_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      )}
                      {/* Overtime calculation */}
                      {record.check_in && (record.check_out || record.checked_out_at) && orgTimings && (() => {
                        const checkOut = new Date(record.check_out || record.checked_out_at!);
                        const endRef = new Date(checkOut);
                        const [eh, em] = orgTimings.end.split(':').map(Number);
                        endRef.setHours(eh, em, 0, 0);
                        const overtime = checkOut > endRef ? (checkOut.getTime() - endRef.getTime()) / 3600000 : 0;
                        return overtime > 0 ? (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" /> +{overtime.toFixed(1)}h OT
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {/* Guard info */}
                    {record.guard_name && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Marked by <span className="font-medium text-foreground">{record.guard_name}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={record.status} />
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

export default AdminAttendancePage;
