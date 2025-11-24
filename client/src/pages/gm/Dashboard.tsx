import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Users, CheckCircle2, XCircle, Clock, Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function GMDashboard() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, signOut } = useAuthContext();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user && user.role !== 'general_manager') {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          tasks(title, description, department),
          supervisor:users!task_assignments_assigned_to_fkey(full_name),
          staff:users!task_assignments_forwarded_to_fkey(full_name)
        `)
        .order('assigned_date', { ascending: false });

      if (error) throw error;

      setAssignments(data || []);

      const today = new Date().toISOString().split('T')[0];
      const todayAssignments = data?.filter(a => a.assigned_date === today) || [];
      const total = todayAssignments.length;
      const positive = data?.filter(a => a.result === 'olumlu').length || 0;
      const negative = data?.filter(a => a.result === 'olumsuz').length || 0;
      const pending = data?.filter(a => a.status === 'pending' || a.status === 'forwarded' || a.status === 'submitted').length || 0;

      setStats({ total, positive, negative, pending });
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

  const filteredAssignments = assignments.filter(assignment => {
    // Birim filtresi
    if (filter !== 'all' && assignment.tasks.department !== filter) return false;

    // Arama filtresi (görev başlığı veya personel adı)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const titleMatch = assignment.tasks.title?.toLowerCase().includes(searchLower);
      const staffMatch = assignment.staff?.full_name?.toLowerCase().includes(searchLower);
      if (!titleMatch && !staffMatch) return false;
    }

    // Durum filtresi
    if (statusFilter !== 'all' && assignment.status !== statusFilter) return false;

    // Sonuç filtresi
    if (resultFilter !== 'all' && assignment.result !== resultFilter) return false;

    // Tarih filtresi
    if (startDate && assignment.assigned_date < startDate) return false;
    if (endDate && assignment.assigned_date > endDate) return false;

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setResultFilter('all');
    setStartDate('');
    setEndDate('');
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
          <div className="flex justify-between items-center">
            <div>
              <img src="/fikret-petrol-logo.png" alt="Fikret Petrol" className="h-12" />
            </div>
            <div className="flex gap-2">
              <Link href="/gm/users">
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Kullanıcılar
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Görev (Bugün)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-500">Olumlu Sonuç</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.positive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-500">Olumsuz Sonuç</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.negative}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtrele ve Ara</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Birim Filtresi */}
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">Tümü</TabsTrigger>
                  <TabsTrigger value="istasyon">İstasyon</TabsTrigger>
                  <TabsTrigger value="muhasebe">Muhasebe</TabsTrigger>
                  <TabsTrigger value="vardiya">Vardiya</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Filtreleme ve Arama */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                {/* Arama */}
                <div className="lg:col-span-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Durum Filtresi */}
                <div className="lg:col-span-1">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm Durumlar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="pending">Bekliyor</SelectItem>
                      <SelectItem value="forwarded">İletildi</SelectItem>
                      <SelectItem value="submitted">Gönderildi</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="rejected">Reddedildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sonuç Filtresi */}
                <div className="lg:col-span-1">
                  <Select value={resultFilter} onValueChange={setResultFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm Sonuç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Sonuç</SelectItem>
                      <SelectItem value="olumlu">Olumlu</SelectItem>
                      <SelectItem value="olumsuz">Olumsuz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tarih Aralığı */}
                <div className="grid grid-cols-2 gap-2 lg:col-span-1">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Başlangıç"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Bitiş"
                  />
                </div>

                {/* Temizle Butonu */}
                <div className="lg:col-span-1 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={clearFilters}
                    title="Filtreleri Temizle"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredAssignments.length} görev
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{assignment.tasks.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{assignment.tasks.description}</p>
                    <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                      <span>Birim: {assignment.tasks.department}</span>
                      {assignment.supervisor && <span>• Amir: {assignment.supervisor.full_name}</span>}
                      {assignment.staff && <span>• Personel: {assignment.staff.full_name}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end ml-4">
                    <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                      {assignment.status}
                    </Badge>
                    {assignment.result === 'olumlu' && (
                      <Badge className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Olumlu
                      </Badge>
                    )}
                    {assignment.result === 'olumsuz' && (
                      <Badge className="bg-red-600 hover:bg-red-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Olumsuz
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}
                  </p>
                  <Link href={`/gm/task/${assignment.id}`}>
                    <Button size="sm">Detay</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredAssignments.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Görev bulunmuyor</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
