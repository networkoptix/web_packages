import {
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';

import type { AuthorizeStateType } from '../authorize.component.types';

@Component({
    selector: 'nx-show-404-authorize-component',
    templateUrl: 'show-404.component.html',
    styleUrls: ['show-404.component.scss'],
})

export class NxAuthorizeShow404Component {
    @Input() viewType: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();
}
