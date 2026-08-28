import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApp } from '../AppContext';
import {
  AppHeader,
  ChoiceChips,
  EmptyState,
  InfoRow,
  NoticeBanner,
  PrimaryButton,
  ProgressBar,
  Screen,
  SearchInput,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  TextField,
} from '../components';
import {
  colors,
  controlSizes,
  formatCurrency,
  radius,
  shadow,
  spacing,
  typography,
} from '../theme';

export const OrdersScreen = ({ navigation }) => {
  const { orders, unreadCount } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const isClosed = status => ['DELIVERED', 'CANCELLED'].includes(status);
  const isInProgress = status => !isClosed(status) && status !== 'HOLD';
  const counts = {
    open: orders.filter(o => isInProgress(o.status)).length,
    hold: orders.filter(o => o.status === 'HOLD').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
  };

  const visibleOrders = orders.filter(order => {
    const query = search.toLowerCase();
    const matchesSearch =
      order.id.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.productName.toLowerCase().includes(query);
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'IN_PROGRESS' && isInProgress(order.status)) ||
      (filter === 'HOLD' && order.status === 'HOLD') ||
      (filter === 'DELIVERED' && order.status === 'DELIVERED');
    return matchesSearch && matchesFilter;
  });
  const activeOrderValue = orders
    .filter(order => !isClosed(order.status))
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        subtitle="Assigned sales orders"
        title="Orders"
        unreadCount={unreadCount}
      />

      {/* ── Summary strip ── */}
      <View style={styles.orderStatStrip}>
        <View style={styles.orderStatMain}>
          <Text style={styles.orderStatLabel}>ACTIVE ORDER VALUE</Text>
          <Text numberOfLines={1} style={styles.orderStatValue}>
            {formatCurrency(activeOrderValue)}
          </Text>
        </View>
        <View style={styles.orderStatDivider} />
        <View style={styles.orderStatCounts}>
          <View style={styles.orderStatCount}>
            <Text style={[styles.orderStatCountNum, { color: colors.navy }]}>
              {counts.open}
            </Text>
            <Text style={styles.orderStatCountLabel}>In progress</Text>
          </View>
          <View style={styles.orderStatCount}>
            <Text style={[styles.orderStatCountNum, { color: colors.warning }]}>
              {counts.hold}
            </Text>
            <Text style={styles.orderStatCountLabel}>On hold</Text>
          </View>
          <View style={styles.orderStatCount}>
            <Text style={[styles.orderStatCountNum, { color: colors.success }]}>
              {counts.delivered}
            </Text>
            <Text style={styles.orderStatCountLabel}>Delivered</Text>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityHint="Opens the dispatch tracking list"
        accessibilityLabel="View all dispatches"
        accessibilityRole="button"
        onPress={() => navigation.navigate('Dispatches')}
        style={({ pressed }) => [
          styles.dispatchShortcut,
          pressed && styles.pressablePressed,
        ]}>
        <View style={styles.shortcutIcon}>
          <Icon color={colors.primary} name="truck-fast-outline" size={20} />
        </View>
        <View style={styles.flexText}>
          <Text style={styles.dispatchShortcutText}>Dispatch tracking</Text>
          <Text style={styles.dispatchShortcutSub}>
            Follow picking, transit and delivery
          </Text>
        </View>
        <Icon color={colors.navy} name="arrow-right" size={18} />
      </Pressable>

      <SearchInput
        accessibilityLabel="Search assigned orders"
        onChangeText={setSearch}
        placeholder="Search order, customer or product"
        value={search}
      />
      <View style={styles.filterArea}>
        <ChoiceChips
          onChange={setFilter}
          options={[
            { label: 'All', value: 'ALL' },
            { label: 'In progress', value: 'IN_PROGRESS' },
            { label: 'On hold', value: 'HOLD' },
            { label: 'Delivered', value: 'DELIVERED' },
          ]}
          value={filter}
        />
      </View>

      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.contextEyebrow}>SALES ORDERS</Text>
          <Text style={styles.resultsTitle}>
            {visibleOrders.length} {visibleOrders.length === 1 ? 'order' : 'orders'}
          </Text>
        </View>
        <View style={styles.contextBadge}>
          <Text style={styles.contextBadgeText}>{filter.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      {visibleOrders.length ? (
        visibleOrders.map(order => {
          const deliveryProgress = order.quantity
            ? (order.delivered / order.quantity) * 100
            : 0;
          const isDelivered = order.status === 'DELIVERED';
          return (
            <SurfaceCard
              accessibilityHint="Opens order details"
              accessibilityLabel={`${order.id}, ${order.customerName}, ${order.status}`}
              key={order.id}
              onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
              style={styles.orderCard}>
              {/* Top: customer + status */}
              <View style={styles.orderCardTop}>
                <View style={styles.orderCardAvatar}>
                  <Text style={styles.orderCardAvatarText}>
                    {(order.customerName || '?').charAt(0)}
                  </Text>
                </View>
                <View style={styles.flexText}>
                  <Text numberOfLines={1} style={styles.orderCustomer}>
                    {order.customerName}
                  </Text>
                  <Text style={styles.orderId}>{order.id}</Text>
                </View>
                <StatusPill status={order.status} />
              </View>

              {/* Product + amount */}
              <View style={styles.productLine}>
                <View style={styles.productIcon}>
                  <Icon color={colors.navy} name="texture-box" size={20} />
                </View>
                <View style={styles.productText}>
                  <Text numberOfLines={1} style={styles.productName}>
                    {order.productName}
                  </Text>
                  <Text style={styles.productMeta}>
                    {order.productCode} · {order.quantity} {order.unit}
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.orderTotal}>
                  {formatCurrency(order.total)}
                </Text>
              </View>

              {/* Progress */}
              <View style={styles.progressMetaRow}>
                <Text style={styles.progressMetaLabel}>
                  {isDelivered ? 'Delivered' : 'Delivery progress'}
                </Text>
                <Text style={styles.progressMetaValue}>
                  {Math.round(Number(deliveryProgress) || 0)}% · {order.delivered}/
                  {order.quantity} {order.unit}
                </Text>
              </View>
              <ProgressBar value={deliveryProgress} />

              {/* Footer: expected delivery */}
              <View style={styles.orderCardFooter}>
                <Icon
                  color={colors.textMuted}
                  name="calendar-clock-outline"
                  size={14}
                />
                <Text style={styles.orderCardFooterText}>
                  {isDelivered ? 'Completed' : `Expected ${order.expectedDelivery}`}
                </Text>
                <Icon color={colors.textMuted} name="chevron-right" size={18} />
              </View>
            </SurfaceCard>
          );
        })
      ) : (
        <EmptyState
          actionLabel={search ? 'Clear search' : undefined}
          icon="clipboard-search-outline"
          message="No assigned sales orders match the selected search and filter."
          onAction={search ? () => setSearch('') : undefined}
          title="No orders found"
        />
      )}
    </Screen>
  );
};

const ORDER_STEPS = [
  { key: 'CONFIRMED', label: 'Confirmed', icon: 'file-check-outline' },
  { key: 'PACKING', label: 'Packing', icon: 'package-variant-closed' },
  { key: 'READY_TO_DISPATCH', label: 'Ready', icon: 'clipboard-check-outline' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: 'truck-fast-outline' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'check-circle-outline' },
];

