import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Users, ClipboardList, CheckCircle2, XCircle, Clock, Send, Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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

  const filterAssignments = (status: string | string[]) => {
    if (Array.isArray(status)) {
      return assignments.filter(a => status.includes(a.status));
    }
    return assignments.filter(a => a.status === status);
  };

  const getFilteredAssignments = () => {
    return assignments.filter(assignment => {
      // Personel adı araması
      const matchesSearch = searchTerm === '' || 
        assignment.staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.tasks?.title?.toLowerCase().includes(searchTerm.toLowerCase());

      // Durum filtresi
      const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;

      // Sonuç filtresi
      const matchesResult = resultFilter === 'all' || assignment.result === resultFilter;

      // Tarih filtresi
      const assignedDate = new Date(assignment.assigned_date);
      const matchesStartDate = !startDate || assignedDate >= new Date(startDate);
      const matchesEndDate = !endDate || assignedDate <= new Date(endDate);

      return matchesSearch && matchesStatus && matchesResult && matchesStartDate && matchesEndDate;
    });
  };

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
              <h1 className="text-2xl font-bold text-foreground">Görev Yönetimi</h1>
              <p className="text-sm text-muted-foreground">{user?.full_name} - {user?.department}</p>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">İletilen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.forwarded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlanan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Olumlu / Olumsuz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className="text-green-500">{stats.positive}</span> / <span className="text-red-500">{stats.negative}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Genel Süreç</TabsTrigger>
            <TabsTrigger value="pending">Bekleyen</TabsTrigger>
            <TabsTrigger value="forwarded">Personelde</TabsTrigger>
            <TabsTrigger value="submitted">Onay Bekleyen</TabsTrigger>
            <TabsTrigger value="completed">Tamamlanan</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* Filtreleme ve Arama Bölümü */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtreleme ve Arama
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Arama */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Personel / Görev Ara</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Personel adı veya görev başlığı..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Durum Filtresi */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Durum</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Durum seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="pending">Bekliyor</SelectItem>
                        <SelectItem value="forwarded">İletildi</SelectItem>
                        <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                        <SelectItem value="submitted">Onay Bekliyor</SelectItem>
                        <SelectItem value="rejected">Reddedildi</SelectItem>
                        <SelectItem value="completed">Tamamlandı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sonuç Filtresi */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sonuç</label>
                    <Select value={resultFilter} onValueChange={setResultFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sonuç seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="olumlu">Olumlu</SelectItem>
                        <SelectItem value="olumsuz">Olumsuz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Başlangıç Tarihi */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Başlangıç Tarihi</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  {/* Bitiş Tarihi */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bitiş Tarihi</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  {/* Temizle Butonu */}
                  <div className="space-y-2 flex items-end">
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Filtreleri Temizle
                    </Button>
                  </div>
                </div>

                {/* Sonuç Sayısı */}
                <div className="text-sm text-muted-foreground">
                  {getFilteredAssignments().length} görev bulundu
                </div>
              </CardContent>
            </Card>

            {/* Görev Listesi */}
            {getFilteredAssignments().map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{assignment.tasks.title}</CardTitle>
                      <CardDescription>{assignment.tasks.description}</CardDescription>
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
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Atanma: {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}</span>
                    {assignment.completed_at && (
                      <span>Tamamlanma: {new Date(assignment.completed_at).toLocaleDateString('tr-TR')}</span>
                    )}
                    {assignment.forwarded_at && !assignment.completed_at && (
                      <span>İletilme: {new Date(assignment.forwarded_at).toLocaleDateString('tr-TR')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {getFilteredAssignments().length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Hiç görev bulunmuyor</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {filterAssignments('pending').map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{assignment.tasks.title}</CardTitle>
                      <CardDescription>{assignment.tasks.description}</CardDescription>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}
                    </p>
                    <Link href={`/supervisor/task/${assignment.id}/forward`}>
                      <Button size="sm">
                        <Send className="w-4 h-4 mr-2" />
                        Personele İlet
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterAssignments('pending').length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Bekleyen görev bulunmuyor</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="forwarded" className="space-y-4">
            {filterAssignments(['forwarded', 'in_progress']).map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{assignment.tasks.title}</CardTitle>
                      <CardDescription>{assignment.tasks.description}</CardDescription>
                      {assignment.staff && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Personel: {assignment.staff.full_name}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    İletilme: {assignment.forwarded_at ? new Date(assignment.forwarded_at).toLocaleDateString('tr-TR') : '-'}
                  </p>
                </CardContent>
              </Card>
            ))}
            {filterAssignments(['forwarded', 'in_progress']).length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Personelde bekleyen görev yok</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="submitted" className="space-y-4">
            {filterAssignments('submitted').map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{assignment.tasks.title}</CardTitle>
                      <CardDescription>{assignment.tasks.description}</CardDescription>
                      {assignment.staff && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Personel: {assignment.staff.full_name}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Gönderilme: {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleDateString('tr-TR') : '-'}
                    </p>
                    <Link href={`/supervisor/task/${assignment.id}/review`}>
                      <Button size="sm">İncele</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterAssignments('submitted').length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Onay bekleyen görev yok</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {filterAssignments('completed').map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{assignment.tasks.title}</CardTitle>
                      <CardDescription>{assignment.tasks.description}</CardDescription>
                      {assignment.staff && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Personel: {assignment.staff.full_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end ml-4">
                      {getStatusBadge(assignment.status)}
                      {assignment.result === 'olumlu' ? (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Olumlu
                        </Badge>
                      ) : (
                        <Badge className="bg-red-600 hover:bg-red-700">
                          <XCircle className="w-3 h-3 mr-1" />
                          Olumsuz
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tamamlanma: {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString('tr-TR') : '-'}
                  </p>
                </CardContent>
              </Card>
            ))}
            {filterAssignments('completed').length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Tamamlanan görev yok</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
