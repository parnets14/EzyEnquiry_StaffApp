import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { useApp } from '../AppContext';
import { BrandLogo, PrimaryButton } from '../components';
import { colors, radius, spacing } from '../theme';

const revealAuthTarget = (scrollRef, scrollYRef, targetRef) => {
  const measureAndReveal = () => {
    scrollRef.current?.measureInWindow?.(
      (scrollX, scrollY, scrollWidth, scrollHeight) => {
        if (typeof scrollY !== 'number' || scrollHeight <= 0) {
          return;
        }

        targetRef.current?.measureInWindow?.((x, y, width, height) => {
          if (typeof y !== 'number' || height <= 0) {
            return;
          }

          const gap = spacing.lg;
          const visibleTop = scrollY + gap;
          const visibleBottom = scrollY + scrollHeight - gap;
          const targetBottom = y + height;
          let delta = 0;

          if (targetBottom > visibleBottom) {
            delta = targetBottom - visibleBottom;
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

  setTimeout(measureAndReveal, 120);
  setTimeout(measureAndReveal, 320);
};

// ─────────────────────────────────────────────────────────────────
// SPLASH SCREEN
// ─────────────────────────────────────────────────────────────────
export const SplashScreen = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const ringAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2200);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, ringAnim, onFinish]);

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={styles.splashSafe}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
      <View style={styles.splashBg}>
        {/* ── Decorative Rings ── */}
        <Animated.View
          style={[
            styles.splashRingOuter,
            { opacity: fadeAnim, transform: [{ scale: ringAnim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.splashRingInner,
            { opacity: fadeAnim, transform: [{ scale: ringAnim }] },
          ]}
        />

        {/* ── Main Content ── */}
        <Animated.View
          style={[
            styles.splashContent,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}>
          {/* Glass Logo Card */}
          <View style={styles.splashGlassCard}>
            <View style={styles.splashGlassHighlight} />
            <View style={styles.splashLogoWrap}>
              <BrandLogo compact />
            </View>
            <View style={styles.splashAccentDot} />
          </View>

          {/* Brand Name */}
          <Text style={styles.splashBrand}>
            <Text style={styles.splashBrandOrange}>Ezy</Text>
            <Text style={styles.splashBrandWhite}>Enquiry</Text>
          </Text>

          {/* Divider */}
          <View style={styles.splashDividerRow}>
            <View style={styles.splashDividerLine} />
            <View style={styles.splashDividerDot} />
            <View style={styles.splashDividerLine} />
          </View>

          {/* Staff Badge */}
          <View style={styles.splashBadge}>
            <Icon color={colors.primary} name="badge-account-outline" size={14} />
            <Text style={styles.splashBadgeText}>STAFF APP</Text>
          </View>

          {/* Tagline */}
          <Text style={styles.splashTagline}>
            Manage customers, orders & collections
          </Text>
        </Animated.View>

        {/* ── Footer ── */}
        <Animated.View style={[styles.splashFooter, { opacity: fadeAnim }]}>
          <View style={styles.splashLoaderDot} />
          <Text style={styles.splashVersion}>v1.0.0</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────
export const LoginScreen = ({ navigation }) => {
  const { requestLoginOtp, authLoading } = useApp();
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const mobileFieldRef = useRef(null);
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const result = await requestLoginOtp(mobile);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError('');
    navigation.navigate('Otp', { devOtp: result.devOtp || null });
  };

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={styles.loginSafe}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />

      <View pointerEvents="none" style={styles.loginGlowTop} />
      <View pointerEvents="none" style={styles.loginGlowBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.loginKeyboard}>
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.loginScrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={event => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          <View style={styles.loginBrandArea}>
            <View style={styles.loginLogoShell}>
              <View style={styles.loginLogoHighlight} />
              <View style={styles.loginLogoWrap}>
                <BrandLogo compact />
              </View>
              <View style={styles.loginLogoDot} />
            </View>

            <Text style={styles.loginBrandName}>
              <Text style={styles.loginBrandAccent}>Ezy</Text>
              <Text style={styles.loginBrandWhite}>Enquiry</Text>
            </Text>
            <View style={styles.loginAppBadge}>
              <Icon
                color={colors.primary}
                name="badge-account-outline"
                size={13}
              />
              <Text style={styles.loginAppBadgeText}>STAFF APP</Text>
            </View>
            <Text style={styles.loginTagline}>
              Your workspace for enquiries, orders and collections
            </Text>
          </View>

          <View style={styles.loginCard}>
            <View style={styles.loginCardHighlight} />
            <View style={styles.loginTitleRow}>
              <View style={styles.loginTitleCopy}>
                <Text accessibilityRole="header" style={styles.loginTitle}>
                  Welcome back
                </Text>
                <Text style={styles.loginSubtitle}>
                  Sign in with your registered mobile number
                </Text>
              </View>
              <View style={styles.loginTitleIcon}>
                <Icon
                  color={colors.primary}
                  name="account-lock-outline"
                  size={22}
                />
              </View>
            </View>

            <Text style={styles.loginLabel}>MOBILE NUMBER</Text>
            <View
              ref={mobileFieldRef}
              collapsable={false}
              style={[styles.mobileInput, error && styles.inputError]}>
              <View style={styles.countryBlock}>
                <Text style={styles.countryCode}>+91</Text>
              </View>
              <View style={styles.inputDivider} />
              <TextInput
                accessibilityHint="Enter the 10 digit registered mobile number"
                accessibilityLabel="Registered mobile number, country code plus 91"
                autoComplete="tel"
                autoFocus
                keyboardType="number-pad"
                maxLength={10}
                onChangeText={value => {
                  setMobile(value.replace(/\D/g, ''));
                  setError('');
                }}
                onFocus={() =>
                  revealAuthTarget(scrollRef, scrollYRef, mobileFieldRef)
                }
                placeholder="Enter 10-digit mobile"
                placeholderTextColor="rgba(255,255,255,0.52)"
                returnKeyType="done"
                style={styles.input}
                textContentType="telephoneNumber"
                value={mobile}
              />
              {mobile.length === 10 ? (
                <Icon color={colors.success} name="check-circle" size={19} />
              ) : null}
            </View>
            {error ? (
              <View
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={styles.loginErrorRow}>
                <Icon color="#FF8F86" name="alert-circle-outline" size={15} />
                <Text style={styles.loginError}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              disabled={mobile.length !== 10 || authLoading}
              icon="arrow-right"
              loading={authLoading}
              onPress={submit}
              style={styles.loginBtn}
              title="Send login OTP"
            />
          </View>

          <View style={styles.securityNote}>
            <Icon color={colors.primary} name="shield-check-outline" size={17} />
            <Text style={styles.securityText}>
              Secure Staff access · Login with the mobile number registered by
              your Admin
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────
// OTP SCREEN
// ─────────────────────────────────────────────────────────────────
export const OtpScreen = ({ navigation, route }) => {
  const { pendingMobile, verifyLoginOtp, authLoading } = useApp();
  const devOtp = route?.params?.devOtp || null;
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const otpBoxesRef = useRef(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const verify = async () => {
    const result = await verifyLoginOtp(otp);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError('');
  };

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={styles.otpSafe}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />

      <View pointerEvents="none" style={styles.otpGlowTop} />
      <View pointerEvents="none" style={styles.otpGlowBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.otpKeyboard}>
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.otpScrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={event => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>

          {/* ── Back Navigation ── */}
          <Pressable
            accessibilityLabel="Go back to login"
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => navigation.goBack()}
            style={styles.otpBackBtn}>
            <Icon color={colors.surface} name="arrow-left" size={20} />
          </Pressable>

          {/* ── Hero Branding ── */}
          <View style={styles.otpBrandArea}>
            <View style={styles.otpIconShell}>
              <View style={styles.otpIconHighlight} />
              <Icon color={colors.primary} name="message-lock-outline" size={32} />
              <View style={styles.otpIconDot} />
            </View>
            <Text accessibilityRole="header" style={styles.otpTitle}>
              Verify your identity
            </Text>
            <Text style={styles.otpSubtitle}>
              We sent a 6-digit code to your registered mobile
            </Text>
            <View style={styles.otpMobilePill}>
              <Icon color={colors.primary} name="cellphone" size={15} />
              <Text style={styles.otpMobileText}>
                +91 ••••••{pendingMobile.slice(-4)}
              </Text>
            </View>
          </View>

          {/* ── Glass OTP Card ── */}
          <View style={styles.otpCard}>
            <View style={styles.otpCardHighlight} />

            <Text style={styles.otpCardLabel}>ENTER VERIFICATION CODE</Text>

            {devOtp ? (
              <Pressable
                accessibilityHint="Fills the verification code automatically"
                accessibilityLabel={`Test OTP ${devOtp}. Tap to autofill.`}
                accessibilityRole="button"
                onPress={() => {
                  setOtp(String(devOtp).slice(0, 6));
                  setError('');
                }}
                style={({ pressed }) => [
                  styles.otpDevCode,
                  pressed && styles.otpDevCodePressed,
                ]}>
                <Icon color={colors.info} name="flask-outline" size={15} />
                <Text style={styles.otpDevCodeText}>
                  Test OTP: <Text style={styles.otpDevCodeValue}>{devOtp}</Text>
                  {'  '}(tap to fill)
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              ref={otpBoxesRef}
              accessibilityHint="Opens the number keyboard to enter the code"
              accessibilityLabel="Six digit login OTP"
              accessibilityRole="button"
              accessibilityValue={{
                text: otp.length
                  ? `${otp.length} of 6 digits entered`
                  : 'No digits entered',
              }}
              collapsable={false}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpBoxRow}>
              {[0, 1, 2, 3, 4, 5].map(index => (
                <View
                  key={index}
                  importantForAccessibility="no"
                  style={[
                    styles.otpBox,
                    otp.length === index && styles.otpBoxActive,
                    otp[index] && styles.otpBoxFilled,
                    error && otp.length === 6 && styles.otpBoxError,
                  ]}>
                  <Text style={[
                    styles.otpDigit,
                    otp[index] && styles.otpDigitFilled,
                  ]}>
                    {otp[index] || ''}
                  </Text>
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
              onFocus={() =>
                revealAuthTarget(scrollRef, scrollYRef, otpBoxesRef)
              }
              style={styles.hiddenInput}
              textContentType="oneTimeCode"
              value={otp}
            />

            {error ? (
              <View
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={styles.otpErrorRow}>
                <Icon color="#FF8F86" name="alert-circle-outline" size={15} />
                <Text style={styles.otpError}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              disabled={otp.length !== 6 || authLoading}
              icon="shield-check"
              loading={authLoading}
              onPress={verify}
              style={styles.otpVerifyBtn}
              title="Verify & continue"
            />
          </View>

          {/* ── Footer Note ── */}
          <View style={styles.otpFooterNote}>
            <Icon color={colors.primary} name="shield-lock-outline" size={15} />
            <Text style={styles.otpFooterText}>
              Purpose-scoped · This code works only for Staff login
            </Text>
          </View>



        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Splash ──
  splashSafe: { backgroundColor: colors.navy, flex: 1 },
  splashBg: { alignItems: 'center', flex: 1, justifyContent: 'center', overflow: 'hidden' },
  splashRingOuter: { borderColor: 'rgba(255, 75, 10, 0.09)', borderRadius: 140, borderWidth: 1, height: 280, position: 'absolute', width: 280 },
  splashRingInner: { borderColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 110, borderWidth: 1, height: 220, position: 'absolute', width: 220 },
  splashContent: { alignItems: 'center', paddingHorizontal: spacing.xl },
  splashGlassCard: { alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.07)', borderColor: 'rgba(255, 255, 255, 0.16)', borderRadius: 38, borderWidth: 1.5, elevation: 16, height: 140, justifyContent: 'center', marginBottom: spacing.xxl, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24, width: 140 },
  splashGlassHighlight: { backgroundColor: 'rgba(255, 255, 255, 0.30)', borderRadius: 1, height: 1.5, left: 22, position: 'absolute', right: 22, top: 0 },
  splashLogoWrap: { alignItems: 'center', backgroundColor: colors.surface, borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: 24, borderWidth: 2, elevation: 10, height: 100, justifyContent: 'center', overflow: 'hidden', shadowColor: colors.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 14, width: 100 },
  splashAccentDot: { backgroundColor: colors.primary, borderRadius: 6, elevation: 4, height: 12, position: 'absolute', right: 14, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 5, top: 14, width: 12 },
  splashBrand: { fontSize: 34, fontWeight: '800', letterSpacing: 0.4, marginBottom: spacing.md },
  splashBrandOrange: { color: colors.primary },
  splashBrandWhite: { color: colors.surface },
  splashDividerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  splashDividerLine: { backgroundColor: 'rgba(255, 75, 10, 0.45)', borderRadius: 1, height: 1.5, width: 28 },
  splashDividerDot: { backgroundColor: colors.primary, borderRadius: 3, height: 5, opacity: 0.7, width: 5 },
  splashBadge: { alignItems: 'center', backgroundColor: 'rgba(255,75,10,0.14)', borderColor: 'rgba(255,75,10,0.30)', borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 6 },
  splashBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginLeft: spacing.xs },
  splashTagline: { color: colors.onNavyMuted, fontSize: 12, letterSpacing: 0.3, lineHeight: 18, textAlign: 'center' },
  splashFooter: { alignItems: 'center', bottom: spacing.xxl, position: 'absolute' },
  splashLoaderDot: { backgroundColor: colors.primary, borderRadius: radius.round, height: 6, marginBottom: spacing.md, opacity: 0.7, width: 6 },
  splashVersion: { color: colors.onNavyMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // ── Login ──
  loginSafe: { backgroundColor: colors.navy, flex: 1, overflow: 'hidden' },
  loginKeyboard: { flex: 1 },
  loginGlowTop: { backgroundColor: 'rgba(255,75,10,0.08)', borderRadius: 180, height: 360, position: 'absolute', right: -210, top: -180, width: 360 },
  loginGlowBottom: { borderColor: 'rgba(255,255,255,0.035)', borderRadius: 150, borderWidth: 34, bottom: -180, height: 300, left: -170, position: 'absolute', width: 300 },
  loginScrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xxxl, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  loginBrandArea: { alignItems: 'center', marginBottom: spacing.xl },
  loginLogoShell: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', borderRadius: 25, borderWidth: 1, height: 90, justifyContent: 'center', marginBottom: spacing.md, width: 90 },
  loginLogoHighlight: { backgroundColor: 'rgba(255,255,255,0.30)', borderRadius: 1, height: 1, left: 17, position: 'absolute', right: 17, top: 0 },
  loginLogoWrap: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 17, height: 62, justifyContent: 'center', overflow: 'hidden', width: 62 },
  loginLogoDot: { backgroundColor: colors.primary, borderColor: colors.navy, borderRadius: 6, borderWidth: 2, height: 12, position: 'absolute', right: 8, top: 8, width: 12 },
  loginBrandName: { fontSize: 29, fontWeight: '900', letterSpacing: 0.2 },
  loginBrandAccent: { color: colors.primary },
  loginBrandWhite: { color: colors.surface },
  loginAppBadge: { alignItems: 'center', backgroundColor: 'rgba(255,75,10,0.12)', borderColor: 'rgba(255,75,10,0.28)', borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 4 },
  loginAppBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginLeft: spacing.xs },
  loginTagline: { color: colors.onNavyMuted, fontSize: 11, lineHeight: 16, marginTop: spacing.sm, textAlign: 'center' },
  loginCard: { backgroundColor: 'rgba(255,255,255,0.065)', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 24, borderTopColor: 'rgba(255,255,255,0.22)', borderWidth: 1, padding: spacing.xl },
  loginCardHighlight: { backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 1, height: 1, left: spacing.xl, position: 'absolute', right: spacing.xl, top: 0 },
  loginTitleRow: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: spacing.xl },
  loginTitleCopy: { flex: 1, paddingRight: spacing.md },
  loginTitle: { color: colors.surface, fontSize: 21, fontWeight: '900' },
  loginSubtitle: { color: colors.onNavyMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  loginTitleIcon: { alignItems: 'center', backgroundColor: 'rgba(255,75,10,0.12)', borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
  loginLabel: { color: colors.onNavyMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: spacing.sm },
  mobileInput: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.13)', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', minHeight: 54, paddingRight: spacing.md },
  inputError: { borderColor: '#FF6F61' },
  countryBlock: { alignItems: 'center', justifyContent: 'center', paddingLeft: spacing.md },
  countryCode: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  inputDivider: { backgroundColor: 'rgba(255,255,255,0.15)', height: 23, marginHorizontal: spacing.md, width: 1 },
  input: { color: colors.surface, flex: 1, fontSize: 15, letterSpacing: 0.6, minWidth: 0, paddingVertical: 0 },
  loginErrorRow: { alignItems: 'center', flexDirection: 'row', marginTop: spacing.sm },
  loginError: { color: '#FF8F86', flex: 1, fontSize: 11, lineHeight: 16, marginLeft: spacing.xs },
  loginBtn: { marginTop: spacing.lg },
  demoDividerRow: { alignItems: 'center', flexDirection: 'row', marginVertical: spacing.lg },
  demoDividerLine: { backgroundColor: 'rgba(255,255,255,0.10)', flex: 1, height: 1 },
  demoDividerText: { color: colors.onNavyMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginHorizontal: spacing.sm },
  demoAccount: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.10)', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', minHeight: 60, padding: spacing.md },
  demoAccountPressed: { backgroundColor: 'rgba(255,75,10,0.10)', borderColor: 'rgba(255,75,10,0.32)', opacity: 0.9 },
  demoAccountIcon: { alignItems: 'center', backgroundColor: 'rgba(255,75,10,0.12)', borderRadius: radius.sm, height: 38, justifyContent: 'center', width: 38 },
  demoAccountCopy: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  demoAccountTitle: { color: colors.surface, fontSize: 11, fontWeight: '800' },
  demoAccountMobile: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  securityNote: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  securityText: { color: colors.onNavyMuted, flexShrink: 1, fontSize: 11, lineHeight: 16, marginLeft: spacing.sm, textAlign: 'center' },

  // ── OTP ──
  otpSafe: { backgroundColor: colors.navy, flex: 1, overflow: 'hidden' },
  otpGlowTop: { backgroundColor: 'rgba(255,75,10,0.06)', borderRadius: 160, height: 320, position: 'absolute', left: -180, top: -100, width: 320 },
  otpGlowBottom: { borderColor: 'rgba(255,255,255,0.03)', borderRadius: 140, borderWidth: 30, bottom: -160, height: 280, position: 'absolute', right: -160, width: 280 },
  otpKeyboard: { flex: 1 },
  otpScrollContent: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  otpBackBtn: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: radius.md, height: 44, justifyContent: 'center', marginBottom: spacing.xl, width: 44 },
  otpBrandArea: { alignItems: 'center', marginBottom: spacing.xl },
  otpIconShell: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.14)', borderRadius: 22, borderWidth: 1, height: 76, justifyContent: 'center', width: 76 },
  otpIconHighlight: { backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 1, height: 1, left: 14, position: 'absolute', right: 14, top: 0 },
  otpIconDot: { backgroundColor: colors.primary, borderColor: colors.navy, borderRadius: 5, borderWidth: 2, height: 10, position: 'absolute', right: 6, top: 6, width: 10 },
  otpTitle: { color: colors.surface, fontSize: 22, fontWeight: '900', marginTop: spacing.lg, textAlign: 'center' },
  otpSubtitle: { color: colors.onNavyMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm, textAlign: 'center' },
  otpMobilePill: { alignItems: 'center', backgroundColor: 'rgba(255,75,10,0.12)', borderColor: 'rgba(255,75,10,0.26)', borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 6 },
  otpMobileText: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.8, marginLeft: spacing.xs },
  otpCard: { backgroundColor: 'rgba(255,255,255,0.065)', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 24, borderTopColor: 'rgba(255,255,255,0.22)', borderWidth: 1, padding: spacing.xl },
  otpCardHighlight: { backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 1, height: 1, left: spacing.xl, position: 'absolute', right: spacing.xl, top: 0 },
  otpCardLabel: { color: colors.onNavyMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: spacing.md, textAlign: 'center' },
  otpBoxRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', width: '100%' },
  otpBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, borderWidth: 1.5, flex: 1, height: 56, justifyContent: 'center', maxWidth: 48, minWidth: 0 },
  otpBoxActive: { borderColor: colors.primary, borderWidth: 2, backgroundColor: 'rgba(255,75,10,0.08)' },
  otpBoxFilled: { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.32)' },
  otpBoxError: { borderColor: '#FF6F61' },
  otpDigit: { color: 'rgba(255,255,255,0.4)', fontSize: 22, fontWeight: '900' },
  otpDigitFilled: { color: colors.surface },
  hiddenInput: { height: 1, opacity: 0, position: 'absolute', width: 1 },
  otpErrorRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  otpError: { color: '#FF8F86', flex: 1, fontSize: 11, lineHeight: 16, marginLeft: spacing.xs, textAlign: 'center' },
  otpVerifyBtn: { marginTop: spacing.xl, width: '100%' },
  otpDemoDivider: { alignItems: 'center', flexDirection: 'row', marginVertical: spacing.lg },
  otpDemoDividerLine: { backgroundColor: 'rgba(255,255,255,0.10)', flex: 1, height: 1 },
  otpDemoDividerText: { color: colors.onNavyMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginHorizontal: spacing.sm },
  otpDemoCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.10)', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', minHeight: 56, padding: spacing.md },
  otpDemoCardPressed: { backgroundColor: 'rgba(255,75,10,0.10)', borderColor: 'rgba(255,75,10,0.30)', opacity: 0.9 },
  otpDemoCardIcon: { alignItems: 'center', backgroundColor: 'rgba(40,120,200,0.12)', borderRadius: radius.sm, height: 36, justifyContent: 'center', width: 36 },
  otpDemoCardCopy: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  otpDemoCardTitle: { color: colors.surface, fontSize: 11, fontWeight: '800' },
  otpDemoCardCode: { color: colors.primary, fontSize: 14, fontWeight: '900', letterSpacing: 3, marginTop: 3 },
  otpFooterNote: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  otpFooterText: { color: colors.onNavyMuted, flexShrink: 1, fontSize: 11, lineHeight: 16, marginLeft: spacing.sm, textAlign: 'center' },
  otpDevCode: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(41,182,246,0.12)', borderColor: 'rgba(41,182,246,0.35)', borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: 6 },
  otpDevCodePressed: { opacity: 0.7 },
  otpDevCodeText: { color: colors.onNavyMuted, fontSize: 11, fontWeight: '700' },
  otpDevCodeValue: { color: colors.info, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
