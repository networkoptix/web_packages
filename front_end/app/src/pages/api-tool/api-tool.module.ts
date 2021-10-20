import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';
import { ComponentsModule }     from '@components/components.module';
import { NxAPIToolComponent }   from './api-tool.component';
import { NxSwaggerComponent }   from './swagger/swagger.component';
import { MenuApiModule }        from './menu/menu.module';
import { FormsModule }          from '@angular/forms';
import { PipesModule } from '@src/pipes/pipes.module';
import { AuthGuard } from '@guards/authGuard';
import { NxSystemDropdownComponent } from './system-dropdown/system-dropdown.component';

const appRoutes: Routes = [
    {
        path        : '',
        component   : NxAPIToolComponent,
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
        NxAPIToolComponent,
        NxSwaggerComponent,
        NxSystemDropdownComponent
    ],
    bootstrap       : [],
    entryComponents : [
        NxAPIToolComponent
    ],
    exports: [
        NxAPIToolComponent,
        MenuApiModule
    ]
})
export class NxApiToolModule {
}
