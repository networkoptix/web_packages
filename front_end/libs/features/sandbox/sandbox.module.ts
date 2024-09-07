import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { nxApplyV3Guard } from '@components/forms/apply-v3/apply-v3.guard';
import { ApplyGuard } from '@guards/applyGuard';
import { NxHSLThemeColorsComponent } from '@pages/sandbox/hsl-theme-colors/theme-colors.component';
import { NxOauthBuilderComponent } from '@pages/sandbox/oauth-builder/oauth-builder.component';
import { NxOklchColorsComponent } from '@pages/sandbox/oklch/colors.component';
import { WebglComponent } from '@pages/sandbox/webgl/webgl.component';

import { NxGridLayoutComponent } from '../layout/layout.component';

import { NxApplyV3SandboxComponent } from './apply-v3/apply-v3-sandbox.component';
import { NxArchSvgComponent } from './arch-svg/arch-svg.component';
import { NxBasicColorsComponent } from './basic-colors/colors.component';
import { NxButtonsExampleComponent } from './buttons/buttonsExample.component';
import { NxCpOfflineDataComponent } from './channel-partners/offline-data/offline-data.component';
import { NxCssVariablesComponent } from './css-variables/css-variables.component';
import { NxCustomColorsComponent } from './custom-colors/colors.component';
import { NxDatetimeSandboxComponent } from './datetime-sandbox/datetime-sandbox.component';
import { NxDialogsSandboxComponent } from './dialogs/dialogs-sandbox.component';
import { SandboxFiltersComponent } from './filters/sandbox-filters.component';
import { FormApplyExampleComponent } from './form-apply-example/form-apply-example.component';
import { FormElementsComponent } from './form-elements/form-elements.component';
import { NxFormFieldSandboxComponent } from './form-field/form-field-sandbox.component';
import { MasonryGridComponent } from './masonry-grid/masonry-grid.component';
import { MultiSelectComponent } from './multi-select/multi-select.component';
import { NxComponentLibrarySandboxComponent } from './nx-components/nx-components.component';
import { SearchComponent } from './search/search.component';
import { SectionApplyExampleComponent } from './section-apply-example/section-apply-example.component';
import { NxSignalsComponent } from './signals/signals.component';
import { SvgResizeComponent } from './svg-resize/svg.component';
import { TagsComponent } from './tags/tags.component';
import { NxThemeColorsComponent } from './theme-colors/colors.component';
import { NxThemeVariableGeneratorSandboxComponent } from './theme-variable-generator/theme-variable-generator-sandbox.component';
import { ToasterComponent } from './toaster/toaster.component';
import { NxTooltipSandboxComponent } from './tooltip/tooltip-sandbox.component';
import { ValidationComponent } from './validation/validation.component';

export const appRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./sandbox.component').then(c => c.NxSandboxComponent),
        children: [
            /* Note: The path is converted from kebab-case to Title Case for left menu nav */
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'colors/oklch-colors',
            },
            {
                path: 'buttons',
                component: NxButtonsExampleComponent,
            },
            {
                path: 'dialogs',
                component: NxDialogsSandboxComponent,
            },
            {
                path: 'apply-service-form',
                component: FormApplyExampleComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'apply-service-section',
                component: SectionApplyExampleComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'apply-v3',
                component: NxApplyV3SandboxComponent,
                canDeactivate: [nxApplyV3Guard],
            },
            {
                path: 'datetime',
                component: NxDatetimeSandboxComponent,
            },
            {
                path: 'dropdowns',
                component: MultiSelectComponent,
            },
            {
                path: 'grid-layout',
                component: NxGridLayoutComponent,
            },
            {
                path: 'toaster',
                component: ToasterComponent,
            },
            {
                path: 'search',
                component: SearchComponent,
            },
            {
                path: 'masonry-grid',
                component: MasonryGridComponent,
            },
            {
                path: 'form-elements',
                component: FormElementsComponent,
            },
            {
                path: 'form-field',
                component: NxFormFieldSandboxComponent,
            },
            {
                path: 'validation',
                component: ValidationComponent,
            },
            {
                path: 'svg-resize',
                component: SvgResizeComponent,
            },
            {
                path: 'tags',
                component: TagsComponent,
            },
            {
                path: 'tooltip',
                component: NxTooltipSandboxComponent,
            },
            {
                path: 'architecture',
                component: NxArchSvgComponent,
            },
            {
                path: 'signals',
                component: NxSignalsComponent,
            },
            {
                path: 'channel-partners',
                loadChildren: () =>
                    import('./channel-partners/channel-partners.module').then(
                        m => m.NxChannelPartnersModule,
                    ),
            },
            {
                path: 'cp-dialogs-components',
                component: NxCpOfflineDataComponent,
            },
            {
                path: 'filters',
                component: SandboxFiltersComponent,
            },
            {
                path: 'component-library',
                component: NxComponentLibrarySandboxComponent,
            },
            {
                path: 'webgl',
                component: WebglComponent,
            },
            {
                path: 'colors',
                children: [
                    {
                        path: 'basic-colors',
                        component: NxBasicColorsComponent,
                    },
                    {
                        path: 'css-variables',
                        component: NxCssVariablesComponent,
                    },
                    {
                        path: 'custom-colors',
                        component: NxCustomColorsComponent,
                    },
                    {
                        path: 'hsl-theme-colors',
                        component: NxHSLThemeColorsComponent,
                    },
                    {
                        path: 'theme-colors',
                        component: NxThemeColorsComponent,
                    },
                    {
                        path: 'oklch-colors',
                        component: NxOklchColorsComponent,
                    },
                    {
                        path: 'theme-variable-generator',
                        component: NxThemeVariableGeneratorSandboxComponent,
                    },
                ],
            },
            {
                path: 'oauth-builder',
                component: NxOauthBuilderComponent,
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes)],
    providers: [],

    declarations: [],
    bootstrap: [],
    exports: [],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SandboxModule {}
