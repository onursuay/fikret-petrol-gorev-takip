import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowLeft, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function GMUsers() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user) {
      fetchUsers();
    }
  }, [user, authLoading]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdatingUserId(userId);
      
      // Update local state immediately for better UX
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        )
      );

      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) {
        console.error('Supabase error:', error);
        // Revert local state on error
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId ? { ...u, is_active: currentStatus } : u
          )
        );
        throw error;
      }

      toast.success(currentStatus ? 'Kullanıcı pasif yapıldı' : 'Kullanıcı aktif yapıldı');
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('İşlem sırasında hata oluştu');
    } finally {
      setUpdatingUserId(null);
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
          <Link href="/gm/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div className="flex justify-between items-center mt-4">
            <h1 className="text-2xl font-bold text-foreground">Kullanıcı Yönetimi</h1>
            <Link href="/gm/users/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kullanıcı
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex justify-between items-center p-6">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{u.full_name}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{u.role}</Badge>
                    <Badge variant="secondary">{u.department}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={u.is_active ? 'default' : 'secondary'}>
                    {u.is_active ? 'Aktif' : 'Pasif'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={u.is_active}
                      disabled={updatingUserId === u.id}
                      onCheckedChange={() => toggleActive(u.id, u.is_active)}
                    />
                    {updatingUserId === u.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Link href={`/gm/users/${u.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Düzenle
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
