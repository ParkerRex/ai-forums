/**
 * Utility functions for country detection and flag display
 */

// Common country mappings based on location strings
const countryMappings: Record<string, string> = {
  // Direct country names
  "united states": "US",
  "usa": "US",
  "america": "US",
  "united kingdom": "GB",
  "uk": "GB",
  "england": "GB",
  "scotland": "GB",
  "wales": "GB",
  "northern ireland": "GB",
  "canada": "CA",
  "australia": "AU",
  "germany": "DE",
  "france": "FR",
  "spain": "ES",
  "italy": "IT",
  "netherlands": "NL",
  "belgium": "BE",
  "switzerland": "CH",
  "austria": "AT",
  "sweden": "SE",
  "norway": "NO",
  "denmark": "DK",
  "finland": "FI",
  "poland": "PL",
  "portugal": "PT",
  "ireland": "IE",
  "new zealand": "NZ",
  "japan": "JP",
  "china": "CN",
  "india": "IN",
  "brazil": "BR",
  "mexico": "MX",
  "argentina": "AR",
  "south africa": "ZA",
  "singapore": "SG",
  "malaysia": "MY",
  "thailand": "TH",
  "indonesia": "ID",
  "philippines": "PH",
  "vietnam": "VN",
  "south korea": "KR",
  "korea": "KR",
  "taiwan": "TW",
  "hong kong": "HK",
  "israel": "IL",
  "turkey": "TR",
  "russia": "RU",
  "ukraine": "UA",
  "czech republic": "CZ",
  "czechia": "CZ",
  "hungary": "HU",
  "romania": "RO",
  "bulgaria": "BG",
  "greece": "GR",
  "chile": "CL",
  "colombia": "CO",
  "peru": "PE",
  "venezuela": "VE",
  "egypt": "EG",
  "nigeria": "NG",
  "kenya": "KE",
  "morocco": "MA",
  "pakistan": "PK",
  "bangladesh": "BD",
  "sri lanka": "LK",
  "nepal": "NP",
  // Add more as needed
};

// City to country mappings for common cities
const cityToCountry: Record<string, string> = {
  // USA
  "new york": "US",
  "los angeles": "US",
  "chicago": "US",
  "houston": "US",
  "phoenix": "US",
  "philadelphia": "US",
  "san antonio": "US",
  "san diego": "US",
  "dallas": "US",
  "san jose": "US",
  "austin": "US",
  "san francisco": "US",
  "seattle": "US",
  "denver": "US",
  "boston": "US",
  "miami": "US",
  "atlanta": "US",
  "washington": "US",
  "portland": "US",
  "las vegas": "US",
  // Canada
  "toronto": "CA",
  "montreal": "CA",
  "vancouver": "CA",
  "ottawa": "CA",
  "calgary": "CA",
  "edmonton": "CA",
  "winnipeg": "CA",
  // UK
  "london": "GB",
  "manchester": "GB",
  "birmingham": "GB",
  "leeds": "GB",
  "glasgow": "GB",
  "edinburgh": "GB",
  "liverpool": "GB",
  "bristol": "GB",
  "cardiff": "GB",
  "belfast": "GB",
  // Germany
  "berlin": "DE",
  "hamburg": "DE",
  "munich": "DE",
  "cologne": "DE",
  "frankfurt": "DE",
  "stuttgart": "DE",
  "dusseldorf": "DE",
  // France
  "paris": "FR",
  "marseille": "FR",
  "lyon": "FR",
  "toulouse": "FR",
  "nice": "FR",
  "nantes": "FR",
  "strasbourg": "FR",
  // Australia
  "sydney": "AU",
  "melbourne": "AU",
  "brisbane": "AU",
  "perth": "AU",
  "adelaide": "AU",
  "canberra": "AU",
  // Add more cities as needed
};

// US state abbreviations to country code
const usStates = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]);

/**
 * Detect country code from location string
 * @param location - Location string (e.g., "San Francisco, CA", "London, UK")
 * @returns ISO 3166-1 alpha-2 country code or null if not detected
 */
export function detectCountryFromLocation(location?: string): string | null {
  if (!location) return null;
  
  const normalized = location.toLowerCase().trim();
  
  // Check direct country mappings
  for (const [country, code] of Object.entries(countryMappings)) {
    if (normalized.includes(country)) {
      return code;
    }
  }
  
  // Check if it ends with a US state abbreviation (e.g., "San Francisco, CA")
  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (usStates.has(lastPart)) {
      return "US";
    }
  }
  
  // Check city mappings
  for (const [city, code] of Object.entries(cityToCountry)) {
    if (normalized.includes(city)) {
      return code;
    }
  }
  
  return null;
}

/**
 * Get flag emoji from country code
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Flag emoji or null if invalid code
 */
export function getFlagEmoji(countryCode: string): string | null {
  if (!countryCode || countryCode.length !== 2) return null;
  
  const code = countryCode.toUpperCase();
  const codePoints = [...code].map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Get country name from country code
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Country name or the code itself if not found
 */
export function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    ES: "Spain",
    IT: "Italy",
    NL: "Netherlands",
    BE: "Belgium",
    CH: "Switzerland",
    AT: "Austria",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
    PL: "Poland",
    PT: "Portugal",
    IE: "Ireland",
    NZ: "New Zealand",
    JP: "Japan",
    CN: "China",
    IN: "India",
    BR: "Brazil",
    MX: "Mexico",
    AR: "Argentina",
    ZA: "South Africa",
    SG: "Singapore",
    MY: "Malaysia",
    TH: "Thailand",
    ID: "Indonesia",
    PH: "Philippines",
    VN: "Vietnam",
    KR: "South Korea",
    TW: "Taiwan",
    HK: "Hong Kong",
    IL: "Israel",
    TR: "Turkey",
    RU: "Russia",
    UA: "Ukraine",
    CZ: "Czech Republic",
    HU: "Hungary",
    RO: "Romania",
    BG: "Bulgaria",
    GR: "Greece",
    CL: "Chile",
    CO: "Colombia",
    PE: "Peru",
    VE: "Venezuela",
    EG: "Egypt",
    NG: "Nigeria",
    KE: "Kenya",
    MA: "Morocco",
    PK: "Pakistan",
    BD: "Bangladesh",
    LK: "Sri Lanka",
    NP: "Nepal",
  };
  
  return countryNames[countryCode] || countryCode;
}