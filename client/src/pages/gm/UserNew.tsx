import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function GMUserNew() {
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'staff' as 'staff' | 'supervisor' | 'shift_supervisor',
    department: 'istasyon' as 'yonetim' | 'istasyon' | 'muhasebe' | 'vardiya',
  });

  const generatePassword = () => {
    const password = 'Sasmaz2025!';
    setFormData({ ...formData, password });
    toast.success('Şifre oluşturuldu');
  };

  const handleCreate = async () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setCreating(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: insertError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          department: formData.department,
          is_active: true,
        });

        if (insertError) throw insertError;
      }

      toast.success('Kullanıcı oluşturuldu');
      setLocation('/gm/users');
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Kullanıcı oluşturulurken hata oluştu');
    } finally {
      setCreating(false);
    }
  };

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
            <CardTitle>Yeni Kullanıcı Ekle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">İsim Soyisim *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Oluştur
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={formData.role} onValueChange={(v: any) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Personel</SelectItem>
                  <SelectItem value="supervisor">Birim Amiri</SelectItem>
                  <SelectItem value="shift_supervisor">Vardiya Şefi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departman *</Label>
              <Select value={formData.department} onValueChange={(v: any) => setFormData({ ...formData, department: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="istasyon">İstasyon</SelectItem>
                  <SelectItem value="muhasebe">Muhasebe</SelectItem>
                  <SelectItem value="vardiya">Vardiya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Kullanıcı Oluştur
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
