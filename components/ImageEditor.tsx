'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

function isRemoteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function extractFirstJobUrl(jsonData: any): string | null {
  const direct = jsonData?.job?.urls?.[0];
  if (typeof direct === 'string' && direct.length > 0) return direct;

  if (Array.isArray(jsonData)) {
    const found = jsonData
      .map((item: any) => item?.job?.urls?.[0])
      .find((u: any) => typeof u === 'string' && u.length > 0);
    if (typeof found === 'string' && found.length > 0) return found;
  }

  const fallback =
    jsonData?.imageUrl ||
    jsonData?.image_url ||
    jsonData?.url ||
    jsonData?.resultUrl ||
    jsonData?.result_url;
  if (typeof fallback === 'string' && fallback.length > 0) return fallback;

  return null;
}

interface ImageEditorProps {
  template: any;
  onClose: () => void;
}
export default function ImageEditor({ template, onClose }: ImageEditorProps) {
  const [fields, setFields] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [savingToCloudinary, setSavingToCloudinary] = useState(false);
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (resultImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(resultImageUrl);
      }
    };
  }, [resultImageUrl]);

  useEffect(() => {
    const fetchFields = async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      setResultImageUrl(null);
      setCloudinaryUrl(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_CANVA_BASE_URL}/webhook/template-dataset?template_id=${template.id}`
        );
        if (!res.ok) throw new Error('Failed to fetch template fields');
        const data = await res.json();
        setFields(data.dataset);
      } catch (err: any) {
        setError(err.message || 'Failed to load fields');
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, [template]);

  const handleInputChange = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInputChange(key, file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!fields) {
      setError('Fields not loaded yet');
      return;
    }

    const missing = Object.keys(fields).filter((key) => {
      const value = form[key];
      if (value === undefined || value === null) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      return false;
    });

    if (missing.length > 0) {
      setError(`Please fill: ${missing.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('template_id', template.id);
      payload.append('templateId', template.id);
      payload.append('template_title', template.title || '');

      let hasAnyImage = false;

      for (const [key, config] of Object.entries(fields)) {
        const value = form[key];
        if ((config as any)?.type === 'image') {
          hasAnyImage = true;
          payload.append(key, value as File);
          payload.append(`${key}`, 'true');
        } else {
          payload.append(key, String(value));
        }
      }

      if (hasAnyImage) {
        payload.append('isImage', 'true');
      }

      const res = await fetch('/api/canva/create-template', {
        method: 'POST',
        body: payload,
      });

      const contentType = res.headers.get('content-type') || '';

      // If upstream ever returns a real image payload, handle it.
      if (contentType.startsWith('image/')) {
        if (!res.ok) throw new Error('Failed to submit data');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setResultImageUrl(url);
        setSuccess('Image created successfully.');
        return;
      }

      // Otherwise treat response as JSON (your webhook returns JSON with job.urls)
      let jsonData: any = null;
      try {
        jsonData = await res.json();
      } catch {
        jsonData = null;
      }

      if (!res.ok) {
        const message =
          jsonData?.error ||
          jsonData?.message ||
          'Failed to submit data';
        throw new Error(message);
      }

      console.log('Webhook response JSON:', jsonData);

      const urlFromJob = extractFirstJobUrl(jsonData);
      if (urlFromJob) {
        setResultImageUrl(urlFromJob);
        setSuccess('Image created successfully.');
        return;
      }

      const base64 = jsonData?.imageBase64 || jsonData?.image_base64;
      const mime = jsonData?.mimeType || jsonData?.mime_type || 'image/png';
      if (typeof base64 === 'string' && base64.length > 0) {
        setResultImageUrl(`data:${mime};base64,${base64}`);
        setSuccess('Image created successfully.');
        return;
      }

      setSuccess('Submitted successfully, but no image URL returned.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImageUrl || downloading) return;

    setDownloading(true);
    try {
      const filename = `canva-export-${template?.id || Date.now()}.png`;

      // If already a blob/data url, the browser can download directly.
      if (resultImageUrl.startsWith('blob:') || resultImageUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = resultImageUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Remote URL: try fetching as blob then downloading.
      const resp = await fetch(resultImageUrl);
      if (!resp.ok) throw new Error('Failed to download image');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Some signed URLs can block fetch due to CORS; fallback to opening the image.
      window.open(resultImageUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveToCloudinary = async () => {
    if (!resultImageUrl || savingToCloudinary) return;

    setError('');
    setSuccess('');
    setSavingToCloudinary(true);

    try {
      // Save via server: uploads to Cloudinary AND inserts into MongoDB.
      // Prefer JSON for remote URLs; fall back to multipart for blob/data URLs.
      let res: Response;

      if (isRemoteUrl(resultImageUrl)) {
        res = await fetch('/api/images/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: resultImageUrl,
            templateId: template?.id,
            templateTitle: template?.title,
          }),
        });
      } else {
        const blob = await fetch(resultImageUrl).then((r) => r.blob());
        const fd = new FormData();
        fd.append('file', blob, `canva-export-${template?.id || Date.now()}.png`);
        fd.append('templateId', template?.id || '');
        fd.append('templateTitle', template?.title || '');

        res = await fetch('/api/images/save', {
          method: 'POST',
          body: fd,
        });
      }

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to save image');
      }

      const savedUrl = json?.url || json?.image?.finalImageUrl;
      if (typeof savedUrl === 'string' && savedUrl.length > 0) {
        setCloudinaryUrl(savedUrl);
        setSuccess('Saved to Cloudinary successfully.');
      } else {
        setSuccess('Saved, but no URL returned.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save to Cloudinary');
    } finally {
      setSavingToCloudinary(false);
    }
  };

  return (
    <Card className="shadow-lg border-2 max-w-3xl mx-auto">
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground">{template.title}</h3>
          <p className="text-sm text-muted-foreground">
            Fill the fields below to use this template (powered by Canva Autofill)
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {submitting && (
          <Alert>
            <AlertDescription>Please wait up to 25 seconds…</AlertDescription>
          </Alert>
        )}
        {cloudinaryUrl && (
          <Alert>
            <AlertDescription>
              Saved to Cloudinary:{' '}
              <a
                className="underline"
                href={cloudinaryUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open
              </a>
            </AlertDescription>
          </Alert>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading fields...
          </div>
        ) : resultImageUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <img
                src={resultImageUrl}
                alt="Generated result"
                className="w-full h-auto rounded-md object-contain"
              />
            </div>
            <div className="flex gap-2">
              <a
                href={resultImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button type="button" className="w-full" variant="secondary">
                  Open Image
                </Button>
              </a>
              <Button
                type="button"
                className="flex-1"
                variant="secondary"
                onClick={handleSaveToCloudinary}
                disabled={savingToCloudinary}
              >
                {savingToCloudinary ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                className="flex-1"
                variant="secondary"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
              <Button type="button" className="flex-1" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : fields ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Alert variant="destructive">
              <AlertDescription>
                Please use background removed PNG image for better results when uploading images.
              </AlertDescription>
            </Alert>
            {Object.entries(fields).map(([key, value]: any) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                {value.type === 'text' ? (
                  <Input
                    id={key}
                    value={form[key] || ''}
                    onChange={e => handleInputChange(key, e.target.value)}
                    required
                  />
                ) : value.type === 'image' ? (
                  <Input
                    id={key}
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileChange(key, e)}
                    required
                  />
                ) : null}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
