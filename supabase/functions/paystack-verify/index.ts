import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const PREMIUM_OFFLINE_DAYS = 7

const getOfflinePremiumValidUntil = () => {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + PREMIUM_OFFLINE_DAYS)
    return expiry.toISOString()
}

const setPremiumDevice = async (supabase: any, userId: string, deviceId: string, deviceName?: string | null) => {
    const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('active_premium_device_id')
        .eq('id', userId)
        .single()

    if (userError) throw userError

    const { data: existingDevice, error: existingDeviceError } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .maybeSingle()

    if (existingDeviceError) throw existingDeviceError

    let currentDevice = existingDevice

    if (!currentDevice) {
        const { data: insertedDevice, error: insertDeviceError } = await supabase
            .from('user_devices')
            .insert({
                user_id: userId,
                device_id: deviceId,
                device_name: deviceName || null,
                last_seen_at: new Date().toISOString(),
            })
            .select('*')
            .single()

        if (insertDeviceError) throw insertDeviceError
        currentDevice = insertedDevice
    } else {
        const { data: updatedDevice, error: updateDeviceError } = await supabase
            .from('user_devices')
            .update({
                device_name: deviceName || currentDevice.device_name,
                last_seen_at: new Date().toISOString(),
            })
            .eq('id', currentDevice.id)
            .select('*')
            .single()

        if (updateDeviceError) throw updateDeviceError
        currentDevice = updatedDevice
    }

    let previousDevice = null

    if (userRecord?.active_premium_device_id) {
        const { data } = await supabase
            .from('user_devices')
            .select('*')
            .eq('id', userRecord.active_premium_device_id)
            .maybeSingle()
        previousDevice = data
    }

    if (previousDevice && previousDevice.id !== currentDevice.id) {
        const { error: revokeError } = await supabase
            .from('user_devices')
            .update({
                has_premium_access: false,
                premium_revoked_permanently: true,
                last_seen_at: new Date().toISOString(),
            })
            .eq('id', previousDevice.id)

        if (revokeError) throw revokeError
    }

    const { data: activeDevice, error: activeDeviceError } = await supabase
        .from('user_devices')
        .update({
            has_premium_access: true,
            premium_revoked_permanently: false,
            device_name: deviceName || currentDevice.device_name,
            last_seen_at: new Date().toISOString(),
        })
        .eq('id', currentDevice.id)
        .select('*')
        .single()

    if (activeDeviceError) throw activeDeviceError

    const { error: pointerError } = await supabase
        .from('users')
        .update({ active_premium_device_id: activeDevice.id })
        .eq('id', userId)

    if (pointerError) throw pointerError

    const logRows = [{
        user_id: userId,
        from_device_id: previousDevice?.id || null,
        to_device_id: activeDevice.id,
        action: previousDevice && previousDevice.id !== activeDevice.id ? 'repaid_reactivation' : 'initial_bind',
    }]

    if (previousDevice && previousDevice.id !== activeDevice.id) {
        logRows.push({
            user_id: userId,
            from_device_id: previousDevice.id,
            to_device_id: activeDevice.id,
            action: 'premium_revoked',
        })
    }

    const { error: logError } = await supabase
        .from('device_transfer_logs')
        .insert(logRows)

    if (logError) throw logError

    return {
        active_premium_device_id: activeDevice.id,
        active_premium_device_name: activeDevice.device_name || deviceName || 'This device',
        current_device_id: activeDevice.device_id,
        current_device_name: activeDevice.device_name || deviceName || 'This device',
        premium_offline_valid_until: getOfflinePremiumValidUntil(),
    }
}

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
            const device_id = data.data.metadata?.device_id;
            const device_name = data.data.metadata?.device_name;

            if (!user_id) {
                console.error('[Verify] Error: user_id missing from metadata', data.data.metadata);
                throw new Error('Transaction successful, but user identity could not be verified.');
            }

            if (!device_id) {
                console.error('[Verify] Error: device_id missing from metadata', data.data.metadata);
                throw new Error('Transaction successful, but device identity could not be verified.');
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

            const premiumDeviceState = await setPremiumDevice(supabase, user_id, device_id, device_name)

            console.log(`[Verify] Success for user ${user_id}. New expiry: ${expiryDate.toISOString()}`);

            return new Response(JSON.stringify({
                success: true,
                expiry_date: expiryDate.toISOString(),
                message: 'Subscription updated successfully',
                ...premiumDeviceState,
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
