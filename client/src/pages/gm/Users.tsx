import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

export default function GMUsers() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

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
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(currentStatus ? 'Kullanıcı pasif yapıldı' : 'Kullanıcı aktif yapıldı');
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (deptFilter !== 'all' && u.department !== deptFilter) return false;
    return true;
  });

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
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Rol Filtresi</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Roller</SelectItem>
                    <SelectItem value="general_manager">Genel Müdür</SelectItem>
                    <SelectItem value="supervisor">Birim Amiri</SelectItem>
                    <SelectItem value="shift_supervisor">Vardiya Şefi</SelectItem>
                    <SelectItem value="staff">Personel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Departman Filtresi</label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Departmanlar</SelectItem>
                    <SelectItem value="yonetim">Yönetim</SelectItem>
                    <SelectItem value="istasyon">İstasyon</SelectItem>
                    <SelectItem value="muhasebe">Muhasebe</SelectItem>
                    <SelectItem value="vardiya">Vardiya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredUsers.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex justify-between items-center p-6">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{u.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{u.role}</Badge>
                    <Badge variant="secondary">{u.department}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={u.is_active ? 'default' : 'secondary'}>
                    {u.is_active ? 'Aktif' : 'Pasif'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(u.id, u.is_active)}
                  >
                    {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </Button>
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
