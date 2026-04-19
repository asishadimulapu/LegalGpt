/**
 * LawGPT Mobile - Responsive Utilities
 * Provides scaling functions for different screen sizes
 */

import { Dimensions } from 'react-native';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro / iPhone X as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Screen size categories
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
const isLargeDevice = SCREEN_WIDTH >= 414;
const isTablet = SCREEN_WIDTH >= 768;

/**
 * Width percentage of screen
 * @param {number} percentage - Percentage of screen width (0-100)
 * @returns {number} Calculated width
 */
export const wp = (percentage) => {
    return (percentage / 100) * SCREEN_WIDTH;
};

/**
 * Height percentage of screen
 * @param {number} percentage - Percentage of screen height (0-100)
 * @returns {number} Calculated height
 */
export const hp = (percentage) => {
    return (percentage / 100) * SCREEN_HEIGHT;
};

/**
 * Scale a size based on screen width ratio
 * Good for consistent sizing across devices
 * @param {number} size - Base size in pixels
 * @returns {number} Scaled size
 */
export const scale = (size) => {
    return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale a size vertically based on screen height ratio
 * @param {number} size - Base size in pixels
 * @returns {number} Scaled size
 */
export const verticalScale = (size) => {
    return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Moderate scale - scales with a factor to prevent extreme scaling
 * Best for font sizes and icon sizes
 * @param {number} size - Base size in pixels
 * @param {number} factor - Scaling factor (0-1), default 0.5
 * @returns {number} Scaled size
 */
export const moderateScale = (size, factor = 0.5) => {
    return size + (scale(size) - size) * factor;
};

/**
 * Moderate vertical scale
 * @param {number} size - Base size in pixels
 * @param {number} factor - Scaling factor (0-1), default 0.5
 * @returns {number} Scaled size
 */
export const moderateVerticalScale = (size, factor = 0.5) => {
    return size + (verticalScale(size) - size) * factor;
};

/**
 * Get font size based on screen size category
 * Provides stepped sizing for better control
 */
export const getFontSize = {
    xs: moderateScale(11),
    sm: moderateScale(13),
    base: moderateScale(15),
    md: moderateScale(17),
    lg: moderateScale(19),
    xl: moderateScale(22),
    xxl: moderateScale(26),
    xxxl: moderateScale(32),
    display: moderateScale(42),
};

/**
 * Get spacing based on screen size
 */
export const getSpacing = {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(14),
    lg: moderateScale(20),
    xl: moderateScale(28),
    xxl: moderateScale(40),
    xxxl: moderateScale(56),
};

/**
 * Get icon size based on screen size
 */
export const getIconSize = {
    xs: moderateScale(14),
    sm: moderateScale(18),
    md: moderateScale(22),
    lg: moderateScale(28),
    xl: moderateScale(36),
    xxl: moderateScale(48),
};

// Screen size detection exports
export const screenSize = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isSmall: isSmallDevice,
    isMedium: isMediumDevice,
    isLarge: isLargeDevice,
    isTablet: isTablet,
};

// Shorthand aliases
export const ms = moderateScale;
export const mvs = moderateVerticalScale;
export const s = scale;
export const vs = verticalScale;

export default {
    wp,
    hp,
    scale,
    verticalScale,
    moderateScale,
    moderateVerticalScale,
    getFontSize,
    getSpacing,
    getIconSize,
    screenSize,
    ms,
    mvs,
    s,
    vs,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
};
