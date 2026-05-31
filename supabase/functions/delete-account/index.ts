import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unable to verify the current user." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const ignoreMissingTableCodes = new Set(["42P01", "PGRST205"]);

    const runDelete = async (table: string, column: string, value: string) => {
      const { error } = await adminClient.from(table).delete().eq(column, value);
      if (error && !ignoreMissingTableCodes.has(error.code || "")) {
        throw error;
      }
    };

    await runDelete("competition_results", "user_id", user.id);
    await runDelete("competition_registrations", "user_id", user.id);
    await runDelete("payout_requests", "user_id", user.id);
    await runDelete("referrals", "referrer_id", user.id);
    await runDelete("referrals", "referee_id", user.id);

    const { error: clearReferralsError } = await adminClient
      .from("users")
      .update({ referred_by: null })
      .eq("referred_by", user.id);

    if (clearReferralsError && !ignoreMissingTableCodes.has(clearReferralsError.code || "")) {
      throw clearReferralsError;
    }

    const { error: deleteProfileError } = await adminClient
      .from("users")
      .delete()
      .eq("id", user.id);

    if (deleteProfileError && !ignoreMissingTableCodes.has(deleteProfileError.code || "")) {
      throw deleteProfileError;
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      throw deleteAuthError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[delete-account] Error:", message);

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
