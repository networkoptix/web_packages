import {
    Component,
    OnInit,
    Input,
    Inject
} from '@angular/core';

import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-generic-content',
    templateUrl: 'generic.component.html',
    styleUrls: ['generic.component.scss']
})
export class GenericModalContent implements OnInit {
    @Input() closable: boolean = true;

    message: string;
    title: string;
    actionLabel: string;
    buttonType: string;
    cancelLabel: string;
    buttonClass: string;
    footerClass: string;
    hasFooter: boolean;
    cancellable: boolean;

    constructor(
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {}

    ngOnInit() {
        pickFrom(
            this.dialogData,
            [
                'message',
                'title',
                'actionLabel',
                'buttonType',
                'cancelLabel',
                'buttonClass',
                'footerClass',
                'hasFooter',
                'cancellable',
            ],
            this
        );

        this.buttonClass ||= '';
        this.footerClass ||= '';
    }

    close(action?) {
        this.dialogRef.close(action);
    }
}
