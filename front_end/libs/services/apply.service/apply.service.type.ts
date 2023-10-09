import { NgForm } from '@angular/forms';
import { Subject } from 'rxjs';

import { Process } from '../process.service/process';

export type extNgForm = {
    form: NgForm;
    originalForm: {};
    save: Process;
    discard: () => void;
    hasChange: boolean;
    changedFields: Set<string>;
    reset$: Subject<boolean>;
    isDynamicForm: boolean;
};

export interface FormActions {
    applyFunc: Process;
    discardFunc: () => void;
}

/**
 * Represents an interface for checking navigation permissions and displaying an "Apply" dialog.
 */
export interface NxCanNavigate {
    /**
     * Checks if navigation is allowed.
     *
     * @returns {Promise<boolean>} - A Promise that resolves to `true` if navigation is allowed and `false` otherwise.
     */
    canNavigate(): Promise<boolean>;

    /**
     * Displays an "Apply" dialog and returns a promise that resolves to a boolean value.
     *
     * @return {Promise<boolean>} A promise that resolves to true if the "Apply" button is clicked, and resolves to false if the dialog is closed or the "Cancel" button is clicked.
     */
    showApplyDialog(): Promise<boolean>;
    // Forces the component to implement apply and discard functions
    onNavigate: FormActions;
}
