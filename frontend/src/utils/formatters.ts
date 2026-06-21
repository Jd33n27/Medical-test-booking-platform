/**
 * Formats a number to Nigerian Naira (NGN) format (e.g. ₦5,500)
 */
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('NGN', '₦').trim();
};

/**
 * Formats an ISO date string or Date object to a readable date (e.g. June 21, 2026)
 */
export const formatDateString = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};
