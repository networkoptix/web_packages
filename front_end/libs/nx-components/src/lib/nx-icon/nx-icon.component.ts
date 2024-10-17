import { CommonModule } from '@angular/common';
import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { capitalize, flow, memoize } from 'lodash-es';
import { switchMap } from 'rxjs';

import {
    extractAllColors,
    fullHeight,
    fullWidth,
    getIcon,
    normalizeClassNames,
    NxIconNames,
    NxIconOrName,
    NxIcons,
    removeInlineStyles,
    SvgTransform,
} from 'nx-icons';

import { BaseComponent } from '../base-component';
import { generateCssVariableName, GeneratedTheme, isHexString } from '../theme-provider';

import { NxApplyActionTargetDirective } from './nx-apply-action-classes-target.directive';

type SvgColor = {
    stroke: string | null;
    fill: string | null;
};

type SvgColors = { primary: SvgColor; secondary: SvgColor; third: SvgColor };

type PartialSvgColors =
    | SvgColors
    | Pick<SvgColors, 'primary'>
    | Pick<SvgColors, 'secondary'>
    | Pick<SvgColors, 'third'>
    | undefined;

const colorMapping = {
    // Mapped colors
    '#A5B7C0': generateCssVariableName('core', 'dark10'),
    '#fff': generateCssVariableName('core', 'dark1'),
    '#303F47': generateCssVariableName('core', 'light10'),
    '#698796': generateCssVariableName('core', 'dark16'),
    '#E1E7EA': generateCssVariableName('core', 'dark4'),
    '#FFCA28': generateCssVariableName('additionalAmber', 'initial'),
    '#EF5350': generateCssVariableName('attentionErrorRed', 'initial'),
    '#53707F': generateCssVariableName('core', 'light17'),
    '#91A7B2': generateCssVariableName('core', 'dark12'),
    '#212A2F': generateCssVariableName('core', 'light7'),
    '#263137': generateCssVariableName('core', 'light8'),
    '#171C1F': generateCssVariableName('core', 'light5'),
    '#2FA2DB': generateCssVariableName('brand', 'initial'),
    '#CDD7DC': generateCssVariableName('core', 'dark5'),
    '#000': generateCssVariableName('core', 'light1'),
    '#4E6977': generateCssVariableName('core', 'light16'),
    '#42A5F5': generateCssVariableName('attentionInfoBlue', 'initial'),
    '#879FAB': generateCssVariableName('core', 'dark13'),
    '#AFBFC7': generateCssVariableName('core', 'dark9'),
    '#C3CFD5': generateCssVariableName('core', 'dark7'),
    white: generateCssVariableName('core', 'dark1'),
    '#F02C2C': generateCssVariableName('attentionWarningYellow', 'initial'),
    '#2B383F': generateCssVariableName('core', 'light9'),
    '#3F545F': generateCssVariableName('core', 'light13'),
    '#66BB6A': generateCssVariableName('attentionSuccessGreen', 'initial'),
    '#C22626': generateCssVariableName('attentionErrorRed', 'initial'),
    '#3A4D57': generateCssVariableName('core', 'light12'),
    '#445B67': generateCssVariableName('core', 'light14'),
    '#587787': generateCssVariableName('core', 'light18'),
    '#A3B8C2': generateCssVariableName('core', 'light11'),
    '#F44336': generateCssVariableName('attentionErrorRed', 'light16'),
    '#7E9BA9': generateCssVariableName('core', 'light16'),
    '#0C1012': generateCssVariableName('core', 'dark2'),
    '#DAE2E7': generateCssVariableName('core', 'light4'),
    '#1E88E5': generateCssVariableName('attentionInfoBlue', 'light8'),
    '#FFC107': generateCssVariableName('attentionWarningYellow', 'light18'),
    // Can't find mapping
    '#4CAF50': '#4CAF50',
    '#E5E9EB': '#E5E9EB',
    '#4FC627': '#4FC627',
    '#B0BEC4': '#B0BEC4',
    '#7B929D': '#7B929D',
    '#D9D9D9': '#D9D9D9',
    '#8B8D8F': '#8B8D8F',
    '#BABABA': '#BABABA',
    '#EDB732': '#EDB732',
    // Doesn't need mapping
    none: 'none',
    'url(#a)': 'url(#a)',
    'url(#b)': 'url(#b)',
    'url(#c)': 'url(#c)',
    'url(#d)': 'url(#d)',
};
/**
 * The icons look like they were defined in light theme compared to most that were defined in dark theme.
 *
 * Skip normalizing for these icons.
 *
 * For comparison story we should change the theme to light for these.
 */
