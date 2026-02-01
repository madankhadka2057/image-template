'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

export default function EditorPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setError('');
        const response = await fetch('/api/templates');
        if (!response.ok) throw new Error('Failed to fetch templates');
        const data = await response.json();
        setTemplates(data.items || data);
      } catch (err) {
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Overlay</h1>
        <p className="mt-2 text-muted-foreground">
          Select a template to open the editor
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template: any, index: number) => {
            const templateId =
              template?.id ?? template?._id ?? template?.template_id ?? template?.templateId;
            if (!templateId) return null;

            return (
            <Link
              key={`${String(templateId)}-${index}`}
              href={`/dashboard/editor/${encodeURIComponent(String(templateId))}`}
              className="group relative overflow-hidden rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="aspect-square w-full bg-linear-to-br from-muted to-muted/50">
                <img
                  src={template.thumbnail?.url || "/placeholder.svg"}
                  alt={template.title}
                  className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/70 via-black/30 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="w-full text-left transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-base font-bold text-white drop-shadow-lg">{template.title}</p>
                  <p className="text-xs text-gray-200 mt-1 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    Open editor
                  </p>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
