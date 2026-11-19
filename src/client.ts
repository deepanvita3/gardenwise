import {createClient} from '@supabase/supabase-js';
export const client=createClient('https://jnoodefltigmqgleeppr.supabase.co','sb_publishable_bBLvtMRFqYaFl2ymoDBQAQ_4ZpmmMQP',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
