import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// M-Pesa Daraja API Credentials from environment variables
const MPESA_CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY');
const MPESA_CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET');
const MPESA_BUSINESS_SHORTCODE = "174379"; // Test shortcode, replace with your business shortcode
const MPESA_PASSKEY = Deno.env.get('MPESA_PASSKEY');
const MPESA_CALLBACK_URL = Deno.env.get('MPESA_CALLBACK_URL');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount } = await req.json();

    console.log('Processing M-Pesa STK Push request:', { phoneNumber, amount });

    // Validate input presence
    if (!phoneNumber || amount === undefined || amount === null) {
      return new Response(
        JSON.stringify({ error: 'Phone number and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount is a number and within allowed range (10 KES to 150,000 KES)
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 10 || numAmount > 150000) {
      console.error('Invalid amount:', amount);
      return new Response(
        JSON.stringify({ error: 'Amount must be between 10 and 150,000 KES' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format (Kenyan mobile numbers)
    // Accepts: 07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXX, +254XXXXXXXX
    const phoneStr = String(phoneNumber).replace(/\s+/g, '');
    const kenyanPhoneRegex = /^(?:254|\+254|0)?([17]\d{8})$/;
    if (!kenyanPhoneRegex.test(phoneStr)) {
      console.error('Invalid phone number format:', phoneNumber);
      return new Response(
        JSON.stringify({ error: 'Please enter a valid Kenyan phone number (e.g., 0712345678)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Get Access Token
    const authString = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
    const authResponse = await fetch(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
        },
      }
    );

    if (!authResponse.ok) {
      throw new Error('Failed to get M-Pesa access token');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    console.log('M-Pesa access token obtained');

    // Step 2: Generate Timestamp and Password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = btoa(`${MPESA_BUSINESS_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);

    // Format phone number (remove leading 0 or +254, then add 254)
    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('254')) {
      formattedPhone = formattedPhone;
    } else {
      formattedPhone = '254' + formattedPhone;
    }

    // Step 3: Initiate STK Push
    const stkPushPayload = {
      BusinessShortCode: MPESA_BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: MPESA_BUSINESS_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: 'DEPOSIT',
      TransactionDesc: 'Deposit to account',
    };

    console.log('Initiating STK Push with payload:', { ...stkPushPayload, Password: '***' });

    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPushPayload),
      }
    );

    const stkData = await stkResponse.json();

    console.log('STK Push response:', stkData);

    if (!stkResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initiate M-Pesa payment',
          details: stkData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Please enter your M-Pesa PIN on your phone to complete the payment',
        checkoutRequestID: stkData.CheckoutRequestID,
        merchantRequestID: stkData.MerchantRequestID,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in M-Pesa STK Push function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
