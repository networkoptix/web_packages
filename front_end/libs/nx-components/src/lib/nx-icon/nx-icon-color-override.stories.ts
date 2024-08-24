import { argsToTemplate, type Meta, type StoryObj } from '@storybook/angular';

// import { expect } from '@storybook/jest';
// import { within } from '@storybook/testing-library';
import { enumValues } from 'nx-icons';

import { CssColorVariables, generateCssVariableName } from '../theme-provider';

import { NxApplyActionParentDirective } from './nx-apply-action-classes-parent.directive';
import { NxApplyActionTargetDirective } from './nx-apply-action-classes-target.directive';
import { NxIconColorOverrideComponent } from './nx-icon-color-override.component';

const defaultIcon = 'ApiError';

const colors: (CssColorVariables | undefined)[] = [
    undefined,
    generateCssVariableName('brand', 'initial'),
    generateCssVariableName('attentionErrorRed', 'initial'),
    generateCssVariableName('attentionWarningYellow', 'initial'),
    generateCssVariableName('attentionSuccessGreen', 'initial'),
    generateCssVariableName('attentionInfoBlue', 'initial'),
];

const meta: Meta<NxIconColorOverrideComponent> = {
    component: NxIconColorOverrideComponent,
    title: 'Design System / Atoms / NxIconColorOverrideComponent',
    render: ({ ...args }) => ({
        props: args,
        moduleMetadata: {
            imports: [NxApplyActionParentDirective, NxApplyActionTargetDirective],
        },
        template: (() => {
            const icon = `<nx-icon-color-override ${argsToTemplate(args)} />`;
            return `<div nxActionClassesParent>
                        ${icon}
                        ${icon}
                        ${icon}
                    </div>
                    <nx-action-classes-parent>
                        ${icon}
                        ${icon}
                        <div nxActionClassesParent>
                            ${icon}
                        <div nxActionClassesParent>
                    <nx-action-classes-parent>`;
        })(),
    }),
    argTypes: {
        icon: {
            description: 'Icon To Display',
            control: 'select',
            options: enumValues,
        },
        currentColorTesting: {
            description: 'Test color for use with useCurrentColor',
            control: 'select',
            options: colors,
        },
        useCurrentColor: {
            description: 'Use Current Color',
            control: 'select',
            options: ['stroke', 'fill', 'both', true, false, undefined],
        },
        primaryStroke: {
            description: 'Primary Stroke Color',
            control: 'select',
            options: colors,
        },
        primaryFill: {
            description: 'Primary Fill Color',
            control: 'select',
            options: colors,
        },
        secondaryStroke: {
            description: 'Secondary Stroke Color',
            control: 'select',
            options: colors,
        },
        secondaryFill: {
            description: 'Secondary Fill Color',
            control: 'select',
            options: colors,
        },
        tertiaryStroke: {
            description: 'Tertiary Stroke Color',
            control: 'select',
            options: colors,
        },
        tertiaryFill: {
            description: 'Tertiary Fill Color',
            control: 'select',
            options: colors,
        },
    },
};

export default meta;
type Story = StoryObj<NxIconColorOverrideComponent>;

export const CurrentColorExample: Story = {
    args: {
        icon: defaultIcon,
        currentColorTesting: colors[4],
        useCurrentColor: true,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};

export const InputExample: Story = {
    args: {
        icon: defaultIcon,
        primaryFill: colors[1],
        secondaryFill: colors[3],
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/g5g3gEjjNcg5YkxXiKNx9u/%F0%9F%9F%AA-Cloud-2.0-Design-System?node-id=5575-9725&t=9TS8o0KDvT5Yk7cf-0',
        },
    },
};
