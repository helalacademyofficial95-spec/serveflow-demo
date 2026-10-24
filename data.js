/* Sample-only records. Future POS, inventory, and reports use this reset source. */
window.ServeFlowSeed = Object.freeze({
  version: 2,
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
  attention: [
    { level: "Low stock", title: "Oat Milk is below threshold", detail: "4 units remaining · threshold 8" },
    { level: "Pending", title: "2 orders await a status update", detail: "Review new and preparing orders" }
  ]
});
