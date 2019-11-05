import { Component, Input, OnInit } from '@angular/core';

/* Usage
<nx-page-placeholder
     iconClass='server-offline'
     placeholderTitle='SERVER OFFLINE'
     message='Warning! Dragons ahead!'
     preloader=BOOLEAN
     [condition]= WHEN_TO_SHOW >
</nx-page-placeholder>
*/

@Component({
    selector: 'nx-page-placeholder',
    templateUrl: 'page-placeholder.component.html',
    styleUrls: ['page-placeholder.component.scss']
})
export class NxPagePlaceholderComponent implements OnInit {
    @Input() iconClass: string;
    @Input() placeholderTitle: string;
    @Input() message: string;
    @Input() preloader: string;
    @Input() condition: boolean;

    constructor() {
    }

    ngOnInit() {

    }
}
