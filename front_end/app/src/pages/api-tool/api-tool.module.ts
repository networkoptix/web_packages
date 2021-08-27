import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';
import { ComponentsModule }     from '../../components/components.module';
import { NxApiToolComponent }   from './api-tool.component';
import { MenuApiModule }        from './menu/menu.module';
import { FormsModule }          from '@angular/forms';
import { PipesModule } from '@src/pipes/pipes.module';
import { AuthGuard } from '@guards/authGuard';

const appRoutes: Routes = [
    {
        path        : '',
        component   : NxApiToolComponent,
        canActivate : [AuthGuard]
    }
];

@NgModule({
    imports: [
        CommonModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
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
