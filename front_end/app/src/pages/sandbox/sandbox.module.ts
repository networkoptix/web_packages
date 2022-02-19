import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { DialogsModule } from '@dialogs/dialogs.module';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import {
    VmsClientModule
} from '@pages/systems/view/vms-client/vms-client.module';
import { MenuModule } from '@src/menu/menu.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxGridLayoutComponent } from '../layout/layout.component';
import { NxGridLayoutModule } from '../layout/layout.module';

import {
    DynamicFormApplyExampleComponent
} from './dynamic-form-apply-example/dynamic-form-apply-example.component';
import {
    FormApplyExampleComponent
} from './form-apply-example/form-apply-example.component';
import { FormElementsComponent } from './form-elements/form-elements.component';
import { MasonryGridComponent } from './masonry-grid/masonry-grid.component';
import { MultiSelectComponent } from './multi-select/multi-select.component';
import { NgrxDemoModule } from './ngrx-demo/ngrx-demo.module';
import { NxSandboxComponent } from './sandbox.component';
import { SearchComponent } from './search/search.component';
import {
    SectionApplyExampleComponent
} from './section-apply-example/section-apply-example.component';
import { TagsComponent } from './tags/tags.component';
import { ToasterComponent } from './toaster/toaster.component';
import { ValidationComponent } from './validation/validation.component';
import { WebsocketComponent } from './websocket/websocket.component';

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
                path: 'apply-service-form',
                component: FormApplyExampleComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'apply-service-section',
                component: SectionApplyExampleComponent,
                canDeactivate: [ApplyGuard]
            }, {
                path: 'multi-select',
                component: MultiSelectComponent,
            }, {
                path: 'demo-layout',
                component: NxGridLayoutComponent,
            }, {
                path: 'toaster',
                component: ToasterComponent,
            }, {
                path: 'search',
                component: SearchComponent,
            }, {
                path: 'masonry-grid',
                component: MasonryGridComponent,
            }, {
                path: 'form-elements',
                component: FormElementsComponent,
            }, {
                path: 'validation',
                component: ValidationComponent,
            }, {
                path: 'tags',
                component: TagsComponent,
            },
            {
                path: 'ngrx-demo',
                loadChildren: () => import('./ngrx-demo/ngrx-demo.module').then(m => m.NgrxDemoModule)
            },
            {
                path: 'websocket',
                component: WebsocketComponent
            }
        ]
    }
];

@NgModule({
    imports: [
        TranslateModule,
        DialogsModule,
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
        ValidationComponent,
        WebsocketComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSandboxComponent
    ]
})
export class SandboxModule {
}
