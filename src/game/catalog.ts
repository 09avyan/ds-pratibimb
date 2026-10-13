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

type NewsPreset = Omit<News, "id" | "createdAt">;
type Story = { type: News["type"]; headline: string; direction: News["direction"]; severity: number };

const economyStories: Story[] = [
  { type: "major", headline: "Loan rates fall, leaving businesses more room to grow", direction: 1, severity: 1.75 },
  { type: "major", headline: "The central bank raises loan rates", direction: -1, severity: 1.8 },
  { type: "major", headline: "Families spend more as prices settle", direction: 1, severity: 1.65 },
  { type: "major", headline: "A jump in fuel costs puts pressure on businesses", direction: -1, severity: 1.7 },
  { type: "major", headline: "The government adds money for roads and railways", direction: 1, severity: 1.7 },
  { type: "major", headline: "Investors sell shares after worries about the world economy", direction: -1, severity: 1.75 },
  { type: "minor", headline: "Factories receive more orders this month", direction: 1, severity: .62 },
  { type: "minor", headline: "Prices rise more slowly than expected", direction: 1, severity: .58 },
  { type: "minor", headline: "Delivery delays raise costs for many businesses", direction: -1, severity: .6 },
  { type: "minor", headline: "Foreign investors buy more local shares", direction: 1, severity: .58 },
  { type: "minor", headline: "Foreign investors sell local shares", direction: -1, severity: .58 },
  { type: "minor", headline: "Household spending dips this month", direction: -1, severity: .55 },
];

const sectorStories: Record<string, [Story, Story]> = {
  Banking: [
    { type: "major", headline: "Fewer bank borrowers miss loan payments", direction: 1, severity: 1.7 },
    { type: "major", headline: "More bank borrowers miss loan payments", direction: -1, severity: 1.8 },
  ],
  Technology: [
    { type: "major", headline: "Businesses increase their software budgets", direction: 1, severity: 1.75 },
    { type: "major", headline: "Businesses cut their software budgets", direction: -1, severity: 1.75 },
  ],
  Energy: [
    { type: "major", headline: "Energy companies report higher profits", direction: 1, severity: 1.7 },
    { type: "major", headline: "Energy companies report lower profits", direction: -1, severity: 1.7 },
  ],
  Telecommunications: [
    { type: "major", headline: "More people sign up for mobile plans", direction: 1, severity: 1.7 },
    { type: "major", headline: "Mobile companies lose customers this month", direction: -1, severity: 1.7 },
  ],
  Consumer: [
    { type: "major", headline: "Shoppers buy more everyday products", direction: 1, severity: 1.7 },
    { type: "major", headline: "Shoppers cut back on everyday products", direction: -1, severity: 1.7 },
  ],
  Industrial: [
    { type: "major", headline: "Builders place more orders with manufacturers", direction: 1, severity: 1.75 },
    { type: "major", headline: "New building projects are delayed", direction: -1, severity: 1.7 },
  ],
  Auto: [
    { type: "major", headline: "Car and two-wheeler sales rise", direction: 1, severity: 1.75 },
    { type: "major", headline: "Car and two-wheeler sales fall", direction: -1, severity: 1.75 },
  ],
  Healthcare: [
    { type: "major", headline: "Healthcare companies report higher sales", direction: 1, severity: 1.7 },
    { type: "major", headline: "Healthcare companies report lower sales", direction: -1, severity: 1.75 },
  ],
};

