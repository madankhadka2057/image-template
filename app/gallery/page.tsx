'use client';

import { useEffect, useState } from 'react';
export const dynamic = 'force-dynamic';
import { useSession } from 'next-auth/react';
import { AlertCircle, Download, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function GalleryPage() {
  const { data: session } = useSession();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchImages = async () => {
    try {
      setError('');
      const response = await fetch('/api/images/user');
      if (!response.ok) throw new Error('Failed to fetch images');
      const data = await response.json();
      setImages(data);
    } catch (err) {
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete image');
      setImages(images.filter((img: any) => img._id !== id));
    } catch (err) {
      setError('Failed to delete image');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (imageUrl: string, title: string) => {
    // If it's a data URL, convert to blob and download
    if (imageUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${title}-${Date.now()}.png`;
      link.click();
    } else {
      // If it's a regular URL, open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Your Gallery</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your created overlay images
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="text-muted-foreground">Loading gallery...</p>
          </div>
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No images yet. Create one in the editor!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image: any) => (
            <Card key={image._id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square w-full bg-muted overflow-auto">
                <img
                  src={image.finalImageUrl || "/placeholder.svg"}
                  alt="Gallery item"
                  className="h-full w-full object-contain"
                />
              </div>
              <CardContent className="pt-4 space-y-2">
                <div className="text-sm">
                  <p className="font-semibold text-foreground">
                    {image.templateId?.title || 'Custom Image'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(image.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() =>
                      handleDownload(
                        image.finalImageUrl,
                        image.templateId?.title || 'image'
                      )
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(image._id)}
                    disabled={deleting === image._id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
