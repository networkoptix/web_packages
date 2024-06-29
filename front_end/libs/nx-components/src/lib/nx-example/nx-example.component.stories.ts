import { argsToTemplate, type Meta, type StoryObj } from '@storybook/angular';
// import { expect } from '@storybook/jest';
// import { within } from '@storybook/testing-library';

import { NxExampleComponent } from './nx-example.component';

const meta: Meta<NxExampleComponent> = {
    component: NxExampleComponent,
    title: 'Design System / Atoms / NxExampleComponent',
    render: ({ ...args }) => ({
        props: args,
        template: `<nx-example ${argsToTemplate(args)}></nx-example>`,
    }),
    argTypes: {
        testInput: {
            description: 'Test Input Description',
        },
        testModel: {
            description: 'Test Model Description',
        },
        variant: {
            description: 'Variant',
            control: 'select',
            options: ['funky', 'normal'],
            defaultValue: {
                summary: 'normal',
            },
        },
        forceDark: {
            description: 'Force Dark Mode',
            control: 'select',
            options: [true, false],
            defaultValue: {
                summary: false,
            },
        },
    },
};

export default meta;
type Story = StoryObj<NxExampleComponent>;

export const Primary: Story = {
    args: {
        testInput: 'Primary Story',
        testModel: 'Initial Model',
        variant: 'normal',
        forceDark: false,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const Secondary: Story = {
    args: {
        testInput: 'Secondary Story',
        testModel: 'Initial Model',
        variant: 'funky',
        forceDark: false,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const ForceDarkMode: Story = {
    args: {
        testInput: 'Force Dark Mode Story',
        testModel: 'Force Dark Mode Example',
        variant: 'normal',
        forceDark: true,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};
