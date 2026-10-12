import type { News, Stock } from "./types";

const rows: [string, string, string, string, number, number][] = [
  ["RELIANCE", "Reliance Industries", "Energy", "ril.com", 2864.5, 1.82],
  ["TCS", "Tata Consultancy Services", "Technology", "tcs.com", 3982.1, -0.64],
  ["HDFCBANK", "HDFC Bank", "Banking", "hdfcbank.com", 1721.25, 1.14],
  ["INFY", "Infosys", "Technology", "infosys.com", 1857.7, 2.33],
  ["ICICIBANK", "ICICI Bank", "Banking", "icicibank.com", 1280.4, -0.41],
  ["BHARTIARTL", "Bharti Airtel", "Telecommunications", "airtel.in", 1584.8, 1.75],
  ["ITC", "ITC", "Consumer", "itcportal.com", 468.15, -0.92],
  ["LT", "Larsen & Toubro", "Industrial", "larsentoubro.com", 3675.3, 0.95],
  ["SBIN", "State Bank of India", "Banking", "sbi.co.in", 864.4, 2.07],
  ["HINDUNILVR", "Hindustan Unilever", "Consumer", "hul.co.in", 2652.8, 0.37],
  ["TATAMOTORS", "Tata Motors", "Auto", "tatamotors.com", 972.2, -1.41],
  ["MARUTI", "Maruti Suzuki", "Auto", "marutisuzuki.com", 12642, 0.85],
  ["SUNPHARMA", "Sun Pharmaceutical", "Healthcare", "sunpharma.com", 1820.45, 1.28],
  ["CIPLA", "Cipla", "Healthcare", "cipla.com", 1471.25, -0.77],
  ["BAJFINANCE", "Bajaj Finance", "Banking", "bajajfinserv.in", 7234.9, 1.08],
  ["AXISBANK", "Axis Bank", "Banking", "axisbank.com", 1198.75, -0.29],
  ["WIPRO", "Wipro", "Technology", "wipro.com", 528.6, 0.46],
  ["ADANIPORTS", "Adani Ports", "Industrial", "adaniports.com", 1432.1, -1.12],
  ["NTPC", "NTPC", "Energy", "ntpc.co.in", 407.25, 0.64],
  ["ONGC", "ONGC", "Energy", "ongcindia.com", 298.75, 1.32],
  ["M&M", "Mahindra & Mahindra", "Auto", "mahindra.com", 2920.4, 2.06],
  ["TITAN", "Titan Company", "Consumer", "titancompany.in", 3458.8, -0.33],
  ["ULTRACEMCO", "UltraTech Cement", "Industrial", "ultratechcement.com", 11242, 0.91],
  ["DRREDDY", "Dr. Reddy’s Laboratories", "Healthcare", "drreddys.com", 1240.5, -0.58],
  ["KOTAKBANK", "Kotak Mahindra Bank", "Banking", "kotak.com", 1882.2, 0.68],
  ["TATASTEEL", "Tata Steel", "Industrial", "tatasteel.com", 174.35, -0.31],
  ["TATACONSUM", "Tata Consumer Products", "Consumer", "tataconsumer.com", 1218.4, 0.54],
  ["APOLLOHOSP", "Apollo Hospitals", "Healthcare", "apollohospitals.com", 7348.65, 1.06],
];

export const INDEX_WEIGHTS: Record<string, number> = {
  RELIANCE: .18, TCS: .15, HDFCBANK: .13, INFY: .11, ICICIBANK: .1,
  BHARTIARTL: .09, LT: .08, SBIN: .06, BAJFINANCE: .055, KOTAKBANK: .045,
};