const skipNormalize: NxIconNames[] = [
    'ZoomOut',
    'ZoomIn',
    'WsTilesFolder',
    'WsFolderOpenSelected',
    'WsFolderOpen',
    'WsFolderCloseSelected',
    'WsFolderClose',
    'Backward',
    'AddingDevicesPlaceholder',
    'ButtonIndicatorOff',
    'Calendar52X24',
    'Chart',
    'Forward',
    'Group64X64',
    'GroupDefault20X20',
    'GroupDefault64X64',
    'GroupLdap',
    'Hotspots',
    'IndicatorOff',
    'Initials',
    'LayoutCloudLocked',
    'LayoutExportedEncrypted',
    'LayoutShared',
    'LayoutsIntercom',
    'LayoutsShared',
    'LdapGroup',
    'Live52X24',
    'MainMenu',
    // 'Motion20X20',
    'NoLayouts',
    'Nolist',
    'Nomembers',
    'Noobjects',
    'NoOrganization',
    'NoPartner',
    'Noserver',
    'Noservices',
    'Nosettings',
    'Nosite',
    'Notfound',
    'Notification20X20',
    'Notification64X64',
    'NotificationNumber',
    'Nousers',
    'Object20X20',
    'Openfolder',
    'Organization64X64',
    'Organizations',
    'OrganizationShutdown',
    'OrganizationSuspended',
    'OtherSystems',
    'Pan',
    'PanAndTilt',
    'Partner20X20',
    'Partner64X64',
    'Paste',
    'Pause20X20Variant1',
    'Pause32X32',
    'Play32X32',
    'Report',
    'RewindBackward',
    'RewindForward',
    'Searchbyip',
    'Sound64X64',
    'StepBackward',
    'StepForward',
    'Sync',
    // 'Thumbnails',
    'Tilt',
    'TimePlaceholder',
    'User64X64',
    'UserAlert',
    'UserCloud20X20',
    'UserCloud64X64',
    'UserLdap20X20',
    'UserLdap64X64',
    'UserOrganization64X64',
    'UserOwner',
    'UserTemp20X20',
    'UserTemp64X64',
    'VideowallServerPlaceholder',
    'VideowallWebpagePlaceholder',
    // 'VirtualCamera',
];

/**
 * These don't seem to have proper layer classes or some have fill url which
 * we need to figure out how to handle.
 *
 * Either these won't be themed or we need to have the svg updated for these.
 */
const alwaysUseInlineStyles: NxIconNames[] = [
    'AccountBox',
    'AllEvents',
    'Article',
    'Capslock',
    'CapslockText',
    'Calendar20X20Variant2',
    'Certificate90X124',
    'ConnectToCloud54X32',
    'ConnectToServer54X32',
    'CursorCross',
    'CursorMove',
    'Deny',
    'Loaders',
    'NoFavorites128X128',
    'NoHidden128X128',
    'NoSystemsFound128X128',
    'NxConnectPlaceholder240X240',
    'PanelLeft',
    'PanelPin',
    'PanelRight',
    'PtzPromoAdvanced',
    'PtzPromoDrag',
    'PtzPromoKeys',
    'PtzPromoOld',
    'PtzPromoScroll',
    'PtzPromoShowAgain',
    'PtzPromoTracking',
    'Settings39X78',
    'StHeateroff',
    'StHvacFanStart',
];

const getColor = (
    color: string,
    colors: GeneratedTheme,
    selectorName: keyof SvgColors,
    iconName: NxIconNames,
): string => {
    const normalize = (color: string): keyof GeneratedTheme => {
        if (
            !skipNormalize.includes(iconName) &&
            selectorName === 'primary' &&
            color.includes('core') &&
            color.includes('dark')
        ) {
            return color.replace('dark', 'light') as ReturnType<typeof normalize>;
        }
        return color as ReturnType<typeof normalize>;
    };

    const mappedColor = colorMapping[color as keyof typeof colorMapping];
    const normalizedColor = normalize(mappedColor);
    if (isHexString(normalizedColor)) {
        return normalizedColor;
    }
    return colors[normalizedColor] || mappedColor;
};

const extractSvgColors = ({ data, name }: NxIcons, colors: GeneratedTheme): PartialSvgColors => {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = data;
    const keys = ['primary', 'secondary', 'third'] as const;
    const extracted = keys.reduce((acc, selectorName): PartialSvgColors => {
        const fill = [...tempElement.querySelectorAll(`.${capitalize(selectorName)}`)].map(el =>
            el.getAttribute('fill'),
        )[0];
        const stroke = [...tempElement.querySelectorAll(`.${capitalize(selectorName)}`)].map(el =>
            el.getAttribute('stroke'),
        )[0];

        return fill || stroke
            ? ({
                  ...acc,
                  [selectorName]: {
                      fill: fill ? getColor(fill, colors, selectorName, name) : null,
                      stroke: stroke ? getColor(stroke, colors, selectorName, name) : null,
                  },
              } as PartialSvgColors)
            : acc;
    }, {} as PartialSvgColors);
    return Object.keys(extracted || {}).length ? extracted : undefined;
};

