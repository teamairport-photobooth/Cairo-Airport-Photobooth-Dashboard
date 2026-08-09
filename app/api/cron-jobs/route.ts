import { NextRequest, NextResponse } from 'next/server';

const getCronApiKey = () => {
    return process.env.CRON_JOBS_API_KEY || '';
};

export async function GET() {
    const apiKey = getCronApiKey();
    if (!apiKey) {
        return NextResponse.json({ error: 'CRON_JOBS_API_KEY is not configured in environment variables.' }, { status: 400 });
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

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Fetch Cron Jobs Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const apiKey = getCronApiKey();
    if (!apiKey) {
        return NextResponse.json({ error: 'CRON_JOBS_API_KEY is not configured in environment variables.' }, { status: 400 });
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
