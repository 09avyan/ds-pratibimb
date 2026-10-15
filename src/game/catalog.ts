import type { News, Stock } from "./types";

// Closing-price snapshot: NSE India, 15-Oct-2026 15:30 IST. Wipro close is Yahoo Finance for the same date.
const rows: [string, string, string, string, number, number][] = [
  ["RELIANCE", "Reliance Industries", "Energy", "ril.com", 1215, 3.44],
  ["TCS", "Tata Consultancy Services", "Technology", "tcs.com", 2350, 1.96],
  ["HDFCBANK", "HDFC Bank", "Banking", "hdfcbank.com", 727, 2.27],
  ["INFY", "Infosys", "Technology", "infosys.com", 1110, 2.02],
  ["ICICIBANK", "ICICI Bank", "Banking", "icicibank.com", 1389, 3.8],
  ["BHARTIARTL", "Bharti Airtel", "Telecommunications", "airtel.in", 1854, 3.31],
  ["ITC", "ITC", "Consumer", "itcportal.com", 264, 0.92],
  ["LT", "Larsen & Toubro", "Industrial", "larsentoubro.com", 3632, -0.27],
  ["SBIN", "State Bank of India", "Banking", "sbi.co.in", 960, 0.53],
  ["HINDUNILVR", "Hindustan Unilever", "Consumer", "hul.co.in", 1897, 0.08],
  ["TATAMOTORS", "Tata Motors", "Auto", "tatamotors.com", 287, 1.15],
  ["MARUTI", "Maruti Suzuki", "Auto", "marutisuzuki.com", 11445, 2.39],
  ["SUNPHARMA", "Sun Pharmaceutical", "Healthcare", "sunpharma.com", 1764, 1.01],
  ["CIPLA", "Cipla", "Healthcare", "cipla.com", 1328, 1.02],
  ["BAJFINANCE", "Bajaj Finance", "Banking", "bajajfinserv.in", 965, 0.86],
  ["AXISBANK", "Axis Bank", "Banking", "axisbank.com", 1288, 1.85],
  ["WIPRO", "Wipro", "Technology", "wipro.com", 174, 1.84],
  ["ADANIPORTS", "Adani Ports", "Industrial", "adaniports.com", 1743, -0.31],
  ["NTPC", "NTPC", "Energy", "ntpc.co.in", 315, 0.3],
  ["ONGC", "ONGC", "Energy", "ongcindia.com", 225, -0.38],
  ["M&M", "Mahindra & Mahindra", "Auto", "mahindra.com", 2862, 2.43],
  ["TITAN", "Titan Company", "Consumer", "titancompany.in", 4456, 0.27],
  ["ULTRACEMCO", "UltraTech Cement", "Industrial", "ultratechcement.com", 10862, 0.62],
  ["DRREDDY", "Dr. Reddy’s Laboratories", "Healthcare", "drreddys.com", 1219, 0.23],
  ["KOTAKBANK", "Kotak Mahindra Bank", "Banking", "kotak.com", 448, 2.26],
  ["TATASTEEL", "Tata Steel", "Industrial", "tatasteel.com", 176, 1.09],
  ["TATACONSUM", "Tata Consumer Products", "Consumer", "tataconsumer.com", 991, 0.36],
  ["APOLLOHOSP", "Apollo Hospitals", "Healthcare", "apollohospitals.com", 7890, 0.84],
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

export const NEWS_CATALOG_VERSION = 3;

const majorStory = (headline: string, direction: News["direction"], severity = 1.7): Story => ({ type: "major", headline, direction, severity });
const minorStory = (headline: string, direction: News["direction"], severity = .6): Story => ({ type: "minor", headline, direction, severity });

const economyStories: Story[] = [
  majorStory("Loan costs fall for businesses and families", 1, 1.75),
  majorStory("Loan costs rise for businesses and families", -1, 1.8),
  majorStory("Household spending grows as prices stay steady", 1, 1.65),
  majorStory("Fuel and transport costs rise for many businesses", -1, 1.7),
  majorStory("New public projects bring more orders to local companies", 1, 1.7),
  majorStory("A slower world economy weakens demand for local exports", -1, 1.75),
  minorStory("Prices rise more slowly than families expected", 1, .58),
  minorStory("Rising prices make everyday purchases more expensive", -1, .62),
  minorStory("Factories across the country report stronger orders", 1, .62),
  minorStory("Overseas buyers place more orders with local companies", 1, .58),
  minorStory("Shipping delays raise costs for companies nationwide", -1, .6),
  minorStory("Families feel less confident about spending", -1, .58),
];

const sectorStories: Record<string, [Story, Story, Story]> = {
  Banking: [
    majorStory("Fewer bank customers fall behind on repayments", 1),
    minorStory("More families and businesses apply for bank loans", 1),
    majorStory("More bank customers fall behind on repayments", -1, 1.75),
  ],
  Technology: [
    majorStory("More businesses renew their software contracts", 1),
    majorStory("Businesses delay planned software upgrades", -1),
    minorStory("A large technology client cancels a software project", -1),
  ],
  Energy: [
    majorStory("Higher demand lifts sales across power and fuel companies", 1),
    minorStory("Energy companies win new power and fuel supply contracts", 1),
    majorStory("Production delays reduce power and fuel sales", -1),
  ],
  Telecommunications: [
    majorStory("More customers sign up for mobile plans", 1),
    majorStory("Customers leave after repeated mobile network outages", -1),
    minorStory("Mobile companies cut prices to keep their customers", -1),
  ],
  Consumer: [
    majorStory("Shoppers spend more at consumer brands and stores", 1),
    minorStory("Consumer companies receive larger retail orders", 1),
    majorStory("Shoppers cut back on consumer goods and store purchases", -1),
  ],
  Industrial: [
    majorStory("Builders and factories place more orders with industrial firms", 1),
    majorStory("Builders and factories cut orders from industrial firms", -1),
    minorStory("Construction delays hold back industrial orders", -1),
  ],
  Auto: [
    majorStory("More customers book cars and two-wheelers", 1),
    minorStory("Auto makers receive larger dealer orders", 1),
    majorStory("Parts shortages slow vehicle production", -1),
  ],
  Healthcare: [
    majorStory("Demand rises for hospital care and medicines", 1),
    majorStory("Demand falls for hospital care and medicines", -1),
    minorStory("Medicine and medical supply deliveries are delayed", -1),
  ],
};

const stockStories: Record<string, Story> = {
  RELIANCE: majorStory("Reliance reports higher output from its oil and gas business", 1),
  TCS: majorStory("TCS wins a large software services contract", 1),
  HDFCBANK: minorStory("HDFC Bank adds more small-business customers", 1),
  INFY: majorStory("A large Infosys client cancels a software project", -1),
  ICICIBANK: minorStory("More ICICI Bank customers fall behind on repayments", -1),
  BHARTIARTL: majorStory("A network outage interrupts Bharti Airtel service", -1),
  ITC: minorStory("ITC sells more packaged food and household products", 1),
  LT: majorStory("A delay holds up a large Larsen & Toubro project", -1),
  SBIN: minorStory("State Bank of India reports more late loan repayments", -1),
  HINDUNILVR: majorStory("Higher ingredient costs squeeze Hindustan Unilever", -1),
  TATAMOTORS: majorStory("Parts delays slow Tata Motors vehicle production", -1),
  MARUTI: minorStory("Maruti Suzuki receives more car bookings", 1),
  SUNPHARMA: majorStory("Sun Pharma gets approval to sell a new medicine", 1),
  CIPLA: minorStory("A factory delay slows Cipla medicine deliveries", -1),
  BAJFINANCE: minorStory("Bajaj Finance adds more customers who repay on time", 1),
  AXISBANK: majorStory("Axis Bank adds more savings account customers", 1),
  WIPRO: majorStory("A Wipro client cancels a technology project", -1),
  ADANIPORTS: minorStory("Adani Ports handles more cargo than last month", 1),
  NTPC: majorStory("A fuel shortage slows electricity production at NTPC", -1),
  ONGC: minorStory("ONGC reports higher oil and gas production", 1),
  "M&M": minorStory("Mahindra receives fewer vehicle orders", -1),
  TITAN: majorStory("Titan reports lower sales of jewellery and watches", -1),
  ULTRACEMCO: minorStory("UltraTech wins more cement orders from builders", 1),
  DRREDDY: minorStory("Dr. Reddy's receives more pharmacy orders", 1),
  APOLLOHOSP: majorStory("Apollo Hospitals sees fewer patient bookings", -1),
};

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
    return story ? [preset(story, "stock", sector, [symbol])] : [];
  }),
];

export const makeNews = (seed: number) => NEWS_PRESETS.map((news, index) => ({ ...news, id: `news-v${NEWS_CATALOG_VERSION}-${seed}-${index}`, createdAt: 0 }));
