import {
    Component,
    EventEmitter,
    Input,
    Output
} from '@angular/core';

import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';

import type { AuthorizeStateType } from '../authorize.component.types';

@Component({
    selector: 'nx-authorize-not-secure-component',
    templateUrl: 'not-secure.component.html',
    styleUrls: ['not-secure.component.scss']
})

export class NxAuthorizeNotSecureComponent {
    icons = icons;
    readonly environment = environment;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() redirectUrl: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    next(): void {
        this.setCurrentState.emit(this.loginEmail ? 'password' : 'email');
    }
}
