import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface StaffEditProps {
  staffId: string;
}

export default function SupervisorStaffEdit({ staffId }: StaffEditProps) {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user) {
      fetchStaff();
    }
  }, [user, authLoading, staffId]);

  const fetchStaff = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', staffId)
        .eq('department', user.department)
        .single();

      if (error) throw error;
      
      setStaff(data);
      setFullName(data.full_name);
      setEmail(data.email);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Personel bilgileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !staff) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          email: email,
        })
        .eq('id', staffId);

      if (error) throw error;

      toast.success('Personel bilgileri güncellendi');
      setLocation('/supervisor/staff');
    } catch (error) {
      console.error('Error updating staff:', error);
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

  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Personel bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/supervisor/staff">
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
            <CardTitle>Personel Düzenle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">İsim Soyisim</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
