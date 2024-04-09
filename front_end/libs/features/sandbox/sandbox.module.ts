import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { NxHSLThemeColorsComponent } from '@pages/sandbox/hsl-theme-colors/theme-colors.component';
import { SandboxTableComponent } from '@pages/sandbox/table/sandbox-table.component';
import { _NxTestBoxComponent } from '@pages/sandbox/test-box.component';
import { WebglComponent } from '@pages/sandbox/webgl/webgl.component';

import { NxGridLayoutComponent } from '../layout/layout.component';

import { NxArchSvgComponent } from './arch-svg/arch-svg.component';
import { NxBasicColorsComponent } from './basic-colors/colors.component';
import { NxButtonsExampleComponent } from './buttons/buttonsExample.component';
import { NxCustomColorsComponent } from './custom-colors/colors.component';
import { SandboxFiltersComponent } from './filters/sandbox-filters.component';
import { FormApplyExampleComponent } from './form-apply-example/form-apply-example.component';
import { FormElementsComponent } from './form-elements/form-elements.component';
import { MasonryGridComponent } from './masonry-grid/masonry-grid.component';
import { MultiSelectComponent } from './multi-select/multi-select.component';
import { NgrxDemoModule } from './ngrx-demo/ngrx-demo.module';
import { NxSandboxComponent } from './sandbox.component';
import { SearchComponent } from './search/search.component';
import { SectionApplyExampleComponent } from './section-apply-example/section-apply-example.component';
import { TagsComponent } from './tags/tags.component';
import { NxThemeColorsComponent } from './theme-colors/colors.component';
import { ToasterComponent } from './toaster/toaster.component';
import { ValidationComponent } from './validation/validation.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxSandboxComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                component: FormElementsComponent,
            },
            {
                path: 'basic-colors',
                component: NxBasicColorsComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'buttons',
                component: NxButtonsExampleComponent,
            },
            {
                path: 'webgl',
                component: WebglComponent,
            },
            {
                path: 'custom-colors',
                component: NxCustomColorsComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'theme-colors',
                component: NxThemeColorsComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'hsl-theme',
                component: NxHSLThemeColorsComponent,
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
                path: 'dropdowns',
                component: MultiSelectComponent,
            },
            {
                path: 'demo-layout',
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
                path: 'validation',
                component: ValidationComponent,
            },
            {
                path: 'table',
                component: SandboxTableComponent,
            },
            {
                path: 'tags',
                component: TagsComponent,
            },
            {
                path: 'ngrx-demo',
                loadChildren: () =>
                    import('./ngrx-demo/ngrx-demo.module').then(m => m.NgrxDemoModule),
            },
            {
                path: 'arch',
                component: NxArchSvgComponent,
            },
            {
                path: '_test',
                loadComponent: () =>
                    import('./test-box.component').then(m => m._NxTestBoxComponent),
            },
            {
                path: 'channel-partners',
                loadChildren: () =>
                    import('./channel-partners/channel-partners.module').then(
                        m => m.NxChannelPartnersModule,
                    ),
            },
            {
                path: 'filters',
                component: SandboxFiltersComponent,
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes), NgrxDemoModule],
    providers: [],

    declarations: [],
    bootstrap: [],
    exports: [],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SandboxModule {}
