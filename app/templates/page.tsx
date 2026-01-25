'use client';

import { useEffect, useState } from 'react';
export const dynamic = 'force-dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Edit2, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TemplateModal from '@/components/TemplateModal';
import Script from 'next/script';
import { useToast } from '@/hooks/use-toast';

export default function TemplatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  // Redirect if not admin
  useEffect(() => {
    if (session && (session.user as any).role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, router]);

  const fetchTemplates = async () => {
    try {
      setError('');
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');
      setTemplates(templates.filter((t: any) => t._id !== id));
      toast({
        title: "Deleted",
        description: "Template deleted successfully",
      });
    } catch (err) {
      setError('Failed to delete template');
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleOpenModal = (template?: any) => {
    setSelectedTemplate(template || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <>
      <Script
        src="https://widget.cloudinary.com/v2.0/global/all.js"
        type="text/javascript"
        strategy="afterInteractive"
      />

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Template Management</h1>
            <p className="mt-2 text-muted-foreground">
              Create and manage PNG templates for users
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
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
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No templates yet</p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template: any) => (
              <Card key={template._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square w-full bg-muted">
                  <img
                    src={template.imageUrl || "/placeholder.svg"}
                    alt={template.title}
                    className="h-full w-full object-contain"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => handleOpenModal(template)}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(template._id)}
                      disabled={deleting === template._id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleting === template._id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TemplateModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        template={selectedTemplate}
        onSuccess={fetchTemplates}
      />
    </>
  );
}
