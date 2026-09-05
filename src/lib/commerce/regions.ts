/** Delivery destinations offered at checkout. */
export const COUNTRIES = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GH', name: 'Ghana' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
] as const;

/**
 * Nigerian states. Lagos is split into Island and Mainland because the
 * seeded shipping zones price them differently.
 */
export const NIGERIAN_STATES = [
  'Lagos Island', 'Lagos Mainland', 'Ikoyi', 'Victoria Island', 'Lekki', 'Eti-Osa',
  'Ikeja', 'Yaba', 'Surulere', 'Alimosho',
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
] as const;
