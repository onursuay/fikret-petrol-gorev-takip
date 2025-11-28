import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Users, CheckCircle2, XCircle, Clock, Search, RotateCcw, FileSpreadsheet, Calendar, AlertTriangle, Upload, Download, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { NotificationBell } from '@/components/NotificationBell';
import { parseTasksFromExcel, getDelayBadge } from '@/utils/excelUtils';

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
  const [isExporting, setIsExporting] = useState(false);
  
  // Yeni state'ler
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedTasks, setParsedTasks] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Yeni görev form state'leri
  const [newTask, setNewTask] = useState({
    department: '',
    title: '',
    description: '',
    requires_photo: false
  });

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
  }).sort((a, b) => {
    // Sıralama: Yapılmamış görevler en üstte
    const priorityOrder: Record<string, number> = {
      'pending': 1,
      'forwarded': 1,
      'in_progress': 1,
      'rejected': 1,
      'submitted': 2,
      'completed': 3
    };
    const priorityA = priorityOrder[a.status] || 2;
    const priorityB = priorityOrder[b.status] || 2;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime();
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setResultFilter('all');
    setStartDate('');
    setEndDate('');
  };

  // Excel yükleme fonksiyonları
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setUploading(true);

    try {
      const tasks = await parseTasksFromExcel(file);
      setParsedTasks(tasks);
      toast.success(`${tasks.length} görev başarıyla parse edildi`);
    } catch (error: any) {
      if (Array.isArray(error)) {
        toast.error(`Hata: ${error.join(', ')}`);
      } else {
        toast.error('Excel dosyası okunamadı');
      }
      setUploadFile(null);
      setParsedTasks([]);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadConfirm = async () => {
    if (parsedTasks.length === 0) return;

    setUploading(true);

    try {
      // 1. Mevcut is_custom=false görevleri sil
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('is_custom', false);

      if (deleteError) throw deleteError;

      // 2. Yeni görevleri ekle
      const { error: insertError } = await supabase
        .from('tasks')
        .insert(parsedTasks);

      if (insertError) throw insertError;

      toast.success(`${parsedTasks.length} görev başarıyla yüklendi!`);
      setShowUploadModal(false);
      setUploadFile(null);
      setParsedTasks([]);
      fetchAssignments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Görevler yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  // Yeni görev ekleme fonksiyonları
  const handleNewTaskSubmit = async () => {
    if (!newTask.department || !newTask.title) {
      toast.error('Birim ve görev başlığı zorunludur');
      return;
    }

    setUploading(true);

    try {
      // 1. Task oluştur
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          department: newTask.department,
          frequency: 'once',
          requires_photo: newTask.requires_photo,
          is_custom: true,
          is_active: true
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // 2. İlgili supervisor'ları bul
      const { data: supervisors, error: supervisorError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('department', newTask.department)
        .in('role', ['supervisor', 'shift_supervisor']);

      if (supervisorError) throw supervisorError;

      if (!supervisors || supervisors.length === 0) {
        toast.error(`${newTask.department} biriminde yetkili bulunamadı`);
        return;
      }

      // 3. Her supervisor için assignment oluştur
      const today = new Date().toISOString().split('T')[0];
      const assignments = supervisors.map(supervisor => ({
        task_id: task.id,
        assigned_to: supervisor.id,
        assigned_date: today,
        status: 'pending'
      }));

      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .insert(assignments);

      if (assignmentError) throw assignmentError;

      // 4. Bildirimleri oluştur
      const notifications = supervisors.map(supervisor => ({
        user_id: supervisor.id,
        title: 'Yeni Anlık Görev',
        message: `${newTask.title} - ${newTask.description || 'Açıklama yok'}`,
        is_read: false
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      toast.success('Anlık görev başarıyla oluşturuldu!');
      setShowNewTaskModal(false);
      setNewTask({
        department: '',
        title: '',
        description: '',
        requires_photo: false
      });
      fetchAssignments();
    } catch (error) {
      console.error('New task error:', error);
      toast.error('Görev oluşturulurken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const exportToExcel = () => {
    if (!filteredAssignments.length) {
      toast.info('Aktarılacak görev bulunamadı');
      return;
    }

    setIsExporting(true);
    try {
      const formatDateTime = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const data = filteredAssignments.map(assignment => {
        // Gecikme hesaplama
        const assignedDate = new Date(assignment.assigned_date);
        const submittedDate = assignment.submitted_at ? new Date(assignment.submitted_at) : null;
        const isSameDay = submittedDate 
          ? assignedDate.toDateString() === submittedDate.toDateString()
          : false;
        const delayDays = submittedDate 
          ? Math.floor((submittedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        let gecikmeStatus = '-';
        if (submittedDate) {
          if (isSameDay) {
            gecikmeStatus = 'AYNI GÜN ✓';
          } else if (delayDays && delayDays > 0) {
            gecikmeStatus = `${delayDays} GÜN GECİKME`;
          } else {
            gecikmeStatus = 'ZAMANINDA';
          }
        } else if (assignment.status !== 'completed') {
          gecikmeStatus = 'BEKLİYOR';
        }

        return {
          'Görev': assignment.tasks.title,
          'Birim': assignment.tasks.department,
          'Personel': assignment.staff?.full_name ?? '-',
          'Amir': assignment.supervisor?.full_name ?? '-',
          'Durum': assignment.status,
          'Sonuç': assignment.result === 'olumlu' ? 'OLUMLU' : assignment.result === 'olumsuz' ? 'OLUMSUZ' : '—',
          'Atanma Tarihi': new Date(assignment.assigned_date).toLocaleDateString('tr-TR'),
          'Personele İletildi': formatDateTime(assignment.forwarded_at),
          'Personel Tamamladı': formatDateTime(assignment.submitted_at),
          'Amir Onayladı': formatDateTime(assignment.completed_at),
          'Gecikme Durumu': gecikmeStatus,
          'Personel Notu': assignment.staff_notes ?? '-',
          'Amir Notu': assignment.supervisor_notes ?? '-',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Kolon genişliklerini ayarla
      const colWidths = [
        { wch: 30 }, // Görev
        { wch: 12 }, // Birim
        { wch: 20 }, // Personel
        { wch: 20 }, // Amir
        { wch: 12 }, // Durum
        { wch: 10 }, // Sonuç
        { wch: 12 }, // Atanma Tarihi
        { wch: 18 }, // Personele İletildi
        { wch: 18 }, // Personel Tamamladı
        { wch: 18 }, // Amir Onayladı
        { wch: 18 }, // Gecikme Durumu
        { wch: 30 }, // Personel Notu
        { wch: 30 }, // Amir Notu
      ];
      worksheet['!cols'] = colWidths;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Görevler');
      const fileName = `gorev_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Excel raporu hazırlandı');
    } catch (error) {
      console.error('Excel export error', error);
      toast.error('Excel aktarımı sırasında hata oluştu');
    } finally {
      setIsExporting(false);
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
            <div className="flex gap-2 items-center flex-wrap">
              {/* Yeni özellik butonları */}
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Görev Listesi Yükle
              </Button>
              
              <Button 
                onClick={exportToExcel}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Rapor İndir
              </Button>
              
              <Button 
                onClick={() => setShowNewTaskModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Görev
              </Button>
              
              <NotificationBell userId={user?.id} />
              
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
              <CardTitle className="text-sm font-medium text-red-400/80">Olumsuz Sonuç</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400/80">{stats.negative}</div>
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
          <CardContent className="space-y-3">
            {/* Birim Tab'ları */}
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="w-full">
                {[
                  { value: 'all', label: 'Tümü' },
                  { value: 'istasyon', label: 'İstasyon' },
                  { value: 'muhasebe', label: 'Muhasebe' },
                  { value: 'vardiya', label: 'Vardiya' },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex-1 text-xs md:text-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Filtreleme Alanı - Desktop */}
            <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-2 items-center">
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
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="forwarded">İletildi</SelectItem>
                  <SelectItem value="submitted">Gönderildi</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                </SelectContent>
              </Select>

              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-[130px]">
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
                placeholder="gg.aa.yyyy"
                className="w-[130px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="gg.aa.yyyy"
                className="w-[130px]"
              />

              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Filtreleri Temizle"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                onClick={exportToExcel}
                className="bg-[#4CAF50] hover:bg-[#45a049] text-white"
                disabled={isExporting || !filteredAssignments.length}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel'e Aktar
                  </>
                )}
              </Button>

              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredAssignments.length} görev
              </span>
            </div>

            {/* Filtreleme Alanı - Mobile */}
            <div className="md:hidden space-y-3">
              {/* Arama */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Durum ve Sonuç - Yan yana */}
              <div className="grid grid-cols-2 gap-2">
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

              {/* Tarihler - Yan yana */}
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

              {/* Reset, Excel ve Görev Sayısı */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearFilters}
                  title="Filtreleri Temizle"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  onClick={exportToExcel}
                  className="bg-[#4CAF50] hover:bg-[#45a049] text-white flex-1"
                  disabled={isExporting || !filteredAssignments.length}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel'e Aktar
                    </>
                  )}
                </Button>

                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {filteredAssignments.length} görev
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            // Gecikme hesaplama
            const assignedDate = new Date(assignment.assigned_date);
            const submittedDate = assignment.submitted_at ? new Date(assignment.submitted_at) : null;
            const completedDate = assignment.completed_at ? new Date(assignment.completed_at) : null;
            
            // Aynı gün mü kontrolü (personelin görevi tamamladığı tarih)
            const isSameDay = submittedDate 
              ? assignedDate.toDateString() === submittedDate.toDateString()
              : false;
            
            // Kaç gün gecikmiş
            const delayDays = submittedDate 
              ? Math.floor((submittedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24))
              : null;
            
            // Tarih/saat formatı
            const formatDateTime = (date: string | null) => {
              if (!date) return null;
              return new Date(date).toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            };
            
            return (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{assignment.tasks.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{assignment.tasks.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
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
                      <Badge className="bg-red-400/80 hover:bg-red-500/80">
                        <XCircle className="w-3 h-3 mr-1" />
                        Olumsuz
                      </Badge>
                    )}
                    {/* Gecikme Göstergesi */}
                    {delayDays !== null && delayDays > 0 && (
                      <Badge className="bg-orange-500 hover:bg-orange-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {delayDays} gün gecikme
                      </Badge>
                    )}
                    {isSameDay && assignment.submitted_at && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Aynı gün
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tarih Bilgileri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Atandı: {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')}</span>
                  </div>
                  {assignment.forwarded_at && (
                    <div className="flex items-center gap-1 text-blue-400">
                      <Clock className="w-3 h-3" />
                      <span>İletildi: {formatDateTime(assignment.forwarded_at)}</span>
                    </div>
                  )}
                  {assignment.submitted_at && (
                    <div className={`flex items-center gap-1 ${isSameDay ? 'text-emerald-400' : delayDays && delayDays > 0 ? 'text-orange-400' : 'text-yellow-400'}`}>
                      <Clock className="w-3 h-3" />
                      <span>Yapıldı: {formatDateTime(assignment.submitted_at)}</span>
                    </div>
                  )}
                  {assignment.completed_at && (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Onaylandı: {formatDateTime(assignment.completed_at)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Link href={`/gm/task/${assignment.id}`}>
                    <Button size="sm">Detay</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )})}
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

      {/* Görev Listesi Yükleme Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>📤 Görev Listesi Yükle</DialogTitle>
            <DialogDescription>
              Excel dosyasından görev listesi yükleyin. Mevcut görevler (anlık görevler hariç) silinecektir.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
                disabled={uploading}
              />
              <label 
                htmlFor="excel-upload" 
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-12 h-12 text-gray-400" />
                <span className="text-sm font-medium">
                  {uploadFile ? uploadFile.name : 'Excel dosyası seçin (.xlsx)'}
                </span>
                <span className="text-xs text-gray-500">
                  Kolonlar: PERİYOT, BİRİM, GÖREV, AÇIKLAMA, BELGE
                </span>
              </label>
            </div>

            {parsedTasks.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-sm font-medium text-green-800">
                  ✓ {parsedTasks.length} görev başarıyla parse edildi
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {parsedTasks.filter(t => t.requires_photo).length} görev belge gerektiriyor
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowUploadModal(false);
                setUploadFile(null);
                setParsedTasks([]);
              }}
              disabled={uploading}
            >
              İptal
            </Button>
            <Button
              onClick={handleUploadConfirm}
              disabled={parsedTasks.length === 0 || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>Yükle ({parsedTasks.length} görev)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Görev (Anlık Görev) Modal */}
      <Dialog open={showNewTaskModal} onOpenChange={setShowNewTaskModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>➕ Yeni Anlık Görev</DialogTitle>
            <DialogDescription>
              Seçilen birime anlık görev oluşturun
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Birim *</Label>
              <Select 
                value={newTask.department} 
                onValueChange={(value) => setNewTask({...newTask, department: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Birim seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="istasyon">İstasyon</SelectItem>
                  <SelectItem value="muhasebe">Muhasebe</SelectItem>
                  <SelectItem value="vardiya">Vardiya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Görev Başlığı *</Label>
              <Input
                id="title"
                placeholder="Görev başlığını girin"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                placeholder="Görev açıklaması (opsiyonel)"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="requires_photo">Belge Zorunlu mu?</Label>
              <Switch
                id="requires_photo"
                checked={newTask.requires_photo}
                onCheckedChange={(checked) => setNewTask({...newTask, requires_photo: checked})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewTaskModal(false);
                setNewTask({
                  department: '',
                  title: '',
                  description: '',
                  requires_photo: false
                });
              }}
              disabled={uploading}
            >
              İptal
            </Button>
            <Button
              onClick={handleNewTaskSubmit}
              disabled={!newTask.department || !newTask.title || uploading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>Oluştur</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