export const makeStocks = (seed: number): Stock[] => rows.map(([symbol, name, sector, domain, price, dayMove], i) => {
  const open = price / (1 + dayMove / 100);
  const start = open * (1 + (((seed * 29 + i * 17) % 21) - 10) / 1000);
  const candles: Stock["candles"] = [];
  let prev = start;
  for (let j = 0; j < 36; j++) {
    const drift = (price - start) / 36;
    const noise = (Math.sin((j + 1) * 1.31 + i * .7 + seed) + Math.cos(j * .61 + i * .33)) * price * .0007;
    const close = Math.max(1, prev + drift + noise);
    const spread = Math.max(Math.abs(close - prev) * .45, price * .00035);
    candles.push({ time: Date.now() - (36 - j) * 1000, open: prev, high: Math.max(prev, close) + spread, low: Math.max(1, Math.min(prev, close) - spread), close, volume: 900 + i * 61 + j * 11 });
    prev = close;
  }
  const current = prev;
  return { symbol, name, sector, domain, base: price, previousClose: open, price: current, weight: INDEX_WEIGHTS[symbol] ?? 0, candles, flow: 0 };
});

const BASE_NEWS_PRESETS: Omit<News, "id" | "createdAt">[] = [
  { type: "major", sector: "Energy", symbols: ["RELIANCE", "ONGC"], headline: "Oil demand rises, lifting Reliance and ONGC sales", direction: 1, severity: 1.7 },
  { type: "major", sector: "Technology", headline: "More businesses plan to buy software", direction: 1, severity: 1.8 },
  { type: "major", sector: "Banking", headline: "More bank customers fall behind on loan payments", direction: -1, severity: 1.9 },
  { type: "major", sector: "Industrial", headline: "New road and rail projects bring more factory orders", direction: 1, severity: 1.9 },
  { type: "major", sector: "Auto", headline: "Imported car parts become more expensive", direction: -1, severity: 1.65 },
  { type: "major", sector: "Consumer", headline: "Rising prices leave shoppers with less to spend", direction: -1, severity: 1.55 },
  { type: "major", sector: "Healthcare", headline: "New medicine approvals help drug makers", direction: 1, severity: 1.65 },
  { type: "major", sector: "ALL", headline: "Stock markets fall as investors worry about the world economy", direction: -1, severity: 1.5 },
  { type: "major", sector: "Energy", symbols: ["RELIANCE", "ONGC"], headline: "New oil and gas fields are approved for Reliance and ONGC", direction: 1, severity: 1.55 },
  { type: "major", sector: "Energy", symbols: ["RELIANCE"], headline: "Fuel price rules cut Reliance's refinery profits", direction: -1, severity: 1.6 },
  { type: "major", sector: "Technology", symbols: ["TCS", "INFY", "WIPRO"], headline: "TCS, Infosys and Wipro win a large cloud-computing deal", direction: 1, severity: 1.6 },
  { type: "major", sector: "Technology", symbols: ["TCS", "INFY", "WIPRO"], headline: "Overseas clients pause projects with TCS, Infosys and Wipro", direction: -1, severity: 1.7 },
  { type: "major", sector: "Banking", headline: "Fewer customers miss their loan payments", direction: 1, severity: 1.55 },
  { type: "major", sector: "Banking", headline: "Banks pay more to get the money they lend", direction: -1, severity: 1.75 },
  { type: "major", sector: "Industrial", headline: "New rail and defence contracts bring work to manufacturers", direction: 1, severity: 1.65 },
  { type: "major", sector: "Industrial", headline: "Delays slow down large construction projects", direction: -1, severity: 1.65 },
  { type: "major", sector: "Auto", headline: "New discounts bring more buyers to electric cars", direction: 1, severity: 1.6 },
  { type: "major", sector: "Auto", headline: "A shortage of parts slows car production", direction: -1, severity: 1.7 },
  { type: "major", sector: "Consumer", headline: "A good harvest gives rural families more to spend", direction: 1, severity: 1.5 },
  { type: "major", sector: "Consumer", headline: "Higher packaging costs squeeze consumer companies", direction: -1, severity: 1.6 },
  { type: "major", sector: "Healthcare", headline: "Drug makers can sell medicines in more countries", direction: 1, severity: 1.6 },
  { type: "major", sector: "Healthcare", headline: "A safety review delays a new medicine", direction: -1, severity: 1.7 },
  { type: "major", sector: "ALL", headline: "Prices rise more slowly, raising hopes of lower loan rates", direction: 1, severity: 1.55 },
  { type: "major", sector: "ALL", headline: "Shipping delays raise costs for businesses around the world", direction: -1, severity: 1.7 },
  { type: "minor", sector: "Banking", headline: "More businesses take loans to grow", direction: 1, severity: .58 },
  { type: "minor", sector: "Auto", headline: "More families book cars for the festival season", direction: 1, severity: .62 },
  { type: "minor", sector: "Consumer", headline: "Families in smaller towns buy more everyday goods", direction: 1, severity: .55 },
  { type: "minor", sector: "Healthcare", headline: "Hospitals treat more patients this month", direction: 1, severity: .48 },
  { type: "minor", sector: "Energy", symbols: ["RELIANCE", "ONGC"], headline: "Oil prices fall, cutting income for Reliance and ONGC", direction: -1, severity: .5 },
  { type: "minor", sector: "Technology", symbols: ["TCS", "INFY", "WIPRO"], headline: "TCS, Infosys and Wipro win more overseas work", direction: 1, severity: .6 },
  { type: "minor", sector: "Industrial", headline: "Construction firms receive more orders", direction: 1, severity: .49 },
  { type: "minor", sector: "ALL", headline: "Investors sell shares after a market rally", direction: -1, severity: .4 },
  { type: "minor", sector: "Energy", symbols: ["NTPC"], headline: "Hot weather lifts electricity sales at NTPC", direction: 1, severity: .56 },
  { type: "minor", sector: "Energy", symbols: ["NTPC"], headline: "NTPC pays less for gas used to make electricity", direction: 1, severity: .48 },
  { type: "minor", sector: "Technology", symbols: ["TCS", "INFY", "WIPRO"], headline: "TCS, Infosys and Wipro win more client work", direction: 1, severity: .57 },
  { type: "minor", sector: "Technology", symbols: ["TCS", "INFY", "WIPRO"], headline: "Clients delay projects with TCS, Infosys and Wipro", direction: -1, severity: .52 },
  { type: "minor", sector: "Banking", headline: "More people use bank apps to make payments", direction: 1, severity: .54 },
  { type: "minor", sector: "Banking", headline: "Banks pay more to attract savings", direction: -1, severity: .58 },
  { type: "minor", sector: "Industrial", headline: "Factories make more goods this month", direction: 1, severity: .57 },
  { type: "minor", sector: "Industrial", headline: "Steel costs rise for manufacturers", direction: -1, severity: .55 },
  { type: "minor", sector: "Auto", headline: "Car dealers sell more popular models", direction: 1, severity: .5 },
  { type: "minor", sector: "Auto", headline: "Tyre costs rise for car makers", direction: -1, severity: .53 },
  { type: "minor", sector: "Consumer", headline: "More shoppers visit stores in smaller cities", direction: 1, severity: .56 },
  { type: "minor", sector: "Healthcare", headline: "More people choose private hospitals", direction: 1, severity: .5 },
];

