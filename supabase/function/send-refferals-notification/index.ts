import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReferralNotificationRequest {
  referrerId: string;
  newUserId: string;
  newUserName: string;
  newUserEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT and get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with user's JWT to verify their identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { referrerId, newUserId, newUserName, newUserEmail }: ReferralNotificationRequest = await req.json();

    // Validate that the authenticated user is the new user (the one who just signed up)
    if (user.id !== newUserId) {
      console.error("User ID mismatch. Authenticated:", user.id, "Claimed:", newUserId);
      return new Response(
        JSON.stringify({ error: "Unauthorized: You can only trigger notifications for your own signup" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing referral notification for referrer:", referrerId, "from new user:", newUserId);

    // Use service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get referrer's profile
    const { data: referrerProfile, error: referrerError } = await supabase
      .from("profiles")
      .select("full_name, phone_number, referral_code")
      .eq("id", referrerId)
      .single();

    if (referrerError) {
      console.error("Error fetching referrer profile:", referrerError);
      throw new Error("Failed to fetch referrer details");
    }

    // Get referrer's auth email
    const { data: { user: referrerAuth }, error: authError } = await supabase.auth.admin.getUserById(referrerId);

    if (authError || !referrerAuth?.email) {
      console.error("Error fetching referrer auth:", authError);
      throw new Error("Failed to fetch referrer email");
    }

    const referrerName = referrerProfile?.full_name || "Valued Member";
    const referrerEmail = referrerAuth.email;

    // Send email to referrer
    const emailResponse = await resend.emails.send({
      from: "Kinya Drive Cash <onboarding@resend.dev>",
      to: [referrerEmail],
      subject: `🎉 New Referral Sign Up - ${newUserName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Referral</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">You have a new referral!</p>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi <strong>${referrerName}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news! Someone just signed up using your referral link. You're one step closer to earning more commissions!
              </p>

              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #f97316;">New Member Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Name:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${newUserName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${newUserEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Referral Level:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #f97316;">Level A (10% Commission)</td>
                  </tr>
                </table>
              </div>

              <div style="background: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  <strong>💰 Commission Info:</strong> You'll earn <strong>10%</strong> commission on every deposit made by ${newUserName}. Encourage them to make their first deposit!
                </p>
              </div>

              <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #c2410c;">Your Referral Stats</h3>
                <p style="margin: 0; color: #9a3412; font-size: 14px;">
                  Keep sharing your referral link to earn more! Remember:<br>
                  • Level A (Direct): 10% commission<br>
                  • Level B (2nd Level): 5% commission<br>
                  • Level C (3rd Level): 3% commission
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://kinya-drive-cash.lovable.app/referrals" 
                   style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Your Referrals
                </a>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 14px;">
              <p style="margin: 0;">
                Kinya Drive Cash - Earn Daily from Taxi Investments
              </p>
              <p style="margin: 10px 0 0 0;">
                ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Referral notification email sent to referrer:", emailResponse);

    // Also notify admin
    await resend.emails.send({
      from: "Kinya Drive Cash <onboarding@resend.dev>",
      to: ["victorjoakim139@gmail.com"],
      subject: `📊 New Referral Registration - ${newUserName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Referral Registration</h2>
            <p><strong>New User:</strong> ${newUserName} (${newUserEmail})</p>
            <p><strong>Referred By:</strong> ${referrerName} (${referrerEmail})</p>
            <p><strong>Referral Code:</strong> ${referrerProfile?.referral_code}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</p>
          </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-referral-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
