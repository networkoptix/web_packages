import React, { useEffect, useState } from 'react';
import {
    AddonPanel,
    Spaced,
    H2,
    H4,
    HR,
    Button,
    Div,
    TabButton,
    TabBar,
    Table,
} from '@storybook/components';
import { Addon_BaseType } from '@storybook/types';
import {
    ThemeWithOptions,
    initialTheme,
    ThemeOptions,
    brandColors,
    additionalColors,
    attentionColors,
    contrastColors,
} from '../../src/lib/theme-provider/color-types';
import { HexColorPicker } from 'react-colorful';

import {
    CustomThemeEventMap,
    createThemePatchEvent,
    themeUpdatedEventName,
    createThemeResetEvent,
    createColorStorybookEvent,
    createColorGroupStorybookEvent,
} from '../../src/lib/theme-provider/events';
import { clamp } from 'lodash-es';

const spaceButtons = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: '4px',
} as const;

const getStoryBookWindow = () =>
    document?.querySelector<HTMLIFrameElement>('iframe[data-is-storybook=true]')?.contentWindow;

const dispatch = (event: CustomThemeEventMap[keyof CustomThemeEventMap]) =>
    getStoryBookWindow()?.dispatchEvent(event);

const resetTheme = () => dispatch(createThemeResetEvent({}));

const BaseThemeConfiguration = ({ theme, isOpen }: ThemeWithOptions & { isOpen: boolean }) => {
    const colorGroups = [
        { label: 'Brand Colors', value: brandColors.toSorted(), key: 'brand' as const },
        {
            label: 'Additional Colors',
            value: additionalColors.toSorted(),
            key: 'additional' as const,
        },
        { label: 'Attention Colors', value: attentionColors.toSorted(), key: 'attention' as const },
        { label: 'Contrast Colors', value: contrastColors.toSorted(), key: 'contrast' as const },
        { label: 'Generated Colors', value: [], key: 'generated' as const },
    ];
    const [useSelectedGroup, setSelectedGroup] = useState(colorGroups[0]);
    const [useSelectedColor, setSelectedColor] = useState(
        useSelectedGroup.value[0] as (typeof colorGroups)[number]['value'][number],
    );

    if (isOpen) {
        if (useSelectedColor) {
            dispatch(createColorStorybookEvent(useSelectedColor));
        }
    }

    const colorPicker = (
        <>
            <HR></HR>
            <H4>Select Color</H4>
            <TabBar>
                {useSelectedGroup.value.map(colorName => (
                    <TabButton
                        active={colorName === useSelectedColor}
                        onClick={() => {
                            setSelectedColor(colorName);
                            dispatch(createColorStorybookEvent(colorName));
                        }}
                    >
                        {colorName}
                    </TabButton>
                ))}
            </TabBar>
            <HR></HR>
            <HexColorPicker
                color={theme[useSelectedColor]}
                onChange={val =>
                    dispatch(
                        createThemePatchEvent({
                            theme: {
                                [useSelectedColor]: val,
                            },
                        }),
                    )
                }
            />
        </>
    );

    return (
        <Spaced
            row={1}
            outer={false}
        >
            <H4>Select Color Group</H4>
            <TabBar>
                {colorGroups.map(group => (
                    <TabButton
                        active={group.label === useSelectedGroup.label}
                        onClick={() => {
                            setSelectedGroup(group);
                            setSelectedColor(group.value[0]);
                            dispatch(createColorGroupStorybookEvent(group.key));
                            dispatch(createColorStorybookEvent(group.value[0]));
                        }}
                    >
                        {group.label}
                    </TabButton>
                ))}
            </TabBar>
            {useSelectedColor ? colorPicker : <></>}
        </Spaced>
    );
};

const ThemeOptionsConfiguration = ({ options }: ThemeWithOptions) => {
    const normalizedOptions = Object.entries({
        offset: 0,
        inverse: false,
        highContrast: false,
        ...options,
    });

    const getToggleHandler = (optionName: string) => () => {
        const updatedValue = !options?.[optionName as keyof ThemeOptions];
        dispatch(
            createThemePatchEvent({
                options: {
                    [optionName]: updatedValue,
                },
            }),
        );
    };

    const getAdjustHandler =
        (optionName: string, step: number = 1) =>
        () => {
            const boundaries = {
                coreSaturation: {
                    lower: 0,
                    upper: 50,
                },
                backgroundLuminosity: {
                    lower: 0,
                    upper: 30,
                },
                default: {
                    lower: -15,
                    upper: 15,
                },
            };
            const { upper, lower } =
                boundaries[optionName as keyof typeof boundaries] || boundaries.default;
            const updatedValue = (options?.[optionName as keyof ThemeOptions] as number) + step;
            dispatch(
                createThemePatchEvent({
                    options: {
                        [optionName]: clamp(updatedValue, lower, upper),
                    },
                }),
            );
        };

    return (
        <Div>
            <Table>
                <tr>
                    <th>Option</th>
                    <th>Current Value</th>
                    <th>Modify</th>
                </tr>
                {normalizedOptions.map(([optionName, optionValue]) => (
                    <tr>
                        <td>{optionName}</td>
                        <td>{`${optionValue}`}</td>
                        <td style={spaceButtons}>
                            {typeof optionValue === 'boolean' ? (
                                <Button
                                    onClick={getToggleHandler(optionName)}
                                >{`Toggle to ${!optionValue}`}</Button>
                            ) : (
                                <>
                                    <Button onClick={getAdjustHandler(optionName, -1)}>
                                        Decrease
                                    </Button>
                                    <Button onClick={getAdjustHandler(optionName)}>Increase</Button>
                                </>
                            )}
                        </td>
                    </tr>
                ))}
            </Table>
        </Div>
    );
};

export const ThemeConfiguration: Addon_BaseType['render'] = ({ active }) => {
    const [useTheme, setTheme] = useState<ThemeWithOptions>({ theme: initialTheme });
    const [useOptions, setOptions] = useState(false);
    useEffect(() => {
        const checking = setInterval(() => {
            const iframeWindow = document.querySelector<HTMLIFrameElement>(
                'iframe[data-is-storybook=true]',
            )?.contentWindow;

            if (iframeWindow) {
                console.info('storybook loaded');

                iframeWindow.addEventListener(themeUpdatedEventName, ({ detail }) => {
                    console.info('theme updated');
                    setTheme(detail);
                });
                clearInterval(checking);
                return;
            }

            console.info('still loading storybook');
        }, 500);

        return () => {
            clearInterval(checking);
        };
    });

    const configurationSection = useOptions ? (
        <ThemeOptionsConfiguration {...useTheme} />
    ) : (
        <BaseThemeConfiguration
            {...useTheme}
            isOpen={!!active}
        />
    );
    const getTitle = (options: boolean) =>
        options ? 'Theme Options Configuration' : 'Theme Base Colors Configuration';

    return (
        <AddonPanel active={!!active}>
            <Spaced
                col={2}
                row={1}
                outer={1}
            >
                <Div>
                    <H2>{getTitle(useOptions)}</H2>
                    <Div style={{ ...spaceButtons, justifyContent: 'flex-start' }}>
                        <Button
                            onClick={() => setOptions(!useOptions)}
                        >{`Open ${getTitle(!useOptions)}`}</Button>
                        <Button onClick={resetTheme}>Reset Theme</Button>
                    </Div>
                    <HR></HR>
                </Div>
                {configurationSection}
            </Spaced>
        </AddonPanel>
    );
};
