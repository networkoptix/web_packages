import { Injectable } from '@angular/core';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import {
    PrimaryRuler, RecordsConfig, TopRuler
} from '@vms-client/submodules/timeline/services/canvas-renderer/drawingConfigs/drowingConfigs.service.types';

import { colors } from './colors';

@Injectable({
    providedIn: 'root'
})
export class NxDrawingConfigsService {
    primaryRulerSerifDrawingConfigs(rule: number): PrimaryRuler {
        const primaryRuler = {
            0: {
                baseColorHex: NxConfigService.isDarkTheme ? colors.light12 : colors.dark15,
                heightRelative: 0.0,
                opacity: 0.0,
                label: {
                    fontSize: 0
                }
            },
            1: {
                baseColorHex: NxConfigService.isDarkTheme ? colors.light12 : colors.dark15,
                heightRelative: 0.05,
                opacity: 0.3,
                label: {
                    fontSize: 0
                }
            },
            2: {
                baseColorHex: NxConfigService.isDarkTheme ? colors.light12 : colors.dark15,
                heightRelative: 0.05,
                opacity: 0.6,
                label: {
                    fontSize: 11,
                    opacity: 0.8
                }
            },
            3: {
                baseColorHex: NxConfigService.isDarkTheme ? colors.light12 : colors.dark15,
                heightRelative: 0.1,
                opacity: 0.8,
                label: {
                    fontSize: 13
                }
            },
            4: {
                baseColorHex: NxConfigService.isDarkTheme ? colors.light12 : colors.dark15,
                heightRelative: 0.16,
                opacity: 1.0,
                label: {
                    fontSize: 14
                }
            }
        };
        
        return primaryRuler[rule];
    }

    get recordsDrawingConfig(): RecordsConfig {
        return {
            BACKGROUND_FILL_STYLE: NxConfigService.isDarkTheme ? colors.dark9 : colors.light3,
            RECORD_FILL_STYLE: NxConfigService.isDarkTheme ? colors.green_main : colors.green_l2,
            RECORDS_OFFSET_RELATIVE: 0.6,
            RECORDS_HEIGHT_RELATIVE: 0.24,
            MIN_RECORD_WIDTH_PX: 2
        };
    }

    get topRulerDrawingConfig(): TopRuler {
        return {
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
    }
}
