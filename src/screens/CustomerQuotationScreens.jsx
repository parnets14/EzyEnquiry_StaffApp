import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApp, useRefresh } from '../AppContext';
import { orderApi, quotationApi, invoiceApi } from '../api';
import { API_BASE_URL } from '../config';
import {
  AppHeader,
  ChoiceChips,
  EmptyState,
  InfoRow,
  NoticeBanner,
  PrimaryButton,
  Screen,
  SearchInput,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  TextField,
} from '../components';
import {
  colors,
  formatCurrency,
  radius,
  shadow,
  spacing,
  typography,
} from '../theme';

const formatQuotationDate = date =>
  date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

// Short date for activity rows / "last" summaries. Returns '' for missing dates.
const formatShortDate = value => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// "3 days ago" style relative label used alongside the last-activity date.
const formatRelativeDate = value => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

export const CustomersScreen = ({ navigation }) => {
  const { customers, unreadCount } = useApp();
  const { refreshing, onRefresh } = useRefresh();
  const [search, setSearch] = useState('');
  const filteredCustomers = customers.filter(customer => {
    const query = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.mobile.includes(query) ||
      customer.city.toLowerCase().includes(query) ||
      customer.gst.toLowerCase().includes(query)
    );
  });

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader
        navigation={navigation}
        showBack
        subtitle={`${customers.length} customers`}
        title="Customers"
        unreadCount={unreadCount}
      />

      <SearchInput
        accessibilityLabel="Search customers by name, mobile, city or GST"
        autoCapitalize="none"
        onChangeText={setSearch}
        placeholder="Search name, mobile, city or GST"
        value={search}
      />
      <View style={styles.actionRow}>
        <PrimaryButton
          icon="account-plus-outline"
          onPress={() => navigation.navigate('CustomerForm')}
          size="compact"
          style={styles.actionButton}
          title="Add customer"
        />
        <PrimaryButton
          icon="file-plus-outline"
          onPress={() => navigation.navigate('QuotationForm')}
          size="compact"
          style={styles.actionButton}
          title="New quote"
          variant="outline"
        />
      </View>

      <SectionHeader
        title={
          search
            ? `${filteredCustomers.length} results`
            : `All customers`
        }
      />
      {filteredCustomers.length ? (
        filteredCustomers.map(customer => (
          <Pressable
            accessibilityHint="Opens customer details"
            accessibilityLabel={`${customer.name}, ${customer.type}, ${customer.city}`}
            accessibilityRole="button"
            key={customer.id}
            onPress={() =>
              navigation.navigate('CustomerDetail', { id: customer.id })
            }
            style={({ pressed }) => [
              styles.customerCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {customer.name
                  .split(' ')
                  .slice(0, 2)
                  .map(word => word[0])
                  .join('')}
              </Text>
            </View>
            <View style={styles.customerMain}>
              <View style={styles.customerTop}>
                <View style={styles.customerNameWrap}>
                  <Text numberOfLines={2} style={styles.customerName}>
                    {customer.name}
                  </Text>
                  <Text style={styles.customerMeta}>
                    {customer.type}
                    {customer.gst && customer.gst !== 'Not provided'
                      ? ` · GST: ${customer.gst}`
                      : customer.email
                      ? ` · ${customer.email}`
                      : ''}
                  </Text>
                </View>
                <Icon color={colors.textMuted} name="chevron-right" size={22} />
              </View>
              <View style={styles.contactRow}>
                <View style={styles.contactItem}>
                  <Icon
                    color={colors.textMuted}
                    name="phone-outline"
                    size={16}
                  />
                  <Text numberOfLines={1} style={styles.contactText}>
                    +91 {customer.mobile}
                  </Text>
                </View>
                <View style={styles.contactItem}>
                  <Icon
                    color={colors.textMuted}
                    name="map-marker-outline"
                    size={16}
                  />
                  <Text numberOfLines={1} style={styles.contactText}>
                    {customer.city}
                  </Text>
                </View>
              </View>
              <View style={styles.customerFooter}>
                <Text style={styles.orderCount}>
                  {customer.orderCount} orders
                </Text>
                <Text
                  style={
                    customer.outstanding ? styles.outstanding : styles.settled
                  }
                >
                  {customer.outstanding
                    ? `${formatCurrency(customer.outstanding)} due`
                    : 'No outstanding'}
                </Text>
              </View>
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState
          actionLabel={search ? 'Clear search' : undefined}
          icon="account-search-outline"
          message="Try a different customer name, mobile, city or GST number."
          onAction={search ? () => setSearch('') : undefined}
          title="No customers found"
        />
      )}
    </Screen>
  );
};

export const CustomerFormScreen = ({ navigation }) => {
  const { addCustomer } = useApp();
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    gst: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [error, setSavingError] = useState('');
  const [saving, setSaving] = useState(false);

  const setError = msg => setSavingError(msg);

  const update = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setSavingError('');
  };

  const save = async () => {
    if (
      !form.name.trim() ||
      form.mobile.length !== 10 ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      form.pincode.length !== 6
    ) {
      setError(
        'Name, valid mobile, address, city, state and 6-digit pincode are required.',
      );
      return;
    }

    setSaving(true);
    const result = await addCustomer(form);
    setSaving(false);

    if (!result || result.success === false) {
      setError(result?.message || 'Failed to create customer. Please try again.');
      return;
    }

    Alert.alert(
      'Customer created',
      `${result.name} has been added and is now visible to Staff and Admin.`,
      [
        {
          text: 'View customer',
          onPress: () =>
            navigation.replace('CustomerDetail', { id: result.id }),
        },
        {
          text: 'Back to list',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  return (
    <Screen
      footer={
        <PrimaryButton
          icon="content-save-outline"
          loading={saving}
          onPress={save}
          title={saving ? 'Saving…' : 'Save customer'}
        />
      }
      keyboardAvoiding
    >
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        title="New Customer"
      />

      <View style={styles.formBody}>
        {error ? (
          <NoticeBanner
            message={error}
            style={styles.formNotice}
            tone="danger"
          />
        ) : null}

        <Text style={styles.formSectionLabel}>Basic Details</Text>
        <TextField
          autoCapitalize="words"
          autoComplete="name"
          error={
            error && !form.name.trim()
              ? 'Name is required.'
              : undefined
          }
          label="Customer / Business name"
          onChangeText={value => update('name', value)}
          placeholder="e.g. ABC Tiles"
          required
          returnKeyType="next"
          value={form.name}
        />
        <TextField
          autoComplete="tel"
          error={
            error && form.mobile.length !== 10
              ? 'Enter a valid 10-digit mobile.'
              : undefined
          }
          keyboardType="number-pad"
          label="Mobile number"
          maxLength={10}
          onChangeText={value =>
            update('mobile', value.replace(/\D/g, '').slice(0, 10))
          }
          placeholder="10-digit mobile"
          prefix="+91"
          required
          value={form.mobile}
        />
        <TextField
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email"
          onChangeText={value => update('email', value)}
          placeholder="customer@business.com"
          returnKeyType="next"
          value={form.email}
        />
        <TextField
          autoCapitalize="characters"
          label="GST number"
          maxLength={15}
          onChangeText={value => update('gst', value.toUpperCase())}
          placeholder="Optional GSTIN"
          returnKeyType="next"
          value={form.gst}
        />

        <Text style={styles.formSectionLabel}>Address</Text>
        <TextField
          autoCapitalize="sentences"
          autoComplete="street-address"
          error={
            error && !form.address.trim()
              ? 'Address is required.'
              : undefined
          }
          label="Street / Building"
          multiline
          onChangeText={value => update('address', value)}
          placeholder="Building and street"
          required
          value={form.address}
        />
        <TextField
          autoCapitalize="words"
          error={error && !form.city.trim() ? 'City is required.' : undefined}
          label="City"
          onChangeText={value => update('city', value)}
          placeholder="City"
          required
          returnKeyType="next"
          value={form.city}
        />
        <TextField
          autoCapitalize="words"
          error={
            error && !form.state.trim() ? 'State is required.' : undefined
          }
          label="State"
          onChangeText={value => update('state', value)}
          placeholder="State"
          required
          returnKeyType="next"
          value={form.state}
        />
        <TextField
          error={
            error && form.pincode.length !== 6
              ? 'Enter a valid 6-digit pincode.'
              : undefined
          }
          keyboardType="number-pad"
          label="Pincode"
          maxLength={6}
          onChangeText={value =>
            update('pincode', value.replace(/\D/g, '').slice(0, 6))
          }
          placeholder="6-digit pincode"
          required
          value={form.pincode}
        />
      </View>
    </Screen>
  );
};

export const CustomerDetailScreen = ({ navigation, route }) => {
  const { customers, invoices, orders, payments, quotations } = useApp();
  const customer = customers.find(item => item.id === route.params?.id);

  // Locally-filtered fallback (instant render from already-loaded context data).
  const matchCustomer = item =>
    customer &&
    (String(item.customerId) === String(customer.id) ||
      String(item.customerId) === String(customer._id));

  // Newest-first sort helper for the local fallback (context data isn't
  // guaranteed to be ordered). Uses the record's own date field.
  const byDateDesc = pick => (a, b) =>
    new Date(pick(b) || 0) - new Date(pick(a) || 0);

  const localOrders = orders
    .filter(matchCustomer)
    .map(o => ({ ...o, date: o.date || o.orderDate || o.createdAt || null }))
    .sort(byDateDesc(o => o.date));
  const localQuotes = quotations
    .filter(matchCustomer)
    .map(q => ({ ...q, date: q.date || q.quotationDate || q.createdAt || null }))
    .sort(byDateDesc(q => q.date));
  const localInvoices = invoices.filter(matchCustomer);
  const localPayments = payments
    .filter(matchCustomer)
    .map(p => ({ ...p, date: p.date || p._date || null }))
    .sort(byDateDesc(p => p.date));

  // Full history fetched from the backend by customer_id (includes OLD records
  // and records created by the retailer/admin — not just this staff's own).
  const [fullOrders, setFullOrders]   = useState(null);
  const [fullQuotes, setFullQuotes]   = useState(null);
  const [fullInvoices, setFullInvoices] = useState(null);
  const [fullPayments, setFullPayments] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const customerObjId = customer?._id || customer?.id;
  const customerMobile = customer?.mobile || '';

  useEffect(() => {
    let cancelled = false;
    if (!customerObjId) return;

    (async () => {
      setLoadingHistory(true);
      try {
        // Match history by id AND phone — orders/quotations/invoices may be
        // linked either way depending on how they were created.
        const q = { customer_id: customerObjId, limit: 200 };
        if (customerMobile) q.customer_mobile = customerMobile;
        const [oRes, qRes, iRes] = await Promise.all([
          orderApi.list(q),
          quotationApi.list(q),
          invoiceApi.list(q),
        ]);
        if (cancelled) return;

        if (oRes?.success) {
          const raw = oRes.data?.orders || oRes.data || [];
          const mapped = raw.map(o => ({
            id:            o.order_code || String(o._id),
            productName:   o.product_name || (o.items?.[0]?.product_name) || 'Order',
            total:         Number(o.grand_total ?? o.total ?? 0),
            status:        o.status || '',
            date:          o.order_date || o.created_at || o.createdAt || null,
            createdByName: o.created_by_name || '',
            createdByType: o.created_by_type || '',
          }));
          mapped.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          setFullOrders(mapped);
        }
        if (qRes?.success) {
          const raw = qRes.data?.quotations || qRes.data || [];
          const mapped = raw.map(q => {
            const it = q.items?.[0] || {};
            return {
              id:            q.quotation_no || String(q._id),
              productName:   it.product_name || 'Quotation',
              quantity:     (q.items || []).reduce((s, x) => s + (Number(x.qty) || 0), 0),
              unit:          it.unit || 'pcs',
              total:         Number(q.grand_total ?? q.total ?? 0),
              status:        q.status || '',
              date:          q.quotation_date || q.created_at || q.createdAt || null,
              createdByName: q.created_by_name || '',
              createdByType: q.created_by_type || '',
            };
          });
          mapped.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          setFullQuotes(mapped);
        }
        if (iRes?.success) {
          const raw = iRes.data?.invoices || iRes.data || [];
          const pays = [];
          raw.forEach(inv => {
            (inv.payment_history || []).forEach(ph => {
              pays.push({
                id:        String(ph._id),
                invoiceId: inv.invoice_no || String(inv._id),
                _invoiceId: String(inv._id),
                amount:    Number(ph.amount) || 0,
                mode:      ph.payment_mode || 'Cash',
                status:    ph.verification_status || 'Pending',
                date:      ph.payment_date,
              });
            });
          });
          pays.sort((a, b) => new Date(b.date) - new Date(a.date));
          setFullInvoices(raw);
          setFullPayments(pays);
        }
      } catch {
        /* keep local fallback on error */
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => { cancelled = true; };
  }, [customerObjId, customerMobile]);

  if (!customer) {
    return <MissingRecord navigation={navigation} title="Customer not found" />;
  }

  // Prefer the full fetched history; fall back to locally-filtered data.
  const customerOrders   = fullOrders   ?? localOrders;
  const customerQuotes   = fullQuotes   ?? localQuotes;
  const customerInvoices = fullInvoices ?? localInvoices;
  const customerPayments = fullPayments ?? localPayments;

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={customer.mobile ? `+91 ${customer.mobile}` : customer.city || ''}
        title="Customer details"
      />

      <View style={styles.detailHero}>
        <View style={styles.detailHeroTop}>
          <View style={styles.detailAvatar}>
            <Text style={styles.detailAvatarText}>
              {customer.name
                .split(' ')
                .slice(0, 2)
                .map(word => word[0])
                .join('')}
            </Text>
          </View>
          <View style={styles.detailHeroText}>
            <Text numberOfLines={2} style={styles.detailName}>
              {customer.name}
            </Text>
            <View style={styles.detailTypeRow}>
              <View style={styles.detailTypeChip}>
                <Text style={styles.detailTypeChipText}>{customer.type}</Text>
              </View>
              <View style={styles.detailMetaInline}>
                <Icon
                  color={colors.textMuted}
                  name="map-marker-outline"
                  size={13}
                />
                <Text numberOfLines={1} style={styles.detailType}>
                  {customer.city}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryItem label="Quotations" value={customerQuotes.length} />
          <SummaryItem label="Orders" value={customerOrders.length} />
          <SummaryItem
            last
            label="Outstanding"
            value={formatCurrency(customer.outstanding)}
          />
        </View>
      </View>

      <SurfaceCard style={styles.detailCard}>
        <CardHeading
          icon="card-account-details-outline"
          title="Contact & tax details"
        />
        <InfoRow
          icon="phone-outline"
          label="Mobile"
          value={`+91 ${customer.mobile}`}
        />
        <InfoRow
          icon="email-outline"
          label="Email"
          value={customer.email || 'Not provided'}
        />
        <InfoRow icon="identifier" label="GSTIN" value={customer.gst} />
        <InfoRow
          icon="map-marker-outline"
          label="Address"
          value={`${customer.address}, ${customer.city}, ${customer.state} ${customer.pincode}`}
        />
        <InfoRow icon="history" label="Last order" value={customer.lastOrder} />
      </SurfaceCard>

      <SurfaceCard style={styles.detailCard}>
        <CardHeading icon="account-plus-outline" title="Added by" />
        <AddedByBadge type={customer.createdByType} />
        <InfoRow
          icon="account-outline"
          label="Name"
          value={customer.createdByName || 'Not recorded'}
        />
        <InfoRow
          icon="phone-outline"
          label="Mobile"
          value={
            customer.createdByMobile
              ? `+91 ${customer.createdByMobile}`
              : 'Not recorded'
          }
        />
        {customer.createdAt ? (
          <InfoRow
            icon="calendar-blank-outline"
            label="Added on"
            value={customer.createdAt}
          />
        ) : null}
      </SurfaceCard>

      <View style={styles.detailActions}>
        <PrimaryButton
          icon="file-plus-outline"
          onPress={() =>
            navigation.navigate('QuotationForm', { customerId: customer.id })
          }
          style={styles.detailAction}
          title="Create quotation"
        />
        <PrimaryButton
          icon="text-box-outline"
          onPress={() =>
            navigation.navigate('Invoices', { customerId: customer.id })
          }
          style={styles.detailAction}
          title={`Invoices (${customerInvoices.length})`}
          variant="outline"
        />
      </View>

      <SectionHeader title={`Quotations (${customerQuotes.length})`} />
      {customerQuotes.length ? (
        <>
          <LastActivity
            icon="file-document-outline"
            label="Last quotation"
            date={customerQuotes[0].date}
            summary={customerQuotes[0].productName}
            amount={formatCurrency(customerQuotes[0].total)}
          />
          {customerQuotes.map(quotation => (
          <ActivityCard
            accessibilityLabel={`Quotation ${quotation.id}, ${
              quotation.productName
            }, ${formatCurrency(quotation.total)}`}
            amount={formatCurrency(quotation.total)}
            createdByName={quotation.createdByName}
            createdByType={quotation.createdByType}
            date={quotation.date}
            id={quotation.id}
            key={quotation.id}
            name={`${quotation.productName} · ${quotation.quantity} ${quotation.unit}`}
            onPress={() =>
              navigation.navigate('QuotationDetail', { id: quotation.id })
            }
            status={quotation.status}
          />
          ))}
        </>
      ) : (
        <EmptyState
          compact
          icon="file-document-outline"
          message="Create the first quotation for this customer to begin a transaction."
          title="No quotations yet"
        />
      )}

      <SectionHeader title={`Orders (${customerOrders.length})`} />
      {customerOrders.length ? (
        <>
          <LastActivity
            icon="clipboard-check-outline"
            label="Last order"
            date={customerOrders[0].date}
            summary={customerOrders[0].productName}
            amount={formatCurrency(customerOrders[0].total)}
          />
          {customerOrders.map(order => (
          <ActivityCard
            accessibilityLabel={`Order ${order.id}, ${
              order.productName
            }, ${formatCurrency(order.total)}`}
            amount={formatCurrency(order.total)}
            createdByName={order.createdByName}
            createdByType={order.createdByType}
            date={order.date}
            id={order.id}
            key={order.id}
            name={order.productName}
            onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            status={order.status}
          />
          ))}
        </>
      ) : (
        <EmptyState
          compact
          icon="clipboard-text-outline"
          message="Create a quotation to begin this customer's transaction."
          title="No orders yet"
        />
      )}

      <SectionHeader title={`Payments & ledger (${customerPayments.length})`} />
      {customerPayments.length ? (
        <>
          <LastActivity
            icon="cash-multiple"
            label="Last payment"
            date={customerPayments[0].date}
            summary={`${customerPayments[0].invoiceId} · ${customerPayments[0].mode}`}
            amount={formatCurrency(customerPayments[0].amount)}
          />
          {customerPayments.map(payment => (
          <ActivityCard
            accessibilityLabel={`Payment ${payment.id}, invoice ${
              payment.invoiceId
            }, ${formatCurrency(payment.amount)}`}
            amount={formatCurrency(payment.amount)}
            date={payment.date}
            id={payment.id}
            key={payment.id}
            name={`${payment.invoiceId} · ${payment.mode}`}
            onPress={() =>
              navigation.navigate('InvoiceDetail', { id: payment.invoiceId })
            }
            status={payment.status}
          />
          ))}
        </>
      ) : (
        <EmptyState
          compact
          icon="cash-remove"
          message="Payment and ledger activity will appear here once recorded."
          title="No payment entries yet"
        />
      )}
    </Screen>
  );
};

export const QuotationsScreen = ({ navigation }) => {
  const { quotations } = useApp();
  const { refreshing, onRefresh } = useRefresh();
  const [search, setSearch] = useState('');
  const visible = quotations.filter(quotation => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return [
      quotation.id,
      quotation.customerName,
      quotation.productName,
    ].some(value => String(value || '').toLowerCase().includes(query));
  });

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle="Retailer direct quotations + Staff quotations"
        title="Quotations"
      />

      <View style={styles.quoteHero}>
        <View style={styles.quoteHeroIcon}>
          <Icon
            color={colors.primary}
            name="file-document-multiple-outline"
            size={26}
          />
        </View>
        <View style={styles.quoteHeroCopy}>
          <Text style={styles.quoteHeroCount}>{quotations.length}</Text>
          <Text style={styles.quoteHeroLabel}>TOTAL QUOTATIONS</Text>
        </View>
        <PrimaryButton
          icon="file-plus-outline"
          onPress={() => navigation.navigate('QuotationForm')}
          size="compact"
          style={styles.quoteHeroAction}
          title="Create quote"
        />
      </View>

      <SearchInput
        accessibilityLabel="Search quotations by id, customer or product"
        onChangeText={setSearch}
        placeholder="Search quotation, customer or product"
        value={search}
      />

      <SectionHeader title={`${visible.length} results`} />
      {visible.length ? (
        visible.map(quotation => (
          <Pressable
            accessibilityHint="Opens quotation details"
            accessibilityLabel={`Quotation ${quotation.id} for ${
              quotation.customerName
            }, ${formatCurrency(quotation.total)}`}
            accessibilityRole="button"
            key={quotation.id}
            onPress={() =>
              navigation.navigate('QuotationDetail', { id: quotation.id })
            }
            style={({ pressed }) => [
              styles.quoteCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.quoteTop}>
              <View style={styles.quoteIdentity}>
                <Text style={styles.quoteId}>{quotation.id}</Text>
                <Text numberOfLines={2} style={styles.quoteCustomer}>
                  {quotation.customerName}
                </Text>
              </View>
              <StatusPill status={quotation.status} />
            </View>
            <View style={styles.originBadge}>
              <Icon
                color={
                  quotation.createdByType === 'STAFF'
                    ? colors.info
                    : colors.primary
                }
                name={
                  quotation.createdByType === 'STAFF'
                    ? 'badge-account-outline'
                    : 'storefront-outline'
                }
                size={17}
              />
              <Text
                style={
                  quotation.createdByType === 'STAFF'
                    ? styles.staffOrigin
                    : styles.retailerOrigin
                }
              >
                {quotation.createdByType === 'STAFF'
                  ? `STAFF CREATED · ${quotation.createdByName}`
                  : 'RETAILER SEND ENQUIRY → QUOTATION'}
              </Text>
            </View>
            <View style={styles.quoteProductRow}>
              <View style={styles.quoteProductCopy}>
                <Text numberOfLines={2} style={styles.quoteProduct}>
                  {quotation.productName}
                </Text>
                <Text style={styles.quoteMeta}>
                  {quotation.quantity} {quotation.unit} ×{' '}
                  {formatCurrency(quotation.rate)}
                </Text>
              </View>
              <Text style={styles.quoteTotal}>
                {formatCurrency(quotation.total)}
              </Text>
            </View>
            <View style={styles.quoteFooter}>
              <View style={styles.quoteFooterItem}>
                <Icon color={colors.textMuted} name="warehouse" size={15} />
                <Text numberOfLines={1} style={styles.quoteFooterText}>
                  {quotation.wholesaler}
                </Text>
              </View>
              <View style={styles.quoteFooterItem}>
                <Icon
                  color={colors.textMuted}
                  name="calendar-blank-outline"
                  size={15}
                />
                <Text style={styles.quoteFooterText}>
                  {quotation.createdAt}
                </Text>
              </View>
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState
          actionLabel={search ? 'Clear search' : undefined}
          icon="file-search-outline"
          message={
            search
              ? `No quotations match “${search}”.`
              : 'Quotations will appear here once created.'
          }
          onAction={search ? () => setSearch('') : undefined}
          title="No quotations found"
        />
      )}
    </Screen>
  );
};

// ─────────────────────────────────────────────────────────────
// CUSTOMER PICKER MODAL
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// QUOTATION FORM SCREEN
// Inline search for customer + product using FlatList as the form container
// so keyboard never hides the results.
// ─────────────────────────────────────────────────────────────────────────────

// Resolve a product's first image to a full URL
const SERVER_ROOT = API_BASE_URL.replace('/api', '');
const productThumb = (p) => {
  const raw = Array.isArray(p.imageUrls) ? p.imageUrls[0] : null;
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return `${SERVER_ROOT}${raw}`;
};
export const QuotationFormScreen = ({ navigation, route }) => {
  const { createQuotation, allCustomers, products } = useApp();
  const routeCustomer = allCustomers.find(c => c.id === route.params?.customerId);

  // ── Form state ──────────────────────────────────────────────
  const [form, setForm] = useState({
    customerId:     routeCustomer?.id || '',
    productId:      '',
    quantity:       '1',
    rate:           '',   // auto-set from product.dealerPrice, not user-editable
    discount:       '0',
    gst:            '18', // auto-set from product.gst_percent, not user-editable
    deliveryCharge: '0',
    otherCharge:    '0',
    deliveryAddress:'',
    remarks:        '',
    terms:          'Prices are subject to change. GST extra as applicable.',
  });

  // ── Search state ─────────────────────────────────────────────
  const [customerQuery, setCustomerQuery] = useState(routeCustomer?.name || '');
  const [productQuery,  setProductQuery]  = useState('');
  const [showCustList,  setShowCustList]  = useState(false);
  const [showProdList,  setShowProdList]  = useState(false);

  // ── Other state ──────────────────────────────────────────────
  const [validUntil,        setValidUntil]        = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; });
  const [showIosDatePicker, setShowIosDatePicker] = useState(false);
  const [error,             setError]             = useState('');
  const [saving,            setSaving]            = useState(false);

  const selectedCustomer = allCustomers.find(c => c.id === form.customerId);
  const selectedProduct  = products.find(p => p.id === form.productId);

  const update = (field, value) => { setForm(cur => ({ ...cur, [field]: value })); setError(''); };

  // ── Filtered lists ───────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return allCustomers.slice(0, 30);
    return allCustomers.filter(c =>
      [c.name, c.id, c.mobile, c.city].some(v => String(v || '').toLowerCase().includes(q))
    ).slice(0, 30);
  }, [customerQuery, allCustomers]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter(p =>
      [p.name, p.code, p.brand, p.category, p.size].some(v => String(v || '').toLowerCase().includes(q))
    ).slice(0, 30);
  }, [productQuery, products]);

  // ── Date picker ──────────────────────────────────────────────
  const minimumValidUntil = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        display: 'default', minimumDate: minimumValidUntil, mode: 'date',
        onChange: (e, d) => { if (e.type === 'set' && d) setValidUntil(d); },
        value: validUntil,
      });
    } else { setShowIosDatePicker(true); }
  };

  // ── Totals ───────────────────────────────────────────────────
  const totals = useMemo(() => {
    const qty      = Number(form.quantity || 0);
    const rate     = Number(form.rate || 0);     // auto-set from product dealer price
    const disc     = Number(form.discount || 0);
    const gstPct   = Number(form.gst || 18);     // auto-set from product gst_percent
    const amount   = qty * rate;
    const taxable   = Math.max(0, amount - disc);
    const gstAmt    = taxable * (gstPct / 100);
    const itemTotal = taxable + gstAmt;
    const delivery  = Number(form.deliveryCharge || 0);
    const other     = Number(form.otherCharge || 0);
    return { amount, discount: disc, taxable, gstAmount: gstAmt, itemTotal, grandTotal: Math.round(itemTotal + delivery + other) };
  }, [form]);

  // ── Save ─────────────────────────────────────────────────────
  const save = async () => {
    if (!selectedCustomer || !selectedProduct || Number(form.quantity) <= 0 || Number(form.rate) <= 0) {
      setError('Select a customer and product, then enter valid quantity and rate.');
      return;
    }
    if (!form.deliveryAddress.trim()) {
      setError('Delivery address is required.');
      return;
    }
    setSaving(true);
    const result = await createQuotation({ ...form, validUntil: formatQuotationDate(validUntil) });
    setSaving(false);
    if (!result || result.success === false) {
      setError(result?.message || 'Could not save quotation. Try again.');
      return;
    }
    navigation.replace('QuotationDetail', { id: result.id, created: true });
  };

  // ── FlatList sections ─────────────────────────────────────────
  // We build the "form" as a flat array of section keys so the entire page
  // including search results lives in one scrollable FlatList. When the
  // keyboard opens, Android adjustResize shrinks the list — results stay visible.

  const sections = useMemo(() => {
    const s = ['header', 'info', 'customer_label', 'customer_search'];
    if (showCustList) {
      filteredCustomers.forEach(c => s.push(`cust_${c.id}`));
      if (filteredCustomers.length === 0) s.push('cust_empty');
    }
    if (selectedCustomer) s.push('customer_detail');
    s.push('product_label', 'product_search');
    if (showProdList) {
      filteredProducts.forEach(p => s.push(`prod_${p.id}`));
      if (filteredProducts.length === 0) s.push('prod_empty');
    }
    if (selectedProduct) {
      s.push('product_detail', 'pricing', 'calc');
    }
    s.push('totals', 'remarks', 'footer_spacer');
    return s;
  }, [showCustList, showProdList, filteredCustomers, filteredProducts, selectedCustomer, selectedProduct, form, totals, error]);

  const renderItem = ({ item: key }) => {
    // ── Header / back ──
    if (key === 'header') return null; // handled by ListHeaderComponent

    // ── Info card ──
    if (key === 'info') return (
      <View style={[styles.quoteFormCard, styles.quoteInfoCard]}>
        <Text style={[styles.quoteSectionLabel, styles.quoteSectionOrange]}>QUOTATION INFORMATION</Text>
        <View style={styles.quoteInfoGrid}>
          {[['Quotation Number','Auto-generated'],['Enquiry','Staff direct'],['Quotation Date', formatQuotationDate(new Date())]].map(([l,v]) => (
            <View key={l} style={styles.quoteInfoTile}>
              <Text style={styles.quoteInfoLabel}>{l}</Text>
              <Text style={styles.quoteInfoValue}>{v}</Text>
            </View>
          ))}
          <Pressable accessibilityHint="Opens the date picker" accessibilityRole="button" onPress={openDatePicker}
            style={({ pressed }) => [styles.quoteInfoTile, styles.quoteDatePickerTile, pressed && styles.cardPressed]}>
            <Text style={styles.quoteInfoLabel}>Valid Until</Text>
            <View style={styles.quoteDateValueRow}>
              <Text style={styles.quoteInfoValue}>{formatQuotationDate(validUntil)}</Text>
              <Icon color={colors.primary} name="calendar-month" size={19} />
            </View>
            <Text style={styles.quoteDateHint}>Tap to select date</Text>
          </Pressable>
        </View>
        {Platform.OS === 'ios' && showIosDatePicker ? (
          <View style={styles.quoteIosDatePicker}>
            <DateTimePicker display="inline" minimumDate={minimumValidUntil} mode="date"
              onChange={(e, d) => { if (e.type === 'set' && d) setValidUntil(d); }} value={validUntil} />
            <PrimaryButton onPress={() => setShowIosDatePicker(false)} size="compact" title="Done" />
          </View>
        ) : null}
        <View style={styles.quoteAutoNote}>
          <Icon color={colors.primary} name="information-outline" size={16} />
          <Text style={styles.quoteAutoNoteText}>Quotation number is created automatically when you save.</Text>
        </View>
      </View>
    );

    // ── Customer section label ──
    if (key === 'customer_label') return (
      <View style={qfStyles.sectionLabel}>
        <Icon color="#2563EB" name="account-outline" size={16} />
        <Text style={qfStyles.sectionLabelText}>CUSTOMER</Text>
        {selectedCustomer ? <View style={qfStyles.selectedBadge}><Text style={qfStyles.selectedBadgeText}>✓ Selected</Text></View> : <Text style={qfStyles.requiredBadge}>Required</Text>}
      </View>
    );

    // ── Customer search input ──
    if (key === 'customer_search') return (
      <View style={qfStyles.searchBox}>
        <Icon color={showCustList ? colors.primary : colors.textMuted} name="magnify" size={20} style={qfStyles.searchBoxIcon} />
        <TextInput
          style={qfStyles.searchBoxInput}
          value={customerQuery}
          onChangeText={v => {
            setCustomerQuery(v);
            setShowCustList(true);
            update('customerId', '');
          }}
          onFocus={() => setShowCustList(true)}
          placeholder={selectedCustomer ? selectedCustomer.name : 'Type to search customer…'}
          placeholderTextColor={selectedCustomer ? colors.text : colors.textMuted}
          returnKeyType="search"
          autoCapitalize="words"
        />
        {selectedCustomer && !showCustList ? (
          <Icon color={colors.success} name="check-circle" size={20} style={qfStyles.searchBoxIcon} />
        ) : customerQuery.length > 0 ? (
          <Pressable onPress={() => { setCustomerQuery(''); update('customerId', ''); }}>
            <Icon color={colors.textMuted} name="close-circle-outline" size={20} style={qfStyles.searchBoxIcon} />
          </Pressable>
        ) : null}
      </View>
    );

    // ── Customer result rows ──
    if (key.startsWith('cust_') && key !== 'cust_empty') {
      const c = allCustomers.find(x => x.id === key.replace('cust_',''));
      if (!c) return null;
      return (
        <Pressable
          key={key}
          onPress={() => {
            update('customerId', c.id);
            setCustomerQuery(c.name);
            setShowCustList(false);
          }}
          style={({ pressed }) => [qfStyles.resultRow, pressed && { backgroundColor: '#F0F7FF' }]}>
          <View style={qfStyles.resultAvatar}>
            <Text style={qfStyles.resultAvatarText}>{c.name.charAt(0)}</Text>
          </View>
          <View style={qfStyles.resultBody}>
            <Text style={qfStyles.resultTitle} numberOfLines={1}>{c.name}</Text>
            <Text style={qfStyles.resultMeta} numberOfLines={1}>{c.mobile} · {c.city}</Text>
          </View>
          <Icon color={colors.primary} name="chevron-right" size={18} />
        </Pressable>
      );
    }

    if (key === 'cust_empty') return (
      <View style={qfStyles.noResults}>
        <Text style={qfStyles.noResultsText}>No customers match "{customerQuery}"</Text>
      </View>
    );

    // ── Selected customer detail ──
    if (key === 'customer_detail' && selectedCustomer) return (
      <View style={qfStyles.selectedCard}>
        <View style={qfStyles.selectedCardTop}>
          <View style={[qfStyles.resultAvatar, { backgroundColor: '#EAF3FF' }]}>
            <Text style={[qfStyles.resultAvatarText, { color: '#2563EB' }]}>{selectedCustomer.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={qfStyles.selectedCardName}>{selectedCustomer.name}</Text>
            <Text style={qfStyles.resultMeta}>{selectedCustomer.mobile} · {selectedCustomer.city}</Text>
          </View>
          <Pressable onPress={() => { setShowCustList(true); setCustomerQuery(''); update('customerId', ''); }}
            style={qfStyles.changeBtn}><Text style={qfStyles.changeBtnText}>Change</Text></Pressable>
        </View>
        <View style={styles.quoteCustomerDetailGrid}>
          {[
            ['Mobile', selectedCustomer.mobile, 'phone-outline'],
            ['Email', selectedCustomer.email || '—', 'email-outline'],
            ['GSTIN', selectedCustomer.gst || '—', 'identifier'],
            ['Location', `${selectedCustomer.city}, ${selectedCustomer.state}`, 'map-marker-outline'],
          ].map(([l, v, ic]) => (
            <View key={l} style={styles.quoteCustomerDetailTile}>
              <Icon color="#2563EB" name={ic} size={16} />
              <View style={styles.quoteCustomerDetailCopy}>
                <Text style={styles.quoteCustomerDetailLabel}>{l}</Text>
                <Text style={styles.quoteCustomerDetailValue} numberOfLines={2}>{v}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );

    // ── Product section label ──
    if (key === 'product_label') return (
      <View style={[qfStyles.sectionLabel, { marginTop: spacing.md }]}>
        <Icon color={colors.primary} name="package-variant" size={16} />
        <Text style={qfStyles.sectionLabelText}>PRODUCT</Text>
        {selectedProduct ? <View style={qfStyles.selectedBadge}><Text style={qfStyles.selectedBadgeText}>✓ Selected</Text></View> : <Text style={qfStyles.requiredBadge}>Required</Text>}
      </View>
    );

    // ── Product search input ──
    if (key === 'product_search') return (
      <View style={qfStyles.searchBox}>
        <Icon color={showProdList ? colors.primary : colors.textMuted} name="magnify" size={20} style={qfStyles.searchBoxIcon} />
        <TextInput
          style={qfStyles.searchBoxInput}
          value={productQuery}
          onChangeText={v => {
            setProductQuery(v);
            setShowProdList(true);
            update('productId', '');
          }}
          onFocus={() => setShowProdList(true)}
          placeholder={selectedProduct ? selectedProduct.name : 'Type to search product…'}
          placeholderTextColor={selectedProduct ? colors.text : colors.textMuted}
          returnKeyType="search"
          autoCapitalize="words"
        />
        {selectedProduct && !showProdList ? (
          <Icon color={colors.success} name="check-circle" size={20} style={qfStyles.searchBoxIcon} />
        ) : productQuery.length > 0 ? (
          <Pressable onPress={() => { setProductQuery(''); update('productId', ''); }}>
            <Icon color={colors.textMuted} name="close-circle-outline" size={20} style={qfStyles.searchBoxIcon} />
          </Pressable>
        ) : null}
      </View>
    );

    // ── Product result rows ──
    if (key.startsWith('prod_') && key !== 'prod_empty') {
      const p = products.find(x => x.id === key.replace('prod_',''));
      if (!p) return null;
      const imgUri = productThumb(p);
      return (
        <Pressable
          key={key}
          onPress={() => {
            const autoRate = p.dealer_price || p.retail_price || p.selling_price || p.mrp || 0;
            setForm(cur => ({
              ...cur,
              productId: p.id,
              rate:      String(autoRate),
              gst:       String(p.gst_percent || p.gst || 18),
            }));
            setProductQuery(p.name);
            setShowProdList(false);
            setError('');
          }}
          style={({ pressed }) => [qfStyles.resultRow, pressed && { backgroundColor: '#FFF5EE' }]}>
          {/* Thumbnail */}
          {imgUri ? (
            <Image
              source={{ uri: imgUri }}
              style={qfStyles.prodThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[qfStyles.resultAvatar, { backgroundColor: '#FFF0E5' }]}>
              <Icon color={colors.primary} name="package-variant" size={16} />
            </View>
          )}
          <View style={qfStyles.resultBody}>
            <Text style={qfStyles.resultTitle} numberOfLines={1}>{p.name}</Text>
            <Text style={qfStyles.resultMeta} numberOfLines={1}>
              {[p.code, p.brand, p.category, p.size].filter(Boolean).join(' · ')}
            </Text>
            {p.companyName ? (
              <Text style={[qfStyles.resultMeta, { color: '#7C3AED', fontSize: 10 }]}>
                {p.companyName} · {p.createdByType || 'Admin'}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[qfStyles.resultTitle, { color: colors.primary, fontSize: 13 }]}>
              {formatCurrency(p.dealerPrice || p.rate)}
            </Text>
            <Text style={qfStyles.resultMeta}>{p.stock} {p.unit}</Text>
          </View>
        </Pressable>
      );
    }

    if (key === 'prod_empty') return (
      <View style={qfStyles.noResults}>
        <Text style={qfStyles.noResultsText}>No products match "{productQuery}"</Text>
      </View>
    );

    // ── Selected product detail ──
    if (key === 'product_detail' && selectedProduct) {
      const selImgUri = productThumb(selectedProduct);
      return (
      <View style={qfStyles.selectedCard}>
        {/* Top: image + name + change */}
        <View style={qfStyles.selectedCardTop}>
          {selImgUri ? (
            <Image
              source={{ uri: selImgUri }}
              style={qfStyles.prodThumbSelected}
              resizeMode="cover"
            />
          ) : (
            <View style={[qfStyles.resultAvatar, { backgroundColor: '#FFF0E5' }]}>
              <Icon color={colors.primary} name="package-variant" size={18} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={qfStyles.selectedCardName}>{selectedProduct.name}</Text>
            <Text style={qfStyles.resultMeta}>{selectedProduct.code}{selectedProduct.brand ? ` · ${selectedProduct.brand}` : ''}</Text>
          </View>
          <Pressable onPress={() => { setShowProdList(true); setProductQuery(''); update('productId', ''); }}
            style={qfStyles.changeBtn}><Text style={qfStyles.changeBtnText}>Change</Text></Pressable>
        </View>

        {/* Product owner badge */}
        {selectedProduct.companyName ? (
          <View style={qfStyles.ownerBadge}>
            <Icon color={
              selectedProduct.createdByType === 'Wholesaler' ? '#7C3AED' :
              selectedProduct.createdByType === 'Retailer'   ? '#0369A1' : colors.primary
            } name="domain" size={13} />
            <Text style={qfStyles.ownerBadgeText}>
              {selectedProduct.companyName} · {selectedProduct.createdByType || 'Admin'}
            </Text>
          </View>
        ) : null}

        {/* All product details grid */}
        <View style={qfStyles.productDetailGrid}>
          {[
            ['Category',    selectedProduct.category],
            ['Sub-Category',selectedProduct.subCategory],
            ['Brand',       selectedProduct.brand],
            ['Size',        selectedProduct.size],
            ['Finish',      selectedProduct.finish],
            ['Color',       selectedProduct.color],
            ['Tile Type',   selectedProduct.tileType],
            ['Grade',       selectedProduct.grade],
            ['Unit',        selectedProduct.unit],
            ['HSN Code',    selectedProduct.hsnCode],
            ['Pcs/Box',     selectedProduct.pcsPerBox ? String(selectedProduct.pcsPerBox) : null],
            ['Sqft/Box',    selectedProduct.sqftPerBox ? String(selectedProduct.sqftPerBox) : null],
          ].filter(([, v]) => v).map(([label, value]) => (
            <View key={label} style={qfStyles.productDetailItem}>
              <Text style={qfStyles.productDetailLabel}>{label}</Text>
              <Text style={qfStyles.productDetailValue} numberOfLines={1}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Stock + pricing info */}
        <View style={styles.quoteInventoryBanner}>
          <View style={styles.quoteInventoryIcon}><Icon color={colors.success} name="warehouse" size={18} /></View>
          <View style={styles.quoteInventoryCopy}>
            <Text style={styles.quoteInventoryTitle}>{selectedProduct.stock} {selectedProduct.unit} in stock</Text>
            <Text style={styles.quoteInventoryText}>
              Dealer: {formatCurrency(selectedProduct.dealerPrice || selectedProduct.rate)}
              {selectedProduct.mrp ? `  ·  MRP: ${formatCurrency(selectedProduct.mrp)}` : ''}
            </Text>
          </View>
        </View>
      </View>
    );
    }

  // ── Pricing fields — only Qty and Discount are editable.
  // Rate and GST are auto-filled from product and locked.
    if (key === 'pricing' && selectedProduct) return (
      <View style={qfStyles.pricingCard}>
        <Text style={styles.quotePricingLabel}>ITEM PRICING</Text>

        {/* Editable: Qty + Discount only */}
        <View style={styles.numericGrid}>
          <View style={styles.numericField}>
            <TextField
              keyboardType="number-pad"
              label={`Quantity (${selectedProduct.unit})`}
              onChangeText={v => update('quantity', v.replace(/\D/g, ''))}
              placeholder="0"
              required
              value={form.quantity}
            />
          </View>
          <View style={styles.numericField}>
            <TextField
              keyboardType="number-pad"
              label="Discount (₹)"
              onChangeText={v => update('discount', v.replace(/\D/g, ''))}
              placeholder="0"
              prefix="₹"
              value={form.discount}
            />
          </View>
        </View>

        {/* Read-only: Rate and GST from product */}
        <View style={qfStyles.autoFilledRow}>
          <View style={qfStyles.autoFilledItem}>
            <Text style={qfStyles.autoFilledLabel}>DEALER RATE</Text>
            <Text style={qfStyles.autoFilledValue}>{formatCurrency(selectedProduct.dealerPrice || selectedProduct.rate)}</Text>
            <Text style={qfStyles.autoFilledHint}>from product</Text>
          </View>
          <View style={qfStyles.autoFilledDivider} />
          <View style={qfStyles.autoFilledItem}>
            <Text style={qfStyles.autoFilledLabel}>GST</Text>
            <Text style={qfStyles.autoFilledValue}>{selectedProduct.gst}%</Text>
            <Text style={qfStyles.autoFilledHint}>from product</Text>
          </View>
          <View style={qfStyles.autoFilledDivider} />
          <View style={qfStyles.autoFilledItem}>
            <Text style={qfStyles.autoFilledLabel}>MRP</Text>
            <Text style={qfStyles.autoFilledValue}>{formatCurrency(selectedProduct.mrp)}</Text>
            <Text style={qfStyles.autoFilledHint}>max retail</Text>
          </View>
        </View>
      </View>
    );

    // ── Calc summary ──
    if (key === 'calc' && selectedProduct) return (
      <View style={styles.quoteCalculationGrid}>
        {[
          ['Qty',         `${form.quantity||0} ${selectedProduct.unit}`,              '#2563EB'],
          ['Dealer Rate', formatCurrency(selectedProduct.dealerPrice || selectedProduct.rate), colors.navy],
          ['Disc',        formatCurrency(totals.discount),                             '#D97706'],
          ['GST',         formatCurrency(totals.gstAmount),                            '#7C3AED'],
          ['Total',       formatCurrency(totals.itemTotal),                            colors.primary],
        ].map(([l,v,c]) => (
          <View key={l} style={styles.quoteCalculationCell}>
            <Text style={styles.quoteCalculationLabel}>{l}</Text>
            <Text style={[styles.quoteCalculationValue,{color:c}]}>{v}</Text>
          </View>
        ))}
      </View>
    );

    // ── Totals card ──
    if (key === 'totals') return (
      <View style={styles.quoteTotalsCard}>
        <TextField keyboardType="number-pad" label="Freight Charges"
          onChangeText={v => update('deliveryCharge', v.replace(/\D/g,''))}
          placeholder="0" prefix="₹" value={form.deliveryCharge} />
        <TextField keyboardType="number-pad" label="Other Charges"
          onChangeText={v => update('otherCharge', v.replace(/\D/g,''))}
          placeholder="0" prefix="₹" value={form.otherCharge} />
        {[
          ['Taxable subtotal', formatCurrency(totals.taxable)],
          [`GST (${form.gst||0}%)`, formatCurrency(totals.gstAmount)],
          ['Subtotal + GST',   formatCurrency(totals.itemTotal)],
          ['Freight',          formatCurrency(Number(form.deliveryCharge||0))],
          ['Other',            formatCurrency(Number(form.otherCharge||0))],
        ].map(([l,v]) => (
          <View key={l} style={styles.quoteTotalsRow}>
            <Text style={styles.quoteTotalsLabel}>{l}</Text>
            <Text style={styles.quoteTotalsValue}>{v}</Text>
          </View>
        ))}
        <View style={styles.quoteTotalsDivider} />
        <View style={styles.quoteGrandTotalRow}>
          <Text style={styles.quoteGrandTotalLabel}>GRAND TOTAL</Text>
          <Text style={styles.quoteGrandTotalValue}>{formatCurrency(totals.grandTotal)}</Text>
        </View>
      </View>
    );

    // ── Remarks ──
    if (key === 'remarks') return (
      <View style={[styles.quoteFormCard, styles.quoteRemarksCard]}>
        {/* ── Delivery Address (required) ── */}
        <Text style={[styles.quoteSectionLabel, styles.quoteSectionMuted]}>DELIVERY</Text>
        <TextField
          autoCapitalize="sentences"
          label="Delivery Address *"
          multiline
          onChangeText={v => update('deliveryAddress', v)}
          placeholder="Full delivery address — street, city, pincode"
          value={form.deliveryAddress}
          numberOfLines={3}
        />
        {!form.deliveryAddress.trim() ? (
          <View style={styles.quoteFieldHint}>
            <Icon color={colors.danger} name="map-marker-alert-outline" size={14} />
            <Text style={styles.quoteFieldHintText}>Delivery address is required</Text>
          </View>
        ) : null}

        <View style={styles.quoteSectionSpacer} />

        <Text style={[styles.quoteSectionLabel, styles.quoteSectionMuted]}>REMARKS & TERMS</Text>
        <TextField autoCapitalize="sentences" label="Remarks" multiline
          onChangeText={v => update('remarks', v)}
          placeholder="Add internal or customer remarks" value={form.remarks} />
        <TextField autoCapitalize="sentences" label="Terms & Conditions" multiline
          onChangeText={v => update('terms', v)}
          placeholder="Add quotation terms and conditions" value={form.terms} />
        <View style={styles.quoteTermsNote}>
          <Icon color={colors.textMuted} name="shield-check-outline" size={16} />
          <Text style={styles.quoteTermsNoteText}>Price and availability are subject to final Admin approval.</Text>
        </View>
      </View>
    );

    // ── Footer spacer ──
    if (key === 'footer_spacer') return <View style={{ height: 120 }} />;

    return null;
  };

  return (
    <View style={qfStyles.root}>

      {/* Standard AppHeader — same as every other screen */}
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle="Create and submit to Admin"
        title="New Quotation"
      />

      {/* Error banner */}
      {error ? (
        <View style={qfStyles.errorBanner}>
          <Icon color="#B91C1C" name="alert-circle-outline" size={16} />
          <Text style={qfStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* FlatList form — everything including search results lives here */}
      <FlatList
        data={sections}
        keyExtractor={item => item}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={qfStyles.listContent}
      />

      {/* Fixed footer */}
      <View style={qfStyles.fixedFooter}>
        <View style={qfStyles.totalRow}>
          <View>
            <Text style={qfStyles.totalLabel}>GRAND TOTAL</Text>
            <Text style={qfStyles.totalSub}>Incl. GST and delivery</Text>
          </View>
          <Text style={qfStyles.totalValue}>{formatCurrency(totals.grandTotal)}</Text>
        </View>
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [qfStyles.saveBtn, (pressed || saving) && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Save quotation">
          <Icon color={colors.white} name="file-check-outline" size={18} />
          <Text style={qfStyles.saveBtnText}>{saving ? 'Saving…' : 'Save Quotation'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

// Styles for QuotationFormScreen
const qfStyles = StyleSheet.create({
  root:           { backgroundColor: colors.background, flex: 1 },
  errorBanner:    { alignItems: 'center', backgroundColor: '#FEF2F2', borderBottomColor: '#FCA5A5', borderBottomWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  errorText:      { color: '#B91C1C', flex: 1, fontSize: 13 },
  listContent:    { padding: spacing.lg, paddingTop: spacing.md },
  sectionLabel:   { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs, marginTop: spacing.md },
  sectionLabelText: { color: colors.textMuted, flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  selectedBadge:  { backgroundColor: '#DCFCE7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  selectedBadgeText: { color: '#166534', fontSize: 11, fontWeight: '700' },
  requiredBadge:  { color: colors.primary, fontSize: 11, fontWeight: '600' },
  searchBox:      { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', marginBottom: 2, paddingHorizontal: spacing.md, paddingVertical: 10 },
  searchBoxIcon:  { marginHorizontal: 4 },
  searchBoxInput: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 2 },
  resultRow:      { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  resultAvatar:   { alignItems: 'center', backgroundColor: '#EAF3FF', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  resultAvatarText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  prodThumb:         { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC' },
  prodThumbSelected: { width: 52, height: 52, borderRadius: 10, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFF7ED' },
  resultBody:     { flex: 1 },
  resultTitle:    { color: colors.text, fontSize: 14, fontWeight: '600' },
  resultMeta:     { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  noResults:      { backgroundColor: colors.surface, padding: spacing.lg, alignItems: 'center' },
  noResultsText:  { color: colors.textMuted, fontSize: 13 },
  selectedCard:   { backgroundColor: colors.surface, borderColor: colors.success, borderRadius: radius.md, borderWidth: 1.5, marginBottom: spacing.md, overflow: 'hidden' },
  selectedCardTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  selectedCardName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  changeBtn:      { backgroundColor: '#EFF6FF', borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  changeBtnText:  { color: colors.primary, fontSize: 12, fontWeight: '700' },
  // Product owner badge
  ownerBadge:     { alignItems: 'center', backgroundColor: '#F5F3FF', borderTopColor: '#E9D5FF', borderTopWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6 },
  ownerBadgeText: { color: '#6D28D9', fontSize: 11, fontWeight: '600' },
  // Product details grid
  productDetailGrid:  { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 0, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  productDetailItem:  { paddingHorizontal: 4, paddingVertical: 4, width: '50%' },
  productDetailLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  productDetailValue: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 1 },
  // Auto-filled rate/gst row
  pricingCard:    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  autoFilledRow:  { alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: radius.sm, flexDirection: 'row', marginTop: spacing.sm, overflow: 'hidden' },
  autoFilledItem: { alignItems: 'center', flex: 1, paddingVertical: spacing.sm },
  autoFilledDivider: { backgroundColor: colors.border, height: 36, width: 1 },
  autoFilledLabel:{ color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },
  autoFilledValue:{ color: colors.primary, fontSize: 13, fontWeight: '900', marginTop: 2 },
  autoFilledHint: { color: colors.textMuted, fontSize: 9, marginTop: 1 },
  // Footer
  fixedFooter:    { backgroundColor: colors.surface, borderTopColor: colors.divider, borderTopWidth: 1, elevation: 12, padding: spacing.lg, paddingBottom: spacing.lg + 8 },
  totalRow:       { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  totalLabel:     { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  totalSub:       { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  totalValue:     { color: colors.primary, fontSize: 22, fontWeight: '900' },
  saveBtn:        { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.md },
  saveBtnText:    { color: colors.white, fontSize: 15, fontWeight: '700' },
});


export const QuotationDetailScreen = ({ navigation, route }) => {
  const { orders, quotations } = useApp();
  const quotation = quotations.find(item => item.id === route.params?.id);

  if (!quotation) {
    return (
      <MissingRecord navigation={navigation} title="Quotation not found" />
    );
  }

  const taxable = quotation.quantity * quotation.rate - quotation.discount;
  const gstAmount = Math.round(taxable * (quotation.gst / 100));
  const linkedOrder = orders.find(item => item.quotationId === quotation.id);

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={
          quotation.createdByType === 'STAFF'
            ? 'Staff-created quotation · submitted to Admin'
            : 'Created directly from Retailer Send Enquiry'
        }
        title={quotation.id}
      />

      {route.params?.created ? (
        <NoticeBanner
          message="Quotation created successfully and shared with Admin."
          style={styles.detailNotice}
          title="Quotation submitted"
          tone="success"
        />
      ) : null}

      <View style={styles.quoteDetailHero}>
        <View style={styles.quoteDetailTop}>
          <View style={styles.quoteDetailIdentity}>
            <Text style={styles.quoteDetailLabel}>QUOTED TO</Text>
            <Text style={styles.quoteDetailCustomer}>
              {quotation.customerName}
            </Text>
            <Text style={styles.quoteDetailId}>{quotation.customerId}</Text>
          </View>
          <StatusPill status={quotation.status} />
        </View>
        <View style={styles.quoteDetailAmountRow}>
          <View style={styles.quoteDetailAmountCopy}>
            <Text style={styles.quoteDetailTotal}>
              {formatCurrency(quotation.total)}
            </Text>
            <Text style={styles.quoteDetailCaption}>Total quotation value</Text>
          </View>
          <View style={styles.quoteDetailDate}>
            <Icon
              color={colors.textMuted}
              name="calendar-outline"
              size={15}
            />
            <Text style={styles.quoteDetailDateText}>
              {quotation.createdAt}
            </Text>
          </View>
        </View>
      </View>

      <SurfaceCard style={styles.detailCard}>
        <CardHeading
          icon="calculator-variant-outline"
          title="Commercial details"
        />
        <InfoRow label="Product" value={quotation.productName} />
        <InfoRow
          label="Quantity"
          value={`${quotation.quantity} ${quotation.unit}`}
        />
        <InfoRow label="Rate" value={formatCurrency(quotation.rate)} />
        <InfoRow
          label="Gross amount"
          value={formatCurrency(quotation.quantity * quotation.rate)}
        />
        <InfoRow
          label="Discount"
          value={`- ${formatCurrency(quotation.discount)}`}
        />
        <InfoRow
          label={`GST (${quotation.gst}%)`}
          value={formatCurrency(gstAmount)}
        />
        <InfoRow
          label="Freight charges"
          value={formatCurrency(quotation.deliveryCharge)}
        />
        {quotation.otherCharge ? (
          <InfoRow
            label="Other charges"
            value={formatCurrency(quotation.otherCharge)}
          />
        ) : null}
        <InfoRow
          label="Grand total"
          value={formatCurrency(quotation.total)}
          valueColor={colors.primary}
        />
      </SurfaceCard>

      <SurfaceCard style={styles.detailCard}>
        <CardHeading icon="source-branch" title="Source & visibility" />
        <InfoRow
          label="Created by"
          value={
            quotation.createdByType === 'STAFF'
              ? `Staff · ${quotation.createdByName}`
              : `Retailer · ${quotation.createdByName}`
          }
        />
        <InfoRow
          label="Creation action"
          value={
            quotation.creationAction === 'SEND_ENQUIRY'
              ? 'SEND ENQUIRY → direct Quotation'
              : 'Staff-created Quotation'
          }
        />
        {quotation.createdByType === 'STAFF' ? (
          <InfoRow
            label="Admin visibility"
            value={quotation.adminVisibility.replace(/_/g, ' ')}
          />
        ) : (
          <InfoRow label="Source channel" value="Retailer Send Enquiry" />
        )}
        <InfoRow label="Fulfillment party" value={quotation.wholesaler} />
        <InfoRow
          label="Valid until"
          value={quotation.validUntil || 'Not specified'}
        />
        <InfoRow label="Created" value={quotation.createdAt} />
      </SurfaceCard>

      <SurfaceCard style={styles.detailCard}>
        <CardHeading icon="link-variant" title="Related records" />
        {quotation.deliveryAddress ? (
          <InfoRow
            icon="map-marker-outline"
            label="Delivery address"
            value={quotation.deliveryAddress}
          />
        ) : null}
        <InfoRow
          label="Customer"
          value={`${quotation.customerName} · ${quotation.customerId}`}
        />
        <InfoRow
          label="Product"
          value={`${quotation.productName} · ${quotation.productId}`}
        />
        <InfoRow
          label="Sales order"
          value={linkedOrder ? linkedOrder.id : 'Not created'}
        />
      </SurfaceCard>

      <SurfaceCard style={styles.remarksCard}>
        <View style={styles.remarksIcon}>
          <Icon color={colors.primary} name="message-text-outline" size={21} />
        </View>
        <View style={styles.remarksText}>
          <Text style={styles.remarksLabel}>Remarks</Text>
          <Text style={styles.remarksValue}>
            {quotation.remarks || 'No remarks were provided.'}
          </Text>
          <View style={styles.quoteSavedTermsDivider} />
          <Text style={styles.remarksLabel}>Terms & Conditions</Text>
          <Text style={styles.remarksValue}>
            {quotation.terms || 'No terms and conditions were provided.'}
          </Text>
        </View>
      </SurfaceCard>

      {quotation.status === 'ACCEPTED' ? (
        <NoticeBanner
          icon="link-variant"
          message={
            linkedOrder
              ? `This accepted quotation is linked to Sales Order ${linkedOrder.id}.`
              : 'Accepted quotations create a Sales Order without re-entering product details.'
          }
          style={styles.linkedNotice}
          title="Sales Order relationship"
          tone="success"
        />
      ) : null}
    </Screen>
  );
};

const CardHeading = ({ icon, title }) => (
  <View style={styles.cardHeadingRow}>
    <View style={styles.cardHeadingIcon}>
      <Icon color={colors.primary} name={icon} size={19} />
    </View>
    <Text accessibilityRole="header" style={styles.cardHeading}>
      {title}
    </Text>
  </View>
);

// Small coloured badge showing the source that created the customer record:
// Staff App, Retailer App, or Admin.
const AddedByBadge = ({ type }) => {
  const t = String(type || '').toLowerCase();
  const config = t.includes('staff')
    ? { label: 'Staff App',    icon: 'badge-account-outline', color: colors.info }
    : t.includes('retailer')
    ? { label: 'Retailer App', icon: 'storefront-outline',    color: colors.primary }
    : { label: 'Admin',        icon: 'shield-account-outline', color: colors.navy };
  return (
    <View style={[styles.addedByBadge, { borderColor: config.color }]}>
      <Icon color={config.color} name={config.icon} size={14} />
      <Text style={[styles.addedByBadgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

// Highlights the most recent record in a section — shows when it happened
// (absolute + relative), what it was, and the amount.
const LastActivity = ({ icon, label, date, summary, amount }) => {
  const dateLabel = formatShortDate(date);
  const relative = formatRelativeDate(date);
  return (
    <View style={styles.lastActivityCard}>
      <View style={styles.lastActivityIcon}>
        <Icon color={colors.primary} name={icon} size={18} />
      </View>
      <View style={styles.lastActivityBody}>
        <Text style={styles.lastActivityLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.lastActivitySummary}>
          {summary || '—'}
        </Text>
        <Text style={styles.lastActivityMeta}>
          {dateLabel ? dateLabel : 'Date not available'}
          {relative ? ` · ${relative}` : ''}
        </Text>
      </View>
      {amount ? (
        <Text style={styles.lastActivityAmount}>{amount}</Text>
      ) : null}
    </View>
  );
};

const ActivityCard = ({
  accessibilityLabel,
  amount,
  date,
  id,
  name,
  onPress,
  status,
  createdByName,
  createdByType,
}) => {
  const dateLabel = formatShortDate(date);
  const typeUpper = String(createdByType || '').toUpperCase();
  const isRetailer = typeUpper.includes('RETAILER');
  const roleLabel = typeUpper.includes('RETAILER') ? 'Retailer'
    : typeUpper.includes('WHOLESALER') ? 'Wholesaler'
    : typeUpper.includes('STAFF') ? 'Staff'
    : typeUpper.includes('ADMIN') ? 'Admin'
    : '';
  const creatorLabel = createdByName
    ? (roleLabel ? `${createdByName} · ${roleLabel}` : createdByName)
    : roleLabel;
  return (
    <Pressable
      accessibilityHint="Opens record details"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.activityContent}>
        <Text style={styles.activityId}>{id}</Text>
        <Text numberOfLines={2} style={styles.activityName}>
          {name}
        </Text>
        {creatorLabel ? (
          <View style={styles.activityCreatorRow}>
            <Icon
              color={isRetailer ? colors.primary : colors.navy}
              name={isRetailer ? 'storefront-outline' : 'account-tie-outline'}
              size={12}
            />
            <Text numberOfLines={1} style={styles.activityCreator}>
              Created by {creatorLabel}
            </Text>
          </View>
        ) : null}
        {dateLabel ? (
          <View style={styles.activityCreatorRow}>
            <Icon
              color={colors.textMuted}
              name="calendar-blank-outline"
              size={12}
            />
            <Text numberOfLines={1} style={styles.activityCreator}>
              {dateLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.activityRight}>
        <StatusPill status={status} />
        <Text style={styles.activityAmount}>{amount}</Text>
      </View>
    </Pressable>
  );
};

const MissingRecord = ({ navigation, title }) => (
  <Screen>
    <AppHeader
      navigation={navigation}
      showBack
      showNotifications={false}
      title={title}
    />
    <EmptyState
      icon="alert-circle-outline"
      message="This static record is no longer available."
      title={title}
    />
  </Screen>
);

const SummaryItem = ({ label, last = false, value }) => (
  <View style={[styles.summaryItem, last && styles.summaryItemLast]}>
    <Text numberOfLines={1} style={styles.summaryValue}>
      {value}
    </Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.8,
  },
  searchSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  searchTitle: {
    color: colors.navy,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.title,
    marginTop: spacing.xs,
  },
  searchSubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    lineHeight: typography.lineHeights.footnote,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionButton: { flexGrow: 1, flexBasis: 150, minWidth: 0 },
  customerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    ...shadow,
  },
  customerAvatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  customerAvatarText: {
    color: colors.onNavy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  customerMain: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  customerTop: { alignItems: 'flex-start', flexDirection: 'row' },
  customerNameWrap: { flex: 1, minWidth: 0, paddingRight: spacing.xs },
  customerName: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extraBold,
    lineHeight: typography.lineHeights.body,
  },
  customerMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  contactItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    minWidth: 0,
  },
  contactText: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.sizes.footnote,
    marginLeft: spacing.xs,
  },
  customerFooter: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  orderCount: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  outstanding: {
    color: colors.danger,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
  },
  settled: {
    color: colors.success,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
  },
  formHero: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    flexDirection: 'row',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  formHeroIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  formHeroText: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  formHeroTitle: {
    color: colors.onNavy,
    flexShrink: 1,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  formHeroSubtitle: {
    color: colors.onNavyMuted,
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginTop: spacing.xs,
  },
  formBody: { padding: spacing.lg },
  formNotice: { marginBottom: spacing.md },
  formSectionLabel: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extraBold,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  quoteFormCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  quoteInfoCard: {
    backgroundColor: '#FFF8F2',
    borderColor: '#FFD6BC',
  },
  quoteCustomerCard: {
    backgroundColor: '#F2F8FF',
    borderColor: '#BFDBFE',
  },
  quoteProductCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    ...shadow,
  },
  quoteRemarksCard: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E2E8F0',
  },
  quoteSectionLabel: {
    borderBottomWidth: 2,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
  },
  quoteSectionOrange: {
    borderBottomColor: '#FFF0E5',
    color: colors.primary,
  },
  quoteSectionBlue: {
    borderBottomColor: '#E2EFFF',
    color: '#2563EB',
  },
  quoteSectionMuted: {
    borderBottomColor: '#F1F5F9',
    color: '#64748B',
  },
  quoteInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quoteInfoTile: {
    backgroundColor: colors.surface,
    borderColor: '#FFE2CF',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: 135,
    flexGrow: 1,
    minWidth: 0,
    padding: spacing.md,
  },
  quoteInfoLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  quoteInfoValue: {
    color: colors.navy,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
    marginTop: spacing.xs,
  },
  quoteDatePickerTile: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  quoteDateValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  quoteDateHint: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
  quoteIosDatePicker: {
    backgroundColor: colors.surface,
    borderColor: '#FFD6BC',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  quoteAutoNote: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  quoteAutoNoteText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginLeft: spacing.xs,
  },
  quoteSelectorLabel: {
    color: colors.navy,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
    marginBottom: spacing.sm,
  },
  quoteCustomerSearchContainer: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  quoteCustomerResults: {
    backgroundColor: colors.surface,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    maxHeight: 280,
    overflow: 'scroll',
    zIndex: 999,
    elevation: 8,
  },
  quoteCustomerResultRow: {
    alignItems: 'center',
    borderBottomColor: '#E2EFFF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quoteCustomerResultAvatar: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: radius.round,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  quoteCustomerResultAvatarText: {
    color: '#2563EB',
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
  quoteCustomerResultCopy: {
    flex: 1,
    marginHorizontal: spacing.sm,
    minWidth: 0,
  },
  quoteCustomerResultName: {
    color: colors.navy,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
  },
  quoteCustomerResultMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  quoteCustomerNoResults: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  quoteCustomerNoResultsText: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.sizes.footnote,
    marginLeft: spacing.sm,
  },
  quoteCustomerSearchHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: spacing.sm,
  },
  quoteProductResults: {
    borderColor: '#FFD6BC',
    maxHeight: 320,
    overflow: 'scroll',
    zIndex: 999,
    elevation: 8,
  },
  quoteProductResultAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFF0E5',
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quoteProductResultSummary: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: spacing.xs,
  },
  quoteProductResultPrice: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
  quoteProductResultStock: {
    color: colors.success,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  requiredMark: { color: colors.danger },
  quoteCustomerSummary: {
    backgroundColor: colors.surface,
    borderColor: '#D7E8FF',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  quoteCustomerTop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  quoteCustomerAvatar: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: radius.round,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  quoteCustomerAvatarText: {
    color: colors.onNavy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  quoteCustomerIdentity: {
    flex: 1,
    marginLeft: spacing.sm,
    minWidth: 0,
  },
  quoteCustomerName: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extraBold,
  },
  quoteCustomerId: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  quoteCustomerType: {
    backgroundColor: '#EAF3FF',
    borderRadius: radius.round,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  quoteCustomerTypeText: {
    color: '#2563EB',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  quoteAutoFilledRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  quoteAutoFilledText: {
    color: colors.success,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.xs,
  },
  quoteCustomerDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quoteCustomerDetailTile: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FBFF',
    borderColor: '#E1ECFA',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: 140,
    flexDirection: 'row',
    flexGrow: 1,
    minWidth: 0,
    padding: spacing.sm,
  },
  quoteCustomerDetailCopy: {
    flex: 1,
    marginLeft: spacing.xs,
    minWidth: 0,
  },
  quoteCustomerDetailLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  quoteCustomerDetailValue: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    lineHeight: typography.lineHeights.caption,
    marginTop: 2,
  },
  quoteCustomerAddress: {
    borderTopColor: '#E1ECFA',
    borderTopWidth: 1,
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  quoteItemCard: {
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  quoteItemHeader: {
    alignItems: 'center',
    backgroundColor: '#FFF9F5',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  quoteItemIndex: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  quoteItemIndexText: {
    color: colors.onNavy,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  quoteItemIdentity: {
    flex: 1,
    marginHorizontal: spacing.sm,
    minWidth: 0,
  },
  quoteItemName: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extraBold,
  },
  quoteItemCode: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    marginTop: 2,
  },
  quoteItemTotalWrap: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  quoteItemTotalLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  quoteItemTotalValue: {
    color: colors.primary,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    marginTop: 2,
  },
  quoteMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  quoteMetaTile: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexBasis: 105,
    flexGrow: 1,
    minWidth: 0,
    padding: spacing.sm,
  },
  quoteMetaLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  quoteMetaValue: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    lineHeight: typography.lineHeights.caption,
    marginTop: spacing.xs,
  },
  quoteInventoryBanner: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    padding: spacing.sm,
  },
  quoteInventoryIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quoteInventoryCopy: {
    flex: 1,
    marginLeft: spacing.sm,
    minWidth: 0,
  },
  quoteInventoryTitle: {
    color: colors.success,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
  quoteInventoryText: {
    color: colors.success,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  quotePricingLabel: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.7,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  quoteCalculationGrid: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    margin: spacing.md,
    padding: spacing.sm,
  },
  quoteCalculationCell: {
    alignItems: 'center',
    flexBasis: 82,
    flexGrow: 1,
    minWidth: 0,
    padding: spacing.xs,
  },
  quoteCalculationLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  quoteCalculationValue: {
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
    marginTop: spacing.xs,
  },
  quoteTotalsCard: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  quoteTotalsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  quoteTotalsLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.sizes.footnote,
  },
  quoteTotalsValue: {
    color: colors.navy,
    flexShrink: 0,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
    marginLeft: spacing.md,
  },
  quoteTotalsDivider: {
    backgroundColor: colors.border,
    height: 2,
    marginVertical: spacing.md,
  },
  quoteGrandTotalRow: {
    alignItems: 'center',
    borderLeftColor: colors.primary,
    borderLeftWidth: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
  },
  quoteGrandTotalLabel: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
  },
  quoteGrandTotalValue: {
    color: colors.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
  },
  quoteTermsNote: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  quoteTermsNoteText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginLeft: spacing.xs,
  },
  quoteFieldHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  quoteFieldHintText: {
    color: colors.danger,
    flex: 1,
    fontSize: typography.sizes.caption,
  },
  quoteSectionSpacer: {
    height: spacing.lg,
  },
  quoteSavedTermsDivider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.md,
  },
  detailHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  detailHeroTop: { alignItems: 'center', flexDirection: 'row' },
  detailAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  detailAvatarText: {
    color: colors.onNavy,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
  },
  detailHeroText: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  detailName: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.title,
  },
  detailTypeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailTypeChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  detailTypeChipText: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  detailMetaInline: { alignItems: 'center', flexDirection: 'row', gap: 3, flexShrink: 1 },
  detailType: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.bold,
  },
  summaryRow: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    borderRightColor: colors.border,
    borderRightWidth: 1,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
  },
  summaryItemLast: { borderRightWidth: 0 },
  summaryValue: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    maxWidth: '100%',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  detailCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  cardHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  cardHeadingIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cardHeading: {
    color: colors.navy,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    marginLeft: spacing.sm,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  detailAction: { flexGrow: 1, flexBasis: 150, minWidth: 0 },
  lastActivityCard: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
  },
  lastActivityIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  lastActivityBody: { flex: 1, minWidth: 0 },
  lastActivityLabel: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  lastActivitySummary: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  lastActivityMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  lastActivityAmount: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  addedByBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.pill || radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addedByBadgeText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.4,
  },
  activityCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    ...shadow,
  },
  activityContent: { flex: 1, minWidth: 0 },
  activityId: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
  activityName: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.label,
    marginTop: spacing.xs,
  },
  activityCreatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
  },
  activityCreator: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  activityRight: { alignItems: 'flex-end', flexShrink: 0 },
  activityAmount: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.extraBold,
    marginTop: spacing.sm,
  },
  quoteHero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  quoteHeroIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  quoteHeroCopy: { flex: 1, minWidth: 90 },
  quoteHeroCount: {
    color: colors.navy,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
  },
  quoteHeroLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    letterSpacing: 0.6,
  },
  quoteHeroAction: { flexGrow: 1, maxWidth: 170, minWidth: 145 },
  filterCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  filterTitle: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  filterSubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  quoteCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
    ...shadow,
  },
  quoteTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  quoteIdentity: { flex: 1, minWidth: 0 },
  quoteId: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
  quoteCustomer: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extraBold,
    lineHeight: typography.lineHeights.body,
    marginTop: spacing.xs,
  },
  originBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  staffOrigin: {
    color: colors.info,
    flex: 1,
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.caption,
    marginLeft: spacing.sm,
  },
  retailerOrigin: {
    color: colors.primary,
    flex: 1,
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.caption,
    marginLeft: spacing.sm,
  },
  quoteProductRow: {
    alignItems: 'flex-end',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  quoteProductCopy: { flex: 1, minWidth: 0 },
  quoteProduct: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.label,
  },
  quoteMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: spacing.xs,
  },
  quoteTotal: {
    color: colors.navy,
    flexShrink: 0,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  quoteFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  quoteFooterItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    minWidth: 0,
  },
  quoteFooterText: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    marginLeft: spacing.xs,
  },
  numericGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  numericField: { flexBasis: 135, flexGrow: 1, minWidth: 0 },
  footerEstimate: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  footerEstimateLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
  },
  footerEstimateSubtext: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  footerEstimateValue: {
    color: colors.primary,
    flexShrink: 0,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
  },
  detailNotice: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  quoteDetailHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  quoteDetailTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  quoteDetailIdentity: { flex: 1, minWidth: 0 },
  quoteDetailLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
  },
  quoteDetailCustomer: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.subtitle,
    marginTop: spacing.xs,
  },
  quoteDetailId: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    marginTop: 2,
  },
  quoteDetailAmountRow: {
    alignItems: 'flex-end',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  quoteDetailAmountCopy: { flexGrow: 1, minWidth: 160 },
  quoteDetailTotal: {
    color: colors.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
  },
  quoteDetailCaption: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: spacing.xs,
  },
  quoteDetailDate: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingBottom: spacing.xs,
  },
  quoteDetailDateText: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  remarksCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  remarksIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  remarksText: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  remarksLabel: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
  remarksValue: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.sizes.footnote,
    lineHeight: typography.lineHeights.footnote,
    marginTop: spacing.xs,
  },
  linkedNotice: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
});



