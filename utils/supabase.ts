import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables are missing. Using placeholders for build.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getGlobalSettingsServer() {
    try {
        const { data, error } = await supabase
            .from('global_settings')
            .select('*')
            .eq('id', 'current')
            .single();

        if (error) {
            console.error('Error fetching global settings from database:', error);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Failed to query global settings:', err);
        return null;
    }
}
