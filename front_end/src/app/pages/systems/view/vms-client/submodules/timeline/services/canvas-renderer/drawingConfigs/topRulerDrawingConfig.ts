import { NxConfigService } from '@services/nx-config/nx-config.service';

import { colors } from './colors';

export const topRulerDrawingConfig = {
    serif: {
        heightRelative: 0.3,
        baseColorHex: NxConfigService.isDarkTheme ? colors.light10 : colors.dark15,
        opacity: 1.0
    },
    topLabel: {
        fontSize: 13,
        baseColorHex: NxConfigService.isDarkTheme ? colors.light4 : colors.dark9,
        opacity: 1.0
    },
    bottomLabel: {
        fontSize: 14,
        baseColorHex: NxConfigService.isDarkTheme ? colors.light13 : colors.dark13,
        opacity: 1.0
    },
    backgroundEvenColor: NxConfigService.isDarkTheme ? colors.dark2 : colors.light1,
    backgroundOddColor: NxConfigService.isDarkTheme ? colors.dark4 : colors.additional_light2,
    underscoreColor: NxConfigService.isDarkTheme ? `${colors.light15}4C` : `${colors.dark15}4C`
};
