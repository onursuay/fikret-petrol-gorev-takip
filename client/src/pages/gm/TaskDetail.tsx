import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Send, Calendar, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import FileUpload, { UploadedFile, FileViewer } from '@/components/FileUpload';

interface TaskDetailProps {
  taskId: string;
}

export default function GMTaskDetail({ taskId }: TaskDetailProps) {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const [assignment, setAssignment] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [gmAttachments, setGmAttachments] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, taskId]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [assignmentRes, commentsRes] = await Promise.all([
        supabase
          .from('task_assignments')
          .select(`
            *,
            tasks(*),
            supervisor:users!task_assignments_assigned_to_fkey(full_name),
            staff:users!task_assignments_forwarded_to_fkey(full_name)
          `)
          .eq('id', taskId)
          .single(),
        supabase
          .from('gm_comments')
          .select('*, users(full_name)')
          .eq('assignment_id', taskId)
          .order('created_at', { ascending: false })
      ]);

      if (assignmentRes.error) throw assignmentRes.error;

      setAssignment(assignmentRes.data);
      setComments(commentsRes.data || []);
      
      // Dosyaları yükle
      const data = assignmentRes.data;
      if (data.attachments && Array.isArray(data.attachments)) {
        // GM dosyalarını ayır
        const otherFiles = data.attachments.filter((f: UploadedFile) => f.uploadedBy !== user?.id);
        const gmFiles = data.attachments.filter((f: UploadedFile) => f.uploadedBy === user?.id);
        setAttachments(otherFiles);
        setGmAttachments(gmFiles);
      } else if (data.photo_url) {
        // Eski yapıyla uyumluluk
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
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) {
      toast.error('Lütfen yorum yazın');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('gm_comments').insert({
        assignment_id: taskId,
        user_id: user.id,
        comment: newComment,
      });

      if (error) throw error;

      toast.success('Yorum eklendi');
      setNewComment('');
      fetchData();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Yorum eklenirken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGmFilesChange = async (files: UploadedFile[]) => {
    setGmAttachments(files);
    
    // Tüm dosyaları birleştir ve kaydet
    const allAttachments = [...attachments, ...files];
    
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({ attachments: allAttachments })
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving attachments:', error);
      toast.error('Dosya kaydedilirken hata oluştu');
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/gm/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{assignment.tasks.title}</CardTitle>
                <CardDescription className="mt-2">{assignment.tasks.description}</CardDescription>
              </div>
              {assignment.result && (
                <Badge className={assignment.result === 'olumlu' ? 'bg-green-600' : 'bg-red-600'}>
                  {assignment.result === 'olumlu' ? 'OLUMLU' : 'OLUMSUZ'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Birim:</p>
                <p className="font-medium">{assignment.tasks.department}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Durum:</p>
                <p className="font-medium">{assignment.status}</p>
              </div>
              {assignment.supervisor && (
                <div>
                  <p className="text-muted-foreground">Amir:</p>
                  <p className="font-medium">{assignment.supervisor.full_name}</p>
                </div>
              )}
              {assignment.staff && (
                <div>
                  <p className="text-muted-foreground">Personel:</p>
                  <p className="font-medium">{assignment.staff.full_name}</p>
                </div>
              )}
            </div>

            {/* Tarih Takip Bölümü */}
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Görev Zaman Çizelgesi
              </h3>
              <div className="space-y-3">
                {/* Atanma Tarihi */}
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Görev Atandı</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(assignment.assigned_date).toLocaleDateString('tr-TR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Personele İletilme */}
                {assignment.forwarded_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Personele İletildi</p>
                      <p className="text-xs text-cyan-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(assignment.forwarded_at).toLocaleString('tr-TR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Personel Tamamladı */}
                {assignment.submitted_at && (() => {
                  const assignedDate = new Date(assignment.assigned_date);
                  const submittedDate = new Date(assignment.submitted_at);
                  const isSameDay = assignedDate.toDateString() === submittedDate.toDateString();
                  const delayDays = Math.floor((submittedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${isSameDay ? 'bg-emerald-500' : delayDays > 0 ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Personel Tamamladı</p>
                          {isSameDay ? (
                            <Badge className="bg-emerald-500 text-xs py-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Aynı Gün
                            </Badge>
                          ) : delayDays > 0 ? (
                            <Badge className="bg-orange-500 text-xs py-0">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {delayDays} Gün Gecikme
                            </Badge>
                          ) : null}
                        </div>
                        <p className={`text-xs flex items-center gap-1 ${isSameDay ? 'text-emerald-400' : delayDays > 0 ? 'text-orange-400' : 'text-yellow-400'}`}>
                          <Clock className="w-3 h-3" />
                          {submittedDate.toLocaleString('tr-TR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Amir Onayladı */}
                {assignment.completed_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Amir Onayladı ({assignment.result === 'olumlu' ? 'Olumlu' : 'Olumsuz'})</p>
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(assignment.completed_at).toLocaleString('tr-TR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Henüz tamamlanmamış */}
                {!assignment.submitted_at && assignment.status !== 'completed' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5 animate-pulse"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Bekliyor...</p>
                      <p className="text-xs text-muted-foreground">Personel henüz görevi tamamlamadı</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Yüklenen Dosyalar */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Yüklenen Dosyalar</Label>
                <FileViewer files={attachments} />
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

            {assignment.supervisor_notes && (
              <div className="space-y-2">
                <Label>Amir Notu</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{assignment.supervisor_notes}</p>
                </div>
              </div>
            )}

            {/* GM Dosya Yükleme */}
            <div className="space-y-2">
              <Label>Dosya Ekle</Label>
              <p className="text-xs text-muted-foreground">
                Fotoğraf, PDF, Excel, Word, PowerPoint dosyaları yükleyebilirsiniz
              </p>
              <FileUpload
                assignmentId={taskId}
                userId={user?.id || ''}
                existingFiles={gmAttachments}
                onFilesChange={handleGmFilesChange}
                maxFiles={5}
                showCamera={true}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Genel Müdür Yorumları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium">{comment.users?.full_name || 'Genel Müdür'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newComment">Yeni Yorum</Label>
              <Textarea
                id="newComment"
                placeholder="Yorumunuzu yazın..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleAddComment}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ekleniyor...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Yorum Ekle
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
