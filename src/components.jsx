import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  controlSizes,
  radius,
  shadow,
  spacing,
  statusColors,
  typography,
} from './theme';

const bottomPaddingFromStyle = style => {
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const paddingBottom =
    flattenedStyle.paddingBottom ??
    flattenedStyle.paddingVertical ??
    flattenedStyle.padding ??
    0;

  return typeof paddingBottom === 'number' ? paddingBottom : 0;
};

// Lets any TextField inside a Screen ask the ScrollView to reveal it above
// the keyboard when it gains focus.
const ScreenScrollContext = createContext(null);

export const BrandLogo = ({ compact = false }) => (
  <Image
    source={require('./assets/logo.jpeg')}
    resizeMode="contain"
    style={compact ? styles.logoCompact : styles.logo}
  />
);

export const Screen = ({
  children,
  scroll = true,
  contentContainerStyle,
  style,
  keyboardAvoiding = false,
  footer,
  footerStyle,
  refreshing = false,
  onRefresh,
}) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, e => {
      const h = e?.endCoordinates?.height || 0;
      keyboardHeightRef.current = h;
      setKeyboardHeight(h);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Extra space so the last fields can always scroll clear of the footer.
  // On Android, the OS shrinks the window when the keyboard opens (adjustResize),
  // so we do NOT add keyboard height to the scroll padding — the window is
  // already smaller. On iOS we need to add it manually.
  const keyboardInset = keyboardHeight > 0 && Platform.OS === 'ios'
    ? keyboardHeight + spacing.xl
    : 0;
  const safeBottomStyle = {
    paddingBottom:
      bottomPaddingFromStyle(contentContainerStyle) +
      (footer
        ? spacing.lg
        : spacing.xxxl + Math.max(insets.bottom, spacing.sm)) +
      keyboardInset,
  };

  // Reveal a focused field above the keyboard. We measure the real ScrollView
  // viewport; if adjustResize already shrank it, the keyboard height is 0 in
  // this calculation. If it did not shrink, we subtract the reported keyboard
  // height so the field still lands above the keypad.
  const revealInput = inputRef => {
    if (!scroll || !scrollRef.current || !inputRef?.current) {
      return;
    }

    const measureAndReveal = () => {
      scrollRef.current?.measureInWindow?.(
        (scrollX, scrollY, scrollWidth, scrollHeight) => {
          if (typeof scrollY !== 'number' || scrollHeight <= 0) {
            return;
          }

          inputRef.current?.measureInWindow?.((x, y, width, height) => {
            if (typeof y !== 'number' || height <= 0) {
              return;
            }

            const { height: windowHeight } = Dimensions.get('window');
            const kb = keyboardHeightRef.current;
            const gap = spacing.lg;
            // Bottom of the scroll viewport as it appears on screen.
            const scrollViewportBottom = scrollY + scrollHeight;
            // Where the keyboard's top edge sits on screen.
            const keyboardTop = windowHeight - kb;
            // The visible bottom is whichever is higher: the viewport bottom
            // (when resize shrank it) or the keyboard top (when it did not).
            const visibleBottom = Math.min(scrollViewportBottom, keyboardTop) - gap;
            const visibleTop = scrollY + gap;
            const fieldBottom = y + height;
            let delta = 0;

            if (fieldBottom > visibleBottom) {
              delta = fieldBottom - visibleBottom;
            } else if (y < visibleTop) {
              delta = y - visibleTop;
            }

            if (Math.abs(delta) > 1) {
              scrollRef.current?.scrollTo({
                y: Math.max(0, scrollYRef.current + delta),
                animated: true,
              });
            }
          });
        },
      );
    };

    // The first pass handles an already-resized viewport; the second catches
    // devices whose IME resize/height report finishes just after focus.
    measureAndReveal();
    setTimeout(measureAndReveal, 180);
  };

  // Keep the header in a dedicated non-scrolling layer. The fallback checks
  // also survive React memo wrappers and Fast Refresh component identities.
  const childArray = React.Children.toArray(children);
  const firstChildType = childArray[0]?.type;
  const hasHeader =
    firstChildType === AppHeader ||
    firstChildType?.type === AppHeader ||
    firstChildType?.displayName === 'AppHeader';
  const headerChild = hasHeader ? childArray[0] : null;
  const bodyChildren = hasHeader ? childArray.slice(1) : childArray;

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.screenContent,
        contentContainerStyle,
        safeBottomStyle,
      ]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      onScroll={e => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      style={styles.screenBody}>
      {bodyChildren}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.screenBody,
        styles.screenContent,
        styles.fill,
        contentContainerStyle,
        safeBottomStyle,
      ]}>
      {bodyChildren}
    </View>
  );

  const keyboardOptions =
    keyboardAvoiding && typeof keyboardAvoiding === 'object'
      ? keyboardAvoiding
      : {};
  const { style: keyboardStyle, ...keyboardProps } = keyboardOptions;

  const pageContent = (
    <>
      {headerChild ? (
        <View style={styles.fixedHeader}>{headerChild}</View>
      ) : null}
      {content}
      {footer ? (
        <StickyActionBar keyboardHeight={keyboardHeight} style={footerStyle}>
          {footer}
        </StickyActionBar>
      ) : null}
    </>
  );

  // KeyboardAvoidingView only on iOS — Android uses adjustResize in AndroidManifest.
  // On Android, wrapping in KAV with behavior="height" collapses the layout and
  // shows the navy SafeAreaView background behind the form.
  const useKav = !!keyboardAvoiding && Platform.OS === 'ios';

  return (
    <ScreenScrollContext.Provider value={revealInput}>
      {/* screenOuter fills the whole screen with app background colour.
          A separate navy strip covers just the status-bar safe area so the
          header colour is preserved on every Android device regardless of
          windowSoftInputMode / keyboard resize behaviour. */}
      <View style={styles.screenOuter}>
        <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
        {/* Navy top strip for status bar area only */}
        <SafeAreaView edges={['top']} style={styles.statusBarArea} />
        {/* Remaining content — no SafeAreaView flex here to avoid resize gap */}
        <View style={[styles.screenInner, style]}>
          {useKav ? (
            <KeyboardAvoidingView
              behavior="padding"
              {...keyboardProps}
              style={[styles.fill, keyboardStyle]}>
              {pageContent}
            </KeyboardAvoidingView>
          ) : (
            pageContent
          )}
        </View>
      </View>
    </ScreenScrollContext.Provider>
  );
};

