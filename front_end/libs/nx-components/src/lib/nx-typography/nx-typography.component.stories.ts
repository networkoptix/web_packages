import { argsToTemplate, type Meta, type StoryObj } from '@storybook/angular';

import { NxTypographyComponent } from './nx-typography.component';

const meta: Meta<NxTypographyComponent> = {
    component: NxTypographyComponent,
    title: 'Internal / Typography',
    render: ({ ...args }) => ({
        props: args,
        template: `<nx-typography${argsToTemplate(args)}></nx-typography>`,
    }),
};

export default meta;
type Story = StoryObj<NxTypographyComponent>;

export const Primary: Story = {
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/LVRFHu7IR1Tqd4u1WgRV4v/%F0%9F%8C%90-NX-Cloud?node-id=511-2&t=wn378Uk9LTA0s4ru-0',
        },
    },
};
