import { DomPortal, PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ContentChildren,
    ElementRef,
    HostBinding,
    Inject,
    QueryList,
    SkipSelf,
    ViewChildren,
    booleanAttribute,
    computed,
    effect,
    forwardRef,
    input,
    signal,
    untracked,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { environment } from '@environments/environment';
import LANG from '@language_static';

import { ControlState } from '../form-field/error-state-matcher';
import { NxFormFieldComponent } from '../form-field/form-field.component';
import { NxFormFieldToken } from '../form-field/form-field.token';

import { NxControlMessageComponent as NxMessage } from './control-message/control-message.component';
import { NxControlMessagesToken } from './control-messages.token';

type BuiltinMessageKey = keyof typeof LANG.builtinValidatorMsg;

/** Container component to manage nx-control-message selection.
 *
 * Some base cases are built-in and can be accessed with their respective inputs.
 */
@Component({
    selector: 'nx-control-messages',
    templateUrl: 'control-messages.component.html',
    styleUrls: ['control-messages.component.scss'],
    standalone: true,
    imports: [CommonModule, PortalModule, TranslateModule, NxMessage],
    providers: [
        {
            provide: NxControlMessagesToken,
            useExisting: forwardRef(() => NxControlMessagesComponent),
        },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxControlMessagesComponent implements AfterViewInit {
    LANG = LANG;

    /** Input value type for required error message.
     *
     * Example: `email` => `'Email is required'`
     */
    required = input<BuiltinMessageKey>();
    /** Input value type for pattern error message.
     *
     * Example: `email` => `'Email is invalid'`
     */
    pattern = input<BuiltinMessageKey>();

    /** For displaying the number of characters going over the maxlength (which is called requiredLength in this case)
     */
    overMaxLength = (data: {
        actualLength: number;
        requiredLength: number;
    }): { charsOverLimit: number } => {
        return { charsOverLimit: data.actualLength - data.requiredLength };
    };

    /** How many lines of space to preallocate.
     *
     * Should be the number of lines taken up by the tallest message. The
     * height of messages that don't require error data can be checked by
     * setting `visibility: visible` on the sizing container in browser
     * devtools.
     */
    spacingLines = input<number>(1);
    @HostBinding('style.--spacing-lines') protected get _spacingLines(): number {
        return this.spacingLines();
    }

    /** For displaying text associated with select options */
    useValueState = input<boolean, unknown>(false, { transform: booleanAttribute });
    /** Manual control of message selection.
     *
     * Like with errors, the key should match the `nx-control-message` key.
     */
    manualState = input<ControlState | null, string | ControlState | null>(null, {
        alias: 'state',
        transform: s => (typeof s === 'string' ? { key: s } : s),
    });
    state = computed<ControlState | null>(
        () =>
            this.manualState() ??
            this.nxFormField.errorState() ??
            (this.useValueState() ? this.nxFormField.valueState() : null),
    );

    @ViewChildren(NxMessage) protected set _presetMessages(messages: QueryList<NxMessage>) {
        this.presetMessages.set(messages.toArray());
    }
    private presetMessages = signal<NxMessage[]>([]);
    @ContentChildren(NxMessage) protected set _projectedMessages(messages: QueryList<NxMessage>) {
        this.projectedMessages.set(messages.toArray());
    }
    private projectedMessages = signal<NxMessage[]>([]);

    private messages = computed<Map<string, NxMessage>>(() => {
        const [projectedMessages, presetMessages] = [
            this.projectedMessages(),
            this.presetMessages(),
        ];
        const messages = new Map<string, NxMessage>();
        for (let i = 0; i < projectedMessages.length; i++) {
            const message = projectedMessages[i];
            messages.set(message.key(), message);
        }
        for (let i = 0; i < presetMessages.length; i++) {
            const message = presetMessages[i];
            if (!environment.production && messages.has(message.key())) {
                /* Potential pitfall: attempting to overwrite preset message */
                console.warn(`Custom message for error \`${message.key()}\` ignored`);
            }
            messages.set(message.key(), message);
        }
        return messages;
    });

    protected _selectedMessageEffect = effect(
        () => {
            const [messages, state] = [this.messages(), this.state()];
            const selectedMessage = untracked(this.selectedMessage);

            if (state) {
                const selected = messages.get(state.key);
                if (selected) {
                    selectedMessage?.detach();
                    this.selectedMessage.set(new DomPortal(selected.host));
                    return;
                } else if (!environment.production) {
                    /* Potential pitfall: forgetting to add the message for an error */
                    console.warn('No message found for key', state.key);
                }
            }

            selectedMessage?.detach();
            this.selectedMessage.set(undefined);
        },
        { allowSignalWrites: true },
    );

    selectedMessage = signal<DomPortal<HTMLElement> | undefined>(undefined);

    constructor(
        @SkipSelf() @Inject(NxFormFieldToken) private nxFormField: NxFormFieldComponent,
        private host: ElementRef<HTMLElement>,
    ) {}

    width = signal<number | undefined>(undefined);
    ngAfterViewInit(): void {
        this.width.set(this.host.nativeElement.offsetWidth);
    }
}