const stockStories: Record<string, { up: string; down: string }> = {
  RELIANCE: { up: "Reliance earns more from its refineries", down: "Reliance earns less from its refineries" },
  TCS: { up: "TCS wins a large software contract", down: "A major TCS client cancels its software contract" },
  HDFCBANK: { up: "More HDFC Bank borrowers repay their loans", down: "More HDFC Bank borrowers miss loan payments" },
  INFY: { up: "Infosys wins a large software contract", down: "An Infosys client cancels a large project" },
  ICICIBANK: { up: "More ICICI Bank borrowers repay their loans", down: "More ICICI Bank borrowers miss loan payments" },
  BHARTIARTL: { up: "Bharti Airtel adds many new mobile customers", down: "A network outage disrupts Bharti Airtel service" },
  ITC: { up: "ITC sells more of its everyday products", down: "ITC sales fall after a product recall" },
  LT: { up: "Larsen & Toubro wins a large construction order", down: "A Larsen & Toubro project is delayed" },
  SBIN: { up: "More State Bank of India borrowers repay loans", down: "More State Bank of India borrowers miss payments" },
  HINDUNILVR: { up: "Hindustan Unilever sells more household goods", down: "Hindustan Unilever pays more for ingredients" },
  TATAMOTORS: { up: "Tata Motors receives more vehicle orders", down: "A parts shortage slows Tata Motors production" },
  MARUTI: { up: "Maruti Suzuki receives more car bookings", down: "A factory delay holds up Maruti Suzuki cars" },
  SUNPHARMA: { up: "Sun Pharma gets approval for a new medicine", down: "A safety review delays a Sun Pharma medicine" },
  CIPLA: { up: "Cipla wins approval to sell a new medicine", down: "A safety review delays a Cipla medicine" },
  BAJFINANCE: { up: "More Bajaj Finance customers repay loans", down: "More Bajaj Finance customers miss payments" },
  AXISBANK: { up: "Axis Bank adds many new savings customers", down: "Axis Bank loses savings customers this month" },
  WIPRO: { up: "Wipro wins a large technology contract", down: "A Wipro client cancels a technology project" },
  ADANIPORTS: { up: "Adani Ports handles more cargo", down: "A delay slows cargo at Adani Ports" },
  NTPC: { up: "NTPC sells more electricity as demand rises", down: "A fuel shortage slows electricity production at NTPC" },
  ONGC: { up: "ONGC finds a new oil and gas field", down: "ONGC reports a fall in oil and gas output" },
  "M&M": { up: "Mahindra receives more vehicle orders", down: "A parts shortage slows Mahindra vehicle production" },
  TITAN: { up: "Titan sells more jewellery and watches", down: "Titan sells fewer jewellery and watches" },
  ULTRACEMCO: { up: "UltraTech receives more cement orders", down: "A fuel shortage slows UltraTech cement production" },
  DRREDDY: { up: "Dr. Reddy's gets approval for a new medicine", down: "A safety review delays a Dr. Reddy's medicine" },
  KOTAKBANK: { up: "More Kotak Bank borrowers repay their loans", down: "More Kotak Bank borrowers miss loan payments" },
  TATASTEEL: { up: "Tata Steel wins new steel orders", down: "Lower steel prices cut Tata Steel income" },
  TATACONSUM: { up: "Tata Consumer sells more food and drinks", down: "Tata Consumer pays more for ingredients" },
  APOLLOHOSP: { up: "Apollo Hospitals treats many more patients", down: "Apollo Hospitals treats fewer patients this month" },
};

const majorStockStories = new Set(["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "LT", "TATAMOTORS", "SUNPHARMA", "BAJFINANCE", "NTPC", "ONGC", "ADANIPORTS", "MARUTI", "ITC"]);
const preset = (story: Story, scope: News["scope"], sector: string, symbols?: string[]): NewsPreset => ({
  ...story,
  scope,
  sector,
  ...(symbols ? { symbols } : {}),
});

export const NEWS_PRESETS: NewsPreset[] = [
  ...economyStories.map(story => preset(story, "economy", "ALL")),
  ...Object.entries(sectorStories).flatMap(([sector, stories]) => stories.map(story => preset(story, "sector", sector))),
  ...rows.flatMap(([symbol, , sector]) => {
    const story = stockStories[symbol];
    if (!story) throw new Error(`Missing news for ${symbol}`);
    const major = majorStockStories.has(symbol);
    const type = major ? "major" : "minor";
    const severity = major ? 1.8 : .62;
    return [
      preset({ type, headline: story.up, direction: 1, severity }, "stock", sector, [symbol]),
      preset({ type, headline: story.down, direction: -1, severity }, "stock", sector, [symbol]),
    ];
  }),
];

// Historical headlines stay in the batch record. New sessions only use the
// curated catalog above; old stories are not guessed onto unrelated presets.
export const LEGACY_NEWS_PRESETS = new Map<string, NewsPreset>();

export const makeNews = (seed: number) => NEWS_PRESETS.map((news, index) => ({ ...news, id: `${seed}-${index}`, createdAt: 0 }));
