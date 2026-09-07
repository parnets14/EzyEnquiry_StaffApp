import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApp, useRefresh } from '../AppContext';
import {
  AppHeader,
  ChoiceChips,
  EmptyState,
  InfoRow,
  NoticeBanner,
  PrimaryButton,
  Screen,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  TextField,
} from '../components';
import { OTP_PURPOSES } from '../constants';
import { colors, formatCurrency, radius, shadow, spacing } from '../theme';

// ─────────────────────────────────────────────────────────────────
// COLLECTIONS LIST
// ─────────────────────────────────────────────────────────────────
export const CollectionsScreen = ({ navigation }) => {
  const { collections, staff } = useApp();
  const { refreshing, onRefresh } = useRefresh();
  const [filter, setFilter] = useState('PENDING');

  // Debug logging
  console.log('CollectionsScreen - Staff ID:', staff?.id);
  console.log('CollectionsScreen - Total collections:', collections.length);
  
  const staffCollections = collections.filter(
    item => item.staffId === staff.id || item.staffId === null,
  );
  
  console.log('CollectionsScreen - Staff collections:', staffCollections.length);
  
  const visible = staffCollections.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'VERIFIED') return item.status === 'ACCOUNT_VERIFIED';
    return item.status !== 'ACCOUNT_VERIFIED';
  });
  
  console.log('CollectionsScreen - Visible (filtered):', visible.length, 'Filter:', filter);
  
  const pendingAmount = staffCollections
    .filter(item => item.status !== 'ACCOUNT_VERIFIED')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalCollected = staffCollections.reduce((s, i) => s + i.amount, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle="Staff collection & Accounts handover"
        title="Collections"
      />

      <View style={s.heroCard}>
        <View style={s.heroRow}>
          <View style={s.heroIconBox}>
            <Icon color={colors.primary} name="cash-multiple" size={22} />
          </View>
          <View style={s.heroTextWrap}>
            <Text style={s.heroLabel}>PENDING HANDOVER</Text>
            <Text style={s.heroAmount}>{formatCurrency(pendingAmount)}</Text>
          </View>
        </View>
        <View style={s.heroStatsRow}>
          <HeroStat value={staffCollections.length} label={'TOTAL\nRECORDS'} />
          <View style={s.heroDivider} />
          <HeroStat
            value={
              staffCollections.filter(i => i.status === 'ACCOUNT_VERIFIED')
                .length
            }
            label={'VERIFIED\nDONE'}
          />
          <View style={s.heroDivider} />
          <HeroStat
            value={formatCurrency(totalCollected)}
            label={'TOTAL\nCOLLECTED'}
          />
        </View>
      </View>

      <View style={s.filterRow}>
        <ChoiceChips
          onChange={setFilter}
          options={['PENDING', 'VERIFIED', 'ALL']}
          value={filter}
        />
      </View>

      <SectionHeader title={`${visible.length} collection records`} />

      {visible.length ? (
        visible.map(collection => (
          <Pressable
            key={collection.id}
            accessibilityHint="Opens collection details"
            accessibilityLabel={`${collection.id}, ${collection.customerName}, ${formatCurrency(collection.amount)}, status ${collection.status.replace(/_/g, ' ')}`}
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('CollectionDetail', { id: collection.id })
            }
            style={({ pressed }) => [s.card, pressed && s.cardPressed]}>
            <View style={s.cardStripe} />
            <View style={s.cardBody}>
              <View style={s.cardTopRow}>
                <View style={s.flex1Min}>
                  <Text style={s.cardId}>{collection.id}</Text>
                  <Text style={s.cardCustomer}>{collection.customerName}</Text>
                </View>
                <StatusPill status={collection.status} />
              </View>
              <View style={s.cardMid}>
                <View style={s.flex1Min}>
                  <Row icon="text-box-outline" text={collection.invoiceId} />
                  <Row
                    icon="credit-card-outline"
                    text={`${collection.mode} · ${collection.paymentId}`}
                  />
                </View>
                <Text style={s.cardAmount}>
                  {formatCurrency(collection.amount)}
                </Text>
              </View>
              <View style={s.cardFooter}>
                <Text style={s.cardFooterText}>{collection.staffName}</Text>
                <Text style={s.cardFooterText}>{collection.collectedAt}</Text>
              </View>
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState
          compact
          icon="cash-check"
          message="No collection records match this status."
          title="No collections found"
        />
      )}
    </Screen>
  );
};

