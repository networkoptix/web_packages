import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { UpgradeModule } from '@angular/upgrade/static';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MarkdownModule } from 'ngx-markdown';

import { ComponentsModule } from '@components/components.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxAPIToolComponent } from './api-tool.component';
import { NxCopyToClipboardComponent } from './swagger/copy-to-clipboard/copy-to-clipboard.component';
import { NxSwaggerAPIInformationComponent } from './swagger/swagger-api-information/swagger-api-information.component';
import { NxSwaggerDropdownComponent } from './swagger/swagger-dropdown/swagger-dropdown.component';
import { NxSwaggerSpinnerComponent } from './swagger/swagger-spinner/swagger-spinner.component';
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
        MarkdownModule.forRoot(),
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
        NxSwaggerTextareaComponent,
        NxSwaggerSpinnerComponent,
        NxSwaggerAPIInformationComponent
    ],
    exports: []
})
export class NxApiToolModule {
}