export const AppHeader = ({
  navigation,
  title,
  subtitle,
  showBack = false,
  unreadCount = 0,
  showNotifications = true,
  avatar,
}) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      {showBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => navigation.goBack()}
          style={[styles.headerIcon, styles.headerLeading]}>
          <Icon color={colors.onNavy} name="arrow-left" size={22} />
        </Pressable>
      ) : avatar ? (
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{avatar}</Text>
        </View>
      ) : null}
      <View style={styles.headerTitleWrap}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
    {showNotifications ? (
      <Pressable
        accessibilityLabel={
          unreadCount > 0
            ? `Open notifications, ${unreadCount} unread`
            : 'Open notifications'
        }
        accessibilityRole="button"
        hitSlop={4}
        onPress={() => navigation.navigate('Notifications')}
        style={styles.headerIcon}>
        <Icon color={colors.onNavy} name="bell-outline" size={22} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Math.min(unreadCount, 9)}</Text>
          </View>
        ) : null}
      </Pressable>
    ) : null}
  </View>
);

AppHeader.displayName = 'AppHeader';

export const PrimaryButton = ({
  title,
  onPress,
  icon,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  accessibilityState,
  ...pressableProps
}) => {
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isTonal = variant === 'tonal';
  const isCompact = size === 'compact';
  const isDisabled = disabled || loading;
  const foreground = isDisabled
    ? colors.disabled
    : isOutline || isTonal
      ? colors.primary
      : isWarning
        ? colors.warning
        : colors.onNavy;

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        busy: loading,
        disabled: isDisabled,
      }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isCompact && styles.buttonCompact,
        isOutline && styles.buttonOutline,
        isDanger && styles.buttonDanger,
        isWarning && styles.buttonWarning,
        isTonal && styles.buttonTonal,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {icon ? (
            <Icon
              color={foreground}
              name={icon}
              size={isCompact ? 17 : 19}
              style={styles.buttonIcon}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              isCompact && styles.buttonTextCompact,
              (isOutline || isTonal) && styles.buttonTextOutline,
              isWarning && styles.buttonTextWarning,
              isDisabled && styles.buttonTextDisabled,
            ]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

export const SearchInput = ({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel = 'Search',
  containerStyle,
  onFocus,
  ...inputProps
}) => {
  const inputRef = useRef(null);
  const revealInput = useContext(ScreenScrollContext);

  return (
    <View style={[styles.searchWrap, containerStyle]}>
      <Icon color={colors.textMuted} name="magnify" size={22} />
      <TextInput
        {...inputProps}
        ref={inputRef}
        accessibilityLabel={accessibilityLabel}
        onChangeText={onChangeText}
        onFocus={event => {
          if (revealInput) {
            setTimeout(() => revealInput(inputRef), 200);
          }
          onFocus?.(event);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType={inputProps.returnKeyType || 'search'}
        style={[styles.searchInput, inputProps.style]}
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => onChangeText('')}
          style={styles.searchClear}>
          <Icon color={colors.textMuted} name="close-circle" size={19} />
        </Pressable>
      ) : null}
    </View>
  );
};

