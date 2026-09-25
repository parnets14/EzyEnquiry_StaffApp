import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApp, useRefresh } from '../AppContext';
import {
  AppHeader,
  EmptyState,
  MetricCard,
  PrimaryButton,
  Screen,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from '../components';
import {
  colors,
  formatCurrency,
  radius,
  shadow,
  spacing,
  typography,
} from '../theme';

const initials = name => {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
};

const formatJoinDate = date => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

export const DashboardScreen = ({ navigation }) => {
  const {
    collections,
    customers,
    invoices,
    orders,
    quotations,
    staff,
    unreadCount,
  } = useApp();
  const { refreshing, onRefresh } = useRefresh();

  // ── Counts ──────────────────────────────────────────────────
  const pendingQuotations = quotations.filter(item => {
    const status = item.status?.toUpperCase() || '';
    return ['PENDING', 'RESPONDED', 'NEGOTIATION', 'DRAFT', 'SENT'].includes(status);
  }).length;

  const activeOrders = orders.filter(order => {
    const status = order.status?.toUpperCase() || '';
    return !['DELIVERED', 'CANCELLED'].includes(status);
  }).length;

  const holdOrders = orders.filter(order => (order.status?.toUpperCase() || '') === 'HOLD').length;
  const pendingInvoices = invoices.filter(invoice => invoice.balance > 0).length;
  const pendingCollections = collections.filter(c => c.status !== 'ACCOUNT_VERIFIED').length;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader
        avatar={(staff.name || 'S').charAt(0)}
        navigation={navigation}
        title={`Hello, ${(staff.name || 'there').split(' ')[0]}`}
        unreadCount={unreadCount}
      />

      {/* ── Overview Metrics ── */}
      <View style={styles.overviewHeader}>
        <Text style={styles.overviewTitle}>Overview</Text>
      </View>
      <View style={styles.metricsGrid}>
        <MetricCard
          icon="account-group-outline"
          label="Customers"
          onPress={() => navigation.navigate('Customers')}
          value={customers.length}
        />
        <MetricCard
          icon="file-document-outline"
          label="Open quotes"
          onPress={() => navigation.navigate('Quotations')}
          tone="navy"
          value={pendingQuotations}
        />
        <MetricCard
          icon="package-variant-closed"
          label="Active orders"
          onPress={() => navigation.navigate('Orders')}
          tone="navy"
          value={activeOrders}
        />
        <MetricCard
          icon="pause-circle-outline"
          label="On HOLD"
          onPress={() => navigation.navigate('Orders')}
          value={holdOrders}
        />
        <MetricCard
          icon="currency-inr"
          label="Unpaid invoices"
          onPress={() => navigation.navigate('Invoices')}
          value={pendingInvoices}
        />
        <MetricCard
          icon="hand-coin-outline"
          label="Pending collections"
          onPress={() => navigation.navigate('Collections')}
          tone="navy"
          value={pendingCollections}
        />
      </View>

      {/* ── Quick Actions ── */}
      <SectionHeader title="Quick actions" />
      <View style={styles.quickRow}>
        <QuickAction
          icon="account-plus-outline"
          label="Add Customer"
          onPress={() => navigation.navigate('CustomerForm')}
        />
        <QuickAction
          icon="file-plus-outline"
          label="New Quote"
          onPress={() => navigation.navigate('QuotationForm')}
        />
        <QuickAction
          icon="truck-fast-outline"
          label="Dispatches"
          onPress={() => navigation.navigate('Dispatches')}
        />
        <QuickAction
          icon="account-cash-outline"
          label="Collections"
          onPress={() => navigation.navigate('Collections')}
        />
      </View>

      {/* ── Recent Quotations ── */}
      <SectionHeader
        actionLabel="View all"
        onAction={() => navigation.navigate('Quotations')}
        title="Recent quotations"
      />
      {quotations.length ? (
        quotations.slice(0, 3).map(quotation => (
          <SurfaceCard
            accessibilityLabel={`Quotation ${quotation.id}, ${quotation.customerName}, ${formatCurrency(quotation.total)}`}
            key={quotation.id}
            onPress={() =>
              navigation.navigate('QuotationDetail', { id: quotation.id })
            }
            style={styles.quoteCard}>
            <View style={styles.quoteCardTop}>
              <View style={styles.quoteCardLeft}>
                <Text style={styles.quoteCardId}>{quotation.id}</Text>
                <Text numberOfLines={1} style={styles.quoteCardCustomer}>
                  {quotation.customerName}
                </Text>
              </View>
              <StatusPill status={quotation.status} />
            </View>
            <View style={styles.quoteCardBottom}>
              <View style={styles.quoteCardInfo}>
                <Text numberOfLines={1} style={styles.quoteCardProduct}>
                  {quotation.productName}
                </Text>
                <Text style={styles.quoteCardMeta}>
                  {quotation.quantity} {quotation.unit} · {quotation.createdByType === 'STAFF' ? 'Staff' : 'Retailer'}
                </Text>
              </View>
              <Text style={styles.quoteCardAmount}>
                {formatCurrency(quotation.total)}
              </Text>
            </View>
          </SurfaceCard>
        ))
      ) : (
        <EmptyState
          compact
          icon="file-document-edit-outline"
          message="Created quotations will appear here."
          title="No quotations yet"
        />
      )}

      {/* ── Recent Orders ── */}
      <SectionHeader
        actionLabel="View all"
        onAction={() => navigation.navigate('Orders')}
        title="Recent orders"
      />
      {orders.length ? (
        orders.slice(0, 2).map(order => (
          <SurfaceCard
            accessibilityLabel={`${order.id}, ${order.customerName}, ${formatCurrency(order.total)}`}
            key={order.id}
            onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            style={styles.orderCard}>
            <View style={styles.orderTop}>
              <View style={styles.orderHeading}>
                <Text style={styles.orderId}>{order.id}</Text>
                <Text numberOfLines={1} style={styles.orderCustomer}>
                  {order.customerName}
                </Text>
              </View>
              <StatusPill status={order.status} />
            </View>
            <View style={styles.orderBottom}>
              <View style={styles.orderDetails}>
                <Text numberOfLines={1} style={styles.orderProduct}>
                  {order.productName}
                </Text>
                <Text style={styles.orderQty}>
                  {order.quantity} {order.unit} · {order.wholesaler}
                </Text>
              </View>
              <Text style={styles.orderAmount}>
                {formatCurrency(order.total)}
              </Text>
            </View>
          </SurfaceCard>
        ))
      ) : (
        <EmptyState
          compact
          icon="clipboard-text-outline"
          message="New orders will appear here."
          title="No orders yet"
        />
      )}

    </Screen>
  );
};

