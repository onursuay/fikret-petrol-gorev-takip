import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import FileUpload, { UploadedFile, FileViewer } from '@/components/FileUpload';
import { useIsMobile } from '@/hooks/useMobile';

interface TaskDetailProps {
  taskId: string;
}

export default function StaffTaskDetail({ taskId }: TaskDetailProps) {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const isMobile = useIsMobile();

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
          tasks (
            title,
            description,
            requires_photo
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      
      setAssignment(data);
      setNotes(data.staff_notes || '');
      // Mevcut dosyaları yükle
      if (data.attachments && Array.isArray(data.attachments)) {
        setAttachments(data.attachments);
      } else if (data.photo_url) {
        // Eski yapıyla uyumluluk - sadece photo_url varsa
        setAttachments([{
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

  const handleFilesChange = (files: UploadedFile[]) => {
    setAttachments(files);
  };

  const handleSubmit = async () => {
    if (!user || !assignment) return;

    // Fotoğraf zorunlu ise ve dosya yoksa uyar
    if (assignment.tasks.requires_photo && attachments.length === 0) {
      toast.error('Lütfen en az bir fotoğraf veya dosya yükleyin');
      return;
    }

    setSubmitting(true);

    try {
      // İlk resmi photo_url olarak kaydet (geriye uyumluluk)
      const firstImage = attachments.find(f => f.type.startsWith('image/'));
      const photoUrl = firstImage?.url || assignment.photo_url;

      // Update assignment
      const { error: updateError } = await supabase
        .from('task_assignments')
        .update({
          status: 'submitted',
          staff_notes: notes,
          photo_url: photoUrl,
          attachments: attachments,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      toast.success('Görev başarıyla gönderildi');
      setLocation('/staff/dashboard');
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error('Görev gönderilirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
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

  const canEdit = assignment.status === 'forwarded' || assignment.status === 'rejected';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/staff/dashboard">
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
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{assignment.tasks.title}</CardTitle>
                <CardDescription className="mt-2">
                  {assignment.tasks.description}
                </CardDescription>
              </div>
              <Badge variant={assignment.status === 'rejected' ? 'destructive' : 'default'}>
                {assignment.status === 'rejected' ? 'Reddedildi' : assignment.status === 'submitted' ? 'Gönderildi' : 'Devam Ediyor'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {assignment.status === 'rejected' && assignment.supervisor_notes && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm font-medium text-destructive mb-1">Amir Notu:</p>
                <p className="text-sm">{assignment.supervisor_notes}</p>
              </div>
            )}

            {/* Dosya Yükleme Alanı */}
            <div className="space-y-2">
              <Label>
                Dosyalar {assignment.tasks.requires_photo && <span className="text-destructive">*</span>}
              </Label>
              <p className="text-xs text-muted-foreground">
                Fotoğraf, PDF, Excel, Word, PowerPoint dosyaları yükleyebilirsiniz
              </p>
              {canEdit ? (
                <FileUpload
                  assignmentId={taskId}
                  userId={user?.id || ''}
                  existingFiles={attachments}
                  onFilesChange={handleFilesChange}
                  disabled={!canEdit}
                  maxFiles={5}
                  showCamera={isMobile}
                />
              ) : (
                <FileViewer files={attachments} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlarınız</Label>
              <Textarea
                id="notes"
                placeholder="Görev hakkında notlarınızı yazın..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={!canEdit}
              />
            </div>

            {canEdit && (
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  assignment.status === 'rejected' ? 'Düzelt ve Tekrar Gönder' : 'Gönder'
                )}
              </Button>
            )}

            {assignment.result && (
              <div className={`p-4 rounded-lg border ${
                assignment.result === 'olumlu' 
                  ? 'bg-green-500/10 border-green-500' 
                  : 'bg-red-500/10 border-red-500'
              }`}>
                <p className="font-medium">
                  Sonuç: {assignment.result === 'olumlu' ? 'Olumlu ✓' : 'Olumsuz ✗'}
                </p>
                {assignment.supervisor_notes && (
                  <p className="text-sm mt-2">Amir Notu: {assignment.supervisor_notes}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
