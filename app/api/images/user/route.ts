import { connectDB } from '@/lib/db';
import { GeneratedImage } from '@/lib/models/GeneratedImage';
import { requireAuth } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (session instanceof Response) return session;

    await connectDB();

    const images = await GeneratedImage.find({
      userId: (session.user as any).id,
    })
      .populate('templateId', 'title')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(images);
  } catch (error) {
    console.error('Get user images error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
