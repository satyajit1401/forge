import { config as defaultConfig } from '@gluestack-ui/config';
import { createConfig } from '@gluestack-ui/themed';
import { colors, spacing, fontSize, borderRadius, breakpoints } from './lib/design-tokens';

export const config = createConfig({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Custom design system colors
      ...colors,
    },
    space: {
      ...defaultConfig.tokens.space,
      ...spacing,
    },
    fontSizes: {
      ...defaultConfig.tokens.fontSizes,
      ...fontSize,
    },
    radii: {
      ...defaultConfig.tokens.radii,
      ...borderRadius,
    },
  },
  // Extended breakpoints for better responsiveness
  breakpoints: {
    base: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
});

export type Config = typeof config;

declare module '@gluestack-ui/themed' {
  interface ICustomConfig extends Config {}
}