export const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  prefix,
  error,
  helperText,
  required = false,
  editable = true,
  autoCapitalize,
  autoComplete,
  maxLength,
  secureTextEntry,
  returnKeyType,
  accessibilityLabel,
  onFocus,
  onBlur,
  style,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const revealInput = useContext(ScreenScrollContext);
  const fieldAccessibilityLabel =
    accessibilityLabel || `${label}${required ? ', required' : ''}`;

  return (
    <View ref={wrapRef} collapsable={false} style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          focused && styles.inputWrapFocused,
          error && styles.inputWrapError,
          !editable && styles.inputWrapDisabled,
        ]}>
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          {...inputProps}
          ref={inputRef}
          accessibilityHint={error || helperText || inputProps.accessibilityHint}
          accessibilityLabel={fieldAccessibilityLabel}
          accessibilityState={{
            ...inputProps.accessibilityState,
            disabled: !editable,
          }}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChangeText={onChangeText}
          onFocus={event => {
            setFocused(true);
            if (revealInput) {
              setTimeout(() => revealInput(wrapRef), 200);
            }
            onFocus?.(event);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            !editable && styles.inputDisabled,
            style,
          ]}
          value={value}
        />
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.fieldError}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.fieldHelper}>{helperText}</Text>
      ) : null}
    </View>
  );
};

export const SectionHeader = ({ title, actionLabel, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {title}
    </Text>
    {actionLabel ? (
      <Pressable
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onAction}
        style={({ pressed }) => [
          styles.sectionActionTarget,
          pressed && styles.inlinePressed,
        ]}>
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

export const StatusPill = ({ status }) => {
  const tone = statusColors(status);

  return (
    <View
      accessibilityLabel={`Status: ${tone.label}`}
      style={[styles.statusPill, { backgroundColor: tone.background }]}>
      <Icon
        color={tone.foreground}
        name={tone.icon}
        size={13}
        style={styles.statusIcon}
      />
      <Text style={[styles.statusText, { color: tone.foreground }]}>
        {tone.label}
      </Text>
    </View>
  );
};

export const MetricCard = ({ label, value, icon, tone = 'orange', onPress }) => {
  const iconBg = tone === 'navy' ? colors.navySoft : colors.primarySoft;
  const iconColor = tone === 'navy' ? colors.navy : colors.primary;

  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.metricCard,
        pressed && styles.cardPressed,
      ]}>
      <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} name={icon} size={24} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
};

