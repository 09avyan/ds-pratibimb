import type { News, Stock } from "./types";

const rows: [string, string, string, string, number, number][] = [
  ["RELIANCE", "Reliance Industries", "Energy", "ril.com", 2864.5, 1.82],
  ["TCS", "Tata Consultancy Services", "Technology", "tcs.com", 3982.1, -0.64],
  ["HDFCBANK", "HDFC Bank", "Banking", "hdfcbank.com", 1721.25, 1.14],
  ["INFY", "Infosys", "Technology", "infosys.com", 1857.7, 2.33],
  ["ICICIBANK", "ICICI Bank", "Banking", "icicibank.com", 1280.4, -0.41],
  ["BHARTIARTL", "Bharti Airtel", "Technology", "airtel.in", 1584.8, 1.75],
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

export const NEWS_PRESETS: Omit<News, "id" | "createdAt">[] = [
  { type: "major", sector: "Energy", headline: "Energy majors rally on a sharp rise in global crude demand", direction: 1, severity: 1.7 },
  { type: "major", sector: "Technology", headline: "Global technology spending outlook improves after strong earnings", direction: 1, severity: 1.8 },
  { type: "major", sector: "Banking", headline: "Central bank signals tighter liquidity in a surprise policy note", direction: -1, severity: 1.9 },
  { type: "major", sector: "Industrial", headline: "New infrastructure package lifts capital goods outlook", direction: 1, severity: 1.9 },
  { type: "major", sector: "Auto", headline: "Import policy shift puts pressure on auto sector margins", direction: -1, severity: 1.65 },
  { type: "major", sector: "Consumer", headline: "Inflation surprise sparks a broad consumer stocks repricing", direction: -1, severity: 1.55 },
  { type: "major", sector: "Healthcare", headline: "New medicine approvals brighten healthcare earnings outlook", direction: 1, severity: 1.65 },
  { type: "major", sector: "ALL", headline: "Global equity markets turn cautious after a sudden risk-off shift", direction: -1, severity: 1.5 },
  { type: "minor", sector: "Banking", headline: "Banks report steady credit growth as lending expands", direction: 1, severity: .58 },
  { type: "minor", sector: "Auto", headline: "Automakers report firmer-than-expected festival bookings", direction: 1, severity: .62 },
  { type: "minor", sector: "Consumer", headline: "Consumer brands note a gradual improvement in rural demand", direction: 1, severity: .55 },
  { type: "minor", sector: "Healthcare", headline: "Defensive buying brings fresh interest to healthcare shares", direction: 1, severity: .48 },
  { type: "minor", sector: "Energy", headline: "Energy prices ease on signs of firmer global supply", direction: -1, severity: .5 },
  { type: "minor", sector: "Technology", headline: "IT exporters gain after a supportive currency move", direction: 1, severity: .6 },
  { type: "minor", sector: "Industrial", headline: "Construction activity indicators remain resilient", direction: 1, severity: .49 },
  { type: "minor", sector: "ALL", headline: "Investors book modest gains after a steady morning session", direction: -1, severity: .4 },
];

export const makeNews = (seed: number) => NEWS_PRESETS.map((n, i) => ({ ...n, id: `${seed}-${i}`, createdAt: 0 }));
