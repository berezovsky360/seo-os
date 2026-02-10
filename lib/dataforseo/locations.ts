/**
 * DataForSEO Location & Language Codes
 *
 * Each entry represents a (location, language) pair supported by DataForSEO.
 * Grouped by location_code for easy lookup.
 */

export interface DFSLocation {
  code: number
  name: string
  iso: string
  type: 'Country' | 'Region'
  languages: { name: string; code: string }[]
}

/** Convert ISO country code to flag emoji */
export function isoToFlag(iso: string): string {
  const codePoints = iso
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

/** All DataForSEO locations with their available languages */
export const DFS_LOCATIONS: DFSLocation[] = [
  { code: 2008, name: 'Albania', iso: 'AL', type: 'Country', languages: [{ name: 'Albanian', code: 'sq' }] },
  { code: 2012, name: 'Algeria', iso: 'DZ', type: 'Country', languages: [{ name: 'French', code: 'fr' }, { name: 'Arabic', code: 'ar' }] },
  { code: 2024, name: 'Angola', iso: 'AO', type: 'Country', languages: [{ name: 'Portuguese', code: 'pt' }] },
  { code: 2031, name: 'Azerbaijan', iso: 'AZ', type: 'Country', languages: [{ name: 'Azeri', code: 'az' }] },
  { code: 2032, name: 'Argentina', iso: 'AR', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2036, name: 'Australia', iso: 'AU', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2040, name: 'Austria', iso: 'AT', type: 'Country', languages: [{ name: 'German', code: 'de' }] },
  { code: 2048, name: 'Bahrain', iso: 'BH', type: 'Country', languages: [{ name: 'Arabic', code: 'ar' }] },
  { code: 2050, name: 'Bangladesh', iso: 'BD', type: 'Country', languages: [{ name: 'Bengali', code: 'bn' }] },
  { code: 2051, name: 'Armenia', iso: 'AM', type: 'Country', languages: [{ name: 'Armenian', code: 'hy' }] },
  { code: 2056, name: 'Belgium', iso: 'BE', type: 'Country', languages: [{ name: 'French', code: 'fr' }, { name: 'Dutch', code: 'nl' }, { name: 'German', code: 'de' }] },
  { code: 2068, name: 'Bolivia', iso: 'BO', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2070, name: 'Bosnia and Herzegovina', iso: 'BA', type: 'Country', languages: [{ name: 'Bosnian', code: 'bs' }] },
  { code: 2076, name: 'Brazil', iso: 'BR', type: 'Country', languages: [{ name: 'Portuguese', code: 'pt' }] },
  { code: 2100, name: 'Bulgaria', iso: 'BG', type: 'Country', languages: [{ name: 'Bulgarian', code: 'bg' }] },
  { code: 2104, name: 'Myanmar (Burma)', iso: 'MM', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2116, name: 'Cambodia', iso: 'KH', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2120, name: 'Cameroon', iso: 'CM', type: 'Country', languages: [{ name: 'French', code: 'fr' }] },
  { code: 2124, name: 'Canada', iso: 'CA', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'French', code: 'fr' }] },
  { code: 2144, name: 'Sri Lanka', iso: 'LK', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2152, name: 'Chile', iso: 'CL', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2158, name: 'Taiwan', iso: 'TW', type: 'Region', languages: [{ name: 'Chinese (Traditional)', code: 'zh-TW' }] },
  { code: 2170, name: 'Colombia', iso: 'CO', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2188, name: 'Costa Rica', iso: 'CR', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2191, name: 'Croatia', iso: 'HR', type: 'Country', languages: [{ name: 'Croatian', code: 'hr' }] },
  { code: 2196, name: 'Cyprus', iso: 'CY', type: 'Country', languages: [{ name: 'Greek', code: 'el' }, { name: 'English', code: 'en' }] },
  { code: 2203, name: 'Czechia', iso: 'CZ', type: 'Country', languages: [{ name: 'Czech', code: 'cs' }] },
  { code: 2208, name: 'Denmark', iso: 'DK', type: 'Country', languages: [{ name: 'Danish', code: 'da' }] },
  { code: 2218, name: 'Ecuador', iso: 'EC', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2222, name: 'El Salvador', iso: 'SV', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2233, name: 'Estonia', iso: 'EE', type: 'Country', languages: [{ name: 'Estonian', code: 'et' }] },
  { code: 2246, name: 'Finland', iso: 'FI', type: 'Country', languages: [{ name: 'Finnish', code: 'fi' }] },
  { code: 2250, name: 'France', iso: 'FR', type: 'Country', languages: [{ name: 'French', code: 'fr' }] },
  { code: 2276, name: 'Germany', iso: 'DE', type: 'Country', languages: [{ name: 'German', code: 'de' }] },
  { code: 2288, name: 'Ghana', iso: 'GH', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2300, name: 'Greece', iso: 'GR', type: 'Country', languages: [{ name: 'Greek', code: 'el' }, { name: 'English', code: 'en' }] },
  { code: 2320, name: 'Guatemala', iso: 'GT', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2344, name: 'Hong Kong', iso: 'HK', type: 'Region', languages: [{ name: 'English', code: 'en' }, { name: 'Chinese (Traditional)', code: 'zh-TW' }] },
  { code: 2348, name: 'Hungary', iso: 'HU', type: 'Country', languages: [{ name: 'Hungarian', code: 'hu' }] },
  { code: 2356, name: 'India', iso: 'IN', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'Hindi', code: 'hi' }] },
  { code: 2360, name: 'Indonesia', iso: 'ID', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'Indonesian', code: 'id' }] },
  { code: 2372, name: 'Ireland', iso: 'IE', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2376, name: 'Israel', iso: 'IL', type: 'Country', languages: [{ name: 'Hebrew', code: 'he' }, { name: 'Arabic', code: 'ar' }] },
  { code: 2380, name: 'Italy', iso: 'IT', type: 'Country', languages: [{ name: 'Italian', code: 'it' }] },
  { code: 2384, name: "Cote d'Ivoire", iso: 'CI', type: 'Country', languages: [{ name: 'French', code: 'fr' }] },
  { code: 2392, name: 'Japan', iso: 'JP', type: 'Country', languages: [{ name: 'Japanese', code: 'ja' }] },
  { code: 2398, name: 'Kazakhstan', iso: 'KZ', type: 'Country', languages: [{ name: 'Russian', code: 'ru' }] },
  { code: 2400, name: 'Jordan', iso: 'JO', type: 'Country', languages: [{ name: 'Arabic', code: 'ar' }] },
  { code: 2404, name: 'Kenya', iso: 'KE', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2410, name: 'South Korea', iso: 'KR', type: 'Country', languages: [{ name: 'Korean', code: 'ko' }] },
  { code: 2428, name: 'Latvia', iso: 'LV', type: 'Country', languages: [{ name: 'Latvian', code: 'lv' }] },
  { code: 2440, name: 'Lithuania', iso: 'LT', type: 'Country', languages: [{ name: 'Lithuanian', code: 'lt' }] },
  { code: 2458, name: 'Malaysia', iso: 'MY', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'Malay', code: 'ms' }] },
  { code: 2470, name: 'Malta', iso: 'MT', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2484, name: 'Mexico', iso: 'MX', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2492, name: 'Monaco', iso: 'MC', type: 'Country', languages: [{ name: 'French', code: 'fr' }] },
  { code: 2498, name: 'Moldova', iso: 'MD', type: 'Country', languages: [{ name: 'Romanian', code: 'ro' }] },
  { code: 2504, name: 'Morocco', iso: 'MA', type: 'Country', languages: [{ name: 'Arabic', code: 'ar' }, { name: 'French', code: 'fr' }] },
  { code: 2528, name: 'Netherlands', iso: 'NL', type: 'Country', languages: [{ name: 'Dutch', code: 'nl' }] },
  { code: 2554, name: 'New Zealand', iso: 'NZ', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2558, name: 'Nicaragua', iso: 'NI', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2566, name: 'Nigeria', iso: 'NG', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2578, name: 'Norway', iso: 'NO', type: 'Country', languages: [{ name: 'Norwegian (Bokmål)', code: 'nb' }] },
  { code: 2586, name: 'Pakistan', iso: 'PK', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'Urdu', code: 'ur' }] },
  { code: 2591, name: 'Panama', iso: 'PA', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2600, name: 'Paraguay', iso: 'PY', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2604, name: 'Peru', iso: 'PE', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2608, name: 'Philippines', iso: 'PH', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'Tagalog', code: 'tl' }] },
  { code: 2616, name: 'Poland', iso: 'PL', type: 'Country', languages: [{ name: 'Polish', code: 'pl' }] },
  { code: 2620, name: 'Portugal', iso: 'PT', type: 'Country', languages: [{ name: 'Portuguese', code: 'pt' }] },
  { code: 2642, name: 'Romania', iso: 'RO', type: 'Country', languages: [{ name: 'Romanian', code: 'ro' }] },
  { code: 2643, name: 'Russia', iso: 'RU', type: 'Country', languages: [{ name: 'Russian', code: 'ru' }] },
  { code: 2682, name: 'Saudi Arabia', iso: 'SA', type: 'Country', languages: [{ name: 'Arabic', code: 'ar' }] },
  { code: 2686, name: 'Senegal', iso: 'SN', type: 'Country', languages: [{ name: 'French', code: 'fr' }] },
  { code: 2688, name: 'Serbia', iso: 'RS', type: 'Country', languages: [{ name: 'Serbian', code: 'sr' }] },
  { code: 2702, name: 'Singapore', iso: 'SG', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'Chinese (Simplified)', code: 'zh-CN' }] },
  { code: 2703, name: 'Slovakia', iso: 'SK', type: 'Country', languages: [{ name: 'Slovak', code: 'sk' }] },
  { code: 2704, name: 'Vietnam', iso: 'VN', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'Vietnamese', code: 'vi' }] },
  { code: 2705, name: 'Slovenia', iso: 'SI', type: 'Country', languages: [{ name: 'Slovenian', code: 'sl' }] },
  { code: 2710, name: 'South Africa', iso: 'ZA', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2724, name: 'Spain', iso: 'ES', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2752, name: 'Sweden', iso: 'SE', type: 'Country', languages: [{ name: 'Swedish', code: 'sv' }] },
  { code: 2756, name: 'Switzerland', iso: 'CH', type: 'Country', languages: [{ name: 'German', code: 'de' }, { name: 'French', code: 'fr' }, { name: 'Italian', code: 'it' }] },
  { code: 2764, name: 'Thailand', iso: 'TH', type: 'Country', languages: [{ name: 'Thai', code: 'th' }] },
  { code: 2784, name: 'United Arab Emirates', iso: 'AE', type: 'Country', languages: [{ name: 'Arabic', code: 'ar' }, { name: 'English', code: 'en' }] },
  { code: 2788, name: 'Tunisia', iso: 'TN', type: 'Country', languages: [{ name: 'Arabic', code: 'ar' }] },
  { code: 2792, name: 'Turkiye', iso: 'TR', type: 'Country', languages: [{ name: 'Turkish', code: 'tr' }] },
  { code: 2804, name: 'Ukraine', iso: 'UA', type: 'Country', languages: [{ name: 'Ukrainian', code: 'uk' }, { name: 'Russian', code: 'ru' }] },
  { code: 2807, name: 'North Macedonia', iso: 'MK', type: 'Country', languages: [{ name: 'Macedonian', code: 'mk' }] },
  { code: 2818, name: 'Egypt', iso: 'EG', type: 'Country', languages: [{ name: 'Arabic', code: 'ar' }, { name: 'English', code: 'en' }] },
  { code: 2826, name: 'United Kingdom', iso: 'GB', type: 'Country', languages: [{ name: 'English', code: 'en' }] },
  { code: 2840, name: 'United States', iso: 'US', type: 'Country', languages: [{ name: 'English', code: 'en' }, { name: 'Spanish', code: 'es' }] },
  { code: 2854, name: 'Burkina Faso', iso: 'BF', type: 'Country', languages: [{ name: 'French', code: 'fr' }] },
  { code: 2858, name: 'Uruguay', iso: 'UY', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
  { code: 2862, name: 'Venezuela', iso: 'VE', type: 'Country', languages: [{ name: 'Spanish', code: 'es' }] },
]

/** Fast lookup by location code */
export const DFS_LOCATION_MAP = new Map(DFS_LOCATIONS.map(loc => [loc.code, loc]))

/** Get location by code */
export function getLocation(code: number): DFSLocation | undefined {
  return DFS_LOCATION_MAP.get(code)
}