const COMPANY_NEWS: Record<string, { up: string; down: string }> = {
  RELIANCE: { up: "Reliance adds capacity at an oil refinery", down: "Reliance faces delays at an oil refinery" },
  TCS: { up: "TCS wins a new software contract", down: "TCS loses a major software contract" },
  HDFCBANK: { up: "More HDFC Bank customers repay their loans", down: "More HDFC Bank customers miss loan payments" },
  INFY: { up: "Infosys wins a new software contract", down: "Infosys clients delay their projects" },
  ICICIBANK: { up: "More ICICI Bank customers repay their loans", down: "More ICICI Bank customers miss loan payments" },
  BHARTIARTL: { up: "Bharti Airtel adds more mobile customers", down: "A network outage disrupts Bharti Airtel service" },
  ITC: { up: "ITC sells more of its everyday products", down: "ITC pays more for its raw materials" },
  LT: { up: "Larsen & Toubro wins a large construction order", down: "A Larsen & Toubro project faces delays" },
  SBIN: { up: "More State Bank of India customers repay loans", down: "More State Bank of India customers miss payments" },
  HINDUNILVR: { up: "Hindustan Unilever sells more household goods", down: "Higher ingredient costs squeeze Hindustan Unilever" },
  TATAMOTORS: { up: "Tata Motors receives more car orders", down: "A parts shortage slows Tata Motors production" },
  MARUTI: { up: "Maruti Suzuki receives more car bookings", down: "Production delays hold up Maruti Suzuki cars" },
  SUNPHARMA: { up: "Sun Pharma gets approval for a new medicine", down: "A production delay holds up a Sun Pharma medicine" },
  CIPLA: { up: "Cipla sells more medicines overseas", down: "Approval delays a new Cipla medicine" },
  BAJFINANCE: { up: "More Bajaj Finance customers repay their loans", down: "More Bajaj Finance customers miss payments" },
  AXISBANK: { up: "Axis Bank adds more savings customers", down: "Axis Bank pays more to attract savings" },
  WIPRO: { up: "Wipro wins a new technology contract", down: "A Wipro client pauses a technology project" },
  ADANIPORTS: { up: "Adani Ports handles more cargo", down: "Delays slow cargo at Adani Ports" },
  NTPC: { up: "NTPC sells more electricity as demand rises", down: "NTPC pays more for fuel to make electricity" },
  ONGC: { up: "ONGC produces more oil and gas", down: "ONGC produces less oil and gas" },
  "M&M": { up: "Mahindra & Mahindra receives more vehicle orders", down: "A parts shortage slows Mahindra vehicle production" },
  TITAN: { up: "Titan sells more jewellery and watches", down: "Higher gold costs squeeze Titan sales" },
  ULTRACEMCO: { up: "UltraTech receives more cement orders", down: "Higher fuel costs squeeze UltraTech profits" },
  DRREDDY: { up: "Dr. Reddy's gets approval for a new medicine", down: "A review delays a Dr. Reddy's medicine" },
  KOTAKBANK: { up: "More Kotak Bank customers repay their loans", down: "More Kotak Bank customers miss payments" },
  TATASTEEL: { up: "Tata Steel receives more steel orders", down: "Lower steel prices cut Tata Steel income" },
  TATACONSUM: { up: "Tata Consumer sells more food and drinks", down: "Higher ingredient costs squeeze Tata Consumer" },
  APOLLOHOSP: { up: "Apollo Hospitals treats more patients", down: "Delays slow an Apollo Hospitals expansion" },
};

