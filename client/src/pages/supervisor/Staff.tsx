import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Edit, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function SupervisorStaff() {
  const [location, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user) {
      fetchStaff();
    }
  }, [user, authLoading, location]);

  // Realtime subscription for staff updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('staff-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `department=eq.${user.department},role=eq.staff`
        },
        (payload) => {
          console.log('Staff change detected:', payload);
          fetchStaff();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchStaff = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('department', user.department)
        .eq('role', 'staff')
        .order('full_name');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Personel listesi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
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
        <div className="container mx-auto px-4 py-4">
          <Link href="/supervisor/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div className="flex justify-between items-center mt-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Personel Yönetimi</h1>
              <p className="text-sm text-muted-foreground">Departman: {user?.department}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStaff()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {staff.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex justify-between items-center p-6">
                <div>
                  <h3 className="font-semibold text-lg">{member.full_name}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={member.is_active ? 'default' : 'secondary'}>
                    {member.is_active ? 'Aktif' : 'Pasif'}
                  </Badge>
                  <Link href={`/supervisor/staff/${member.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Düzenle
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          {staff.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">Bu departmanda personel bulunmuyor</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
