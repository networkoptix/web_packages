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
