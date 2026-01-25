import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth(request: Request) {
  const session = await getSession();

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return session;
}

export async function requireAdmin(request: Request) {
  const session = await getSession();

  if (!session || (session.user as any).role !== 'admin') {

    return new Response(
      JSON.stringify({ error: 'Forbidden - Admin access required' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return session;
}