// ─────────────────────────────────────────────────────────────────
// COLLECTION FORM
// ─────────────────────────────────────────────────────────────────
export const CollectionFormScreen = ({ navigation, route }) => {
  const { invoices, recordCollection } = useApp();
  const invoice = invoices.find(item => item.id === route.params?.invoiceId);
  const [mode, setMode] = useState('CASH');
  const [amount, setAmount] = useState(String(invoice?.balance || ''));
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  if (!invoice) {
    return <MissingRecord navigation={navigation} title="Invoice not found" />;
  }

  const submit = () => {
    const result = recordCollection({
      invoiceId: invoice.id,
      amount: Number(amount),
      mode,
      reference,
    });
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigation.replace('CollectionDetail', {
      id: result.collection.id,
      created: true,
    });
  };

  return (
    <Screen
      footer={
        <PrimaryButton
          icon="cash-plus"
          onPress={submit}
          title="Record customer collection"
        />
      }
      footerStyle={s.formFooter}
      keyboardAvoiding>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle="Customer + Invoice + Payment linked"
        title="Record collection"
      />

      <View style={s.formBanner}>
        <View style={s.formBannerIcon}>
          <Icon color={colors.primary} name="text-box-outline" size={20} />
        </View>
        <View style={s.formBannerBody}>
          <Text style={s.formBannerId}>{invoice.id}</Text>
          <Text style={s.formBannerCustomer}>{invoice.customerName}</Text>
        </View>
        <View style={s.formBannerRight}>
          <Text style={s.formBannerLabel}>BALANCE</Text>
          <Text style={s.formBannerValue}>
            {formatCurrency(invoice.balance)}
          </Text>
        </View>
      </View>

      <View style={s.formContent}>
        <Text style={s.fieldLabel}>Payment mode</Text>
        <ChoiceChips
          onChange={setMode}
          options={['CASH', 'UPI', 'BANK TRANSFER', 'CHEQUE']}
          value={mode}
        />
        <TextField
          error={error}
          keyboardType="number-pad"
          label="Amount collected"
          onChangeText={value => {
            setAmount(value.replace(/\D/g, ''));
            setError('');
          }}
          placeholder="0"
          prefix="₹"
          required
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

        <NoticeBanner
          message="This records the collection. You must then hand it over to Accounts. Accounts verification will trigger a separate Staff OTP."
          style={s.formNotice}
          title="What happens next?"
        />
      </View>
    </Screen>
  );
};

