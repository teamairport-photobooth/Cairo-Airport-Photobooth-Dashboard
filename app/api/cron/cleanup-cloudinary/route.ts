import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { deleteCloudinaryImagesByTag } from '@/services/cloudinaryService';

const EXPECTED_CRON_SECRET = process.env.CRON_SECRET || 'cairo_photobooth_cron_secret_2026';

async function handleCleanup(req: NextRequest) {
    try {
        // 1. Authorization Guard
        const authHeader = req.headers.get('authorization');
        const url = new URL(req.url);
        const queryKey = url.searchParams.get('key');

        let isAuthorized = false;

        if (authHeader && authHeader.toLowerCase() === `bearer ${EXPECTED_CRON_SECRET.toLowerCase()}`) {
            isAuthorized = true;
        } else if (queryKey && queryKey === EXPECTED_CRON_SECRET) {
            isAuthorized = true;
        } else {
            // Check for active Supabase Admin session header if invoked internally
            const token = req.headers.get('x-supabase-auth');
            if (token) {
                const { data: { user } } = await supabase.auth.getUser(token);
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    if (profile && profile.role === 'ADMIN') {
                        isAuthorized = true;
                    }
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized. Provide a valid Bearer CRON_SECRET or Admin session.' },
                { status: 401 }
            );
        }

        // 2. Fetch Credentials & Tag from Supabase
        const { data: globalSettings, error: gError } = await supabase
            .from('global_settings')
            .select('*')
            .eq('id', 'current')
            .single();

        if (gError && gError.code !== 'PGRST116') throw gError;

        const { data: projectsData, error: pError } = await supabase
            .from('projects')
            .select('*')
            .limit(1);

        if (pError) throw pError;

        const cloudName = globalSettings?.cloudinary_cloud_name || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const apiKey = globalSettings?.cloudinary_api_key || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
        const apiSecret = globalSettings?.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET;
        const tag = (projectsData && projectsData.length > 0 && projectsData[0].cloudinary_tag) || 'cairo-airport-photobooth';

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Cloudinary API credentials are not configured in settings.' },
                { status: 400 }
            );
        }

        // 3. Perform Bulk Image Purge
        const deletedCount = await deleteCloudinaryImagesByTag(cloudName, apiKey, apiSecret, tag);

        return NextResponse.json({
            success: true,
            message: `Successfully purged Cloudinary storage for tag "${tag}".`,
            deletedCount,
            tag,
            timestamp: new Date().toISOString()
        });
    } catch (err: any) {
        console.error('Cleanup Cron Error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal server error during storage cleanup.' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    return handleCleanup(req);
}

export async function POST(req: NextRequest) {
    return handleCleanup(req);
}
