import { NxConfigService } from '@services/nx-config/nx-config.service';

import { colors } from './colors';

export const cfg = {
    BACKGROUND_FILL_STYLE: NxConfigService.isDarkTheme ? colors.dark9 : colors.light3,
    RECORD_FILL_STYLE: NxConfigService.isDarkTheme ? colors.green_main : colors.green_l2,
    RECORDS_OFFSET_RELATIVE: 0.6,
    RECORDS_HEIGHT_RELATIVE: 0.24,
    MIN_RECORD_WIDTH_PX: 2
};