/**
 * Most likely will only be used internally
 */
@Component({
    selector: 'nx-icon',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './nx-icon.component.html',
    styleUrl: './nx-icon.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    hostDirectives: [
        {
            directive: NxApplyActionTargetDirective,
            inputs: ['nxActionClassesTarget'],
        },
    ],
})
export class NxIconComponent extends BaseComponent {
    static ensureStyleMapping = memoize(async () => {
        const allColors = await extractAllColors();
        const missingColors = allColors.filter(
            color => !colorMapping[color as keyof typeof colorMapping],
        );

        return missingColors;
    });
    /**
     * Name or reference to icon definition.
     */
    public icon = input.required<NxIconOrName>();

    /**
     * Preserve inline styles from svg (won't remove fill/stroke).
     *
     * Mostly for internal testing.
     */
    public preserveInline = input(false, { transform: booleanAttribute });

    /**
     * Preserve size (sizing styles applied to the nx-icon component won't be applied to svg).
     *
     * Probably mostly for testing, not sure if there are a lot of cases where we want to use the
     * size defined in the svg.
     */
    public preserveSize = input(false, { transform: booleanAttribute });

    /**
     * Override the color defined within the icon.
     */
    public colorOverrides = input<PartialSvgColors>();

    /**
     * Use Current Color for primary stroke/fill.
     */
    public useCurrentColor = input(false, { transform: booleanAttribute });

    protected resolvedIcon = toSignal(
        toObservable(this.icon).pipe(
            switchMap(async iconOrName => {
                if (typeof iconOrName === 'string') {
                    return getIcon(iconOrName);
                }

                return iconOrName;
            }),
        ),
    );

    iconWithTransforms = computed(() => {
        const resolvedIcon = this.resolvedIcon();
        if (resolvedIcon) {
            const transforms: SvgTransform[] = [normalizeClassNames];

            if (!this.preserveInline() && !alwaysUseInlineStyles.includes(resolvedIcon.name)) {
                transforms.push(removeInlineStyles);
            }

            if (!this.preserveSize()) {
                transforms.push(fullWidth, fullHeight);
            }

            const withTransforms = flow(transforms) as SvgTransform;
            return withTransforms(resolvedIcon.data);
        }

        return false;
    });

    updateStoryBookThemeEffect = effect(
        () => {
            const icon = this.resolvedIcon();
            if (
                window.IS_STORYBOOK &&
                !this.preserveInline() &&
                icon &&
                window.parent.location.href.includes('--compare-against-initial')
            ) {
                this.themeProvider.toggleTheme(!skipNormalize.includes(icon.name));
            }
        },
        { allowSignalWrites: true },
    );

    updateIconEffect = effect(() => {
        const transformed = this.iconWithTransforms();
        if (transformed) {
            this.elRef.nativeElement.innerHTML = transformed;
        }
    });

    declareClassesEffect = effect(() => {
        const resolvedIcon = this.resolvedIcon();
        if (resolvedIcon) {
            const colors = this.themeProvider.colors();
            const useCurrentColor = this.useCurrentColor();
            const primaryDefault = colors[generateCssVariableName('core', 'light10')];
            const secondaryDefault =
                colors[generateCssVariableName('attentionErrorRed', 'initial')];
            const thirdDefault = colors[generateCssVariableName('brand', 'initial')];
            const defaults: SvgColors = {
                primary: { fill: primaryDefault, stroke: primaryDefault },
                secondary: { fill: secondaryDefault, stroke: secondaryDefault },
                third: { fill: thirdDefault, stroke: thirdDefault },
            };
            const extracted: PartialSvgColors = extractSvgColors(resolvedIcon, colors);
            // console.info({ extracted: this.colorOverrides() });
            const merged = {
                ...defaults,
                ...extracted,
                ...this.colorOverrides(),
            };
            Object.entries(merged).forEach(([key, color]) => {
                const { fill, stroke } =
                    useCurrentColor && key === 'primary'
                        ? {
                              fill: 'currentColor',
                              stroke: 'currentColor',
                          }
                        : color;
                if (fill) {
                    this.elRef.nativeElement.style.setProperty(`--svg-${key}-fill`, fill);
                }
                if (stroke) {
                    this.elRef.nativeElement.style.setProperty(`--svg-${key}-stroke`, stroke);
                }
            });
        }
    });

    override variablesDeclaration = computed(() => {
        return {};
    });

    constructor() {
        super();
        if (window.IS_STORYBOOK) {
            NxIconComponent.ensureStyleMapping().then(missingColors => {
                if (missingColors.length) {
                    alert(`Missing colors: ${missingColors.join(', ')}`);
                    console.info({
                        missingColors: Object.fromEntries(
                            missingColors.map(color => [color, color]),
                        ),
                    });
                }
            });
        }
    }
}
