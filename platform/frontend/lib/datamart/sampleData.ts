export interface TransactionRecord {
  transaction_id: string;
  date: string;
  product: string;
  category: string;
  region: string;
  customer_type: string;
  quantity: number;
  unit_price: number;
  discount: number;
  revenue: number;
  cost: number;
  profit: number;
  payment_method: string;
  salesperson: string;
  [key: string]: any;
}

// Pseudo-random generator with fixed seed for reproducible sample dataset
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateDemoDataset(count = 6500): TransactionRecord[] {
  const rand = seededRandom(2026);
  const startMs = new Date("2026-02-01").getTime();
  const endMs = new Date("2026-07-31").getTime();
  const spanMs = endMs - startMs;

  const catalog = [
    // Electronics
    { product: "Laptop Pro 15", category: "Electronics", unit_price: 68000, costPct: 0.78 },
    { product: "Smartphone X", category: "Electronics", unit_price: 42000, costPct: 0.72 },
    { product: "Monitor 27 Ultra", category: "Electronics", unit_price: 24000, costPct: 0.70 },
    { product: "Tablet Pro 11", category: "Electronics", unit_price: 38000, costPct: 0.75 },
    { product: "Wireless Earbuds", category: "Electronics", unit_price: 4500, costPct: 0.60 },
    { product: "Smart Watch Series 7", category: "Electronics", unit_price: 18500, costPct: 0.68 },
    { product: "Mechanical RGB Keyboard", category: "Electronics", unit_price: 6200, costPct: 0.58 },
    { product: "Gaming Mouse 8K", category: "Electronics", unit_price: 3200, costPct: 0.55 },
    { product: "Noise Cancelling Headphones", category: "Electronics", unit_price: 14500, costPct: 0.65 },
    { product: "4K Streaming WebCam", category: "Electronics", unit_price: 7800, costPct: 0.62 },
    { product: "Portable SSD 2TB", category: "Electronics", unit_price: 12500, costPct: 0.70 },

    // Furniture
    { product: "Ergonomic Office Chair", category: "Furniture", unit_price: 14500, costPct: 0.62 },
    { product: "Executive Desk", category: "Furniture", unit_price: 28000, costPct: 0.65 },
    { product: "Standing Desk Dual Engine", category: "Furniture", unit_price: 34000, costPct: 0.68 },
    { product: "Bookshelf Wooden", category: "Furniture", unit_price: 8900, costPct: 0.58 },
    { product: "Monitor Arm Dual Mount", category: "Furniture", unit_price: 4200, costPct: 0.50 },
    { product: "Mesh Task Chair", category: "Furniture", unit_price: 7500, costPct: 0.60 },

    // Clothing
    { product: "Running Jacket Pro", category: "Clothing", unit_price: 4800, costPct: 0.45 },
    { product: "Denim Pants Premium", category: "Clothing", unit_price: 2900, costPct: 0.42 },
    { product: "Cotton Polo Shirt", category: "Clothing", unit_price: 1600, costPct: 0.40 },
    { product: "Windbreaker Hooded", category: "Clothing", unit_price: 3800, costPct: 0.46 },
    { product: "Formal Suit Blazer", category: "Clothing", unit_price: 11500, costPct: 0.55 },

    // Home Appliances
    { product: "Coffee Maker Deluxe", category: "Home Appliances", unit_price: 12800, costPct: 0.64 },
    { product: "Air Purifier Pro", category: "Home Appliances", unit_price: 16500, costPct: 0.66 },
    { product: "Robotic Vacuum X", category: "Home Appliances", unit_price: 26000, costPct: 0.70 },
    { product: "Electric Kettle Stainless", category: "Home Appliances", unit_price: 2400, costPct: 0.52 },
    { product: "Smart Blender 1200W", category: "Home Appliances", unit_price: 6800, costPct: 0.58 },

    // Footwear
    { product: "Pro Runner Shoes", category: "Footwear", unit_price: 6500, costPct: 0.48 },
    { product: "Casual Leather Loafers", category: "Footwear", unit_price: 4200, costPct: 0.50 },
    { product: "Trail Hiking Boots", category: "Footwear", unit_price: 8400, costPct: 0.52 },

    // Accessories
    { product: "Travel Backpack 30L", category: "Accessories", unit_price: 3500, costPct: 0.45 },
    { product: "Leather Slim Wallet", category: "Accessories", unit_price: 1400, costPct: 0.38 },
    { product: "Laptop Sleeve 15", category: "Accessories", unit_price: 1100, costPct: 0.35 },
    { product: "MagSafe Power Bank", category: "Accessories", unit_price: 3200, costPct: 0.52 }
  ];

  const regions = ["North", "South", "East", "West", "Central"];
  const customerTypes = ["New", "Returning"];
  const paymentMethods = ["UPI", "Card", "Cash", "Net Banking"];
  const salespeople = ["Rahul Sharma", "Priya Patel", "Amit Kumar", "Neha Singh", "Vikas Verma", "Ananya Roy", "Siddharth Rao", "Kavita Reddy"];
  const discounts = [0, 0, 5, 5, 8, 10, 12, 15, 20];

  const records: TransactionRecord[] = [];

  for (let i = 1; i <= count; i++) {
    const txId = `TX${String(i).padStart(5, "0")}`;
    const tMs = startMs + Math.floor(rand() * spanMs);
    const dateStr = new Date(tMs).toISOString().split("T")[0];

    const prod = catalog[Math.floor(rand() * catalog.length)];
    const region = regions[Math.floor(rand() * regions.length)];
    const custType = rand() > 0.42 ? "Returning" : "New";

    // Quantity logic
    const qty = custType === "Returning" ? Math.floor(rand() * 7) + 1 : Math.floor(rand() * 4) + 1;

    // Controlled Anomaly: West region in May 2026 heavily discounted
    let disc = discounts[Math.floor(rand() * discounts.length)];
    if (region === "West" && dateStr.startsWith("2026-05") && prod.category === "Electronics") {
      disc = Math.floor(rand() * 15) + 18; // 18-32% discount spike
    }

    const revenue = Math.round(qty * prod.unit_price * (1 - disc / 100));
    const cost = Math.round(qty * prod.unit_price * prod.costPct);
    const profit = Math.round(revenue - cost);

    const payMethod = paymentMethods[Math.floor(rand() * paymentMethods.length)];
    const salesperson = salespeople[Math.floor(rand() * salespeople.length)];

    records.push({
      transaction_id: txId,
      date: dateStr,
      product: prod.product,
      category: prod.category,
      region,
      customer_type: custType,
      quantity: qty,
      unit_price: prod.unit_price,
      discount: disc,
      revenue,
      cost,
      profit,
      payment_method: payMethod,
      salesperson
    });
  }

  // Inject quality defects for Data Quality panel validation
  // 13 missing values in discount
  const missingIndices = [45, 128, 342, 891, 1205, 1822, 2301, 2940, 3411, 4102, 4820, 5304, 6112];
  missingIndices.forEach(idx => {
    if (records[idx]) {
      (records[idx] as any).discount = null;
    }
  });

  // 7 duplicate transaction IDs
  const dupIds = ["TX00012", "TX00145", "TX00892", "TX01420", "TX02890", "TX03510", "TX05200"];
  dupIds.forEach((dup, idx) => {
    const targetIdx = idx + 500;
    if (records[targetIdx]) {
      records[targetIdx].transaction_id = dup;
    }
  });

  return records;
}