// These added presets keep the production catalog's indices stable while
// giving hosts a few clear market-wide and single-company headlines.
const EXTRA_NEWS_PRESETS: Omit<News, "id" | "createdAt">[] = [
  { type: "major", scope: "economy", sector: "ALL", headline: "The central bank raises rates, making loans more expensive", direction: -1, severity: 1.8 },
  { type: "major", scope: "economy", sector: "ALL", headline: "Inflation cools faster than expected", direction: 1, severity: 1.7 },
  { type: "major", scope: "economy", sector: "ALL", headline: "A weaker rupee raises costs for companies that import goods", direction: -1, severity: 1.6 },
  { type: "major", scope: "economy", sector: "ALL", headline: "The government brings forward spending on roads and railways", direction: 1, severity: 1.7 },
  { type: "minor", scope: "economy", sector: "ALL", headline: "Factories receive more new orders", direction: 1, severity: .65 },
  { type: "minor", scope: "economy", sector: "ALL", headline: "Bond yields fall after inflation comes in lower", direction: 1, severity: .58 },
  { type: "minor", scope: "economy", sector: "ALL", headline: "The trade gap widens as energy imports rise", direction: -1, severity: .62 },
  { type: "major", scope: "stock", sector: "Energy", symbols: ["RELIANCE"], headline: "Reliance earns more from fuel refining", direction: 1, severity: 1.9 },
  { type: "major", scope: "stock", sector: "Technology", symbols: ["TCS"], headline: "TCS wins a large multi-year software contract", direction: 1, severity: 1.9 },
  { type: "major", scope: "stock", sector: "Banking", symbols: ["HDFCBANK"], headline: "HDFC Bank reports growth in deposits and loans", direction: 1, severity: 1.8 },
  { type: "minor", scope: "stock", sector: "Technology", symbols: ["INFY"], headline: "Infosys expands a delivery centre to take on more work", direction: 1, severity: .7 },
];

