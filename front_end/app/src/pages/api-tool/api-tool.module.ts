import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { UpgradeModule } from '@angular/upgrade/static';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxAPIToolComponent } from './api-tool.component';
import { NxCopyToClipboardComponent } from './swagger/copy-to-clipboard/copy-to-clipboard.component';
import { NxSwaggerDropdownComponent } from './swagger/swagger-dropdown/swagger-dropdown.component';
import { NxSwaggerTextareaComponent } from './swagger/swagger-textarea/swagger-textarea.component';
import { NxSwaggerComponent } from './swagger/swagger.component';
import { NxSystemDropdownComponent } from './system-dropdown/system-dropdown.component';

const appRoutes: Routes = [
    {
        path: ':route',
        component: NxAPIToolComponent
    },
    {
        path: '',
        redirectTo: 'main',
        pathMatch: 'full'
    }
];

@NgModule({
    imports: [
        CommonModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes),
        FormsModule
    ],
    providers: [],
    declarations: [
        NxAPIToolComponent,
        NxSwaggerComponent,
        NxSystemDropdownComponent,
        NxCopyToClipboardComponent,
        NxSwaggerDropdownComponent,
        NxSwaggerTextareaComponent
    ],
    bootstrap: [],
    entryComponents: [
        NxAPIToolComponent
    ],
    exports: [
        NxAPIToolComponent
    ]
})
export class NxApiToolModule {
}
