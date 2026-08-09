import { NextRequest, NextResponse } from 'next/server';
import { supabase, getGlobalSettingsServer } from '@/utils/supabase';
import { deleteCloudinaryFolderImages } from '@/services/cloudinaryService';

export async function handleCleanup(req: NextRequest) {
    try {
        const globalSettings = await getGlobalSettingsServer();
        const cronSecret = globalSettings?.cron_secret ? globalSettings.cron_secret.trim() : null;

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

        // 2. Fetch Credentials & Folder Tag from global_settings
        const cloudName = globalSettings?.cloudinary_cloud_name;
        const apiKey = globalSettings?.cloudinary_api_key;
        const apiSecret = globalSettings?.cloudinary_api_secret;
        const folderName = globalSettings?.cloudinary_tag || 'cairo-airport-photobooth';

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Cloudinary API credentials are not configured in global_settings.' },
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
