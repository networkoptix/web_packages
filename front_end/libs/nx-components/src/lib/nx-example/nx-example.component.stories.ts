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
        testModel: {
            description: 'Test Model Description',
        },
        useHct: {
            description: 'Use HCT Colors',
            control: 'select',
            options: [true, false],
            defaultValue: {
                summary: false,
            },
        },
        coreSaturation: {
            description: 'Core color Saturation',
            control: 'select',
            options: [0, 5, 10, 15, 20, 25, 30],
            defaultValue: {
                summary: 20,
            },
        },
    },
};

export default meta;
type Story = StoryObj<NxExampleComponent>;

export const UseHslColors: Story = {
    args: {
        testModel: 'Using HSL Luminosity Only',
        useHct: false,
        coreSaturation: 20,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const UseHctColors: Story = {
    args: {
        testModel: 'Using HCT Chroma and Tone',
        useHct: true,
        coreSaturation: 5,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const NewStoryTest: Story = {
    args: {
        testModel: 'New Story Test',
        useHct: true,
        coreSaturation: 5,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};
