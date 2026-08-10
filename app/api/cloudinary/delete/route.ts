import { NextRequest, NextResponse } from 'next/server';
import { deleteCloudinaryImages } from '@/services/cloudinaryService';
import { supabase, getGlobalSettingsServer } from '@/utils/supabase';

export async function POST(request: NextRequest) {
    try {
        // Authorization Guard: Only ADMIN users can delete images
        const token = request.headers.get('x-supabase-auth');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Missing authentication token' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid user session' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Regular users are not allowed to delete images' }, { status: 403 });
        }

        const body = await request.json();
        const { public_id, public_ids, cloudName: reqCloudName, apiKey: reqApiKey, apiSecret: reqApiSecret } = body;

        let idsToDelete: string[] = [];
        if (Array.isArray(public_ids) && public_ids.length > 0) {
            idsToDelete = public_ids;
        } else if (public_id) {
            idsToDelete = [public_id];
        }

        if (idsToDelete.length === 0) {
            return NextResponse.json({ error: 'No image public_id provided for deletion' }, { status: 400 });
        }

        let cloudName = reqCloudName;
        let apiKey = reqApiKey;
        let apiSecret = reqApiSecret;

        if (!cloudName || !apiKey || !apiSecret) {
            const settings = await getGlobalSettingsServer();
            if (settings) {
                cloudName = cloudName || settings.cloudinary_cloud_name;
                apiKey = apiKey || settings.cloudinary_api_key;
                apiSecret = apiSecret || settings.cloudinary_api_secret;
            }
        }

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json({ error: 'Missing Cloudinary configuration in global_settings' }, { status: 400 });
        }

        const deletedCount = await deleteCloudinaryImages(cloudName, apiKey, apiSecret, idsToDelete);

        return NextResponse.json({ success: true, deletedCount, deletedIds: idsToDelete });
    } catch (error: any) {
        console.error('Cloudinary Delete API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete images' }, { status: 500 });
    }
}

