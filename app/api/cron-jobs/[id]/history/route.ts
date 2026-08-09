import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSettingsServer } from '@/utils/supabase';

const getCronApiKey = async () => {
    const settings = await getGlobalSettingsServer();
    return settings?.cron_jobs_api_key || '';
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const apiKey = await getCronApiKey();
    if (!apiKey) {
        return NextResponse.json({ error: 'CRON_JOBS_API_KEY is not configured in global_settings.' }, { status: 400 });
    }

    try {
        const res = await fetch(`https://api.cron-job.org/jobs/${id}/history`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        const data = await res.json();
        if (!res.ok) {
            return NextResponse.json({ error: data.message || data.error || 'Failed to fetch job history' }, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Fetch Job History Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
