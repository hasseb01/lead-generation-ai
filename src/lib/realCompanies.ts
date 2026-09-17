// Bundled dataset of real, publicly known companies — used as a reliable data source when
// live lookups (Google Places, OpenStreetMap) are unavailable or unreliable. Unlike
// mockPlaces.ts (synthetic template-generated names), every entry here is a real company;
// phone numbers and ratings are intentionally omitted rather than fabricated.

import type { RawPlace } from "./mockPlaces";

type CompanyRecord = {
  name: string;
  category: string;
  city: string;
  country: string;
  website: string | null;
};

const REAL_COMPANIES: CompanyRecord[] = [
  // --- New York City ---
  { name: "Squarespace", category: "Software Company", city: "New York City", country: "United States", website: "https://squarespace.com" },
  { name: "Datadog", category: "Software Company", city: "New York City", country: "United States", website: "https://datadoghq.com" },
  { name: "MongoDB", category: "Software Company", city: "New York City", country: "United States", website: "https://mongodb.com" },
  { name: "Justworks", category: "Software Company", city: "New York City", country: "United States", website: "https://justworks.com" },
  { name: "Codecademy", category: "Software Company", city: "New York City", country: "United States", website: "https://codecademy.com" },
  { name: "Bloomberg LP", category: "Fintech Company", city: "New York City", country: "United States", website: "https://bloomberg.com" },
  { name: "Compass", category: "Real Estate Company", city: "New York City", country: "United States", website: "https://compass.com" },
  { name: "WeWork", category: "Real Estate Company", city: "New York City", country: "United States", website: "https://wework.com" },
  { name: "Warby Parker", category: "E-commerce Company", city: "New York City", country: "United States", website: "https://warbyparker.com" },
  { name: "Casper Sleep", category: "E-commerce Company", city: "New York City", country: "United States", website: "https://casper.com" },
  { name: "Etsy", category: "E-commerce Company", city: "New York City", country: "United States", website: "https://etsy.com" },
  { name: "Skadden, Arps, Slate, Meagher & Flom", category: "Law Firm", city: "New York City", country: "United States", website: "https://skadden.com" },
  { name: "Cravath, Swaine & Moore", category: "Law Firm", city: "New York City", country: "United States", website: "https://cravath.com" },
  { name: "Sullivan & Cromwell", category: "Law Firm", city: "New York City", country: "United States", website: "https://sullcrom.com" },
  { name: "Ogilvy", category: "Marketing Agency", city: "New York City", country: "United States", website: "https://ogilvy.com" },
  { name: "McKinsey & Company", category: "Consulting Firm", city: "New York City", country: "United States", website: "https://mckinsey.com" },
  { name: "Memorial Sloan Kettering Cancer Center", category: "Healthcare Company", city: "New York City", country: "United States", website: "https://mskcc.org" },
  { name: "NBCUniversal", category: "Media Company", city: "New York City", country: "United States", website: "https://nbcuniversal.com" },
  { name: "Shake Shack", category: "Restaurant", city: "New York City", country: "United States", website: "https://shakeshack.com" },

  // --- San Francisco ---
  { name: "Salesforce", category: "Software Company", city: "San Francisco", country: "United States", website: "https://salesforce.com" },
  { name: "Stripe", category: "Fintech Company", city: "San Francisco", country: "United States", website: "https://stripe.com" },
  { name: "Airbnb", category: "Software Company", city: "San Francisco", country: "United States", website: "https://airbnb.com" },
  { name: "Uber Technologies", category: "Software Company", city: "San Francisco", country: "United States", website: "https://uber.com" },
  { name: "Dropbox", category: "Software Company", city: "San Francisco", country: "United States", website: "https://dropbox.com" },
  { name: "Pinterest", category: "Software Company", city: "San Francisco", country: "United States", website: "https://pinterest.com" },
  { name: "Block", category: "Fintech Company", city: "San Francisco", country: "United States", website: "https://squareup.com" },
  { name: "Reddit", category: "Software Company", city: "San Francisco", country: "United States", website: "https://reddit.com" },
  { name: "Wells Fargo", category: "Financial Services Company", city: "San Francisco", country: "United States", website: "https://wellsfargo.com" },
  { name: "Gap Inc.", category: "Retail Company", city: "San Francisco", country: "United States", website: "https://gapinc.com" },
  { name: "Levi Strauss & Co.", category: "Manufacturing Company", city: "San Francisco", country: "United States", website: "https://levistrauss.com" },
  { name: "Zynga", category: "Software Company", city: "San Francisco", country: "United States", website: "https://zynga.com" },
  { name: "DocuSign", category: "Software Company", city: "San Francisco", country: "United States", website: "https://docusign.com" },

  // --- Los Angeles ---
  { name: "SpaceX", category: "Manufacturing Company", city: "Los Angeles", country: "United States", website: "https://spacex.com" },
  { name: "Snap Inc.", category: "Software Company", city: "Los Angeles", country: "United States", website: "https://snap.com" },
  { name: "The Walt Disney Company", category: "Media Company", city: "Los Angeles", country: "United States", website: "https://thewaltdisneycompany.com" },
  { name: "Warner Bros. Discovery", category: "Media Company", city: "Los Angeles", country: "United States", website: "https://wbd.com" },
  { name: "Riot Games", category: "Software Company", city: "Los Angeles", country: "United States", website: "https://riotgames.com" },
  { name: "Mattel", category: "Manufacturing Company", city: "Los Angeles", country: "United States", website: "https://mattel.com" },
  { name: "Live Nation Entertainment", category: "Media Company", city: "Los Angeles", country: "United States", website: "https://livenationentertainment.com" },
  { name: "Latham & Watkins", category: "Law Firm", city: "Los Angeles", country: "United States", website: "https://lw.com" },
  { name: "Gibson, Dunn & Crutcher", category: "Law Firm", city: "Los Angeles", country: "United States", website: "https://gibsondunn.com" },

  // --- Chicago ---
  { name: "McDonald's Corporation", category: "Restaurant", city: "Chicago", country: "United States", website: "https://mcdonalds.com" },
  { name: "United Airlines Holdings", category: "Logistics Company", city: "Chicago", country: "United States", website: "https://united.com" },
  { name: "Kraft Heinz", category: "Manufacturing Company", city: "Chicago", country: "United States", website: "https://kraftheinzcompany.com" },
  { name: "Walgreens Boots Alliance", category: "Retail Company", city: "Chicago", country: "United States", website: "https://walgreensbootsalliance.com" },
  { name: "Groupon", category: "E-commerce Company", city: "Chicago", country: "United States", website: "https://groupon.com" },
  { name: "Grubhub", category: "Software Company", city: "Chicago", country: "United States", website: "https://grubhub.com" },
  { name: "Sidley Austin", category: "Law Firm", city: "Chicago", country: "United States", website: "https://sidley.com" },
  { name: "Kirkland & Ellis", category: "Law Firm", city: "Chicago", country: "United States", website: "https://kirkland.com" },

  // --- Austin ---
  { name: "Dell Technologies", category: "Manufacturing Company", city: "Austin", country: "United States", website: "https://dell.com" },
  { name: "Indeed", category: "Software Company", city: "Austin", country: "United States", website: "https://indeed.com" },
  { name: "Bumble Inc.", category: "Software Company", city: "Austin", country: "United States", website: "https://bumble.com" },
  { name: "National Instruments", category: "Manufacturing Company", city: "Austin", country: "United States", website: "https://ni.com" },
  { name: "Tesla", category: "Manufacturing Company", city: "Austin", country: "United States", website: "https://tesla.com" },
  { name: "SolarWinds", category: "Software Company", city: "Austin", country: "United States", website: "https://solarwinds.com" },

  // --- Boston ---
  { name: "HubSpot", category: "Software Company", city: "Boston", country: "United States", website: "https://hubspot.com" },
  { name: "Wayfair", category: "E-commerce Company", city: "Boston", country: "United States", website: "https://wayfair.com" },
  { name: "Moderna", category: "Healthcare Company", city: "Boston", country: "United States", website: "https://modernatx.com" },
  { name: "Akamai Technologies", category: "Software Company", city: "Boston", country: "United States", website: "https://akamai.com" },
  { name: "Fidelity Investments", category: "Financial Services Company", city: "Boston", country: "United States", website: "https://fidelity.com" },
  { name: "Biogen", category: "Healthcare Company", city: "Boston", country: "United States", website: "https://biogen.com" },
  { name: "Toast", category: "Software Company", city: "Boston", country: "United States", website: "https://toasttab.com" },
  { name: "State Street Corporation", category: "Financial Services Company", city: "Boston", country: "United States", website: "https://statestreet.com" },

  // --- Seattle ---
  { name: "Amazon", category: "E-commerce Company", city: "Seattle", country: "United States", website: "https://amazon.com" },
  { name: "Microsoft Corporation", category: "Software Company", city: "Seattle", country: "United States", website: "https://microsoft.com" },
  { name: "Starbucks Corporation", category: "Restaurant", city: "Seattle", country: "United States", website: "https://starbucks.com" },
  { name: "Costco Wholesale", category: "Retail Company", city: "Seattle", country: "United States", website: "https://costco.com" },
  { name: "Expedia Group", category: "Software Company", city: "Seattle", country: "United States", website: "https://expediagroup.com" },
  { name: "Zillow Group", category: "Real Estate Company", city: "Seattle", country: "United States", website: "https://zillow.com" },
  { name: "T-Mobile US", category: "Telecom Company", city: "Seattle", country: "United States", website: "https://t-mobile.com" },
  { name: "Redfin", category: "Real Estate Company", city: "Seattle", country: "United States", website: "https://redfin.com" },

  // --- London ---
  { name: "Deliveroo", category: "E-commerce Company", city: "London", country: "United Kingdom", website: "https://deliveroo.co.uk" },
  { name: "Monzo Bank", category: "Fintech Company", city: "London", country: "United Kingdom", website: "https://monzo.com" },
  { name: "Revolut", category: "Fintech Company", city: "London", country: "United Kingdom", website: "https://revolut.com" },
  { name: "Wise", category: "Fintech Company", city: "London", country: "United Kingdom", website: "https://wise.com" },
  { name: "Clifford Chance", category: "Law Firm", city: "London", country: "United Kingdom", website: "https://cliffordchance.com" },
  { name: "Linklaters", category: "Law Firm", city: "London", country: "United Kingdom", website: "https://linklaters.com" },
  { name: "Freshfields Bruckhaus Deringer", category: "Law Firm", city: "London", country: "United Kingdom", website: "https://freshfields.com" },
  { name: "WPP", category: "Marketing Agency", city: "London", country: "United Kingdom", website: "https://wpp.com" },
  { name: "Barclays", category: "Financial Services Company", city: "London", country: "United Kingdom", website: "https://home.barclays" },
  { name: "HSBC Holdings", category: "Financial Services Company", city: "London", country: "United Kingdom", website: "https://hsbc.com" },
  { name: "Ocado Group", category: "E-commerce Company", city: "London", country: "United Kingdom", website: "https://ocadogroup.com" },
  { name: "Google DeepMind", category: "Software Company", city: "London", country: "United Kingdom", website: "https://deepmind.google" },
  { name: "BP", category: "Energy Company", city: "London", country: "United Kingdom", website: "https://bp.com" },
  { name: "Unilever", category: "Manufacturing Company", city: "London", country: "United Kingdom", website: "https://unilever.com" },

  // --- Berlin ---
  { name: "Zalando", category: "E-commerce Company", city: "Berlin", country: "Germany", website: "https://zalando.com" },
  { name: "N26", category: "Fintech Company", city: "Berlin", country: "Germany", website: "https://n26.com" },
  { name: "Delivery Hero", category: "E-commerce Company", city: "Berlin", country: "Germany", website: "https://deliveryhero.com" },
  { name: "SoundCloud", category: "Media Company", city: "Berlin", country: "Germany", website: "https://soundcloud.com" },
  { name: "HelloFresh", category: "E-commerce Company", city: "Berlin", country: "Germany", website: "https://hellofresh.com" },
  { name: "Babbel", category: "Software Company", city: "Berlin", country: "Germany", website: "https://babbel.com" },
  { name: "Wooga", category: "Software Company", city: "Berlin", country: "Germany", website: "https://wooga.com" },
  { name: "Axel Springer", category: "Media Company", city: "Berlin", country: "Germany", website: "https://axelspringer.com" },

  // --- Paris ---
  { name: "BlaBlaCar", category: "Software Company", city: "Paris", country: "France", website: "https://blablacar.com" },
  { name: "Criteo", category: "Software Company", city: "Paris", country: "France", website: "https://criteo.com" },
  { name: "Deezer", category: "Media Company", city: "Paris", country: "France", website: "https://deezer.com" },
  { name: "L'Oréal", category: "Manufacturing Company", city: "Paris", country: "France", website: "https://loreal.com" },
  { name: "LVMH", category: "Retail Company", city: "Paris", country: "France", website: "https://lvmh.com" },
  { name: "Doctolib", category: "Software Company", city: "Paris", country: "France", website: "https://doctolib.fr" },
  { name: "Devialet", category: "Manufacturing Company", city: "Paris", country: "France", website: "https://devialet.com" },
  { name: "TotalEnergies", category: "Energy Company", city: "Paris", country: "France", website: "https://totalenergies.com" },

  // --- Ottawa / Toronto ---
  { name: "Shopify", category: "Software Company", city: "Ottawa", country: "Canada", website: "https://shopify.com" },
  { name: "Wealthsimple", category: "Fintech Company", city: "Toronto", country: "Canada", website: "https://wealthsimple.com" },
  { name: "Royal Bank of Canada", category: "Financial Services Company", city: "Toronto", country: "Canada", website: "https://rbc.com" },
  { name: "Toronto-Dominion Bank", category: "Financial Services Company", city: "Toronto", country: "Canada", website: "https://td.com" },
  { name: "Thomson Reuters", category: "Media Company", city: "Toronto", country: "Canada", website: "https://thomsonreuters.com" },
  { name: "Manulife Financial", category: "Financial Services Company", city: "Toronto", country: "Canada", website: "https://manulife.com" },

  // --- Singapore ---
  { name: "Grab Holdings", category: "Software Company", city: "Singapore", country: "Singapore", website: "https://grab.com" },
  { name: "Sea Limited", category: "E-commerce Company", city: "Singapore", country: "Singapore", website: "https://sea.com" },
  { name: "DBS Bank", category: "Financial Services Company", city: "Singapore", country: "Singapore", website: "https://dbs.com" },
  { name: "Singapore Airlines", category: "Logistics Company", city: "Singapore", country: "Singapore", website: "https://singaporeair.com" },
  { name: "Razer", category: "Manufacturing Company", city: "Singapore", country: "Singapore", website: "https://razer.com" },
  { name: "Carousell", category: "E-commerce Company", city: "Singapore", country: "Singapore", website: "https://carousell.com" },
  { name: "PropertyGuru", category: "Real Estate Company", city: "Singapore", country: "Singapore", website: "https://propertyguru.com.sg" },

  // --- Bangalore ---
  { name: "Infosys", category: "Consulting Firm", city: "Bangalore", country: "India", website: "https://infosys.com" },
  { name: "Wipro", category: "Consulting Firm", city: "Bangalore", country: "India", website: "https://wipro.com" },
  { name: "Flipkart", category: "E-commerce Company", city: "Bangalore", country: "India", website: "https://flipkart.com" },
  { name: "Swiggy", category: "E-commerce Company", city: "Bangalore", country: "India", website: "https://swiggy.com" },
  { name: "Ola", category: "Software Company", city: "Bangalore", country: "India", website: "https://olacabs.com" },
  { name: "Byju's", category: "Software Company", city: "Bangalore", country: "India", website: "https://byjus.com" },
  { name: "Biocon", category: "Healthcare Company", city: "Bangalore", country: "India", website: "https://biocon.com" },

  // --- Sydney ---
  { name: "Atlassian", category: "Software Company", city: "Sydney", country: "Australia", website: "https://atlassian.com" },
  { name: "Canva", category: "Software Company", city: "Sydney", country: "Australia", website: "https://canva.com" },
  { name: "Commonwealth Bank of Australia", category: "Financial Services Company", city: "Sydney", country: "Australia", website: "https://commbank.com.au" },
  { name: "Qantas Airways", category: "Logistics Company", city: "Sydney", country: "Australia", website: "https://qantas.com" },
  { name: "Westpac Banking Corporation", category: "Financial Services Company", city: "Sydney", country: "Australia", website: "https://westpac.com.au" },

  // --- Dubai ---
  { name: "Emirates", category: "Logistics Company", city: "Dubai", country: "United Arab Emirates", website: "https://emirates.com" },
  { name: "Careem", category: "Software Company", city: "Dubai", country: "United Arab Emirates", website: "https://careem.com" },
  { name: "Noon", category: "E-commerce Company", city: "Dubai", country: "United Arab Emirates", website: "https://noon.com" },
  { name: "DP World", category: "Logistics Company", city: "Dubai", country: "United Arab Emirates", website: "https://dpworld.com" },
  { name: "Emaar Properties", category: "Real Estate Company", city: "Dubai", country: "United Arab Emirates", website: "https://emaar.com" },
];

