import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  authApi,
  customerApi,
  dispatchApi,
  invoiceApi,
  notificationApi,
  orderApi,
  productApi,
  quotationApi,
} from './api';
import { STORAGE_KEYS } from './config';
import { OTP_PURPOSES } from './constants';

const AppContext = createContext(undefined);

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const fmtDateTime = d => {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Backend → screen-shape mappers ────────────────────────────

// Orders: backend uses snake_case; screens expect camelCase-ish flat shape.
// ─── Unified 6-stage ORDER_STATUS_MAP ────────────────────────────────────────
// Maps every legacy and current backend raw status → one of 6 display keys.
// Display keys match the ORDER_STEPS keys in OrderFinanceScreens.jsx exactly.
export const ORDER_STATUS_MAP = {
  // Stage 1 — New
  'New':              'NEW',
  // Stage 2 — Accepted
  'Accepted':         'ACCEPTED',
  // Stage 3 — Packing  (absorbs all old granular picking/sorting/packing/invoice steps)
  'Packing':          'PACKING',
  'Pending Approval': 'PACKING',  'Approved':          'PACKING',
  'Picking Started':  'PACKING',  'Picking Completed':  'PACKING',
  'Sorting Started':  'PACKING',  'Sorting Completed':  'PACKING',
  'Packing Started':  'PACKING',  'Packing Completed':  'PACKING',
  'Invoice Generated':'PACKING',
  // Stage 4 — Dispatched  (absorbs old Ready / Ready for Dispatch / Partially Dispatched)
  'Dispatched':           'DISPATCHED',
  'Ready':                'DISPATCHED',
  'Ready for Dispatch':   'DISPATCHED',
  'Partially Dispatched': 'DISPATCHED',
  // Stage 5 — Out for Delivery  (absorbs old In Transit)
  'Out for Delivery': 'OUT_FOR_DELIVERY',
  'In Transit':       'OUT_FOR_DELIVERY',
  // Stage 6 — Delivered
  'Delivered':  'DELIVERED',
  // Edge cases
  'Cancelled':  'CANCELLED',
  'HOLD':       'HOLD',
};

const mapApiOrder = (o, allDispatches = []) => {
  // Calculate delivered quantity from dispatches (like admin/retailer apps)
  const orderCode = o.order_code || String(o._id);
  const orderDispatches = allDispatches.filter(d => {
    const dOrderId = typeof d.order_id === 'object' ? d.order_id?._id : d.order_id;
    const dOrderCode = typeof d.order_id === 'object' ? d.order_id?.order_code : d.order_code;
    return String(dOrderId) === String(o._id) || dOrderCode === orderCode;
  });
  
  const deliveredQty = orderDispatches
    .filter(d => d.status === 'Delivered')
    .reduce((sum, d) => sum + (d.qty || 0), 0);

  // Map enriched dispatches attached by the staff getOrder endpoint
  const enrichedDispatches = (o._dispatches || []).map(mapApiDispatchRaw);
  // Map enriched invoices attached by the staff getOrder endpoint
  const enrichedInvoices   = (o._invoices   || []).map(mapApiInvoiceRaw);

  // Payment summary from backend (only on enriched getOrder response)
  const ps = o._payment_summary || {};

  // Build status history timeline — deduplicate consecutive same-status entries
  // (guards against the double-push that can occur when both dispatchController
  // and orderController write the same status transition to status_history)
  const seen = new Set();
  const timeline = (o.status_history || [])
    .map(h => ({
      status:    ORDER_STATUS_MAP[h.status] || h.status || '',
      rawStatus: h.status || '',
      by:        h.updated_by_name || '',
      role:      h.updated_by_role || '',
      remarks:   h.remarks || '',
      at:        h.timestamp ? fmtDateTime(h.timestamp) : '',
    }))
    .filter(h => {
      // Key = rawStatus + rounded-minute timestamp so legitimate re-entries
      // (e.g. same status hours later) still appear, but same-second dupes don't
      const minute = h.at ? h.at.slice(0, 15) : '';
      const key = `${h.rawStatus}|${minute}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    id:            orderCode,
    _id:           String(o._id),
    customerId:    String(o.customer_id   || o.buyer_company_id || ''),
    customerName:  o.customer_name  || '',
    customerMobile: o.customer_mobile || '',
    customerEmail:  o.customer_email  || '',
    productName:   o.product_name   || '',
    productCode:   o.product_code   || '',
    quantity:      o.qty            || 0,
    unit:          o.unit           || '',
    rate:          o.rate           || 0,
    subtotal:      o.amount         || 0,
    gstPercent:    o.gst_percent    || 18,
    gstAmount:     o.gst_amount     || 0,
    total:         o.total_amount   || 0,
    picked:        o.packed_qty     || 0,
    dispatched:    o.dispatched_qty || 0,
    delivered:     deliveredQty,
    status:        ORDER_STATUS_MAP[o.status] || o.status || 'PROCESSING',
    rawStatus:     o.status || '',
    wholesaler:    o.seller_company_name || o.supplier_name || '',
    branchName:    o.branch_name    || '',
    enquiryCode:   o.enquiry_code   || '',
    quotationId:   o.quotation_no   || '',
    deliveryAddress: o.delivery_address || o.location || '',
    expectedDelivery: o.expected_delivery ? fmtDate(o.expected_delivery) : '—',
    holdReason:    o.hold_reason    || null,
    holdRemarks:   o.hold_remarks   || null,
    heldBy:        o.held_by        || null,
    heldAt:        o.held_at        ? fmtDateTime(o.held_at) : null,
    previousStatus: o.previous_status ? ORDER_STATUS_MAP[o.previous_status] || o.previous_status : null,
    dispatchIds:   (o.dispatch_ids  || []).map(String),
    invoiceIds:    (o.invoice_ids   || []).map(String),
    notes:         o.notes          || '',
    createdAt:     fmtDate(o.created_at),
    orderDate:     fmtDate(o.order_date || o.created_at),
    createdByType: o.created_by_type || '',
    createdByName: o.created_by_name || '',
    // Assignment
    assignedTo:    o.assigned_to
                     ? (typeof o.assigned_to === 'object' ? String(o.assigned_to._id) : String(o.assigned_to))
                     : null,
    assignedToName: (typeof o.assigned_to === 'object' && o.assigned_to?.name)
                     ? o.assigned_to.name
                     : (o.assigned_to_name || ''),
    assignedToMobile: (typeof o.assigned_to === 'object' && o.assigned_to?.mobile)
                     ? o.assigned_to.mobile
                     : '',
    assignedToDesignation: (typeof o.assigned_to === 'object' && o.assigned_to?.designation)
                     ? o.assigned_to.designation
                     : '',
    assignedDate:  o.assigned_date ? fmtDate(o.assigned_date) : null,
    assignmentType: o.assignment_type || null,
    // Enriched detail (only present on getOrder, not on list)
    enrichedDispatches,
    enrichedInvoices,
    paymentSummary: {
      totalInvoiced: ps.total_invoiced || 0,
      totalPaid:     ps.total_paid     || 0,
      totalBalance:  ps.total_balance  || 0,
      invoiceCount:  ps.invoice_count  || 0,
    },
    timeline,
    // Packages (partial fulfilment batches)
    packages: (o.packages || []).map(pkg => ({
      packNo:        pkg.pack_no      || 1,
      qty:           pkg.qty          || 0,
      total:         pkg.total        || 0,
      invoiceNumber: pkg.invoice_number || '',
      dispatchCode:  pkg.dispatch_code  || '',
      vehicleNumber: pkg.vehicle_number || '',
      transport:     pkg.transport_name || '',
      packedByName:  pkg.packed_by_name || '',
      packedAt:      pkg.packed_at ? fmtDate(pkg.packed_at) : '',
    })),
  };
};

// Lightweight raw dispatch mapper (used when dispatches are embedded in order detail)
const mapApiDispatchRaw = d => ({
  id:           d.dispatch_code || String(d._id),
  _id:          String(d._id),
  orderId:      d.order_code    || (typeof d.order_id === 'object' ? d.order_id?.order_code : '') || '',
  quantity:     d.qty           || 0,
  unit:         d.unit          || '',
  customerName: d.customer_name || '',
  productName:  (typeof d.order_id === 'object' ? d.order_id?.product_name : '') || '',
  status:       DISPATCH_STATUS_MAP_RAW[d.status] || d.status || 'DISPATCHED',
  rawStatus:    d.status        || '',
  driverName:   d.driver_name   || '—',
  driverMobile: d.driver_mobile || '—',
  vehicleNumber: d.vehicle_number || '—',
  lrNumber:     d.lr_number     || '—',
  transport:    d.transport_name || '—',
  deliveryAddress: d.delivery_address || '',
  dispatchDate: d.dispatch_date   ? fmtDate(d.dispatch_date)   : '—',
  expectedDelivery: d.expected_delivery ? fmtDate(d.expected_delivery) : '—',
  deliveredDate: d.delivered_date ? fmtDate(d.delivered_date)  : '—',
  notes:        d.notes          || '',
  invoiceNumber: d.invoice_number || '',
});

// Lightweight raw invoice mapper (used when invoices are embedded in order detail)
const mapApiInvoiceRaw = inv => {
  const item = (inv.items || [])[0] || {};
  const qty  = (inv.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
  return {
    id:           inv.invoice_no   || String(inv._id),
    _id:          String(inv._id),
    orderId:      inv.order_no     || String(inv.order_id || ''),
    dispatchCode: inv.dispatch_code || '',
    customerName: inv.customer_name || '',
    productName:  item.product_name || '',
    quantity:     qty,
    unit:         item.unit        || '',
    rate:         item.rate        || 0,
    subtotal:     inv.subtotal     || 0,
    gstAmount:    inv.gst_amount   || 0,
    freightCharge: (inv.freight_charges || 0) + (inv.other_charges || 0),
    total:        inv.grand_total  || 0,
    paidAmount:   inv.paid_amount  || 0,
    balance:      inv.balance_due  != null
                    ? inv.balance_due
                    : (inv.grand_total || 0) - (inv.paid_amount || 0),
    status:       INV_STATUS_MAP_RAW[inv.payment_status] || 'PENDING',
    rawStatus:    inv.payment_status || '',
    dueDate:      inv.due_date      ? fmtDate(inv.due_date)     : '—',
    invoiceDate:  inv.invoice_date  ? fmtDate(inv.invoice_date) : '—',
    paymentHistory: (inv.payment_history || []).map(ph => ({
      _id:       ph._id ? String(ph._id) : null,
      amount:    ph.amount || 0,
      mode:      ph.payment_mode || '',
      reference: ph.reference_no || '',
      note:      ph.note || '',
      date:      ph.payment_date ? fmtDate(ph.payment_date) : '',
      by:        ph.received_by_name || '',
      verificationStatus: ph.verification_status || 'Pending',
      otpCode:   ph.otp_code || '',
    })),
  };
};

// Dispatches: backend status enum is 'Dispatched'|'In Transit'|'Delivered'|'Returned'
const DISPATCH_STATUS_MAP_RAW = {
  'Dispatched':  'DISPATCHED',
  'In Transit':  'IN_TRANSIT',
  'Delivered':   'DELIVERED',
  'Returned':    'RETURNED',
};
const DISPATCH_STATUS_MAP = {
  'Dispatched':  'DISPATCHED',
  'In Transit':  'IN_TRANSIT',
  'Delivered':   'DELIVERED',
  'Returned':    'RETURNED',
};

const mapApiDispatch = d => {
  // Handle populated order_id (object) or plain ObjectId (string)
  const order = typeof d.order_id === 'object' && d.order_id ? d.order_id : null;
  const orderCode = order?.order_code || d.order_code || '';
  const orderId = order?._id || d.order_id || '';
  
  return {
    id:           d.dispatch_code || String(d._id),
    _id:          String(d._id),
    orderId:      orderCode || String(orderId),
    _orderId:     String(orderId),
    quantity:     d.qty           || 0,
    unit:         d.unit          || order?.unit || '',
    status:       DISPATCH_STATUS_MAP[d.status] || d.status || 'DISPATCHED',
    rawStatus:    d.status        || '',
    // Customer + product pulled from populated order if available
    customerName: d.customer_name || order?.customer_name || '',
    productName:  order?.product_name || '',
    driverName:   d.driver_name   || 'To be assigned',
    driverMobile: d.driver_mobile || '—',
    vehicleNumber: d.vehicle_number || '—',
    lrNumber:     d.lr_number     || '—',
    transport:    d.transport_name || '—',
    deliveryAddress: d.delivery_address || order?.delivery_address || order?.location || '',
    dispatchDate: d.dispatch_date  ? fmtDate(d.dispatch_date) : '—',
    expectedDelivery: d.expected_delivery ? fmtDate(d.expected_delivery) : '—',
    expectedDeliveryTime: d.expected_delivery ? fmtDateTime(d.expected_delivery).split(',')[1]?.trim() : '—',
    deliveredDate: d.delivered_date ? fmtDate(d.delivered_date) : '—',
    deliveredTime: d.delivered_date ? fmtDateTime(d.delivered_date).split(',')[1]?.trim() : '',
    deliveryOtpStatus: d.status === 'Delivered' ? 'OTP_VERIFIED' : 'PENDING',
    deliveryOtpPurpose: 'Delivery confirmation',
    deliveryNotes: d.notes || '',
    notes:        d.notes || '',
  };
};

// Invoices
const INV_STATUS_MAP_RAW = {
  'Unpaid': 'PENDING', 'Partially Paid': 'PARTIALLY_PAID',
  'Paid': 'PAID', 'Overdue': 'OVERDUE', 'Cancelled': 'CANCELLED',
};
const INV_STATUS_MAP = {
  'Unpaid': 'PENDING', 'Partially Paid': 'PARTIALLY_PAID',
  'Paid': 'PAID', 'Overdue': 'PENDING', 'Cancelled': 'CANCELLED',
};

const mapApiInvoice = inv => {
  const item = (inv.items || [])[0] || {};
  const qty  = (inv.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
  
  // Map enriched dispatch object (from getInvoice endpoint) if present
  let dispatch = null;
  if (inv.dispatch && typeof inv.dispatch === 'object') {
    dispatch = {
      id:             inv.dispatch.dispatch_code || String(inv.dispatch._id || ''),
      _id:            String(inv.dispatch._id || ''),
      orderId:        inv.dispatch.order_id ? String(inv.dispatch.order_id) : '',
      status:         inv.dispatch.status || '',
      driverName:     inv.dispatch.driver_name || '',
      driverMobile:   inv.dispatch.driver_mobile || '',
      vehicleNumber:  inv.dispatch.vehicle_number || '',
      lrNumber:       inv.dispatch.lr_number || '',
      transportName:  inv.dispatch.transport_name || '',
      dispatchDate:   fmtDate(inv.dispatch.dispatch_date),
      expectedDelivery: fmtDate(inv.dispatch.expected_delivery),
      deliveredDate:  fmtDate(inv.dispatch.delivered_date),
      notes:          inv.dispatch.notes || '',
    };
  }
  
  return {
    id:           inv.invoice_no  || String(inv._id),
    _id:          String(inv._id),
    orderId:      inv.order_no    || String(inv.order_id  || ''),
    _orderId:     String(inv.order_id  || ''),
    dispatchId:   inv.dispatch_code || String(inv.dispatch_id || ''),
    _dispatchId:  String(inv.dispatch_id || ''),
    customerId:   String(inv.customer_id || ''),
    customerName: inv.customer_name  || '',
    productName:  item.product_name  || '',
    quantity:     qty,
    unit:         item.unit          || '',
    rate:         item.rate          || 0,
    subtotal:     inv.subtotal       || 0,
    gstAmount:    inv.gst_amount     || 0,
    deliveryCharge: (inv.freight_charges || 0) + (inv.other_charges || 0),
    total:        inv.grand_total    || 0,
    paidAmount:   inv.paid_amount    || 0,
    balance:      inv.balance_due    != null
                    ? inv.balance_due
                    : (inv.grand_total || 0) - (inv.paid_amount || 0),
    status:       INV_STATUS_MAP[inv.payment_status] || 'PENDING',
    dueDate:      fmtDate(inv.due_date),
    invoiceDate:  fmtDate(inv.invoice_date),
    createdByType: inv.created_by_type || '',
    dispatch,     // Enriched dispatch object (only present in getInvoice detail endpoint)
    paymentHistory: (inv.payment_history || []).map(ph => ({
      _id:       ph._id ? String(ph._id) : null,
      amount:    Number(ph.amount)       || 0,
      mode:      ph.payment_mode         || ph.mode || '',
      reference: ph.reference_no         || ph.reference || '',
      note:      ph.note                 || '',
      _date:     ph.payment_date || ph.created_at || null,   // raw date for sorting
      date:      ph.payment_date ? fmtDate(ph.payment_date) : (ph.created_at ? fmtDate(ph.created_at) : ''),
      by:        ph.received_by_name || ph.recorded_by_name || ph.staff_name || '',
      status:    ph.verification_status  || ph.status || 'COLLECTED',
      verificationStatus: ph.verification_status || 'Pending',
      otpCode:   ph.otp_code             || '',
    })),
  };
};

// Customers
const mapApiCustomer = c => ({
  id:           String(c._id),
  _id:          String(c._id),
  name:         c.name         || '',
  mobile:       c.mobile       || '',
  email:        c.email        || '',
  gst:          c.gst_number   || 'Not provided',
  address:      c.address      || '',
  city:         c.city         || '',
  state:        c.state        || '',
  pincode:      c.pincode      || '',
  type:         c.biz_type     || 'Customer',
  outstanding:  c.outstanding_amount || 0,
  orderCount:   c.order_count  || 0,
  lastOrder:    c.last_order_date ? fmtDate(c.last_order_date) : 'No orders yet',
  // Who added this customer (Staff App / Retailer App / Admin) + their contact.
  createdByType:   c.created_by_type   || 'Admin',
  createdByName:   c.created_by_name   || '',
  createdByMobile: c.created_by_mobile || '',
  createdAt:       c.created_at ? fmtDate(c.created_at) : '',
});

// Quotations - Updated to handle more backend status values
const QUOTE_STATUS_MAP = {
  'Draft': 'PENDING',
  'Sent': 'PENDING', 
  'Pending': 'PENDING',
  'Responded': 'RESPONDED',
  'Negotiation': 'NEGOTIATION',
  'Accepted': 'ACCEPTED',
  'Rejected': 'REJECTED',
  'Expired': 'EXPIRED',
  'Cancelled': 'CANCELLED',
  'Converted': 'CONVERTED',
};

const mapApiQuotation = q => {
  const item = (q.items || [])[0] || {};
  return {
    id:             q.quotation_no  || String(q._id),
    _id:            String(q._id),
    createdByType:  q.created_by_type === 'Admin' ? 'STAFF' : (q.created_by_type || 'STAFF'),
    createdByName:  q.created_by_name || '',
    customerId:     String(q.customer_id  || ''),
    customerName:   q.customer_name  || '',
    productId:      String(item.product_id || ''),
    productName:    item.product_name || '',
    brandName:      item.brand_name    || '',
    categoryName:   item.category_name || '',
    size:           item.size          || '',
    finish:         item.finish        || '',
    quantity:       Number(item.qty  || 0),
    unit:           item.unit        || '',
    rate:           Number(item.rate || 0),
    discount:       Number(q.discount || item.disc || 0),
    gst:            Number(item.gst_percent || 18),
    deliveryCharge: Number(q.freight_charges || 0),
    total:          Number(q.grand_total || 0),
    // seller = who will handle this quotation (product owner's company)
    sellerCompanyId: String(q.seller_company_id || q.company_id || ''),
    wholesaler:     q.seller_company_name || q.supplier_name || '',
    status:         QUOTE_STATUS_MAP[q.status] || q.status || 'PENDING',
    createdAt:      fmtDate(q.created_at),
    remarks:        q.remarks || q.notes || '',
    terms:          q.terms || '',
    deliveryAddress: q.delivery_no || '',
    validUntil:     q.valid_until ? fmtDate(q.valid_until) : '',
    enquiryNo:      q.enquiry_no || '',
  };
};

// Products
const mapApiProduct = p => {
  // brand and category may come as populated objects {_id, name} or raw ObjectId strings
  const brandName    = typeof p.brand_id    === 'object' ? (p.brand_id?.name    || '') : (p.brand_name    || '');
  const categoryName = typeof p.category_id === 'object' ? (p.category_id?.name || '') : (p.category_name || '');
  const subCatName   = typeof p.sub_category_id === 'object' ? (p.sub_category_id?.name || '') : (p.sub_category_name || '');

  // Pick best available rate — prefer dealer, then retail, then selling, then mrp
  const rate = p.dealer_price  || p.retail_price  || p.selling_price ||
               p.wholesale_rate || p.project_rate  || p.mrp || 0;

  return {
    id:           String(p._id),
    _id:          String(p._id),
    companyId:    String(p.company_id?._id || p.company_id || ''),  // product owner's company
    companyName:  p.company_id?.name || '',
    createdByType: p.created_by_type || 'Admin',
    code:         p.code         || '',
    name:         p.name         || '',
    brand:        brandName,
    category:     categoryName,
    subCategory:  subCatName,
    size:         p.size         || '',
    finish:       p.finish       || '',
    color:        p.color        || '',
    unit:         p.unit         || 'Sq Ft',
    gst:          p.gst_percent  || 18,
    mrp:          p.mrp          || 0,
    rate,
    retailPrice:  p.retail_price  || 0,
    dealerPrice:  p.dealer_price  || 0,
    sellingPrice: p.selling_price || 0,
    wholesaleRate:p.wholesale_rate|| 0,
    stock:        p.available_stock || p.current_stock || 0,
    wholesaler:   p.wholesaler_name || p.company_id?.name || '',
    location:     p.location || '',
    hsnCode:      p.hsn_code || '',
    pcsPerBox:    p.pcs_per_box   || null,
    sqftPerBox:   p.sqft_per_box  || null,
    tileType:     p.tile_type     || '',
    grade:        p.grade         || '',
    isActive:     p.is_active !== false,
    imageUrls:    Array.isArray(p.image_urls) ? p.image_urls.filter(Boolean) : [],
  };
};

// Notifications
const mapApiNotification = n => ({
  id:       String(n._id),
  _id:      String(n._id),
  type:     n.type           || 'general',
  title:    n.title          || '',
  message:  n.message        || '',
  time:     n.created_at ? fmtDateTime(n.created_at) : '',
  read:     n.is_read        || false,
  route:    n.route          || null,
  entityId: n.reference_id   ? String(n.reference_id) : null,
});

// UI payment mode → backend enum
const PAYMENT_MODE_MAP = {
  CASH: 'Cash', UPI: 'UPI', BANK: 'Bank Transfer',
  'BANK TRANSFER': 'Bank Transfer', BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque', CARD: 'Card',
};

// ── AppProvider ────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [isAuthenticated,  setIsAuthenticated]  = useState(false);
  const [pendingMobile,    setPendingMobile]     = useState('');
  const [otpChallenge,     setOtpChallenge]      = useState(null);
  const [staff,            setStaff]             = useState(null);
  const [authLoading,      setAuthLoading]       = useState(false);
  const [restoringSession, setRestoringSession]  = useState(true);

  // Business data — all start empty; populated from the API only.
  const [orders,         setOrders]         = useState([]);
  const [dispatches,     setDispatches]     = useState([]);
  const [invoices,       setInvoices]       = useState([]);
  const [customers,      setCustomers]      = useState([]);  // filtered — only assigned-order customers
  const [allCustomers,   setAllCustomers]   = useState([]);  // all company customers — for quotation form
  const [quotations,     setQuotations]     = useState([]);
  const [products,       setProducts]       = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [unreadCount,    setUnreadCount]    = useState(0);

  // Collections and payments are local-only state that wraps invoice data.
  // They are rebuilt when invoices load and when recordCollection fires.
  const [collections, setCollections] = useState([]);
  const [payments,    setPayments]    = useState([]);

  // Track per-entity loading states so screens can show skeletons.
  const [loadingOrders,     setLoadingOrders]     = useState(false);
  const [loadingInvoices,   setLoadingInvoices]   = useState(false);
  const [loadingCustomers,  setLoadingCustomers]  = useState(false);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [loadingDispatches, setLoadingDispatches] = useState(false);

  // ── Session restore ──────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [token, savedStaff] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.token),
          AsyncStorage.getItem(STORAGE_KEYS.staff),
        ]);
        if (active && token) {
          if (savedStaff) {
            try { setStaff(JSON.parse(savedStaff)); } catch { /* ignore */ }
          }
          setIsAuthenticated(true);
        }
      } finally {
        if (active) setRestoringSession(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // ── Load all business data ────────────────────────────────────
  const loadBusinessData = useCallback(async () => {
    // Load dispatches FIRST, then use them to calculate delivered quantities in orders
    let rawDispatches = [];
    
    // 1. Load Dispatches
    await (async () => {
      setLoadingDispatches(true);
      try {
        console.log('🚀 Calling dispatch API: /staff/dispatches?limit=200');
        const res = await dispatchApi.list({ limit: 200 });
        console.log('📦 Dispatch API full response:', JSON.stringify(res, null, 2));
        
        if (res.success) {
          const list = Array.isArray(res.data?.dispatches) ? res.data.dispatches
                     : Array.isArray(res.data)              ? res.data : [];
          console.log('✅ Raw dispatches loaded:', list.length);
          rawDispatches = list; // Store for order mapping
          const mapped = list.map(mapApiDispatch);
          console.log('✅ Mapped dispatches:', mapped.length);
          setDispatches(mapped);
        } else {
          console.error('❌ Dispatches API error:', res.message);
          console.error('❌ Full error response:', JSON.stringify(res, null, 2));
          // Continue anyway with empty dispatches
          rawDispatches = [];
          setDispatches([]);
        }
      } catch (err) {
        console.error('❌ Dispatches fetch exception:', err.message || err);
        console.error('❌ Exception stack:', err.stack);
        rawDispatches = [];
        setDispatches([]);
      } finally {
        setLoadingDispatches(false);
      }
    })();

    // 2. Load Orders (and other data in parallel)
    await Promise.allSettled([
      (async () => {
        setLoadingOrders(true);
        try {
          console.log('🚀 Calling order API: /staff/orders?limit=200');
          const res = await orderApi.list({ limit: 200 });
          console.log('📦 Orders API response:', { success: res.success, count: res.data?.orders?.length || 0 });
          
          if (res.success) {
            const list = Array.isArray(res.data?.orders) ? res.data.orders
                       : Array.isArray(res.data)          ? res.data : [];
            console.log('✅ Raw orders loaded:', list.length);
            console.log('📊 Sample raw order:', list.length > 0 ? {
              id: list[0]._id,
              code: list[0].order_code,
              qty: list[0].qty,
              packed: list[0].packed_qty,
              dispatched: list[0].dispatched_qty,
              delivered: list[0].delivered_qty,
            } : 'No orders');
            
            // Pass rawDispatches to calculate delivered quantity
            const mapped = list.map(o => mapApiOrder(o, rawDispatches));
            console.log('✅ Mapped orders:', mapped.length);
            console.log('📊 Sample mapped order:', mapped.length > 0 ? {
              id: mapped[0].id,
              quantity: mapped[0].quantity,
              picked: mapped[0].picked,
              dispatched: mapped[0].dispatched,
              delivered: mapped[0].delivered,
            } : 'No orders');
            
            setOrders(mapped);
          } else {
            console.error('❌ Orders API error:', res.message);
          }
        } catch (err) {
          console.error('❌ Orders fetch error:', err.message || err);
        } finally {
          setLoadingOrders(false);
        }
      })(),

      (async () => {
        setLoadingInvoices(true);
        try {
          console.log('🚀 Calling invoice API: /staff/invoices?limit=200');
          const res = await invoiceApi.list({ limit: 200 });
          console.log('💰 Invoice API response:', { success: res.success, count: res.data?.invoices?.length || 0 });
          
          if (res.success) {
            const list = Array.isArray(res.data?.invoices) ? res.data.invoices
                       : Array.isArray(res.data)            ? res.data : [];
            console.log('✅ Raw invoices loaded:', list.length);
            if (list.length > 0) {
              console.log('📊 Sample raw invoice:', list[0]);
            }
            const mapped = list.map(mapApiInvoice);
            console.log('✅ Mapped invoices:', mapped.length);
            if (mapped.length > 0) {
              console.log('📊 Sample mapped invoice:', mapped[0]);
            }
            setInvoices(mapped);

            // Seed payments and collections from each invoice's payment_history.
            // This ensures the Collections screen shows real data after a reload,
            // not just payments recorded in the current session.
            const seedPayments    = [];
            const seedCollections = [];

            mapped.forEach(inv => {
              if (!inv.paymentHistory?.length) return;
              inv.paymentHistory.forEach((ph, idx) => {
                const payId = `PAY-${inv.id}-${idx}`;
                const colId = `COL-${inv.id}-${idx}`;
                seedPayments.push({
                  id:          payId,
                  invoiceId:   inv.id,
                  _invoiceId:  inv._id,
                  orderId:     inv.orderId,
                  customerId:  inv.customerId,
                  customerName: inv.customerName,
                  amount:      ph.amount,
                  mode:        ph.mode || '—',
                  reference:   ph.reference || '',
                  status:      ph.status === 'VERIFIED' || inv.status === 'PAID' ? 'VERIFIED' : 'COLLECTED',
                  date:        ph.date || '',
                  createdBy:   ph.by || '',
                });
                seedCollections.push({
                  id:          colId,
                  paymentId:   payId,
                  _paymentId:  ph._id || null,   // real MongoDB _id of payment_history entry
                  invoiceId:   inv.id,
                  _invoiceId:  inv._id,
                  orderId:     inv.orderId,
                  customerId:  inv.customerId,
                  customerName: inv.customerName,
                  staffId:     null,
                  staffName:   ph.by  || '—',
                  amount:      ph.amount,
                  mode:        ph.mode || '—',
                  reference:   ph.reference || '',
                  collectedAt: ph.date || '',
                  handedOverAt: null,
                  verifiedAt:  ph.verificationStatus === 'Verified' || inv.status === 'PAID' ? ph.date : null,
                  verificationStatus: ph.verificationStatus || 'Pending',
                  otpCode:     ph.otpCode || '',
                  status:      ph.verificationStatus === 'Verified' || inv.status === 'PAID'
                    ? 'ACCOUNT_VERIFIED'
                    : ph.verificationStatus === 'OTP Sent'
                    ? 'ACCOUNT_VERIFICATION'
                    : 'COLLECTED',
                });
              });
            });

            setPayments(seedPayments);
            setCollections(seedCollections);
          } else {
            console.error('❌ Invoices API error:', res.message);
          }
        } catch (err) {
          console.error('❌ Invoices fetch error:', err.message || err);
        } finally {
          setLoadingInvoices(false);
        }
      })(),

      (async () => {
        setLoadingCustomers(true);
        try {
          console.log('🚀 Calling customer API: /staff/customers?limit=200');
          const res = await customerApi.list({ limit: 200 });
          console.log('👥 Customer API response:', { success: res.success, count: res.data?.customers?.length || 0 });
          
          if (res.success) {
            const list = Array.isArray(res.data?.customers) ? res.data.customers
                       : Array.isArray(res.data)             ? res.data : [];
            console.log('✅ Raw customers loaded:', list.length);
            const mapped = list.map(mapApiCustomer);
            console.log('✅ Mapped customers:', mapped.length);
            // Merge: keep any locally-created customers that the API hasn't
            // returned yet (e.g. created_by filter not yet in effect on server)
            setCustomers(prev => {
              const apiIds = new Set(mapped.map(c => c._id || c.id));
              const localOnly = prev.filter(c => !(apiIds.has(c._id) || apiIds.has(c.id)));
              return [...localOnly, ...mapped];
            });
          } else {
            console.error('❌ Customers API error:', res.message);
          }
        } catch (err) {
          console.error('❌ Customers fetch error:', err.message || err);
        } finally {
          setLoadingCustomers(false);
        }
      })(),

      // Load ALL company customers (scope=all) for use in the quotation form.
      // This runs in parallel and does not affect the filtered customers list.
      (async () => {
        try {
          const res = await customerApi.listAll({ limit: 500 });
          if (res.success) {
            const list = Array.isArray(res.data?.customers) ? res.data.customers
                       : Array.isArray(res.data)             ? res.data : [];
            setAllCustomers(list.map(mapApiCustomer));
          }
        } catch (err) {
          console.error('❌ AllCustomers fetch error:', err.message || err);
        }
      })(),

      (async () => {
        setLoadingQuotations(true);
        try {
          console.log('🚀 Calling quotation API: /staff/quotations?limit=200');
          const res = await quotationApi.list({ limit: 200 });
          console.log('📋 Quotation API response:', { success: res.success, count: res.data?.quotations?.length || 0 });
          
          if (res.success) {
            const list = Array.isArray(res.data?.quotations) ? res.data.quotations
                       : Array.isArray(res.data)              ? res.data : [];
            console.log('✅ Raw quotations loaded:', list.length);
            if (list.length > 0) {
              console.log('📊 Sample raw quotation:', list[0]);
            }
            const mapped = list.map(mapApiQuotation);
            console.log('✅ Mapped quotations:', mapped.length);
            if (mapped.length > 0) {
              console.log('📊 Sample mapped quotation:', mapped[0]);
            }
            setQuotations(mapped);
          } else {
            console.error('❌ Quotations API error:', res.message);
          }
        } catch (err) {
          console.error('❌ Quotations fetch error:', err.message || err);
        } finally {
          setLoadingQuotations(false);
        }
      })(),

      (async () => {
        try {
          console.log('🚀 Calling product API: /staff/products?limit=500');
          const res = await productApi.list({ limit: 500 });
          console.log('📦 Product API full response:', JSON.stringify({
            success: res.success,
            message: res.message,
            count: res.data?.products?.length,
            paginationTotal: res.data?.pagination?.total,
          }));
          
          if (res.success) {
            const list = Array.isArray(res.data?.products) ? res.data.products
                       : Array.isArray(res.data)            ? res.data : [];
            console.log('✅ Raw products loaded:', list.length);
            if (list.length > 0) {
              const s = list[0];
              console.log('📊 Sample raw product:', JSON.stringify({
                name: s.name, code: s.code,
                dealer_price: s.dealer_price, retail_price: s.retail_price,
                selling_price: s.selling_price, mrp: s.mrp,
                gst_percent: s.gst_percent, unit: s.unit,
                brand_id: typeof s.brand_id === 'object' ? s.brand_id?.name : s.brand_id,
                category_id: typeof s.category_id === 'object' ? s.category_id?.name : s.category_id,
              }));
            } else {
              console.warn('⚠️ No products returned — check company_id matches product records in DB');
            }
            const mapped = list.map(mapApiProduct);
            console.log('✅ Mapped products:', mapped.length);
            if (mapped.length > 0) {
              console.log('📊 Sample mapped product:', JSON.stringify({
                id: mapped[0].id, name: mapped[0].name,
                rate: mapped[0].rate, gst: mapped[0].gst,
                brand: mapped[0].brand, category: mapped[0].category,
              }));
            }
            setProducts(mapped);
          } else {
            console.error('❌ Products API error:', res.message, 'status:', res.status);
          }
        } catch (err) {
          console.error('❌ Products fetch error:', err.message || err);
        }
      })(),

      (async () => {
        try {
          console.log('🚀 Calling notification API: /staff/notifications?limit=50');
          const res = await notificationApi.list({ limit: 50 });
          console.log('🔔 Notification API response:', { success: res.success, count: res.data?.notifications?.length || 0 });
          
          if (res.success) {
            const list = Array.isArray(res.data?.notifications) ? res.data.notifications
                       : Array.isArray(res.data)                 ? res.data : [];
            console.log('✅ Raw notifications loaded:', list.length);
            const mapped = list.map(mapApiNotification);
            setNotifications(mapped);
            setUnreadCount(res.data?.unreadCount ?? list.filter(n => !n.is_read).length);
          } else {
            console.error('❌ Notifications API error:', res.message);
          }
        } catch (err) {
          console.error('❌ Notifications fetch error:', err.message || err);
        }
      })(),
    ]);
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadBusinessData();
  }, [isAuthenticated, loadBusinessData]);

  // ── Auth ─────────────────────────────────────────────────────
  const requestLoginOtp = async mobile => {
    const normalized = String(mobile).replace(/\D/g, '').slice(-10);
    if (normalized.length !== 10)
      return { success: false, message: 'Enter a valid 10-digit mobile number.' };

    setAuthLoading(true);
    const result = await authApi.staffSendOtp(normalized);
    setAuthLoading(false);

    if (!result.success) return { success: false, message: result.message };
    setPendingMobile(normalized);
    return { success: true, devOtp: result.data?.otp || null };
  };

  const verifyLoginOtp = async otp => {
    const code = String(otp).replace(/\D/g, '');
    if (!pendingMobile)
      return { success: false, message: 'Request a new Staff login OTP.' };
    if (code.length !== 6)
      return { success: false, message: 'Enter the 6-digit OTP.' };

    setAuthLoading(true);
    const result = await authApi.staffVerifyOtp(pendingMobile, code);
    setAuthLoading(false);

    if (!result.success) return { success: false, message: result.message };

    const { token, staff: staffRecord } = result.data || {};
    if (token) await AsyncStorage.setItem(STORAGE_KEYS.token, token);

    const merged = staffRecord ? {
      id:           staffRecord.empCode || staffRecord.id || pendingMobile,
      name:         staffRecord.name         || '',
      mobile:       staffRecord.mobile       || pendingMobile,
      email:        staffRecord.email        || '',
      designation:  staffRecord.designation  || '',
      department:   staffRecord.department   || '',
      branch:       staffRecord.branch       || '',
      role:         staffRecord.role         || '',
      joinDate:     staffRecord.joinDate     || null,
      company:      staffRecord.companyName  || '',
      employeeCode: staffRecord.empCode      || '',
      status:       staffRecord.status       || 'ACTIVE',
      backendId:    staffRecord.id,
      userId:       staffRecord.userId,
      companyId:    staffRecord.companyId,
    } : null;

    if (merged) {
      setStaff(merged);
      await AsyncStorage.setItem(STORAGE_KEYS.staff, JSON.stringify(merged));
    }

    setPendingMobile('');
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.staff]);
    // Reset all state to empty — no static fallback.
    setStaff(null);
    setIsAuthenticated(false);
    setPendingMobile('');
    setOtpChallenge(null);
    setOrders([]);
    setDispatches([]);
    setInvoices([]);
    setCustomers([]);
    setAllCustomers([]);
    setQuotations([]);
    setProducts([]);
    setNotifications([]);
    setUnreadCount(0);
    setCollections([]);
    setPayments([]);
  };

  // ── Customers ─────────────────────────────────────────────────
  const addCustomer = async form => {
    const res = await customerApi.create({
      name:            form.name.trim(),
      mobile:          form.mobile.trim(),
      email:           form.email.trim(),
      gst_number:      form.gst.trim() || '',
      address:         form.address.trim(),
      city:            form.city.trim(),
      state:           form.state.trim(),
      pincode:         form.pincode.trim(),
      biz_type:          'Customer',
      created_by_type:   'Staff App',
      created_by_name:   staff?.name   || '',
      created_by_mobile: staff?.mobile || '',
    });
    if (!res.success) return { success: false, message: res.message };
    const customer = mapApiCustomer(res.data);
    setCustomers(prev => [customer, ...prev]);
    setAllCustomers(prev => [customer, ...prev]);
    return customer;
  };

  // ── Quotations ────────────────────────────────────────────────
  const createQuotation = async form => {
    const customer = allCustomers.find(c => c.id === form.customerId || c._id === form.customerId)
                  || customers.find(c => c.id === form.customerId || c._id === form.customerId);
    const product  = products.find(p => p.id === form.productId  || p._id === form.productId);
    if (!customer || !product) {
      return { success: false, message: 'Customer or product not found.' };
    }

    const qty      = Number(form.quantity);
    const rate     = Number(form.rate);
    const discount = Number(form.discount || 0);
    const gstPct   = Number(form.gst || product.gst || 18);
    const freight  = Number(form.deliveryCharge || 0);
    const other    = Number(form.otherCharge || 0);
    const taxable  = Math.max(0, qty * rate - discount);
    const gstAmt   = taxable * (gstPct / 100);
    const grand    = Math.round(taxable + gstAmt + freight + other);

    const res = await quotationApi.create({
      // seller_company_id = product owner's company (Wholesaler/Retailer/Admin)
      // This routes the quotation to appear in that company's CRM.
      seller_company_id: product.companyId || null,

      customer_id:     customer._id,
      customer_name:   customer.name,
      customer_phone:  customer.mobile,
      customer_email:  customer.email || '',
      created_by_type: 'Staff App',
      created_by_name: staff?.name || '',
      items: [{
        product_id:        product._id,
        product_code:      product.code,
        product_name:      product.name,
        brand_name:        product.brand,
        category_name:     product.category,
        sub_category_name: product.subCategory || '',
        size:              product.size   || '',
        finish:            product.finish || '',
        color:             product.color  || '',
        unit:              product.unit,
        gst_percent:       gstPct,
        mrp:               product.mrp         || 0,
        retail_price:      product.retailPrice  || 0,
        dealer_price:      product.dealerPrice  || 0,
        pcs_per_box:       product.pcsPerBox    || null,
        sqft_per_box:      product.sqftPerBox   || null,
        qty,
        rate,
        disc:  discount,
        total: taxable + gstAmt,
      }],
      discount,
      subtotal:        taxable,
      gst_amount:      gstAmt,
      grand_total:     grand,
      freight_charges: freight,
      other_charges:   other,
      remarks:         String(form.remarks || '').trim(),
      terms:           String(form.terms   || '').trim(),
      delivery_no:     String(form.deliveryAddress || '').trim(),
      valid_until:     form.validUntil || null,
    });

    if (!res.success) return { success: false, message: res.message };
    const quotation = mapApiQuotation(res.data);
    setQuotations(prev => [quotation, ...prev]);
    return quotation;
  };

  // ── Orders (read-only for staff — status changes driven by Admin) ──
  const advanceOrder = () => null;      // staff cannot advance orders
  const holdOrder    = () => null;
  const resumeOrder  = () => null;

  // Fetch a single order with full detail (dispatches, invoices, payment summary).
  // The result is mapped in-place using mapApiOrder, then used directly in the
  // OrderDetailScreen via local state — it does NOT replace the orders list.
  const fetchOrderDetail = async (orderId) => {
    try {
      const res = await orderApi.get(orderId);
      if (!res.success) return { success: false, message: res.message };
      // Re-use current dispatches for delivered-qty calculation fallback
      const rawDispatches = dispatches.map(d => ({
        order_id: d._orderId || d.orderId,
        order_code: d.orderId,
        status: d.rawStatus || d.status,
        qty: d.quantity,
      }));
      const mapped = mapApiOrder(res.data, rawDispatches);
      return { success: true, order: mapped };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to load order detail.' };
    }
  };

  // ── Dispatches (read-only) ────────────────────────────────────
  // Delivery-OTP verify is local in-app only (no backend endpoint yet).
  const requestDeliveryOtp = dispatchId => {
    const dispatch = dispatches.find(d => d.id === dispatchId || d._id === dispatchId);
    if (!dispatch || dispatch.status !== 'OUT_FOR_DELIVERY') {
      return { success: false, message: 'Delivery OTP is only available for an out-for-delivery dispatch.' };
    }
    // In production an SMS OTP would be sent. For now we signal that the request
    // was made and let the user wait for the actual SMS from the backend.
    setOtpChallenge({ purpose: OTP_PURPOSES.DELIVERY, dispatchId: dispatch.id });
    return { success: true, dispatchId: dispatch.id };
  };

  const verifyDeliveryOtp = (_dispatchId, _otp) => ({
    success: false,
    message: 'Delivery confirmation is handled by Admin. No action needed here.',
  });

  // ── Collections (local workflow wrapping invoice payments) ────
  const recordCollection = async details => {
    const invoice = invoices.find(
      inv => inv.id === details.invoiceId || inv._id === details.invoiceId,
    );
    const amount = Number(details.amount);

    if (!invoice || amount <= 0 || amount > invoice.balance) {
      return { success: false, message: 'Collection amount exceeds invoice balance.' };
    }

    // Persist the payment on the backend against the real invoice _id.
    const res = await invoiceApi.recordPayment(invoice._id, {
      amount,
      payment_mode:  PAYMENT_MODE_MAP[String(details.mode || '').toUpperCase()] || 'Cash',
      reference_no: (details.reference || '').trim(),
    });
    if (!res.success) return { success: false, message: res.message || 'Could not record payment.' };

    const now = new Date();
    // Extract the real MongoDB _id of the new payment_history entry from the response
    const updatedInvoice = res.data;
    const newPhEntry = Array.isArray(updatedInvoice?.payment_history)
      ? updatedInvoice.payment_history[updatedInvoice.payment_history.length - 1]
      : null;
    const realPaymentId = newPhEntry?._id ? String(newPhEntry._id) : null;

    const payment = {
      id:           `PAY-${Date.now()}`,
      invoiceId:    invoice.id,
      _invoiceId:   invoice._id,
      orderId:      invoice.orderId,
      customerId:   invoice.customerId,
      customerName: invoice.customerName,
      amount,
      mode:     details.mode,
      reference: (details.reference || '').trim() || 'Staff collection',
      status:   'COLLECTED',
      date:     fmtDate(now),
      createdBy: staff?.name || '',
    };
    const collection = {
      id:           `COL-${Date.now()}`,
      paymentId:    payment.id,
      _paymentId:   realPaymentId,      // real MongoDB payment_history _id for OTP verify
      invoiceId:    invoice.id,
      _invoiceId:   invoice._id,
      orderId:      invoice.orderId,
      customerId:   invoice.customerId,
      customerName: invoice.customerName,
      staffId:      staff?.id || '',
      staffName:    staff?.name || '',
      amount,
      mode:     payment.mode,
      reference: payment.reference,
      collectedAt: fmtDateTime(now),
      handedOverAt: null,
      verifiedAt:   null,
      status:       'COLLECTED',
    };

    const paidAmount = Math.min(invoice.total, invoice.paidAmount + amount);
    const balance    = Math.max(0, invoice.total - paidAmount);

    setPayments(prev  => [payment, ...prev]);
    setCollections(prev => [collection, ...prev]);
    setInvoices(prev =>
      prev.map(inv =>
        (inv.id === invoice.id || inv._id === invoice._id)
          ? { ...inv, paidAmount, balance, status: balance === 0 ? 'PAID' : 'PARTIALLY_PAID' }
          : inv,
      ),
    );
    setCustomers(prev =>
      prev.map(c =>
        (c.id === invoice.customerId || c._id === invoice.customerId)
          ? { ...c, outstanding: Math.max(0, c.outstanding - amount) }
          : c,
      ),
    );

    return { success: true, collection, payment };
  };

  const handoverCollection = collectionId => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection || collection.status !== 'COLLECTED') return null;
    setCollections(prev =>
      prev.map(c =>
        c.id === collectionId
          ? { ...c, status: 'HANDOVER_PENDING', handedOverAt: fmtDateTime(new Date()) }
          : c,
      ),
    );
    setPayments(prev =>
      prev.map(p => p.id === collection.paymentId ? { ...p, status: 'HANDOVER_PENDING' } : p),
    );
    return 'HANDOVER_PENDING';
  };

  const startAccountsVerification = collectionId => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection || collection.status !== 'HANDOVER_PENDING') return null;
    setCollections(prev =>
      prev.map(c => c.id === collectionId ? { ...c, status: 'ACCOUNT_VERIFICATION' } : c),
    );
    setOtpChallenge({
      purpose:      OTP_PURPOSES.PAYMENT_COLLECTION,
      collectionId,
      mobile:       staff?.mobile || '',
      staffId:      staff?.id     || '',
    });
    return 'ACCOUNT_VERIFICATION';
  };

  const verifyCollectionOtp = async (collectionId, otp) => {
    if (String(otp).replace(/\D/g, '').length !== 6) {
      return { success: false, message: 'Enter the 6-digit OTP.' };
    }

    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return { success: false, message: 'Collection not found.' };

    // If this collection has a real backend invoice + payment ID, verify via API
    if (collection._invoiceId && collection._paymentId) {
      try {
        const res = await invoiceApi.verifyCollection(
          collection._invoiceId,
          collection._paymentId,
          otp,
        );
        if (!res.success) return { success: false, message: res.message || 'Invalid OTP.' };
      } catch (err) {
        return { success: false, message: err?.message || 'Network error.' };
      }
    }

    // Update local state regardless (works for both real and local-only collections)
    setCollections(prev =>
      prev.map(c =>
        c.id === collectionId
          ? { ...c, status: 'ACCOUNT_VERIFIED', verifiedAt: fmtDateTime(new Date()) }
          : c,
      ),
    );
    setPayments(prev =>
      prev.map(p => p.id === collection.paymentId ? { ...p, status: 'VERIFIED' } : p),
    );
    setOtpChallenge(null);
    return { success: true, collectionId };
  };

  // ── Notifications ─────────────────────────────────────────────
  const markNotificationRead = async notificationId => {
    // Optimistic update first; backend call in background.
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId || n._id === notificationId) ? { ...n, read: true } : n),
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    await notificationApi.markRead(notificationId).catch(() => {});
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await notificationApi.markAllRead().catch(() => {});
  };

  const deleteNotification = async notificationId => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId && n._id !== notificationId),
    );
    setUnreadCount(prev =>
      Math.max(0, prev - (notifications.find(n => n.id === notificationId && !n.read) ? 1 : 0)),
    );
    await notificationApi.delete(notificationId).catch(() => {});
  };

  const clearAllNotifications = async () => {
    // Delete each one on the backend (fire-and-forget).
    const ids = notifications.map(n => n._id || n.id);
    setNotifications([]);
    setUnreadCount(0);
    await Promise.allSettled(ids.map(id => notificationApi.delete(id)));
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        pendingMobile,
        otpChallenge,
        authLoading,
        restoringSession,
        staff,
        products,
        customers,
        allCustomers,
        quotations,
        orders,
        dispatches,
        invoices,
        payments,
        collections,
        notifications,
        unreadCount,
        loadingOrders,
        loadingInvoices,
        loadingCustomers,
        loadingQuotations,
        loadingDispatches,
        // actions
        requestLoginOtp,
        verifyLoginOtp,
        logout,
        loadBusinessData,
        addCustomer,
        createQuotation,
        advanceOrder,
        fetchOrderDetail,
        requestDeliveryOtp,
        verifyDeliveryOtp,
        holdOrder,
        resumeOrder,
        recordCollection,
        handoverCollection,
        startAccountsVerification,
        verifyCollectionOtp,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within AppProvider');
  return context;
};

/**
 * useRefresh — convenience hook for pull-to-refresh on any list screen.
 *
 * Usage:
 *   const { refreshing, onRefresh } = useRefresh();
 *   <Screen refreshing={refreshing} onRefresh={onRefresh}>
 */
export const useRefresh = () => {
  const { loadBusinessData } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBusinessData();
    } finally {
      setRefreshing(false);
    }
  }, [loadBusinessData]);

  return { refreshing, onRefresh };
};

// Export mapper for use in detail screens that fetch individual records
export { mapApiInvoice };
