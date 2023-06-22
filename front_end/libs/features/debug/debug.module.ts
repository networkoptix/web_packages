import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
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
        ClientButtonModule,
        DirectivesModule,
        PipesModule,
    ],
    providers: [],
    declarations: [NxDebugComponent],
    bootstrap: [],
    exports: [NxDebugComponent],
})
export class NxDebugModule {}
