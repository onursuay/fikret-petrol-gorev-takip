import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

interface TaskForwardProps {
  taskId: string;
}

export default function SupervisorTaskForward({ taskId }: TaskForwardProps) {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const [assignment, setAssignment] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, taskId]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [assignmentRes, staffRes] = await Promise.all([
        supabase
          .from('task_assignments')
          .select('*, tasks(*)')
          .eq('id', taskId)
          .single(),
        supabase
          .from('users')
          .select('*')
          .eq('department', user.department)
          .eq('role', 'staff')
          .eq('is_active', true)
          .order('full_name')
      ]);

      if (assignmentRes.error) throw assignmentRes.error;
      if (staffRes.error) throw staffRes.error;

      setAssignment(assignmentRes.data);
      setStaffList(staffRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async () => {
    if (!selectedStaff) {
      toast.error('Lütfen personel seçin');
      return;
    }

    setForwarding(true);

    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({
          status: 'forwarded',
          forwarded_to: selectedStaff,
          supervisor_notes: notes,
          forwarded_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Görev personele iletildi');
      setLocation('/supervisor/dashboard');
    } catch (error) {
      console.error('Error forwarding task:', error);
      toast.error('Görev iletilirken hata oluştu');
    } finally {
      setForwarding(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Görev bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/supervisor/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Görevi Personele İlet</CardTitle>
            <CardDescription>{assignment.tasks.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Görev Açıklaması:</p>
              <p className="text-sm text-muted-foreground">{assignment.tasks.description}</p>
            </div>

            <div className="space-y-2">
              <Label>Personel Seçin *</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name} ({staff.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Not (Opsiyonel)</Label>
              <Textarea
                id="notes"
                placeholder="Personel için notlarınızı yazın..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleForward}
              disabled={forwarding || !selectedStaff}
            >
              {forwarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İletiliyor...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Personele İlet
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
