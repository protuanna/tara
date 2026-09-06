// Extracted verbatim from the design prototype ("Tara Shop - So ban hang.html")
// shared as the UI/UX + business-rules reference for this app.
//
// This was written against a proprietary bundler's mini template engine
// (sc-camel-* attrs, <sc-if>, <sc-for>, `{{ }}` bindings, a DCLogic base
// class) — NOT a library to install or copy verbatim into Next.js. Treat it
// as the source of truth for: data shape, state machine, calculations, and
// screen-to-screen navigation. Re-implement idiomatically in React/Next.js.

const VND = n => n.toLocaleString('vi-VN') + 'Đ';
const CATS = ['Cà phê','Trà & Đá xay','Bánh & Ăn nhẹ','Đồ uống khác'];
const PRODUCTS = [
  {id:1,name:'Cà phê Đen',price:20000,cat:'Cà phê',color:'#6B4226'},
  {id:2,name:'Cà phê sữa',price:25000,cat:'Cà phê',color:'#7A5230'},
  {id:3,name:'Bạc xỉu',price:27000,cat:'Cà phê',color:'#8C6239'},
  {id:4,name:'Trà đào',price:30000,cat:'Trà & Đá xay',color:'#D6853A'},
  {id:5,name:'Trà vải',price:30000,cat:'Trà & Đá xay',color:'#C2588C'},
  {id:6,name:'Matcha đá xay',price:35000,cat:'Trà & Đá xay',color:'#5B8C4A'},
  {id:7,name:'Bánh mì thờt',price:20000,cat:'Bánh & Ăn nhẹ',color:'#B9922F'},
  {id:8,name:'Bánh croissant',price:18000,cat:'Bánh & Ăn nhẹ',color:'#C79A56'},
  {id:9,name:'Nước cam',price:25000,cat:'Đồ uống khác',color:'#E08A2A'},
  {id:10,name:'Soda chanh',price:22000,cat:'Đồ uống khác',color:'#4FA0A6'},
];
// Customer: {id, name, phone, debt}
// 'walkin' is a synthetic customer id = "Khach le" (no ledger entry, no debt).
const CUSTOMERS = [
  {id:'walkin',name:'Khách lẻ',phone:'',debt:0},
  {id:'c1',name:'Anh Tuấn',phone:'090 123 4567',debt:150000},
  {id:'c2',name:'Chị Hoa',phone:'091 222 3344',debt:0},
  {id:'c3',name:'Quán Minh Anh',phone:'093 888 1122',debt:320000},
];

// Order: {id, time, daysAgo, dstatus, customerId, customerName, items[], payMethod, status, total, fee, disc, discRaw, discType}
// dstatus (delivery/fulfillment lifecycle): 'pending' | 'processing' | 'done' | 'cancel'
// status  (payment lifecycle):              'paid' | 'debt' | 'unpaid'
// payMethod: 'cash' | 'qr' | 'debt' | 'unpaid'
// items[]: {id, name, price, qty}
// fee: phu thu (surcharge), added to subtotal
// disc/discRaw/discType: discount amount applied, raw user input, and 'vnd' | 'pct'
const seedOrders = [
  {id:1,time:'Hôm nay, 08:40',daysAgo:0,dstatus:'done',customerId:'walkin',customerName:'Khách lẻ',items:[{id:1,name:'Cà phê Đen',qty:2,price:20000}],payMethod:'cash',status:'paid'},
  {id:2,time:'Hôm nay, 09:15',daysAgo:0,dstatus:'done',customerId:'c2',customerName:'Chị Hoa',items:[{id:4,name:'Trà đào',qty:1,price:30000},{id:7,name:'Bánh mì thờt',qty:1,price:20000}],payMethod:'qr',status:'paid'},
  {id:3,time:'Hôm nay, 11:05',daysAgo:0,dstatus:'processing',customerId:'c1',customerName:'Anh Tuấn',items:[{id:6,name:'Matcha đá xay',qty:3,price:35000},{id:9,name:'Nước cam',qty:2,price:25000}],payMethod:'unpaid',status:'unpaid'},
  {id:4,time:'Hôm nay, 12:30',daysAgo:0,dstatus:'pending',customerId:'c3',customerName:'Quán Minh Anh',items:[{id:8,name:'Bánh croissant',qty:6,price:18000}],payMethod:'unpaid',status:'unpaid'},
  {id:5,time:'Hôm qua, 17:20',daysAgo:1,dstatus:'done',customerId:'c1',customerName:'Anh Tuấn',items:[{id:6,name:'Matcha đá xay',qty:3,price:35000}],payMethod:'debt',status:'debt'},
  {id:6,time:'03/09, 15:40',daysAgo:9,dstatus:'cancel',customerId:'walkin',customerName:'Khách lẻ',items:[{id:10,name:'Soda chanh',qty:2,price:22000}],payMethod:'unpaid',status:'unpaid'},
];
seedOrders.forEach(o => o.total = o.items.reduce((s,i)=>s+i.price*i.qty,0));

const num = v => { const n = parseInt(String(v).replace(/\D/g,''),10); return isNaN(n) ? 0 : n; };

// Core pricing rule used for both new-order checkout and order-edit:
//   grandTotal = subtotal + fee - discount
//   discount = pct ? round(subtotal * min(pct,100) / 100) : min(vnd, subtotal + fee)
const calcTotals = (items, fee, disc, dtype) => {
  const sub = items.reduce((a,i)=>a+i.price*i.qty,0);
  const f2 = num(fee);
  const d = dtype==='pct' ? Math.round(sub*Math.min(num(disc),100)/100) : Math.min(num(disc), sub+f2);
  return {sub, fee:f2, disc:d, total: Math.max(0, sub+f2-d)};
};

/*
 * Order lifecycle (see class Component methods in the original prototype):
 *  - saveOrder(): cart -> new order, dstatus='processing', status='unpaid', payMethod='unpaid'
 *  - startEdit()/saveEdit(): only allowed while dstatus is pending/processing (canDeliver)
 *  - cancelOrder(): dstatus -> 'cancel' (does not count towards revenue/report totals)
 *  - deliver(paid):
 *      dstatus -> 'done'
 *      if paid:            status='paid',  payMethod='cash'
 *      else if customer!=walkin: status='debt', payMethod='debt', AND customer.debt += order.total
 *      else:               status='unpaid', payMethod='unpaid'
 *  - collectDebt(customerId): customer.debt reset to 0 (marks debt as fully collected)
 *
 * Revenue/report inclusion rule: an order counts towards revenue/report stats
 * only when dstatus !== 'cancel' AND status !== 'unpaid'.
 *
 * Screens/tabs (bottom nav): home, sale (POS/checkout flow), orders (list +
 * filters), debt (so no / ledger of customers with debt>0), report
 * (revenue by day/7d/30d, top products, payment-method donut chart).
 * Sale flow: sale (browse by category, add to cart) -> checkout (cart +
 * fee/discount + pick customer) -> orderView (after saving) -> orderEdit
 * (only while pending/processing).
 */
