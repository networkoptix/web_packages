import { argsToTemplate, type Meta, type StoryObj } from '@storybook/angular';

// import { expect } from '@storybook/jest';
// import { within } from '@storybook/testing-library';
import { enumValues } from 'nx-icons';

import { NxCurrentColorExampleComponent } from './nx-current-color-example.component';
import { NxIconComponent } from './nx-icon.component';

const defaultIcon = enumValues[0];

const meta: Meta<NxIconComponent> = {
    component: NxIconComponent,
    title: 'Design System / Atoms / NxIconComponent',
    render: ({ ...args }) => ({
        props: args,
        template: `<nx-icon ${argsToTemplate(args)}></nx-icon>`,
    }),
    argTypes: {
        icon: {
            description: 'Icon To Display',
            control: 'select',
            options: enumValues,
        },
        preserveInline: {
            description: "Preserve inline styles from svg (won't remove fill/stroke)",
            control: 'select',
            options: [true, false],
            defaultValue: {
                summary: false,
            },
        },
        preserveSize: {
            description:
                "Preserve size (sizing styles applied to the nx-icon component won't be applied to svg)",
            control: 'select',
            options: [true, false],
            defaultValue: {
                summary: false,
            },
        },
        useCurrentColor: {
            description: 'Use currentColor for primary stroke/fill',
            control: 'select',
            options: [true, false],
            defaultValue: {
                summary: false,
            },
        },
    },
};

export default meta;
type Story = StoryObj<NxIconComponent>;

export const Primary: Story = {
    args: {
        icon: defaultIcon,
        preserveInline: false,
        preserveSize: false,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const UseCurrentColor: Story = {
    render: ({ ...args }) => ({
        moduleMetadata: {
            imports: [NxCurrentColorExampleComponent],
        },
        props: args,
        template: `
            <nx-current-color-example>
                <nx-icon ${argsToTemplate(args)} />
                <span>Some Text</span>
            </nx-current-color-example>`,
    }),
    args: {
        icon: 'CameraOffline',
        preserveInline: false,
        preserveSize: false,
        useCurrentColor: true,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const CompareAgainstInitial: Story = {
    render: ({ ...args }) => ({
        props: args,
        template: `
        <nx-icon ${argsToTemplate(args)} [preserveInline]=[true]></nx-icon><h1>Initial <-vs-> Mapped</h1><nx-icon ${argsToTemplate(args)}></nx-icon>
        `,
    }),
    argTypes: {
        preserveInline: {
            description: "Preserve inline styles from svg (won't remove fill/stroke)",
            control: false,
        },
    },
    args: {
        icon: defaultIcon,
        preserveSize: false,
    },
    parameters: {
        preserveInline: {
            table: {
                control: false,
                disable: true,
            },
        },
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};
