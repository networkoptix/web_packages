import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DevelopersGuard } from '@guards/developersGuard';

import { NxDevToolsComponent } from '../dev-tools/dev-tools.component';

import { NxAboutComponent } from './about.component';

const appRoutes: Routes = [
    {
        path: ':name',
        component: NxAboutComponent,
        canActivate: [DevelopersGuard],
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes), NxAboutComponent, NxDevToolsComponent],
    exports: [NxDevToolsComponent, NxAboutComponent],
})
export class NxAboutModule {}
