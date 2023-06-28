import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';

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
    imports: [CommonModule, RouterModule.forChild(routes), NxPagePlaceholderComponent],
})
export class TwofaRequiredModule {}
