'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Download, AlertCircle, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Script from 'next/script';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    cloudinary: any;
  }
}

interface ImageEditorProps {
  template: any;
  onClose: () => void;
}

export default function ImageEditor({ template, onClose }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserImage(event.target?.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadUserImage = () => {
    fileInputRef.current?.click();
  };

  const mergeImages = async () => {
    if (!userImage) {
      setError('Please upload a user image first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D context not available');

      // Create image objects
      const userImg = new Image();
      const templateImg = new Image();

      userImg.crossOrigin = 'anonymous';
      templateImg.crossOrigin = 'anonymous';

      userImg.onload = () => {
        templateImg.onload = () => {
          // Set canvas size to template dimensions
          canvas.width = templateImg.width;
          canvas.height = templateImg.height;

          // Draw user image first (bottom layer)
          const userAspect = userImg.width / userImg.height;
          const canvasAspect = canvas.width / canvas.height;

          let drawWidth, drawHeight, drawX, drawY;

          if (userAspect > canvasAspect) {
            drawHeight = canvas.height;
            drawWidth = canvas.height * userAspect;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
          } else {
            drawWidth = canvas.width;
            drawHeight = canvas.width / userAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
          }

          ctx.drawImage(userImg, drawX, drawY, drawWidth, drawHeight);

          // Draw template on top (top layer with transparency)
          ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

          setIsLoading(false);
        };

        templateImg.src = template.imageUrl;
      };

      userImg.onerror = () => {
        setError('Failed to load user image');
        setIsLoading(false);
      };

      templateImg.onerror = () => {
        setError('Failed to load template image');
        setIsLoading(false);
      };

      userImg.src = userImage;
    } catch (err) {
      setError('Failed to merge images');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userImage) {
      mergeImages();
    }
  }, [userImage, template]);

  const handleSave = async (shouldDownload: boolean) => {
    if (!canvasRef.current || isSaving || isDownloading) return;

    if (shouldDownload) setIsDownloading(true);
    else setIsSaving(true);
    
    setError('');

    try {
      if (!userImageFile) throw new Error('No user image selected');

      // 1. Upload user image to Cloudinary first
      const userFormData = new FormData();
      userFormData.append('file', userImageFile);
      userFormData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
      userFormData.append('folder', 'user-images');

      const userUploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: userFormData,
        }
      );

      if (!userUploadResponse.ok) throw new Error('Failed to upload user photo');
      const userData = await userUploadResponse.json();
      const userImagePublicId = userData.public_id;

      // 2. Create blob of merged image
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob(resolve, 'image/png')
      );

      if (!blob) throw new Error('Failed to create merged image blob');

      // 3. Upload final merged image and save to DB
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('templateId', template._id);
      formData.append('userImagePublicId', userImagePublicId);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to save to gallery');

      const data = await response.json();
      
      if (shouldDownload) {
        const imageResponse = await fetch(data.finalImageUrl);
        const imageBlob = await imageResponse.blob();
        const url = window.URL.createObjectURL(imageBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `overlay-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success!",
          description: "Image saved to gallery and downloaded.",
        });
      } else {
        toast({
          title: "Saved!",
          description: "Image saved to your gallery.",
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save image');
      toast({
        title: "Error",
        description: err.message || "Failed to save image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsDownloading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <Card className="shadow-lg border-2">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">{template.title}</h3>
            <p className="text-sm text-muted-foreground">
              Upload your photo and it will be overlaid with this template
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleUploadUserImage}
              variant="outline"
              className="flex-1 bg-transparent hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {userImage ? '✓ Image Selected - Click to Change' : 'Upload Your Photo'}
            </Button>
            <Button
              onClick={mergeImages}
              disabled={!userImage || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                'Preview Merge'
              )}
            </Button>
          </div>

          <div className="border-2 border-border rounded-xl overflow-auto bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-inner" style={{ maxHeight: '500px' }}>
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="sm:w-auto w-full bg-transparent"
              onClick={onClose}
              disabled={isSaving || isDownloading}
            >
              Cancel
            </Button>
            <div className="flex flex-1 gap-3">
              <Button
                onClick={() => handleSave(false)}
                disabled={!userImage || isLoading || isSaving || isDownloading}
                variant="secondary"
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Only
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={!userImage || isLoading || isSaving || isDownloading}
                className="flex-1"
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
