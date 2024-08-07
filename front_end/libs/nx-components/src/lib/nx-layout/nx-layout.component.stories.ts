import { argsToTemplate, type Meta, type StoryObj } from '@storybook/angular';

import { NxLayoutComponent } from './nx-layout.component';

const meta: Meta<NxLayoutComponent> = {
    component: NxLayoutComponent,
    title: 'Internal / Layout',
    argTypes: {
        overlayAsideOverride: {
            description: 'Force overlay secondary menu',
            control: 'select',
            options: [true, false],
            defaultValue: {
                summary: false,
            },
        },
        layoutType: {
            description: 'Layout type',
            control: 'select',
            options: NxLayoutComponent.layoutTypes,
            defaultValue: {
                summary: 'cards',
            },
        },
        clampedSize: {
            description: 'Clamped size',
            control: 'select',
            options: NxLayoutComponent.clampedSizes,
            defaultValue: {
                summary: 1024,
            },
        },
    },
    parameters: {
        layout: 'fullscreen',
    },
    render: ({ ...args }) => ({
        props: args,
        template: `<nx-layout ${argsToTemplate(args)}></nx-layout>`,
    }),
};

export default meta;
type Story = StoryObj<NxLayoutComponent>;

export const Cards: Story = {
    args: {
        overlayAsideOverride: false,
        layoutType: 'cards',
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5209-2236&t=3GIooQzqZWZUXJLa-0',
        },
    },
};

export const ClampedTo720: Story = {
    args: {
        overlayAsideOverride: false,
        layoutType: 'clamped',
        clampedSize: 720,
    },
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5209-2236&t=3GIooQzqZWZUXJLa-0',
        },
    },
};

export const ClampedTo1024: Story = {
    args: {
        overlayAsideOverride: false,
        layoutType: 'clamped',
        clampedSize: 1024,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5209-2236&t=3GIooQzqZWZUXJLa-0',
        },
    },
};

export const ClampedTo1800: Story = {
    args: {
        overlayAsideOverride: false,
        layoutType: 'clamped',
        clampedSize: 1800,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5209-2236&t=3GIooQzqZWZUXJLa-0',
        },
    },
};

export const Full: Story = {
    args: {
        overlayAsideOverride: false,
        layoutType: 'full',
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5209-2236&t=3GIooQzqZWZUXJLa-0',
        },
    },
};

export const CodeUsageExample: Story = {
    args: {
        overlayAsideOverride: false,
        layoutType: 'full',
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5209-2236&t=3GIooQzqZWZUXJLa-0',
        },
    },
    render: ({ ...args }) => ({
        props: args,
        template: `
        <nx-layout ${argsToTemplate(args)}>
            <ng-container hoverMenu>
                <div>Projected Hover Menu 1</div>
                <div>Projected Hover Menu 2</div>
                <div>Projected Hover Menu 3</div>
                <div>Projected Hover Menu 4</div>
                <div>Projected Hover Menu 5</div>
                <div>Projected Hover Menu 6</div>
                <div>Projected Hover Menu 7</div>
                <div>Projected Hover Menu 8</div>
                <div>Projected Hover Menu 9</div>
                <div>Projected Hover Menu 10</div>
                <div>Projected Hover Menu 11</div>
                <div>Projected Hover Menu 12</div>
            </ng-container>
            <ng-container main>
                <div>Projected Main 1</div>
                <div>Projected Main 2</div>
                <div>Projected Main 3</div>
                <div>Projected Main 4</div>
                <div>Projected Main 5</div>
                <div>Projected Main 6</div>
                <div>Projected Main 7</div>
                <div>Projected Main 8</div>
                <div>Projected Main 9</div>
                <div>Projected Main 10</div>
                <div>Projected Main 11</div>
                <div>Projected Main 12</div>
            </ng-container>
        </nx-layout>`,
    }),
};

export const FallbackSecondaryMenuExample: Story = {
    args: {
        overlayAsideOverride: false,
        layoutType: 'full',
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5209-2236&t=3GIooQzqZWZUXJLa-0',
        },
    },
    render: ({ ...args }) => ({
        props: args,
        template: `
        <nx-layout ${argsToTemplate(args)}>
            <ng-container hoverMenu>
                <div>Projected Hover Menu 1</div>
                <div>Projected Hover Menu 2</div>
                <div>Projected Hover Menu 3</div>
                <div>Projected Hover Menu 4</div>
                <div>Projected Hover Menu 5</div>
                <div>Projected Hover Menu 6</div>
                <div>Projected Hover Menu 7</div>
                <div>Projected Hover Menu 8</div>
                <div>Projected Hover Menu 9</div>
                <div>Projected Hover Menu 10</div>
                <div>Projected Hover Menu 11</div>
                <div>Projected Hover Menu 12</div>
            </ng-container>
            <ng-container main>
                <div>Projected Main 1</div>
                <div>Projected Main 2</div>
                <div>Projected Main 3</div>
                <div>Projected Main 4</div>
                <div>Projected Main 5</div>
                <div>Projected Main 6</div>
                <div>Projected Main 7</div>
                <div>Projected Main 8</div>
                <div>Projected Main 9</div>
                <div>Projected Main 10</div>
                <div>Projected Main 11</div>
                <div>Projected Main 12</div>
            </ng-container>
            <ng-container fallbackSecondaryMenu>
                Fallback Secondary Menu
            </ng-container>
        </nx-layout>`,
    }),
};
