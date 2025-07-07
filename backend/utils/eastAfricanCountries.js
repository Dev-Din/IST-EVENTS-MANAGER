// East African Countries Configuration
// Phone number formats and validation patterns for East African countries

const EAST_AFRICAN_COUNTRIES = [
  {
    code: "KE",
    name: "Kenya",
    countryCode: "+254",
    flag: "🇰🇪",
    phoneFormat: "+254 7XX XXX XXX",
    phonePattern: /^\+254[17]\d{8}$/,
    exampleNumber: "+254 712 345 678",
    phoneLength: 13,
    currency: "KES",
    currencySymbol: "KSh",
  },
  {
    code: "UG",
    name: "Uganda",
    countryCode: "+256",
    flag: "🇺🇬",
    phoneFormat: "+256 7XX XXX XXX",
    phonePattern: /^\+256[379]\d{8}$/,
    exampleNumber: "+256 701 234 567",
    phoneLength: 13,
    currency: "UGX",
    currencySymbol: "USh",
  },
  {
    code: "TZ",
    name: "Tanzania",
    countryCode: "+255",
    flag: "🇹🇿",
    phoneFormat: "+255 7XX XXX XXX",
    phonePattern: /^\+255[67]\d{8}$/,
    exampleNumber: "+255 712 345 678",
    phoneLength: 13,
    currency: "TZS",
    currencySymbol: "TSh",
  },
  {
    code: "RW",
    name: "Rwanda",
    countryCode: "+250",
    flag: "🇷🇼",
    phoneFormat: "+250 7XX XXX XXX",
    phonePattern: /^\+250[278]\d{8}$/,
    exampleNumber: "+250 781 234 567",
    phoneLength: 13,
    currency: "RWF",
    currencySymbol: "RWF",
  },
  {
    code: "BI",
    name: "Burundi",
    countryCode: "+257",
    flag: "🇧🇮",
    phoneFormat: "+257 XX XXX XXX",
    phonePattern: /^\+257[0-9]\d{7}$/,
    exampleNumber: "+257 71 234 567",
    phoneLength: 12,
    currency: "BIF",
    currencySymbol: "FBu",
  },
  {
    code: "ET",
    name: "Ethiopia",
    countryCode: "+251",
    flag: "🇪🇹",
    phoneFormat: "+251 9XX XXX XXX",
    phonePattern: /^\+251[9]\d{8}$/,
    exampleNumber: "+251 911 234 567",
    phoneLength: 13,
    currency: "ETB",
    currencySymbol: "Br",
  },
  {
    code: "DJ",
    name: "Djibouti",
    countryCode: "+253",
    flag: "🇩🇯",
    phoneFormat: "+253 XX XX XX XX",
    phonePattern: /^\+253[0-9]\d{7}$/,
    exampleNumber: "+253 77 12 34 56",
    phoneLength: 12,
    currency: "DJF",
    currencySymbol: "Fdj",
  },
  {
    code: "SO",
    name: "Somalia",
    countryCode: "+252",
    flag: "🇸🇴",
    phoneFormat: "+252 XX XXX XXXX",
    phonePattern: /^\+252[0-9]\d{8}$/,
    exampleNumber: "+252 61 234 5678",
    phoneLength: 13,
    currency: "SOS",
    currencySymbol: "S",
  },
  {
    code: "SS",
    name: "South Sudan",
    countryCode: "+211",
    flag: "🇸🇸",
    phoneFormat: "+211 9XX XXX XXX",
    phonePattern: /^\+211[9]\d{8}$/,
    exampleNumber: "+211 912 345 678",
    phoneLength: 13,
    currency: "SSP",
    currencySymbol: "£",
  },
  {
    code: "ER",
    name: "Eritrea",
    countryCode: "+291",
    flag: "🇪🇷",
    phoneFormat: "+291 X XXX XXXX",
    phonePattern: /^\+291[0-9]\d{7}$/,
    exampleNumber: "+291 1 234 5678",
    phoneLength: 12,
    currency: "ERN",
    currencySymbol: "Nfk",
  },
];

