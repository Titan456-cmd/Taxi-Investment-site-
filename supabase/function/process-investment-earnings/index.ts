import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Minimum interval between earnings in milliseconds (55 minutes to account for timing variations)
const MIN_EARNING_INTERVAL_MS = 55 * 60 * 1000;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authorization check - verify cron secret
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    if (!expectedSecret) {
      console.error('CRON_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error('Unauthorized: Invalid or missing cron secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Authorization passed, starting investment earnings processing...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const now = new Date();

    // Get all active investments
    const { data: investments, error: investmentsError } = await supabaseClient
      .from('investments')
      .select('*')
      .eq('status', 'active');

    if (investmentsError) {
      console.error('Error fetching investments:', investmentsError);
      throw investmentsError;
    }

    console.log(`Found ${investments?.length || 0} active investments`);

    let processedCount = 0;
    let completedCount = 0;
    let skippedCount = 0;

    for (const investment of investments || []) {
      const startDate = new Date(investment.start_date);
      const maturityDate = new Date(investment.maturity_date);
      const lastEarningDate = investment.last_earning_date 
        ? new Date(investment.last_earning_date) 
        : startDate;

      // Check if investment has matured
      if (now >= maturityDate) {
        console.log(`Investment ${investment.id} has matured, marking as completed`);
        
        await supabaseClient
          .from('investments')
          .update({ 
            status: 'completed',
            days_completed: investment.total_days 
          })
          .eq('id', investment.id);
        
        completedCount++;
        continue;
      }

      // Idempotency check - ensure minimum interval since last earning
      const timeSinceLastEarning = now.getTime() - lastEarningDate.getTime();
      
      if (timeSinceLastEarning < MIN_EARNING_INTERVAL_MS) {
        console.log(`Investment ${investment.id} - Only ${Math.floor(timeSinceLastEarning / 60000)} minutes since last earning, skipping (min: 55 min)`);
        skippedCount++;
        continue;
      }

      // Calculate how many hours worth of earnings to credit
      const hoursSinceLastEarning = timeSinceLastEarning / (1000 * 60 * 60);
      const hoursToCredit = Math.floor(hoursSinceLastEarning);
      
      if (hoursToCredit < 1) {
        console.log(`Investment ${investment.id} - Less than 1 hour since last earning, skipping`);
        skippedCount++;
        continue;
      }

      const hourlyEarning = investment.daily_earning / 24;
      const earningsToCredit = hourlyEarning * hoursToCredit;

      console.log(`Investment ${investment.id}:`, {
        hoursSinceLastEarning: hoursSinceLastEarning.toFixed(2),
        hoursToCredit,
        hourlyEarning: hourlyEarning.toFixed(4),
        earningsToCredit: earningsToCredit.toFixed(4)
      });

      // Credit earnings to user's earnings_balance
      const { error: walletError } = await supabaseClient.rpc(
        'increment_wallet_balance',
        {
          p_user_id: investment.user_id,
          p_amount: earningsToCredit,
          p_balance_type: 'earnings_balance'
        }
      );

      if (walletError) {
        console.error(`Error updating wallet for investment ${investment.id}:`, walletError);
        continue;
      }

      // Update investment record with new last_earning_date
      const totalEarned = investment.total_earned + earningsToCredit;
      const hoursCompleted = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      const daysCompleted = Math.floor(hoursCompleted / 24);

      const { error: investmentUpdateError } = await supabaseClient
        .from('investments')
        .update({
          last_earning_date: now.toISOString(),
          total_earned: totalEarned,
          days_completed: Math.min(daysCompleted, investment.total_days)
        })
        .eq('id', investment.id);

      if (investmentUpdateError) {
        console.error(`Error updating investment ${investment.id}:`, investmentUpdateError);
        continue;
      }

      // Create transaction record for audit trail
      await supabaseClient
        .from('transactions')
        .insert({
          user_id: investment.user_id,
          type: 'earning',
          amount: earningsToCredit,
          status: 'completed',
          description: `Hourly earnings from ${investment.plan_name} investment`,
          processed_at: now.toISOString()
        });

      processedCount++;
      console.log(`Successfully processed investment ${investment.id}, credited ${earningsToCredit.toFixed(4)} KES`);
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      totalInvestments: investments?.length || 0,
      processedCount,
      completedCount,
      skippedCount,
      message: `Processed ${processedCount} investments, marked ${completedCount} as completed, skipped ${skippedCount}`
    };

    console.log('Processing complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in process-investment-earnings:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
