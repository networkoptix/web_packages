import { Show } from '../nx-theme-palette/utils';

import { ThemeColors, ThemeWithOptions } from './color-types';

export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object | undefined
          ? RecursivePartial<T[P]>
          : T[P];
};

export const defineCustomEventFactory =
    <Detail, EventName extends string>(eventName: EventName) =>
    (detail: Detail): CustomEvent<Detail> =>
        new CustomEvent(eventName, { detail });

export const themeUpdatedEventName = 'nx-components:theme:updated';
export const createThemeUpdateEvent = defineCustomEventFactory<
    ThemeWithOptions,
    typeof themeUpdatedEventName
>(themeUpdatedEventName);

export const themePatchEventName = 'nx-components:theme:patch';
export const createThemePatchEvent = defineCustomEventFactory<
    RecursivePartial<ThemeWithOptions>,
    typeof themePatchEventName
>(themePatchEventName);

export const themeResetEventName = 'nx-components:theme:reset';
export const createThemeResetEvent = defineCustomEventFactory<
    RecursivePartial<ThemeWithOptions>,
    typeof themeResetEventName
>(themeResetEventName);

export const baseColorStorybookEventName = 'nx-components:storybook:set-base';
export const createColorStorybookEvent = (color: ThemeColors): CustomEvent<ThemeColors> =>
    new CustomEvent(baseColorStorybookEventName, { detail: color });

export const colorGroupStorybookEventName = 'nx-components:storybook:set-group';
export const createColorGroupStorybookEvent = (group: Show): CustomEvent<Show> =>
    new CustomEvent(colorGroupStorybookEventName, { detail: group });

export const createComponentVariablesEventName = 'nx-components:component:variables';
export const createComponentVariablesEvent = (
    detail: Record<string, [string, string]>,
): CustomEvent<Record<string, [string, string]>> =>
    new CustomEvent(createComponentVariablesEventName, { detail });

export const toggleSecondaryMenuEventName = 'nx-components:layout:toggleSecondaryMenu';
export const toggleSecondaryMenuEvent = (open?: boolean): CustomEvent<boolean | undefined> =>
    new CustomEvent(toggleSecondaryMenuEventName, { detail: open });

export const toggleModalEventName = 'nx-components:layout:toggleModal';
export const toggleModalEvent = (
    open?: boolean,
    width?: string,
    collapsible = true,
): CustomEvent<{ open?: boolean; width?: string; collapsible: boolean }> =>
    new CustomEvent(toggleModalEventName, { detail: { open, width, collapsible } });

export interface CustomNxComponentsEventMap {
    [themeUpdatedEventName]: ReturnType<typeof createThemeUpdateEvent>;
    [themePatchEventName]: ReturnType<typeof createThemePatchEvent>;
    [themeResetEventName]: ReturnType<typeof createThemePatchEvent>;
    [baseColorStorybookEventName]: ReturnType<typeof createColorStorybookEvent>;
    [colorGroupStorybookEventName]: ReturnType<typeof createColorGroupStorybookEvent>;
    [createComponentVariablesEventName]: ReturnType<typeof createComponentVariablesEvent>;
    [toggleSecondaryMenuEventName]: ReturnType<typeof toggleSecondaryMenuEvent>;
    [toggleModalEventName]: ReturnType<typeof toggleModalEvent>;
}
