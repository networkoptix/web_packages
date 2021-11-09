import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';
import { ComponentsModule }     from '@components/components.module';
import { NxAPIToolComponent }   from './api-tool.component';
import { NxSwaggerComponent }   from './swagger/swagger.component';
import { FormsModule }          from '@angular/forms';
import { PipesModule } from '@src/pipes/pipes.module';
import { AuthGuard } from '@guards/authGuard';
import { NxSystemDropdownComponent } from './system-dropdown/system-dropdown.component';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NxCopyToClipboardComponent } from './swagger/copy-to-clipboard/copy-to-clipboard.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxAPIToolComponent,
        canActivate: [AuthGuard]
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
        NxCopyToClipboardComponent
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
