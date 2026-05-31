export const PREMIUM_OFFLINE_DAYS = 7;

const isTruthyPaid = (value: unknown) => value === true || value === 1;

export const getOfflinePremiumValidUntil = () => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + PREMIUM_OFFLINE_DAYS);
  return expiry.toISOString();
};

export const isPremiumActiveOnCurrentDevice = (profile: any) => {
  if (!profile) return false;
  if (!isTruthyPaid(profile.is_paid)) return false;
  if (!profile.expiry_date || new Date(profile.expiry_date) <= new Date()) return false;
  if (!profile.premium_offline_valid_until) return true;
  return new Date(profile.premium_offline_valid_until) > new Date();
};
