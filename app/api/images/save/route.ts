import { connectDB } from '@/lib/db';
import { GeneratedImage } from '@/lib/models/GeneratedImage';
import { requireAuth } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';

async function blobFromRemoteUrl(url: string) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error('Failed to fetch image for saving');
  }

  const contentType = resp.headers.get('content-type') || 'image/png';
  const arrayBuffer = await resp.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: contentType });

  return { blob, contentType };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof Response) return session;

    await connectDB();

    const contentType = request.headers.get('content-type') || '';

    let templateExternalId: string | null = null;
    let templateTitle: string | null = null;
    let imageUrl: string | null = null;
    let fileBlob: Blob | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      templateExternalId = (formData.get('templateId') as string) || null;
      templateTitle = (formData.get('templateTitle') as string) || null;
      imageUrl = (formData.get('imageUrl') as string) || null;
      fileBlob = (formData.get('file') as Blob) || null;
    } else {
      const body = (await request.json().catch(() => null)) as any;
      templateExternalId = body?.templateId || null;
      templateTitle = body?.templateTitle || null;
      imageUrl = body?.imageUrl || null;
    }

    if (!fileBlob && (!imageUrl || typeof imageUrl !== 'string')) {
      return NextResponse.json({ error: 'Missing imageUrl or file' }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      return NextResponse.json(
        {
          error:
            'Missing Cloudinary env vars (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)',
        },
        { status: 500 }
      );
    }

    // Prepare a blob to upload.
    let blobToUpload: Blob;
    let filename = `canva-export-${templateExternalId || Date.now()}.png`;

    if (fileBlob) {
      blobToUpload = fileBlob;
    } else {
      // Server-side fetch so we don't rely on Cloudinary being able to reach the URL.
      const { blob } = await blobFromRemoteUrl(imageUrl!);
      blobToUpload = blob;
    }

    const cloudinaryForm = new FormData();
    cloudinaryForm.append('upload_preset', uploadPreset);
    cloudinaryForm.append('folder', 'canva-exports');
    cloudinaryForm.append('file', blobToUpload, filename);

    if (templateExternalId || templateTitle) {
      cloudinaryForm.append(
        'context',
        `template_id=${templateExternalId || ''}|template_title=${templateTitle || ''}`
      );
    }

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryForm,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => '');
      console.error('Cloudinary upload failed:', errorText);
      return NextResponse.json({ error: 'Failed to upload image to Cloudinary' }, { status: 502 });
    }

    const uploadResult = (await uploadResponse.json().catch(() => null)) as any;
    const finalImageUrl = uploadResult?.secure_url || uploadResult?.url;
    const finalImagePublicId = uploadResult?.public_id;

    if (!finalImageUrl || !finalImagePublicId) {
      return NextResponse.json(
        { error: 'Cloudinary upload succeeded but returned no URL/public_id' },
        { status: 502 }
      );
    }

    const saved = await GeneratedImage.create({
      userId: (session.user as any).id,
      source: 'canva',
      finalImageUrl,
      finalImagePublicId,
      templateExternalId,
      templateTitle,
    });

    return NextResponse.json({ image: saved, url: finalImageUrl }, { status: 201 });
  } catch (error) {
    console.error('Save generated image error:', error);
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
  }
}
