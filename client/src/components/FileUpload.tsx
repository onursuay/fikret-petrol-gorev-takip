import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Upload, 
  Camera, 
  X, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Image as ImageIcon,
  Download,
  Loader2,
  Paperclip
} from 'lucide-react';

// Desteklenen dosya tipleri
const ACCEPTED_FILE_TYPES = {
  // Resimler
  'image/jpeg': { icon: ImageIcon, color: 'text-blue-400', label: 'JPG' },
  'image/png': { icon: ImageIcon, color: 'text-blue-400', label: 'PNG' },
  'image/gif': { icon: ImageIcon, color: 'text-blue-400', label: 'GIF' },
  'image/webp': { icon: ImageIcon, color: 'text-blue-400', label: 'WEBP' },
  // PDF
  'application/pdf': { icon: FileText, color: 'text-red-400', label: 'PDF' },
  // Excel
  'application/vnd.ms-excel': { icon: FileSpreadsheet, color: 'text-green-400', label: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-400', label: 'XLSX' },
  // Word
  'application/msword': { icon: FileText, color: 'text-blue-500', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-500', label: 'DOCX' },
  // PowerPoint
  'application/vnd.ms-powerpoint': { icon: File, color: 'text-orange-400', label: 'PPT' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: File, color: 'text-orange-400', label: 'PPTX' },
};

const ACCEPT_STRING = Object.keys(ACCEPTED_FILE_TYPES).join(',') + ',image/*';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

interface FileUploadProps {
  assignmentId: string;
  userId: string;
  existingFiles?: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  showCamera?: boolean;
  compact?: boolean;
}

export default function FileUpload({
  assignmentId,
  userId,
  existingFiles = [],
  onFilesChange,
  disabled = false,
  maxFiles = 5,
  showCamera = true,
  compact = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const getFileInfo = (mimeType: string) => {
    return ACCEPTED_FILE_TYPES[mimeType as keyof typeof ACCEPTED_FILE_TYPES] || {
      icon: File,
      color: 'text-gray-400',
      label: 'FILE'
    };
  };

  const isImageFile = (type: string) => type.startsWith('image/');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      toast.error(`En fazla ${maxFiles} dosya yükleyebilirsiniz`);
      return;
    }

    const filesToUpload = Array.from(selectedFiles).slice(0, remainingSlots);
    
    // Validate files
    for (const file of filesToUpload) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dosyası çok büyük (max 10MB)`);
        return;
      }
    }

    setUploading(true);

    try {
      const uploadedFiles: UploadedFile[] = [];

      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
        const fileName = `${assignmentId}/${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('task-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`${file.name} yüklenirken hata oluştu`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('task-photos')
          .getPublicUrl(fileName);

        const uploadedFile: UploadedFile = {
          id: fileName,
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
        };

        uploadedFiles.push(uploadedFile);
      }

      const newFiles = [...files, ...uploadedFiles];
      setFiles(newFiles);
      onFilesChange?.(newFiles);
      
      if (uploadedFiles.length > 0) {
        toast.success(`${uploadedFiles.length} dosya yüklendi`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      const { error } = await supabase.storage
        .from('task-photos')
        .remove([fileId]);

      if (error) {
        console.error('Delete error:', error);
      }

      const newFiles = files.filter(f => f.id !== fileId);
      setFiles(newFiles);
      onFilesChange?.(newFiles);
      toast.success('Dosya silindi');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Dosya silinirken hata oluştu');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDownload = (file: UploadedFile) => {
    window.open(file.url, '_blank');
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Compact Upload Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading || files.length >= maxFiles}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4 mr-2" />
            )}
            Dosya Ekle
          </Button>
          
          {showCamera && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || uploading || files.length >= maxFiles}
            >
              <Camera className="w-4 h-4 mr-2" />
              Fotoğraf Çek
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>

        {/* Compact File List */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => {
              const FileIcon = getFileInfo(file.type).icon;
              const iconColor = getFileInfo(file.type).color;
              
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs"
                >
                  <FileIcon className={`w-3 h-3 ${iconColor}`} />
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="text-muted-foreground hover:text-destructive ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 md:p-6 text-center transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              Dosya yüklemek için tıklayın veya sürükleyin
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Resim, PDF, Excel, Word, PowerPoint (Max 10MB)
            </p>
            <p className="text-xs text-muted-foreground">
              {files.length}/{maxFiles} dosya
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* Camera Button (Mobile) */}
      {showCamera && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || uploading || files.length >= maxFiles}
          >
            <Camera className="w-4 h-4 mr-2" />
            Fotoğraf Çek
          </Button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Yüklenen Dosyalar ({files.length})</p>
          <div className="grid gap-2">
            {files.map((file) => {
              const FileIcon = getFileInfo(file.type).icon;
              const iconColor = getFileInfo(file.type).color;
              const isImage = isImageFile(file.type);

              return (
                <Card key={file.id} className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Preview or Icon */}
                    {isImage ? (
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded bg-muted flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                        <FileIcon className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                    )}

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {getFileInfo(file.type).label}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(file)}
                        title="İndir/Görüntüle"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {!disabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveFile(file.id)}
                          title="Sil"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Dosyaları görüntülemek için ayrı bir komponent
export function FileViewer({ files }: { files: UploadedFile[] }) {
  const getFileInfo = (mimeType: string) => {
    return ACCEPTED_FILE_TYPES[mimeType as keyof typeof ACCEPTED_FILE_TYPES] || {
      icon: File,
      color: 'text-gray-400',
      label: 'FILE'
    };
  };

  const isImageFile = (type: string) => type.startsWith('image/');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Ekler ({files.length})</p>
      <div className="grid gap-2">
        {files.map((file) => {
          const FileIcon = getFileInfo(file.type).icon;
          const iconColor = getFileInfo(file.type).color;
          const isImage = isImageFile(file.type);

          return (
            <a
              key={file.id}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  {isImage ? (
                    <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <FileIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {getFileInfo(file.type).label}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}

