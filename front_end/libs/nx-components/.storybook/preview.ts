import { setCompodocJson } from '@storybook/addon-docs/angular';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { Preview } from '@storybook/angular';
import { themes } from '@storybook/theming';

import docJson from '../documentation.json';

window.IS_STORYBOOK = true;

setCompodocJson(docJson);

export const decorators: Preview['decorators'] = [
    withThemeByDataAttribute({
        themes: {
            Light: 'light',
            Dark: 'dark',
            'Light Gray': 'light-gray',
            'Dark Gray': 'dark-gray',
            'High Contrast Light': 'high-contrast-light',
            'High Contrast Dark': 'high-contrast-dark',
        },
        defaultTheme: 'Dark',
        attributeName: 'storybook-theme',
    }),
];

export const parameters: Preview['parameters'] = {
    docs: {
        theme: themes.dark,
    },
};
