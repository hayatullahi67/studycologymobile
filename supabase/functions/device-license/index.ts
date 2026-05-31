import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type UserRow = {
  id: string;
  is_paid: boolean;
  expiry_date?: string | null;
  active_premium_device_id?: string | null;
};

type UserDeviceRow = {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string | null;
  has_premium_access: boolean;
  premium_revoked_permanently: boolean;
};

const isSubscriptionActive = (user: UserRow) =>
  Boolean(user.is_paid) && Boolean(user.expiry_date) && new Date(user.expiry_date as string) > new Date();

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

const getAuthenticatedUser = async (req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase public credentials are missing.');
  const authHeader = req.headers.get('Authorization') || '';

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user;
};

const getServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role credentials are missing.');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

const upsertCurrentDevice = async (
  service: ReturnType<typeof createClient>,
  userId: string,
  deviceId: string,
  deviceName?: string
) => {
  const { data: existing, error: existingError } = await service
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { data: updated, error: updateError } = await service
      .from('user_devices')
      .update({
        device_name: deviceName || existing.device_name,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateError) throw updateError;
    return updated as UserDeviceRow;
  }

  const { data: inserted, error: insertError } = await service
    .from('user_devices')
    .insert({
      user_id: userId,
      device_id: deviceId,
      device_name: deviceName || null,
      last_seen_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return inserted as UserDeviceRow;
};

const setPremiumDevice = async (
  service: ReturnType<typeof createClient>,
  user: UserRow,
  currentDevice: UserDeviceRow,
  action: 'initial_bind' | 'premium_switch' | 'repaid_reactivation'
) => {
  let previousDevice: UserDeviceRow | null = null;

  if (user.active_premium_device_id) {
    const { data } = await service
      .from('user_devices')
      .select('*')
      .eq('id', user.active_premium_device_id)
      .maybeSingle();
    previousDevice = (data as UserDeviceRow | null) || null;
  }

  if (previousDevice && previousDevice.id !== currentDevice.id) {
    const { error: revokeError } = await service
      .from('user_devices')
      .update({
        has_premium_access: false,
        premium_revoked_permanently: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', previousDevice.id);

    if (revokeError) throw revokeError;
  }

  const { data: activatedDevice, error: activateError } = await service
    .from('user_devices')
    .update({
      has_premium_access: true,
      premium_revoked_permanently: false,
      device_name: currentDevice.device_name,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', currentDevice.id)
    .select('*')
    .single();

  if (activateError) throw activateError;

  const { error: userUpdateError } = await service
    .from('users')
    .update({
      active_premium_device_id: currentDevice.id,
    })
    .eq('id', user.id);

  if (userUpdateError) throw userUpdateError;

  const logRows: Array<Record<string, unknown>> = [
    {
      user_id: user.id,
      from_device_id: previousDevice?.id || null,
      to_device_id: currentDevice.id,
      action,
    },
  ];

  if (previousDevice && previousDevice.id !== currentDevice.id) {
    logRows.push({
      user_id: user.id,
      from_device_id: previousDevice.id,
      to_device_id: currentDevice.id,
      action: 'premium_revoked',
    });
  }

  const { error: logError } = await service.from('device_transfer_logs').insert(logRows);
  if (logError) throw logError;

  return {
    active_premium_device_id: activatedDevice.id,
    active_premium_device_name: activatedDevice.device_name || currentDevice.device_name || 'This device',
    current_device_id: currentDevice.device_id,
    current_device_name: activatedDevice.device_name || currentDevice.device_name || 'This device',
    current_device_has_premium: true,
    premium_revoked_permanently: false,
    device_access_state: 'active',
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await getAuthenticatedUser(req);
    const service = getServiceClient();
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'sync';
    const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
    const deviceName = typeof body.device_name === 'string' ? body.device_name.trim() : 'This device';

    if (!deviceId) throw new Error('device_id is required.');

    const { data: userRow, error: userError } = await service
      .from('users')
      .select('id, is_paid, expiry_date, active_premium_device_id')
      .eq('id', user.id)
      .single();

    if (userError || !userRow) throw new Error(userError?.message || 'Unable to load user record.');

    const currentDevice = await upsertCurrentDevice(service, user.id, deviceId, deviceName);
    const subscriptionIsActive = isSubscriptionActive(userRow as UserRow);

    if (!subscriptionIsActive) {
      return json({
        active_premium_device_id: userRow.active_premium_device_id || null,
        active_premium_device_name: null,
        current_device_id: currentDevice.device_id,
        current_device_name: currentDevice.device_name || deviceName,
        current_device_has_premium: false,
        premium_revoked_permanently: currentDevice.premium_revoked_permanently,
        device_access_state: 'unpaid',
      });
    }

    if (!userRow.active_premium_device_id) {
      return json(await setPremiumDevice(service, userRow as UserRow, currentDevice, 'initial_bind'));
    }

    const { data: activeDevice, error: activeDeviceError } = await service
      .from('user_devices')
      .select('*')
      .eq('id', userRow.active_premium_device_id)
      .maybeSingle();

    if (activeDeviceError) throw activeDeviceError;

    const activeDeviceRow = (activeDevice as UserDeviceRow | null) || null;

    if (!activeDeviceRow) {
      return json(await setPremiumDevice(service, userRow as UserRow, currentDevice, 'initial_bind'));
    }

    if (action === 'switch') {
      if (currentDevice.premium_revoked_permanently) {
        return json({
          active_premium_device_id: activeDeviceRow.id,
          active_premium_device_name: activeDeviceRow.device_name || 'another device',
          current_device_id: currentDevice.device_id,
          current_device_name: currentDevice.device_name || deviceName,
          current_device_has_premium: false,
          premium_revoked_permanently: true,
          device_access_state: 'payment_required',
        }, 409);
      }

      return json(await setPremiumDevice(service, userRow as UserRow, currentDevice, 'premium_switch'));
    }

    if (activeDeviceRow.id === currentDevice.id) {
      return json({
        active_premium_device_id: activeDeviceRow.id,
        active_premium_device_name: activeDeviceRow.device_name || deviceName,
        current_device_id: currentDevice.device_id,
        current_device_name: currentDevice.device_name || deviceName,
        current_device_has_premium: true,
        premium_revoked_permanently: false,
        device_access_state: 'active',
      });
    }

    if (currentDevice.premium_revoked_permanently) {
      return json({
        active_premium_device_id: activeDeviceRow.id,
        active_premium_device_name: activeDeviceRow.device_name || 'another device',
        current_device_id: currentDevice.device_id,
        current_device_name: currentDevice.device_name || deviceName,
        current_device_has_premium: false,
        premium_revoked_permanently: true,
        device_access_state: 'payment_required',
      });
    }

    return json({
      active_premium_device_id: activeDeviceRow.id,
      active_premium_device_name: activeDeviceRow.device_name || 'another device',
      current_device_id: currentDevice.device_id,
      current_device_name: currentDevice.device_name || deviceName,
      current_device_has_premium: false,
      premium_revoked_permanently: false,
      device_access_state: 'switch_required',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, message === 'Unauthorized' ? 401 : 400);
  }
});
