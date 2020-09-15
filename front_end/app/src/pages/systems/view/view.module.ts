import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import VmsClientModule from './vms-client/vms-client.module'
import { routes } from './vms-client/vms-client-routing.module';


@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        RouterModule,

        VmsClientModule,
        RouterModule.forChild(routes)
    ],
    providers: [
    ],
    declarations: [
    ],
    entryComponents : [
    ],
    exports: [
    ]
})
export class NxSystemViewModule {
}
