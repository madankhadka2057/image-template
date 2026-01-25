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
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userImagePublicId, setUserImagePublicId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [cloudinaryReady, setCloudinaryReady] = useState(false);
  const { toast } = useToast();

  const handleUploadUserImage = async () => {
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
      setError('Cloudinary env vars are missing');
      return;
    }

    if (typeof window === 'undefined' || !cloudinaryReady || !window.cloudinary?.openUploadWidget) {
      setError('Cloudinary widget not loaded yet');
      return;
    }

    window.cloudinary.openUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        resourceType: 'image',
        folder: 'user-images',
        sources: ['local', 'camera'],
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
        multiple: false,
      },
      (error: any, result: any) => {
        if (!error && result && result.event === 'success') {
          setUserImage(result.info.secure_url);
          setUserImagePublicId(result.info.public_id);
          setError('');
        }
      }
    );
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
    if (!canvasRef.current) return;

    setDownloading(true);
    setError('');

    try {
      const canvas = canvasRef.current;
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Failed to create blob');

        const formData = new FormData();
        formData.append('file', blob);
        formData.append('templateId', template._id);
        if (userImagePublicId) {
          formData.append('userImagePublicId', userImagePublicId);
        }

        const response = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to save image');

        const data = await response.json();
        
        if (shouldDownload) {
          // Trigger browser download
          const url = data.finalImageUrl;
          const a = document.createElement('a');
          a.href = url;
          a.download = `overlay-${Date.now()}.png`;
          a.click();
          
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

        // Close editor
        onClose();
      }, 'image/png');
    } catch (err) {
      setError('Failed to save image');
      toast({
        title: "Error",
        description: "Failed to save image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Script
        src="https://widget.cloudinary.com/v2.0/global/all.js"
        type="text/javascript"
        strategy="afterInteractive"
        onLoad={() => setCloudinaryReady(true)}
        onError={() => setError('Failed to load Cloudinary widget')}
      />

      <Card className="space-y-4">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{template.title}</h3>
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

          <div className="flex gap-2">
            <Button
              onClick={handleUploadUserImage}
              variant="outline"
              className="flex-1 bg-transparent"
            >
              {userImage ? '✓ Image Selected' : 'Upload Your Photo'}
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

          {/* Canvas Preview */}
          <div className="border border-border rounded-lg overflow-auto bg-muted flex items-center justify-center" style={{ maxHeight: '500px' }}>
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={onClose}
            >
              Cancel
            </Button>
            <div className="flex flex-1 gap-2">
              <Button
                onClick={() => handleSave(false)}
                disabled={!userImage || isLoading || downloading}
                variant="secondary"
                className="flex-1"
              >
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Only
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={!userImage || isLoading || downloading}
                className="flex-1"
              >
                {downloading ? (
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
