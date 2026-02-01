import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  bucket: 'banners' | 'server-banners' | 'ad-banners';
  userId: string;
  onUploadComplete: (url: string) => void;
  currentImageUrl?: string;
  maxSizeMB?: number;
  aspectRatio?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const ImageUpload = ({
  bucket,
  userId,
  onUploadComplete,
  currentImageUrl,
  maxSizeMB = 5,
  aspectRatio = '468x60'
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const storageBucket: ImageUploadProps['bucket'] = bucket === 'banners' ? 'ad-banners' : bucket;

  const getBucketLabel = () => {
    switch (bucket) {
      case 'banners':
        return 'Main Banner';
      case 'server-banners':
        return 'Server Banners';
      case 'ad-banners':
        return 'Advertisement Banners';
      default:
        return 'this area';
    }
  };

  const formatUploadError = (error: unknown): { title: string; description: string } => {
    const fallback = {
      title: 'Upload Failed',
      description: 'Failed to upload image. Please try again.',
    };

    if (!error) return fallback;

    const asRecord = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
    const rawMessage =
      error instanceof Error
        ? error.message
        : typeof asRecord?.message === 'string'
          ? asRecord.message
          : '';

    const message = rawMessage.trim();
    const messageLower = message.toLowerCase();

    const statusCode =
      typeof asRecord?.statusCode === 'number'
        ? asRecord.statusCode
        : typeof asRecord?.status === 'number'
          ? asRecord.status
          : undefined;

    if (!userId || statusCode === 401 || messageLower.includes('jwt') || messageLower.includes('not authenticated')) {
      return {
        title: 'Sign In Required',
        description: 'Please sign in to upload images.',
      };
    }

    if (
      statusCode === 403 ||
      messageLower.includes('row-level security') ||
      messageLower.includes('permission denied') ||
      messageLower.includes('not allowed')
    ) {
      return {
        title: 'Upload Not Allowed',
        description: `You don’t have permission to upload images for ${getBucketLabel()}. Please contact support if you believe this is a mistake.`,
      };
    }

    if (statusCode === 413 || messageLower.includes('payload too large') || messageLower.includes('too large')) {
      return {
        title: 'Upload Failed',
        description: `File too large. Maximum size is ${maxSizeMB}MB.`,
      };
    }

    if (!message) return fallback;

    if (messageLower.includes('row-level security') || messageLower.includes('storageapierror')) {
      return fallback;
    }

    return {
      title: 'Upload Failed',
      description: message,
    };
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images only.';
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size is ${maxSizeMB}MB.`;
    }
    
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!userId) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to upload images.',
        variant: 'destructive',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: 'Upload Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to storage
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(storageBucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(data.path);

      onUploadComplete(urlData.publicUrl);
      
      toast({
        title: 'Upload Complete',
        description: 'Your image has been uploaded successfully.',
      });

    } catch (error: unknown) {
      console.error('Upload error:', error);
      setPreview(currentImageUrl || null);
      const { title, description } = formatUploadError(error);
      toast({
        title,
        description,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadComplete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-w-md h-auto rounded-lg border border-border object-cover"
          />
          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Replace
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload an image
              </p>
              <p className="text-xs text-muted-foreground">
                Recommended: {aspectRatio} • Max {maxSizeMB}MB • JPG, PNG, GIF, WebP
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
