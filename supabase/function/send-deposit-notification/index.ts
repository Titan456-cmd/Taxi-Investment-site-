import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DepositNotificationRequest {
  userId: string;
  amount: number;
  phoneNumber: string;
  transactionId: string;
  depositMethod: "stk_push" | "manual";
  mpesaCode?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, 
      amount, 
      phoneNumber, 
      transactionId,
      depositMethod,
      mpesaCode 
    }: DepositNotificationRequest = await req.json();

    // Get user details from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, phone_number")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user details");
    }

    const userName = profile?.full_name || "User";
    const userPhone = profile?.phone_number || "N/A";
    const methodLabel = depositMethod === "stk_push" ? "STK Push (Instant)" : "Manual Paybill";

    // Send email to admin
    const emailResponse = await resend.emails.send({
      from: "Vitech Taxi Investment <onboarding@resend.dev>",
      to: ["victorjoakim139@gmail.com"],
      subject: `💵 New Deposit Submission - KES ${amount.toLocaleString()}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Deposit Submission</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">💵 New Deposit Submission</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">A user has submitted a deposit</p>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #10b981;">Deposit Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Amount:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #10b981;">KES ${amount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Transaction ID:</td>
                    <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 14px;">${transactionId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Method:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${methodLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Phone Number:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${phoneNumber}</td>
                  </tr>
                  ${mpesaCode ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">M-Pesa Code:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #059669; font-family: monospace;">${mpesaCode}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #10b981;">User Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Name:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${userName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Phone:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${userPhone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User ID:</td>
                    <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${userId}</td>
                  </tr>
                </table>
              </div>

              ${depositMethod === "manual" ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⚠️ Verification Required:</strong> This is a manual deposit submission. Please verify the M-Pesa transaction code before approving.
                </p>
              </div>
              ` : `
              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>ℹ️ STK Push:</strong> This deposit was initiated via STK Push. Wait for M-Pesa callback confirmation before crediting the account.
                </p>
              </div>
              `}

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://vitech-agency.rf.gd/admin" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Open Admin Dashboard
                </a>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 14px;">
              <p style="margin: 0;">
                This is an automated notification from Vitech Taxi Investment Platform
              </p>
              <p style="margin: 10px 0 0 0;">
                Timestamp: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Deposit notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-deposit-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