// ─────────────────────────────────────────────────────────────────
// COLLECTION DETAIL
// ─────────────────────────────────────────────────────────────────
export const CollectionDetailScreen = ({ navigation, route }) => {
  const { collections, invoices, otpChallenge, payments } = useApp();
  const collection = collections.find(item => item.id === route.params?.id);

  if (!collection) {
    return <MissingRecord navigation={navigation} title="Collection not found" />;
  }

  const invoice = invoices.find(item => item.id === collection.invoiceId);
  const payment = payments.find(item => item.id === collection.paymentId);
  const isVerifying = collection.status === 'ACCOUNT_VERIFICATION';
  const isVerified  = collection.status === 'ACCOUNT_VERIFIED';
  // Whether an active OTP challenge exists for this collection (no static code —
  // the accountant simply reads this screen as confirmation).
  const hasActiveChallenge =
    isVerifying &&
    otpChallenge?.purpose === OTP_PURPOSES.PAYMENT_COLLECTION &&
    otpChallenge?.collectionId === collection.id;

  return (
    <Screen>
      <AppHeader
        navigation={navigation}
        showBack
        showNotifications={false}
        subtitle={`Invoice ${collection.invoiceId}`}
        title={collection.id}
      />

      {route.params?.created ? (
        <NoticeBanner
          message="Payment recorded. Admin/Accounts will verify whether the amount was received."
          style={s.detailNotice}
          tone="success"
        />
      ) : null}

      <View style={s.detailHero}>
        <View style={s.detailHeroTop}>
          <View style={s.detailHeroBadge}>
            <Icon color={colors.primary} name="cash-multiple" size={20} />
          </View>
          <View style={s.detailHeroTextWrap}>
            <Text style={s.detailHeroLabel}>COLLECTION AMOUNT</Text>
            <Text numberOfLines={1} style={s.detailHeroAmount}>
              {formatCurrency(collection.amount)}
            </Text>
          </View>
          <StatusPill status={collection.status} />
        </View>
        <View style={s.detailHeroFooter}>
          <View style={s.detailHeroCustomerAvatar}>
            <Text style={s.detailHeroCustomerAvatarText}>
              {(collection.customerName || '?').charAt(0)}
            </Text>
          </View>
          <View style={s.flex1Min}>
            <Text numberOfLines={1} style={s.detailHeroCustomer}>
              {collection.customerName}
            </Text>
            <Text style={s.detailHeroCollId}>{collection.id}</Text>
          </View>
        </View>
      </View>

      <SurfaceCard style={s.surfaceCard}>
        <Text accessibilityRole="header" style={s.sectionTitle}>
          Collection details
        </Text>
        <InfoRow label="Payment" value={collection.paymentId} />
        <InfoRow label="Invoice" value={collection.invoiceId} />
        <InfoRow label="Sales order" value={collection.orderId} />
        <InfoRow label="Mode" value={collection.mode} />
        <InfoRow label="Reference" value={collection.reference} />
        <InfoRow label="Collected by" value={collection.staffName} />
        <InfoRow label="Collected at" value={collection.collectedAt} />
      </SurfaceCard>

      <SurfaceCard style={s.surfaceCard}>
        <Text accessibilityRole="header" style={s.sectionTitle}>
          Verification timeline
        </Text>
        <TimelineStep
          active
          complete
          label="Payment recorded by staff"
          value={collection.collectedAt}
        />
        <TimelineStep
          active={isVerifying || isVerified}
          complete={isVerified}
          label="Admin / Accounts verifying"
          value={
            isVerified
              ? 'Verification requested'
              : isVerifying
                ? 'In progress — share OTP with accountant'
                : 'Waiting for Admin to verify'
          }
        />
        <TimelineStep
          active={isVerified}
          complete={isVerified}
          label="Amount verified"
          value={collection.verifiedAt || 'Pending verification'}
        />
      </SurfaceCard>

      {invoice ? (
        <View style={s.balanceStrip}>
          <View style={s.balanceStripItem}>
            <Text style={s.balanceStripLabel}>INVOICE BALANCE</Text>
            <Text style={s.balanceStripValue}>
              {formatCurrency(invoice.balance)}
            </Text>
          </View>
          <View style={s.balanceStripDivider} />
          <View style={s.balanceStripItem}>
            <Text style={s.balanceStripLabel}>PAYMENT STATUS</Text>
            <Text style={s.balanceStripStatus}>{payment?.status}</Text>
          </View>
        </View>
      ) : null}

      {hasActiveChallenge ? (
        <View style={s.otpShareCard}>
          <View style={s.otpShareHeader}>
            <Icon color={colors.primary} name="shield-key-outline" size={20} />
            <Text style={s.otpShareTitle}>Accounts verification in progress</Text>
          </View>
          <Text style={s.otpShareSub}>
            Show this screen to the accountant as confirmation that{' '}
            <Text style={{ fontWeight: '800' }}>{formatCurrency(collection.amount)}</Text>{' '}
            was received for {collection.invoiceId}. The accountant will enter the
            6-digit code sent to your registered mobile to complete verification.
          </Text>
          <View style={s.otpShareNote}>
            <Icon color={colors.textMuted} name="information-outline" size={14} />
            <Text style={s.otpShareNoteText}>
              Keep this screen open until the accountant confirms the code.
            </Text>
          </View>
        </View>
      ) : null}

      {isVerified ? (
        <NoticeBanner
          icon="check-decagram-outline"
          message="Admin/Accounts confirmed the amount. The ledger is updated."
          style={s.detailNotice}
          title="Payment verified"
          tone="success"
        />
      ) : !verificationOtp ? (
        <View style={s.awaitNote}>
          <Icon color={colors.textMuted} name="clock-outline" size={16} />
          <Text style={s.awaitNoteText}>
            Waiting for Admin/Accounts to verify this payment. No action is
            needed from you here.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
};

// ─────────────────────────────────────────────────────────────────
// COLLECTION OTP
// ─────────────────────────────────────────────────────────────────
export const CollectionOtpScreen = ({ navigation, route }) => {
  const inputRef = useRef(null);
  const { collections, otpChallenge, verifyCollectionOtp } = useApp();
  const collection = collections.find(item => item.id === route.params?.id);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  if (!collection) {
    return <MissingRecord navigation={navigation} title="Collection not found" />;
  }

  const verify = () => {
    const result = verifyCollectionOtp(collection.id, otp);
    if (!result.success) {
      setError(result.message);
      return;
    }
    Alert.alert(
      'Accounts handover verified',
      `${collection.id} is now ACCOUNT VERIFIED.`,
      [
        {
          text: 'View collection',
          onPress: () =>
            navigation.popTo('CollectionDetail', { id: collection.id }),
        },
      ],
    );
  };

  const correctPurpose =
    otpChallenge?.purpose === OTP_PURPOSES.PAYMENT_COLLECTION &&
    otpChallenge?.collectionId === collection.id;
  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={s.otpSafe}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />

      <View style={s.otpNavBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => navigation.goBack()}
          style={s.otpNavBack}>
          <Icon color={colors.surface} name="arrow-left" size={20} />
        </Pressable>
        <Text accessibilityRole="header" style={s.otpNavTitle}>
          Collection OTP
        </Text>
        <View style={s.otpNavPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.otpKeyboard}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={s.otpBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={s.otpIconCircle}>
            <Icon
              color={colors.primary}
              name="account-cash-outline"
              size={32}
            />
          </View>
          <Text accessibilityRole="header" style={s.otpTitle}>
            Confirm Accounts handover
          </Text>
          <Text style={s.otpPurpose}>
            {OTP_PURPOSES.PAYMENT_COLLECTION}
          </Text>
          <Text style={s.otpCollId}>{collection.id}</Text>

          <Pressable
            accessibilityHint="Opens the number keyboard to enter the code"
            accessibilityLabel="Six digit payment collection OTP"
            accessibilityRole="button"
            accessibilityValue={{
              text: otp.length
                ? `${otp.length} of 6 digits entered`
                : 'No digits entered',
            }}
            onPress={() => inputRef.current?.focus()}
            style={s.otpBoxRow}>
            {[0, 1, 2, 3, 4, 5].map(index => (
              <View
                key={index}
                importantForAccessibility="no"
                style={[
                  s.otpBox,
                  otp.length === index && s.otpBoxActive,
                  otp[index] && s.otpBoxFilled,
                ]}>
                <Text style={s.otpDigit}>{otp[index] || ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={inputRef}
            accessible={false}
            autoComplete="one-time-code"
            autoFocus
            caretHidden
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={value => {
              setOtp(value.replace(/\D/g, ''));
              setError('');
            }}
            style={s.hiddenInput}
            textContentType="oneTimeCode"
            value={otp}
          />

          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={s.otpError}>
              {error}
            </Text>
          ) : null}

          <PrimaryButton
            disabled={otp.length !== 6 || !correctPurpose}
            icon="check-decagram"
            onPress={verify}
            style={s.otpVerifyBtn}
            title="Verify Accounts handover"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────
const HeroStat = ({ value, label }) => (
  <View style={s.heroStatItem}>
    <Text style={s.heroStatValue}>{value}</Text>
    <Text style={s.heroStatLabel}>{label}</Text>
  </View>
);

const Row = ({ icon, text }) => (
  <View style={s.metaRow}>
    <Icon color={colors.textMuted} name={icon} size={13} />
    <Text style={s.metaRowText}>{text}</Text>
  </View>
);

const TimelineStep = ({ active, complete, label, value }) => {
  const state = complete ? 'completed' : active ? 'current' : 'pending';

  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${state}, ${value}`}
      style={s.tlStep}>
      <View importantForAccessibility="no-hide-descendants" style={s.tlDotCol}>
        <View style={[s.tlDot, active && s.tlDotActive, complete && s.tlDotDone]}>
          {complete ? (
            <Icon color={colors.surface} name="check" size={12} />
          ) : null}
        </View>
        <View style={[s.tlLine, complete && s.tlLineDone]} />
      </View>
      <View style={s.tlContent}>
        <Text style={[s.tlLabel, active && s.tlLabelActive]}>{label}</Text>
        <Text style={s.tlValue}>{value}</Text>
      </View>
    </View>
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
      compact
      icon="alert-circle-outline"
      message="This collection record is not available."
      title={title}
    />
  </Screen>
);

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Hero (white card) ──
  heroCard: { backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, ...shadow },
  heroRow: { alignItems: 'center', flexDirection: 'row' },
  heroIconBox: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  heroTextWrap: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  heroLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  heroAmount: { color: colors.navy, flexShrink: 1, fontSize: 26, fontWeight: '900', marginTop: 2 },
  heroStatsRow: { backgroundColor: colors.surfaceSubtle, borderRadius: radius.md, flexDirection: 'row', marginTop: spacing.lg, paddingVertical: spacing.md },
  heroDivider: { backgroundColor: colors.border, marginVertical: spacing.sm, width: 1 },
  heroStatItem: { alignItems: 'center', flex: 1, minWidth: 0, paddingHorizontal: 2 },
  heroStatValue: { color: colors.navy, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  heroStatLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.3, lineHeight: 15, marginTop: 3, textAlign: 'center' },

  // ── Filters ──
  filterRow: { paddingHorizontal: spacing.lg },

  // ── List Card ──
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: 'row', marginBottom: spacing.md, marginHorizontal: spacing.lg, overflow: 'hidden', ...shadow },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  cardStripe: { backgroundColor: colors.navy, width: 4 },
  cardBody: { flex: 1, minWidth: 0, padding: spacing.md },
  cardTopRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  cardId: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
  cardCustomer: { color: colors.navy, flexShrink: 1, fontSize: 14, fontWeight: '800', marginTop: 2 },
  cardMid: { alignItems: 'flex-end', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm },
  cardAmount: { color: colors.navy, flexShrink: 1, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', marginTop: spacing.sm },
  cardFooterText: { color: colors.textMuted, flexShrink: 1, fontSize: 11, fontWeight: '600' },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: 3 },
  metaRowText: { color: colors.textMuted, flexShrink: 1, fontSize: 11, fontWeight: '600' },

  // ── Form Banner ──
  formBanner: { alignItems: 'center', backgroundColor: colors.navy, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  formBannerIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, height: 42, justifyContent: 'center', width: 42 },
  formBannerBody: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  formBannerId: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  formBannerCustomer: { color: colors.surface, flexShrink: 1, fontSize: 12, fontWeight: '700', marginTop: 2 },
  formBannerRight: { alignItems: 'flex-end', flexShrink: 1, marginLeft: spacing.sm, minWidth: 0 },
  formBannerLabel: { color: colors.onNavyMuted, fontSize: 11, fontWeight: '800' },
  formBannerValue: { color: colors.surface, flexShrink: 1, fontSize: 17, fontWeight: '900', marginTop: 2, textAlign: 'right' },

  // ── Form Body ──
  formContent: { padding: spacing.lg },
  formFooter: { backgroundColor: colors.surface },
  fieldLabel: { color: colors.navy, fontSize: 13, fontWeight: '800', marginBottom: spacing.sm },
  formNotice: { marginTop: spacing.xs },

  // ── Detail Hero (white card) ──
  detailHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  detailHeroTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  detailHeroBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  detailHeroTextWrap: { flex: 1, minWidth: 0 },
  detailHeroLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  detailHeroAmount: { color: colors.primary, flexShrink: 1, fontSize: 26, fontWeight: '900', marginTop: 2 },
  detailHeroFooter: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  detailHeroCustomerAvatar: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: radius.round,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  detailHeroCustomerAvatarText: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  detailHeroCustomer: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  detailHeroCollId: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 1 },

  // ── Surface Cards ──
  surfaceCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { color: colors.navy, fontSize: 14, fontWeight: '900', marginBottom: spacing.sm },

  // ── Timeline ──
  tlStep: { flexDirection: 'row', minHeight: 58 },
  tlDotCol: { alignItems: 'center', width: 24 },
  tlDot: { alignItems: 'center', backgroundColor: colors.border, borderRadius: radius.round, height: 22, justifyContent: 'center', width: 22 },
  tlDotActive: { backgroundColor: colors.warning },
  tlDotDone: { backgroundColor: colors.success },
  tlLine: { backgroundColor: colors.border, flex: 1, marginVertical: 3, width: 2 },
  tlLineDone: { backgroundColor: colors.success },
  tlContent: { flex: 1, marginLeft: spacing.md, minWidth: 0, paddingBottom: spacing.md },
  tlLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  tlLabelActive: { color: colors.navy, fontWeight: '800' },
  tlValue: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  // ── Balance Strip ──
  balanceStrip: { backgroundColor: colors.navySoft, borderRadius: radius.md, flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.lg, overflow: 'hidden' },
  balanceStripItem: { flex: 1, minWidth: 0, padding: spacing.md },
  balanceStripDivider: { backgroundColor: colors.border, width: 1 },
  balanceStripLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  balanceStripValue: { color: colors.navy, flexShrink: 1, fontSize: 16, fontWeight: '900', marginTop: 3 },
  balanceStripStatus: { color: colors.primaryDark, flexShrink: 1, fontSize: 11, fontWeight: '900', marginTop: 4 },

  // ── Actions and notices ──
  actionBtn: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  detailNotice: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  otpShareCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  otpShareHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  otpShareTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  otpShareSub: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  otpShareCodeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  otpShareDigitBox: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 54,
    justifyContent: 'center',
    width: 44,
  },
  otpShareDigit: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  otpShareNote: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  otpShareNoteText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  awaitNote: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  awaitNoteText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  // ── OTP Screen ──
  otpSafe: { backgroundColor: colors.background, flex: 1 },
  otpNavBar: { alignItems: 'center', backgroundColor: colors.navy, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  otpNavBack: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  otpNavPlaceholder: { height: 44, width: 44 },
  otpNavTitle: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  otpKeyboard: { flex: 1 },
  otpBody: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  otpIconCircle: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 72, justifyContent: 'center', width: 72 },
  otpTitle: { color: colors.navy, fontSize: 22, fontWeight: '900', marginTop: spacing.xl, textAlign: 'center' },
  otpPurpose: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: spacing.xs, textAlign: 'center' },
  otpCollId: { backgroundColor: colors.navySoft, borderRadius: radius.sm, color: colors.navy, fontSize: 12, fontWeight: '900', marginTop: spacing.sm, overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  otpBoxRow: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.xxxl, maxWidth: 320, width: '100%' },
  otpBox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, flex: 1, height: 54, justifyContent: 'center', maxWidth: 44, minWidth: 0 },
  otpBoxActive: { borderColor: colors.primary, borderWidth: 2 },
  otpBoxFilled: { backgroundColor: colors.navySoft, borderColor: colors.navy },
  otpDigit: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  hiddenInput: { height: 1, opacity: 0, position: 'absolute', width: 1 },
  otpError: { color: colors.danger, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
  otpVerifyBtn: { marginTop: spacing.xl, width: '100%' },
  flex1Min: { flex: 1, minWidth: 0 },
});
