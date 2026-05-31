import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        if (!PAYSTACK_SECRET_KEY) {
            console.error('[Init] Error: PAYSTACK_SECRET_KEY is missing');
            throw new Error("PAYSTACK_SECRET_KEY is not set in Supabase Secrets.");
        }

        const body = await req.json().catch(() => ({}));
        const { email, amount, metadata } = body;

        if (!email || !amount) {
            console.error('[Init] Error: Missing required fields', { email, amount });
            throw new Error("Missing required fields: email and amount are required.");
        }

        if (!metadata?.user_id || !metadata?.device_id) {
            console.error('[Init] Error: Missing device metadata', metadata);
            throw new Error("Missing required payment metadata: user_id and device_id are required.");
        }

        console.log(`[Init] Initializing payment for ${email}, amount: ${amount}`);

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                amount: Math.round(amount * 100), // Ensure it's an integer for kobo
                metadata,
                callback_url: 'https://standard.paystack.co/close', // Fallback
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('[Init] Paystack API Error:', JSON.stringify(data));
            return new Response(JSON.stringify({ error: data.message || 'Paystack initialization failed' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                status: response.status,
            })
        }

        console.log('[Init] Paystack Success:', data.data?.reference);

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 200,
        })
    } catch (error) {
        console.error('[Init] Exception:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 400,
        })
    }
})
