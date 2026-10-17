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
    // Keep the final reset candle on the rounded reference quote. Earlier
    // candles still ease into it; noise should not skew the opening mark.
    const close = j === 35 ? price : Math.max(1, prev + drift + noise);
    const spread = Math.max(Math.abs(close - prev) * .45, price * .00035);
    candles.push({ time: Date.now() - (36 - j) * 1000, open: prev, high: Math.max(prev, close) + spread, low: Math.max(1, Math.min(prev, close) - spread), close, volume: 900 + i * 61 + j * 11 });
    prev = close;
  }
  const current = prev;
  return { symbol, name, sector, domain, base: price, previousClose: open, price: current, weight: INDEX_WEIGHTS[symbol] ?? 0, candles, flow: 0 };
});

type NewsPreset = Omit<News, "id" | "createdAt">;
type Story = { type: News["type"]; headline: string; direction: News["direction"]; severity: number; topic?: string };

export const NEWS_CATALOG_VERSION = 4;

const majorStory = (headline: string, direction: News["direction"], severity = 1.7): Story => ({ type: "major", headline, direction, severity });
const minorStory = (headline: string, direction: News["direction"], severity = .6): Story => ({ type: "minor", headline, direction, severity });

const economyStories: Story[] = [
  { ...majorStory('Small businesses receive cheaper working loans, freeing money to hire staff and buy supplies.', 1, 1.75), topic: "economy-credit-cost" },
  { ...majorStory('A nationwide delivery backlog forces companies to pay for urgent transport, cutting their earnings.', -1, 1.8), topic: "economy-delivery-backlog" },
  { ...majorStory('Families spend more on shopping and travel after a strong bonus season, lifting business sales.', 1, 1.65), topic: "economy-bonus-spending" },
  { ...majorStory('Diesel prices rise after a supply disruption, making transport and factory deliveries more expensive.', -1, 1.7), topic: "economy-diesel-supply" },
  { ...majorStory('New railway and water projects begin this month, bringing orders to suppliers across the country.', 1, 1.7), topic: "economy-public-projects" },
  { ...majorStory('Overseas retailers trim their next season orders, leaving Indian exporters with fewer sales.', -1, 1.75), topic: "economy-export-demand" },
  { ...minorStory('Food prices settle after a good harvest, leaving families more money for other purchases.', 1, 0.58), topic: "economy-harvest-prices" },
  { ...minorStory('A rise in packaging costs makes everyday goods more expensive to produce, squeezing company profits.', -1, 0.62), topic: "economy-packaging-costs" },
  { ...minorStory('Factories add evening shifts after receiving more local orders, improving sales across supply chains.', 1, 0.62), topic: "economy-factory-shifts" },
  { ...minorStory('A new trade route cuts delivery time to overseas customers, helping exporters fulfil more orders.', 1, 0.58), topic: "economy-trade-route" },
  { ...minorStory('Heavy rain closes key freight routes for several days, delaying deliveries and increasing storage costs.', -1, 0.6), topic: "economy-freight-rain" },
  { ...minorStory('A household survey finds families postponing large purchases to rebuild savings, slowing demand.', -1, 0.58), topic: "economy-household-savings" },
];

const sectorStories: Record<string, [Story, Story, Story]> = {
  Banking: [
    { ...majorStory('Banks recover more overdue loans through repayment plans, leaving less money tied up in unpaid bills.', 1), topic: "banking-repayments" },
    { ...minorStory('A new small-business lending drive brings banks more reliable borrowers and interest income.', 1), topic: "banking-business-lending" },
    { ...majorStory('Payment-system repairs force banks to refund customers and pay extra support costs this quarter.', -1), topic: "banking-payment-repairs" },
  ],
  Technology: [
    { ...majorStory('Retailers sign new online-service contracts with technology firms to handle their growing home deliveries.', 1), topic: "technology-retail-contracts" },
    { ...majorStory('Overseas clients postpone non-essential software upgrades, reducing new orders for technology firms.', -1), topic: "technology-upgrade-delays" },
    { ...minorStory('Higher specialist salaries raise project costs for software firms before client fees can be revised.', -1), topic: "technology-specialist-costs" },
  ],
  Energy: [
    { ...majorStory('An unusually hot month raises electricity and fuel demand, improving sales for energy suppliers.', 1), topic: "energy-summer-demand" },
    { ...minorStory('Energy suppliers win long-term supply agreements with new industrial parks, securing future sales.', 1), topic: "energy-industrial-supply" },
    { ...majorStory('Maintenance takes several energy facilities offline at once, reducing the amount available to sell.', -1), topic: "energy-maintenance" },
  ],
  Telecommunications: [
    { ...majorStory('Mobile operators add paying customers in newly connected towns, increasing monthly subscription income.', 1), topic: "telecommunications-town-expansion" },
    { ...majorStory('Repeated network interruptions lead customers to cancel plans, reducing income for mobile operators.', -1), topic: "telecommunications-network-cancellations" },
    { ...minorStory('Mobile operators offer larger discounts to retain users, leaving less income from each plan.', -1), topic: "telecommunications-retention-discounts" },
  ],
  Consumer: [
    { ...majorStory('A festival shopping weekend brings stronger sales of household products, clothes and packaged food.', 1), topic: "consumer-festival-sales" },
    { ...minorStory('Large retailers expand shelf space for Indian consumer brands and place bigger opening orders.', 1), topic: "consumer-shelf-expansion" },
    { ...majorStory('Unsold goods build up at stores, forcing consumer brands to offer discounts that reduce profits.', -1), topic: "consumer-unsold-inventory" },
  ],
  Industrial: [
    { ...majorStory('New factory and warehouse projects create larger equipment and materials orders for industrial firms.', 1), topic: "industrial-warehouse-projects" },
    { ...majorStory('Customers delay payments on completed construction projects, raising borrowing costs for suppliers.', -1), topic: "industrial-delayed-payments" },
    { ...minorStory('A shortage of skilled site workers delays industrial project completion and pushes up labour costs.', -1), topic: "industrial-worker-shortage" },
  ],
  Auto: [
    { ...majorStory('Dealers report strong bookings for family vehicles after manufacturers launch affordable new models.', 1), topic: "auto-new-model-bookings" },
    { ...minorStory('Lower vehicle delivery delays help dealers turn existing bookings into completed sales faster.', 1), topic: "auto-delivery-speed" },
    { ...majorStory('A shortage of electronic parts slows assembly lines, leaving vehicle makers with fewer units to sell.', -1), topic: "auto-electronics-shortage" },
  ],
  Healthcare: [
    { ...majorStory('New health-cover plans bring more patients to organised hospitals and raise demand for medicines.', 1), topic: "healthcare-health-cover" },
    { ...majorStory('A rise in medical equipment servicing costs reduces hospital and medicine-company earnings.', -1), topic: "healthcare-equipment-service" },
    { ...minorStory('A cold-storage transport breakdown delays medicine deliveries, creating extra replacement costs.', -1), topic: "healthcare-cold-storage" },
  ],
};

