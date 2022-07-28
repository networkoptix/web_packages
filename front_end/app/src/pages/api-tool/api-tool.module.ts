import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DBConfig, NgxIndexedDBModule } from 'ngx-indexed-db';
import { MarkdownModule } from 'ngx-markdown';

import { ComponentsModule } from '@components/components.module';
import { DevelopersMenuModule } from '@components/developers-menu/developers-menu.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxAPIToolComponent } from './api-tool.component';
import { NxAPIToolDropdownsComponent } from './dropdowns/api-tool-dropdowns.component';
import { NxCopyToClipboardComponent } from './swagger/copy-to-clipboard/copy-to-clipboard.component';
import { NxSwaggerAPIInformationComponent } from './swagger/swagger-api-information/swagger-api-information.component';
import { NxSwaggerDropdownComponent } from './swagger/swagger-dropdown/swagger-dropdown.component';
import { NxSwaggerSpinnerComponent } from './swagger/swagger-spinner/swagger-spinner.component';
import { NxSwaggerTextareaComponent } from './swagger/swagger-textarea/swagger-textarea.component';
import { NxSwaggerComponent } from './swagger/swagger.component';
import { NxVersionMessageComponent } from './version-message/version-message.component';

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

const dbConfig: DBConfig = {
    name: 'systemJSONs',
    version: 1,
    objectStoresMeta: [{
        store: 'jsons',
        storeConfig: { keyPath: 'key', autoIncrement: false },
        storeSchema: [
            { name: 'json', keypath: 'json', options: { unique: false } },
            { name: 'markdown', keypath: 'markdown', options: { unique: false } },
            { name: 'version', keypath: 'version', options: { unique: false } }
        ]
    }]
};

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
        MarkdownModule.forRoot(),
        AngularSvgIconModule.forRoot(),
        NgxIndexedDBModule.forRoot(dbConfig),
        RouterModule.forChild(appRoutes),
        FormsModule,
        PagePlaceHolderModule,
        DevelopersMenuModule
    ],
    providers: [],
    declarations: [
        NxAPIToolComponent,
        NxVersionMessageComponent,
        NxSwaggerComponent,
        NxAPIToolDropdownsComponent,
        NxCopyToClipboardComponent,
        NxSwaggerDropdownComponent,
        NxSwaggerTextareaComponent,
        NxSwaggerSpinnerComponent,
        NxSwaggerAPIInformationComponent
    ],
    bootstrap: [],
    exports: [
        NxAPIToolComponent
    ]
})
export class NxApiToolModule {
}