// Default country (Kenya as it's often the regional hub)
const DEFAULT_COUNTRY = EAST_AFRICAN_COUNTRIES[0]; // Kenya

// Validation functions
const validatePhoneNumber = (phone, countryCode) => {
  if (!phone || !countryCode) return false;

  const country = EAST_AFRICAN_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return false;

  // Remove all spaces and format phone for validation
  const cleanPhone = phone.replace(/\s/g, "");

  return country.phonePattern.test(cleanPhone);
};

const formatPhoneNumber = (phone, countryCode) => {
  if (!phone || !countryCode) return phone;

  const country = EAST_AFRICAN_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return phone;

  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, "");

  // If it doesn't start with country code, add it
  if (!cleanPhone.startsWith(country.countryCode)) {
    // Remove leading zeros and add country code
    const localNumber = cleanPhone.replace(/^0+/, "");
    return `${country.countryCode}${localNumber}`;
  }

  return cleanPhone;
};

const getCountryByCode = (countryCode) => {
  return (
    EAST_AFRICAN_COUNTRIES.find((c) => c.code === countryCode) ||
    DEFAULT_COUNTRY
  );
};

const getCountryByPhone = (phone) => {
  if (!phone) return DEFAULT_COUNTRY;

  const cleanPhone = phone.replace(/\s/g, "");

  for (const country of EAST_AFRICAN_COUNTRIES) {
    if (cleanPhone.startsWith(country.countryCode)) {
      return country;
    }
  }

  return DEFAULT_COUNTRY;
};

// Event currencies for East Africa + USD (for ticket pricing)
const EVENT_CURRENCIES = [
  {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    country: "Kenya",
    flag: "🇰🇪",
    isDefault: true,
  },
  {
    code: "UGX",
    name: "Ugandan Shilling",
    symbol: "USh",
    country: "Uganda",
    flag: "🇺🇬",
  },
  {
    code: "TZS",
    name: "Tanzanian Shilling",
    symbol: "TSh",
    country: "Tanzania",
    flag: "🇹🇿",
  },
  {
    code: "RWF",
    name: "Rwandan Franc",
    symbol: "RWF",
    country: "Rwanda",
    flag: "🇷🇼",
  },
  {
    code: "ETB",
    name: "Ethiopian Birr",
    symbol: "Br",
    country: "Ethiopia",
    flag: "🇪🇹",
  },
  {
    code: "BIF",
    name: "Burundian Franc",
    symbol: "FBu",
    country: "Burundi",
    flag: "🇧🇮",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    country: "International",
    flag: "🇺🇸",
    isInternational: true,
  },
];

const DEFAULT_EVENT_CURRENCY =
  EVENT_CURRENCIES.find((c) => c.isDefault) || EVENT_CURRENCIES[0];

// Format currency for events
const formatEventCurrency = (amount, currencyCode) => {
  const currency =
    EVENT_CURRENCIES.find((c) => c.code === currencyCode) ||
    DEFAULT_EVENT_CURRENCY;
  return `${currency.symbol} ${amount.toLocaleString()}`;
};

// Get currency by code
const getCurrencyByCode = (code) => {
  return (
    EVENT_CURRENCIES.find((c) => c.code === code) || DEFAULT_EVENT_CURRENCY
  );
};

// Create a combined regex pattern for all East African countries
const EAST_AFRICAN_PHONE_PATTERN = new RegExp(
  "^(" +
    EAST_AFRICAN_COUNTRIES.map((country) =>
      country.phonePattern.source.replace("^", "").replace("$", "")
    ).join("|") +
    ")$"
);

module.exports = {
  EAST_AFRICAN_COUNTRIES,
  DEFAULT_COUNTRY,
  EVENT_CURRENCIES,
  DEFAULT_EVENT_CURRENCY,
  validatePhoneNumber,
  formatPhoneNumber,
  formatEventCurrency,
  getCountryByCode,
  getCountryByPhone,
  getCurrencyByCode,
  EAST_AFRICAN_PHONE_PATTERN,
};