export const NEWS_PRESETS: Omit<News, "id" | "createdAt">[] = [
  ...BASE_NEWS_PRESETS.map(news => ({ ...news, scope: news.symbols?.length ? "stock" as const : news.sector === "ALL" ? "economy" as const : "sector" as const })),
  ...EXTRA_NEWS_PRESETS,
  ...rows.flatMap(([symbol, , sector]) => {
    const news = COMPANY_NEWS[symbol];
    return [
      { type: "minor" as const, scope: "stock" as const, sector, symbols: [symbol], headline: news.up, direction: 1 as const, severity: .62 },
      { type: "minor" as const, scope: "stock" as const, sector, symbols: [symbol], headline: news.down, direction: -1 as const, severity: .62 },
    ];
  }),
];

const LEGACY_BASE_HEADLINES = [
  "Energy majors rally on a sharp rise in global crude demand",
  "Global technology spending outlook improves after strong earnings",
  "Central bank signals tighter liquidity in a surprise policy note",
  "New infrastructure package lifts capital goods outlook",
  "Import policy shift puts pressure on auto sector margins",
  "Inflation surprise sparks a broad consumer stocks repricing",
  "New medicine approvals brighten healthcare earnings outlook",
  "Global equity markets turn cautious after a sudden risk-off shift",
  "Fresh offshore exploration awards lift domestic producers",
  "Fuel-price controls squeeze refiners as input costs climb",
  "A multi-year cloud contract boosts India's IT outlook",
  "Overseas clients pause discretionary technology projects",
  "Credit quality improves as lenders report fewer bad loans",
  "Higher funding costs put pressure on bank margins",
  "Rail and defence orders add to the manufacturing pipeline",
  "Key infrastructure projects face fresh execution delays",
  "Electric-vehicle demand accelerates after new charging incentives",
  "A component shortage disrupts vehicle production schedules",
  "A strong harvest improves rural spending expectations",
  "Packaging and commodity costs rise across consumer brands",
  "New export clearances open a larger market for drug makers",
  "A regulatory review delays a key pharmaceutical launch",
  "Cooling inflation lifts expectations for an easier rate path",
  "A global shipping disruption renews investor caution",
  "Banks report steady credit growth as lending expands",
  "Automakers report firmer-than-expected festival bookings",
  "Consumer brands note a gradual improvement in rural demand",
  "Defensive buying brings fresh interest to healthcare shares",
  "Energy prices ease on signs of firmer global supply",
  "IT exporters gain after a supportive currency move",
  "Construction activity indicators remain resilient",
  "Investors book modest gains after a steady morning session",
  "Power demand rises ahead of an expected warm spell",
  "A softer natural-gas price eases operating costs",
  "Rupee movement offers a small tailwind to exporters",
  "Hiring plans remain measured across IT services",
  "Digital payments volumes reach a new monthly high",
  "Lenders compete more aggressively for retail deposits",
  "Factory activity expands for a second consecutive month",
  "Steel input prices edge higher in the spot market",
  "Dealers report shorter waiting periods for popular models",
  "Tyre and battery costs tick higher this quarter",
  "Retail footfall improves in smaller cities",
  "Hospitals see steady growth in elective procedures",
];

export const LEGACY_NEWS_PRESETS = new Map<string, Omit<News, "id" | "createdAt">>();
LEGACY_BASE_HEADLINES.forEach((headline, index) => {
  const replacement = NEWS_PRESETS[index];
  if (replacement) LEGACY_NEWS_PRESETS.set(headline, replacement);
});
LEGACY_NEWS_PRESETS.set("Investors book profits after the morning rally", NEWS_PRESETS[31]);
rows.forEach(([, name], rowIndex) => {
  const replacementIndex = BASE_NEWS_PRESETS.length + EXTRA_NEWS_PRESETS.length + rowIndex * 2;
  const replacementUp = NEWS_PRESETS[replacementIndex];
  const replacementDown = NEWS_PRESETS[replacementIndex + 1];
  if (replacementUp) LEGACY_NEWS_PRESETS.set(`${name} raises its outlook after a strong company update`, replacementUp);
  if (replacementDown) LEGACY_NEWS_PRESETS.set(`${name} trims its outlook after a setback in its latest update`, replacementDown);
});

export const makeNews = (seed: number) => NEWS_PRESETS.map((n, i) => ({ ...n, id: `${seed}-${i}`, createdAt: 0 }));
