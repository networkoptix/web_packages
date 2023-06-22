import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PipesModule } from '@app/pipes/pipes.module';
import { DirectivesModule } from '@directives/directives.module';

import { NonSupportedBrowserComponent } from './non-supported-browser.component';

const appRoutes: Routes = [{ path: '', component: NonSupportedBrowserComponent }];

@NgModule({
    imports: [CommonModule, DirectivesModule, PipesModule, RouterModule.forChild(appRoutes)],
    providers: [],
    declarations: [NonSupportedBrowserComponent],
    bootstrap: [],
    exports: [NonSupportedBrowserComponent],
})
export class NonSupportedBrowserModule {}
