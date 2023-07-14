import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DBConfig, NgxIndexedDBModule } from 'ngx-indexed-db';
import { MarkdownModule } from 'ngx-markdown';

import { NxDevelopersMenuComponent } from '@components/developers-menu/developers-menu.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxMultiSelectDropdown } from '@components/dropdowns/multi-select/multi-select.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PipesModule } from '@pipes/pipes.module';

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
        title: 'apiTool',
        component: NxAPIToolComponent,
    },
    {
        path: '',
        title: 'apiTool',
        redirectTo: 'main',
        pathMatch: 'full',
    },
];

const dbConfig: DBConfig = {
    name: 'systemJSONs',
    version: 1,
    objectStoresMeta: [
        {
            store: 'jsons',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [
                { name: 'json', keypath: 'json', options: { unique: false } },
                { name: 'markdown', keypath: 'markdown', options: { unique: false } },
                { name: 'version', keypath: 'version', options: { unique: false } },
            ],
        },
    ],
};

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        MarkdownModule.forRoot(),
        AngularSvgIconModule,
        NgxIndexedDBModule.forRoot(dbConfig),
        NxDevelopersMenuComponent,
        NxMultiSelectDropdown,
        NxGenericDropdownModule,
        NxPagePlaceholderComponent,
        PipesModule,
        NxPreLoaderComponent,
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
        NxSwaggerAPIInformationComponent,
    ],
    bootstrap: [],
    exports: [NxAPIToolComponent],
})
export class NxApiToolModule {}
