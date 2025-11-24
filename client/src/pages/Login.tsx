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
      await signIn(email, password);
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
      {/* Animasyonlu Arka Plan Işıkları */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Işık 1 - Soldan sağa yavaş hareket */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl animate-[moveLight1_20s_ease-in-out_infinite]" />
        
        {/* Işık 2 - Sağdan sola yavaş hareket */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500/20 via-pink-500/10 to-transparent rounded-full blur-3xl animate-[moveLight2_25s_ease-in-out_infinite]" />
        
        {/* Işık 3 - Yukarıdan aşağıya yavaş hareket */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent rounded-full blur-3xl animate-[moveLight3_30s_ease-in-out_infinite]" />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-card/95 border-border/50">
        <CardHeader className="space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src="/fikret-petrol-logo.png" 
              alt="Fikret Petrol" 
              className="h-20 w-auto"
            />
          </div>
          <CardDescription className="text-center text-base">
            Görev Takip Sistemi
          </CardDescription>
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

      {/* CSS Animasyonları */}
      <style>{`
        @keyframes moveLight1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(30vw, 20vh) scale(1.2);
            opacity: 0.5;
          }
        }

        @keyframes moveLight2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-30vw, -20vh) scale(1.3);
            opacity: 0.5;
          }
        }

        @keyframes moveLight3 {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.2;
          }
          33% {
            transform: translate(-30%, -30%) scale(1.1);
            opacity: 0.4;
          }
          66% {
            transform: translate(-70%, -70%) scale(1.2);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
