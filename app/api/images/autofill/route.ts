import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Template } from '@/lib/models/Template';
import { generateAutofillUrl } from '@/lib/cloudinary';
import { requireAuth } from '@/lib/auth-helpers';

export async function POST(req: Request) {
    try {
        const session = await requireAuth(req);
        // @ts-ignore
        if (session instanceof Response) return session;

        const { templateId, userPublicId } = await req.json();

        if (!templateId || !userPublicId) {
            return NextResponse.json(
                { error: 'Missing templateId or userPublicId' },
                { status: 400 }
            );
        }

        await connectDB();
        const template = await Template.findById(templateId);

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // 1. Check if we should use official Canva API
        if (template.canvaBrandTemplateId) {
            try {
                const { autofillCanvaDesign, exportCanvaDesign } = await import('@/lib/canva');

                // @ts-ignore
                const userId = session.user.id;

                // Map fields - we assume 'image_placeholder' for images
                const autofillResult = await autofillCanvaDesign(userId, template.canvaBrandTemplateId, {
                    "User_Image": {
                        type: "image",
                        image_url: userPublicId.startsWith('http') ? userPublicId : `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${userPublicId}`
                    }
                });

                const designId = autofillResult.design.id;
                const resultUrl = await exportCanvaDesign(userId, designId);

                return NextResponse.json({ resultUrl, info: 'Generated via Official Canva API' });
            } catch (canvaError: any) {
                console.error('Canva flow failed, falling back to Cloudinary:', canvaError);
            }
        }

        // 2. Fallback: Existing Cloudinary Autofill
        const placeholder = template.placeholder || { x: 0, y: 0, width: 500, height: 500 };

        const resultUrl = generateAutofillUrl(
            template.publicId,
            userPublicId,
            placeholder
        );

        return NextResponse.json({ resultUrl, info: 'Generated via Cloudinary Autofill' });
    } catch (error: any) {
        console.error('Autofill API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to autofill image' },
            { status: 500 }
        );
    }
}
