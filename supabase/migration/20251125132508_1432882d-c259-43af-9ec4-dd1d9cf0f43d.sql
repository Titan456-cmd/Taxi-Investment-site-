-- Add authentication checks to increment_wallet_balance function
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id uuid, p_amount numeric, p_balance_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is modifying their own wallet or is an admin
  IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: You can only modify your own wallet';
  END IF;

  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Update the appropriate balance
  IF p_balance_type = 'deposit_balance' THEN
    UPDATE public.wallets
    SET deposit_balance = deposit_balance + p_amount
    WHERE user_id = p_user_id;
  ELSIF p_balance_type = 'withdrawal_balance' THEN
    UPDATE public.wallets
    SET withdrawal_balance = withdrawal_balance + p_amount
    WHERE user_id = p_user_id;
  ELSIF p_balance_type = 'earnings_balance' THEN
    UPDATE public.wallets
    SET earnings_balance = earnings_balance + p_amount
    WHERE user_id = p_user_id;
  ELSIF p_balance_type = 'investment_balance' THEN
    UPDATE public.wallets
    SET investment_balance = investment_balance + p_amount
    WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid balance type';
  END IF;
END;
$function$;

-- Add authentication checks to decrement_wallet_balance function
CREATE OR REPLACE FUNCTION public.decrement_wallet_balance(p_user_id uuid, p_amount numeric, p_balance_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_balance DECIMAL;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is modifying their own wallet or is an admin
  IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: You can only modify your own wallet';
  END IF;

  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Get current balance and decrement
  IF p_balance_type = 'deposit_balance' THEN
    SELECT deposit_balance INTO current_balance FROM public.wallets WHERE user_id = p_user_id;
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient deposit balance';
    END IF;
    UPDATE public.wallets SET deposit_balance = deposit_balance - p_amount WHERE user_id = p_user_id;
  ELSIF p_balance_type = 'withdrawal_balance' THEN
    SELECT withdrawal_balance INTO current_balance FROM public.wallets WHERE user_id = p_user_id;
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient withdrawal balance';
    END IF;
    UPDATE public.wallets SET withdrawal_balance = withdrawal_balance - p_amount WHERE user_id = p_user_id;
  ELSIF p_balance_type = 'earnings_balance' THEN
    SELECT earnings_balance INTO current_balance FROM public.wallets WHERE user_id = p_user_id;
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient earnings balance';
    END IF;
    UPDATE public.wallets SET earnings_balance = earnings_balance - p_amount WHERE user_id = p_user_id;
  ELSIF p_balance_type = 'investment_balance' THEN
    SELECT investment_balance INTO current_balance FROM public.wallets WHERE user_id = p_user_id;
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient investment balance';
    END IF;
    UPDATE public.wallets SET investment_balance = investment_balance - p_amount WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid balance type';
  END IF;
END;
$function$;
