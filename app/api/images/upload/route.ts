import { connectDB } from '@/lib/db';
import { GeneratedImage } from '@/lib/models/GeneratedImage';
import { requireAuth } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof Response) return session;

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const templateId = formData.get('templateId') as string;
    const userImagePublicId = formData.get('userImagePublicId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!templateId || !userImagePublicId) {
      return NextResponse.json(
        { error: 'Missing required fields (templateId, userImagePublicId)' },
        { status: 400 }
      );
    }

    // Convert blob to buffer for upload
    const buffer = await file.arrayBuffer();
    const bytes = Buffer.from(buffer);

    // Upload to Cloudinary via fetch (Server-side)
    const cloudinaryFormData = new FormData();
    // We need to pass a Blob to formData.append, but in Node environment FormData from 'undici' (built-in in Next.js 15+) 
    // works slightly differently or we might need to recreate a Blob from buffer.
    // However, simplest way often is to just pass the file blob we got if it is compatible.
    // Let's try appending the 'file' blob directly first.
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    cloudinaryFormData.append('folder', 'final-overlays');

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Cloudinary upload failed:', errorText);
      throw new Error('Failed to upload image to Cloudinary');
    }

    const uploadResult = await uploadResponse.json();
    const finalImageUrl = uploadResult.secure_url;
    const finalImagePublicId = uploadResult.public_id;

    const generatedImage = await GeneratedImage.create({
      userId: (session.user as any).id,
      finalImageUrl,
      finalImagePublicId,
      templateId,
      userImagePublicId,
    });

    return NextResponse.json(generatedImage, { status: 201 });
  } catch (error) {
    console.error('Upload image error:', error);
    return NextResponse.json(
      { error: 'Failed to save image' },
      { status: 500 }
    );
  }
}
