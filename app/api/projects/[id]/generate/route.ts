import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to get admin client safely
const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error('Supabase admin credentials missing (URL or Service Role Key)');
    }

    return createClient(url, key);
};

// Helper to add CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const amount = 1;
        const supabase = getAdminClient();

        // 1. Create a log entry
        const { error: logError } = await supabase
            .from('usage_logs')
            .insert([{ project_id: id, amount }]);

        if (logError) throw logError;

        // 2. Increment project total_usage using RPC
        const { error: updateError } = await supabase.rpc('increment_project_usage', {
            p_id: id,
            p_amount: amount
        });

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            projectId: id,
            incrementedBy: amount,
            timestamp: new Date().toISOString()
        }, {
            status: 200,
            headers: corsHeaders
        });
    } catch (error: any) {
        console.error('API Generation Error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to increment generation count'
        }, {
            status: 500,
            headers: corsHeaders
        });
    }
}
