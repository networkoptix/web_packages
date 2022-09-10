import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { ClientButtonModule } from '@components/open-client/open-client.module';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@app/pipes/pipes.module';

import { NxDebugComponent } from './debug.component';

const appRoutes: Routes = [
    {
        path: 'debug', component: NxDebugComponent, canActivate: [AuthGuard]
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes),
        ClientButtonModule
    ],
    providers: [],
    declarations: [
        NxDebugComponent
    ],
    bootstrap: [],
    exports: [
        NxDebugComponent
    ]
})
export class NxDebugModule {
}