export const ActionTile = ({ title, subtitle, icon, onPress }) => (
  <Pressable
    accessibilityLabel={`${title}. ${subtitle}`}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.actionTile,
      pressed && styles.cardPressed,
    ]}>
    <View style={styles.actionIcon}>
      <Icon color={colors.primary} name={icon} size={23} />
    </View>
    <View style={styles.actionTextWrap}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text numberOfLines={1} style={styles.actionSubtitle}>
        {subtitle}
      </Text>
    </View>
    <Icon color={colors.textMuted} name="chevron-right" size={21} />
  </Pressable>
);

export const InfoRow = ({ label, value, icon, valueColor }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLabelWrap}>
      {icon ? <Icon color={colors.textMuted} name={icon} size={18} /> : null}
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
      {value}
    </Text>
  </View>
);

export const ProgressBar = ({ value, color = colors.primary }) => {
  const numericValue = Math.min(100, Math.max(0, Number(value) || 0));
  const width = `${numericValue}%`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: numericValue }}
      style={styles.progressTrack}>
      <View style={[styles.progressFill, { backgroundColor: color, width }]} />
    </View>
  );
};

export const ChoiceChips = ({ options, value, onChange }) => (
  <View style={styles.chipRow}>
    {options.map(option => {
      const optionValue = typeof option === 'string' ? option : option.value;
      const label = typeof option === 'string' ? option : option.label;
      const selected = optionValue === value;

      return (
        <Pressable
          key={optionValue}
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => onChange(optionValue)}
          style={({ pressed }) => [
            styles.chip,
            selected && styles.chipSelected,
            pressed && styles.chipPressed,
          ]}>
          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
            {label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

export const EmptyState = ({
  icon,
  title,
  message,
  compact = false,
  actionLabel,
  onAction,
}) => (
  <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
    <View style={[styles.emptyIcon, compact && styles.emptyIconCompact]}>
      <Icon color={colors.primary} name={icon} size={compact ? 24 : 30} />
    </View>
    <Text style={[styles.emptyTitle, compact && styles.emptyTitleCompact]}>
      {title}
    </Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionLabel && onAction ? (
      <Pressable
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        onPress={onAction}
        style={({ pressed }) => [
          styles.emptyAction,
          pressed && styles.inlinePressed,
        ]}>
        <Text style={styles.emptyActionText}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

export const SurfaceCard = ({
  children,
  style,
  onPress,
  accessibilityRole,
  ...viewProps
}) => {
  if (onPress) {
    return (
      <Pressable
        {...viewProps}
        accessibilityRole={accessibilityRole || 'button'}
        onPress={onPress}
        style={({ pressed }) => [
          styles.surfaceCard,
          pressed && styles.cardPressed,
          style,
        ]}>
        {children}
      </Pressable>
    );
  }

  return (
    <View
      {...viewProps}
      accessibilityRole={accessibilityRole}
      style={[styles.surfaceCard, style]}>
      {children}
    </View>
  );
};

export const NoticeBanner = ({
  title,
  message,
  tone = 'info',
  icon,
  children,
  style,
}) => {
  const tones = {
    danger: {
      background: colors.dangerSoft,
      foreground: colors.danger,
      icon: 'alert-circle-outline',
    },
    info: {
      background: colors.infoSoft,
      foreground: colors.info,
      icon: 'information-outline',
    },
    success: {
      background: colors.successSoft,
      foreground: colors.success,
      icon: 'check-circle-outline',
    },
    warning: {
      background: colors.warningSoft,
      foreground: colors.warning,
      icon: 'alert-outline',
    },
  };
  const selectedTone = tones[tone] || tones.info;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.noticeBanner,
        { backgroundColor: selectedTone.background },
        style,
      ]}>
      <Icon
        color={selectedTone.foreground}
        name={icon || selectedTone.icon}
        size={22}
        style={styles.noticeIcon}
      />
      <View style={styles.noticeContent}>
        {title ? (
          <Text
            style={[styles.noticeTitle, { color: selectedTone.foreground }]}>
            {title}
          </Text>
        ) : null}
        {message ? <Text style={styles.noticeMessage}>{message}</Text> : children}
      </View>
    </View>
  );
};

export const StickyActionBar = ({ children, style, keyboardHeight = 0 }) => {
  const insets = useSafeAreaInsets();
  const keyboardOpen = keyboardHeight > 0;

  // On iOS only: lift the bar above keyboard when open.
  // On Android: adjustResize handles window shrinking; no manual lift needed.
  const safeBottomStyle = {
    paddingBottom:
      bottomPaddingFromStyle(style) +
      spacing.md +
      (keyboardOpen ? 0 : insets.bottom),
    marginBottom: keyboardOpen && Platform.OS === 'ios' ? keyboardHeight : 0,
  };

  return (
    <View style={[styles.stickyActionBar, style, safeBottomStyle]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  screenOuter:   { backgroundColor: colors.background, flex: 1 },
  statusBarArea: { backgroundColor: colors.navy },          // navy only for top safe-area inset
  screenInner:   { backgroundColor: colors.background, flex: 1 }, // white/bg fills rest
  fixedHeader: {
    backgroundColor: colors.navy,
    flexShrink: 0,
    overflow: 'hidden',
    zIndex: 10,
  },
  screenBody: { backgroundColor: colors.background, flex: 1 },
  fill: { flex: 1 },
  screenContent: { backgroundColor: colors.background },
  logo: { height: 190, width: 190 },
  logoCompact: { height: 42, width: 42 },
  header: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerLeft: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  headerLeading: { marginRight: spacing.md },
  headerAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 38,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 38,
  },
  headerAvatarText: {
    color: colors.onNavy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  headerTitleWrap: { flex: 1, paddingRight: spacing.sm, alignItems: 'flex-start' },
  headerTitle: {
    color: colors.onNavy,
    fontSize: 20,
    fontWeight: typography.weights.black,
    lineHeight: 24,
  },
  headerSubtitle: {
    color: colors.onNavyMuted,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    marginTop: 2,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: radius.md,
    height: controlSizes.touchTarget,
    justifyContent: 'center',
    width: controlSizes.touchTarget,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: radius.round,
    borderWidth: 2,
    height: 19,
    justifyContent: 'center',
    position: 'absolute',
    right: -3,
    top: -4,
    width: 19,
  },
  badgeText: {
    color: colors.onNavy,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: controlSizes.default,
    paddingHorizontal: spacing.xl,
  },
  buttonCompact: {
    minHeight: controlSizes.compact,
    paddingHorizontal: spacing.lg,
  },
  buttonOutline: { backgroundColor: colors.surface },
  buttonDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  buttonWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  buttonTonal: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  buttonDisabled: {
    backgroundColor: colors.disabledSurface,
    borderColor: colors.disabledSurface,
    opacity: 0.72,
  },
  buttonPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  buttonIcon: { marginRight: spacing.sm },
  buttonText: {
    color: colors.onNavy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.extraBold,
  },
  buttonTextCompact: { fontSize: typography.sizes.label },
  buttonTextOutline: { color: colors.primary },
  buttonTextWarning: { color: colors.warning },
  buttonTextDisabled: { color: colors.disabled },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sizes.body,
    marginLeft: spacing.sm,
  },
  searchClear: {
    alignItems: 'center',
    height: controlSizes.touchTarget,
    justifyContent: 'center',
    marginRight: -spacing.sm,
    width: controlSizes.touchTarget,
  },
  fieldWrap: { marginBottom: spacing.lg },
  fieldLabel: {
    color: colors.navy,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.label,
    marginBottom: spacing.sm,
  },
  requiredMark: { color: colors.danger },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: controlSizes.default,
    paddingHorizontal: spacing.md,
  },
  inputWrapFocused: {
    borderColor: colors.focus,
    borderWidth: 2,
    paddingHorizontal: spacing.md - 1,
  },
  inputWrapError: { borderColor: colors.danger, borderWidth: 2 },
  inputWrapDisabled: { backgroundColor: colors.disabledSurface },
  inputWrapMultiline: { alignItems: 'flex-start', minHeight: 96 },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: typography.sizes.body,
    paddingVertical: spacing.md,
  },
  inputDisabled: { color: colors.disabled },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },
  inputPrefix: {
    color: colors.navy,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginRight: spacing.sm,
    paddingTop: spacing.xs,
  },
  fieldError: {
    color: colors.danger,
    fontSize: typography.sizes.footnote,
    lineHeight: typography.lineHeights.footnote,
    marginTop: spacing.xs,
  },
  fieldHelper: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    lineHeight: typography.lineHeights.footnote,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extraBold,
  },
  sectionActionTarget: {
    justifyContent: 'center',
    minHeight: controlSizes.touchTarget,
    paddingLeft: spacing.md,
  },
  sectionAction: {
    color: colors.primary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.extraBold,
  },
  inlinePressed: { opacity: 0.65 },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.round,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusIcon: { marginRight: spacing.xs },
  statusText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.extraBold,
    letterSpacing: 0.4,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: 'center',
    padding: spacing.md,
    width: '48%',
    ...shadow,
  },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  metricIcon: {
    alignItems: 'center',
    borderRadius: radius.round,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  metricValue: {
    color: colors.navy,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.black,
    marginTop: spacing.sm,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginTop: 2,
    textAlign: 'center',
  },
  actionTile: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    minHeight: 72,
    padding: spacing.md,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionTextWrap: { flex: 1, marginLeft: spacing.md },
  actionTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: typography.weights.extraBold,
  },
  actionSubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    marginTop: 3,
  },
  infoRow: {
    alignItems: 'flex-start',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    maxWidth: '48%',
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    marginLeft: spacing.xs,
  },
  infoValue: {
    color: colors.navy,
    flex: 1,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    textAlign: 'right',
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radius.round,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: { borderRadius: radius.round, height: '100%' },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    marginBottom: spacing.sm,
    marginRight: spacing.sm,
    minHeight: controlSizes.compact,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  chipSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipPressed: { opacity: 0.78 },
  chipText: {
    color: colors.textMuted,
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.bold,
  },
  chipTextSelected: { color: colors.onNavy },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 56,
  },
  emptyStateCompact: { paddingVertical: spacing.xxl },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  emptyIconCompact: { height: 48, width: 48 },
  emptyTitle: {
    color: colors.navy,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extraBold,
    marginTop: spacing.lg,
  },
  emptyTitleCompact: { marginTop: spacing.md },
  emptyMessage: {
    color: colors.textMuted,
    fontSize: typography.sizes.label,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyAction: {
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: controlSizes.touchTarget,
    paddingHorizontal: spacing.lg,
  },
  emptyActionText: {
    color: colors.primary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.extraBold,
  },
  surfaceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    ...shadow,
  },
  noticeBanner: {
    alignItems: 'flex-start',
    borderRadius: radius.md,
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    padding: spacing.md,
  },
  noticeIcon: { marginRight: spacing.md, marginTop: 1 },
  noticeContent: { flex: 1 },
  noticeTitle: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.extraBold,
    lineHeight: typography.lineHeights.label,
  },
  noticeMessage: {
    color: colors.text,
    fontSize: typography.sizes.label,
    lineHeight: typography.lineHeights.body,
    marginTop: spacing.xs,
  },
  stickyActionBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    shadowColor: colors.navy,
    shadowOffset: { height: -4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
});
