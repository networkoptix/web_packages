import { argsToTemplate, type Meta, type StoryObj } from '@storybook/angular';
// import { expect } from '@storybook/jest';
// import { within } from '@storybook/testing-library';

import { themeColors } from '../theme-provider/color-types';

import { NxThemePalette } from './nx-theme-palette.component';
import { show } from './utils';

const meta: Meta<NxThemePalette> = {
    component: NxThemePalette,
    title: 'Internal / Theme Palette',
    render: ({ ...args }) => ({
        props: args,
        template: `<nx-theme-palette ${argsToTemplate(args)}></nx-theme-palette>`,
    }),
    argTypes: {
        selectedBaseColor: {
            description: 'Select base color to view palette',
            control: 'select',
            options: ['all', ...themeColors],
            defaultValue: {
                summary: 'all',
            },
        },
        bindShowToStorybook: {
            description: 'Select to bind shown color group to storybook',
            control: 'check',
            defaultValue: {
                summary: false,
            },
        },
        show: {
            description: 'Select to show configurable, generated, or all colors',
            control: 'select',
            options: show,
            defaultValue: {
                summary: 'all',
            },
        },
    },
};

export default meta;
type Story = StoryObj<NxThemePalette>;

export const FullPalette: Story = {
    args: {
        selectedBaseColor: 'all',
        show: 'all',
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const ColorGroup: Story = {
    args: {
        selectedBaseColor: 'all',
        show: 'brand',
        bindShowToStorybook: true,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const SingleColor: Story = {
    args: {
        selectedBaseColor: 'brand',
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};
