import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NumericModule } from './numeric-input/numeric.module';

const sharedDependencies = [CommonModule];

@NgModule({
    imports: [...sharedDependencies, NumericModule],
})
export class ComponentsBuildableModule {}
