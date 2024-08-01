import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ApplyGuard } from '@guards/applyGuard';
import { NxHSLThemeColorsComponent } from '@pages/sandbox/hsl-theme-colors/theme-colors.component';
import { SimpleWebglComponent } from '@pages/sandbox/simple-webgl/webgl.component';
// import { WebglComponent } from '@pages/sandbox/webgl/webgl.component';

import { NxGridLayoutComponent } from '../layout/layout.component';

import { NxArchSvgComponent } from './arch-svg/arch-svg.component';
import { NxBasicColorsComponent } from './basic-colors/colors.component';
import { NxButtonsExampleComponent } from './buttons/buttonsExample.component';
import { NxCssVariablesComponent } from './css-variables/css-variables.component';
import { NxCustomColorsComponent } from './custom-colors/colors.component';
import { NxDatetimeSandboxComponent } from './datetime-sandbox/datetime-sandbox.component';
import { NxDialogsSandboxComponent } from './dialogs/dialogs-sandbox.component';
import { FormApplyExampleComponent } from './form-apply-example/form-apply-example.component';
import { FormElementsComponent } from './form-elements/form-elements.component';
import { NxFormFieldSandboxComponent } from './form-field/form-field-sandbox.component';
import { MasonryGridComponent } from './masonry-grid/masonry-grid.component';
import { MultiSelectComponent } from './multi-select/multi-select.component';
import { SearchComponent } from './search/search.component';
import { SectionApplyExampleComponent } from './section-apply-example/section-apply-example.component';
import { NxSignalsComponent } from './signals/signals.component';
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
                redirectTo: 'form-elements',
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
                        path: 'theme-variable-generator',
                        component: NxThemeVariableGeneratorSandboxComponent,
                    },
                    // {
                    //     path: 'webgl',
                    //     component: WebglComponent,
                    // },
                    {
                        path: 'simple-webgl',
                        component: SimpleWebglComponent,
                    },
                ],
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
