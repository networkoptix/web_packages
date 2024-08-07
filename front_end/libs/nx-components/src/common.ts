import { CustomNxComponentsEventMap } from './lib/theme-provider/events';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getStoryBookWindow = () =>
    document?.querySelector<HTMLIFrameElement>('iframe[data-is-storybook=true]')?.contentWindow;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const dispatch = (event: CustomNxComponentsEventMap[keyof CustomNxComponentsEventMap]) =>
    getStoryBookWindow()?.dispatchEvent(event);
