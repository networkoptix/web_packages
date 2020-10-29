import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';
import { ComponentsModule }     from '@components/components.module';
import { NxApiToolComponent }   from './api-tool.component';
import { MenuModule }           from '@src/menu';

const appRoutes: Routes = [
    { path: 'api-tool/:systemId/:serverId', component: NxApiToolComponent }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,

        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers: [],
    declarations: [
        NxApiToolComponent,
    ],
    bootstrap: [],
    entryComponents: [
        NxApiToolComponent
    ],
    exports: [
        NxApiToolComponent
    ]
})
export class NxApiToolModule {
}
