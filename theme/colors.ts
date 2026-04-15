export const COLORS = {
  primary: {
    50: '#fdf8f6',
    100: '#f2e8e0',
    600: '#864b03', // New Brown
  },
  blue: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    600: '#0284c7', // Vivid Blue
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    600: '#10b981',
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    600: '#ef4444',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    600: '#f59e0b',
  },
  purple: {
    50: '#fdf4ff',
    100: '#fae8ff',
    600: '#a855f7',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#050505',
  },
  darkSurface: '#0D0D0D',
  darkBorder: 'rgba(134, 75, 3, 0.15)', // Brown-tinted border
  white: '#ffffff',
};

// Mode-specific color tokens
// Enforcing Single Theme: Both light and dark keys map to the same "Light/Standard" palette
const StandardTheme = {
  primary: COLORS.primary[600],
  secondary: COLORS.blue[600],
  background: COLORS.slate[50], // Always light background
  surface: COLORS.white,
  border: COLORS.slate[200],
  text: COLORS.slate[900],
  textSecondary: COLORS.slate[500],
  card: COLORS.white,
  iconBg: COLORS.slate[100],
};

export const ThemeColors = {
  light: StandardTheme,
  dark: StandardTheme, // Disability Dark Mode essentially
};

// Legacy Flat Colors (mapping to primary brand colors)
export const Colors = {
  primary: COLORS.primary[600],
  secondary: COLORS.blue[600],
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  white: COLORS.white,
};
