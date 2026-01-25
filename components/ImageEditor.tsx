'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Download, AlertCircle, Save, Type } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Script from 'next/script';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [customText, setCustomText] = useState('');
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

          // Draw custom text if provided
          if (customText.trim()) {
            const fontSize = Math.floor(canvas.height * 0.05);
            ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            // Text shadow/stroke for readability
            ctx.strokeStyle = 'black';
            ctx.lineWidth = Math.max(2, fontSize / 15);
            ctx.strokeText(customText, canvas.width / 2, canvas.height - 20);
            
            ctx.fillStyle = 'white';
            ctx.fillText(customText, canvas.width / 2, canvas.height - 20);
          }

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
  }, [userImage, template, customText]);

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
      formData.append('customText', customText);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to save to gallery');

      const data = await response.json();
      
      if (shouldDownload) {
        // Use the blob directly to avoid extra network requests and potential CORS issues
        const url = window.URL.createObjectURL(blob);
        
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Your Photo</Label>
              <Button
                onClick={handleUploadUserImage}
                variant="outline"
                className="w-full bg-transparent hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {userImage ? '✓ Image Selected - Change' : 'Upload Your Photo'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-text">Custom Text (Optional)</Label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="custom-text"
                  placeholder="Enter text here..."
                  className="pl-9"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
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

          {/* Canvas Preview Area */}
          <div className={`preview-container ${userImage ? 'has-image' : ''} min-h-[400px] flex items-center justify-center bg-muted/30`}>
            <div className="preview-glow" />
            
            {!userImage ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Type className="h-12 w-12" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold">Ready for your photo</h4>
                  <p className="text-sm text-muted-foreground max-w-[250px]">
                    Upload a photo to see the merge preview with {template.title}
                  </p>
                </div>
                <Button 
                  onClick={handleUploadUserImage}
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                >
                  Choose Image
                </Button>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-medium text-muted-foreground">Merging styles...</p>
                    </div>
                  </div>
                )}
                <div className="transparency-grid rounded-lg shadow-2xl overflow-hidden ring-1 ring-border">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto block"
                  />
                </div>
              </div>
            )}
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
