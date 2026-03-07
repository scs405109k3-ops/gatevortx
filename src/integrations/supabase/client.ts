import { createClient } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'guard' | 'employee';
export type VisitorStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  avatar_url?: string;
  created_at?: string;
}

export interface Visitor {
  id: string;
  visitor_name: string;
  phone: string;
  company: string;
  purpose: string;
  person_to_meet: string;
  photo_url?: string;
  status: VisitorStatus;
  guard_id: string;
  guard_name?: string;
  created_at: string;
  date: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
