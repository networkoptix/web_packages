import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
    selector: '[tab]',
})
export class NxTabsDirective {
    @Input('tab')
    name: string;

    constructor(public template: TemplateRef<unknown>) {}
}
