import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import FileUpload, { UploadedFile, FileViewer } from '@/components/FileUpload';

interface TaskReviewProps {
  taskId: string;
}

export default function SupervisorTaskReview({ taskId }: TaskReviewProps) {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [staffAttachments, setStaffAttachments] = useState<UploadedFile[]>([]);
  const [supervisorAttachments, setSupervisorAttachments] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user) {
      fetchAssignment();
    }
  }, [user, authLoading, taskId]);

  const fetchAssignment = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          tasks(*),
          staff:users!task_assignments_forwarded_to_fkey(full_name, email)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      setAssignment(data);
      setSupervisorNotes(data.supervisor_notes || '');
      
      // Personelin yüklediği dosyaları al
      if (data.attachments && Array.isArray(data.attachments)) {
        // Personel dosyalarını ayır (uploadedBy ile)
        const staffFiles = data.attachments.filter((f: UploadedFile) => f.uploadedBy === data.forwarded_to);
        const supervisorFiles = data.attachments.filter((f: UploadedFile) => f.uploadedBy !== data.forwarded_to);
        setStaffAttachments(staffFiles);
        setSupervisorAttachments(supervisorFiles);
      } else if (data.photo_url) {
        // Eski yapıyla uyumluluk
        setStaffAttachments([{
          id: 'legacy_photo',
          name: 'Fotoğraf',
          url: data.photo_url,
          type: 'image/jpeg',
          size: 0,
          uploadedAt: data.submitted_at || new Date().toISOString(),
          uploadedBy: data.forwarded_to || '',
        }]);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      toast.error('Görev yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (result: 'olumlu' | 'olumsuz') => {
    setProcessing(true);

    try {
      // Tüm dosyaları birleştir
      const allAttachments = [...staffAttachments, ...supervisorAttachments];
      
      const { error } = await supabase
        .from('task_assignments')
        .update({
          status: 'completed',
          result: result,
          supervisor_notes: supervisorNotes,
          attachments: allAttachments,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success(`Görev ${result} olarak tamamlandı`);
      setLocation('/supervisor/dashboard');
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Görev tamamlanırken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!supervisorNotes.trim()) {
      toast.error('Reddetmek için not yazmalısınız');
      return;
    }

    setProcessing(true);

    try {
      // Tüm dosyaları birleştir
      const allAttachments = [...staffAttachments, ...supervisorAttachments];
      
      const { error } = await supabase
        .from('task_assignments')
        .update({
          status: 'rejected',
          supervisor_notes: supervisorNotes,
          attachments: allAttachments,
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Görev düzeltme için geri gönderildi');
      setLocation('/supervisor/dashboard');
    } catch (error) {
      console.error('Error rejecting task:', error);
      toast.error('İşlem sırasında hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const handleSupervisorFilesChange = (files: UploadedFile[]) => {
    setSupervisorAttachments(files);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Görev bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/supervisor/dashboard">
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
            <CardTitle>Görev İnceleme</CardTitle>
            <CardDescription>{assignment.tasks.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Görev Açıklaması:</p>
              <p className="text-sm text-muted-foreground">{assignment.tasks.description}</p>
            </div>

            {assignment.staff && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Personel:</p>
                <p className="text-sm text-muted-foreground">{assignment.staff.full_name}</p>
              </div>
            )}

            {/* Personelin Yüklediği Dosyalar */}
            {staffAttachments.length > 0 && (
              <div className="space-y-2">
                <Label>Personelin Yüklediği Dosyalar</Label>
                <FileViewer files={staffAttachments} />
              </div>
            )}

            {assignment.staff_notes && (
              <div className="space-y-2">
                <Label>Personel Notu</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{assignment.staff_notes}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="supervisorNotes">Amir Notu</Label>
              <Textarea
                id="supervisorNotes"
                placeholder="Notlarınızı yazın..."
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
                rows={4}
              />
            </div>

            {/* Amir Dosya Yükleme */}
            <div className="space-y-2">
              <Label>Dosya Ekle (Opsiyonel)</Label>
              <p className="text-xs text-muted-foreground">
                Fotoğraf, PDF, Excel, Word, PowerPoint dosyaları yükleyebilirsiniz
              </p>
              <FileUpload
                assignmentId={taskId}
                userId={user?.id || ''}
                existingFiles={supervisorAttachments}
                onFilesChange={handleSupervisorFilesChange}
                maxFiles={5}
                showCamera={true}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                onClick={handleReject}
                disabled={processing}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Reddet
              </Button>
              <Button
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => handleComplete('olumsuz')}
                disabled={processing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Olumsuz
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleComplete('olumlu')}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Olumlu
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
