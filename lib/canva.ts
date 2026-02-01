import { connectDB } from "./db";
import { User } from "./models/User";
import crypto from 'crypto';

const CANVA_API_BASE_URL = process.env.CANVA_API_BASE_URL || 'https://api.canva.com/rest/v1';
const CLIENT_ID = process.env.CANVA_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;

// Helper to generate PKCE
function generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
    return { verifier, challenge };
}

export async function getCanvaAuthUrl(userId: string) {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/canva/callback`;
    const { verifier, challenge } = generatePKCE();

    // Save verifier to user temporarily or use a session
    await connectDB();
    await User.findByIdAndUpdate(userId, {
        'canvaTokens.tempCodeVerifier': verifier
    });

    const scopes = [
        'folder:permission:write',
        'comment:read',
        'folder:write',
        'asset:write',
        'comment:write',
        'design:meta:read',
        'design:content:write',
        'design:permission:write',
        'asset:read',
        'app:write',
        'folder:permission:read',
        'brandtemplate:content:read',
        'brandtemplate:meta:read',
        'folder:read',
        'design:content:read',
        'design:permission:read',
        'profile:read',
        'app:read'
    ].join(' ');

    const url = new URL('https://www.canva.com/api/oauth/authorize');
    url.searchParams.append('client_id', CLIENT_ID!);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', scopes);
    url.searchParams.append('state', userId);
    url.searchParams.append('code_challenge_method', 's256');
    url.searchParams.append('code_challenge', challenge);

    return url.toString();
}

export async function exchangeCodeForTokens(code: string, userId: string) {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/canva/callback`;

    await connectDB();
    const user = await User.findById(userId);
    if (!user || !user.canvaTokens?.tempCodeVerifier) {
        throw new Error('PKCE verifier not found. Please try logging in again.');
    }

    const codeVerifier = user.canvaTokens.tempCodeVerifier;
    const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier, // PKCE Verifier
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Canva Token Exchange Failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    await User.findByIdAndUpdate(userId, {
        canvaTokens: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + data.expires_in * 1000),
            tempCodeVerifier: undefined // Clear it
        }
    });

    return data;
}

export async function getValidCanvaToken(userId: string) {
    await connectDB();
    const user = await User.findById(userId);
    if (!user || !user.canvaTokens) throw new Error('Canva not connected');

    const { accessToken, refreshToken, expiresAt } = user.canvaTokens;

    // If token is still valid (with 5 min buffer)
    if (expiresAt && new Date(expiresAt).getTime() > Date.now() + 5 * 60 * 1000) {
        return accessToken;
    }

    // Refresh token
    const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        })
    });

    if (!response.ok) {
        throw new Error('Canva Refresh Token Failed');
    }

    const data = await response.json();

    await User.findByIdAndUpdate(userId, {
        canvaTokens: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken, // Refresh can be reused
            expiresAt: new Date(Date.now() + data.expires_in * 1000)
        }
    });

    return data.access_token;
}

export async function autofillCanvaDesign(userId: string, brandTemplateId: string, data: any) {
    const token = await getValidCanvaToken(userId);

    const response = await fetch(`${CANVA_API_BASE_URL}/autofills`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            brand_template_id: brandTemplateId,
            data,
            title: `Autofilled Design ${Date.now()}`
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Canva Autofill Failed: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

export async function exportCanvaDesign(userId: string, designId: string) {
    const token = await getValidCanvaToken(userId);

    // 1. Initiate Export
    const initiateResponse = await fetch(`${CANVA_API_BASE_URL}/exports`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            design_id: designId,
            format: 'png'
        })
    });

    if (!initiateResponse.ok) {
        throw new Error('Canva Export Initiation Failed');
    }

    const { id: exportId } = await initiateResponse.json();

    // 2. Poll for completion
    let attempts = 0;
    while (attempts < 20) {
        const pollResponse = await fetch(`${CANVA_API_BASE_URL}/exports/${exportId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const statusData = await pollResponse.json();
        if (statusData.status === 'success') {
            return statusData.export_url; // Note: In real API this might be inside an array
        }
        if (statusData.status === 'failed') {
            throw new Error('Canva Export Failed');
        }

        await new Promise(r => setTimeout(r, 2000));
        attempts++;
    }

    throw new Error('Canva Export Timed Out');
}
