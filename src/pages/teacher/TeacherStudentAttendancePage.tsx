import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, X, Clock, LogOut, Loader2, Home, CalendarCheck, FileText, User, Users, UserCheck } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../hooks/use-toast';
import BottomNav from '../../components/BottomNav';

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  check_in?: string;
  checked_out_at?: string;
}

const NAV_ITEMS = [
  { label: 'Home', path: '/teacher', icon: <Home className="h-5 w-5" /> },
  { label: 'Students', path: '/teacher/students', icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance', path: '/teacher/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leave', path: '/teacher/leave', icon: <FileText className="h-5 w-5" /> },
  { label: 'Profile', path: '/teacher/profile', icon: <User className="h-5 w-5" /> },
];

const TeacherStudentAttendancePage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [orgTimings, setOrgTimings] = useState<{ start: string; end: string } | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const dateDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Fetch org timings
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

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Fetch students (employees) in same company
      const { data: studs } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('company_name', profile.company_name || '')
        .eq('is_active', true)
        .eq('role', 'employee');

      setStudents((studs as Student[]) || []);

      if (studs && studs.length > 0) {
        const ids = studs.map((s: Student) => s.id);
        const { data: att } = await supabase
          .from('attendance')
          .select('*')
          .in('employee_id', ids)
          .eq('date', today);

        const map: Record<string, AttendanceRecord> = {};
        (att || []).forEach((a: any) => { map[a.employee_id] = a; });
        setAttendance(map);
      }
    } finally {
      setLoading(false);
    }
  }, [profile, today]);

  useEffect(() => {
    if (!profile) return;
    fetchData();
    const channel = supabase
      .channel('teacher-student-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, fetchData]);

  const getAutoStatus = (): 'present' | 'late' => {
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startTime = orgTimings?.start || '09:00';
    return nowTime > startTime ? 'late' : 'present';
  };

  const sendAttendanceNotification = async (studentId: string, studentName: string, status: 'present' | 'absent' | 'late') => {
    const statusEmoji = status === 'present' ? '✅' : status === 'late' ? '⏰' : '❌';
    const teacherName = profile?.name || 'Teacher';
    const message = `${statusEmoji} Your attendance for today has been marked as "${status}" by ${teacherName}.`;

    await supabase.from('notifications').insert({
      user_id: studentId,
      message,
      type: 'attendance',
    });

    try {
      await supabase.functions.invoke('send-push', {
        body: {
          user_ids: [studentId],
          title: `Attendance: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          body: message,
          data: { type: 'attendance', status },
        },
      });
    } catch (e) {
      console.warn('[Push] Could not send push notification:', e);
    }
  };

  const markAttendance = async (student: Student, status: 'present' | 'absent' | 'late') => {
    if (!profile) return;
    setSavingFor(student.id);
    try {
      const existing = attendance[student.id];
      const now = new Date().toISOString();

      if (existing) {
        await supabase.from('attendance').update({
          status,
          guard_id: profile.id,
          check_in: existing.check_in || (status !== 'absent' ? now : undefined),
        } as any).eq('id', existing.id);
      } else {
        await supabase.from('attendance').insert({
          employee_id: student.id,
          guard_id: profile.id,
          date: today,
          status,
          check_in: status !== 'absent' ? now : undefined,
        } as any);
      }

      await sendAttendanceNotification(student.id, student.name, status);
      toast({ title: `✅ Marked ${status}`, description: `${student.name} marked as ${status}` });
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Failed to save attendance.', variant: 'destructive' });
    } finally {
      setSavingFor(student.id);
      setTimeout(() => setSavingFor(null), 100);
    }
  };

  const markCheckOut = async (record: AttendanceRecord, studentName: string) => {
    if (!record) return;
    setSavingFor(record.employee_id);
    try {
      await supabase.from('attendance').update({
        checked_out_at: new Date().toISOString(),
      } as any).eq('id', record.id);

      const teacherName = profile?.name || 'Teacher';
      await supabase.from('notifications').insert({
        user_id: record.employee_id,
        message: `👋 Your checkout time has been recorded by ${teacherName}.`,
        type: 'attendance',
      });

      toast({ title: '👋 Checked Out', description: `${studentName} checked out.` });
      fetchData();
    } finally {
      setSavingFor(null);
    }
  };

  const getStatusColor = (status?: string) => {
    if (status === 'present') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'late') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (status === 'absent') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-muted text-muted-foreground border-border';
  };

  const stats = {
    present: Object.values(attendance).filter(a => a.status === 'present').length,
    absent: Object.values(attendance).filter(a => a.status === 'absent').length,
    late: Object.values(attendance).filter(a => a.status === 'late').length,
    total: students.length,
  };

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 text-white" style={{ background: 'linear-gradient(135deg, hsl(213,57%,25%) 0%, hsl(217,91%,43%) 100%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/teacher')} className="bg-white/20 rounded-lg p-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Student Attendance</h1>
            <p className="text-blue-200 text-xs mt-0.5">{dateDisplay}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'bg-white/20' },
            { label: 'Present', value: stats.present, color: 'bg-green-500/30' },
            { label: 'Late', value: stats.late, color: 'bg-amber-500/30' },
            { label: 'Absent', value: stats.absent, color: 'bg-red-500/30' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-2 text-center`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-blue-100">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No students found</p>
            <p className="text-xs text-muted-foreground mt-1">Students will appear here once added by admin</p>
          </div>
        ) : (
          students.map(student => {
            const rec = attendance[student.id];
            const isSaving = savingFor === student.id;
            const isMarked = !!rec;
            const isAbsent = rec?.status === 'absent';
            const isCheckedOut = !!rec?.checked_out_at;

            return (
              <div key={student.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Student info row */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-base">{student.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  </div>
                  {rec && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusColor(rec.status)}`}>
                      {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                    </span>
                  )}
                </div>

                {/* Check-in / check-out times */}
                {rec && (
                  <div className="flex gap-3 px-4 pb-3">
                    {rec.check_in && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        In: {new Date(rec.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {rec.checked_out_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <LogOut className="h-3 w-3" />
                        Out: {new Date(rec.checked_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="border-t border-border px-4 py-3 flex gap-2">
                  {!isMarked ? (
                    <>
                      <button
                        onClick={() => markAttendance(student, getAutoStatus())}
                        disabled={isSaving}
                        className={`flex-[2] h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 ${getAutoStatus() === 'late' ? 'bg-amber-500' : 'bg-green-500'}`}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {getAutoStatus() === 'late' ? 'Mark Late' : 'Mark Present'}
                      </button>
                      <button
                        onClick={() => markAttendance(student, 'absent')}
                        disabled={isSaving}
                        className="flex-1 h-10 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Absent
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => markAttendance(student, rec.status === 'present' ? 'late' : 'present')}
                        disabled={isSaving || isAbsent}
                        className="flex-1 h-10 rounded-xl bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Update
                      </button>
                      {!isAbsent && !isCheckedOut && (
                        <button
                          onClick={() => markCheckOut(rec, student.name)}
                          disabled={isSaving}
                          className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                          Check Out
                        </button>
                      )}
                      {isCheckedOut && (
                        <div className="flex-1 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground font-semibold">✓ Checked Out</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default TeacherStudentAttendancePage;
