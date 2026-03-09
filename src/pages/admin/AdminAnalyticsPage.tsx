import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, UserCheck, UserX, Clock, Eye, TrendingUp, LayoutDashboard, BarChart3, CalendarCheck, FileText, Timer } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Visitors', path: '/admin/visitors', icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance', path: '/admin/attendance', icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Leaves', path: '/admin/leaves', icon: <FileText className="h-5 w-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
];

const COLORS = ['hsl(217,91%,43%)', 'hsl(142,71%,45%)', 'hsl(0,84%,60%)', 'hsl(38,92%,50%)'];

interface OvertimeEntry {
  name: string;
  role: string;
  totalOvertime: number;
}

const AdminAnalyticsPage: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    visitorsToday: 0,
    visitorsMonth: 0,
    totalEmployees: 0,
    present: 0,
    absent: 0,
    pendingLeaves: 0,
  });
  const [visitorBarData, setVisitorBarData] = useState<{ day: string; count: number }[]>([]);
  const [statusPieData, setStatusPieData] = useState<{ name: string; value: number }[]>([]);
  const [overtimeData, setOvertimeData] = useState<OvertimeEntry[]>([]);
  const [overtimePeriod, setOvertimePeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  const orgTimings = {
    end: (profile as any)?.work_end_time?.slice(0, 5) || '17:00',
  };

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [visitorsToday, visitorsMonth, employees, attendance, pendingLeaves, last7Days] = await Promise.all([
      supabase.from('visitors').select('id', { count: 'exact' }).eq('date', today),
      supabase.from('visitors').select('id', { count: 'exact' }).gte('date', monthStart),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'employee'),
      supabase.from('attendance').select('status').eq('date', today),
      supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('visitors').select('date').gte('date', new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0]),
    ]);

    const presentCount = (attendance.data || []).filter(a => a.status === 'present').length;
    const employeeCount = employees.count || 0;

    setStats({
      visitorsToday: visitorsToday.count || 0,
      visitorsMonth: visitorsMonth.count || 0,
      totalEmployees: employeeCount,
      present: presentCount,
      absent: employeeCount - presentCount,
      pendingLeaves: pendingLeaves.count || 0,
    });

    // Bar chart: visitors per day last 7 days
    const dayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      dayMap[d.toISOString().split('T')[0]] = 0;
    }
    (last7Days.data || []).forEach((v: any) => { if (dayMap[v.date] !== undefined) dayMap[v.date]++; });
    setVisitorBarData(
      Object.entries(dayMap).map(([date, count]) => ({
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      }))
    );

    setStatusPieData([
      { name: 'Present', value: presentCount },
      { name: 'Absent', value: Math.max(0, employeeCount - presentCount) },
    ]);

    setLoading(false);
  }, []);

  const fetchOvertimeData = useCallback(async () => {
    if (!profile?.company_name) return;

    const now = new Date();
    let startDate: string;
    if (overtimePeriod === 'week') {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      startDate = monday.toISOString().split('T')[0];
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    // Fetch all attendance records with check_in and check_out/checked_out_at
    const { data: records } = await supabase
      .from('attendance')
      .select('employee_id, check_in, check_out, checked_out_at')
      .gte('date', startDate);

    if (!records || records.length === 0) {
      setOvertimeData([]);
      return;
    }

    // Fetch profiles for names
    const empIds = [...new Set(records.map((r: any) => r.employee_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, role')
      .in('id', empIds);

    const profileMap: Record<string, { name: string; role: string }> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = { name: p.name, role: p.role }; });

    // Calculate overtime per employee
    const [eh, em] = orgTimings.end.split(':').map(Number);
    const overtimeMap: Record<string, number> = {};

    records.forEach((r: any) => {
      const checkOut = r.check_out || r.checked_out_at;
      if (!r.check_in || !checkOut) return;

      const checkOutDate = new Date(checkOut);
      const endRef = new Date(checkOutDate);
      endRef.setHours(eh, em, 0, 0);

      if (checkOutDate > endRef) {
        const ot = (checkOutDate.getTime() - endRef.getTime()) / 3600000;
        overtimeMap[r.employee_id] = (overtimeMap[r.employee_id] || 0) + ot;
      }
    });

    const result: OvertimeEntry[] = Object.entries(overtimeMap)
      .map(([id, totalOvertime]) => ({
        name: profileMap[id]?.name || 'Unknown',
        role: profileMap[id]?.role || 'employee',
        totalOvertime: Math.round(totalOvertime * 10) / 10,
      }))
      .filter(e => e.totalOvertime > 0)
      .sort((a, b) => b.totalOvertime - a.totalOvertime);

    setOvertimeData(result);
  }, [profile?.company_name, overtimePeriod, orgTimings.end]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchOvertimeData(); }, [fetchOvertimeData]);

  const statCards = [
    { label: 'Visitors Today', value: stats.visitorsToday, icon: Eye, colorClass: 'bg-blue-50 text-blue-600' },
    { label: 'Visitors (Month)', value: stats.visitorsMonth, icon: TrendingUp, colorClass: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, colorClass: 'bg-slate-50 text-slate-600' },
    { label: 'Present Today', value: stats.present, icon: UserCheck, colorClass: 'bg-green-50 text-green-600' },
    { label: 'Absent Today', value: stats.absent, icon: UserX, colorClass: 'bg-red-50 text-red-600' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: Clock, colorClass: 'bg-yellow-50 text-yellow-600' },
  ];

  const totalOvertimeHours = overtimeData.reduce((acc, e) => acc + e.totalOvertime, 0);

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <TopBar title="Analytics" subtitle="Admin" backPath="/admin" />

      <div className="px-5 py-5 space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <div className={`h-10 w-10 rounded-xl ${card.colorClass} flex items-center justify-center mb-2`}>
                  <Icon className="h-5 w-5" />
                </div>
                {loading ? (
                  <div className="h-8 w-12 bg-muted rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Visitors Bar Chart */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Visitors (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={visitorBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(215,16%,47%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215,16%,47%)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214,32%,91%)', fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(217,91%,43%)" radius={[6, 6, 0, 0]} name="Visitors" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Pie */}
        {stats.totalEmployees > 0 && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Employee Attendance Today</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusPieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Overtime Summary Report */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-foreground">Overtime Report</h3>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setOvertimePeriod('week')}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  overtimePeriod === 'week' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setOvertimePeriod('month')}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  overtimePeriod === 'month' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Total overtime summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 font-medium">Total Overtime ({overtimePeriod === 'week' ? 'This Week' : 'This Month'})</p>
              <p className="text-2xl font-bold text-amber-800">{totalOvertimeHours.toFixed(1)}h</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Timer className="h-5 w-5 text-amber-600" />
            </div>
          </div>

          {/* Overtime bar chart */}
          {overtimeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(120, overtimeData.length * 40)}>
                <BarChart data={overtimeData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215,16%,47%)' }} unit="h" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215,16%,47%)' }} width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214,32%,91%)', fontSize: 12 }}
                    formatter={(value: number) => [`${value}h`, 'Overtime']}
                  />
                  <Bar dataKey="totalOvertime" fill="hsl(38,92%,50%)" radius={[0, 6, 6, 0]} name="Overtime" />
                </BarChart>
              </ResponsiveContainer>

              {/* Detailed list */}
              <div className="mt-4 space-y-2">
                {overtimeData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-xs">{entry.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{entry.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{entry.role}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${entry.totalOvertime >= 10 ? 'text-destructive' : 'text-amber-600'}`}>
                      {entry.totalOvertime}h
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No overtime recorded {overtimePeriod === 'week' ? 'this week' : 'this month'}</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default AdminAnalyticsPage;
