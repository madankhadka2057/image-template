'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import ImageEditor from '@/components/ImageEditor';

export default function EditorPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  useEffect(() => {
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

    fetchTemplates();
  }, []);

  if (selectedTemplate) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedTemplate(null)}
          className="text-primary hover:underline text-sm"
        >
          ← Back to Templates
        </button>
        <ImageEditor
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Overlay</h1>
        <p className="mt-2 text-muted-foreground">
          Select a template and upload your photo to create a beautiful overlay
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
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No templates available yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template: any) => (
            <button
              key={template._id}
              onClick={() => setSelectedTemplate(template)}
              className="group relative overflow-hidden rounded-lg border border-border hover:shadow-lg transition-all"
            >
              <div className="aspect-square w-full bg-muted">
                <img
                  src={template.imageUrl || "/placeholder.svg"}
                  alt={template.title}
                  className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-full text-left">
                  <p className="text-sm font-semibold text-white">{template.title}</p>
                  <p className="text-xs text-gray-200">Click to edit</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
