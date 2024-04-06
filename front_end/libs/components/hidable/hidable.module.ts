import { NgModule } from '@angular/core';

import { NxHidableItemDirective } from './hidable-item.directive';
import { NxHidableTemplateDirective } from './hidable-template.directive';
import { NxHidableComponent } from './hidable.component';

const imports = [NxHidableComponent, NxHidableTemplateDirective, NxHidableItemDirective];

/**
 * Components and directives for conditionally replacing content with a placeholder
 * based on container width.
 *
 * Most common use case would be for breadcrumbs.
 *
 * Example:
 *
 * / base / deeply / nested / path / to / page
 *
 * Would could be replaced with this if the container is too small:
 *
 * / base / ... / page
 *
 * See NxHidableComponent for detailed usage.
 */
@NgModule({
    imports,
    exports: imports,
})
export class NxHidableModule {}
