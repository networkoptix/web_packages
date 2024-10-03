import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    Inject,
    input,
    SkipSelf,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';

import { NxControlMessagesComponent as NxMessagesContainer } from '../control-messages.component';
import { NxControlMessagesToken } from '../control-messages.token';

type TransformData = (data: unknown) => unknown;
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
    hostDirectives: [NxThemeAttributeDirective],
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
     * - `TransformData`: Translate using transformed control state data
     * - `object`: Translate using input value
     */
    translateWith = input<undefined | null | 'data' | TransformData | object>(undefined);
    type = input<'error' | 'warn' | 'info'>('error');

    translateWithData = computed<boolean>(
        () => typeof this.translateWith() === 'function' || this.translateWith() === 'data',
    );
    selected = computed<boolean>(() => this.messagesContainer.state()?.key === this.key());

    data = computed<unknown>(() => {
        const data = this.messagesContainer.state?.()?.data;
        if (!data) {
            return undefined;
        }
        const translateWith = this.translateWith();
        return typeof translateWith === 'function' ? translateWith(data) : data;
    });

    constructor(
        public host: ElementRef<HTMLElement>,
        @SkipSelf() @Inject(NxControlMessagesToken) private messagesContainer: NxMessagesContainer,
    ) {}
}
