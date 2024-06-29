import { CustomThemeEventMap } from "../../src/lib/theme-provider/events";

export const getStoryBookWindow = () =>
    document?.querySelector<HTMLIFrameElement>('iframe[data-is-storybook=true]')?.contentWindow;

export const dispatch = (event: CustomThemeEventMap[keyof CustomThemeEventMap]) =>
    getStoryBookWindow()?.dispatchEvent(event);