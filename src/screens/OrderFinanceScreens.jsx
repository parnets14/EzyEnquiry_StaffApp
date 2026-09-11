import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApp, useRefresh } from '../AppContext';
import { invoiceApi } from '../api';
import { mapApiInvoice, ORDER_STATUS_MAP } from '../AppContext';
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
  const { refreshing, onRefresh } = useRefresh();
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
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader
        navigation={navigation}
        subtitle="Only orders assigned to you"
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
          const deliveryProgress = (order.quantity && order.delivered)
            ? (order.delivered / order.quantity) * 100
            : 0;
          const isDelivered = order.status === 'DELIVERED';
          const isPartiallyDelivered = (order.delivered || 0) > 0 && (order.delivered || 0) < (order.quantity || 0);
          
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
                  {/* Assignment badge */}
                  {order.assignedToName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Icon color={colors.primary} name="account-outline" size={12} />
                      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600', marginLeft: 4 }}>
                        Assigned to: {order.assignedToName}
                      </Text>
                    </View>
                  )}
                  {!order.assignedToName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Icon color={colors.textMuted} name="account-alert-outline" size={12} />
                      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600', marginLeft: 4 }}>
                        Unassigned
                      </Text>
                    </View>
                  )}
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

              {/* Simple quantity row - TEMPORARY FIX */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, flexDirection: 'row', marginTop: 12, padding: 8 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#68778A', fontSize: 9, fontWeight: '700' }}>ORDERED</Text>
                  <Text style={{ color: '#061C35', fontSize: 17, fontWeight: '900', marginTop: 2 }}>{order.quantity || 0}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#68778A', fontSize: 9, fontWeight: '700' }}>PACKED</Text>
                  <Text style={{ color: order.picked > 0 ? '#FF4B0A' : '#061C35', fontSize: 17, fontWeight: '900', marginTop: 2 }}>{order.picked || 0}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#68778A', fontSize: 9, fontWeight: '700' }}>DISPATCHED</Text>
                  <Text style={{ color: order.dispatched > 0 ? '#FF4B0A' : '#061C35', fontSize: 17, fontWeight: '900', marginTop: 2 }}>{order.dispatched || 0}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#68778A', fontSize: 9, fontWeight: '700' }}>DELIVERED</Text>
                  <Text style={{ color: order.delivered > 0 ? '#16875D' : '#061C35', fontSize: 17, fontWeight: '900', marginTop: 2 }}>{order.delivered || 0}</Text>
                </View>
              </View>

              {/* Partial delivery notice */}
              {isPartiallyDelivered ? (
                <View style={{ alignItems: 'center', backgroundColor: '#FFF6DE', borderRadius: 8, flexDirection: 'row', gap: 8, marginTop: 8, padding: 8 }}>
                  <Icon color={colors.warning} name="alert-circle-outline" size={16} />
                  <Text style={{ color: '#C67B08', flex: 1, fontSize: 11, fontWeight: '700' }}>
                    {order.delivered} of {order.quantity} delivered · {order.quantity - order.delivered} remaining
                  </Text>
                </View>
              ) : null}

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
          icon="clipboard-account-outline"
          message={
            search
              ? 'No assigned orders match your search.'
              : 'No orders have been assigned to you yet.\nContact your manager to get orders assigned.'
          }
          onAction={search ? () => setSearch('') : undefined}
          title={search ? 'No results' : 'No orders assigned'}
        />
      )}
    </Screen>
  );
};

const ORDER_STEPS = [
  { key: 'NEW',              label: 'New',              icon: 'clipboard-text-outline'  },
  { key: 'ACCEPTED',         label: 'Accepted',         icon: 'check-decagram-outline'  },
  { key: 'PACKING',          label: 'Packing',          icon: 'package-variant-closed'  },
  { key: 'DISPATCHED',       label: 'Dispatched',       icon: 'truck-check-outline'     },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: 'truck-fast-outline'      },
  { key: 'DELIVERED',        label: 'Delivered',        icon: 'check-circle-outline'    },
];

