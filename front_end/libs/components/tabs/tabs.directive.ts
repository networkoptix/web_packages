import { Directive, Input, TemplateRef } from '@angular/core';

import { Tab } from './tabs.types';

@Directive({
    selector: '[tab]',
    standalone: true,
})
export class NxTabsDirective {
    @Input('tab')
    data: Tab;

    constructor(public template: TemplateRef<unknown>) {}
}
