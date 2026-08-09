import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getGlobalSettingsServer } from '@/utils/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { public_id, tag, action, cloudName: reqCloudName, apiKey: reqApiKey, apiSecret: reqApiSecret } = body;

        if (!public_id || !tag || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let cloudName = reqCloudName;
        let apiKey = reqApiKey;
        let apiSecret = reqApiSecret;

        // If credentials not in body, fetch from global_settings table
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

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true
        });

        let result;
        if (action === 'add') {
            result = await cloudinary.uploader.add_tag(tag, [public_id]);
        } else if (action === 'remove') {
            result = await cloudinary.uploader.remove_tag(tag, [public_id]);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('Cloudinary Tag API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update tag' }, { status: 500 });
    }
}
