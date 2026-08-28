export const colors = {
  primary: '#FF4B0A',
  primaryDark: '#D93C00',
  primarySoft: '#FFF0E9',
  navy: '#061C35',
  navyLight: '#123A5F',
  navySoft: '#EAF0F6',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#10243B',
  textMuted: '#68778A',
  border: '#E3E9F0',
  success: '#16875D',
  successSoft: '#E8F7F1',
  warning: '#C67B08',
  warningSoft: '#FFF6DE',
  danger: '#D64545',
  dangerSoft: '#FDECEC',
  info: '#2878C8',
  infoSoft: '#EAF4FF',
  overlay: 'rgba(6, 28, 53, 0.55)',
  onNavy: '#FFFFFF',
  onNavyMuted: 'rgba(255, 255, 255, 0.72)',
  surfaceSubtle: '#F8FAFC',
  divider: '#DCE4ED',
  pressed: 'rgba(6, 28, 53, 0.08)',
  focus: '#FF4B0A',
  disabled: '#9AA6B5',
  disabledSurface: '#EEF1F4',
  neutral: '#5F6F82',
  neutralSoft: '#EEF2F6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  round: 999,
};

export const shadow = {
  shadowColor: colors.navy,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export const typography = {
  sizes: {
    caption: 11,
    footnote: 12,
    label: 13,
    body: 15,
    subtitle: 17,
    title: 20,
    display: 24,
  },
  lineHeights: {
    caption: 16,
    footnote: 18,
    label: 18,
    body: 22,
    subtitle: 24,
    title: 28,
    display: 32,
  },
  weights: {
    regular: '400',
    medium: '600',
    bold: '700',
    extraBold: '800',
    black: '900',
  },
};

export const controlSizes = {
  compact: 40,
  default: 52,
  touchTarget: 44,
  icon: 44,
};

export const formatCurrency = value =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;

export const formatNumber = value =>
  Number(value || 0).toLocaleString('en-IN');

const statusTone = (background, foreground, icon) => ({
  background,
  foreground,
  icon,
});

const statusTones = {
  danger: statusTone(colors.dangerSoft, colors.danger, 'alert-circle-outline'),
  info: statusTone(colors.infoSoft, colors.info, 'information-outline'),
  neutral: statusTone(
    colors.neutralSoft,
    colors.neutral,
    'minus-circle-outline',
  ),
  success: statusTone(
    colors.successSoft,
    colors.success,
    'check-circle-outline',
  ),
  warning: statusTone(
    colors.warningSoft,
    colors.warning,
    'clock-alert-outline',
  ),
};

export const statusColors = status => {
  const rawStatus = String(status || '').trim();
  const normalized = rawStatus.toUpperCase();
  const label = rawStatus
    ? rawStatus.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    : 'Unknown';
  let tone = statusTones.info;

  if (!normalized) {
    tone = statusTones.neutral;
  } else if (
    normalized.includes('CANCEL') ||
    normalized.includes('REJECT') ||
    normalized.includes('OVERDUE') ||
    normalized.includes('FAILED') ||
    normalized.includes('ERROR')
  ) {
    tone = statusTones.danger;
  } else if (normalized.includes('PARTIAL')) {
    tone = statusTones.warning;
  } else if (
    normalized.includes('PAID') ||
    normalized.includes('DELIVERED') ||
    normalized.includes('CONFIRMED') ||
    normalized.includes('ACCEPTED') ||
    normalized.includes('VERIFIED') ||
    normalized.includes('SUCCESS') ||
    normalized.includes('COMPLETED')
  ) {
    tone = statusTones.success;
  } else if (
    normalized.includes('HOLD') ||
    normalized.includes('PENDING') ||
    normalized.includes('NEGOTIATION') ||
    normalized.includes('READY') ||
    normalized.includes('HANDOVER') ||
    normalized.includes('ACCOUNT_VERIFICATION') ||
    normalized === 'COLLECTED'
  ) {
    tone = statusTones.warning;
  }

  return { ...tone, label };
};
