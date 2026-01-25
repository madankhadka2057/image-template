'use client';

import { useEffect, useState } from 'react';
export const dynamic = 'force-dynamic';
import { useSession } from 'next-auth/react';
import { AlertCircle, Download, Trash2, Eye, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function GalleryPage() {
  const { data: session } = useSession();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<any>(null);

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

  const handleDownload = async (imageUrl: string, title: string, id: string) => {
    if (downloadingImageId) return;
    
    setDownloadingImageId(id);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Optional: show error toast if available
    } finally {
      setDownloadingImageId(null);
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
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image: any) => (
              <Card key={image._id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
                <div className="relative aspect-square w-full bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                  <img
                    src={image.finalImageUrl || "/placeholder.svg"}
                    alt="Gallery item"
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="transform scale-90 group-hover:scale-100 transition-transform"
                      onClick={() => setViewImage(image)}
                    >
                      <Eye className="mr-2 h-5 w-5" />
                      View Full Size
                    </Button>
                  </div>
                </div>
                <CardContent className="pt-4 space-y-3">
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-foreground truncate">
                      {image.templateId?.title || 'Custom Image'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(image.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() =>
                        handleDownload(
                          image.finalImageUrl,
                          image.templateId?.title || 'image',
                          image._id
                        )
                      }
                      disabled={downloadingImageId === image._id}
                    >
                      {downloadingImageId === image._id ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(image._id)}
                      disabled={deleting === image._id}
                      className="hover:bg-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Image View Modal */}
          <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
            <DialogContent className="max-w-5xl w-full p-0 overflow-hidden">
              <div className="relative bg-black/95">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                  onClick={() => setViewImage(null)}
                >
                  <X className="h-6 w-6" />
                </Button>
                {viewImage && (
                  <div className="flex flex-col">
                    <div className="relative w-full" style={{ maxHeight: '80vh' }}>
                      <img
                        src={viewImage.finalImageUrl}
                        alt="Full size view"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="bg-card p-6 space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          {viewImage.templateId?.title || 'Custom Image'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Created on {new Date(viewImage.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1"
                          onClick={() =>
                            handleDownload(
                              viewImage.finalImageUrl,
                              viewImage.templateId?.title || 'image',
                              viewImage._id
                            )
                          }
                          disabled={downloadingImageId === viewImage._id}
                        >
                          {downloadingImageId === viewImage._id ? (
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Download Image
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            handleDelete(viewImage._id);
                            setViewImage(null);
                          }}
                          disabled={deleting === viewImage._id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
