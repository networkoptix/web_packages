import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
    stories: ['../**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
    addons: [
        '@storybook/addon-essentials',
        '@storybook/addon-interactions',
        'storybook-dark-mode',
        '@storybook/addon-themes',
        // This doesn't seem to be working currently https://github.com/storybookjs/addon-designs/issues/242
        // Need to bump this package once there's a fix
        '@storybook/addon-designs',
        './manager',
        'storybook-addon-angular-router',
    ],
    framework: {
        name: '@storybook/angular',
        options: {},
    },
    docs: {
        autodocs: true,
        defaultName: 'Docs',
    },
    staticDirs: ['./public'],
};

// eslint-disable-next-line import/no-default-export
export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs
