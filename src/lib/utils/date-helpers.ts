/**
 * Age calculation utilities
 */

/**
 * Calculate age from birth date to current date
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Check if date is within recent hire window (last N days)
 */
export function isRecentHire(startDate: Date, windowDays: number): boolean {
  const today = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);

  return new Date(startDate) >= cutoffDate;
}

/**
 * Format date to locale string
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

/**
 * Format currency/salary
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
