'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';


declare global {
  interface Window {
    cloudinary: any;
  }
}

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any;
  onSuccess?: () => void;
}

export default function TemplateModal({
  open,
  onOpenChange,
  template,
  onSuccess,
}: TemplateModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState(template?.title || '');
  const [imageUrl, setImageUrl] = useState(template?.imageUrl || '');
  const [publicId, setPublicId] = useState(template?.publicId || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cloudinaryReady, setCloudinaryReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.cloudinary) {
      setCloudinaryReady(true);
    } else {
      // Poll for cloudinary if script is loaded by parent
      const interval = setInterval(() => {
        if (typeof window !== 'undefined' && window.cloudinary) {
          setCloudinaryReady(true);
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  const { toast } = useToast();

  const handleCloudinaryUpload = async () => {
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
      setError('Cloudinary env vars are missing');
      return;
    }

    if (typeof window === 'undefined' || !cloudinaryReady || !window.cloudinary?.openUploadWidget) {
      setError('Cloudinary widget not loaded yet');
      return;
    }

    setUploading(true);

    window.cloudinary.openUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        resourceType: 'image',
        folder: 'image-templates',
        sources: ['local', 'url'],
        tags: ['template'],
        multiple: false,
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
      },
      (error: any, result: any) => {
        setUploading(false);
        if (!error && result && result.event === 'success') {
          setImageUrl(result.info.secure_url);
          setPublicId(result.info.public_id);
        }
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!title || !imageUrl || !publicId) {
        setError('All fields are required');
        setIsLoading(false);
        return;
      }

      const method = template ? 'PUT' : 'POST';
      const url = template ? `/api/templates/${template._id}` : '/api/templates';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, imageUrl, publicId }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save template');
        toast({
          title: "Error",
          description: data.error || 'Failed to save template',
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Success!",
        description: template ? 'Template updated successfully' : 'Template created successfully',
      });

      setTitle('');
      setImageUrl('');
      setPublicId('');
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setTitle(template?.title || '');
      setImageUrl(template?.imageUrl || '');
      setPublicId(template?.publicId || '');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">


        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
          <DialogDescription>
            {template ? 'Update template details' : 'Add a new PNG template'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Template Title</Label>
            <Input
              id="title"
              placeholder="e.g., Vintage Frame"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Template Image</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleCloudinaryUpload}
              disabled={uploading || isLoading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : imageUrl ? (
                '✓ Image Uploaded - Click to Change'
              ) : (
                'Upload PNG Image'
              )}
            </Button>

            {imageUrl && (
              <div className="mt-2 rounded-lg border border-border p-2">
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt="Template preview"
                  className="h-32 w-full object-contain"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Public ID: {publicId}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !imageUrl || !title}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
