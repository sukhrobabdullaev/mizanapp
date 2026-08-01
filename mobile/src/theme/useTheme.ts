import { useColorScheme } from 'react-native';

import { palettes } from './index';

/** Structural palette type — light and dark share keys but not literal values. */
export type Palette = { [K in keyof (typeof palettes)['light']]: string };

/** Resolves the active palette from the OS colour scheme. */
export function useTheme(): { palette: Palette; isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { palette: isDark ? palettes.dark : palettes.light, isDark };
}
