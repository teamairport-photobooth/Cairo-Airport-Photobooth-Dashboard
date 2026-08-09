import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getGlobalSettingsServer } from '@/utils/supabase';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    let cloudName = searchParams.get('cloudName');
    let apiKey = searchParams.get('apiKey');
    let apiSecret = searchParams.get('apiSecret');
    let tag = searchParams.get('tag');
    const subtag = searchParams.get('subtag');
    const nextCursor = searchParams.get('next_cursor');
    const sort = searchParams.get('sort') || 'desc';

    // If credentials or tag not in query, fetch from global_settings table
    if (!cloudName || !apiKey || !apiSecret || !tag) {
        const settings = await getGlobalSettingsServer();
        if (settings) {
            cloudName = cloudName || settings.cloudinary_cloud_name;
            apiKey = apiKey || settings.cloudinary_api_key;
            apiSecret = apiSecret || settings.cloudinary_api_secret;
            tag = tag || settings.cloudinary_tag || 'cairo-airport-photobooth';
        }
    }

    if (!cloudName || !apiKey || !apiSecret || !tag) {
        return NextResponse.json({ error: 'Missing Cloudinary configuration in global_settings' }, { status: 400 });
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    try {
        let expression = `(tags:"${tag}" OR folder:"${tag}/*") AND NOT folder:"${tag}/qr-codes/*"`;
        if (subtag) {
            expression = `(${expression}) AND tags:"${subtag}"`;
        }

        const result = await cloudinary.search
            .expression(expression)
            .sort_by('created_at', sort as 'asc' | 'desc')
            .max_results(24)
            .with_field('context')
            .with_field('metadata')
            .with_field('tags')
            .next_cursor(nextCursor || undefined)
            .execute();

        return NextResponse.json({
            resources: result.resources,
            next_cursor: result.next_cursor
        });
    } catch (error: any) {
        console.error('Cloudinary API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch images' }, { status: 500 });
    }
}
