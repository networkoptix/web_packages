import { NxConfigService } from '@services/nx-config/nx-config.service';

import { colors } from '../drawingConfigs/colors';

import { deg, px, pxPerSecond, color } from './types';

export const stripeCfg = {
    stripeWidth: 8 as px,
    slope: 45 as deg,
    speed: 24 as pxPerSecond,
    backgroundColor: NxConfigService.isDarkTheme ? `${colors.light16}CC` as color : `${colors.light6}CC` as color,
    stripeColor: NxConfigService.isDarkTheme ? `${colors.light10}CC` as color : `${colors.light1}CC` as color
};
