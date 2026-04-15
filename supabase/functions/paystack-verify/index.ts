import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        // Validation
        if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[Verify] Missing environment variables');
            throw new Error('Server configuration error: Missing environment variables.');
        }

        const url = new URL(req.url)
        const reference = url.searchParams.get('reference')
        console.log(`[Verify] Verifying reference: ${reference}`);

        if (!reference) throw new Error('No reference provided')

        // 1. Verify with Paystack
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        })

        const data = await response.json()
        console.log(`[Verify] Paystack API Response for ${reference}:`, JSON.stringify(data, null, 2));

        if (data.status && data.data.status === 'success') {
            const user_id = data.data.metadata?.user_id;

            if (!user_id) {
                console.error('[Verify] Error: user_id missing from metadata', data.data.metadata);
                throw new Error('Transaction successful, but user identity could not be verified.');
            }

            // 2. Update Supabase User Profile
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

            // Fetch current expiry to see if we should extend it
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('expiry_date')
                .eq('id', user_id)
                .single()

            if (fetchError) {
                console.error('[Verify] Error fetching user:', fetchError);
                throw new Error('Failed to retrieve user data for update.');
            }

            let baseDate = new Date();
            // If existing expiry is in the future, extend from that date
            if (userData?.expiry_date) {
                const currentExpiry = new Date(userData.expiry_date);
                if (currentExpiry > baseDate) {
                    baseDate = currentExpiry;
                }
            }

            const expiryDate = new Date(baseDate)
            expiryDate.setFullYear(expiryDate.getFullYear() + 1)

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    is_paid: true,
                    expiry_date: expiryDate.toISOString()
                })
                .eq('id', user_id)

            if (updateError) {
                console.error('[Verify] DB Update Error:', updateError);
                throw updateError;
            }

            console.log(`[Verify] Success for user ${user_id}. New expiry: ${expiryDate.toISOString()}`);

            return new Response(JSON.stringify({
                success: true,
                expiry_date: expiryDate.toISOString(),
                message: 'Subscription updated successfully'
            }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                status: 200,
            })
        }

        // If Paystack API itself says status: false, it usually means Reference Not Found
        if (!data.status) {
            return new Response(JSON.stringify({ 
                success: false, 
                status: 'not_found', 
                message: data.message || 'Transaction not found' 
            }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                status: 200,
            })
        }

        const transactionStatus = data.data?.status || 'unknown';
        console.warn(`[Verify] Transaction ${reference} is:`, transactionStatus);
        
        return new Response(JSON.stringify({ 
            success: false, 
            status: transactionStatus, // This will now be 'abandoned'
            message: data.message 
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 200,
        })
    } catch (error) {
        console.error('[Verify] Exception:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 400,
        })
    }
})
