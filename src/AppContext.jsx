import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, orderApi, invoiceApi } from './api';
import { STORAGE_KEYS } from './config';
import {
  collectionsSeed,
  customersSeed,
  dispatchesSeed,
  invoicesSeed,
  notificationsSeed,
  ordersSeed,
  OTP_PURPOSES,
  paymentsSeed,
  productsSeed,
  quotationsSeed,
  staffProfile,
} from './mockData';

const AppContext = createContext(undefined);

const nextNumber = (items, prefix, start) => {
  const largest = items.reduce((max, item) => {
    const value = Number(String(item.id).replace(/\D/g, ''));
    return Number.isNaN(value) ? max : Math.max(max, value);
  }, start);

  return `${prefix}-${String(largest + 1).padStart(5, '0')}`;
};

const notificationFor = (type, title, message, route, entityId) => ({
  id: `NOT-${Date.now()}`,
  type,
  title,
  message,
  time: 'Just now',
  read: false,
  route,
  entityId,
});

// ── Backend → screen-shape mappers ───────────────────────────
// The screens were built against camelCase mock records. These normalise the
// snake_case documents the API returns into the same shape.
const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const ORDER_STATUS_MAP = {
  New: 'NEW', 'Pending Approval': 'PROCESSING', Approved: 'PROCESSING',
  'Picking Started': 'PROCESSING', 'Picking Completed': 'PROCESSING',
  'Sorting Started': 'PROCESSING', 'Sorting Completed': 'PROCESSING',
  'Packing Started': 'PROCESSING', 'Packing Completed': 'PROCESSING',
  'Invoice Generated': 'PROCESSING', 'Ready for Dispatch': 'READY',
  'Partially Dispatched': 'DISPATCHED', Dispatched: 'DISPATCHED',
  'In Transit': 'IN_TRANSIT', Delivered: 'DELIVERED', Cancelled: 'CANCELLED',
};

const mapApiOrder = o => ({
  id: o.order_code || o._id,
  _id: o._id,
  customerId: o.customer_id || '',
  customerName: o.customer_name || '',
  productName: o.product_name || '',
  quantity: o.qty || 0,
  unit: o.unit || '',
  rate: o.rate || 0,
  subtotal: o.amount || 0,
  gstAmount: o.gst_amount || 0,
  total: o.total_amount || 0,
  status: ORDER_STATUS_MAP[o.status] || 'PROCESSING',
  rawStatus: o.status || '',
  enquiryCode: o.enquiry_code || '',
  createdAt: fmtDate(o.created_at),
  createdByType: o.created_by_type || '',
  createdByName: o.created_by_name || '',
  orderDate: fmtDate(o.order_date || o.created_at),
});

const INV_STATUS_MAP = {
  Unpaid: 'PENDING', 'Partially Paid': 'PARTIALLY_PAID', Paid: 'PAID',
  Overdue: 'PENDING', Cancelled: 'CANCELLED',
};

