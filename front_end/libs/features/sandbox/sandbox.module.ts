import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxMultiSelectDropdown } from '@components/dropdowns/multi-select/multi-select.component';
import { NxSearchableDropdown } from '@components/dropdowns/searchable/searchable.component';
import { NxMatLikeGenericDropdownModule } from '@components/mat-like-components/mat-like-generic-select/dropdown.module';
import { PrimaryButtonModule } from '@components/primary-button/primary-button.module';
import { NxSearchComponent } from '@components/search/search.component';
import { NxSliderComponent } from '@components/slider/slider.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxThemeGeneratorComponent } from '@components/theme-generator/theme-colors.component';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { NxHSLThemeColorsComponent } from '@pages/sandbox/hsl-theme-colors/theme-colors.component';
import { SimpleWebglComponent } from '@pages/sandbox/simple-webgl/webgl.component';
import { SandboxTableComponent } from '@pages/sandbox/table/sandbox-table.component';
import { _NxTestBoxComponent } from '@pages/sandbox/test-box.component';
import { WebglComponent } from '@pages/sandbox/webgl/webgl.component';
import { VmsClientModule } from '@pages/systems/view/vms-client/vms-client.module';
import { WebGLTimelineModule } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-timeline.module';
import { SimpleWebGLTimelineModule } from '@vms-client/submodules/timeline/components/simple-chart/webgl-timeline.module';
import { VmsClientTimelineModule } from '@vms-client/submodules/timeline/timeline.module';

import { NxAccountSettingsModule } from '../account/settings/settings.module';
import { NxGridLayoutComponent } from '../layout/layout.component';
import { NxGridLayoutModule } from '../layout/layout.module';

import { NxArchSvgComponent } from './arch-svg/arch-svg.component';
import { NxBasicColorsComponent } from './basic-colors/colors.component';
import { NxCustomColorsComponent } from './custom-colors/colors.component';
import { DynamicFormApplyExampleComponent } from './dynamic-form-apply-example/dynamic-form-apply-example.component';
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
                path: 'webgl',
                component: WebglComponent,
            },
            {
                path: 'simple-webgl',
                component: SimpleWebglComponent,
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
        ],
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        NgrxDemoModule,
        NxAlertBlockComponent,
        NxCheckboxComponent,
        NxContentBlockComponent,
        DirectivesModule,
        MenuModule,
        NxAccountSettingsModule,
        NxBaseTableComponent,
        NxGridLayoutModule,
        NxSliderComponent,
        PipesModule,
        NxSearchComponent,
        NxSearchableDropdown,
        SimpleWebGLTimelineModule,
        VmsClientModule,
        VmsClientTimelineModule,
        WebGLTimelineModule,
        NxThemeGeneratorComponent,
        NxGenericDropdownModule,
        NxMatLikeGenericDropdownModule,
        NxMultiSelectDropdown,
        PrimaryButtonModule,
    ],
    providers: [],

    declarations: [
        NxSandboxComponent,
        SectionApplyExampleComponent,
        FormApplyExampleComponent,
        DynamicFormApplyExampleComponent,
        ToasterComponent,
        MultiSelectComponent,
        SearchComponent,
        MasonryGridComponent,
        FormElementsComponent,
        TagsComponent,
        SandboxTableComponent,
        ValidationComponent,
        NxArchSvgComponent,
        NxBasicColorsComponent,
        NxCustomColorsComponent,
        NxThemeColorsComponent,
        NxHSLThemeColorsComponent,
        WebglComponent,
        SimpleWebglComponent,
    ],
    bootstrap: [],
    exports: [NxSandboxComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SandboxModule {}
