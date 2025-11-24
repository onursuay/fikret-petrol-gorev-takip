import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
      if (data.photo_url) {
        setPhotoPreview(data.photo_url);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      toast.error('Görev yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user || !assignment) return;

    if (assignment.tasks.requires_photo && !photoFile && !assignment.photo_url) {
      toast.error('Lütfen fotoğraf yükleyin');
      return;
    }

    setSubmitting(true);

    try {
      let photoUrl = assignment.photo_url;

      // Upload photo if new file selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('task-photos')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('task-photos')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Update assignment
      const { error: updateError } = await supabase
        .from('task_assignments')
        .update({
          status: 'submitted',
          staff_notes: notes,
          photo_url: photoUrl,
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

            {assignment.tasks.requires_photo && (
              <div className="space-y-2">
                <Label>Fotoğraf {assignment.tasks.requires_photo && '*'}</Label>
                {photoPreview && (
                  <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={photoPreview}
                      alt="Task photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Fotoğraf Seç
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>
                )}
              </div>
            )}

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
