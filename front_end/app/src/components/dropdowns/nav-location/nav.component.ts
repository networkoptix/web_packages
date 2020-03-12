import { Component, Input } from '@angular/core';
import { BaseDropdown }     from '../injDropdown';

@Component({
    selector   : 'nx-nav-location',
    templateUrl: 'nav.component.html',
    styleUrls  : ['nav.component.scss']
})

export class NxNavLocationDropdown extends BaseDropdown {
    @Input() location: any;
}
