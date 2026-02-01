import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getCanvaAuthUrl } from '@/lib/canva';

export async function GET(req: Request) {
    try {
        const session = await requireAuth(req);
        // @ts-ignore
        if (session instanceof Response) return session;

        // @ts-ignore
        const userId = session.user.id;
        const authUrl = await getCanvaAuthUrl(userId);

        return NextResponse.redirect(authUrl);
    } catch (error: any) {
        console.error('Canva Auth error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate Canva authorization' },
            { status: 500 }
        );
    }
}
