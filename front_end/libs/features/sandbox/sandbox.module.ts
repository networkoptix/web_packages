import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
// import { NxWebGLComponent } from '@components/../systems/view/components/webgl/webgl.component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { SearchableModule } from '@components/dropdowns/searchable/searchable.module';
import { SearchModule } from '@components/search/search.module';
import { NxSliderModule } from '@components/slider/slider.module';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { SandboxTableComponent } from '@pages/sandbox/table/sandbox-table.component';
import { WebglComponent } from '@pages/sandbox/webgl/webgl.component';
import {
    VmsClientModule
} from '@pages/systems/view/vms-client/vms-client.module';
import { WebGLTimelineModule } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-timeline.module';
import { VmsClientTimelineModule } from '@vms-client/submodules/timeline/timeline.module';

import { NxAccountSettingsModule } from '../account/settings/settings.module';
import { NxGridLayoutComponent } from '../layout/layout.component';
import { NxGridLayoutModule } from '../layout/layout.module';

import { NxArchSvgComponent } from './arch-svg/arch-svg.component';
import { NxBasicColorsComponent } from './basic-colors/colors.component';
import { NxCustomColorsComponent } from './custom-colors/colors.component';
import {
    DynamicFormApplyExampleComponent
} from './dynamic-form-apply-example/dynamic-form-apply-example.component';
import {
    FormApplyExampleComponent
} from './form-apply-example/form-apply-example.component';
import { FormElementsComponent } from './form-elements/form-elements.component';
import { NxHSLThemeColorsComponent } from './hsl-theme-colors/theme-colors.component';
import { MasonryGridComponent } from './masonry-grid/masonry-grid.component';
import { MultiSelectComponent } from './multi-select/multi-select.component';
import { NgrxDemoModule } from './ngrx-demo/ngrx-demo.module';
import { NxSandboxComponent } from './sandbox.component';
import { SearchComponent } from './search/search.component';
import {
    SectionApplyExampleComponent
} from './section-apply-example/section-apply-example.component';
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
                component: NxHSLThemeColorsComponent
            },
            {
                path: 'apply-service-form',
                component: FormApplyExampleComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'apply-service-section',
                component: SectionApplyExampleComponent,
                canDeactivate: [ApplyGuard]
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
                loadChildren: () => import('./ngrx-demo/ngrx-demo.module').then(m => m.NgrxDemoModule)
            },
            {
                path: 'arch',
                component: NxArchSvgComponent
            }
        ]
    }
];

@NgModule({
    imports: [
        TranslateModule,
        CommonModule,
        FormsModule,
        ComponentsModule,
        DirectivesModule,
        MenuModule,
        PipesModule,
        NxGridLayoutModule,
        VmsClientModule,
        ReactiveFormsModule,
        RouterModule.forChild(appRoutes),
        NgrxDemoModule,
        SearchModule,
        SearchableModule,
        AlertBlockModule,
        ContentBlockModule,
        NxAccountSettingsModule,
        NxSliderModule,
        VmsClientTimelineModule,
        WebGLTimelineModule,
        AngularSvgIconModule
    ],
    providers: [
    ],
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
    ],
    bootstrap: [
    ],
    exports: [
        NxSandboxComponent
    ],
    schemas: [
        CUSTOM_ELEMENTS_SCHEMA
    ]
})
export class SandboxModule {
}
