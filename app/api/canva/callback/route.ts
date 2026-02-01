import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/canva';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');
        const userId = searchParams.get('state'); // We passed userId as state

        if (!code || !userId) {
            return NextResponse.json(
                { error: 'Missing code or state' },
                { status: 400 }
            );
        }

        await exchangeCodeForTokens(code, userId);

        // Redirect back to dashboard with success message
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?service=canva&status=connected`);
    } catch (error: any) {
        console.error('Canva Callback error:', error);
        return NextResponse.json(
            { error: 'Failed to complete Canva authorization' },
            { status: 500 }
        );
    }
}
