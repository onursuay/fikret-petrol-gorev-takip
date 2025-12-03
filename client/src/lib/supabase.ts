import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'general_manager' | 'supervisor' | 'shift_supervisor' | 'staff';
          department: 'yonetim' | 'istasyon' | 'muhasebe' | 'vardiya';
          supervisor_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'general_manager' | 'supervisor' | 'shift_supervisor' | 'staff';
          department: 'yonetim' | 'istasyon' | 'muhasebe' | 'vardiya';
          supervisor_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'general_manager' | 'supervisor' | 'shift_supervisor' | 'staff';
          department?: 'yonetim' | 'istasyon' | 'muhasebe' | 'vardiya';
          supervisor_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
          department: 'istasyon' | 'muhasebe' | 'vardiya';
          priority: 'low' | 'medium' | 'high';
          requires_photo: boolean;
          is_active: boolean;
        };
      };
      task_assignments: {
        Row: {
          id: string;
          task_id: string;
          assigned_to: string;
          assigned_by: string | null;
          forwarded_to: string | null;
          assigned_date: string;
          status: 'pending' | 'forwarded' | 'in_progress' | 'submitted' | 'rejected' | 'completed';
          result: 'olumlu' | 'olumsuz' | null;
          photo_url: string | null;
          attachments: Array<{
            id: string;
            name: string;
            url: string;
            type: string;
            size: number;
            uploadedAt: string;
            uploadedBy: string;
          }> | null;
          staff_notes: string | null;
          supervisor_notes: string | null;
          forwarded_at: string | null;
          submitted_at: string | null;
          completed_at: string | null;
        };
      };
      gm_comments: {
        Row: {
          id: string;
          assignment_id: string;
          user_id: string;
          comment: string;
          created_at: string;
        };
      };
    };
  };
};
