import colors from './colors';

export const topRulerDrawingConfig = {
    serif: {
        heightRelative: 0.3,
        baseColorHex: colors.dark15,
        opacity: 1.0
    },
    topLabel: {
        fontSize: 13,
        baseColorHex: colors.dark9,
        opacity: 1.0
    },
    bottomLabel: {
        fontSize: 14,
        baseColorHex: colors.dark13,
        opacity: 1.0
    },
    backgroundEvenColor: colors.light1,
    backgroundOddColor: colors.additional_light2,
    underscoreColor: `${colors.dark15}4D`
};

export default topRulerDrawingConfig;
