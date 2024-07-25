import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Inject,
    SkipSelf,
    computed,
    input,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxControlMessagesComponent as NxMessagesContainer } from '../control-messages.component';
import { NxControlMessagesToken } from '../control-messages.token';

/** A message associated with a form field control. */
@Component({
    selector: 'nx-control-message',
    templateUrl: 'control-message.component.html',
    styleUrls: ['control-message.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule],
    host: {
        class: 'nx-control-message',
        '[class.nx-control-message--info]': 'type() === "info"',
        '[class.nx-control-message--warn]': 'type() === "warn"',
        '[class.nx-control-message--error]': 'type() === "error"',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxControlMessageComponent {
    /** Identifier for the message.  */
    key = input.required<string>();
    text = input.required<string>();
    /** How to translate the text.
     *
     * - `undefined`: Don't translate
     * - `null`: Translate without parameters
     * - `'data'`: Translate using control state data
     * - `object`: Translate using input value
     */
    translateWith = input<undefined | null | 'data' | object>(undefined);
    type = input<'error' | 'warn' | 'info'>('error');

    selected = computed<boolean>(() => this.messagesContainer.state()?.key === this.key());
    data = computed<unknown>(() => this.messagesContainer.state?.()?.data);

    constructor(
        public host: ElementRef<HTMLElement>,
        @SkipSelf() @Inject(NxControlMessagesToken) private messagesContainer: NxMessagesContainer,
    ) {}
}
