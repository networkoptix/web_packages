import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';

import { TwofaRequiredComponent } from './twofa-required.component';

const routes: Routes = [
    {
        path: '',
        title: 'twofaRequired',
        component: TwofaRequiredComponent
    }
];

@NgModule({
    declarations: [TwofaRequiredComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        PagePlaceHolderModule
    ]
})
export class TwofaRequiredModule {}
