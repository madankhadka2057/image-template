import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template_id') || searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Missing template_id' },
        { status: 400 }
      );
    }

    const upstream = await fetch(
      `https://mdnkhadka.app.n8n.cloud/webhook-test/template?template_id=${encodeURIComponent(templateId)}`
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      return new NextResponse(text || 'Failed to fetch template', {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'text/plain',
        },
      });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Get canva template error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}
