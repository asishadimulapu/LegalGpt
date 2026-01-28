/**
 * NyayaSahay Mobile - Design System Colors
 * Pixel-perfect replica of web CSS variables
 */

export const COLORS = {
    // Primary Colors (Teal)
    primary: '#26B8B8',
    primaryDark: '#1fa3a3',
    primaryLight: '#3dd4d4',

    // Dark Theme (Sidebar, Headers)
    darkBg: '#0f1419',
    darkSurface: '#1a1f2e',
    darkCard: '#252d3d',

    // Light Theme (Main Content Areas)
    lightBg: '#f8f9fa',
    lightSurface: '#ffffff',
    lightCard: '#ffffff',

    // Text Colors
    textWhite: '#ffffff',
    textLight: '#b8c1cc',
    textDark: '#1a1f2e',
    textMuted: '#6b7280',

    // Accent Colors
    accentOrange: '#f59e0b',
    accentGreen: '#10b981',
    accentBlue: '#3b82f6',
    accentPurple: '#8b5cf6',

    // Borders
    borderColor: '#e5e7eb',
    borderDark: '#374151',

    // Status Colors
    errorRed: '#DC2626',
    errorBg: '#FEE2E2',
    successGreen: '#10b981',

    // Transparency variants
    primaryTransparent: 'rgba(38, 184, 184, 0.15)',
    primaryGlow: 'rgba(38, 184, 184, 0.3)',
    darkOverlay: 'rgba(0, 0, 0, 0.5)',
    whiteOverlay: 'rgba(255, 255, 255, 0.1)',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
};

export const RADIUS = {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 8,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
    },
    glow: {
        shadowColor: '#26B8B8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
        elevation: 10,
    },
};

export const FONT_SIZES = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
};

export default { COLORS, SPACING, RADIUS, SHADOWS, FONT_SIZES };
