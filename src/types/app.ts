// Shared app types (separate from auto-generated Supabase types)

export type AppRole = 'admin' | 'guard' | 'employee' | 'teacher';
export type VisitorStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  company_name?: string;
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
