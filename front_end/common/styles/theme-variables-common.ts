/* Add variables to this file when using in code */

export const COLLAPSE_SECOND_WIDTH = 768;

export enum GridBreakpoints {
    XS = 0,
    SM = 576,
    MD = 768,
    LG = 992,
    XL = 1280,
    XXL = 1440,
    XXXL = 1600,
    XXXXL = 1920,
}

export const GRID_PANEL_WIDTH = 350;
export const GRID_SUPER_WIDE_PANEL_WIDTH = 450;

// Not from _theme_variables_common.scss, but included here for convenience
export const ViewportBreakpoints = {
    Mobile: {
        width: 320,
        height: 480,
    },
    Tablet: {
        width: 768,
        height: 1024,
    },
    Screen: {
        width: 1440,
        height: 900,
    }
};
