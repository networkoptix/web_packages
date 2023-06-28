import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxThemeGeneratorComponent } from '@components/theme-generator/theme-colors.component';

import { NxThemeGeneratorDemoComponent } from './theme-generator-demo.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'themeGenerator',
        component: NxThemeGeneratorDemoComponent,
    },
];

@NgModule({
    imports: [CommonModule, RouterModule.forChild(appRoutes), NxThemeGeneratorComponent],
    providers: [],
    declarations: [NxThemeGeneratorDemoComponent],
    bootstrap: [],
    exports: [],
})
export class NxThemeGeneratorDemoModule {}
