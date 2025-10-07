const VIVID_PUMPKIN = '#CC693D';
const BURNT_ORANGE = '#8A4B36';
const VIVID_AMBER = '#DD8E4D';
const RICH_AMBER = '#EAB975';
const MUTED_SAFFRON = '#EDC98E';
const IVORY = '#F2E6CD';
const IVORY_LIGHT = '#EEEOC2';
const IVORY_LIGHTER = '#F4E9D2';
const IVORY_LIGHTEST = '#F7EEDF';
const IVORY_PALE = '#FBEBD7';
const WHITE = '#FFFFFF';
const BLACK = '#000000';

export default {
  brand: {
    primary: VIVID_PUMPKIN,
    primaryDark: BURNT_ORANGE,
    primaryLight: VIVID_AMBER,
    accent: RICH_AMBER,
    accentLight: MUTED_SAFFRON,
  },
  
  text: {
    primary: BLACK,
    secondary: '#666666',
    tertiary: '#999999',
    inverse: WHITE,
  },
  
  background: {
    primary: WHITE,
    secondary: IVORY_PALE,
    tertiary: IVORY_LIGHTEST,
    ivory: IVORY,
    ivoryLight: IVORY_LIGHT,
  },
  
  border: {
    light: IVORY_LIGHTER,
    medium: IVORY_LIGHT,
    dark: MUTED_SAFFRON,
  },
  
  status: {
    success: '#10B981',
    warning: RICH_AMBER,
    error: '#EF4444',
    info: VIVID_AMBER,
  },
  
  wallet: {
    virtual: '#8B5CF6',
    actual: '#10B981',
  },
  
  tab: {
    active: VIVID_PUMPKIN,
    inactive: '#999999',
  },
};