export const OrderDetailScreen = ({ navigation, route }) => {
  const { dispatches, invoices, orders } = useApp();
  const order = orders.find(item => item.id === route.params?.id);

  if (!order) {
    return <MissingRecord navigation={navigation} title="Order not found" />;
  }

  const linkedDispatches = dispatches.filter(item => item.orderId === order.id);
  const linkedInvoices = invoices.filter(item => item.orderId === order.id);
  const remainingToDispatch = order.quantity - order.dispatched;
  const remainingToDeliver = order.quantity - order.delivered;
  const isHold = order.status === 'HOLD';
  const currentStep = isHold
    ? Math.max(0, ORDER_STEPS.findIndex(step => step.key === order.previousStatus))
    : Math.max(
        0,
        ORDER_STEPS.findIndex(step =>
          order.status === 'PARTIALLY_DELIVERED'
            ? step.key === 'OUT_FOR_DELIVERY'
            : step.key === order.status,
        ),
      );

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={`Quote ${order.quotationId}`}
        title={order.id}
      />
      <View style={styles.orderHero}>
        <View style={styles.orderHeroTop}>
          <View style={styles.orderHeroIcon}>
            <Icon color={colors.onNavy} name="clipboard-text-outline" size={26} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.orderHeroEyebrow}>SALES ORDER</Text>
            <Text numberOfLines={1} style={styles.orderHeroId}>
              {order.id}
            </Text>
          </View>
          <StatusPill status={order.status} />
        </View>

        <View style={styles.orderHeroBody}>
          <View style={styles.orderHeroCustomerRow}>
            <View style={styles.orderCustomerAvatar}>
              <Text style={styles.orderCustomerAvatarText}>
                {(order.customerName || '?').charAt(0)}
              </Text>
            </View>
            <View style={styles.flexText}>
              <Text numberOfLines={1} style={styles.orderHeroCustomer}>
                {order.customerName}
              </Text>
              <View style={styles.orderHeroMetaRow}>
                <Icon color={colors.textMuted} name="store-outline" size={14} />
                <Text numberOfLines={1} style={styles.orderHeroSupplier}>
                  {order.wholesaler}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.orderHeroAmountRow}>
            <Text style={styles.orderHeroAmountLabel}>ORDER VALUE</Text>
            <Text numberOfLines={1} style={styles.orderHeroAmount}>
              {formatCurrency(order.total)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quantityDashboard}>
        <QuantityBlock label="Ordered" tone="navy" value={order.quantity} />
        <QuantityBlock label="Picked" value={order.picked} />
        <QuantityBlock label="Dispatched" value={order.dispatched} />
        <QuantityBlock label="Delivered" value={order.delivered} />
      </View>

      <SurfaceCard>
        <View style={styles.sectionTitleRow}>
          <View style={styles.flexText}>
            <Text style={styles.cardEyebrow}>FULFILMENT</Text>
            <Text style={styles.cardHeading}>Progress by quantity</Text>
          </View>
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingText}>{remainingToDispatch} to dispatch</Text>
          </View>
        </View>
        <ProgressLabel label="Picking" total={order.quantity} value={order.picked} />
        <ProgressLabel label="Dispatch" total={order.quantity} value={order.dispatched} />
        <ProgressLabel label="Delivery" total={order.quantity} value={order.delivered} />
        {remainingToDeliver > 0 && order.delivered > 0 ? (
          <NoticeBanner
            message={`${order.delivered} delivered, ${remainingToDeliver} still open.`}
            title="Partial delivery in progress"
            tone="warning"
            style={styles.inlineNotice}
          />
        ) : null}
      </SurfaceCard>

      <SurfaceCard style={styles.cardSpacing}>
        <Text style={styles.cardEyebrow}>ORDER INFORMATION</Text>
        <Text style={styles.cardHeading}>Details</Text>
        <InfoRow label="Product" value={`${order.productName} (${order.productCode})`} />
        <InfoRow label="Quantity" value={`${order.quantity} ${order.unit}`} />
        <InfoRow label="Rate" value={formatCurrency(order.rate)} />
        <InfoRow label="Quotation" value={order.quotationId} />
        <InfoRow label="Order source" value="Accepted Quotation" />
        <InfoRow label="Expected delivery" value={order.expectedDelivery} />
        <InfoRow label="Delivery address" value={order.deliveryAddress} />
      </SurfaceCard>

      <SurfaceCard style={styles.workflowCard}>
        <Text style={styles.cardEyebrow}>ORDER STATUS</Text>
        <Text style={styles.cardHeading}>Current progress</Text>

        {isHold ? (
          <NoticeBanner
            icon="pause-circle-outline"
            message={`${order.holdRemarks || 'This order is currently on hold.'}${order.heldBy ? `\nBy ${order.heldBy}${order.heldAt ? ` · ${order.heldAt}` : ''}` : ''}`}
            title={`On HOLD · ${String(order.holdReason || '').replace(/_/g, ' ') || 'Pending review'}`}
            tone="warning"
            style={styles.inlineNotice}
          />
        ) : null}

        <View style={styles.statusTrack}>
          {ORDER_STEPS.map((step, index) => {
            const done = index < currentStep;
            const active = index === currentStep && !isHold;
            const isLast = index === ORDER_STEPS.length - 1;
            return (
              <View key={step.key} style={styles.statusStep}>
                <View style={styles.statusStepIconCol}>
                  <View
                    style={[
                      styles.statusStepDot,
                      (done || active) && styles.statusStepDotDone,
                      active && styles.statusStepDotActive,
                    ]}>
                    <Icon
                      color={done || active ? colors.onNavy : colors.textMuted}
                      name={done ? 'check' : step.icon}
                      size={15}
                    />
                  </View>
                  {!isLast ? (
                    <View
                      style={[
                        styles.statusStepLine,
                        done && styles.statusStepLineDone,
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.statusStepTextCol}>
                  <Text
                    style={[
                      styles.statusStepLabel,
                      (done || active) && styles.statusStepLabelDone,
                    ]}>
                    {step.label}
                  </Text>
                  {active ? (
                    <Text style={styles.statusStepCurrent}>Current stage</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.statusReadonlyNote}>
          <Icon color={colors.textMuted} name="information-outline" size={15} />
          <Text style={styles.statusReadonlyText}>
            Status is updated automatically as the order moves through
            fulfilment. This is a view-only summary.
          </Text>
        </View>
      </SurfaceCard>

      <SectionHeader
        actionLabel="View all"
        onAction={() => navigation.navigate('Dispatches', { orderId: order.id })}
        title={`Dispatches (${linkedDispatches.length})`}
      />
      {linkedDispatches.length ? (
        linkedDispatches.map(dispatch => (
          <RelationListCard
            accessibilityLabel={`Open dispatch ${dispatch.id}`}
            icon="truck-fast-outline"
            key={dispatch.id}
            meta={`${dispatch.quantity} ${order.unit} · ${dispatch.driverName}`}
            onPress={() => navigation.navigate('DispatchDetail', { id: dispatch.id })}
            status={dispatch.status}
            title={dispatch.id}
            tone="orange"
          />
        ))
      ) : (
        <EmptyState
          compact
          icon="truck-outline"
          message="No dispatch has been created for this order yet."
          title="No linked dispatches"
        />
      )}

      <SectionHeader title={`Invoices (${linkedInvoices.length})`} />
      {linkedInvoices.length ? (
        linkedInvoices.map(invoice => (
          <RelationListCard
            accessibilityLabel={`Open invoice ${invoice.id}`}
            icon="text-box-outline"
            key={invoice.id}
            meta={`${invoice.quantity} ${invoice.unit} · ${formatCurrency(invoice.total)}`}
            onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
            status={invoice.status}
            title={invoice.id}
            tone="navy"
          />
        ))
      ) : (
        <EmptyState
          compact
          icon="text-box-outline"
          message="The invoice will be generated against the actual dispatch quantity."
          title="No linked invoices"
        />
      )}
    </Screen>
  );
};

export const DispatchesScreen = ({ navigation, route }) => {
  const { dispatches, orders } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const requestedOrder = route.params?.orderId;
  const visible = dispatches.filter(dispatch => {
    const order = orders.find(item => item.id === dispatch.orderId);
    const query = search.toLowerCase();
    const matchesOrder = !requestedOrder || dispatch.orderId === requestedOrder;
    const matchesSearch =
      dispatch.id.toLowerCase().includes(query) ||
      dispatch.orderId.toLowerCase().includes(query) ||
      order?.customerName.toLowerCase().includes(query) ||
      order?.productName.toLowerCase().includes(query) ||
      dispatch.driverName.toLowerCase().includes(query);
    const matchesFilter = filter === 'ALL' || dispatch.status === filter;
    return matchesOrder && matchesSearch && matchesFilter;
  });

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={requestedOrder ? `For ${requestedOrder}` : 'Picking, transit and delivery'}
        title="Dispatch tracking"
      />
      <View style={styles.dispatchOverview}>
        <OverviewItem
          icon="package-variant-closed"
          label="Ready"
          value={dispatches.filter(item => item.status === 'READY_TO_DISPATCH').length}
        />
        <OverviewItem
          icon="truck-delivery-outline"
          label="In transit"
          value={dispatches.filter(item => item.status === 'DISPATCHED').length}
        />
        <OverviewItem
          icon="package-variant-closed"
          label="Delivered"
          value={dispatches.filter(item => item.status === 'DELIVERED').length}
        />
      </View>
      <SearchInput
        accessibilityLabel="Search dispatches"
        onChangeText={setSearch}
        placeholder="Search dispatch, order, customer or driver"
        value={search}
      />
      <View style={styles.filterArea}>
        <ChoiceChips
          onChange={setFilter}
          options={[
            { label: 'All', value: 'ALL' },
            { label: 'Ready', value: 'READY_TO_DISPATCH' },
            { label: 'Dispatched', value: 'DISPATCHED' },
            { label: 'Out for delivery', value: 'OUT_FOR_DELIVERY' },
            { label: 'Delivered', value: 'DELIVERED' },
          ]}
          value={filter}
        />
      </View>
      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.contextEyebrow}>SHIPMENT RECORDS</Text>
          <Text style={styles.resultsTitle}>
            {visible.length} {visible.length === 1 ? 'dispatch' : 'dispatches'}
          </Text>
        </View>
        {requestedOrder ? (
          <View style={styles.contextBadge}>
            <Text style={styles.contextBadgeText}>{requestedOrder}</Text>
          </View>
        ) : null}
      </View>
      {visible.length ? (
        visible.map(dispatch => {
          const order = orders.find(item => item.id === dispatch.orderId);
          const destination = order?.deliveryAddress?.split(',')[0];
          return (
            <SurfaceCard
              accessibilityHint="Opens dispatch details"
              accessibilityLabel={`${dispatch.id}, order ${dispatch.orderId}, ${dispatch.status}`}
              key={dispatch.id}
              onPress={() => navigation.navigate('DispatchDetail', { id: dispatch.id })}
              style={styles.dispatchCard}>
              <View style={styles.dispatchCardTop}>
                <View style={styles.dispatchIdWrap}>
                  <View style={styles.truckIcon}>
                    <Icon color={colors.primary} name="truck-fast-outline" size={23} />
                  </View>
                  <View style={styles.flexText}>
                    <Text style={styles.dispatchId}>{dispatch.id}</Text>
                    <Text style={styles.dispatchOrder}>{dispatch.orderId}</Text>
                  </View>
                </View>
                <StatusPill status={dispatch.status} />
              </View>
              <View style={styles.dispatchProduct}>
                <Text numberOfLines={2} style={styles.dispatchProductName}>
                  {order?.productName}
                </Text>
                <Text style={styles.dispatchQty}>
                  {dispatch.quantity} {order?.unit}
                </Text>
              </View>
              <View style={styles.dispatchRoute}>
                <View style={styles.routePoint}>
                  <Icon color={colors.navy} name="account-outline" size={16} />
                </View>
                <Text numberOfLines={1} style={styles.dispatchRouteText}>
                  {order?.customerName}
                </Text>
                <Icon color={colors.textMuted} name="arrow-right" size={16} />
                <View style={styles.routePointOrange}>
                  <Icon color={colors.primary} name="map-marker-outline" size={16} />
                </View>
                <Text numberOfLines={1} style={styles.dispatchRouteText}>
                  {destination}
                </Text>
              </View>
              <View style={styles.dispatchFooter}>
                <View style={styles.metaInline}>
                  <Icon color={colors.textMuted} name="account-tie-outline" size={16} />
                  <Text numberOfLines={1} style={styles.dispatchDriver}>
                    {dispatch.driverName}
                  </Text>
                </View>
                <View style={styles.metaInline}>
                  <Icon color={colors.textMuted} name="calendar-clock-outline" size={16} />
                  <Text style={styles.dispatchDate}>{dispatch.expectedDelivery}</Text>
                </View>
              </View>
            </SurfaceCard>
          );
        })
      ) : (
        <EmptyState
          actionLabel={search ? 'Clear search' : undefined}
          icon="truck-remove-outline"
          message="No dispatch records match the current order, search and status filters."
          onAction={search ? () => setSearch('') : undefined}
          title="No dispatches found"
        />
      )}
    </Screen>
  );
};

const DISPATCH_STEPS = [
  { key: 'READY_TO_DISPATCH', label: 'Ready', icon: 'package-variant-closed' },
  { key: 'DISPATCHED', label: 'Dispatched', icon: 'truck-fast-outline' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: 'map-marker-path' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'check-circle-outline' },
];

export const DispatchDetailScreen = ({ navigation, route }) => {
  const { dispatches, invoices, orders } = useApp();
  const dispatch = dispatches.find(item => item.id === route.params?.id);

  if (!dispatch) {
    return <MissingRecord navigation={navigation} title="Dispatch not found" />;
  }

  const order = orders.find(item => item.id === dispatch.orderId);
  const invoice = invoices.find(item => item.dispatchId === dispatch.id);
  const currentStep = Math.max(
    0,
    DISPATCH_STEPS.findIndex(step => step.key === dispatch.status),
  );
  const otpVerified = dispatch.deliveryOtpStatus === 'OTP_VERIFIED';
  const destination = order?.deliveryAddress?.split(',')[0];
  const hasValue = value => value && value !== '—';
  const callDriver = () => {
    if (hasValue(dispatch.driverMobile)) {
      Linking.openURL(`tel:${dispatch.driverMobile}`).catch(() => {});
    }
  };

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={`Sales order ${dispatch.orderId}`}
        title={dispatch.id}
      />

      {/* ── Hero: quantity + customer + route ── */}
      <View style={styles.dispatchDetailHero}>
        <View style={styles.dispatchHeroTop}>
          <View style={styles.bigTruckIcon}>
            <Icon color={colors.onNavy} name="truck-fast" size={28} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.dispatchHeroEyebrow}>DISPATCH</Text>
            <Text numberOfLines={1} style={styles.dispatchHeroId}>
              {dispatch.id}
            </Text>
          </View>
          <StatusPill status={dispatch.status} />
        </View>

        <View style={styles.dispatchHeroQtyRow}>
          <View style={styles.flexText}>
            <Text style={styles.dispatchHeroQtyLabel}>QUANTITY</Text>
            <Text style={styles.dispatchHeroQty}>
              {dispatch.quantity}{' '}
              <Text style={styles.dispatchHeroUnit}>{order?.unit}</Text>
            </Text>
          </View>
          <View style={styles.dispatchHeroProductWrap}>
            <Text style={styles.dispatchHeroQtyLabel}>PRODUCT</Text>
            <Text numberOfLines={2} style={styles.dispatchHeroProduct}>
              {order?.productName}
            </Text>
          </View>
        </View>

        <View style={styles.dispatchRouteHero}>
          <View style={styles.routeChip}>
            <Icon color={colors.navy} name="account-outline" size={14} />
            <Text numberOfLines={1} style={styles.routeChipText}>
              {order?.customerName}
            </Text>
          </View>
          <Icon color={colors.primary} name="arrow-right" size={16} />
          <View style={styles.routeChip}>
            <Icon color={colors.primary} name="map-marker-outline" size={14} />
            <Text numberOfLines={1} style={styles.routeChipText}>
              {destination || 'Destination'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Shipment progress steps ── */}
      <SurfaceCard>
        <Text style={styles.cardEyebrow}>SHIPMENT STATUS</Text>
        <Text style={styles.cardHeading}>Tracking</Text>
        <View style={styles.stepper}>
          {DISPATCH_STEPS.map((step, index) => {
            const done = index <= currentStep;
            const active = index === currentStep;
            return (
              <React.Fragment key={step.key}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      done && styles.stepDotDone,
                      active && styles.stepDotActive,
                    ]}>
                    <Icon
                      color={done ? colors.onNavy : colors.textMuted}
                      name={step.icon}
                      size={16}
                    />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[styles.stepLabel, done && styles.stepLabelDone]}>
                    {step.label}
                  </Text>
                </View>
                {index < DISPATCH_STEPS.length - 1 ? (
                  <View
                    style={[
                      styles.stepLine,
                      index < currentStep && styles.stepLineDone,
                    ]}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
      </SurfaceCard>

      {/* ── Driver & vehicle ── */}
      <SurfaceCard style={styles.cardSpacing}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.flexText}>
            <Text style={styles.cardEyebrow}>TRANSPORT</Text>
            <Text style={styles.cardHeading}>Driver & vehicle</Text>
          </View>
          {hasValue(dispatch.driverMobile) ? (
            <Pressable
              accessibilityLabel={`Call driver ${dispatch.driverName}`}
              accessibilityRole="button"
              onPress={callDriver}
              style={({ pressed }) => [
                styles.callButton,
                pressed && styles.pressablePressed,
              ]}>
              <Icon color={colors.onNavy} name="phone" size={16} />
              <Text style={styles.callButtonText}>Call</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.driverRow}>
          <View style={styles.driverAvatar}>
            <Icon color={colors.primary} name="account-tie-outline" size={22} />
          </View>
          <View style={styles.flexText}>
            <Text numberOfLines={1} style={styles.driverName}>
              {hasValue(dispatch.driverName)
                ? dispatch.driverName
                : 'Driver not assigned'}
            </Text>
            <Text style={styles.driverMobile}>
              {hasValue(dispatch.driverMobile)
                ? `+91 ${dispatch.driverMobile}`
                : 'Mobile pending'}
            </Text>
          </View>
        </View>
        <InfoRow icon="truck-outline" label="Vehicle" value={dispatch.vehicleNumber} />
        <InfoRow icon="domain" label="Transport" value={dispatch.transport} />
        <InfoRow icon="file-document-outline" label="LR number" value={dispatch.lrNumber} />
      </SurfaceCard>

      {/* ── Delivery timeline & OTP ── */}
      <SurfaceCard style={styles.cardSpacing}>
        <Text style={styles.cardEyebrow}>DELIVERY</Text>
        <Text style={styles.cardHeading}>Timeline & verification</Text>
        <TimelineRow icon="truck-check-outline" label="Dispatched" value={dispatch.dispatchDate} />
        <TimelineRow icon="calendar-clock-outline" label="Expected date" value={dispatch.expectedDelivery} />
        <TimelineRow icon="clock-outline" label="Expected time" value={dispatch.expectedDeliveryTime} />
        <TimelineRow icon="package-variant-closed" label="Delivered" value={dispatch.deliveredDate} />

        <View
          style={[styles.otpBadge, otpVerified ? styles.otpBadgeDone : styles.otpBadgePending]}>
          <Icon
            color={otpVerified ? colors.success : colors.warning}
            name={otpVerified ? 'shield-check' : 'shield-alert-outline'}
            size={20}
          />
          <View style={styles.flexText}>
            <Text
              style={[
                styles.otpBadgeTitle,
                { color: otpVerified ? colors.success : colors.warning },
              ]}>
              {otpVerified ? 'Delivery OTP verified' : 'Delivery OTP pending'}
            </Text>
            <Text style={styles.otpBadgeSub}>
              {dispatch.deliveryOtpPurpose.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      </SurfaceCard>

      <NoticeBanner
        icon="link-variant"
        message={
          invoice
            ? `${invoice.id} bills exactly ${invoice.quantity} ${invoice.unit} from this dispatch.`
            : 'The invoice will be generated only after dispatch confirmation.'
        }
        title="Dispatch-linked invoice"
        tone={invoice ? 'success' : 'info'}
        style={styles.noticeSpacing}
      />
      <View style={styles.linkedActions}>
        {invoice ? (
          <PrimaryButton
            icon="text-box-outline"
            onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
            style={styles.linkedAction}
            title={`View ${invoice.id}`}
          />
        ) : null}
        <PrimaryButton
          icon="clipboard-text-outline"
          onPress={() => navigation.navigate('OrderDetail', { id: dispatch.orderId })}
          style={styles.linkedAction}
          title={`Open ${dispatch.orderId}`}
          variant={invoice ? 'outline' : 'primary'}
        />
      </View>
    </Screen>
  );
};


export const FinanceScreen = ({ navigation }) => {
  const { collections, invoices, unreadCount } = useApp();
  const receivable = invoices.reduce((sum, item) => sum + item.balance, 0);
  const collected = collections.reduce((sum, item) => sum + item.amount, 0);
  const pendingCollections = collections.filter(
    item => item.status !== 'ACCOUNT_VERIFIED',
  );

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        subtitle="Invoices, collections & Accounts handover"
        title="Finance"
        unreadCount={unreadCount}
      />
      <View style={styles.financeHero}>
        <View style={styles.financeHeroTop}>
          <View style={styles.financeHeroIcon}>
            <Icon color={colors.primary} name="finance" size={24} />
          </View>
          <Text style={styles.heroEyebrow}>TOTAL RECEIVABLE BALANCE</Text>
        </View>
        <Text numberOfLines={1} style={styles.financeAmount}>
          {formatCurrency(receivable)}
        </Text>
        <Text style={styles.financeCaption}>
          Across {invoices.filter(item => item.balance > 0).length} unpaid / partial invoices
        </Text>
        <View style={styles.financeStats}>
          <FinanceStat label="Collected" value={formatCurrency(collected)} />
          <View style={styles.financeDivider} />
          <FinanceStat
            label="Pending handover"
            value={formatCurrency(
              pendingCollections.reduce((sum, item) => sum + item.amount, 0),
            )}
          />
        </View>
      </View>

      <SectionHeader title="Finance actions" />
      <View style={styles.financeActions}>
        <FinanceAction
          accessibilityLabel="Open invoices"
          icon="text-box-outline"
          onPress={() => navigation.navigate('Invoices')}
          subtitle="Paid, partial and balance due"
          title="Invoices"
          tone="orange"
        />
        <FinanceAction
          accessibilityLabel="Open collections"
          icon="account-cash-outline"
          onPress={() => navigation.navigate('Collections')}
          subtitle="Record and hand over to Accounts"
          title="Collections"
          tone="navy"
        />
      </View>

      <SectionHeader
        actionLabel="View all"
        onAction={() => navigation.navigate('Invoices')}
        title="Recent invoices"
      />
      {invoices.length ? (
        invoices.slice(0, 3).map(invoice => (
          <InvoiceListCard
            invoice={invoice}
            key={invoice.id}
            onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
          />
        ))
      ) : (
        <EmptyState
          compact
          icon="text-box-outline"
          message="Invoices linked to confirmed dispatches will appear here."
          title="No invoices yet"
        />
      )}

      <SectionHeader
        actionLabel="View all"
        onAction={() => navigation.navigate('Collections')}
        title="Recent collections"
      />
      {collections.length ? (
        collections.slice(0, 3).map(collection => {
          const isVerified = collection.status === 'ACCOUNT_VERIFIED';
          return (
            <SurfaceCard
              accessibilityLabel={`Open collection ${collection.id}, ${formatCurrency(collection.amount)}`}
              key={collection.id}
              onPress={() => navigation.navigate('CollectionDetail', { id: collection.id })}
              style={styles.paymentCard}>
              <View style={[styles.paymentCheck, !isVerified && styles.paymentCheckPending]}>
                <Icon
                  color={isVerified ? colors.success : colors.warning}
                  name={isVerified ? 'check-bold' : 'clock-outline'}
                  size={19}
                />
              </View>
              <View style={styles.paymentMain}>
                <Text style={[styles.paymentId, !isVerified && styles.paymentIdPending]}>
                  {collection.id}
                </Text>
                <Text numberOfLines={1} style={styles.paymentCustomer}>
                  {collection.customerName}
                </Text>
                <Text numberOfLines={2} style={styles.paymentMeta}>
                  {collection.mode} · {collection.status.replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={styles.paymentAmountWrap}>
                <Text numberOfLines={1} style={styles.paymentAmount}>
                  {formatCurrency(collection.amount)}
                </Text>
                <Icon color={colors.textMuted} name="chevron-right" size={19} />
              </View>
            </SurfaceCard>
          );
        })
      ) : (
        <EmptyState
          compact
          icon="account-cash-outline"
          message="Staff collections and Accounts handovers will appear here."
          title="No collections yet"
        />
      )}
    </Screen>
  );
};

export const InvoicesScreen = ({ navigation, route }) => {
  const { invoices } = useApp();
  const [filter, setFilter] = useState('ALL');
  const customerId = route.params?.customerId;
  const visible = invoices.filter(invoice => {
    const customerMatch = !customerId || invoice.customerId === customerId;
    const statusMatch = filter === 'ALL' || invoice.status === filter;
    return customerMatch && statusMatch;
  });

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle="Every invoice is linked to a dispatch"
        title="Invoices"
      />
      <View style={styles.invoiceContext}>
        <View style={styles.invoiceContextIcon}>
          <Icon color={colors.primary} name="text-box-check-outline" size={24} />
        </View>
        <View style={styles.flexText}>
          <Text style={styles.contextEyebrow}>DISPATCH-BACKED BILLING</Text>
          <Text style={styles.invoiceContextTitle}>
            {customerId ? `Customer ${customerId}` : 'All customer invoices'}
          </Text>
          <Text style={styles.invoiceContextCopy}>
            Amounts reflect the actual quantity recorded against each dispatch.
          </Text>
        </View>
      </View>
      <View style={styles.filterArea}>
        <ChoiceChips
          onChange={setFilter}
          options={[
            { label: 'All', value: 'ALL' },
            { label: 'Pending', value: 'PENDING' },
            { label: 'Partially paid', value: 'PARTIALLY_PAID' },
            { label: 'Paid', value: 'PAID' },
          ]}
          value={filter}
        />
      </View>
      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.contextEyebrow}>FILTERED RESULTS</Text>
          <Text style={styles.resultsTitle}>
            {visible.length} {visible.length === 1 ? 'invoice' : 'invoices'}
          </Text>
        </View>
        <View style={styles.contextBadge}>
          <Text style={styles.contextBadgeText}>{filter.replace(/_/g, ' ')}</Text>
        </View>
      </View>
      {visible.length ? (
        visible.map(invoice => (
          <InvoiceListCard
            invoice={invoice}
            key={invoice.id}
            onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
          />
        ))
      ) : (
        <EmptyState
          icon="text-box-remove-outline"
          message="There are no invoices for the selected customer and status."
          title="No invoices found"
        />
      )}
    </Screen>
  );
};

export const InvoiceDetailScreen = ({ navigation, route }) => {
  const { customers, invoices, payments, recordCollection } = useApp();
  const invoice = invoices.find(item => item.id === route.params?.id);
  const [mode, setMode] = useState('CASH');
  const [amount, setAmount] = useState(String(invoice?.balance || ''));
  const [reference, setReference] = useState('');
  const [payError, setPayError] = useState('');

  if (!invoice) {
    return <MissingRecord navigation={navigation} title="Invoice not found" />;
  }

  const customer = customers.find(item => item.id === invoice.customerId);
  const invoicePayments = payments.filter(item => item.invoiceId === invoice.id);
  const paidPercent = invoice.total
    ? Math.round((invoice.paidAmount / invoice.total) * 100)
    : 0;
  const rate = invoice.quantity
    ? Math.round(invoice.subtotal / invoice.quantity)
    : 0;
  const isPaid = invoice.balance <= 0;

  const handlePay = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setPayError('Enter a valid amount.');
      return;
    }
    if (value > invoice.balance) {
      setPayError('Amount cannot exceed the balance due.');
      return;
    }
    const result = recordCollection({
      invoiceId: invoice.id,
      amount: value,
      mode,
      reference,
    });
    if (!result.success) {
      setPayError(result.message);
      return;
    }
    setPayError('');
    setReference('');
    setAmount('');
    Alert.alert(
      'Payment recorded',
      `${formatCurrency(value)} collected for ${invoice.id} via ${mode}.`,
    );
  };

  return (
    <Screen
      keyboardAvoiding
      footer={
        !isPaid ? (
          <View style={styles.footerPayBar}>
            <View style={styles.footerPayInfo}>
              <Text style={styles.footerPayLabel}>AMOUNT DUE</Text>
              <Text numberOfLines={1} style={styles.footerPayValue}>
                {formatCurrency(invoice.balance)}
              </Text>
            </View>
            <PrimaryButton
              icon="cash-plus"
              onPress={handlePay}
              style={styles.footerPayButton}
              title={`Pay ${formatCurrency(Number(amount) || 0)}`}
            />
          </View>
        ) : null
      }>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={`Dispatch ${invoice.dispatchId}`}
        title={invoice.id}
      />
      {/* ── Invoice document ────────────────────────────── */}
      <SurfaceCard style={styles.invoiceDoc}>
        {/* Document header */}
        <View style={styles.docHeader}>
          <View style={styles.flexText}>
            <Text style={styles.docBrand}>TAX INVOICE</Text>
            <Text style={styles.docNumber}>{invoice.id}</Text>
          </View>
          <StatusPill status={invoice.status} />
        </View>

        {/* Meta row: dates + references */}
        <View style={styles.docMetaGrid}>
          {[
            ['Invoice No.', invoice.id],
            ['Due Date', invoice.dueDate],
            ['Order Ref.', invoice.orderId],
            ['Dispatch Ref.', invoice.dispatchId],
          ].map(([label, value]) => (
            <View key={label} style={styles.docMetaItem}>
              <Text style={styles.docMetaLabel}>{label}</Text>
              <Text numberOfLines={1} style={styles.docMetaValue}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* Bill To */}
        <View style={styles.billToBlock}>
          <Text style={styles.billToLabel}>BILL TO</Text>
          <Text style={styles.billToName}>{invoice.customerName}</Text>
          {customer ? (
            <>
              {customer.address ? (
                <Text style={styles.billToLine}>
                  {[customer.address, customer.city, customer.state, customer.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              ) : null}
              {customer.mobile ? (
                <Text style={styles.billToLine}>+91 {customer.mobile}</Text>
              ) : null}
              {customer.gst ? (
                <Text style={styles.billToLine}>GSTIN: {customer.gst}</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.billToLine}>Customer {invoice.customerId}</Text>
          )}
        </View>

        {/* Items table */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeadCell, styles.colItem]}>ITEM</Text>
          <Text style={[styles.tableHeadCell, styles.colQty]}>QTY</Text>
          <Text style={[styles.tableHeadCell, styles.colRate]}>RATE</Text>
          <Text style={[styles.tableHeadCell, styles.colAmount]}>AMOUNT</Text>
        </View>
        <View style={styles.tableBodyRow}>
          <View style={[styles.colItem, styles.itemCell]}>
            <Text numberOfLines={2} style={styles.itemName}>
              {invoice.productName}
            </Text>
            <Text style={styles.itemSub}>From {invoice.dispatchId}</Text>
          </View>
          <Text style={[styles.tableCell, styles.colQty]}>
            {invoice.quantity} {invoice.unit}
          </Text>
          <Text style={[styles.tableCell, styles.colRate]}>
            {formatCurrency(rate)}
          </Text>
          <Text style={[styles.tableCell, styles.colAmount, styles.itemAmount]}>
            {formatCurrency(invoice.subtotal)}
          </Text>
        </View>

        {/* Totals summary */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>GST</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.gstAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Delivery charges</Text>
            <Text style={styles.totalsValue}>
              {formatCurrency(invoice.deliveryCharge)}
            </Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Amount due highlight */}
        <View style={[styles.dueStrip, isPaid && styles.dueStripPaid]}>
          <View style={styles.flexText}>
            <Text style={[styles.dueStripLabel, isPaid && styles.dueStripLabelPaid]}>
              {isPaid ? 'AMOUNT PAID' : 'AMOUNT DUE'}
            </Text>
            <Text style={styles.dueStripSub}>
              Paid {formatCurrency(invoice.paidAmount)} of{' '}
              {formatCurrency(invoice.total)}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.dueStripValue, isPaid && styles.dueStripValuePaid]}>
            {formatCurrency(isPaid ? invoice.total : invoice.balance)}
          </Text>
        </View>
        <View style={styles.payProgressWrap}>
          <ProgressBar value={paidPercent} />
          <Text style={styles.payProgressText}>{paidPercent}% paid</Text>
        </View>
      </SurfaceCard>

      {!isPaid ? (
        <SurfaceCard style={styles.payCard}>
          <View style={styles.payHeader}>
            <View style={styles.payHeaderIcon}>
              <Icon color={colors.primary} name="account-cash-outline" size={22} />
            </View>
            <View style={styles.flexText}>
              <Text style={styles.cardEyebrow}>RECORD PAYMENT</Text>
              <Text style={styles.cardHeading}>Pay this invoice</Text>
            </View>
          </View>

          {/* Payment mode as a segmented selector */}
          <Text style={styles.payFieldLabel}>Payment mode</Text>
          <View style={styles.modeRow}>
            {[
              ['CASH', 'cash'],
              ['UPI', 'cellphone'],
              ['BANK TRANSFER', 'bank-outline'],
              ['CHEQUE', 'checkbook'],
            ].map(([value, icon]) => {
              const active = mode === value;
              return (
                <Pressable
                  accessibilityLabel={`Pay by ${value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={value}
                  onPress={() => setMode(value)}
                  style={({ pressed }) => [
                    styles.modeChip,
                    active && styles.modeChipActive,
                    pressed && styles.pressablePressed,
                  ]}>
                  <Icon
                    color={active ? colors.onNavy : colors.navy}
                    name={icon}
                    size={18}
                  />
                  <Text
                    style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                    {value === 'BANK TRANSFER' ? 'BANK' : value}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Amount field with quick-fill chips */}
          <View style={styles.payAmountHeader}>
            <Text style={styles.payFieldLabel}>Amount collected</Text>
            <View style={styles.payQuickRow}>
              <Pressable
                accessibilityLabel="Set amount to half balance"
                accessibilityRole="button"
                onPress={() => {
                  setAmount(String(Math.round(invoice.balance / 2)));
                  setPayError('');
                }}
                style={({ pressed }) => [
                  styles.payQuickChip,
                  pressed && styles.pressablePressed,
                ]}>
                <Text style={styles.payQuickChipText}>Half</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Set amount to full balance"
                accessibilityRole="button"
                onPress={() => {
                  setAmount(String(invoice.balance));
                  setPayError('');
                }}
                style={({ pressed }) => [
                  styles.payQuickChip,
                  styles.payQuickChipPrimary,
                  pressed && styles.pressablePressed,
                ]}>
                <Text
                  style={[styles.payQuickChipText, styles.payQuickChipTextPrimary]}>
                  Full ({formatCurrency(invoice.balance)})
                </Text>
              </Pressable>
            </View>
          </View>
          <TextField
            error={payError}
            keyboardType="number-pad"
            onChangeText={value => {
              setAmount(value.replace(/\D/g, ''));
              setPayError('');
            }}
            placeholder="0"
            prefix="₹"
            returnKeyType="done"
            value={amount}
          />
          <TextField
            label="Transaction / receipt reference"
            onChangeText={setReference}
            placeholder="UPI, bank, cheque or cash receipt reference"
            returnKeyType="done"
            value={reference}
          />

          {/* Live summary of what will be recorded */}
          <View style={styles.paySummary}>
            <View style={styles.paySummaryRow}>
              <Text style={styles.paySummaryLabel}>Paying now</Text>
              <Text style={styles.paySummaryValue}>
                {formatCurrency(Number(amount) || 0)}
              </Text>
            </View>
            <View style={styles.paySummaryRow}>
              <Text style={styles.paySummaryLabel}>Balance after</Text>
              <Text style={styles.paySummaryValue}>
                {formatCurrency(
                  Math.max(0, invoice.balance - (Number(amount) || 0)),
                )}
              </Text>
            </View>
          </View>

          <View style={styles.payNote}>
            <Icon color={colors.textMuted} name="information-outline" size={15} />
            <Text style={styles.payNoteText}>
              Recording here creates a Staff collection. Handover to Accounts is
              still required for verification.
            </Text>
          </View>
        </SurfaceCard>
      ) : (
        <NoticeBanner
          icon="check-decagram-outline"
          message="This invoice is fully paid. No balance is due."
          title="Paid in full"
          tone="success"
          style={styles.noticeSpacing}
        />
      )}

      <SectionHeader title={`Payments (${invoicePayments.length})`} />
      {invoicePayments.length ? (
        invoicePayments.map(payment => {
          const isVerified = payment.status === 'VERIFIED';
          return (
            <View key={payment.id} style={[styles.paidCard, !isVerified && styles.paidCardPending]}>
              <View style={[styles.paidIcon, !isVerified && styles.paidIconPending]}>
                <Icon
                  color={isVerified ? colors.success : colors.warning}
                  name={isVerified ? 'check-decagram' : 'clock-outline'}
                  size={24}
                />
              </View>
              <View style={styles.paidText}>
                <Text numberOfLines={2} style={[styles.paidTitle, !isVerified && styles.paidTitlePending]}>
                  {payment.id} · {payment.status.replace(/_/g, ' ')}
                </Text>
                <Text numberOfLines={2} style={styles.paidMessage}>
                  {payment.mode} · {payment.date} · {payment.createdBy}
                </Text>
              </View>
              <Text numberOfLines={1} style={[styles.paidAmount, !isVerified && styles.paidAmountPending]}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
          );
        })
      ) : (
        <EmptyState
          compact
          icon="cash-multiple"
          message="Verified payment entries linked to this invoice will appear here."
          title="No payments recorded"
        />
      )}
      <PrimaryButton
        icon="truck-fast-outline"
        onPress={() => navigation.navigate('DispatchDetail', { id: invoice.dispatchId })}
        style={styles.linkedDispatchButton}
        title="View linked dispatch"
        variant="outline"
      />
    </Screen>
  );
};

const InvoiceListCard = ({ invoice, onPress }) => (
  <SurfaceCard
    accessibilityHint="Opens invoice details"
    accessibilityLabel={`${invoice.id}, ${invoice.customerName}, ${formatCurrency(invoice.total)}, ${invoice.status}`}
    onPress={onPress}
    style={styles.invoiceCard}>
    <View style={styles.invoiceCardIcon}>
      <Icon color={colors.navy} name="text-box-outline" size={23} />
    </View>
    <View style={styles.invoiceCardMain}>
      <View style={styles.invoiceCardTop}>
        <Text numberOfLines={1} style={styles.invoiceId}>{invoice.id}</Text>
        <StatusPill status={invoice.status} />
      </View>
      <Text numberOfLines={1} style={styles.invoiceCardCustomer}>{invoice.customerName}</Text>
      <Text numberOfLines={2} style={styles.invoiceCardMeta}>
        {invoice.quantity} {invoice.unit} · {invoice.dispatchId} · Due {invoice.dueDate}
      </Text>
      <View style={styles.invoiceAmountsRow}>
        <Text numberOfLines={1} style={styles.invoiceCardAmount}>{formatCurrency(invoice.total)}</Text>
        <Text numberOfLines={1} style={[styles.invoiceCardBalance, !invoice.balance && styles.invoiceCardPaid]}>
          {invoice.balance ? `${formatCurrency(invoice.balance)} due` : 'Paid in full'}
        </Text>
      </View>
    </View>
    <Icon color={colors.textMuted} name="chevron-right" size={20} />
  </SurfaceCard>
);

const RelationListCard = ({
  accessibilityLabel,
  icon,
  meta,
  onPress,
  status,
  title,
  tone,
}) => (
  <SurfaceCard
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    style={styles.linkCard}>
    <View style={tone === 'navy' ? styles.linkIconNavy : styles.linkIcon}>
      <Icon color={tone === 'navy' ? colors.navy : colors.primary} name={icon} size={22} />
    </View>
    <View style={styles.linkText}>
      <Text numberOfLines={1} style={styles.linkId}>{title}</Text>
      <Text numberOfLines={2} style={styles.linkMeta}>{meta}</Text>
    </View>
    <View style={styles.linkStatus}>
      <StatusPill status={status} />
      <Icon color={colors.textMuted} name="chevron-right" size={18} />
    </View>
  </SurfaceCard>
);

const QuantityMini = ({ label, value }) => (
  <View style={styles.quantityMini}>
    <Text style={styles.quantityMiniValue}>{value}</Text>
    <Text style={styles.quantityMiniLabel}>{label}</Text>
  </View>
);

const QuantityBlock = ({ label, value, tone }) => (
  <View style={[styles.quantityBlock, tone === 'navy' && styles.quantityBlockNavy]}>
    <Text style={[styles.quantityBlockValue, tone === 'navy' && styles.quantityBlockTextLight]}>{value}</Text>
    <Text style={[styles.quantityBlockLabel, tone === 'navy' && styles.quantityBlockTextMuted]}>{label}</Text>
  </View>
);

const ProgressLabel = ({ label, total, value }) => {
  const percentage = Math.round(Number((value / total) * 100) || 0);
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{value} / {total} · {percentage}%</Text>
      </View>
      <ProgressBar value={(value / total) * 100} />
    </View>
  );
};

const OverviewItem = ({ icon, label, value }) => (
  <View style={styles.overviewItem}>
    <View style={styles.overviewIcon}>
      <Icon color={colors.primary} name={icon} size={20} />
    </View>
    <Text style={styles.overviewValue}>{value}</Text>
    <Text style={styles.overviewLabel}>{label}</Text>
  </View>
);

const FinanceStat = ({ label, value }) => (
  <View style={styles.financeStat}>
    <Text numberOfLines={1} style={styles.financeStatValue}>{value}</Text>
    <Text style={styles.financeStatLabel}>{label}</Text>
  </View>
);

const FinanceAction = ({ accessibilityLabel, icon, onPress, subtitle, title, tone }) => (
  <Pressable
    accessibilityHint={`Opens ${title}`}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.financeTile, pressed && styles.pressablePressed]}>
    <View style={tone === 'navy' ? styles.financeTileIconNavy : styles.financeTileIcon}>
      <Icon color={tone === 'navy' ? colors.navy : colors.primary} name={icon} size={27} />
    </View>
    <Text style={styles.financeTileTitle}>{title}</Text>
    <Text style={styles.financeTileText}>{subtitle}</Text>
    <View style={styles.financeTileArrow}>
      <Icon color={colors.primary} name="arrow-right" size={18} />
    </View>
  </Pressable>
);

const TimelineRow = ({ icon, label, value }) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineMarker}>
      <Icon color={colors.primary} name={icon} size={17} />
    </View>
    <View style={styles.timelineText}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineValue}>{value || 'Not recorded'}</Text>
    </View>
  </View>
);

const MissingRecord = ({ navigation, title }) => (
  <Screen>
    <AppHeader navigation={navigation} showBack showNotifications={false} title={title} />
    <EmptyState icon="alert-circle-outline" message="This static record is no longer available." title={title} />
  </Screen>
);

const styles = StyleSheet.create({
  flexText: { flex: 1, minWidth: 0 },
  pressablePressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  searchSection: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
  contextEyebrow: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.8,
  },
  contextTitle: {
    color: colors.navy,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    marginTop: spacing.xs,
  },
  contextCopy: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    lineHeight: typography.lineHeights.body,
    marginTop: spacing.xs,
  },
  filterArea: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  orderStatStrip: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  orderStatMain: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  orderStatLabel: {
    color: colors.onNavyMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.5,
  },
  orderStatValue: {
    color: colors.onNavy,
    flexShrink: 1,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    marginTop: spacing.xs,
  },
  orderStatDivider: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: spacing.md,
    width: 1,
  },
  orderStatCounts: { flexDirection: 'row', gap: spacing.md },
  orderStatCount: { alignItems: 'center', minWidth: 40 },
  orderStatCountNum: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  orderStatCountLabel: {
    color: colors.onNavyMuted,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  dispatchShortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    minHeight: controlSizes.touchTarget,
    padding: spacing.md,
  },
  shortcutIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  dispatchShortcutText: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
  },
  dispatchShortcutSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    marginTop: 2,
  },
  orderCard: { marginBottom: spacing.md, padding: spacing.lg },
  orderCardTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  orderCardAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  orderCardAvatarText: {
    color: colors.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  orderId: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  orderCustomer: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extraBold,
  },
  orderCardFooter: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  orderCardFooterText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.bold,
  },
  productLine: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  productIcon: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  productText: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  productName: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  productMeta: { color: colors.textMuted, fontSize: typography.sizes.caption, marginTop: 3 },
  orderTotal: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    maxWidth: '34%',
  },
  quantityRow: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  quantityMini: { flex: 1, paddingHorizontal: spacing.xs },
  quantityMiniValue: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  quantityMiniLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
    textAlign: 'center',
  },
  progressMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  progressMetaLabel: { color: colors.textMuted, fontSize: typography.sizes.footnote },
  progressMetaValue: {
    color: colors.navy,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
  },
  orderHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  orderHeroTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  orderHeroIcon: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  orderHeroEyebrow: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
  },
  orderHeroId: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    marginTop: 1,
  },
  orderHeroBody: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  orderHeroCustomerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  orderCustomerAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  orderCustomerAvatarText: {
    color: colors.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  orderHeroCustomer: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  orderHeroMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 3 },
  orderHeroSupplier: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.bold,
  },
  orderHeroAmountRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  orderHeroAmountLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.4,
  },
  orderHeroAmount: {
    color: colors.primary,
    flexShrink: 1,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    marginLeft: spacing.sm,
  },
  heroEyebrow: {
    color: colors.onNavyMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 1,
  },
  noticeSpacing: { marginTop: spacing.lg },
  quantityDashboard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    ...shadow,
  },
  quantityBlock: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    flex: 1,
    marginHorizontal: 3,
    minWidth: 0,
    paddingVertical: spacing.md,
  },
  quantityBlockNavy: { backgroundColor: colors.navy },
  quantityBlockValue: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  quantityBlockLabel: { color: colors.textMuted, fontSize: typography.sizes.caption, marginTop: spacing.xs },
  quantityBlockTextLight: { color: colors.onNavy },
  quantityBlockTextMuted: { color: colors.onNavyMuted },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  cardEyebrow: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  cardHeading: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    marginBottom: spacing.sm,
  },
  remainingBadge: { backgroundColor: colors.warningSoft, borderRadius: radius.round, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  remainingText: { color: colors.warning, fontSize: typography.sizes.caption, fontWeight: typography.weights.extraBold },
  progressSection: { marginTop: spacing.md },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { color: colors.text, fontSize: typography.sizes.label, fontWeight: typography.weights.bold },
  progressValue: { color: colors.navy, fontSize: typography.sizes.footnote, fontWeight: typography.weights.black },
  inlineNotice: { marginHorizontal: 0, marginTop: spacing.lg },
  cardSpacing: { marginTop: spacing.lg },
  workflowCard: { marginTop: spacing.lg },
  statusTrack: { marginTop: spacing.lg },
  statusStep: { flexDirection: 'row' },
  statusStepIconCol: { alignItems: 'center', width: 32 },
  statusStepDot: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  statusStepDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusStepDotActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  statusStepLine: {
    backgroundColor: colors.border,
    flex: 1,
    minHeight: 22,
    width: 2,
  },
  statusStepLineDone: { backgroundColor: colors.primary },
  statusStepTextCol: {
    flex: 1,
    marginLeft: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: 6,
  },
  statusStepLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  statusStepLabelDone: { color: colors.navy, fontWeight: typography.weights.black },
  statusStepCurrent: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
    marginTop: 2,
  },
  statusReadonlyNote: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusReadonlyText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.sizes.footnote,
    lineHeight: 18,
  },
  linkCard: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md, padding: spacing.md },
  linkIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  linkIconNavy: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  linkText: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  linkId: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.black },
  linkMeta: { color: colors.textMuted, flexShrink: 1, fontSize: typography.sizes.caption, lineHeight: 16, marginTop: 3 },
  linkStatus: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  dispatchOverview: { flexDirection: 'row', margin: spacing.lg },
  overviewItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: spacing.md,
    ...shadow,
  },
  overviewIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 36, justifyContent: 'center', width: 36 },
  overviewValue: { color: colors.navy, fontSize: typography.sizes.title, fontWeight: typography.weights.black, marginTop: spacing.xs },
  overviewLabel: { color: colors.textMuted, fontSize: typography.sizes.caption, marginTop: 2 },
  resultsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  resultsTitle: { color: colors.navy, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.black, marginTop: 2 },
  contextBadge: { backgroundColor: colors.navySoft, borderRadius: radius.round, maxWidth: '48%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contextBadgeText: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.caption, fontWeight: typography.weights.extraBold },
  dispatchCard: { marginBottom: spacing.md, padding: spacing.lg },
  dispatchCardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  dispatchIdWrap: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  truckIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: 'center', marginRight: spacing.md, width: 44 },
  dispatchId: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.body, fontWeight: typography.weights.black },
  dispatchOrder: { color: colors.primary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, marginTop: 2 },
  dispatchProduct: { alignItems: 'flex-start', borderTopColor: colors.divider, borderTopWidth: 1, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md },
  dispatchProductName: { color: colors.text, flex: 1, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.bold },
  dispatchQty: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.black },
  dispatchRoute: { alignItems: 'center', backgroundColor: colors.surfaceSubtle, borderRadius: radius.md, flexDirection: 'row', marginTop: spacing.md, padding: spacing.sm },
  routePoint: { alignItems: 'center', backgroundColor: colors.navySoft, borderRadius: radius.round, height: 28, justifyContent: 'center', width: 28 },
  routePointOrange: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 28, justifyContent: 'center', width: 28 },
  dispatchRouteText: { color: colors.textMuted, flex: 1, flexShrink: 1, fontSize: typography.sizes.caption, marginHorizontal: spacing.xs },
  dispatchFooter: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', marginTop: spacing.md },
  metaInline: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  dispatchDriver: { color: colors.text, flex: 1, flexShrink: 1, fontSize: typography.sizes.footnote, fontWeight: typography.weights.bold, marginLeft: spacing.xs },
  dispatchDate: { color: colors.textMuted, flexShrink: 1, fontSize: typography.sizes.caption, marginLeft: spacing.xs },
  dispatchDetailHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  dispatchHeroTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  bigTruckIcon: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  dispatchHeroEyebrow: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
  },
  dispatchHeroId: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    marginTop: 1,
  },
  dispatchHeroQtyRow: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  dispatchHeroQtyLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.4,
  },
  dispatchHeroQty: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: typography.weights.black,
    marginTop: 2,
  },
  dispatchHeroUnit: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.extraBold,
  },
  dispatchHeroProductWrap: {
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    flex: 1,
    minWidth: 0,
    paddingLeft: spacing.md,
  },
  dispatchHeroProduct: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
    lineHeight: 18,
    marginTop: 2,
  },
  dispatchRouteHero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  routeChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.round,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    minWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  routeChipText: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
  },
  // Stepper
  stepper: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  stepItem: { alignItems: 'center', width: 62 },
  stepDot: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotActive: {
    borderColor: colors.navy,
    borderWidth: 3,
  },
  stepLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  stepLabelDone: { color: colors.navy, fontWeight: typography.weights.black },
  stepLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 2,
    marginTop: 17,
  },
  stepLineDone: { backgroundColor: colors.primary },
  // Driver
  callButton: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  callButtonText: {
    color: colors.onNavy,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
  },
  driverRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  driverAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  driverName: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  driverMobile: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    marginTop: 2,
  },
  // OTP badge
  otpBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  otpBadgeDone: { backgroundColor: colors.successSoft },
  otpBadgePending: { backgroundColor: colors.warningSoft },
  otpBadgeTitle: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
  },
  otpBadgeSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    marginTop: 2,
  },
  timelineRow: { alignItems: 'center', flexDirection: 'row', minHeight: 54 },
  timelineMarker: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 34, justifyContent: 'center', marginRight: spacing.md, width: 34 },
  timelineText: { borderBottomColor: colors.divider, borderBottomWidth: 1, flex: 1, paddingVertical: spacing.sm },
  timelineLabel: { color: colors.textMuted, fontSize: typography.sizes.caption },
  timelineValue: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.bold, marginTop: 2 },
  linkedActions: { marginHorizontal: spacing.lg, marginTop: spacing.xs },
  linkedAction: { marginTop: spacing.md },
  deliveryOtpScreen: { flexGrow: 1 },
  deliveryOtpBody: { padding: spacing.xl },
  otpHeroRow: { alignItems: 'center', flexDirection: 'row' },
  deliveryOtpIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 62, justifyContent: 'center', width: 62 },
  otpHeroText: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  deliveryOtpEyebrow: { color: colors.primary, fontSize: typography.sizes.caption, fontWeight: typography.weights.black, letterSpacing: 0.7 },
  deliveryOtpTitle: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.title, fontWeight: typography.weights.black, marginTop: 2 },
  deliveryOtpSubtitle: { color: colors.textMuted, fontSize: typography.sizes.label, lineHeight: typography.lineHeights.body, marginTop: spacing.lg },
  otpDispatchCard: { backgroundColor: colors.navy, borderRadius: radius.lg, flexDirection: 'row', marginTop: spacing.lg, padding: spacing.lg },
  otpDispatchMeta: { flex: 1, minWidth: 0 },
  otpDispatchDivider: { backgroundColor: colors.navyLight, marginHorizontal: spacing.lg, width: 1 },
  otpDispatchLabel: { color: colors.onNavyMuted, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  otpDispatchValue: { color: colors.onNavy, flexShrink: 1, fontSize: typography.sizes.body, fontWeight: typography.weights.black, marginTop: spacing.xs },
  otpNotice: { marginHorizontal: 0, marginTop: spacing.lg },
  otpInputLabel: { color: colors.navy, fontSize: typography.sizes.label, fontWeight: typography.weights.extraBold, marginTop: spacing.xl },
  deliveryOtpBoxes: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md, width: '100%' },
  deliveryOtpBox: { alignItems: 'center', aspectRatio: 0.82, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: 'center', maxWidth: 48, minHeight: 52, minWidth: 34 },
  deliveryOtpBoxActive: { borderColor: colors.primary, borderWidth: 2 },
  deliveryOtpBoxError: { borderColor: colors.danger },
  deliveryOtpDigit: { color: colors.navy, fontSize: typography.sizes.title, fontWeight: typography.weights.black },
  deliveryOtpInput: { height: 1, opacity: 0, position: 'absolute', width: 1 },
  otpErrorWrap: { alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: radius.md, flexDirection: 'row', marginTop: spacing.md, padding: spacing.md },
  deliveryOtpError: { color: colors.danger, flex: 1, flexShrink: 1, fontSize: typography.sizes.footnote, marginLeft: spacing.sm },
  deliveryOtpNote: { alignItems: 'center', backgroundColor: colors.infoSoft, borderRadius: radius.md, flexDirection: 'row', marginTop: spacing.lg, padding: spacing.md },
  deliveryOtpNoteText: { color: colors.info, flex: 1, flexShrink: 1, fontSize: typography.sizes.footnote, fontWeight: typography.weights.bold, marginLeft: spacing.sm },
  financeHero: { backgroundColor: colors.navy, borderRadius: radius.xl, margin: spacing.lg, overflow: 'hidden', padding: spacing.xl, ...shadow },
  financeHeroTop: { alignItems: 'center', flexDirection: 'row' },
  financeHeroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,75,10,0.16)', borderRadius: radius.sm, height: 38, justifyContent: 'center', marginRight: spacing.md, width: 38 },
  financeAmount: { color: colors.onNavy, flexShrink: 1, fontSize: 34, fontWeight: typography.weights.black, marginTop: spacing.lg },
  financeCaption: { color: colors.onNavyMuted, fontSize: typography.sizes.footnote, marginTop: spacing.xs },
  financeStats: { borderTopColor: colors.navyLight, borderTopWidth: 1, flexDirection: 'row', marginTop: spacing.xl, paddingTop: spacing.lg },
  financeStat: { flex: 1, minWidth: 0 },
  financeStatValue: { color: colors.primary, flexShrink: 1, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.black },
  financeStatLabel: { color: colors.onNavyMuted, fontSize: typography.sizes.caption, marginTop: 3 },
  financeDivider: { backgroundColor: colors.navyLight, marginHorizontal: spacing.lg, width: 1 },
  financeActions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  financeTile: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, minHeight: 180, padding: spacing.lg, ...shadow },
  financeTileIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  financeTileIconNavy: { alignItems: 'center', backgroundColor: colors.navySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  financeTileTitle: { color: colors.navy, fontSize: typography.sizes.body, fontWeight: typography.weights.black, marginTop: spacing.md },
  financeTileText: { color: colors.textMuted, flex: 1, fontSize: typography.sizes.footnote, lineHeight: 18, marginTop: spacing.xs },
  financeTileArrow: { alignItems: 'center', alignSelf: 'flex-end', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 32, justifyContent: 'center', marginTop: spacing.sm, width: 32 },
  invoiceCard: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md, padding: spacing.md },
  invoiceCardIcon: { alignItems: 'center', backgroundColor: colors.navySoft, borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  invoiceCardMain: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  invoiceCardTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  invoiceId: { color: colors.navy, flex: 1, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.black },
  invoiceCardCustomer: { color: colors.text, flexShrink: 1, fontSize: typography.sizes.footnote, fontWeight: typography.weights.bold, marginTop: spacing.xs },
  invoiceCardMeta: { color: colors.textMuted, flexShrink: 1, fontSize: typography.sizes.caption, lineHeight: 16, marginTop: 3 },
  invoiceAmountsRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', marginTop: spacing.sm },
  invoiceCardAmount: { color: colors.primary, flexShrink: 1, fontSize: typography.sizes.body, fontWeight: typography.weights.black },
  invoiceCardBalance: { color: colors.danger, flexShrink: 1, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  invoiceCardPaid: { color: colors.success },
  paymentCard: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md, padding: spacing.md },
  paymentCheck: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.round, height: 40, justifyContent: 'center', width: 40 },
  paymentCheckPending: { backgroundColor: colors.warningSoft },
  paymentMain: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  paymentId: { color: colors.success, fontSize: typography.sizes.footnote, fontWeight: typography.weights.black },
  paymentIdPending: { color: colors.warning },
  paymentCustomer: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.bold, marginTop: 2 },
  paymentMeta: { color: colors.textMuted, flexShrink: 1, fontSize: typography.sizes.caption, lineHeight: 16, marginTop: 2 },
  paymentAmountWrap: { alignItems: 'center', flexDirection: 'row', marginLeft: spacing.sm },
  paymentAmount: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.black, maxWidth: 110 },
  invoiceContext: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', margin: spacing.lg, padding: spacing.lg, ...shadow },
  invoiceContextIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', marginRight: spacing.md, width: 48 },
  invoiceContextTitle: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.black, marginTop: 2 },
  invoiceContextCopy: { color: colors.textMuted, flexShrink: 1, fontSize: typography.sizes.footnote, lineHeight: 18, marginTop: spacing.xs },
  invoiceHero: { backgroundColor: colors.navy, marginBottom: spacing.xl, padding: spacing.xl },
  invoiceHeroTop: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  invoiceHeroAmount: { color: colors.primary, flexShrink: 1, fontSize: 32, fontWeight: typography.weights.black, marginTop: spacing.sm },
  invoiceHeroMeta: { alignItems: 'flex-end', borderTopColor: colors.navyLight, borderTopWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, paddingTop: spacing.lg },
  invoiceCustomer: { color: colors.onNavy, flexShrink: 1, fontSize: typography.sizes.body, fontWeight: typography.weights.extraBold },
  invoiceDue: { color: colors.onNavyMuted, fontSize: typography.sizes.footnote, marginTop: spacing.xs },
  invoiceBalanceHero: { alignItems: 'flex-end', maxWidth: '44%' },
  invoiceBalanceLabel: { color: colors.onNavyMuted, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  invoiceBalanceValue: { color: colors.onNavy, flexShrink: 1, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.black, marginTop: 2 },
  invoiceItem: { alignItems: 'center', borderBottomColor: colors.divider, borderBottomWidth: 1, flexDirection: 'row', marginBottom: spacing.sm, paddingBottom: spacing.md, paddingTop: spacing.sm },
  invoiceItemIcon: { alignItems: 'center', backgroundColor: colors.navySoft, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  invoiceItemMain: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  invoiceProduct: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.extraBold },
  invoiceQty: { color: colors.textMuted, fontSize: typography.sizes.caption, marginTop: 3 },
  invoiceSubtotal: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.black, maxWidth: '32%' },
  financialDivider: { backgroundColor: colors.divider, height: 1, marginVertical: spacing.sm },
  paidCard: { alignItems: 'center', backgroundColor: colors.successSoft, borderColor: 'rgba(22,135,93,0.16)', borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.md, marginHorizontal: spacing.lg, padding: spacing.md },
  paidCardPending: { backgroundColor: colors.warningSoft, borderColor: 'rgba(198,123,8,0.18)' },
  paidIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
  paidIconPending: { backgroundColor: colors.surface },
  paidText: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  paidTitle: { color: colors.success, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.black },
  paidTitlePending: { color: colors.warning },
  paidMessage: { color: colors.textMuted, flexShrink: 1, fontSize: typography.sizes.caption, lineHeight: 16, marginTop: 3 },
  paidAmount: { color: colors.success, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.black, maxWidth: '32%' },
  paidAmountPending: { color: colors.warning },
  linkedDispatchButton: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  payCard: { marginTop: spacing.lg },
  payHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md },
  payHeaderIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  payFieldLabel: {
    color: colors.text,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  modeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  modeChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    paddingVertical: spacing.sm,
  },
  modeChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  modeChipText: {
    color: colors.navy,
    fontSize: 10,
    fontWeight: typography.weights.black,
    letterSpacing: 0.2,
  },
  modeChipTextActive: { color: colors.onNavy },
  payAmountHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payQuickRow: { flexDirection: 'row', gap: spacing.sm },
  payQuickChip: {
    backgroundColor: colors.navySoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  payQuickChipPrimary: { backgroundColor: colors.primarySoft },
  payQuickChipText: {
    color: colors.navy,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
  },
  payQuickChipTextPrimary: { color: colors.primary },
  paySummary: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  paySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  paySummaryLabel: { color: colors.textMuted, fontSize: typography.sizes.label },
  paySummaryValue: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
  },
  payNote: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  payNoteText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.sizes.footnote,
    lineHeight: 18,
  },
  footerPayBar: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  footerPayInfo: { minWidth: 0 },
  footerPayLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.4,
  },
  footerPayValue: {
    color: colors.danger,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  footerPayButton: { flex: 1 },

  // ── Invoice document ──────────────────────────────
  invoiceDoc: { paddingBottom: spacing.lg },
  docHeader: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  docBrand: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 1,
  },
  docNumber: {
    color: colors.navy,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    marginTop: 2,
  },
  docMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  docMetaItem: { paddingVertical: spacing.xs, width: '50%' },
  docMetaLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  docMetaValue: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.extraBold,
    marginTop: 2,
  },
  billToBlock: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  billToLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.5,
  },
  billToName: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    marginTop: spacing.xs,
  },
  billToLine: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    lineHeight: 19,
    marginTop: 2,
  },
  tableHeaderRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tableHeadCell: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.3,
  },
  tableBodyRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  tableCell: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  colItem: { flex: 1, paddingRight: spacing.sm },
  colQty: { textAlign: 'center', width: 64 },
  colRate: { textAlign: 'right', width: 72 },
  colAmount: { textAlign: 'right', width: 84 },
  itemCell: { justifyContent: 'center' },
  itemName: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.extraBold,
  },
  itemSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    marginTop: 2,
  },
  itemAmount: { fontWeight: typography.weights.black },
  totalsBlock: { marginTop: spacing.md },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalsLabel: { color: colors.textMuted, fontSize: typography.sizes.label },
  totalsValue: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  grandTotalRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  grandTotalLabel: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  grandTotalValue: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  dueStrip: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  dueStripPaid: { backgroundColor: colors.successSoft },
  dueStripLabel: {
    color: colors.danger,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.5,
  },
  dueStripLabelPaid: { color: colors.success },
  dueStripSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    marginTop: 2,
  },
  dueStripValue: {
    color: colors.danger,
    flexShrink: 1,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    marginLeft: spacing.sm,
    maxWidth: '46%',
    textAlign: 'right',
  },
  dueStripValuePaid: { color: colors.success },
  payProgressWrap: { marginTop: spacing.md },
  payProgressText: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});
