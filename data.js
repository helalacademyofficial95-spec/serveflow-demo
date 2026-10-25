/* Sample-only records. The POS, inventory, and reports use this as the reset source.
   Menu items and prices live here only (never in saved browser data), so saved data
   can never change what an item costs. */
window.ServeFlowSeed = Object.freeze({
  version: 3,
  /* Demo-only tax rate (8%). Illustrative; not a statement about real tax requirements. */
  taxRate: 0.08,
  menuCategories: ["Coffee", "Bowls", "Bakery", "Drinks", "Retail"],
  menu: [
    { id: "drip-coffee", name: "Drip Coffee", category: "Coffee", price: 3.25, emoji: "☕", detail: "House Blend, 12 oz" },
    { id: "latte", name: "Latte", category: "Coffee", price: 4.75, emoji: "🥛", detail: "Espresso and steamed milk" },
    { id: "cappuccino", name: "Cappuccino", category: "Coffee", price: 4.5, emoji: "☕", detail: "Double shot, airy foam" },
    { id: "cold-brew", name: "Cold Brew", category: "Coffee", price: 4.95, emoji: "🧊", detail: "Steeped 18 hours" },
    { id: "oat-latte", name: "Oat Milk Latte", category: "Coffee", price: 5.25, emoji: "🌾", detail: "Made with oat milk" },
    { id: "garden-bowl", name: "Garden Bowl", category: "Bowls", price: 14.5, emoji: "🥗", detail: "Fresh greens · 12 min" },
    { id: "grain-bowl", name: "Harvest Grain Bowl", category: "Bowls", price: 15.25, emoji: "🍚", detail: "Roasted vegetables, farro" },
    { id: "chickpea-bowl", name: "Spicy Chickpea Bowl", category: "Bowls", price: 13.75, emoji: "🌶️", detail: "Warm spices, herb yogurt" },
    { id: "tofu-bowl", name: "Teriyaki Tofu Bowl", category: "Bowls", price: 14.95, emoji: "🍱", detail: "Sesame, rice, greens" },
    { id: "croissant", name: "Butter Croissant", category: "Bakery", price: 3.95, emoji: "🥐", detail: "Baked this morning" },
    { id: "muffin", name: "Blueberry Muffin", category: "Bakery", price: 3.75, emoji: "🧁", detail: "Lemon zest crumb" },
    { id: "biscotti", name: "Almond Biscotti", category: "Bakery", price: 2.95, emoji: "🍪", detail: "Twice-baked, crisp" },
    { id: "banana-bread", name: "Banana Bread Slice", category: "Bakery", price: 4.25, emoji: "🍞", detail: "Walnuts, brown butter" },
    { id: "lemonade", name: "Fresh Lemonade", category: "Drinks", price: 3.95, emoji: "🍋", detail: "Pressed to order" },
    { id: "sparkling-water", name: "Sparkling Water", category: "Drinks", price: 2.5, emoji: "🫧", detail: "Chilled, 12 oz" },
    { id: "iced-tea", name: "Iced Green Tea", category: "Drinks", price: 3.75, emoji: "🍵", detail: "Lightly sweetened" },
    { id: "orange-juice", name: "Orange Juice", category: "Drinks", price: 4.25, emoji: "🍊", detail: "Cold-pressed" },
    { id: "beans-bag", name: "House Blend Beans", category: "Retail", price: 12, emoji: "🫘", detail: "12 oz bag · Aisle 3" },
    { id: "ceramic-mug", name: "Ceramic Mug", category: "Retail", price: 14, emoji: "🏺", detail: "Hand-glazed, 10 oz" },
    { id: "reusable-cup", name: "Reusable Cup", category: "Retail", price: 11.5, emoji: "🥤", detail: "Insulated, 16 oz" }
  ],
  orders: [
    { id: "1048", customer: "Jordan Lee", channel: "Table 12", status: "Preparing", total: 34, date: "Today, 10:42 AM" },
    { id: "1049", customer: "Samira Patel", channel: "Online pickup", status: "New", total: 42.5, date: "Today, 10:36 AM" },
    { id: "1050", customer: "Morgan Kim", channel: "Table 07", status: "Ready", total: 18.75, date: "Today, 10:29 AM" },
    { id: "1047", customer: "Casey Wilson", channel: "Counter", status: "Completed", total: 27.25, date: "Today, 10:18 AM" },
    { id: "1046", customer: "Avery Chen", channel: "Online pickup", status: "Completed", total: 51.5, date: "Today, 10:04 AM" }
  ],
  inventory: [
    { id: "coffee", name: "House Blend", stock: 18, threshold: 12 },
    { id: "oat-milk", name: "Oat Milk", stock: 4, threshold: 8 },
    { id: "bowls", name: "Compostable Bowls", stock: 6, threshold: 10 }
  ],
  metrics: { salesToday: 4280.5, weeklySales: 21840 },
  salesRanges: {
    today: { label: "Today", total: 4280.5, comparison: "+12.4% from yesterday", points: [320, 510, 450, 690, 580, 890, 840, 1120], labels: ["8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p"] },
    week: { label: "Last 7 days", total: 21840, comparison: "+8.1% from previous week", points: [2100, 2780, 2430, 3190, 2910, 4150, 4280], labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    month: { label: "Last 30 days", total: 85120, comparison: "+14.7% from previous month", points: [9680, 11700, 10450, 12420, 13360, 14110, 13400], labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Today"] }
  },
  activity: [
    { icon: "↗", title: "Order #1049 was received", detail: "Online pickup · $42.50", time: "6 min ago" },
    { icon: "✓", title: "Order #1047 was completed", detail: "Counter · $27.25", time: "24 min ago" },
    { icon: "◫", title: "Morning prep checklist finished", detail: "Kitchen team", time: "41 min ago" }
  ],
  /* Only static alerts live here. The "orders awaiting a status update" alert is
     calculated from the real order list so it always matches the orders. */
  attention: [
    { level: "Low stock", title: "Oat Milk is below threshold", detail: "4 units remaining · threshold 8" }
  ]
});
