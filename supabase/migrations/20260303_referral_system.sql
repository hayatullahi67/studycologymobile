-- 1. Update users table with referral fields
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS referral_balance NUMERIC DEFAULT 0;

-- 2. Create referrals table to track relationships and status
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.users(id),
    referee_id UUID NOT NULL REFERENCES public.users(id) UNIQUE,
    has_paid BOOLEAN DEFAULT FALSE,
    commission_earned NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create payout_requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
    bank_details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Referrals
-- Referrers can view their own referrals
CREATE POLICY "Users can view their own referrals" 
ON public.referrals FOR SELECT 
TO authenticated 
USING (auth.uid() = referrer_id);

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals" 
ON public.referrals FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 6. RLS Policies for Payout Requests
-- Users can view their own payout requests
CREATE POLICY "Users can view their own payout requests" 
ON public.payout_requests FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can create their own payout requests
CREATE POLICY "Users can create their own payout requests" 
ON public.payout_requests FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all payout requests
CREATE POLICY "Admins can manage all payout requests" 
ON public.payout_requests FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 9. RLS Policies for users table (if not already set)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all users" 
ON public.users FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 7. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payout_requests_updated_at BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Trigger to automatically credit referral commission when a user is paid
CREATE OR REPLACE FUNCTION public.handle_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
    referrer_record RECORD;
BEGIN
    -- Check if is_paid changed from false to true
    IF (OLD.is_paid = false AND NEW.is_paid = true) THEN
        -- Find if this user was referred
        SELECT * INTO referrer_record FROM public.referrals WHERE referee_id = NEW.id AND has_paid = false;
        
        IF FOUND THEN
            -- 1. Update the referral record
            UPDATE public.referrals 
            SET has_paid = true, commission_earned = 500, updated_at = NOW()
            WHERE id = referrer_record.id;
            
            -- 2. Increment the referrer's balance
            UPDATE public.users
            SET referral_balance = COALESCE(referral_balance, 0) + 500
            WHERE id = referrer_record.referrer_id;
            
            RAISE NOTICE 'Commission credited for referral: %', referrer_record.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_paid_commission
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_referral_commission();
-- 10. RLS Policy to allow users to see who they referred
CREATE POLICY "Users can view their referees" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = referred_by);