const mapApiInvoice = inv => {
  const item = (inv.items || [])[0] || {};
  const qty = (inv.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
  return {
    id: inv.invoice_no || inv._id,
    _id: inv._id,
    orderId: inv.order_no || '',
    dispatchId: '',
    customerId: inv.customer_id || '',
    customerName: inv.customer_name || '',
    productName: item.product_name || '',
    quantity: qty,
    unit: item.unit || '',
    rate: item.rate || 0,
    subtotal: inv.subtotal || 0,
    gstAmount: inv.gst_amount || 0,
    deliveryCharge: (inv.freight_charges || 0) + (inv.other_charges || 0),
    total: inv.grand_total || 0,
    paidAmount: inv.paid_amount || 0,
    balance: inv.balance_due != null ? inv.balance_due : (inv.grand_total || 0) - (inv.paid_amount || 0),
    status: INV_STATUS_MAP[inv.payment_status] || 'PENDING',
    dueDate: fmtDate(inv.due_date),
    invoiceDate: fmtDate(inv.invoice_date),
    createdByType: inv.created_by_type || '',
  };
};

// UI payment mode → backend enum.
const PAYMENT_MODE_MAP = {
  CASH: 'Cash', UPI: 'UPI', BANK: 'Bank Transfer', 'BANK TRANSFER': 'Bank Transfer',
  BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', CARD: 'Card',
};

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingMobile, setPendingMobile] = useState('');
  const [otpChallenge, setOtpChallenge] = useState(null);
  const [staff, setStaff] = useState(staffProfile);
  const [authLoading, setAuthLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [customers, setCustomers] = useState(customersSeed);
  const [quotations, setQuotations] = useState(quotationsSeed);
  const [orders, setOrders] = useState(ordersSeed);
  const [dispatches, setDispatches] = useState(dispatchesSeed);
  const [invoices, setInvoices] = useState(invoicesSeed);
  const [payments, setPayments] = useState(paymentsSeed);
  const [collections, setCollections] = useState(collectionsSeed);
  const [notifications, setNotifications] = useState(notificationsSeed);

  const pushNotification = notification => {
    setNotifications(current => [notification, ...current]);
  };

  // Restore a saved session on app start so staff stay logged in.
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
            try {
              setStaff({ ...staffProfile, ...JSON.parse(savedStaff) });
            } catch {
              /* ignore malformed cache */
            }
          }
          setIsAuthenticated(true);
        }
      } finally {
        if (active) {
          setRestoringSession(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Pull the company's real Sales Orders + Invoices from the backend and
  // replace the mock seeds. Falls back silently to whatever is loaded.
  const loadBusinessData = React.useCallback(async () => {
    const [orderRes, invoiceRes] = await Promise.all([
      orderApi.list({ limit: 100 }),
      invoiceApi.list({ limit: 100 }),
    ]);
    if (orderRes.success) {
      const list = orderRes.data?.orders || orderRes.data || [];
      if (Array.isArray(list)) setOrders(list.map(mapApiOrder));
    }
    if (invoiceRes.success) {
      const list = invoiceRes.data?.invoices || invoiceRes.data || [];
      if (Array.isArray(list)) setInvoices(list.map(mapApiInvoice));
    }
  }, []);

  // Load business data whenever the staff becomes authenticated.
  useEffect(() => {
    if (isAuthenticated) loadBusinessData();
  }, [isAuthenticated, loadBusinessData]);

  // Request a login OTP for the mobile Admin registered in HR Employee Mgmt.
  const requestLoginOtp = async mobile => {
    const normalized = String(mobile).replace(/\D/g, '').slice(-10);

    if (normalized.length !== 10) {
      return { success: false, message: 'Enter a valid 10-digit mobile number.' };
    }

    setAuthLoading(true);
    const result = await authApi.staffSendOtp(normalized);
    setAuthLoading(false);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    setPendingMobile(normalized);
    // In dev the backend may return the OTP so it can be shown during testing.
    return { success: true, devOtp: result.data?.otp || null };
  };

  const verifyLoginOtp = async otp => {
    const code = String(otp).replace(/\D/g, '');
    if (!pendingMobile) {
      return { success: false, message: 'Request a new Staff login OTP.' };
    }
    if (code.length !== 6) {
      return { success: false, message: 'Enter the 6-digit OTP.' };
    }

    setAuthLoading(true);
    const result = await authApi.staffVerifyOtp(pendingMobile, code);
    setAuthLoading(false);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    const { token, staff: staffRecord } = result.data || {};
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEYS.token, token);
    }
    if (staffRecord) {
      // Build the profile from the real employee record. Fall back to empty
      // strings (not mock data) so the UI shows the actual logged-in details.
      const merged = {
        id: staffRecord.empCode || staffRecord.id || pendingMobile,
        name: staffRecord.name || '',
        mobile: staffRecord.mobile || pendingMobile,
        email: staffRecord.email || '',
        designation: staffRecord.designation || '',
        department: staffRecord.department || '',
        branch: staffRecord.branch || '',
        role: staffRecord.role || '',
        joinDate: staffRecord.joinDate || null,
        company: staffRecord.companyName || '',
        employeeCode: staffRecord.empCode || '',
        status: staffRecord.status || 'ACTIVE',
        backendId: staffRecord.id,
        userId: staffRecord.userId,
        companyId: staffRecord.companyId,
      };
      setStaff(merged);
      await AsyncStorage.setItem(STORAGE_KEYS.staff, JSON.stringify(merged));
    }

    setPendingMobile('');
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.staff]);
    setStaff(staffProfile);
    setIsAuthenticated(false);
    setPendingMobile('');
  };

  const addCustomer = form => {
    const customer = {
      id: nextNumber(customers, 'CUS', 1003),
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      gst: form.gst.trim() || 'Not provided',
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      type: 'Customer',
      outstanding: 0,
      orderCount: 0,
      lastOrder: 'No orders yet',
    };

    setCustomers(current => [customer, ...current]);
    pushNotification(
      notificationFor(
        'customer',
        'Customer created',
        `${customer.name} is now visible to Staff and Admin.`,
        'CustomerDetail',
        customer.id,
      ),
    );
    return customer;
  };

  const createQuotation = form => {
    const customer = customers.find(item => item.id === form.customerId);
    const product = productsSeed.find(item => item.id === form.productId);
    const quantity = Number(form.quantity);
    const rate = Number(form.rate);
    const discount = Number(form.discount || 0);
    const deliveryCharge = Number(form.deliveryCharge || 0);
    const otherCharge = Number(form.otherCharge || 0);
    const taxable = Math.max(0, quantity * rate - discount);
    const gstAmount = taxable * (Number(form.gst || product.gst) / 100);
    const quotation = {
      id: nextNumber(quotations, 'QT', 126),
      createdByType: 'STAFF',
      createdByName: staffProfile.name,
      creationAction: 'STAFF_QUOTATION',
      adminVisibility: 'SUBMITTED_TO_ADMIN',
      customerId: customer.id,
      customerName: customer.name,
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit,
      rate,
      discount,
      gst: Number(form.gst || product.gst),
      deliveryCharge,
      otherCharge,
      total: Math.round(taxable + gstAmount + deliveryCharge + otherCharge),
      wholesaler: product.wholesaler,
      validUntil: String(form.validUntil ?? '').trim() || 'Not specified',
      status: 'PENDING',
      createdAt: '27 Aug 2026',
      remarks:
        String(form.remarks ?? '').trim() ||
        'Created by Staff for customer.',
      terms: String(form.terms ?? '').trim(),
    };

    setQuotations(current => [quotation, ...current]);
    pushNotification(
      notificationFor(
        'quotation',
        'Quotation submitted to Admin',
        `${quotation.id} created by ${staffProfile.name} for ${quotation.customerName}.`,
        'QuotationDetail',
        quotation.id,
      ),
    );
    return quotation;
  };

  const advanceOrder = orderId => {
    const statusFlow = {
      CONFIRMED: 'PACKING',
      PACKING: 'READY_TO_DISPATCH',
      READY_TO_DISPATCH: 'OUT_FOR_DELIVERY',
    };
    const order = orders.find(item => item.id === orderId);
    const nextStatus = order ? statusFlow[order.status] : null;

    if (!nextStatus) {
      return null;
    }

    if (nextStatus === 'OUT_FOR_DELIVERY') {
      setDispatches(current =>
        current.map(item =>
          item.orderId === orderId && item.status !== 'DELIVERED'
            ? {
                ...item,
                status: 'OUT_FOR_DELIVERY',
                deliveryOtpStatus: 'PENDING',
              }
            : item,
        ),
      );
    }

    setOrders(current =>
      current.map(item =>
        item.id === orderId ? { ...item, status: nextStatus } : item,
      ),
    );
    pushNotification(
      notificationFor(
        'order',
        'Order status updated',
        `${orderId} moved to ${nextStatus.replace(/_/g, ' ')}.`,
        'OrderDetail',
        orderId,
      ),
    );
    return nextStatus;
  };

  const requestDeliveryOtp = dispatchId => {
    const dispatch = dispatches.find(item => item.id === dispatchId);

    if (!dispatch || dispatch.status !== 'OUT_FOR_DELIVERY') {
      return {
        success: false,
        message: 'Delivery OTP is available only for an out-for-delivery dispatch.',
      };
    }

    setOtpChallenge({
      purpose: OTP_PURPOSES.DELIVERY,
      code: '135790',
      dispatchId: dispatch.id,
      orderId: dispatch.orderId,
    });
    return { success: true, dispatchId: dispatch.id };
  };

  const verifyDeliveryOtp = (dispatchId, otp) => {
    if (
      !otpChallenge ||
      otpChallenge.purpose !== OTP_PURPOSES.DELIVERY ||
      otpChallenge.dispatchId !== dispatchId
    ) {
      return { success: false, message: 'Request a new Delivery OTP first.' };
    }

    if (String(otp) !== otpChallenge.code) {
      return {
        success: false,
        message: 'Incorrect Delivery OTP. Use 135790 for this static demo.',
      };
    }

    const dispatch = dispatches.find(item => item.id === dispatchId);
    const order = orders.find(item => item.id === dispatch?.orderId);
    if (!dispatch || !order || dispatch.status !== 'OUT_FOR_DELIVERY') {
      return { success: false, message: 'This dispatch cannot be delivered.' };
    }

    const delivered = Math.min(
      order.quantity,
      dispatches
        .filter(item => item.orderId === order.id)
        .reduce(
          (sum, item) =>
            sum +
            (item.id === dispatchId || item.status === 'DELIVERED'
              ? item.quantity
              : 0),
          0,
        ),
    );
    const status =
      delivered === order.quantity ? 'DELIVERED' : 'PARTIALLY_DELIVERED';

    setDispatches(current =>
      current.map(item =>
        item.id === dispatchId
          ? {
              ...item,
              status: 'DELIVERED',
              deliveryOtpStatus: 'OTP_VERIFIED',
              deliveredDate: '27 Aug 2026',
            }
          : item,
      ),
    );
    setOrders(current =>
      current.map(item =>
        item.id === order.id ? { ...item, delivered, status } : item,
      ),
    );
    setOtpChallenge(null);
    pushNotification(
      notificationFor(
        'delivery',
        'Delivery OTP verified',
        `${dispatchId} delivered ${dispatch.quantity} ${order.unit}; ${order.id} is ${status.replace(/_/g, ' ')}.`,
        'DispatchDetail',
        dispatchId,
      ),
    );
    return { success: true, orderId: order.id, status };
  };

  const holdOrder = (orderId, reason, remarks) => {
    const order = orders.find(item => item.id === orderId);
    if (!order || ['DELIVERED', 'CANCELLED'].includes(order.status)) {
      return null;
    }

    const previousStatus = order.status;
    setOrders(current =>
      current.map(item =>
        item.id === orderId
          ? {
              ...item,
              status: 'HOLD',
              previousStatus,
              holdReason: reason,
              holdRemarks: remarks,
              heldBy: staffProfile.name,
              heldAt: '27 Aug 2026, 04:30 PM',
            }
          : item,
      ),
    );
    pushNotification(
      notificationFor(
        'order',
        'Order placed on HOLD',
        `${orderId} is on hold: ${String(reason).replace(/_/g, ' ')}.`,
        'OrderDetail',
        orderId,
      ),
    );
    return 'HOLD';
  };

  const resumeOrder = orderId => {
    const order = orders.find(item => item.id === orderId);
    if (!order || order.status !== 'HOLD') {
      return null;
    }

    const resumedStatus = order.previousStatus || 'PROCESSING';
    setOrders(current =>
      current.map(item =>
        item.id === orderId
          ? {
              ...item,
              status: resumedStatus,
              holdResolvedAt: '27 Aug 2026, 05:00 PM',
            }
          : item,
      ),
    );
    pushNotification(
      notificationFor(
        'order',
        'Order hold resolved',
        `${orderId} resumed as ${resumedStatus.replace(/_/g, ' ')}.`,
        'OrderDetail',
        orderId,
      ),
    );
    return resumedStatus;
  };

  const recordCollection = async details => {
    const invoice = invoices.find(item => item.id === details.invoiceId);
    const amount = Number(details.amount);

    if (!invoice || amount <= 0 || amount > invoice.balance) {
      return { success: false, message: 'Collection amount exceeds invoice balance.' };
    }

    // Persist the payment against the real invoice on the backend.
    if (invoice._id) {
      const res = await invoiceApi.recordPayment(invoice._id, {
        amount,
        payment_mode: PAYMENT_MODE_MAP[String(details.mode || '').toUpperCase()] || 'Cash',
        reference_no: (details.reference || '').trim(),
      });
      if (!res.success) {
        return { success: false, message: res.message || 'Could not record payment.' };
      }
    }

    const payment = {
      id: nextNumber(payments, 'PAY', 59),
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount,
      mode: details.mode,
      reference: (details.reference || '').trim() || 'Staff collection',
      status: 'COLLECTED',
      date: fmtDate(new Date()),
      createdBy: staff.name || staffProfile.name,
    };
    const collection = {
      id: nextNumber(collections, 'COL', 101),
      paymentId: payment.id,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      staffId: staffProfile.id,
      staffName: staffProfile.name,
      amount,
      mode: payment.mode,
      reference: payment.reference,
      collectedAt: '27 Aug 2026, 04:45 PM',
      handedOverAt: null,
      verifiedAt: null,
      status: 'COLLECTED',
    };
    const paidAmount = Math.min(invoice.total, invoice.paidAmount + amount);
    const balance = Math.max(0, invoice.total - paidAmount);

    setPayments(current => [payment, ...current]);
    setCollections(current => [collection, ...current]);
    setInvoices(current =>
      current.map(item =>
        item.id === invoice.id
          ? {
              ...item,
              paidAmount,
              balance,
              status: balance === 0 ? 'PAID' : 'PARTIALLY_PAID',
            }
          : item,
      ),
    );
    setCustomers(current =>
      current.map(customer =>
        customer.id === invoice.customerId
          ? {
              ...customer,
              outstanding: Math.max(0, customer.outstanding - amount),
            }
          : customer,
      ),
    );
    pushNotification(
      notificationFor(
        'collection',
        'Collection recorded',
        `${collection.id} collected for ${invoice.id}. Handover to Accounts is pending.`,
        'CollectionDetail',
        collection.id,
      ),
    );
    return { success: true, collection, payment };
  };

  const handoverCollection = collectionId => {
    const collection = collections.find(item => item.id === collectionId);
    if (!collection || collection.status !== 'COLLECTED') {
      return null;
    }

    setCollections(current =>
      current.map(item =>
        item.id === collectionId
          ? {
              ...item,
              status: 'HANDOVER_PENDING',
              handedOverAt: '27 Aug 2026, 05:10 PM',
            }
          : item,
      ),
    );
    setPayments(current =>
      current.map(item =>
        item.id === collection.paymentId
          ? { ...item, status: 'HANDOVER_PENDING' }
          : item,
      ),
    );
    pushNotification(
      notificationFor(
        'collection',
        'Collection sent to Accounts',
        `${collectionId} is waiting for Accounts verification.`,
        'CollectionDetail',
        collectionId,
      ),
    );
    return 'HANDOVER_PENDING';
  };

  const startAccountsVerification = collectionId => {
    const collection = collections.find(item => item.id === collectionId);
    if (!collection || collection.status !== 'HANDOVER_PENDING') {
      return null;
    }

    setCollections(current =>
      current.map(item =>
        item.id === collectionId
          ? { ...item, status: 'ACCOUNT_VERIFICATION' }
          : item,
      ),
    );
    setOtpChallenge({
      purpose: OTP_PURPOSES.PAYMENT_COLLECTION,
      code: '246810',
      collectionId,
      mobile: staffProfile.mobile,
      staffId: staffProfile.id,
    });
    pushNotification(
      notificationFor(
        'collection',
        'Accounts requested OTP verification',
        `${OTP_PURPOSES.PAYMENT_COLLECTION} sent for ${collectionId}.`,
        'CollectionOtp',
        collectionId,
      ),
    );
    return 'ACCOUNT_VERIFICATION';
  };

  const verifyCollectionOtp = (collectionId, otp) => {
    if (
      !otpChallenge ||
      otpChallenge.purpose !== OTP_PURPOSES.PAYMENT_COLLECTION ||
      otpChallenge.collectionId !== collectionId
    ) {
      return { success: false, message: 'Accounts must start verification first.' };
    }

    if (String(otp) !== otpChallenge.code) {
      return {
        success: false,
        message: 'Incorrect collection OTP. Use 246810 for this static demo.',
      };
    }

    const collection = collections.find(item => item.id === collectionId);
    setCollections(current =>
      current.map(item =>
        item.id === collectionId
          ? {
              ...item,
              status: 'ACCOUNT_VERIFIED',
              verifiedAt: '27 Aug 2026, 05:20 PM',
            }
          : item,
      ),
    );
    setPayments(current =>
      current.map(item =>
        item.id === collection.paymentId
          ? { ...item, status: 'VERIFIED' }
          : item,
      ),
    );
    setOtpChallenge(null);
    pushNotification(
      notificationFor(
        'collection',
        'Accounts handover verified',
        `${collectionId} is complete and recorded by Accounts.`,
        'CollectionDetail',
        collectionId,
      ),
    );
    return { success: true, collectionId };
  };

  const markNotificationRead = notificationId => {
    setNotifications(current =>
      current.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification,
      ),
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications(current =>
      current.map(notification => ({ ...notification, read: true })),
    );
  };

  const deleteNotification = notificationId => {
    setNotifications(current =>
      current.filter(notification => notification.id !== notificationId),
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(item => !item.read).length;

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        pendingMobile,
        otpChallenge,
        authLoading,
        restoringSession,
        staff,
        products: productsSeed,
        customers,
        quotations,
        orders,
        dispatches,
        invoices,
        payments,
        collections,
        notifications,
        unreadCount,
        requestLoginOtp,
        verifyLoginOtp,
        logout,
        addCustomer,
        createQuotation,
        advanceOrder,
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

  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
};
