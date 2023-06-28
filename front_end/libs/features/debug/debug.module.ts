import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';

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
        DirectivesModule,
        PipesModule,
    ],
    providers: [],
    declarations: [NxDebugComponent],
    bootstrap: [],
    exports: [NxDebugComponent],
})
export class NxDebugModule {}
