import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApp } from '../AppContext';
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

export const CustomersScreen = ({ navigation }) => {
  const { customers, unreadCount } = useApp();
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
    <Screen>
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
                    {customer.id} · {customer.type}
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
  const [error, setError] = useState('');

  const update = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setError('');
  };

  const save = () => {
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

    const customer = addCustomer(form);
    Alert.alert(
      'Customer created',
      `${customer.name} is now visible to Staff and Admin.`,
      [
        {
          text: 'View customer',
          onPress: () =>
            navigation.replace('CustomerDetail', { id: customer.id }),
        },
      ],
    );
  };

  return (
    <Screen
      footer={
        <PrimaryButton
          icon="content-save-outline"
          onPress={save}
          title="Save customer"
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

  if (!customer) {
    return <MissingRecord navigation={navigation} title="Customer not found" />;
  }

  const customerOrders = orders.filter(item => item.customerId === customer.id);
  const customerQuotes = quotations.filter(
    item => item.customerId === customer.id,
  );
  const customerInvoices = invoices.filter(
    item => item.customerId === customer.id,
  );
  const customerPayments = payments.filter(
    item => item.customerId === customer.id,
  );

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={customer.id}
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
        customerQuotes.map(quotation => (
          <ActivityCard
            accessibilityLabel={`Quotation ${quotation.id}, ${
              quotation.productName
            }, ${formatCurrency(quotation.total)}`}
            amount={formatCurrency(quotation.total)}
            id={quotation.id}
            key={quotation.id}
            name={`${quotation.productName} · ${quotation.quantity} ${quotation.unit}`}
            onPress={() =>
              navigation.navigate('QuotationDetail', { id: quotation.id })
            }
            status={quotation.status}
          />
        ))
      ) : (
        <EmptyState
          compact
          icon="file-document-outline"
          message="Create the first quotation for this customer to begin a transaction."
          title="No quotations yet"
        />
      )}

      <SectionHeader title="Recent orders" />
      {customerOrders.length ? (
        customerOrders.map(order => (
          <ActivityCard
            accessibilityLabel={`Order ${order.id}, ${
              order.productName
            }, ${formatCurrency(order.total)}`}
            amount={formatCurrency(order.total)}
            id={order.id}
            key={order.id}
            name={order.productName}
            onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            status={order.status}
          />
        ))
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
        customerPayments.map(payment => (
          <ActivityCard
            accessibilityLabel={`Payment ${payment.id}, invoice ${
              payment.invoiceId
            }, ${formatCurrency(payment.amount)}`}
            amount={formatCurrency(payment.amount)}
            id={payment.id}
            key={payment.id}
            name={`${payment.invoiceId} · ${payment.mode}`}
            onPress={() =>
              navigation.navigate('InvoiceDetail', { id: payment.invoiceId })
            }
            status={payment.status}
          />
        ))
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
    <Screen>
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

export const QuotationFormScreen = ({ navigation, route }) => {
  const { createQuotation, customers, products } = useApp();
  const routeCustomer = customers.find(
    item => item.id === route.params?.customerId,
  );
  const [form, setForm] = useState({
    customerId: routeCustomer?.id || '',
    productId: '',
    quantity: '20',
    rate: '',
    discount: '0',
    gst: '18',
    deliveryCharge: '500',
    otherCharge: '0',
    remarks: '',
    terms: 'Prices are subject to change. GST extra as applicable.',
  });
  const [customerSearch, setCustomerSearch] = useState(
    routeCustomer?.name || '',
  );
  const [customerResultsVisible, setCustomerResultsVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productResultsVisible, setProductResultsVisible] = useState(false);
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  });
  const [showIosDatePicker, setShowIosDatePicker] = useState(false);
  const [error, setError] = useState('');
  const selectedCustomer = customers.find(item => item.id === form.customerId);
  const selectedProduct = products.find(item => item.id === form.productId);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) {
      return customers;
    }
    return customers.filter(customer =>
      [
        customer.name,
        customer.id,
        customer.mobile,
        customer.city,
        customer.gst,
      ].some(value => String(value || '').toLowerCase().includes(query)),
    );
  }, [customerSearch, customers]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) {
      return products;
    }
    return products.filter(product =>
      [
        product.name,
        product.code,
        product.brand,
        product.category,
        product.size,
        product.finish,
        product.wholesaler,
        product.location,
      ].some(value => String(value || '').toLowerCase().includes(query)),
    );
  }, [productSearch, products]);

  const quotationDate = useMemo(
    () => formatQuotationDate(new Date()),
    [],
  );
  const minimumValidUntil = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const update = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setError('');
  };

  const searchCustomers = value => {
    setCustomerSearch(value);
    setCustomerResultsVisible(true);
    update('customerId', '');
  };

  const chooseCustomer = customer => {
    setCustomerSearch(customer.name);
    setCustomerResultsVisible(false);
    update('customerId', customer.id);
  };

  const searchProducts = value => {
    setProductSearch(value);
    setProductResultsVisible(true);
    setForm(current => ({
      ...current,
      productId: '',
      rate: '',
      gst: '18',
    }));
    setError('');
  };

  const chooseProduct = product => {
    if (!product) {
      return;
    }
    setProductSearch(product.name);
    setProductResultsVisible(false);
    setForm(current => ({
      ...current,
      productId: product.id,
      rate: String(product.rate),
      gst: String(product.gst),
    }));
    setError('');
  };

  const selectValidUntil = date => {
    setValidUntil(date);
    setError('');
  };

  const openValidUntilPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        display: 'default',
        minimumDate: minimumValidUntil,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            selectValidUntil(date);
          }
        },
        value: validUntil,
      });
      return;
    }
    setShowIosDatePicker(true);
  };

  const totals = useMemo(() => {
    const amount = Number(form.quantity || 0) * Number(form.rate || 0);
    const discount = Number(form.discount || 0);
    const taxable = Math.max(0, amount - discount);
    const gstAmount = taxable * (Number(form.gst || 0) / 100);
    const itemTotal = taxable + gstAmount;
    const deliveryCharge = Number(form.deliveryCharge || 0);
    const otherCharge = Number(form.otherCharge || 0);
    return {
      amount,
      discount,
      gstAmount,
      itemTotal,
      taxable,
      grandTotal: Math.round(itemTotal + deliveryCharge + otherCharge),
    };
  }, [form]);

  const save = () => {
    if (
      !selectedCustomer ||
      !selectedProduct ||
      Number(form.quantity) <= 0 ||
      Number(form.rate) <= 0
    ) {
      setError(
        'Select a customer and product, then enter valid quantity and rate.',
      );
      return;
    }

    const quotation = createQuotation({
      ...form,
      validUntil: formatQuotationDate(validUntil),
    });
    navigation.replace('QuotationDetail', { id: quotation.id, created: true });
  };

  return (
    <Screen
      footer={
        <View>
          <View style={styles.footerEstimate}>
            <View>
              <Text style={styles.footerEstimateLabel}>GRAND TOTAL</Text>
              <Text style={styles.footerEstimateSubtext}>
                Inclusive of GST and delivery
              </Text>
            </View>
            <Text style={styles.footerEstimateValue}>
              {formatCurrency(totals.grandTotal)}
            </Text>
          </View>
          <PrimaryButton
            icon="file-check-outline"
            onPress={save}
            title="Save Quotation"
          />
        </View>
      }
      keyboardAvoiding
    >
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle="Create and submit to Admin"
        title="New Quotation"
      />

      <View style={styles.formBody}>
        {error ? (
          <NoticeBanner
            message={error}
            style={styles.formNotice}
            tone="danger"
          />
        ) : null}

        <View style={[styles.quoteFormCard, styles.quoteInfoCard]}>
          <Text style={[styles.quoteSectionLabel, styles.quoteSectionOrange]}>
            QUOTATION INFORMATION
          </Text>
          <View style={styles.quoteInfoGrid}>
            {[
              ['Quotation Number', 'Auto-generated'],
              ['Enquiry', 'Staff direct'],
              ['Quotation Date', quotationDate],
            ].map(([label, value]) => (
              <View key={label} style={styles.quoteInfoTile}>
                <Text style={styles.quoteInfoLabel}>{label}</Text>
                <Text style={styles.quoteInfoValue}>{value}</Text>
              </View>
            ))}
            <Pressable
              accessibilityHint="Opens the date picker"
              accessibilityLabel={`Valid until ${formatQuotationDate(validUntil)}`}
              accessibilityRole="button"
              onPress={openValidUntilPicker}
              style={({ pressed }) => [
                styles.quoteInfoTile,
                styles.quoteDatePickerTile,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.quoteInfoLabel}>Valid Until</Text>
              <View style={styles.quoteDateValueRow}>
                <Text style={styles.quoteInfoValue}>
                  {formatQuotationDate(validUntil)}
                </Text>
                <Icon color={colors.primary} name="calendar-month" size={19} />
              </View>
              <Text style={styles.quoteDateHint}>Tap to select date</Text>
            </Pressable>
          </View>
          {Platform.OS === 'ios' && showIosDatePicker ? (
            <View style={styles.quoteIosDatePicker}>
              <DateTimePicker
                display="inline"
                minimumDate={minimumValidUntil}
                mode="date"
                onChange={(event, date) => {
                  if (event.type === 'set' && date) {
                    selectValidUntil(date);
                  }
                }}
                value={validUntil}
              />
              <PrimaryButton
                onPress={() => setShowIosDatePicker(false)}
                size="compact"
                title="Done"
              />
            </View>
          ) : null}
          <View style={styles.quoteAutoNote}>
            <Icon color={colors.primary} name="information-outline" size={16} />
            <Text style={styles.quoteAutoNoteText}>
              Quotation number is created automatically when you save.
            </Text>
          </View>
        </View>

        <View style={[styles.quoteFormCard, styles.quoteCustomerCard]}>
          <Text style={[styles.quoteSectionLabel, styles.quoteSectionBlue]}>
            CUSTOMER DETAILS
          </Text>
          <Text style={styles.quoteSelectorLabel}>
            Customer / Retailer <Text style={styles.requiredMark}>*</Text>
          </Text>
          <SearchInput
            accessibilityLabel="Search and select customer"
            autoCapitalize="words"
            containerStyle={styles.quoteCustomerSearchContainer}
            onChangeText={searchCustomers}
            onFocus={() => setCustomerResultsVisible(true)}
            placeholder="Search name, mobile, ID, city or GST"
            value={customerSearch}
          />

          {customerResultsVisible ? (
            <View style={styles.quoteCustomerResults}>
              {filteredCustomers.length ? (
                filteredCustomers.map(customer => (
                  <Pressable
                    accessibilityLabel={`Select ${customer.name}`}
                    accessibilityRole="button"
                    key={customer.id}
                    onPress={() => chooseCustomer(customer)}
                    style={({ pressed }) => [
                      styles.quoteCustomerResultRow,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.quoteCustomerResultAvatar}>
                      <Text style={styles.quoteCustomerResultAvatarText}>
                        {customer.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.quoteCustomerResultCopy}>
                      <Text
                        numberOfLines={1}
                        style={styles.quoteCustomerResultName}
                      >
                        {customer.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={styles.quoteCustomerResultMeta}
                      >
                        {customer.id} · {customer.mobile} · {customer.city}
                      </Text>
                    </View>
                    <Icon color="#2563EB" name="chevron-right" size={20} />
                  </Pressable>
                ))
              ) : (
                <View style={styles.quoteCustomerNoResults}>
                  <Icon color={colors.textMuted} name="account-search" size={20} />
                  <Text style={styles.quoteCustomerNoResultsText}>
                    No customers match “{customerSearch}”
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {!selectedCustomer && !customerResultsVisible ? (
            <Text style={styles.quoteCustomerSearchHint}>
              Search and select a customer to view full details.
            </Text>
          ) : null}

          {selectedCustomer ? (
            <View style={styles.quoteCustomerSummary}>
              <View style={styles.quoteCustomerTop}>
                <View style={styles.quoteCustomerAvatar}>
                  <Text style={styles.quoteCustomerAvatarText}>
                    {selectedCustomer.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.quoteCustomerIdentity}>
                  <Text style={styles.quoteCustomerName}>
                    {selectedCustomer.name}
                  </Text>
                  <Text style={styles.quoteCustomerId}>{selectedCustomer.id}</Text>
                </View>
                <View style={styles.quoteCustomerType}>
                  <Text style={styles.quoteCustomerTypeText}>
                    {selectedCustomer.type}
                  </Text>
                </View>
              </View>

              <View style={styles.quoteAutoFilledRow}>
                <Icon color={colors.success} name="check-circle" size={14} />
                <Text style={styles.quoteAutoFilledText}>
                  Details auto-filled from selected customer
                </Text>
              </View>

              <View style={styles.quoteCustomerDetailGrid}>
                {[
                  ['Mobile', selectedCustomer.mobile, 'phone-outline'],
                  ['Email', selectedCustomer.email, 'email-outline'],
                  ['GSTIN', selectedCustomer.gst, 'identifier'],
                  [
                    'Location',
                    `${selectedCustomer.city}, ${selectedCustomer.state}`,
                    'map-marker-outline',
                  ],
                ].map(([label, value, icon]) => (
                  <View key={label} style={styles.quoteCustomerDetailTile}>
                    <Icon color="#2563EB" name={icon} size={16} />
                    <View style={styles.quoteCustomerDetailCopy}>
                      <Text style={styles.quoteCustomerDetailLabel}>{label}</Text>
                      <Text
                        numberOfLines={2}
                        style={styles.quoteCustomerDetailValue}
                      >
                        {value || 'Not provided'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.quoteCustomerAddress}>
                {[
                  selectedCustomer.address,
                  selectedCustomer.city,
                  selectedCustomer.state,
                  selectedCustomer.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.quoteFormCard, styles.quoteProductCard]}>
          <Text style={[styles.quoteSectionLabel, styles.quoteSectionOrange]}>
            PRODUCTS / ITEMS
          </Text>
          <Text style={styles.quoteSelectorLabel}>
            Select Product <Text style={styles.requiredMark}>*</Text>
          </Text>
          <SearchInput
            accessibilityLabel="Search and select product"
            autoCapitalize="words"
            containerStyle={styles.quoteCustomerSearchContainer}
            onChangeText={searchProducts}
            onFocus={() => setProductResultsVisible(true)}
            placeholder="Search name, code, brand, category or size"
            value={productSearch}
          />

          {productResultsVisible ? (
            <View
              style={[
                styles.quoteCustomerResults,
                styles.quoteProductResults,
              ]}
            >
              {filteredProducts.length ? (
                filteredProducts.map(product => (
                  <Pressable
                    accessibilityLabel={`Select ${product.name}`}
                    accessibilityRole="button"
                    key={product.id}
                    onPress={() => chooseProduct(product)}
                    style={({ pressed }) => [
                      styles.quoteCustomerResultRow,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.quoteProductResultAvatar}>
                      <Icon color={colors.primary} name="package-variant" size={18} />
                    </View>
                    <View style={styles.quoteCustomerResultCopy}>
                      <Text
                        numberOfLines={1}
                        style={styles.quoteCustomerResultName}
                      >
                        {product.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={styles.quoteCustomerResultMeta}
                      >
                        {product.code} · {product.brand} · {product.category}
                      </Text>
                    </View>
                    <View style={styles.quoteProductResultSummary}>
                      <Text style={styles.quoteProductResultPrice}>
                        {formatCurrency(product.rate)}
                      </Text>
                      <Text style={styles.quoteProductResultStock}>
                        {product.stock} {product.unit}
                      </Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={styles.quoteCustomerNoResults}>
                  <Icon color={colors.textMuted} name="package-variant" size={20} />
                  <Text style={styles.quoteCustomerNoResultsText}>
                    No products match “{productSearch}”
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {!selectedProduct && !productResultsVisible ? (
            <Text style={styles.quoteCustomerSearchHint}>
              Search and select a product to view pricing and stock details.
            </Text>
          ) : null}

          {selectedProduct ? (
            <View style={styles.quoteItemCard}>
              <View style={styles.quoteItemHeader}>
                <View style={styles.quoteItemIndex}>
                  <Text style={styles.quoteItemIndexText}>1</Text>
                </View>
                <View style={styles.quoteItemIdentity}>
                  <Text style={styles.quoteItemName}>{selectedProduct.name}</Text>
                  <Text style={styles.quoteItemCode}>{selectedProduct.code}</Text>
                </View>
                <View style={styles.quoteItemTotalWrap}>
                  <Text style={styles.quoteItemTotalLabel}>ROW TOTAL</Text>
                  <Text style={styles.quoteItemTotalValue}>
                    {formatCurrency(totals.itemTotal)}
                  </Text>
                </View>
              </View>

              <View style={styles.quoteMetaGrid}>
                {[
                  ['Code', selectedProduct.code],
                  ['Brand', selectedProduct.brand],
                  ['Category', selectedProduct.category],
                  ['Sub-Category', selectedProduct.subCategory],
                  ['Size', selectedProduct.size],
                  ['Finish', selectedProduct.finish],
                  ['Tile Type', selectedProduct.tileType],
                  ['Grade', selectedProduct.grade],
                  ['Unit / GST', `${selectedProduct.unit} / ${form.gst || 0}%`],
                  [
                    'MRP',
                    selectedProduct.mrp
                      ? formatCurrency(selectedProduct.mrp)
                      : null,
                  ],
                  [
                    'Retail Rate',
                    selectedProduct.retailPrice
                      ? formatCurrency(selectedProduct.retailPrice)
                      : null,
                  ],
                  [
                    'Dealer Rate',
                    selectedProduct.dealerPrice
                      ? formatCurrency(selectedProduct.dealerPrice)
                      : null,
                  ],
                  [
                    'Purchase Rate',
                    selectedProduct.purchasePrice
                      ? formatCurrency(selectedProduct.purchasePrice)
                      : null,
                  ],
                  [
                    'Pcs/Box · Sqft/Box',
                    [selectedProduct.pcsPerBox, selectedProduct.sqftPerBox]
                      .filter(part => part !== undefined && part !== null)
                      .join(' · '),
                  ],
                  ['HSN Code', selectedProduct.hsnCode],
                  ['Location', selectedProduct.location],
                ].map(([label, value]) => (
                  <View key={label} style={styles.quoteMetaTile}>
                    <Text style={styles.quoteMetaLabel}>{label}</Text>
                    <Text numberOfLines={2} style={styles.quoteMetaValue}>
                      {value || '—'}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.quoteInventoryBanner}>
                <View style={styles.quoteInventoryIcon}>
                  <Icon color={colors.success} name="warehouse" size={18} />
                </View>
                <View style={styles.quoteInventoryCopy}>
                  <Text style={styles.quoteInventoryTitle}>
                    {selectedProduct.stock} {selectedProduct.unit} available
                  </Text>
                  <Text style={styles.quoteInventoryText}>
                    {selectedProduct.wholesaler} · {selectedProduct.location}
                  </Text>
                </View>
              </View>

              <Text style={styles.quotePricingLabel}>ITEM PRICING</Text>
              <View style={styles.numericGrid}>
                <View style={styles.numericField}>
                  <TextField
                    error={
                      error && Number(form.quantity) <= 0
                        ? 'Required'
                        : undefined
                    }
                    keyboardType="number-pad"
                    label={`Quantity (${selectedProduct.unit})`}
                    onChangeText={value =>
                      update('quantity', value.replace(/\D/g, ''))
                    }
                    placeholder="0"
                    required
                    value={form.quantity}
                  />
                </View>
                <View style={styles.numericField}>
                  <TextField
                    error={
                      error && Number(form.rate) <= 0
                        ? 'Required'
                        : undefined
                    }
                    keyboardType="number-pad"
                    label="Rate / unit"
                    onChangeText={value =>
                      update('rate', value.replace(/\D/g, ''))
                    }
                    placeholder="0"
                    prefix="₹"
                    required
                    value={form.rate}
                  />
                </View>
                <View style={styles.numericField}>
                  <TextField
                    keyboardType="number-pad"
                    label="Discount (₹)"
                    onChangeText={value =>
                      update('discount', value.replace(/\D/g, ''))
                    }
                    placeholder="0"
                    prefix="₹"
                    value={form.discount}
                  />
                </View>
                <View style={styles.numericField}>
                  <TextField
                    keyboardType="number-pad"
                    label="GST %"
                    onChangeText={value =>
                      update('gst', value.replace(/\D/g, ''))
                    }
                    placeholder="18"
                    value={form.gst}
                  />
                </View>
              </View>

              <View style={styles.quoteCalculationGrid}>
                {[
                  [
                    'Qty',
                    `${form.quantity || 0} ${selectedProduct.unit}`,
                    '#2563EB',
                  ],
                  ['Amount', formatCurrency(totals.amount), colors.navy],
                  ['Discount', formatCurrency(totals.discount), '#D97706'],
                  ['GST Amt', formatCurrency(totals.gstAmount), '#7C3AED'],
                  ['Total', formatCurrency(totals.itemTotal), colors.primary],
                ].map(([label, value, color]) => (
                  <View key={label} style={styles.quoteCalculationCell}>
                    <Text style={styles.quoteCalculationLabel}>{label}</Text>
                    <Text style={[styles.quoteCalculationValue, { color }]}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.quoteTotalsCard}>
            <TextField
              keyboardType="number-pad"
              label="Freight Charges"
              onChangeText={value =>
                update('deliveryCharge', value.replace(/\D/g, ''))
              }
              placeholder="0"
              prefix="₹"
              value={form.deliveryCharge}
            />
            <TextField
              keyboardType="number-pad"
              label="Other Charges"
              onChangeText={value =>
                update('otherCharge', value.replace(/\D/g, ''))
              }
              placeholder="0"
              prefix="₹"
              value={form.otherCharge}
            />
            <View style={styles.quoteTotalsRow}>
              <Text style={styles.quoteTotalsLabel}>Taxable subtotal</Text>
              <Text style={styles.quoteTotalsValue}>
                {formatCurrency(totals.taxable)}
              </Text>
            </View>
            <View style={styles.quoteTotalsRow}>
              <Text style={styles.quoteTotalsLabel}>GST ({form.gst || 0}%)</Text>
              <Text style={styles.quoteTotalsValue}>
                {formatCurrency(totals.gstAmount)}
              </Text>
            </View>
            <View style={styles.quoteTotalsRow}>
              <Text style={styles.quoteTotalsLabel}>Subtotal + GST</Text>
              <Text style={styles.quoteTotalsValue}>
                {formatCurrency(totals.itemTotal)}
              </Text>
            </View>
            <View style={styles.quoteTotalsRow}>
              <Text style={styles.quoteTotalsLabel}>Freight Charges</Text>
              <Text style={styles.quoteTotalsValue}>
                {formatCurrency(Number(form.deliveryCharge || 0))}
              </Text>
            </View>
            <View style={styles.quoteTotalsRow}>
              <Text style={styles.quoteTotalsLabel}>Other Charges</Text>
              <Text style={styles.quoteTotalsValue}>
                {formatCurrency(Number(form.otherCharge || 0))}
              </Text>
            </View>
            <View style={styles.quoteTotalsDivider} />
            <View style={styles.quoteGrandTotalRow}>
              <Text style={styles.quoteGrandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.quoteGrandTotalValue}>
                {formatCurrency(totals.grandTotal)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.quoteFormCard, styles.quoteRemarksCard]}>
          <Text style={[styles.quoteSectionLabel, styles.quoteSectionMuted]}>
            REMARKS & TERMS
          </Text>
          <TextField
            autoCapitalize="sentences"
            label="Remarks"
            multiline
            onChangeText={value => update('remarks', value)}
            placeholder="Add internal or customer remarks"
            value={form.remarks}
          />
          <TextField
            autoCapitalize="sentences"
            label="Terms & Conditions"
            multiline
            onChangeText={value => update('terms', value)}
            placeholder="Add quotation terms and conditions"
            value={form.terms}
          />
          <View style={styles.quoteTermsNote}>
            <Icon color={colors.textMuted} name="shield-check-outline" size={16} />
            <Text style={styles.quoteTermsNoteText}>
              Price and availability are subject to final Admin approval.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
};

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

const ActivityCard = ({
  accessibilityLabel,
  amount,
  id,
  name,
  onPress,
  status,
}) => (
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
    </View>
    <View style={styles.activityRight}>
      <StatusPill status={status} />
      <Text style={styles.activityAmount}>{amount}</Text>
    </View>
  </Pressable>
);

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
    overflow: 'hidden',
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