export const NotificationsScreen = ({ navigation }) => {
  const {
    markAllNotificationsRead,
    markNotificationRead,
    deleteNotification,
    clearAllNotifications,
    notifications,
    unreadCount,
  } = useApp();

  const NOTIF_ICONS = {
    quotation: 'file-document-edit-outline',
    dispatch: 'truck-fast-outline',
    payment: 'cash-multiple',
    delivery: 'package-variant-closed',
    customer: 'account-plus-outline',
    collection: 'account-cash-outline',
    order: 'clipboard-text-outline',
  };

  const openNotification = notification => {
    markNotificationRead(notification.id);
    if (notification.route) {
      navigation.navigate(notification.route, { id: notification.entityId });
    }
  };

  const confirmDelete = notification => {
    Alert.alert('Delete notification?', notification.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNotification(notification.id),
      },
    ]);
  };

  const confirmClearAll = () => {
    Alert.alert(
      'Clear all notifications?',
      'This removes every notification from the list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: clearAllNotifications,
        },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={unreadCount ? `${unreadCount} unread` : 'All caught up'}
        title="Notifications"
      />

      {notifications.length ? (
        <>
          <View style={styles.notifActions}>
            <Pressable
              accessibilityLabel="Mark all as read"
              accessibilityRole="button"
              disabled={!unreadCount}
              onPress={markAllNotificationsRead}
              style={({ pressed }) => [
                styles.notifActionBtn,
                !unreadCount && styles.notifActionBtnDisabled,
                pressed && styles.notificationPressed,
              ]}>
              <Icon
                color={unreadCount ? colors.primary : colors.disabled}
                name="check-all"
                size={16}
              />
              <Text
                style={[
                  styles.notifActionText,
                  !unreadCount && styles.notifActionTextDisabled,
                ]}>
                Mark all read
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Clear all notifications"
              accessibilityRole="button"
              onPress={confirmClearAll}
              style={({ pressed }) => [
                styles.notifActionBtn,
                pressed && styles.notificationPressed,
              ]}>
              <Icon color={colors.danger} name="trash-can-outline" size={16} />
              <Text style={[styles.notifActionText, { color: colors.danger }]}>
                Clear all
              </Text>
            </Pressable>
          </View>

          <View style={styles.sectionBody}>
            {notifications.map(notification => (
              <View
                key={notification.id}
                style={[
                  styles.notification,
                  !notification.read && styles.notificationUnread,
                ]}>
                <Pressable
                  accessibilityHint="Opens the related record"
                  accessibilityLabel={`${notification.read ? 'Read' : 'Unread'} notification: ${notification.title}. ${notification.message}. ${notification.time}`}
                  accessibilityRole="button"
                  onPress={() => openNotification(notification)}
                  style={({ pressed }) => [
                    styles.notificationMain,
                    pressed && styles.notificationPressed,
                  ]}>
                  <View
                    style={[
                      styles.notificationIcon,
                      notification.read && styles.notificationIconRead,
                    ]}>
                    <Icon
                      color={notification.read ? colors.textMuted : colors.primary}
                      name={NOTIF_ICONS[notification.type] || 'bell-outline'}
                      size={20}
                    />
                  </View>
                  <View style={styles.notificationBody}>
                    <View style={styles.notificationTitleRow}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.notificationTitle,
                          notification.read && styles.notificationTitleRead,
                        ]}>
                        {notification.title}
                      </Text>
                      {!notification.read ? (
                        <View accessibilityLabel="Unread" style={styles.unreadDot} />
                      ) : null}
                    </View>
                    <Text numberOfLines={2} style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {notification.time}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Delete notification: ${notification.title}`}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => confirmDelete(notification)}
                  style={({ pressed }) => [
                    styles.notifDeleteBtn,
                    pressed && styles.notificationPressed,
                  ]}>
                  <Icon color={colors.textMuted} name="trash-can-outline" size={18} />
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.notificationsEmptyCard}>
          <EmptyState
            icon="bell-check-outline"
            message="You’re all caught up. New workflow updates will appear here."
            title="No notifications yet"
          />
        </View>
      )}
    </Screen>
  );
};

export const ProfileScreen = ({ navigation }) => {
  const { logout, staff, unreadCount } = useApp();

  const confirmLogout = () => {
    Alert.alert('Sign out?', 'You will return to the Staff login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <Screen
      footer={
        <PrimaryButton
          accessibilityLabel="Sign out of StaffApp"
          icon="logout"
          onPress={confirmLogout}
          title="Sign out"
          variant="outline"
        />
      }>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications
        title="My Profile"
        unreadCount={unreadCount}
      />

      {/* ── Profile Card ── */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(staff.name)}</Text>
        </View>
        <Text numberOfLines={2} style={styles.profileName}>
          {staff.name || 'Staff Member'}
        </Text>
        {staff.designation ? (
          <Text numberOfLines={1} style={styles.profileRole}>
            {staff.designation}
          </Text>
        ) : null}
        {staff.employeeCode ? (
          <View style={styles.employeeBadge}>
            <Icon color={colors.navy} name="identifier" size={14} />
            <Text style={styles.employeeBadgeText}>{staff.employeeCode}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Contact Info ── */}
      <SectionHeader title="Contact Information" />
      <SurfaceCard style={styles.infoCard}>
        <ProfileRow
          icon="domain"
          label="Company"
          value={staff.company || '—'}
        />
        <ProfileRow
          icon="briefcase-outline"
          label="Department"
          value={staff.department || '—'}
        />
        {staff.branch ? (
          <ProfileRow
            icon="office-building-outline"
            label="Branch"
            value={staff.branch}
          />
        ) : null}
        <ProfileRow
          icon="phone-outline"
          label="Mobile"
          value={staff.mobile ? `+91 ${staff.mobile}` : '—'}
        />
        <ProfileRow
          icon="email-outline"
          label="Email"
          value={staff.email || '—'}
        />
      </SurfaceCard>

      {/* ── Employment ── */}
      <SectionHeader title="Employment" />
      <SurfaceCard style={styles.infoCard}>
        <ProfileRow
          icon="shield-key-outline"
          label="Role Access"
          value={staff.roleAccess || staff.role || '—'}
        />
        <ProfileRow
          icon="calendar-check-outline"
          label="Joined"
          value={formatJoinDate(staff.joinDate)}
        />
        <ProfileRow
          icon="check-decagram-outline"
          label="Status"
          value={staff.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        />
      </SurfaceCard>

      {/* ── Salary & Incentive ── */}
      <SectionHeader title={`Salary & Incentive${staff.incentivePeriod ? ` · ${staff.incentivePeriod}` : ''}`} />
      <SurfaceCard style={styles.infoCard}>
        <ProfileRow
          icon="cash"
          label="Monthly Salary"
          value={Number(staff.salary) > 0 ? `₹ ${Number(staff.salary).toLocaleString('en-IN')}` : '—'}
        />
        <ProfileRow
          icon="chart-box-outline"
          label="My Sales (this month)"
          value={`₹ ${Number(staff.monthSales || 0).toLocaleString('en-IN')}`}
        />
        <ProfileRow
          icon="sale"
          label="Incentive Earned"
          value={`₹ ${Number(staff.incentiveAmount || 0).toLocaleString('en-IN')}${staff.incentivePct ? `  (${staff.incentivePct}%)` : ''}`}
        />
        {Array.isArray(staff.incentiveSlabs) && staff.incentiveSlabs.length > 0 ? (
          staff.incentiveSlabs.map((s, i) => (
            <ProfileRow
              key={i}
              icon="chart-line-variant"
              label={`Sales ≥ ₹${Number(s.sales_amount).toLocaleString('en-IN')}`}
              value={`${s.incentive_pct}% incentive`}
            />
          ))
        ) : (
          <ProfileRow
            icon="chart-line-variant"
            label="Incentive"
            value="No slabs configured"
          />
        )}
      </SurfaceCard>

      {/* ── App Info ── */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>EzyEnquiry Staff · v1.0</Text>
      </View>
    </Screen>
  );
};

const QuickAction = ({ icon, label, onPress }) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.quickAction,
      pressed && styles.quickActionPressed,
    ]}>
    <View style={styles.quickActionIcon}>
      <Icon color={colors.primary} name={icon} size={22} />
    </View>
    <Text numberOfLines={1} style={styles.quickActionLabel}>
      {label}
    </Text>
  </Pressable>
);

const ProfileRow = ({ icon, label, value }) => (
  <View style={styles.profileRow}>
    <View style={styles.profileRowIcon}>
      <Icon color={colors.navy} name={icon} size={19} />
    </View>
    <View style={styles.profileRowText}>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Text selectable style={styles.profileRowValue}>
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    ...shadow,
  },
  quickActionPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  quickActionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  quickActionLabel: {
    color: colors.navy,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  overviewHeader: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  overviewTitle: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extraBold,
  },
  sectionBody: { paddingHorizontal: spacing.lg },
  quoteCard: { marginBottom: spacing.sm },
  quoteCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quoteCardLeft: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  quoteCardId: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.black,
  },
  quoteCardCustomer: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extraBold,
    marginTop: 2,
  },
  quoteCardBottom: {
    alignItems: 'flex-end',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  quoteCardInfo: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  quoteCardProduct: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  quoteCardMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  quoteCardAmount: {
    color: colors.navy,
    flexShrink: 0,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
  },
  orderCard: { marginBottom: spacing.sm },
  orderTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderHeading: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  orderId: {
    color: colors.primary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.label,
  },
  orderCustomer: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extraBold,
    lineHeight: typography.lineHeights.body,
    marginTop: spacing.xs,
  },
  orderBottom: {
    alignItems: 'flex-end',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  orderDetails: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  orderProduct: {
    color: colors.text,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.label,
  },
  orderQty: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginTop: spacing.xs,
  },
  orderAmount: {
    color: colors.navy,
    flexShrink: 0,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.subtitle,
  },
  notifActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  notifActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  notifActionBtnDisabled: { opacity: 0.55 },
  notifActionText: {
    color: colors.primary,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.extraBold,
  },
  notifActionTextDisabled: { color: colors.disabled },
  notification: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  notificationUnread: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  notificationPressed: { opacity: 0.82 },
  notificationMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    padding: spacing.md,
  },
  notificationIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  notificationIconRead: { backgroundColor: colors.neutralSoft },
  notificationBody: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  notificationTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  notificationTitle: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.black,
  },
  notificationTitleRead: {
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: spacing.sm,
    marginLeft: spacing.sm,
    width: spacing.sm,
  },
  notificationMessage: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: typography.sizes.footnote,
    lineHeight: typography.lineHeights.footnote,
    marginTop: 3,
  },
  notificationTime: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
  },
  notifDeleteBtn: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  notificationsEmptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    ...shadow,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.round,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarText: {
    color: colors.onNavy,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
  },
  profileName: {
    color: colors.navy,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.title,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  profileRole: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    lineHeight: typography.lineHeights.label,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  employeeBadge: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: radius.round,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  employeeBadgeText: {
    color: colors.navy,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    marginLeft: spacing.xs,
  },
  infoCard: { marginTop: 0 },
  profileRow: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 66,
    paddingVertical: spacing.md,
  },
  profileRowIcon: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: radius.sm,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  profileRowText: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  profileRowLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
  },
  profileRowValue: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.label,
    marginTop: spacing.xs,
  },
  permissionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  permissionIcon: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.round,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  permissionText: {
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.medium,
    lineHeight: typography.lineHeights.label,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  appInfoText: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
  },
});
