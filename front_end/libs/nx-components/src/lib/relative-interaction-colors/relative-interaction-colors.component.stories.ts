import { argsToTemplate, type Meta, type StoryObj } from '@storybook/angular';

import { RelativeInteractionsComponent } from './relative-interaction-colors.component';

const meta: Meta<RelativeInteractionsComponent> = {
    component: RelativeInteractionsComponent,
    title: 'Internal / Relative Color Mixins',
    tags: ['!autodocs'],
    render: ({ ...args }) => ({
        props: args,
        template: `<nx-relative-color-mixins-demo${argsToTemplate(args)}></nx-relative-color-mixins-demo>`,
    }),
};

export default meta;
type Story = StoryObj<RelativeInteractionsComponent>;

export const RelativeColors: Story = {};
