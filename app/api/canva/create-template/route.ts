import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let upstreamResponse: Response;

    if (contentType.includes('multipart/form-data')) {
      const incoming = await request.formData();
      const outgoing = new FormData();

      for (const [key, value] of incoming.entries()) {
        outgoing.append(key, value as any);
      }
      console.log(process.env.NEXT_PUBLIC_CANVA_BASE_URL)
      upstreamResponse = await fetch(`${process.env.NEXT_PUBLIC_CANVA_BASE_URL}/webhook/create-template`, {
        method: 'POST',
        body: outgoing,
      });
    } else {
      const jsonBody = await request.json().catch(() => ({}));
      upstreamResponse = await fetch(`${process.env.NEXT_PUBLIC_CANVA_BASE_URL}/webhook/create-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonBody),
      });
    }

    const upstreamContentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';

    // If upstream returns an image/binary payload, forward bytes (not text)
    if (
      upstreamContentType.startsWith('image/') ||
      upstreamContentType.includes('application/octet-stream')
    ) {
      const buffer = await upstreamResponse.arrayBuffer();
      return new NextResponse(buffer, {
        status: upstreamResponse.status,
        headers: {
          'Content-Type': upstreamContentType,
        },
      });
    }

    const bodyText = await upstreamResponse.text();
    return new NextResponse(bodyText, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamContentType,
      },
    });
  } catch (error) {
    console.error('Create template proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to submit template data' },
      { status: 500 }
    );
  }
}
