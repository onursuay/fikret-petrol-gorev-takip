import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

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

            {assignment.photo_url && (
              <div className="space-y-2">
                <Label>Fotoğraf</Label>
                <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                  <img src={assignment.photo_url} alt="Task" className="w-full h-full object-cover" />
                </div>
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
