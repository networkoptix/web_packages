import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxPagePlaceholderFailed2faAccessComponent } from '@components/placeholders/failed-2fa-access/failed-2fa-access-page-placeholder.component';

import { TwofaRequiredComponent } from './twofa-required.component';

const routes: Routes = [
    {
        path: '',
        title: 'twofaRequired',
        component: TwofaRequiredComponent,
    },
];

@NgModule({
    declarations: [TwofaRequiredComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        NxPagePlaceholderFailed2faAccessComponent,
    ],
})
export class TwofaRequiredModule {}
