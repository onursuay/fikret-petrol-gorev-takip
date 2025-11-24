import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TaskAssignment {
  id: string;
  task_id: string;
  status: string;
  result: string | null;
  assigned_date: string;
  tasks: any;
}

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, signOut } = useAuthContext();
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user && user.role !== 'staff') {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          id,
          task_id,
          status,
          result,
          assigned_date,
          tasks (
            title,
            description
          )
        `)
        .eq('forwarded_to', user.id)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Görevler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setLocation('/');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      forwarded: { label: 'İletildi', variant: 'secondary' },
      in_progress: { label: 'Devam Ediyor', variant: 'default' },
      submitted: { label: 'Gönderildi', variant: 'outline' },
      rejected: { label: 'Reddedildi', variant: 'destructive' },
      completed: { label: 'Tamamlandı', variant: 'default' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return null;

    return result === 'olumlu' ? (
      <Badge className="bg-green-600 hover:bg-green-700">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Olumlu
      </Badge>
    ) : (
      <Badge className="bg-red-600 hover:bg-red-700">
        <XCircle className="w-3 h-3 mr-1" />
        Olumsuz
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <img src="/fikret-petrol-logo.png" alt="Fikret Petrol" className="h-16" />
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Henüz size atanmış görev bulunmuyor</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{assignment.tasks.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {assignment.tasks.description}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end ml-4">
                      {getStatusBadge(assignment.status)}
                      {getResultBadge(assignment.result)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Atanma Tarihi: {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}
                    </p>
                    <Link href={`/staff/task/${assignment.id}`}>
                      <Button size="sm">
                        {assignment.status === 'rejected' ? (
                          <>
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Düzelt
                          </>
                        ) : assignment.status === 'forwarded' ? (
                          'Görevi Tamamla'
                        ) : (
                          'Detay'
                        )}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
