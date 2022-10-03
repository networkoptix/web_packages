import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ComponentsModule } from '@components/components.module';

import { TwofaRequiredComponent } from './twofa-required.component';

const routes: Routes = [
    { path: '', component: TwofaRequiredComponent }
];

@NgModule({
    declarations: [TwofaRequiredComponent],
    imports: [
        CommonModule,
        ComponentsModule,
        RouterModule.forChild(routes),
    ]
})
export class TwofaRequiredModule { }