const CITY_ALIASES: Record<string, string> = {
  nyc: "new york city",
  "new york": "new york city",
  ny: "new york city",
  manhattan: "new york city",
  sf: "san francisco",
  "bay area": "san francisco",
  la: "los angeles",
  uk: "united kingdom",
  usa: "united states",
  us: "united states",
  uae: "united arab emirates",
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function locationMatches(userLocation: string, city: string, country: string): boolean {
  const loc = normalize(userLocation);
  const normCity = normalize(city);
  const normCountry = normalize(country);
  const aliased = CITY_ALIASES[loc] ?? loc;
  return (
    normCity.includes(loc) ||
    loc.includes(normCity) ||
    normCity.includes(aliased) ||
    normCountry.includes(loc) ||
    loc.includes(normCountry) ||
    normCountry === aliased
  );
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Every company in the requested city/country, real name and (where confident) real website —
 *  a mix of relevant and irrelevant industries, same as a real Places search, so the fit-score
 *  engine still has noise to filter out. Returns [] if the location isn't in the curated set. */
export function findRealCompanies(location: string): RawPlace[] {
  return REAL_COMPANIES.filter((c) => locationMatches(location, c.city, c.country)).map((c) => ({
    placeId: `real-${slugify(c.name)}`,
    name: c.name,
    category: c.category,
    address: `${c.city}, ${c.country}`,
    website: c.website,
    phone: null,
    rating: null,
  }));
}
