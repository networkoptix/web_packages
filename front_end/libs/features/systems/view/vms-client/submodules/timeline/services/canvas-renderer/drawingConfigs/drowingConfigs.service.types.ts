
export interface PrimaryRuler {
    baseColorHex;
    heightRelative;
    opacity;
    label;
}

export interface TopRuler {
    serif: {
        heightRelative;
        baseColorHex;
        opacity;
    };
    topLabel: {
        fontSize;
        baseColorHex;
        opacity;
    };
    bottomLabel: {
        fontSize;
        baseColorHex;
        opacity;
    };
    backgroundEvenColor;
    backgroundOddColor;
    underscoreColor;
}

export interface RecordsConfig {
    BACKGROUND_FILL_STYLE;
    RECORD_FILL_STYLE;
    RECORDS_OFFSET_RELATIVE;
    RECORDS_HEIGHT_RELATIVE;
    MIN_RECORD_WIDTH_PX;
}
