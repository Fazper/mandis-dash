import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://idbazylwzyraeabbocyp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EeqQuu0iN1P1yV-VkFeCaw_y93qD5ps';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
