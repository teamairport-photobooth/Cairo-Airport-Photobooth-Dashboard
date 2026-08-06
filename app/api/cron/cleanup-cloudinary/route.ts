import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { deleteCloudinaryFolderImages } from '@/services/cloudinaryService';

export async function handleCleanup(req: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET ? process.env.CRON_SECRET.trim() : null;

        // 1. Authorization Guard
        const authHeader = req.headers.get('authorization')?.trim();
        const url = new URL(req.url);
        const queryKey = url.searchParams.get('key')?.trim();

        let isAuthorized = false;

        if (cronSecret) {
            if (authHeader && authHeader === `Bearer ${cronSecret}`) {
                isAuthorized = true;
            } else if (queryKey && queryKey === cronSecret) {
                isAuthorized = true;
            }
        }

        // Check for active Supabase Admin session header if invoked internally from dashboard UI
        if (!isAuthorized) {
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

        // 2. Fetch Credentials & Folder Tag from Supabase
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
        const folderName = (projectsData && projectsData.length > 0 && projectsData[0].cloudinary_tag) || 'cairo-airport-photobooth';

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Cloudinary API credentials are not configured in settings.' },
                { status: 400 }
            );
        }

        // 3. Perform Bulk Image Purge by Folder Prefix
        const deletedCount = await deleteCloudinaryFolderImages(cloudName, apiKey, apiSecret, folderName);

        return NextResponse.json({
            success: true,
            message: `Successfully cleared Cloudinary storage folder "${folderName}".`,
            deletedCount,
            folder: folderName,
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
