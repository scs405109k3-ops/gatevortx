import React, { useEffect, useState, useCallback } from 'react';
import { Users, Search, UserCheck, UserX, LayoutDashboard, BarChart3, CalendarCheck, FileText } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Attendance } from '../../types/app';
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
  employee_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'late';
}

const AdminAttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchAttendance = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles:employee_id(name)')
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });
    if (data) {
      setRecords(data.map((r: any) => ({ ...r, employee_name: r.profiles?.name || 'Unknown' })));
    }
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
    <div className="mobile-container bg-background flex flex-col pb-24">
      <TopBar title="Attendance" subtitle="Admin" />

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
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No attendance records</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => (
              <div key={record.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 animate-fade-in">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">{record.employee_name?.charAt(0) || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{record.employee_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
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
                  </div>
                </div>
                <StatusBadge status={record.status} />
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
