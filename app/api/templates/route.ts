import { connectDB } from '@/lib/db';
import { Template } from '@/lib/models/Template';
import { requireAdmin } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://mdnkhadka.app.n8n.cloud/webhook/templates');
    if (!res.ok) {
      throw new Error('Failed to fetch templates from webhook');
    }
    const templates = await res.json();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    if (session instanceof Response) return session;

    await connectDB();

    const { title, imageUrl, publicId } = await request.json();


    if (!title || !imageUrl || !publicId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const template = await Template.create({
      title,
      imageUrl,
      publicId,
      createdBy: (session.user as any).id,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
