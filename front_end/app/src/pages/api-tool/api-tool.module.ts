import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';
import { ComponentsModule }     from '../../components/components.module';
import { NxApiToolComponent }   from './api-tool.component';
import { MenuApiModule }        from './menu/menu.module';
import { FormsModule }          from '@angular/forms';

const appRoutes: Routes = [
    { path: '', component: NxApiToolComponent }
];

@NgModule({
    imports: [
        CommonModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        RouterModule.forChild(appRoutes),
        MenuApiModule,
        FormsModule
    ],
    providers    : [],
    declarations : [
        NxApiToolComponent
    ],
    bootstrap       : [],
    entryComponents : [
        NxApiToolComponent
    ],
    exports: [
        NxApiToolComponent,
        MenuApiModule
    ]
})
export class NxApiToolModule {
}
