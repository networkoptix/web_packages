import colors from './colors';
const baseColorHex = colors.dark15;

export const primaryRulerSerifDrawingConfigs = {
    0: {
        baseColorHex,
        heightRelative: 0.0,
        opacity: 0.0,
        label: {
            fontSize: 0
        }
    },
    1: {
        baseColorHex,
        heightRelative: 0.05,
        opacity: 0.3,
        label: {
            fontSize: 0
        }
    },
    2: {
        heightRelative: 0.05,
        baseColorHex,
        opacity: 0.6,
        label: {
            fontSize: 11,
            opacity: 0.8
        }
    },
    3: {
        heightRelative: 0.1,
        baseColorHex,
        opacity: 0.8,
        label: {
            fontSize: 13
        }
    },
    4: {
        heightRelative: 0.16,
        baseColorHex,
        opacity: 1.0,
        label: {
            fontSize: 14
        }
    }
};

export default primaryRulerSerifDrawingConfigs;
