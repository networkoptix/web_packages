import {
    Component, ElementRef, Input, OnInit,
    ViewChild, ViewEncapsulation
} from '@angular/core';

/* Usage
 <nx-alert-block>
     <nx-section>
        BODY
     </nx-section>

     <!-- ngFor -->
     <nx-section>
         <header>
            Section title
         </header>
        Section body
     </nx-section>

     <nx-section>
        SECTION without header
     </nx-section>
     <!-- ngFor -->
 </nx-block>
 */

@Component({
    selector      : 'nx-alert-block',
    templateUrl   : 'block.component.html',
    styleUrls     : ['block.component.scss'],
    encapsulation : ViewEncapsulation.None
})
export class NxAlertBlockComponent implements OnInit {

    constructor() {
    }

    ngOnInit() {
    }
}
