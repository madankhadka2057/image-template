import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import EditorTemplateClient from '@/components/EditorTemplateClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

export default async function EditorTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId: rawId } = await params;
  const templateId = decodeURIComponent(rawId || '');

  let template: any = null;
  let error = '';

  try {
    if (!templateId || templateId === 'undefined') {
      throw new Error('Invalid template id in URL');
    }

    const upstream = await fetch(
      `https://mdnkhadka.app.n8n.cloud/webhook/template?template_id=${encodeURIComponent(templateId)}`,
      { cache: 'no-store' }
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      throw new Error(text || 'Failed to fetch template');
    }

    const data = await upstream.json();
    template = data?.brand_template || data?.template || data;
    if (!template?.id) throw new Error('Template not found');
  } catch (e: any) {
    error = e?.message || 'Failed to load template';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/editor" className="text-primary hover:underline text-sm">
          ← Back to Templates
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !template ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading template...</p>
          </CardContent>
        </Card>
      ) : null}

      {template ? <EditorTemplateClient template={template} /> : null}
    </div>
  );
}
