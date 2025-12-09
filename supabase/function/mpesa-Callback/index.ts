import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Safaricom M-Pesa callback IP ranges (production)
// These are the known Safaricom server IP ranges for M-Pesa callbacks
const SAFARICOM_IP_RANGES = [
  '196.201.214.',  // 196.201.214.0/24
  '196.201.212.',  // 196.201.212.0/24
  '196.201.213.',  // 196.201.213.0/24
  '196.201.215.',  // 196.201.215.0/24
  '41.215.130.',   // Alternative range
  '41.215.131.',   // Alternative range
];

// Maximum age for a pending transaction to be valid (in minutes)
const MAX_TRANSACTION_AGE_MINUTES = 30;

function isValidSafaricomIP(ip: string | null): boolean {
  if (!ip) {
    console.warn('No IP address found in request');
    return false;
  }

  // Extract the actual IP if it's behind a proxy (X-Forwarded-For can have multiple IPs)
  const actualIP = ip.split(',')[0].trim();
  
  // Check if the IP matches any Safaricom range
  const isValid = SAFARICOM_IP_RANGES.some(range => actualIP.startsWith(range));
  
  if (!isValid) {
    console.warn(`Request from non-Safaricom IP: ${actualIP}`);
  }
  
  return isValid;
}

function getClientIP(req: Request): string | null {
  // Try various headers that might contain the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Validate that request comes from Safaricom
    const clientIP = getClientIP(req);
    console.log('Callback received from IP:', clientIP);
    
    // In production, enable strict IP validation
    // For development/testing, you may temporarily disable this
    const ENABLE_IP_VALIDATION = Deno.env.get('ENABLE_MPESA_IP_VALIDATION') !== 'false';
    
    if (ENABLE_IP_VALIDATION && !isValidSafaricomIP(clientIP)) {
      console.error('SECURITY: Rejected callback from unauthorized IP:', clientIP);
      return new Response(
        JSON.stringify({ 
          ResultCode: 1, 
          ResultDesc: "Unauthorized source" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403 
        }
      );
    }

    const callbackData = await req.json();
    console.log('M-Pesa callback data received:', JSON.stringify(callbackData, null, 2));

    const { Body: { stkCallback } } = callbackData;
    const { ResultCode, ResultDesc, CheckoutRequestID, MerchantRequestID, CallbackMetadata } = stkCallback;

    console.log('Result Code:', ResultCode);
    console.log('Result Description:', ResultDesc);
    console.log('Checkout Request ID:', CheckoutRequestID);
    console.log('Merchant Request ID:', MerchantRequestID);

    // SECURITY: Validate CheckoutRequestID exists and is a recent pending transaction
    const { data: pendingTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('id, user_id, amount, created_at, status')
      .eq('checkout_request_id', CheckoutRequestID)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching pending transaction:', fetchError);
      return new Response(
        JSON.stringify({ 
          ResultCode: 1, 
          ResultDesc: "Database error" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }

    // SECURITY: Reject if no matching pending transaction found
    if (!pendingTransaction) {
      console.error('SECURITY: No pending transaction found for CheckoutRequestID:', CheckoutRequestID);
      return new Response(
        JSON.stringify({ 
          ResultCode: 1, 
          ResultDesc: "Invalid or expired checkout request" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    // SECURITY: Validate transaction age (prevent replay attacks with old CheckoutRequestIDs)
    const transactionCreatedAt = new Date(pendingTransaction.created_at);
    const now = new Date();
    const ageInMinutes = (now.getTime() - transactionCreatedAt.getTime()) / (1000 * 60);
    
    if (ageInMinutes > MAX_TRANSACTION_AGE_MINUTES) {
      console.error('SECURITY: Transaction too old:', {
        checkoutRequestId: CheckoutRequestID,
        ageInMinutes,
        maxAge: MAX_TRANSACTION_AGE_MINUTES
      });
      
      // Mark the transaction as failed due to timeout
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          description: 'Transaction expired - callback received too late',
          processed_at: new Date().toISOString()
        })
        .eq('id', pendingTransaction.id);
      
      return new Response(
        JSON.stringify({ 
          ResultCode: 1, 
          ResultDesc: "Transaction expired" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    let transactionStatus = 'pending';
    let transactionDetails: any = {
      checkoutRequestID: CheckoutRequestID,
      merchantRequestID: MerchantRequestID,
      resultDesc: ResultDesc
    };

    if (ResultCode === 0) {
      // Payment successful
      transactionStatus = 'completed';
      
      const metadata = CallbackMetadata?.Item || [];
      const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value || 0;
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value || '';
      const transactionDate = metadata.find((item: any) => item.Name === 'TransactionDate')?.Value || '';
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value || '';

      console.log('Transaction successful:', {
        amount,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber
      });

      // SECURITY: Validate amount matches the pending transaction
      if (Math.abs(parseFloat(pendingTransaction.amount) - parseFloat(amount)) > 0.01) {
        console.error('SECURITY: Amount mismatch!', {
          expectedAmount: pendingTransaction.amount,
          receivedAmount: amount,
          checkoutRequestId: CheckoutRequestID
        });
        
        // Still process but log for investigation
        // In strict mode, you might reject this entirely
      }

      transactionDetails = {
        ...transactionDetails,
        amount,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber
      };

      const userId = pendingTransaction.user_id;

      // Update transaction status
      const { error: updateTxnError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          mpesa_receipt_number: mpesaReceiptNumber,
          processed_at: new Date().toISOString()
        })
        .eq('id', pendingTransaction.id);

      if (updateTxnError) {
        console.error('Error updating transaction:', updateTxnError);
      } else {
        console.log('Transaction updated successfully');

        // Update wallet balance
        const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
          p_user_id: userId,
          p_amount: amount,
          p_balance_type: 'deposit_balance'
        });

        if (walletError) {
          console.error('Error updating wallet via RPC:', walletError);
          
          // Fallback: manual update
          const { data: wallet } = await supabase
            .from('wallets')
            .select('deposit_balance')
            .eq('user_id', userId)
            .maybeSingle();

          if (wallet) {
            await supabase
              .from('wallets')
              .update({ 
                deposit_balance: parseFloat(wallet.deposit_balance) + parseFloat(amount) 
              })
              .eq('user_id', userId);
          }
        } else {
          console.log('Wallet balance updated successfully');
        }

        // Process referral bonuses for multi-level referral system
        try {
          // Get the depositor's profile to find their referrer
          const { data: depositorProfile } = await supabase
            .from('profiles')
            .select('referred_by, full_name')
            .eq('id', userId)
            .single();

          if (depositorProfile?.referred_by) {
            const depositAmount = parseFloat(amount);
            const depositorName = depositorProfile.full_name || 'A user';
            
            // Helper function to send referral commission email
            async function sendCommissionEmail(referrerId: string, bonusAmount: number, level: string, percentage: number) {
              try {
                // Get referrer's profile and email
                const { data: referrerProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', referrerId)
                  .single();
                
                const { data: { user: referrerAuth } } = await supabase.auth.admin.getUserById(referrerId);
                
                if (referrerAuth?.email) {
                  const referrerName = referrerProfile?.full_name || 'Valued Member';
                  
                  await resend.emails.send({
                    from: "Kinya Drive Cash <onboarding@resend.dev>",
                    to: [referrerAuth.email],
                    subject: `💰 You earned KES ${bonusAmount.toLocaleString()} - ${level} Referral Commission!`,
                    html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">💰 Commission Earned!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold;">KES ${bonusAmount.toLocaleString()}</p>
                          </div>
                          
                          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                            <p style="font-size: 16px; margin-bottom: 20px;">
                              Hi <strong>${referrerName}</strong>,
                            </p>
                            
                            <p style="font-size: 16px; margin-bottom: 20px;">
                              Great news! You've just earned a referral commission from your network activity.
                            </p>

                            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
                              <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #166534;">Commission Details</h2>
                              <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Amount Earned:</td>
                                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22c55e; font-size: 18px;">KES ${bonusAmount.toLocaleString()}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Commission Level:</td>
                                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${level} (${percentage}%)</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">From:</td>
                                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${depositorName}'s deposit</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Credited To:</td>
                                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">Earnings Wallet</td>
                                </tr>
                              </table>
                            </div>

                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                              <p style="margin: 0; color: #92400e; font-size: 14px;">
                                <strong>💡 Tip:</strong> This commission is now available in your Earnings Wallet and can be withdrawn anytime!
                              </p>
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                              <a href="https://kinya-drive-cash.lovable.app/referrals" 
                                 style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                                View Referrals
                              </a>
                              <a href="https://kinya-drive-cash.lovable.app/withdraw" 
                                 style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                Withdraw Funds
                              </a>
                            </div>
                          </div>

                          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 14px;">
                            <p style="margin: 0;">Keep sharing your referral link to earn more!</p>
                            <p style="margin: 10px 0 0 0;">
                              ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT
                            </p>
                          </div>
                        </body>
                      </html>
                    `,
                  });
                  
                  console.log(`Commission email sent to ${level} referrer:`, referrerAuth.email);
                }
              } catch (emailError) {
                console.error(`Error sending ${level} commission email:`, emailError);
              }
            }
            
            // Level A: Direct referrer gets 10%
            const levelAReferrerId = depositorProfile.referred_by;
            const levelABonus = depositAmount * 0.10;
            
            console.log('Processing Level A bonus:', { referrerId: levelAReferrerId, bonus: levelABonus });
            
            // Credit Level A bonus to earnings wallet
            await supabase.rpc('increment_wallet_balance', {
              p_user_id: levelAReferrerId,
              p_amount: levelABonus,
              p_balance_type: 'earnings_balance'
            });

            // Record Level A bonus transaction
            await supabase.from('transactions').insert({
              user_id: levelAReferrerId,
              type: 'referral_bonus',
              amount: levelABonus,
              status: 'completed',
              description: `Level A referral bonus (10%) from deposit`,
              processed_at: new Date().toISOString()
            });
            
            // Send email notification for Level A
            await sendCommissionEmail(levelAReferrerId, levelABonus, 'Level A', 10);

            // Get Level A referrer's profile to find Level B referrer
            const { data: levelAProfile } = await supabase
              .from('profiles')
              .select('referred_by')
              .eq('id', levelAReferrerId)
              .single();

            if (levelAProfile?.referred_by) {
              // Level B: Second-level referrer gets 5%
              const levelBReferrerId = levelAProfile.referred_by;
              const levelBBonus = depositAmount * 0.05;
              
              console.log('Processing Level B bonus:', { referrerId: levelBReferrerId, bonus: levelBBonus });
              
              await supabase.rpc('increment_wallet_balance', {
                p_user_id: levelBReferrerId,
                p_amount: levelBBonus,
                p_balance_type: 'earnings_balance'
              });

              await supabase.from('transactions').insert({
                user_id: levelBReferrerId,
                type: 'referral_bonus',
                amount: levelBBonus,
                status: 'completed',
                description: `Level B referral bonus (5%) from deposit`,
                processed_at: new Date().toISOString()
              });
              
              // Send email notification for Level B
              await sendCommissionEmail(levelBReferrerId, levelBBonus, 'Level B', 5);

              // Get Level B referrer's profile to find Level C referrer
              const { data: levelBProfile } = await supabase
                .from('profiles')
                .select('referred_by')
                .eq('id', levelBReferrerId)
                .single();

              if (levelBProfile?.referred_by) {
                // Level C: Third-level referrer gets 3%
                const levelCReferrerId = levelBProfile.referred_by;
                const levelCBonus = depositAmount * 0.03;
                
                console.log('Processing Level C bonus:', { referrerId: levelCReferrerId, bonus: levelCBonus });
                
                await supabase.rpc('increment_wallet_balance', {
                  p_user_id: levelCReferrerId,
                  p_amount: levelCBonus,
                  p_balance_type: 'earnings_balance'
                });

                await supabase.from('transactions').insert({
                  user_id: levelCReferrerId,
                  type: 'referral_bonus',
                  amount: levelCBonus,
                  status: 'completed',
                  description: `Level C referral bonus (3%) from deposit`,
                  processed_at: new Date().toISOString()
                });
                
                // Send email notification for Level C
                await sendCommissionEmail(levelCReferrerId, levelCBonus, 'Level C', 3);
              }
            }
          }
        } catch (referralError) {
          console.error('Error processing referral bonuses:', referralError);
          // Don't fail the whole callback if referral processing fails
        }
      }
    } else {
      // Payment failed
      transactionStatus = 'failed';
      console.log('Transaction failed:', ResultDesc);

      // Update failed transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          description: ResultDesc,
          processed_at: new Date().toISOString()
        })
        .eq('id', pendingTransaction.id);

      if (updateError) {
        console.error('Error updating failed transaction:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: "Callback received successfully",
        transactionStatus,
        transactionDetails
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
