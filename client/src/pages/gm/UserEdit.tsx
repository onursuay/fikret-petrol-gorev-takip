import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface UserEditProps {
  userId: string;
}

export default function GMUserEdit({ userId }: UserEditProps) {
  const [, setLocation] = useLocation();
  const { user: currentUser, loading: authLoading } = useAuthContext();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'staff' as 'general_manager' | 'supervisor' | 'shift_supervisor' | 'staff',
    department: 'istasyon' as 'yonetim' | 'istasyon' | 'muhasebe' | 'vardiya',
    isActive: true,
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      setLocation('/');
    } else if (currentUser) {
      fetchUser();
    }
  }, [currentUser, authLoading, userId]);

  const fetchUser = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUser(data);
      setFormData({
        fullName: data.full_name,
        email: data.email,
        role: data.role,
        department: data.department,
        isActive: data.is_active,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Kullanıcı yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          is_active: formData.isActive,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Kullanıcı güncellendi');
      setLocation('/gm/users');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Güncelleme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Kullanıcı bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/gm/users">
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
            <CardTitle>Kullanıcı Düzenle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">İsim Soyisim</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.role} onValueChange={(v: any) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general_manager">Genel Müdür</SelectItem>
                  <SelectItem value="supervisor">Birim Amiri</SelectItem>
                  <SelectItem value="shift_supervisor">Vardiya Şefi</SelectItem>
                  <SelectItem value="staff">Personel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departman</Label>
              <Select value={formData.department} onValueChange={(v: any) => setFormData({ ...formData, department: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yonetim">Yönetim</SelectItem>
                  <SelectItem value="istasyon">İstasyon</SelectItem>
                  <SelectItem value="muhasebe">Muhasebe</SelectItem>
                  <SelectItem value="vardiya">Vardiya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Kaydet
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
