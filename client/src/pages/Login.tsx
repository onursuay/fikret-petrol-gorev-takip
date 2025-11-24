import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading, signIn } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      // Redirect based on role
      if (user.role === 'general_manager') {
        setLocation('/gm/dashboard');
      } else if (user.role === 'supervisor' || user.role === 'shift_supervisor') {
        setLocation('/supervisor/dashboard');
      } else if (user.role === 'staff') {
        setLocation('/staff/dashboard');
      } else {
        setLocation('/');
      }
    }
  }, [user, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await signIn(email, password, rememberMe);
      toast.success('Giriş başarılı!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Animasyonlu Arka Plan Işıkları - Teknolojik Beyaz Çizgiler */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Çizgi 1 */}
        <div className="absolute w-0.5 h-48 bg-gradient-to-b from-transparent via-white to-transparent opacity-70 shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-moveLine1" />
        
        {/* Çizgi 2 */}
        <div className="absolute w-0.5 h-40 bg-gradient-to-b from-transparent via-slate-200 to-transparent opacity-70 shadow-[0_0_10px_rgba(226,232,240,0.8)] animate-moveLine2" />
        
        {/* Çizgi 3 */}
        <div className="absolute w-0.5 h-44 bg-gradient-to-b from-transparent via-gray-100 to-transparent opacity-70 shadow-[0_0_10px_rgba(243,244,246,0.8)] animate-moveLine3" />
        
        {/* Çizgi 4 */}
        <div className="absolute w-0.5 h-36 bg-gradient-to-b from-transparent via-zinc-100 to-transparent opacity-70 shadow-[0_0_10px_rgba(244,244,245,0.8)] animate-moveLine4" />
        
        {/* Çizgi 5 - Ekstra teknolojik his */}
        <div className="absolute w-0.5 h-52 bg-gradient-to-b from-transparent via-white to-transparent opacity-60 shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-moveLine1" style={{animationDelay: '5s'}} />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-card/95 border-border/50">
        <CardHeader className="space-y-3 pb-4">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src="/fikret-petrol-logo.png" 
              alt="Fikret Petrol" 
              className="h-28 w-auto"
            />
          </div>
          {/* Modern Animasyonlu Başlık */}
          <h1 className="text-center text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-fadeInGlow">
            Fikret Petrol Görev Takip Sistemi
          </h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@fikretpetrol.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
              />
              <Label 
                htmlFor="rememberMe" 
                className="text-sm font-normal cursor-pointer select-none"
              >
                Beni Hatırla
              </Label>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>


    </div>
  );
}
