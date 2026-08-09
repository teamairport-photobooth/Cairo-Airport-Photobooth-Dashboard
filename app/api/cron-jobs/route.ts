import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSettingsServer } from '@/utils/supabase';

const getCronCredentials = async () => {
    const settings = await getGlobalSettingsServer();
    return {
        apiKey: settings?.cron_jobs_api_key || '',
        cronSecret: settings?.cron_secret || ''
    };
};

export async function GET() {
    const { apiKey, cronSecret } = await getCronCredentials();
    if (!apiKey) {
        return NextResponse.json({ error: 'CRON_JOBS_API_KEY is not configured in global_settings.' }, { status: 400 });
    }

    try {
        const res = await fetch('https://api.cron-job.org/jobs', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        const data = await res.json();
        if (!res.ok) {
            return NextResponse.json({ error: data.message || data.error || 'Failed to fetch cron jobs from cron-job.org' }, { status: res.status });
        }

        const rawJobs = data.jobs || [];

        // Fetch detailed info for each job to retrieve extendedData.headers (Authorization header / secret)
        const detailedJobs = await Promise.all(
            rawJobs.map(async (j: any) => {
                try {
                    const detailRes = await fetch(`https://api.cron-job.org/jobs/${j.jobId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        cache: 'no-store'
                    });
                    if (detailRes.ok) {
                        const detailData = await detailRes.json();
                        return detailData.jobDetails || j;
                    }
                } catch (err) {
                    console.warn(`Failed to fetch detail for job ${j.jobId}:`, err);
                }
                return j;
            })
        );

        return NextResponse.json({
            jobs: detailedJobs,
            defaultCronSecret: cronSecret
        });
    } catch (err: any) {
        console.error('Fetch Cron Jobs Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { apiKey } = await getCronCredentials();
    if (!apiKey) {
        return NextResponse.json({ error: 'CRON_JOBS_API_KEY is not configured in global_settings.' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const res = await fetch('https://api.cron-job.org/jobs', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) {
            return NextResponse.json({ error: data.message || data.error || 'Failed to create cron job on cron-job.org' }, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Create Cron Job Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
