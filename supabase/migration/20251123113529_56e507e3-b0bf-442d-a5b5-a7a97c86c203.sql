-- Function to increment wallet balance
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_balance_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  END IF;
END;
$$;

-- Function to decrement wallet balance with validation
CREATE OR REPLACE FUNCTION public.decrement_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_balance_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  -- Get current balance
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
  END IF;
END;
$$;
