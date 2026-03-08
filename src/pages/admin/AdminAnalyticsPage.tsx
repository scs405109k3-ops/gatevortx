import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, UserCheck, UserX, Clock, Eye, TrendingUp, LayoutDashboard, BarChart3, CalendarCheck, FileText } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
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

const AdminAnalyticsPage: React.FC = () => {
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
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = [
    { label: 'Visitors Today', value: stats.visitorsToday, icon: Eye, colorClass: 'bg-blue-50 text-blue-600' },
    { label: 'Visitors (Month)', value: stats.visitorsMonth, icon: TrendingUp, colorClass: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, colorClass: 'bg-slate-50 text-slate-600' },
    { label: 'Present Today', value: stats.present, icon: UserCheck, colorClass: 'bg-green-50 text-green-600' },
    { label: 'Absent Today', value: stats.absent, icon: UserX, colorClass: 'bg-red-50 text-red-600' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: Clock, colorClass: 'bg-yellow-50 text-yellow-600' },
  ];

  return (
    <div className="mobile-container bg-background flex flex-col pb-24 md:pb-8">
      <TopBar title="Analytics" subtitle="Admin" />

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
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  );
};

export default AdminAnalyticsPage;
