import React, { useEffect, useState, useCallback } from 'react';
import { Home, CalendarCheck, FileText, User, ChevronLeft, Clock } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import StatusBadge from '../../components/StatusBadge';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home', path: '/teacher', icon: <Home className="h-5 w-5" /> },
  { label: 'Attendance', path: '/teacher/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/teacher/leave', icon: <FileText className="h-5 w-5" /> },
  { label: 'Profile', path: '/teacher/profile', icon: <User className="h-5 w-5" /> },
];

interface AttendanceRow {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late';
}

const TeacherAttendanceHistoryPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgTimings, setOrgTimings] = useState<{ start: string; end: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('attendance')
      .select('id, date, check_in, check_out, status')
      .eq('employee_id', profile.id)
      .order('date', { ascending: false })
      .limit(50);
    setRecords((data as AttendanceRow[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const fetchTimings = async () => {
      if (!profile?.company_name) return;
      const { data } = await supabase
        .from('profiles')
        .select('work_start_time, work_end_time')
        .eq('role', 'admin')
        .eq('company_name', profile.company_name)
        .limit(1)
        .single();
      if (data) {
        setOrgTimings({
          start: (data as any).work_start_time?.slice(0, 5) || '09:00',
          end: (data as any).work_end_time?.slice(0, 5) || '17:00',
        });
      }
    };
    fetchTimings();
  }, [profile?.company_name]);

  const calcOvertime = (r: AttendanceRow) => {
    if (!r.check_in || !r.check_out || !orgTimings) return 0;
    const checkOut = new Date(r.check_out);
    const endRef = new Date(r.check_out);
    const [eh, em] = orgTimings.end.split(':').map(Number);
    endRef.setHours(eh, em, 0, 0);
    return checkOut > endRef ? (checkOut.getTime() - endRef.getTime()) / 3600000 : 0;
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <div className="px-5 pt-12 pb-5 text-white" style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/teacher')} className="bg-white/20 rounded-lg p-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Attendance History</h1>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No attendance records yet</p>
          </div>
        ) : (
          records.map(r => {
            const overtime = calcOvertime(r);
            return (
              <div key={r.id} className="bg-card rounded-2xl p-4 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-foreground">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {r.check_in && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> In: {new Date(r.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {r.check_out && (
                    <span className="flex items-center gap-1">
                      Out: {new Date(r.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {overtime > 0 && (
                  <div className="mt-2 text-xs font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full w-fit">
                    ⏱️ Overtime: {overtime.toFixed(1)}h
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default TeacherAttendanceHistoryPage;