export const OrderDetailScreen = ({ navigation, route }) => {
  const { dispatches, fetchOrderDetail, invoices, orders } = useApp();
  const { refreshing, onRefresh } = useRefresh();

  // Base order from the list (instant render, no flicker)
  const baseOrder = orders.find(item => item.id === route.params?.id);

  // Enriched order loaded from the detail endpoint (dispatches + invoices + payment summary)
  const [detail, setDetail]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError,   setDetailError]   = useState(null);

  const loadDetail = useCallback(async () => {
    if (!route.params?.id) return;
    setDetailLoading(true);
    setDetailError(null);
    const res = await fetchOrderDetail(route.params.id);
    setDetailLoading(false);
    if (res.success) setDetail(res.order);
    else setDetailError(res.message);
  }, [route.params?.id, fetchOrderDetail]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // Merge: use enriched detail once loaded, fall back to list record
  const order = detail || baseOrder;

  if (!order) {
    return <MissingRecord navigation={navigation} title="Order not found" />;
  }

  // Prefer enriched arrays from detail; fall back to global store filtered lists
  const linkedDispatches = detail?.enrichedDispatches?.length
    ? detail.enrichedDispatches
    : dispatches.filter(d => d.orderId === order.id || d._orderId === order._id);

  const linkedInvoices = detail?.enrichedInvoices?.length
    ? detail.enrichedInvoices
    : invoices.filter(i => i.orderId === order.id || i._orderId === order._id);

  const ps                 = detail?.paymentSummary || {};
  const totalInvoiced      = ps.totalInvoiced || 0;
  const totalPaid          = ps.totalPaid     || 0;
  const totalBalance       = ps.totalBalance  || 0;
  const remainingToDispatch = Math.max(0, order.quantity - order.dispatched);
  const remainingToDeliver  = Math.max(0, order.quantity - order.delivered);
  const isHold             = order.status === 'HOLD';
  const isDelivered        = order.status === 'DELIVERED';

  const currentStep = isHold
    ? Math.max(0, ORDER_STEPS.findIndex(s => s.key === order.previousStatus))
    : Math.max(0, ORDER_STEPS.findIndex(s => s.key === order.status));

  const payBgColor = totalBalance === 0 && totalInvoiced > 0
    ? colors.successSoft
    : totalPaid > 0
    ? colors.warningSoft
    : colors.navySoft;
  const payFgColor = totalBalance === 0 && totalInvoiced > 0
    ? colors.success
    : totalPaid > 0
    ? colors.warning
    : colors.navy;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { onRefresh(); loadDetail(); }}>
      {/* ── Header ── */}
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle='Sales Order'
        title={order.id}
      />

      {/* ── Hero banner ── */}
      <View style={styles.orderHero}>
        <View style={styles.orderHeroTop}>
          <View style={styles.orderHeroIcon}>
            <Icon color={colors.onNavy} name="clipboard-text-outline" size={26} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.orderHeroEyebrow}>SALES ORDER</Text>
            <Text numberOfLines={1} style={styles.orderHeroId}>{order.id}</Text>
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
              <Text numberOfLines={1} style={styles.orderHeroCustomer}>{order.customerName}</Text>
              {order.customerMobile ? (
                <Pressable
                  accessibilityLabel={`Call ${order.customerName}`}
                  onPress={() => Linking.openURL(`tel:${order.customerMobile}`)}
                  style={styles.orderHeroMetaRow}>
                  <Icon color={colors.primary} name="phone-outline" size={13} />
                  <Text style={[styles.orderHeroSupplier, { color: colors.primary }]}>
                    {order.customerMobile}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.orderHeroMetaRow}>
                  <Icon color={colors.textMuted} name="store-outline" size={14} />
                  <Text numberOfLines={1} style={styles.orderHeroSupplier}>{order.wholesaler}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.orderHeroAmountRow}>
            <Text style={styles.orderHeroAmountLabel}>ORDER VALUE</Text>
            <Text numberOfLines={1} style={styles.orderHeroAmount}>
              {formatCurrency(order.total)}
            </Text>
          </View>
        </View>

        {/* Assignment chip */}
        {order.assignedToName ? (
          <View style={styles.assignmentChip}>
            <Icon color={colors.primary} name="account-check-outline" size={15} />
            <View style={styles.flexText}>
              <Text style={styles.assignmentChipName}>
                {order.assignedToName}
                {order.assignedToDesignation ? ` · ${order.assignedToDesignation}` : ''}
              </Text>
              {order.assignedDate ? (
                <Text style={styles.assignmentChipDate}>Assigned {order.assignedDate}</Text>
              ) : null}
            </View>
            {order.assignedToMobile ? (
              <Pressable
                accessibilityLabel="Call assigned staff"
                onPress={() => Linking.openURL(`tel:${order.assignedToMobile}`)}>
                <Icon color={colors.primary} name="phone-outline" size={16} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* ── Quantity dashboard ── */}
      <View style={styles.quantityDashboard}>
        <QuantityBlock label="Ordered"    tone="navy" value={order.quantity} />
        <QuantityBlock label="Packed"               value={order.picked} />
        <QuantityBlock label="Dispatched"            value={order.dispatched} />
        <QuantityBlock label="Delivered"  tone={order.delivered > 0 ? 'success' : undefined} value={order.delivered} />
      </View>

      {/* ── Payment summary ── */}
      {detailLoading ? (
        <SurfaceCard style={styles.cardSpacing}>
          <View style={styles.loadingRow}>
            <Icon color={colors.textMuted} name="loading" size={18} />
            <Text style={styles.loadingText}>Loading payment details…</Text>
          </View>
        </SurfaceCard>
      ) : detailError ? (
        <NoticeBanner
          icon="alert-circle-outline"
          message={detailError}
          title="Could not load full details"
          tone="warning"
          style={styles.inlineNotice}
        />
      ) : totalInvoiced > 0 ? (
        <SurfaceCard style={styles.cardSpacing}>
          <Text style={styles.cardEyebrow}>FINANCIALS</Text>
          <Text style={styles.cardHeading}>Payment summary</Text>

          <View style={styles.paymentSummaryGrid}>
            <View style={[styles.paymentSummaryBox, { backgroundColor: colors.navySoft }]}>
              <Text style={[styles.paymentSummaryLabel, { color: colors.navy }]}>INVOICED</Text>
              <Text style={[styles.paymentSummaryValue, { color: colors.navy }]}>
                {formatCurrency(totalInvoiced)}
              </Text>
              <Text style={styles.paymentSummaryHint}>
                {linkedInvoices.length} invoice{linkedInvoices.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[styles.paymentSummaryBox, { backgroundColor: colors.successSoft }]}>
              <Text style={[styles.paymentSummaryLabel, { color: colors.success }]}>COLLECTED</Text>
              <Text style={[styles.paymentSummaryValue, { color: colors.success }]}>
                {formatCurrency(totalPaid)}
              </Text>
              <Text style={styles.paymentSummaryHint}>
                {totalInvoiced > 0 ? `${Math.round((totalPaid / totalInvoiced) * 100)}%` : '—'}
              </Text>
            </View>
            <View style={[styles.paymentSummaryBox, { backgroundColor: totalBalance > 0 ? colors.dangerSoft : colors.successSoft }]}>
              <Text style={[styles.paymentSummaryLabel, { color: totalBalance > 0 ? colors.danger : colors.success }]}>
                BALANCE
              </Text>
              <Text style={[styles.paymentSummaryValue, { color: totalBalance > 0 ? colors.danger : colors.success }]}>
                {formatCurrency(totalBalance)}
              </Text>
              <Text style={styles.paymentSummaryHint}>
                {totalBalance === 0 ? 'Fully paid' : 'Outstanding'}
              </Text>
            </View>
          </View>

          {totalBalance === 0 && totalInvoiced > 0 ? (
            <View style={styles.paidFullBadge}>
              <Icon color={colors.success} name="check-circle-outline" size={15} />
              <Text style={styles.paidFullText}>Order fully paid</Text>
            </View>
          ) : totalBalance > 0 && totalPaid > 0 ? (
            <View style={styles.partialPayBadge}>
              <Icon color={colors.warning} name="clock-alert-outline" size={15} />
              <Text style={styles.partialPayText}>
                Partial payment received · {formatCurrency(totalBalance)} still due
              </Text>
            </View>
          ) : null}
        </SurfaceCard>
      ) : null}

      {/* ── Fulfilment progress ── */}
      <SurfaceCard style={styles.cardSpacing}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.flexText}>
            <Text style={styles.cardEyebrow}>FULFILMENT</Text>
            <Text style={styles.cardHeading}>Progress by quantity</Text>
          </View>
          {remainingToDispatch > 0 ? (
            <View style={styles.remainingBadge}>
              <Text style={styles.remainingText}>{remainingToDispatch} to dispatch</Text>
            </View>
          ) : (
            <View style={[styles.remainingBadge, { backgroundColor: colors.successSoft }]}>
              <Text style={[styles.remainingText, { color: colors.success }]}>All dispatched</Text>
            </View>
          )}
        </View>
        <ProgressLabel label="Packing"  total={order.quantity} value={order.picked} />
        <ProgressLabel label="Dispatch" total={order.quantity} value={order.dispatched} />
        <ProgressLabel label="Delivery" total={order.quantity} value={order.delivered} />
        {remainingToDeliver > 0 && order.delivered > 0 ? (
          <NoticeBanner
            message={`${order.delivered} delivered · ${remainingToDeliver} still pending.`}
            title="Partial delivery in progress"
            tone="warning"
            style={styles.inlineNotice}
          />
        ) : null}
      </SurfaceCard>

      {/* ── Order information ── */}
      <SurfaceCard style={styles.cardSpacing}>
        <Text style={styles.cardEyebrow}>ORDER INFORMATION</Text>
        <Text style={styles.cardHeading}>Details</Text>
        <InfoRow label="Product"  value={`${order.productName}${order.productCode ? ` (${order.productCode})` : ''}`} />
        <InfoRow label="Quantity" value={`${order.quantity} ${order.unit}`} />
        <InfoRow label="Rate"     value={formatCurrency(order.rate)} />
        <InfoRow label="Subtotal" value={formatCurrency(order.subtotal)} />
        <InfoRow label={`GST (${order.gstPercent || 18}%)`} value={formatCurrency(order.gstAmount)} />
        <InfoRow label="Total"    value={formatCurrency(order.total)} valueColor={colors.navy} />
        {order.branchName  ? <InfoRow label="Branch"   value={order.branchName}  /> : null}
        {order.quotationId ? <InfoRow label="Quotation" value={order.quotationId} /> : null}
        <InfoRow label="Order date"        value={order.orderDate} />
        <InfoRow label="Expected delivery" value={order.expectedDelivery} />
        {order.deliveryAddress ? <InfoRow label="Delivery address" value={order.deliveryAddress} /> : null}
        {order.notes ? <InfoRow label="Notes" value={order.notes} /> : null}
        {order.createdByName ? (
          <InfoRow label="Created by" value={`${order.createdByName}${order.createdByType ? ` (${order.createdByType})` : ''}`} />
        ) : null}
      </SurfaceCard>

      {/* ── Unified Order Status Timeline ── */}
      <SurfaceCard style={styles.workflowCard}>
        <Text style={styles.cardEyebrow}>ORDER STATUS</Text>

        {/* ── Cancelled banner ── */}
        {order.status === 'CANCELLED' ? (() => {
          const cancelEntry = (order.timeline || []).find(e => e.rawStatus === 'Cancelled' || e.status === 'CANCELLED');
          return (
            <View style={styles.cancelledCard}>
              <View style={styles.cancelledIconRow}>
                <View style={styles.cancelledIconWrap}>
                  <Icon color={colors.danger} name="close-circle-outline" size={28} />
                </View>
                <View style={styles.cancelledTextCol}>
                  <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                  {cancelEntry?.at ? (
                    <Text style={styles.cancelledMeta}>
                      {cancelEntry.at}
                      {cancelEntry.by ? <Text style={styles.cancelledBy}> · {cancelEntry.by}</Text> : null}
                    </Text>
                  ) : null}
                  {cancelEntry?.remarks ? (
                    <Text style={styles.cancelledRemarks}>{cancelEntry.remarks}</Text>
                  ) : null}
                </View>
              </View>
              {/* Show progress up to point of cancellation */}
              {order.previousStatus ? (
                <View style={styles.cancelledPrior}>
                  <Icon color={colors.textMuted} name="information-outline" size={13} />
                  <Text style={styles.cancelledPriorText}>
                    Was at: <Text style={{ fontWeight: '700' }}>
                      {ORDER_STEPS.find(s => s.key === order.previousStatus)?.label || order.previousStatus}
                    </Text> before cancellation
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })() : null}

        {/* ── Hold banner ── */}
        {isHold ? (
          <NoticeBanner
            icon="pause-circle-outline"
            message={`${order.holdRemarks || 'This order is currently on hold.'}${order.heldBy ? `\nBy ${order.heldBy}${order.heldAt ? ` · ${order.heldAt}` : ''}` : ''}`}
            title={`On HOLD · ${String(order.holdReason || '').replace(/_/g, ' ') || 'Pending review'}`}
            tone="warning"
            style={styles.inlineNotice}
          />
        ) : null}

        {/* ── Normal 6-stage timeline (hidden when cancelled) ── */}
        {order.status !== 'CANCELLED' ? (() => {
          const stageMap = {};
          (order.timeline || []).forEach(entry => {
            const key = entry.status;
            if (key && !stageMap[key]) stageMap[key] = entry;
          });

          const activeKey = ORDER_STEPS[currentStep]?.key;
          if (activeKey && !stageMap[activeKey]) {
            stageMap[activeKey] = {
              status:    activeKey,
              rawStatus: order.rawStatus || '',
              by:        order.assignedToName || '',
              remarks:   '',
              at:        order.orderDate || '',
            };
          }

          return ORDER_STEPS.map((step, index) => {
            const isDone    = index < currentStep;
            const isActive  = index === currentStep && !isHold;
            const isPending = index > currentStep;
            const isLast    = index === ORDER_STEPS.length - 1;
            const entry     = stageMap[step.key];

            return (
              <View key={step.key} style={styles.statusStep}>
                <View style={styles.statusStepIconCol}>
                  <View style={[
                    styles.statusStepDot,
                    (isDone || isActive) && styles.statusStepDotDone,
                    isActive && styles.statusStepDotActive,
                  ]}>
                    <Icon
                      color={isDone || isActive ? colors.onNavy : colors.textMuted}
                      name={isDone ? 'check' : step.icon}
                      size={15}
                    />
                  </View>
                  {!isLast && (
                    <View style={[styles.statusStepLine, isDone && styles.statusStepLineDone]} />
                  )}
                </View>
                <View style={[styles.statusStepTextCol, !isLast && styles.statusStepTextColSpaced]}>
                  <View style={styles.statusStepRowTop}>
                    <Text style={[
                      styles.statusStepLabel,
                      (isDone || isActive) && styles.statusStepLabelDone,
                      isPending && styles.statusStepLabelPending,
                    ]}>
                      {step.label}
                    </Text>
                    {isActive && !isHold ? (
                      <View style={styles.statusActivePill}>
                        <Text style={styles.statusActivePillText}>Current</Text>
                      </View>
                    ) : null}
                  </View>
                  {(isDone || isActive) && entry && entry.at ? (
                    <Text style={styles.statusStepMeta}>
                      {entry.at}
                      {entry.by ? <Text style={styles.statusStepMetaBy}> · {entry.by}</Text> : null}
                      {entry.remarks ? (
                        <Text>{'\n'}{entry.remarks}</Text>
                      ) : null}
                    </Text>
                  ) : (isDone || isActive) ? (
                    <Text style={styles.statusStepMeta}>Completed</Text>
                  ) : (
                    <Text style={styles.statusStepPending}>Pending</Text>
                  )}
                </View>
              </View>
            );
          });
        })() : null}
      </SurfaceCard>

      {/* ── Dispatches ── */}
      <SectionHeader
        actionLabel="View all"
        onAction={() => navigation.navigate('Dispatches', { orderId: order.id })}
        title={`Dispatches (${linkedDispatches.length})`}
      />
      {linkedDispatches.length ? (
        linkedDispatches.map(dispatch => (
          <SurfaceCard key={dispatch.id} style={styles.dispatchCard}>
            <View style={styles.dispatchCardTop}>
              <View style={styles.odDispatchIcon}>
                <Icon color={colors.primary} name="truck-fast-outline" size={18} />
              </View>
              <View style={styles.flexText}>
                <Text style={styles.dispatchId}>{dispatch.id}</Text>
                <Text style={styles.dispatchMeta}>
                  {dispatch.quantity} {order.unit}
                  {dispatch.invoiceNumber ? ` · ${dispatch.invoiceNumber}` : ''}
                </Text>
              </View>
              <StatusPill status={dispatch.status || dispatch.rawStatus} />
            </View>

            <View style={styles.dispatchInfoGrid}>
              {dispatch.driverName && dispatch.driverName !== '—' ? (
                <View style={styles.dispatchInfoItem}>
                  <Icon color={colors.textMuted} name="account-outline" size={13} />
                  <Text style={styles.dispatchInfoText}>{dispatch.driverName}</Text>
                  {dispatch.driverMobile && dispatch.driverMobile !== '—' ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${dispatch.driverMobile}`)}>
                      <Icon color={colors.primary} name="phone-outline" size={13} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {dispatch.vehicleNumber && dispatch.vehicleNumber !== '—' ? (
                <View style={styles.dispatchInfoItem}>
                  <Icon color={colors.textMuted} name="car-outline" size={13} />
                  <Text style={styles.dispatchInfoText}>{dispatch.vehicleNumber}</Text>
                </View>
              ) : null}
              {dispatch.transport && dispatch.transport !== '—' ? (
                <View style={styles.dispatchInfoItem}>
                  <Icon color={colors.textMuted} name="truck-outline" size={13} />
                  <Text style={styles.dispatchInfoText}>{dispatch.transport}</Text>
                </View>
              ) : null}
              {dispatch.lrNumber && dispatch.lrNumber !== '—' ? (
                <View style={styles.dispatchInfoItem}>
                  <Icon color={colors.textMuted} name="file-document-outline" size={13} />
                  <Text style={styles.dispatchInfoText}>LR: {dispatch.lrNumber}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.dispatchDates}>
              <View style={styles.dispatchDateItem}>
                <Text style={styles.dispatchDateLabel}>Dispatched</Text>
                <Text style={styles.dispatchDateValue}>{dispatch.dispatchDate || '—'}</Text>
              </View>
              <View style={styles.dispatchDateItem}>
                <Text style={styles.dispatchDateLabel}>Expected</Text>
                <Text style={styles.dispatchDateValue}>{dispatch.expectedDelivery || '—'}</Text>
              </View>
              <View style={styles.dispatchDateItem}>
                <Text style={styles.dispatchDateLabel}>Delivered</Text>
                <Text style={[styles.dispatchDateValue,
                  (dispatch.status === 'DELIVERED' || dispatch.rawStatus === 'Delivered') && { color: colors.success }]}>
                  {dispatch.deliveredDate || '—'}
                </Text>
              </View>
            </View>

            {dispatch.notes ? (
              <View style={styles.dispatchNotes}>
                <Icon color={colors.textMuted} name="note-text-outline" size={13} />
                <Text style={styles.dispatchNotesText}>{dispatch.notes}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityLabel={`Open full dispatch ${dispatch.id}`}
              onPress={() => navigation.navigate('DispatchDetail', { id: dispatch.id })}
              style={styles.dispatchViewMore}>
              <Text style={styles.dispatchViewMoreText}>View full dispatch</Text>
              <Icon color={colors.primary} name="arrow-right" size={15} />
            </Pressable>
          </SurfaceCard>
        ))
      ) : (
        <EmptyState
          compact
          icon="truck-outline"
          message="No dispatch has been created for this order yet."
          title="No linked dispatches"
        />
      )}

      {/* ── Invoices ── */}
      <SectionHeader
        actionLabel={linkedInvoices.length ? 'View all' : undefined}
        onAction={linkedInvoices.length ? () => navigation.navigate('Invoices', { orderId: order.id }) : undefined}
        title={`Invoices (${linkedInvoices.length})`}
      />
      {linkedInvoices.length ? (
        linkedInvoices.map(invoice => (
          <SurfaceCard key={invoice.id} style={styles.odInvoiceCard}>
            <View style={styles.invoiceCardTop}>
              <View style={styles.invoiceIcon}>
                <Icon color={colors.navy} name="text-box-outline" size={18} />
              </View>
              <View style={styles.flexText}>
                <Text style={styles.odInvoiceId}>{invoice.id}</Text>
                <Text style={styles.invoiceMeta}>
                  {invoice.quantity} {invoice.unit || order.unit}
                  {invoice.invoiceDate && invoice.invoiceDate !== '—' ? ` · ${invoice.invoiceDate}` : ''}
                </Text>
              </View>
              <StatusPill status={invoice.status || invoice.rawStatus} />
            </View>

            <View style={styles.invoiceAmountRow}>
              <View style={styles.invoiceAmountItem}>
                <Text style={styles.invoiceAmountLabel}>Total</Text>
                <Text style={styles.invoiceAmountValue}>{formatCurrency(invoice.total)}</Text>
              </View>
              <View style={styles.invoiceAmountItem}>
                <Text style={styles.invoiceAmountLabel}>Paid</Text>
                <Text style={[styles.invoiceAmountValue, { color: invoice.paidAmount > 0 ? colors.success : colors.textMuted }]}>
                  {formatCurrency(invoice.paidAmount)}
                </Text>
              </View>
              <View style={styles.invoiceAmountItem}>
                <Text style={styles.invoiceAmountLabel}>Balance</Text>
                <Text style={[styles.invoiceAmountValue, { color: invoice.balance > 0 ? colors.danger : colors.success }]}>
                  {formatCurrency(invoice.balance)}
                </Text>
              </View>
            </View>

            {/* Payment history */}
            {invoice.paymentHistory?.length > 0 ? (
              <View style={styles.paymentHistoryBox}>
                <Text style={styles.paymentHistoryTitle}>
                  Payment history ({invoice.paymentHistory.length})
                </Text>
                {(() => {
                  // Oldest-first so we can number payments and show running balance.
                  const ordered = [...invoice.paymentHistory].sort(
                    (a, b) => new Date(a._date || a.date) - new Date(b._date || b.date),
                  );
                  let runningPaid = 0;
                  const total = invoice.total || 0;
                  const ordinal = n => {
                    const s = ['th', 'st', 'nd', 'rd'];
                    const v = n % 100;
                    return n + (s[(v - 20) % 10] || s[v] || s[0]);
                  };
                  return ordered.map((ph, i) => {
                    runningPaid += Number(ph.amount) || 0;
                    const balAfter = Math.max(0, total - runningPaid);
                    const isVerified = (ph.verificationStatus || '') === 'Verified';
                    return (
                      <View key={i} style={styles.paymentHistoryItem}>
                        <View style={styles.paymentHistoryItemHeader}>
                          <View style={styles.paymentHistorySeqBadge}>
                            <Text style={styles.paymentHistorySeqText}>
                              {ordered.length > 1 ? ordinal(i + 1) : '1st'}
                            </Text>
                          </View>
                          <Text style={styles.paymentHistoryAmount}>
                            {formatCurrency(ph.amount)}
                          </Text>
                          <View style={{ flex: 1 }} />
                          <Icon
                            color={isVerified ? colors.success : colors.warning}
                            name={isVerified ? 'check-decagram' : 'clock-outline'}
                            size={15}
                          />
                          <Text style={[
                            styles.paymentHistoryStatus,
                            { color: isVerified ? colors.success : colors.warning },
                          ]}>
                            {isVerified ? 'Verified' : 'Pending'}
                          </Text>
                        </View>
                        <Text style={styles.paymentHistoryMetaLine}>
                          {ph.mode || '—'}
                          {ph.reference ? ` · ${ph.reference}` : ''}
                          {ph.date ? ` · ${ph.date}` : ''}
                        </Text>
                        <View style={styles.paymentHistoryBalRow}>
                          {ph.by ? (
                            <Text style={styles.paymentHistoryBy}>Collected by {ph.by}</Text>
                          ) : <View />}
                          <Text style={styles.paymentHistoryBal}>
                            Balance: {formatCurrency(balAfter)}
                          </Text>
                        </View>
                        {/* Paid progress after this payment */}
                        {(() => {
                          const pct = total > 0 ? Math.min(100, Math.round((runningPaid / total) * 100)) : 0;
                          const done = balAfter === 0;
                          return (
                            <View style={styles.payProgressRow}>
                              <View style={styles.payProgressTrack}>
                                <View style={[
                                  styles.payProgressFill,
                                  { width: `${pct}%`, backgroundColor: done ? colors.success : pct >= 50 ? colors.warning : colors.danger },
                                ]} />
                              </View>
                              <Text style={styles.payProgressLabel}>
                                {done ? 'Fully paid' : `${pct}% paid`}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                    );
                  });
                })()}
              </View>
            ) : null}

            {invoice.dueDate && invoice.dueDate !== '—' && invoice.balance > 0 ? (
              <View style={styles.invoiceDueRow}>
                <Icon color={colors.warning} name="calendar-clock-outline" size={14} />
                <Text style={styles.invoiceDueText}>Due {invoice.dueDate}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityLabel={`Open full invoice ${invoice.id}`}
              onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
              style={styles.dispatchViewMore}>
              <Text style={styles.dispatchViewMoreText}>View full invoice</Text>
              <Icon color={colors.primary} name="arrow-right" size={15} />
            </Pressable>
          </SurfaceCard>
        ))
      ) : (
        <EmptyState
          compact
          icon="text-box-outline"
          message="Invoice will be generated against the actual dispatch quantity."
          title="No linked invoices"
        />
      )}

      {/* ── Quick action: collect payment ── */}
      {linkedInvoices.some(inv => inv.balance > 0) ? (
        <SurfaceCard style={[styles.cardSpacing, { marginBottom: 8 }]}>
          <View style={styles.collectActionRow}>
            <View style={styles.collectActionIcon}>
              <Icon color={colors.primary} name="hand-coin-outline" size={22} />
            </View>
            <View style={styles.flexText}>
              <Text style={styles.collectActionTitle}>Collect payment</Text>
              <Text style={styles.collectActionSub}>
                {formatCurrency(totalBalance)} outstanding across {linkedInvoices.filter(i => i.balance > 0).length} invoice(s)
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Go to collections"
              onPress={() => navigation.navigate('Collections')}
              style={styles.collectActionBtn}>
              <Text style={styles.collectActionBtnText}>Collect</Text>
            </Pressable>
          </View>
        </SurfaceCard>
      ) : null}
    </Screen>
  );
};

export const DispatchesScreen = ({ navigation, route }) => {
  const { dispatches, orders, loadingDispatches } = useApp();
  const { refreshing, onRefresh } = useRefresh();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const requestedOrder = route.params?.orderId;
  
  // Debug logging
  console.log('DispatchesScreen - Total dispatches:', dispatches.length);
  console.log('DispatchesScreen - Total orders:', orders.length);
  console.log('DispatchesScreen - Loading:', loadingDispatches);
  console.log('DispatchesScreen - Dispatches:', dispatches.map(d => ({ 
    id: d.id, 
    orderId: d.orderId, 
    status: d.status 
  })));
  
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

  console.log('DispatchesScreen - Visible after filter:', visible.length);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={requestedOrder ? `For ${requestedOrder}` : 'Picking, transit and delivery'}
        title="Dispatch tracking"
      />
      
      {loadingDispatches && dispatches.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dispatches...</Text>
        </View>
      ) : (
        <>
          <View style={styles.dispatchOverview}>
            <OverviewItem
              icon="truck-check-outline"
              label="Dispatched"
              value={dispatches.filter(item => item.status === 'DISPATCHED').length}
            />
            <OverviewItem
              icon="truck-delivery-outline"
              label="In transit"
              value={dispatches.filter(item => item.status === 'IN_TRANSIT').length}
            />
            <OverviewItem
              icon="package-check"
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
                { label: 'Dispatched', value: 'DISPATCHED' },
                { label: 'In transit', value: 'IN_TRANSIT' },
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
                  {order?.productName || 'Product'}
                </Text>
                <Text style={styles.dispatchQty}>
                  {dispatch.quantity} {order?.unit || 'units'}
                </Text>
              </View>
              <View style={styles.dispatchRoute}>
                <View style={styles.routePoint}>
                  <Icon color={colors.navy} name="account-outline" size={16} />
                </View>
                <Text numberOfLines={1} style={styles.dispatchRouteText}>
                  {order?.customerName || 'Customer'}
                </Text>
                <Icon color={colors.textMuted} name="arrow-right" size={16} />
                <View style={styles.routePointOrange}>
                  <Icon color={colors.primary} name="map-marker-outline" size={16} />
                </View>
                <Text numberOfLines={1} style={styles.dispatchRouteText}>
                  {destination || 'Destination'}
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
          actionLabel={search ? 'Clear search' : dispatches.length === 0 ? 'Refresh' : undefined}
          icon="truck-remove-outline"
          message={
            dispatches.length === 0 
              ? 'No dispatches have been created yet. Dispatches are created after orders are ready for shipping.'
              : 'No dispatch records match the current order, search and status filters.'
          }
          onAction={search ? () => setSearch('') : dispatches.length === 0 ? () => navigation.goBack() : undefined}
          title={dispatches.length === 0 ? 'No dispatches yet' : 'No dispatches found'}
        />
      )}
        </>
      )}
    </Screen>
  );
};

const DISPATCH_STEPS = [
  { key: 'DISPATCHED', label: 'Dispatched', icon: 'truck-check-outline' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: 'truck-fast-outline' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'check-circle-outline' },
];

export const DispatchDetailScreen = ({ navigation, route }) => {
  const { dispatches, invoices, orders } = useApp();
  const dispatch = dispatches.find(item => item.id === route.params?.id);

  if (!dispatch) {
    return <MissingRecord navigation={navigation} title="Dispatch not found" />;
  }

  const order       = orders.find(item => item.id === dispatch.orderId);
  const invoice     = invoices.find(item => item.dispatchId === dispatch.id);
  const isDelivered = dispatch.status === 'DELIVERED';
  const isInTransit = dispatch.status === 'IN_TRANSIT';
  const otpVerified = dispatch.deliveryOtpStatus === 'OTP_VERIFIED';
  const hasValue    = v => v && v !== '—';

  const currentStep = Math.max(0, DISPATCH_STEPS.findIndex(s => s.key === dispatch.status));

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
        subtitle={`Order · ${dispatch.orderId}`}
        title={dispatch.id}
      />

      {/* ── Status banner for delivered ── */}
      {isDelivered && (
        <NoticeBanner
          icon="check-decagram"
          message={`Delivered on ${dispatch.deliveredDate || '—'}${otpVerified ? ' · OTP verified' : ''}`}
          title="Delivery Completed"
          tone="success"
          style={styles.deliverySuccessBanner}
        />
      )}

      {/* ── Hero card ── */}
      <SurfaceCard style={styles.ddHero}>
        {/* Top row: icon + id + status */}
        <View style={styles.ddHeroTop}>
          <View style={[styles.ddHeroIcon, isDelivered && styles.ddHeroIconDone]}>
            <Icon
              color={isDelivered ? colors.success : isInTransit ? colors.primary : colors.navy}
              name={isDelivered ? 'check-decagram' : isInTransit ? 'truck-fast' : 'truck-check-outline'}
              size={22}
            />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.ddHeroCode}>{dispatch.id}</Text>
            <Text style={styles.ddHeroOrderRef}>Sales Order · {dispatch.orderId}</Text>
          </View>
          <StatusPill status={dispatch.status} />
        </View>

        {/* Divider */}
        <View style={styles.ddDivider} />

        {/* Info grid: qty · product · customer · address */}
        <View style={styles.ddInfoGrid}>
          <View style={styles.ddInfoItem}>
            <Text style={styles.ddInfoLabel}>QUANTITY</Text>
            <Text style={styles.ddInfoValue}>
              {dispatch.quantity}{' '}
              <Text style={styles.ddInfoUnit}>{dispatch.unit || order?.unit || ''}</Text>
            </Text>
          </View>
          <View style={styles.ddInfoItem}>
            <Text style={styles.ddInfoLabel}>PRODUCT</Text>
            <Text numberOfLines={2} style={styles.ddInfoValue}>
              {dispatch.productName || order?.productName || '—'}
            </Text>
          </View>
          <View style={styles.ddInfoItem}>
            <Text style={styles.ddInfoLabel}>CUSTOMER</Text>
            <Text numberOfLines={1} style={styles.ddInfoValue}>
              {dispatch.customerName || order?.customerName || '—'}
            </Text>
          </View>
          <View style={styles.ddInfoItem}>
            <Text style={styles.ddInfoLabel}>DESTINATION</Text>
            <Text numberOfLines={2} style={styles.ddInfoValue}>
              {dispatch.deliveryAddress || order?.deliveryAddress || '—'}
            </Text>
          </View>
        </View>
      </SurfaceCard>

      {/* ── Shipment progress ── */}
      <SurfaceCard style={styles.cardSpacing}>
        <Text style={styles.cardEyebrow}>SHIPMENT STATUS</Text>
        <Text style={styles.cardHeading}>Progress</Text>
        <View style={styles.stepper}>
          {DISPATCH_STEPS.map((step, index) => {
            const done   = index <= currentStep;
            const active = index === currentStep;
            return (
              <React.Fragment key={step.key}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                    <Icon color={done ? colors.onNavy : colors.textMuted} name={step.icon} size={16} />
                  </View>
                  <Text numberOfLines={2} style={[styles.stepLabel, done && styles.stepLabelDone]}>
                    {step.label}
                  </Text>
                </View>
                {index < DISPATCH_STEPS.length - 1 ? (
                  <View style={[styles.stepLine, index < currentStep && styles.stepLineDone]} />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
      </SurfaceCard>

      {/* ── Dates card ── */}
      <SurfaceCard style={styles.cardSpacing}>
        <Text style={styles.cardEyebrow}>TIMELINE</Text>
        <Text style={styles.cardHeading}>Key dates</Text>
        <View style={styles.ddDatesGrid}>
          <View style={styles.ddDateItem}>
            <Icon color={colors.primary} name="truck-check-outline" size={18} />
            <Text style={styles.ddDateLabel}>Dispatched</Text>
            <Text style={styles.ddDateValue}>{dispatch.dispatchDate || '—'}</Text>
          </View>
          <View style={styles.ddDateItem}>
            <Icon color={colors.warning} name="calendar-clock-outline" size={18} />
            <Text style={styles.ddDateLabel}>Expected</Text>
            <Text style={styles.ddDateValue}>{dispatch.expectedDelivery || '—'}</Text>
          </View>
          <View style={styles.ddDateItem}>
            <Icon color={isDelivered ? colors.success : colors.textMuted} name="check-circle-outline" size={18} />
            <Text style={styles.ddDateLabel}>Delivered</Text>
            <Text style={[styles.ddDateValue, isDelivered && styles.ddDateValueDone]}>
              {dispatch.deliveredDate || '—'}
            </Text>
          </View>
        </View>
      </SurfaceCard>

      {/* ── Transport card ── */}
      <SurfaceCard style={styles.cardSpacing}>
        <View style={styles.ddTransportHeader}>
          <View style={styles.flexText}>
            <Text style={styles.cardEyebrow}>TRANSPORT</Text>
            <Text style={styles.cardHeading}>Driver & vehicle</Text>
          </View>
          {hasValue(dispatch.driverMobile) ? (
            <Pressable
              accessibilityLabel={`Call ${dispatch.driverName}`}
              accessibilityRole="button"
              onPress={callDriver}
              style={({ pressed }) => [styles.callButton, pressed && styles.pressablePressed]}>
              <Icon color={colors.onNavy} name="phone" size={16} />
              <Text style={styles.callButtonText}>Call</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Driver row */}
        <View style={styles.ddDriverRow}>
          <View style={styles.driverAvatar}>
            <Icon color={colors.primary} name="account-tie-outline" size={22} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.driverName}>
              {hasValue(dispatch.driverName) ? dispatch.driverName : 'Driver not assigned'}
            </Text>
            <Text style={styles.driverMobile}>
              {hasValue(dispatch.driverMobile) ? `+91 ${dispatch.driverMobile}` : 'Mobile pending'}
            </Text>
          </View>
        </View>

        <View style={styles.ddTransportGrid}>
          {hasValue(dispatch.vehicleNumber) ? (
            <View style={styles.ddTransportChip}>
              <Icon color={colors.textMuted} name="car-outline" size={15} />
              <View>
                <Text style={styles.ddChipLabel}>Vehicle</Text>
                <Text style={styles.ddChipValue}>{dispatch.vehicleNumber}</Text>
              </View>
            </View>
          ) : null}
          {hasValue(dispatch.transport) ? (
            <View style={styles.ddTransportChip}>
              <Icon color={colors.textMuted} name="truck-outline" size={15} />
              <View>
                <Text style={styles.ddChipLabel}>Transport co.</Text>
                <Text style={styles.ddChipValue}>{dispatch.transport}</Text>
              </View>
            </View>
          ) : null}
          {hasValue(dispatch.lrNumber) ? (
            <View style={styles.ddTransportChip}>
              <Icon color={colors.textMuted} name="file-document-outline" size={15} />
              <View>
                <Text style={styles.ddChipLabel}>LR Number</Text>
                <Text style={styles.ddChipValue}>{dispatch.lrNumber}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </SurfaceCard>

      {/* ── OTP status (only while not delivered) ── */}
      {!isDelivered ? (
        <View style={[styles.otpBadge, otpVerified ? styles.otpBadgeDone : styles.otpBadgePending, styles.cardSpacing]}>
          <Icon
            color={otpVerified ? colors.success : colors.warning}
            name={otpVerified ? 'shield-check' : 'shield-alert-outline'}
            size={20}
          />
          <View style={styles.flexText}>
            <Text style={[styles.otpBadgeTitle, { color: otpVerified ? colors.success : colors.warning }]}>
              {otpVerified ? 'Delivery OTP verified' : 'Delivery OTP pending'}
            </Text>
            <Text style={styles.otpBadgeSub}>Verification required on delivery</Text>
          </View>
        </View>
      ) : null}

      {/* ── Invoice link ── */}
      <NoticeBanner
        icon="text-box-check-outline"
        message={
          invoice
            ? `Invoice ${invoice.id} · ${invoice.quantity} ${invoice.unit || ''} · ₹${(invoice.total || 0).toLocaleString()}`
            : 'Invoice will be generated after dispatch confirmation.'
        }
        title="Linked Invoice"
        tone={invoice ? 'success' : 'info'}
        style={styles.noticeSpacing}
      />

      {/* ── Action buttons ── */}
      <View style={styles.linkedActions}>
        {invoice ? (
          <PrimaryButton
            icon="text-box-outline"
            onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
            style={styles.linkedAction}
            title={`View Invoice · ${invoice.id}`}
          />
        ) : null}
        <PrimaryButton
          icon="clipboard-text-outline"
          onPress={() => navigation.navigate('OrderDetail', { id: dispatch.orderId })}
          style={styles.linkedAction}
          title={`Open Order · ${dispatch.orderId}`}
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
              onPress={() => navigation.navigate('CollectionDetail', { id: collection.id, invoiceId: collection.invoiceId })}
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
  const { refreshing, onRefresh } = useRefresh();
  const [filter, setFilter] = useState('ALL');
  const customerId = route.params?.customerId;
  const visible = invoices.filter(invoice => {
    const customerMatch = !customerId || invoice.customerId === customerId;
    const statusMatch = filter === 'ALL' || invoice.status === filter;
    return customerMatch && statusMatch;
  });

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
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
  const [invoice, setInvoice] = useState(invoices.find(item => item.id === route.params?.id));
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('CASH');
  const [amount, setAmount] = useState(String(invoice?.balance || ''));
  const [reference, setReference] = useState('');
  const [payError, setPayError] = useState('');

  // Fetch full invoice details with dispatch enrichment
  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (!route.params?.id) return;
      setLoading(true);
      try {
        const res = await invoiceApi.get(route.params.id);
        if (res.success && res.data) {
          const mapped = mapApiInvoice(res.data);
          setInvoice(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch invoice details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoiceDetails();
  }, [route.params?.id]);

  if (!invoice && !loading) {
    return <MissingRecord navigation={navigation} title="Invoice not found" />;
  }
  
  if (!invoice) {
    return <Screen><AppHeader navigation={navigation} showBack showNotifications={false} title="Loading..." /></Screen>;
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

  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setPayError('Enter a valid amount.');
      return;
    }
    if (value > invoice.balance) {
      setPayError('Amount cannot exceed the balance due.');
      return;
    }
    setPayError('');
    setPaying(true);
    const result = await recordCollection({
      invoiceId: invoice.id,
      amount: value,
      mode,
      reference,
    });
    setPaying(false);
    if (!result.success) {
      setPayError(result.message);
      return;
    }
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
              disabled={paying}
              style={styles.footerPayButton}
              title={paying ? 'Processing…' : `Pay ${formatCurrency(Number(amount) || 0)}`}
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

      {/* ── Linked Dispatch ────────────────────────────── */}
      {invoice.dispatch ? (
        <>
          <SectionHeader title="Linked Dispatch" />
          <SurfaceCard style={styles.cardSpacing}>
            <View style={styles.dispatchLinkHeader}>
              <View style={styles.dispatchLinkIcon}>
                <Icon color={colors.primary} name="truck-fast-outline" size={24} />
              </View>
              <View style={styles.flexText}>
                <Text style={styles.cardEyebrow}>DISPATCH</Text>
                <Text numberOfLines={1} style={styles.cardHeading}>
                  {invoice.dispatch.id}
                </Text>
              </View>
              <StatusPill status={invoice.dispatch.status} />
            </View>

            <InfoRow label="Status" value={invoice.dispatch.status.replace(/_/g, ' ')} />
            {invoice.dispatch.driverName ? (
              <InfoRow label="Driver" value={invoice.dispatch.driverName} />
            ) : null}
            {invoice.dispatch.driverMobile ? (
              <InfoRow label="Driver mobile" value={invoice.dispatch.driverMobile} />
            ) : null}
            {invoice.dispatch.vehicleNumber ? (
              <InfoRow label="Vehicle" value={invoice.dispatch.vehicleNumber} />
            ) : null}
            {invoice.dispatch.transportName ? (
              <InfoRow label="Transport" value={invoice.dispatch.transportName} />
            ) : null}
            {invoice.dispatch.lrNumber ? (
              <InfoRow label="LR Number" value={invoice.dispatch.lrNumber} />
            ) : null}
            {invoice.dispatch.dispatchDate && invoice.dispatch.dispatchDate !== '—' ? (
              <InfoRow label="Dispatch date" value={invoice.dispatch.dispatchDate} />
            ) : null}
            {invoice.dispatch.expectedDelivery && invoice.dispatch.expectedDelivery !== '—' ? (
              <InfoRow label="Expected delivery" value={invoice.dispatch.expectedDelivery} />
            ) : null}
            {invoice.dispatch.deliveredDate && invoice.dispatch.deliveredDate !== '—' ? (
              <InfoRow label="Delivered date" value={invoice.dispatch.deliveredDate} />
            ) : null}
            {invoice.dispatch.notes ? (
              <InfoRow label="Notes" value={invoice.dispatch.notes} />
            ) : null}

            <PrimaryButton
              icon="truck-fast-outline"
              onPress={() => navigation.navigate('DispatchDetail', { id: invoice.dispatchId })}
              style={styles.viewDispatchButton}
              title="View dispatch details"
              variant="outline"
            />
          </SurfaceCard>
        </>
      ) : invoice.dispatchId ? (
        <>
          <SectionHeader title="Linked Dispatch" />
          <SurfaceCard style={styles.cardSpacing}>
            <View style={styles.dispatchLinkHeader}>
              <View style={styles.dispatchLinkIcon}>
                <Icon color={colors.textMuted} name="truck-fast-outline" size={24} />
              </View>
              <View style={styles.flexText}>
                <Text style={styles.cardEyebrow}>DISPATCH</Text>
                <Text numberOfLines={1} style={styles.cardHeading}>
                  {invoice.dispatchId}
                </Text>
              </View>
            </View>
            <PrimaryButton
              icon="truck-fast-outline"
              onPress={() => navigation.navigate('DispatchDetail', { id: invoice.dispatchId })}
              style={styles.viewDispatchButton}
              title="View dispatch details"
              variant="outline"
            />
          </SurfaceCard>
        </>
      ) : null}

      {/* ── Payment history ── */}
      {(() => {
        // Merge backend payment_history (from fetched invoice) with any
        // payments recorded in this session (from local payments state).
        // Deduplicate by amount+date so a session payment that came back
        // from the server in a re-fetch isn't shown twice.
        const backendHistory = (invoice.paymentHistory || []);
        const sessionPayments = invoicePayments.map(p => ({
          amount:    p.amount,
          mode:      p.mode,
          reference: p.reference,
          note:      '',
          date:      p.date,
          by:        p.createdBy,
          status:    p.status,
          _local:    true,
        }));

        // Deduplicate: if a session payment matches a backend entry closely
        // (same amount + same date), prefer the backend entry.
        const dedupedSession = sessionPayments.filter(sp =>
          !backendHistory.some(bh =>
            bh.amount === sp.amount && bh.date === sp.date,
          ),
        );

        const allEntries = [...backendHistory, ...dedupedSession];

        return (
          <SurfaceCard style={styles.cardSpacing}>
            <Text style={styles.cardEyebrow}>PAYMENT HISTORY</Text>
            <Text style={styles.cardHeading}>
              {allEntries.length
                ? `${allEntries.length} payment${allEntries.length > 1 ? 's' : ''}`
                : 'No payments yet'}
            </Text>

            {allEntries.length === 0 ? (
              <View style={styles.payHistoryEmpty}>
                <Icon color={colors.textMuted} name="cash-remove" size={28} />
                <Text style={styles.payHistoryEmptyText}>
                  No payments have been recorded for this invoice.
                </Text>
              </View>
            ) : (
              allEntries.map((entry, idx) => {
                const isVerified = entry.status === 'VERIFIED' || entry.status === 'COLLECTED';
                const isLocal    = entry._local;
                const isLast     = idx === allEntries.length - 1;
                return (
                  <View key={`${entry.date}-${idx}`} style={styles.payHistoryRow}>
                    {/* Left: dot + connector */}
                    <View style={styles.payHistoryLeftCol}>
                      <View style={[
                        styles.payHistoryDot,
                        isVerified && styles.payHistoryDotDone,
                        isLocal && styles.payHistoryDotLocal,
                      ]}>
                        <Icon
                          color={isVerified ? colors.success : isLocal ? colors.warning : colors.textMuted}
                          name={isVerified ? 'check-decagram' : isLocal ? 'clock-outline' : 'cash-outline'}
                          size={15}
                        />
                      </View>
                      {!isLast && <View style={styles.payHistoryConnector} />}
                    </View>

                    {/* Right: amount + meta */}
                    <View style={[styles.payHistoryContent, !isLast && styles.payHistoryContentSpaced]}>
                      {/* Top row: amount + status badge */}
                      <View style={styles.payHistoryTopRow}>
                        <Text style={styles.payHistoryAmount}>
                          {formatCurrency(entry.amount)}
                        </Text>
                        <View style={[
                          styles.payHistoryBadge,
                          isLocal && styles.payHistoryBadgeLocal,
                          !isVerified && !isLocal && styles.payHistoryBadgePending,
                        ]}>
                          <Text style={[
                            styles.payHistoryBadgeText,
                            isLocal && styles.payHistoryBadgeTextLocal,
                            !isVerified && !isLocal && styles.payHistoryBadgeTextPending,
                          ]}>
                            {isLocal ? 'Pending sync' : (entry.status || 'COLLECTED').replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </View>

                      {/* Mode + date + by */}
                      <Text style={styles.payHistoryMeta}>
                        {[entry.mode, entry.date].filter(Boolean).join(' · ')}
                        {entry.by ? <Text style={styles.payHistoryBy}> · {entry.by}</Text> : null}
                      </Text>

                      {/* Reference */}
                      {entry.reference ? (
                        <Text style={styles.payHistoryRef}>Ref: {entry.reference}</Text>
                      ) : null}

                      {/* Note */}
                      {entry.note ? (
                        <Text style={styles.payHistoryNote}>{entry.note}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}

            {/* Running totals footer */}
            {allEntries.length > 0 && (
              <View style={styles.payHistoryFooter}>
                <View style={styles.payHistoryFooterRow}>
                  <Text style={styles.payHistoryFooterLabel}>Total paid</Text>
                  <Text style={styles.payHistoryFooterValue}>
                    {formatCurrency(invoice.paidAmount)}
                  </Text>
                </View>
                {invoice.balance > 0 && (
                  <View style={styles.payHistoryFooterRow}>
                    <Text style={[styles.payHistoryFooterLabel, { color: colors.danger }]}>
                      Balance remaining
                    </Text>
                    <Text style={[styles.payHistoryFooterValue, { color: colors.danger }]}>
                      {formatCurrency(invoice.balance)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </SurfaceCard>
        );
      })()}
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

const TimelineRow = ({ icon, label, value, done, pending, highlight }) => (
  <View style={styles.timelineRow}>
    <View style={[
      styles.timelineMarker,
      done && styles.timelineMarkerDone,
      highlight && styles.timelineMarkerHighlight,
      pending && styles.timelineMarkerPending
    ]}>
      <Icon 
        color={done ? colors.white : pending ? colors.textMuted : colors.primary} 
        name={done ? 'check-circle' : icon} 
        size={17} 
      />
    </View>
    <View style={styles.timelineText}>
      <Text style={[styles.timelineLabel, highlight && styles.timelineLabelHighlight]}>
        {label}
      </Text>
      <Text style={[styles.timelineValue, done && styles.timelineValueDone, pending && styles.timelineValuePending]}>
        {value || (pending ? 'Pending' : 'Not recorded')}
      </Text>
    </View>
  </View>
);

// ── Activity status-history timeline row ──────────────────────────────────────
// Used in the "Status history" card on the order detail screen.
// Shows status badge, timestamp, author and remarks as separate lines with a
// vertical connector between rows so it reads as a proper timeline.
const ActivityTimelineRow = ({ status, at, by, remarks, done, highlight, isLast }) => (
  <View style={styles.activityRow}>
    {/* Left column: icon + vertical connector */}
    <View style={styles.activityLeftCol}>
      <View style={[
        styles.activityMarker,
        done && styles.activityMarkerDone,
        highlight && styles.activityMarkerHighlight,
      ]}>
        <Icon
          color={highlight ? colors.white : done ? colors.success : colors.primary}
          name={highlight ? 'check-circle' : done ? 'check' : 'circle-medium'}
          size={16}
        />
      </View>
      {!isLast && <View style={styles.activityConnector} />}
    </View>

    {/* Right column: badge + meta + remarks */}
    <View style={[styles.activityContent, isLast && styles.activityContentLast]}>
      <View style={[
        styles.activityBadge,
        highlight && styles.activityBadgeHighlight,
        done && !highlight && styles.activityBadgeDone,
      ]}>
        <Text style={[
          styles.activityBadgeText,
          highlight && styles.activityBadgeTextHighlight,
          done && !highlight && styles.activityBadgeTextDone,
        ]}>
          {status}
        </Text>
      </View>
      {at ? (
        <Text style={styles.activityMeta}>
          {at}{by ? <Text style={styles.activityAuthor}> · {by}</Text> : null}
        </Text>
      ) : null}
      {remarks ? (
        <Text style={styles.activityRemarks}>{remarks}</Text>
      ) : null}
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

  // ── Dispatch link in invoice detail ────────────────────
  dispatchLinkHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  dispatchLinkIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  viewDispatchButton: { marginTop: spacing.lg },

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
  statusStepLabelPending: { color: colors.textMuted, fontWeight: typography.weights.medium },
  statusStepCurrent: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
    marginTop: 2,
  },
  // new unified timeline styles
  statusStepTextColSpaced: { paddingBottom: spacing.lg },
  statusStepRowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusActivePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusActivePillText: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    letterSpacing: 0.4,
  },
  statusStepMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    marginTop: 3,
  },
  statusStepMetaBy: {
    color: colors.navy,
    fontWeight: typography.weights.bold,
  },
  statusStepPending: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontStyle: 'italic',
    marginTop: 3,
  },
  // ── Cancelled state ──
  cancelledCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  cancelledIconRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelledIconWrap: {
    marginTop: 2,
  },
  cancelledTextCol: {
    flex: 1,
  },
  cancelledTitle: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  cancelledMeta: {
    color: colors.danger,
    fontSize: typography.sizes.caption,
    marginTop: 3,
    opacity: 0.85,
  },
  cancelledBy: {
    fontWeight: typography.weights.bold,
  },
  cancelledRemarks: {
    color: colors.danger,
    fontSize: typography.sizes.label,
    lineHeight: typography.lineHeights.body,
    marginTop: 4,
    opacity: 0.9,
  },
  cancelledPrior: {
    alignItems: 'center',
    borderTopColor: colors.danger,
    borderTopWidth: 0.5,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    opacity: 0.7,
    paddingTop: spacing.sm,
  },
  cancelledPriorText: {
    color: colors.danger,
    fontSize: typography.sizes.caption,
    flex: 1,
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
  timelineMarkerDone: { backgroundColor: colors.successSoft },
  timelineMarkerHighlight: { backgroundColor: colors.success },
  timelineMarkerPending: { backgroundColor: colors.surfaceSubtle },
  timelineText: { borderBottomColor: colors.divider, borderBottomWidth: 1, flex: 1, paddingVertical: spacing.sm },
  timelineLabel: { color: colors.textMuted, fontSize: typography.sizes.caption },
  timelineLabelHighlight: { color: colors.success, fontWeight: typography.weights.extraBold },
  timelineValue: { color: colors.navy, flexShrink: 1, fontSize: typography.sizes.label, fontWeight: typography.weights.bold, marginTop: 2 },
  timelineValueDone: { color: colors.success },
  timelineValuePending: { color: colors.textMuted, fontStyle: 'italic' },

  // ── ActivityTimelineRow styles ──
  activityRow: { flexDirection: 'row', alignItems: 'stretch' },
  activityLeftCol: { alignItems: 'center', marginRight: spacing.md, width: 32 },
  activityMarker: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 32,
    justifyContent: 'center',
    width: 32,
    zIndex: 1,
  },
  activityMarkerDone: { backgroundColor: colors.successSoft },
  activityMarkerHighlight: { backgroundColor: colors.success },
  activityConnector: {
    backgroundColor: colors.divider,
    flex: 1,
    marginVertical: 2,
    width: 2,
  },
  activityContent: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flex: 1,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  activityContentLast: { borderBottomWidth: 0 },
  activityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  activityBadgeDone: { backgroundColor: colors.successSoft },
  activityBadgeHighlight: { backgroundColor: colors.success },
  activityBadgeText: {
    color: colors.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  activityBadgeTextDone: { color: colors.success },
  activityBadgeTextHighlight: { color: colors.white },
  activityMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginBottom: 1,
  },
  activityAuthor: {
    color: colors.navy,
    fontWeight: typography.weights.bold,
  },
  activityRemarks: {
    color: colors.text,
    fontSize: typography.sizes.label,
    lineHeight: typography.lineHeights.body,
    marginTop: 2,
  },

  // ── Enhanced delivery display ──
  deliverySuccessBanner: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  dispatchDetailHeroDelivered: { backgroundColor: colors.successSoft, borderColor: colors.success, borderWidth: 1 },
  bigTruckIconDelivered: { backgroundColor: colors.success },
  // ── DispatchDetailScreen new styles ──
  ddHero: { marginTop: spacing.lg },
  ddHeroTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  ddHeroIcon: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: radius.round,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  ddHeroIconDone: { backgroundColor: colors.successSoft },
  ddHeroCode: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  ddHeroOrderRef: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  ddDivider: {
    backgroundColor: colors.divider,
    height: 1,
    marginVertical: spacing.md,
  },
  ddInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ddInfoItem: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm,
  },
  ddInfoLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  ddInfoValue: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  ddInfoUnit: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  ddDatesGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ddDateItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  ddDateLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    letterSpacing: 0.4,
  },
  ddDateValue: {
    color: colors.text,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  ddDateValueDone: { color: colors.success },
  ddTransportHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md },
  ddDriverRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  ddTransportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  ddTransportChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: '45%',
    padding: spacing.sm,
  },
  ddChipLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    letterSpacing: 0.4,
  },
  ddChipValue: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    marginTop: 1,
  },
  routeChipDelivered: { backgroundColor: colors.successSoft, borderColor: colors.success, borderWidth: 1 },
  
  deliverySummaryBox: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  deliverySummaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  deliverySummaryTitle: {
    color: colors.success,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  deliverySummaryDate: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  verifiedBadgeText: {
    color: colors.onNavy,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  timelineDivider: {
    backgroundColor: colors.divider,
    height: 1,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  timelineSubheading: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  deliveryNotesBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  deliveryNotes: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sizes.footnote,
    lineHeight: typography.lineHeights.body,
  },

  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    marginTop: spacing.md,
  },
  
  // Enhanced quantity grid in order list cards
  orderQuantityGrid: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  quantityGridItem: {
    alignItems: 'center',
    flex: 1,
  },
  quantityGridLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  quantityGridValue: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    marginTop: 2,
  },
  quantityGridValueActive: {
    color: colors.primary,
  },
  quantityGridValueSuccess: {
    color: colors.success,
  },
  
  // Partial delivery notice in order cards
  partialDeliveryNotice: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  partialDeliveryText: {
    color: colors.warning,
    flex: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },

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
  // ── Payment History timeline ──
  payHistoryRow: { flexDirection: 'row', alignItems: 'stretch' },
  payHistoryLeftCol: { alignItems: 'center', marginRight: spacing.md, width: 32 },
  payHistoryDot: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.round,
    height: 32,
    justifyContent: 'center',
    width: 32,
    zIndex: 1,
  },
  payHistoryDotDone:  { backgroundColor: colors.successSoft },
  payHistoryDotLocal: { backgroundColor: colors.warningSoft },
  payHistoryConnector: {
    backgroundColor: colors.divider,
    flex: 1,
    marginVertical: 2,
    width: 2,
  },
  payHistoryContent: {
    flex: 1,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  payHistoryContentSpaced: { paddingBottom: spacing.md },
  payHistoryTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 3,
  },
  payHistoryAmount: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    flex: 1,
  },
  payHistoryBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  payHistoryBadgeLocal:   { backgroundColor: colors.warningSoft },
  payHistoryBadgePending: { backgroundColor: colors.surfaceSubtle },
  payHistoryBadgeText: {
    color: colors.success,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  payHistoryBadgeTextLocal:   { color: colors.warning },
  payHistoryBadgeTextPending: { color: colors.textMuted },
  payHistoryMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  payHistoryBy: {
    color: colors.navy,
    fontWeight: typography.weights.bold,
  },
  payHistoryRef: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontStyle: 'italic',
    marginTop: 2,
  },
  payHistoryNote: {
    color: colors.text,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    marginTop: 2,
  },
  payHistoryEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  payHistoryEmptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    textAlign: 'center',
  },
  payHistoryFooter: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  payHistoryFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payHistoryFooterLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  payHistoryFooterValue: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
  },
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

  // ── OrderDetailScreen — new styles ──────────────────────────
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },

  // Assignment chip inside order hero
  assignmentChip: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  assignmentChipName: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
  },
  assignmentChipDate: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },

  // Payment summary 3-box grid
  paymentSummaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  paymentSummaryBox: {
    borderRadius: radius.md,
    flex: 1,
    padding: spacing.md,
  },
  paymentSummaryLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.5,
  },
  paymentSummaryValue: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    marginTop: spacing.xs,
  },
  paymentSummaryHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  paidFullBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  paidFullText: {
    color: colors.success,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
  },
  partialPayBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  partialPayText: {
    color: colors.warning,
    flex: 1,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.bold,
  },

  // Dispatch card inside OrderDetailScreen
  dispatchCardIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  dispatchMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  dispatchInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dispatchInfoItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  dispatchInfoText: {
    color: colors.navy,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  dispatchDates: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  dispatchDateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dispatchDateLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },
  dispatchDateValue: {
    color: colors.navy,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
    marginTop: 3,
    textAlign: 'center',
  },
  dispatchNotes: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  dispatchNotesText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sizes.caption,
    lineHeight: 17,
  },
  dispatchViewMore: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  dispatchViewMoreText: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
  odDispatchIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 36,
  },

  // Invoice card inside OrderDetailScreen
  odInvoiceCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  invoiceIcon: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 36,
  },
  odInvoiceId: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
  },
  invoiceMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  invoiceAmountRow: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  invoiceAmountItem: {
    flex: 1,
    alignItems: 'center',
  },
  invoiceAmountLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },
  invoiceAmountValue: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
    marginTop: 3,
  },
  paymentHistoryBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  paymentHistoryTitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  paymentHistoryRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  paymentHistoryText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sizes.caption,
    lineHeight: 17,
  },
  paymentHistoryItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  paymentHistoryItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  paymentHistorySeqBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  paymentHistorySeqText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: typography.weights.black,
  },
  paymentHistoryAmount: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  paymentHistoryStatus: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  paymentHistoryMetaLine: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 4,
  },
  paymentHistoryBalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  paymentHistoryBy: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  paymentHistoryBal: {
    color: colors.text,
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  payProgressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 6,
  },
  payProgressTrack: {
    backgroundColor: colors.divider,
    borderRadius: 6,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  payProgressFill: {
    borderRadius: 6,
    height: '100%',
  },
  payProgressLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  invoiceDueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  invoiceDueText: {
    color: colors.warning,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },

  // Collect action banner at bottom
  collectActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  collectActionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  collectActionTitle: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
  },
  collectActionSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  collectActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  collectActionBtnText: {
    color: colors.onNavy,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
});
