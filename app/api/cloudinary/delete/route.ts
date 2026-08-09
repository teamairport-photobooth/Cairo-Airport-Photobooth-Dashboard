import { NextRequest, NextResponse } from 'next/server';
import { deleteCloudinaryImages } from '@/services/cloudinaryService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
    try {
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
            const { data: settings } = await supabase
                .from('global_settings')
                .select('*')
                .eq('id', 'current')
                .single();

            if (settings) {
                cloudName = cloudName || settings.cloudinary_cloud_name;
                apiKey = apiKey || settings.cloudinary_api_key;
                apiSecret = apiSecret || settings.cloudinary_api_secret;
            }
        }

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json({ error: 'Missing Cloudinary configuration' }, { status: 400 });
        }

        const deletedCount = await deleteCloudinaryImages(cloudName, apiKey, apiSecret, idsToDelete);

        return NextResponse.json({ success: true, deletedCount, deletedIds: idsToDelete });
    } catch (error: any) {
        console.error('Cloudinary Delete API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete images' }, { status: 500 });
    }
}
