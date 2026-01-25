import { requireAuth } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);
    if (session instanceof Response) return session;

    const { publicId } = await request.json();

    if (!publicId) {
      return Response.json(
        { error: 'Missing publicId' },
        { status: 400 }
      );
    }

    const url = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/resources/image/upload`;
    const auth_token = Buffer.from(
      `${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`
    ).toString('base64');

    const response = await fetch(`${url}/${publicId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${auth_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete from Cloudinary');
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return Response.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
