import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Users, ClipboardList, CheckCircle2, XCircle, Clock, Send, Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import "./dashboard.css";

export default function SupervisorDashboard() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, signOut } = useAuthContext();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, forwarded: 0, completed: 0, positive: 0, negative: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');


  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user && user.role !== 'supervisor' && user.role !== 'shift_supervisor') {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          tasks (
            title,
            description,
            department
          ),
          staff:users!task_assignments_forwarded_to_fkey (
            full_name,
            email
          )
        `)
        .eq('assigned_to', user.id)
        .order('assigned_date', { ascending: false });

      if (error) throw error;

      setAssignments(data || []);

      // Calculate stats
      const pending = data?.filter(a => a.status === 'pending').length || 0;
      const forwarded = data?.filter(a => a.status === 'forwarded' || a.status === 'in_progress').length || 0;
      const completed = data?.filter(a => a.status === 'completed').length || 0;
      const positive = data?.filter(a => a.result === 'olumlu').length || 0;
      const negative = data?.filter(a => a.result === 'olumsuz').length || 0;

      setStats({ pending, forwarded, completed, positive, negative });
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Bekliyor', variant: 'secondary' },
      forwarded: { label: 'İletildi', variant: 'outline' },
      in_progress: { label: 'Devam Ediyor', variant: 'default' },
      submitted: { label: 'Onay Bekliyor', variant: 'default' },
      rejected: { label: 'Reddedildi', variant: 'destructive' },
      completed: { label: 'Tamamlandı', variant: 'default' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFilteredAssignments = useCallback(() => {
    return assignments.filter(assignment => {
      // Personel adı veya görev adı araması
      const matchesSearch = searchTerm === '' || 
        assignment.staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.tasks?.title?.toLowerCase().includes(searchTerm.toLowerCase());

      // Tab filtresi
      let matchesTab = activeTab === 'all';
      if (activeTab === 'pending') {
        matchesTab = assignment.status === 'pending';
      } else if (activeTab === 'forwarded') {
        matchesTab = assignment.status === 'forwarded' || assignment.status === 'in_progress';
      } else if (activeTab === 'submitted') {
        matchesTab = assignment.status === 'submitted';
      } else if (activeTab === 'completed') {
        matchesTab = assignment.status === 'completed';
      }

      // Durum filtresi (dropdown)
      let matchesStatus = statusFilter === 'all';
      if (statusFilter === 'forwarded') {
        matchesStatus = assignment.status === 'forwarded' || assignment.status === 'in_progress';
      } else if (statusFilter !== 'all') {
        matchesStatus = assignment.status === statusFilter;
      }

      // Sonuç filtresi
      const matchesResult = resultFilter === 'all' || assignment.result === resultFilter;

      // Tarih filtresi
      const assignedDate = new Date(assignment.assigned_date);
      const matchesStartDate = !startDate || assignedDate >= new Date(startDate);
      const matchesEndDate = !endDate || assignedDate <= new Date(endDate);

      return matchesSearch && matchesTab && matchesStatus && matchesResult && matchesStartDate && matchesEndDate;
    });
  }, [assignments, searchTerm, activeTab, statusFilter, resultFilter, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setResultFilter('all');
    setStartDate('');
    setEndDate('');
    setActiveTab('all');
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
      <header className="border-b border-border bg-card sticky top-0 z-50 relative overflow-hidden">
        {/* Işık çubuğu animasyonu - sadece PC'de */}
        <div className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 -translate-y-1/2 w-64 h-[2px] bg-gradient-to-r from-transparent via-white/90 to-transparent blur-sm animate-light-sweep" />
          <div className="absolute top-1/2 -translate-y-1/2 w-48 h-[3px] bg-gradient-to-r from-transparent via-white/70 to-transparent blur-[2px] animate-light-sweep animation-delay-1000" />
        </div>
        <div className="container mx-auto px-4 py-3 relative z-10">
          <div className="flex justify-between items-center">
            <Link href="/">
              <img src="/fikret-petrol-logo.png" alt="Fikret Petrol" className="h-16 cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
            <div className="flex gap-2">
              <Link href="/supervisor/staff">
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Personel
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Bekleyen Kartı */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Bekleyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          {/* İletilen Kartı */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Send className="w-4 h-4" />
                İletilen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                {stats.forwarded}
              </div>
            </CardContent>
          </Card>

          {/* Tamamlanan Kartı */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Tamamlanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                {stats.completed}
              </div>
            </CardContent>
          </Card>

          {/* Olumlu/Olumsuz Kartı */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Sonuçlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <span className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="w-5 h-5" />
                  {stats.positive}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="w-5 h-5" />
                  {stats.negative}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab'lar - Genel Süreç, Bekleyen, Personelde, Onay Bekleyen, Tamamlanan */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          {/* Mobil: yatay scroll, Desktop: grid */}
          <div className="md:hidden overflow-x-auto">
            <TabsList className="inline-flex w-max gap-1 p-1">
              <TabsTrigger value="all" className="whitespace-nowrap px-4 text-xs">Genel Süreç</TabsTrigger>
              <TabsTrigger value="pending" className="whitespace-nowrap px-4 text-xs">Bekleyen</TabsTrigger>
              <TabsTrigger value="forwarded" className="whitespace-nowrap px-4 text-xs">Personelde</TabsTrigger>
              <TabsTrigger value="submitted" className="whitespace-nowrap px-4 text-xs">Onay Bekleyen</TabsTrigger>
              <TabsTrigger value="completed" className="whitespace-nowrap px-4 text-xs">Tamamlanan</TabsTrigger>
            </TabsList>
          </div>
          <TabsList className="hidden md:grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-sm">Genel Süreç</TabsTrigger>
            <TabsTrigger value="pending" className="text-sm">Bekleyen</TabsTrigger>
            <TabsTrigger value="forwarded" className="text-sm">Personelde</TabsTrigger>
            <TabsTrigger value="submitted" className="text-sm">Onay Bekleyen</TabsTrigger>
            <TabsTrigger value="completed" className="text-sm">Tamamlanan</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filtrele ve Ara Kartı */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>Filtrele ve Ara</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Filtre Satırı - Örnek 1 gibi */}
            <div className="hidden md:grid grid-cols-[1fr_140px_140px_120px_120px_40px_70px] gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tüm Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="pending">Bekleyen</SelectItem>
                  <SelectItem value="forwarded">İletilen</SelectItem>
                  <SelectItem value="submitted">Onay Bekleyen</SelectItem>
                  <SelectItem value="completed">Tamamlanan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tüm Sonuç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Sonuç</SelectItem>
                  <SelectItem value="olumlu">Olumlu</SelectItem>
                  <SelectItem value="olumsuz">Olumsuz</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[120px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[120px]"
              />

              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Filtreleri Temizle"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <span className="text-sm text-muted-foreground whitespace-nowrap text-right">
                {getFilteredAssignments().length} görev
              </span>
            </div>

            {/* Mobile Filtre Alanı */}
            <div className="md:hidden space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tüm Durumlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    <SelectItem value="pending">Bekleyen</SelectItem>
                    <SelectItem value="forwarded">İletilen</SelectItem>
                    <SelectItem value="submitted">Onay Bekleyen</SelectItem>
                    <SelectItem value="completed">Tamamlanan</SelectItem>
                  </SelectContent>
                </Select>

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

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="gg.aa.yyyy"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="gg.aa.yyyy"
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearFilters}
                  title="Filtreleri Temizle"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {getFilteredAssignments().length} görev
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Görev Listesi */}
        <div className="space-y-4">
          {getFilteredAssignments().map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{assignment.tasks?.title}</CardTitle>
                    <CardDescription>{assignment.tasks?.description}</CardDescription>
                    {assignment.staff && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Personel: {assignment.staff.full_name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end ml-4">
                    {getStatusBadge(assignment.status)}
                    {assignment.result && (
                      assignment.result === 'olumlu' ? (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Olumlu
                        </Badge>
                      ) : (
                        <Badge className="bg-red-600 hover:bg-red-700">
                          <XCircle className="w-3 h-3 mr-1" />
                          Olumsuz
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    <span>Atanma: {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}</span>
                    {assignment.completed_at && (
                      <span className="ml-4">Tamamlanma: {new Date(assignment.completed_at).toLocaleDateString('tr-TR')}</span>
                    )}
                    {assignment.forwarded_at && !assignment.completed_at && (
                      <span className="ml-4">İletilme: {new Date(assignment.forwarded_at).toLocaleDateString('tr-TR')}</span>
                    )}
                  </div>
                  {/* Aksiyon Butonları */}
                  <div className="flex gap-2">
                    {assignment.status === 'pending' && (
                      <Link href={`/supervisor/task/${assignment.id}/forward`}>
                        <Button size="sm">
                          <Send className="w-4 h-4 mr-2" />
                          Personele İlet
                        </Button>
                      </Link>
                    )}
                    {assignment.status === 'submitted' && (
                      <Link href={`/supervisor/task/${assignment.id}/review`}>
                        <Button size="sm">İncele</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {getFilteredAssignments().length === 0 && (
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
