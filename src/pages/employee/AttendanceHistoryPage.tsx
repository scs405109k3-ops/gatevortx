import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, User, FileText, Home } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Attendance } from '../../types/app';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import StatusBadge from '../../components/StatusBadge';

const NAV_ITEMS = [
  { label: 'Home', path: '/employee', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/employee/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/employee/leave', icon: <FileText className="h-5 w-5" /> },
  { label: 'Profile', path: '/employee/profile', icon: <User className="h-5 w-5" /> },
];

const AttendanceHistoryPage: React.FC = () => {
  const { profile, orgType } = useAuth();
  const memberLabel = (orgType === 'school' || orgType === 'college') ? 'Student' : 'Employee';
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchRecords = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const startDate = `${month}-01`;
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    setRecords((data as Attendance[]) || []);
    setLoading(false);
  }, [profile, month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const stats = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <div className="px-5 pt-12 pb-4 text-white" style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <h1 className="text-xl font-bold">Attendance History</h1>
        <p className="text-blue-200 text-xs mt-0.5">Your monthly {memberLabel.toLowerCase()} attendance record</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Month</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            max={new Date().toISOString().slice(0, 7)}
            className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Present', value: stats.present, color: 'bg-green-50 text-green-700' },
            { label: 'Absent', value: stats.absent, color: 'bg-red-50 text-red-700' },
            { label: 'Late', value: stats.late, color: 'bg-yellow-50 text-yellow-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-3 text-center ${s.color} border border-current/20`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : records.length === 0 ? (
          <div className="text-center py-10">
            <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No records for this month</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(record => (
              <div key={record.id} className="bg-card rounded-xl p-3 border border-border flex items-center justify-between animate-fade-in">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {record.check_in && (
                      <p className="text-xs text-muted-foreground">
                        In: <span className="font-medium text-foreground">
                          {new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    )}
                    {record.check_out && (
                      <p className="text-xs text-muted-foreground">
                        Out: <span className="font-medium text-foreground">
                          {new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    )}
                    {(record as any).checked_out_at && (
                      <p className="text-xs text-muted-foreground">
                        Left: <span className="font-medium text-foreground">
                          {new Date((record as any).checked_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    )}
                    {!record.check_in && <p className="text-xs text-muted-foreground">No check-in recorded</p>}
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

export default AttendanceHistoryPage;