const stockStories: Record<string, Story> = {
  "RELIANCE": { ...majorStory('Reliance starts an upgraded production line ahead of schedule, adding output without another major investment.', 1), topic: "company-reliance" },
  "TCS": { ...majorStory('TCS wins a three-year contract to run online services for a large retail chain, adding steady future revenue.', 1), topic: "company-tcs" },
  "HDFCBANK": { ...minorStory('HDFC Bank opens salary accounts for a large employer, bringing new deposits and everyday banking customers.', 1), topic: "company-hdfcbank" },
  "INFY": { ...majorStory('A major Infosys customer reduces its project budget, cutting the work scheduled for the next two quarters.', -1), topic: "company-infy" },
  "ICICIBANK": { ...minorStory('ICICI Bank sets aside more money for unpaid business loans, leaving less of its earnings as profit.', -1), topic: "company-icicibank" },
  "BHARTIARTL": { ...majorStory('Airtel refunds customers after a regional network failure, adding repair costs and reducing monthly revenue.', -1), topic: "company-bhartiartl" },
  "ITC": { ...minorStory('ITC wins shelf space in a nationwide supermarket chain for its packaged foods, bringing larger repeat orders.', 1), topic: "company-itc" },
  "LT": { ...majorStory('A delayed site handover holds up a major L&T construction project, adding equipment and staff costs.', -1), topic: "company-lt" },
  "SBIN": { ...minorStory('State Bank of India faces more overdue crop loans after delayed farm payments, increasing its loan-loss costs.', -1), topic: "company-sbin" },
  "HINDUNILVR": { ...majorStory('Hindustan Unilever pays more for oils used in soaps and foods while keeping shop prices steady, reducing profit.', -1), topic: "company-hindunilvr" },
  "TATAMOTORS": { ...majorStory('A supplier recall pauses deliveries of a Tata Motors model while parts are replaced, reducing completed sales.', -1), topic: "company-tatamotors" },
  "MARUTI": { ...minorStory('Maruti dealers receive more bookings for a newly launched family car, improving expected vehicle sales.', 1), topic: "company-maruti" },
  "SUNPHARMA": { ...majorStory('Sun Pharma receives permission to sell a new medicine in another market, opening a fresh source of sales.', 1), topic: "company-sunpharma" },
  "CIPLA": { ...minorStory('A packaging-line repair delays Cipla deliveries to pharmacies, raising costs and postponing sales.', -1), topic: "company-cipla" },
  "BAJFINANCE": { ...minorStory('Bajaj Finance reports more customers paying on time, reducing collection costs and unpaid-loan losses.', 1), topic: "company-bajfinance" },
  "AXISBANK": { ...majorStory('Axis Bank signs a payroll agreement with a large employer, adding deposits and customers for its banking services.', 1), topic: "company-axisbank" },
  "WIPRO": { ...majorStory('A Wipro customer moves a planned technology rollout to next year, reducing the company’s near-term project income.', -1), topic: "company-wipro" },
  "ADANIPORTS": { ...minorStory('A new cargo service chooses Adani Ports for weekly stops, bringing more container-handling business.', 1), topic: "company-adaniports" },
  "NTPC": { ...majorStory('A delayed fuel shipment forces an NTPC plant to run below capacity, reducing electricity available for sale.', -1), topic: "company-ntpc" },
  "ONGC": { ...minorStory('ONGC restores output from a repaired field sooner than expected, increasing the oil and gas it can sell.', 1), topic: "company-ongc" },
  "M&M": { ...minorStory('Mahindra dealers cut fresh tractor orders after stocks build up in showrooms, slowing expected sales.', -1), topic: "company-m&m" },
  "TITAN": { ...majorStory('Titan’s new jewellery collection sells below expectations, leaving stores with stock that may need discounts.', -1), topic: "company-titan" },
  "ULTRACEMCO": { ...minorStory('UltraTech secures a cement supply agreement for a new housing development, adding confirmed delivery orders.', 1), topic: "company-ultracemco" },
  "DRREDDY": { ...minorStory('Dr. Reddy’s gains a pharmacy-chain supply contract for everyday medicines, increasing repeat sales.', 1), topic: "company-drreddy" },
  "APOLLOHOSP": { ...majorStory('Renovation closes part of an Apollo hospital temporarily, reducing available beds while operating costs continue.', -1), topic: "company-apollohosp" },
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
