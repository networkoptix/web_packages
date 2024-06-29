import { addons, types } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

import { ThemeConfiguration, ComponentVariables } from './panels';

addons.setConfig({
    theme: create({
        base: 'dark',
        brandTitle: 'Components Library',
        brandImage: '/static/images/dark_logo.png',
        brandUrl: '/',
    }),
    toolbar: {
        'storybook/background': { hidden: true },
    },
});

addons.register('theme-configuration', () => {
    addons.add('theme-configuration/panel', {
        title: 'Theme Configuration',
        // 👇 Sets the type of UI element in Storybook
        type: types.PANEL,
        render: ThemeConfiguration,
    });
    addons.add('theme-configuration/component-variables', {
        title: 'Component Variables',
        // 👇 Sets the type of UI element in Storybook
        type: types.PANEL,
        render: ComponentVariables,
    });
});
