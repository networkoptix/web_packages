import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CanDeactivateFn, RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { WebRTCStreamManager } from 'nx-open-web/packages/webrtc-stream-manager';

import { NxLayoutViewComponent } from '@components/layout-view/layout-view.component';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@pipes/pipes.module';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';

const CleanupConnections: CanDeactivateFn<unknown> = async (
    _component,
    _currentRoute,
    _currentState,
    nextState,
) => {
    if (!nextState.url.includes('/layouts/')) {
        return WebRTCStreamManager.closeAll();
    }
    return true;
};

const appRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'default',
    },
    {
        path: ':layoutId',
        title: SystemTitleResolver,
        component: NxLayoutViewComponent,
        canActivate: [AuthGuard],
        canDeactivate: [CleanupConnections],
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        DragDropModule,
        PipesModule,
    ],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: [],
})
export class NxLayoutViewModule {}
