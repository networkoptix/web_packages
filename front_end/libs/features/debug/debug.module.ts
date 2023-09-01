import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@pipes/pipes.module';

import { NxDebugComponent } from './debug.component';

const appRoutes: Routes = [
    {
        path: 'debug',
        title: 'debug',
        component: NxDebugComponent,
        canActivate: [AuthGuard],
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        NxClientButtonComponent,
        PipesModule,
    ],
    providers: [],
    declarations: [NxDebugComponent],
    bootstrap: [],
    exports: [NxDebugComponent],
})
export class NxDebugModule {}
