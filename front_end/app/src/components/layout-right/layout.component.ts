import { Component, Input, ViewEncapsulation } from '@angular/core';

import { NgChanges } from '@utils/ng-changes';

/* Usage
 <nx-right-layout>
    <nx-block first-element>
         <header>
            Some data (TOP)
         </header>

         <nx-section>
            ...
         </nx-section>
    </nx-block>

    <nx-block side-element>
         <header>
            Menu (SIDE)
         </header>

         <nx-section>
         ...
         </nx-section>
    </nx-block>

     <nx-block>
         <header>
            ...
         </header>

         <nx-section>
         ...
         </nx-section>
     </nx-block>
</nx-right-layout>
*/

@Component({
    selector: 'nx-layout-right',
    templateUrl: 'layout.component.html',
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['layout.component.scss']
})
export class NxLayoutRightComponent {
    @Input('loading') loading;
    @Input('toggle') toggle;
    private _toggle: string;

    constructor() {
    }

    ngOnChanges(changes: NgChanges<NxLayoutRightComponent>) {
        if (changes.toggle) {
            this._toggle = changes.toggle.currentValue;
        }
    }
}
