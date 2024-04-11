import {
    Component,
    EnvironmentInjector,
    inject,
    input,
    Input,
    OnInit,
    runInInjectionContext,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, Observable, startWith } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { FormActions, NxCanNavigate } from '@services/apply.service/apply.service.type';
import type { NxUser } from '@services/system-user.types';
import { NxSystem } from '@services/system.service/system';
import { NxFormGroup } from '@utils/reactive-form-builder';

import { UserFormControls } from './user-form.types';

@Component({
    selector: 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss'],
})
export class NxSystemUsersComponent implements NxCanNavigate, OnInit {
    @Input() system: NxSystem;
    @Input() user: NxUser;
    userId$$ = input.required<string>({ alias: 'userId' });
    user$: Observable<NxUser>;

    private dialogService = inject(NxDialogsService);
    userFormSignal$$ = signal<NxFormGroup<UserFormControls> | undefined>(undefined);
    onNavigate: FormActions;
    canNavigate(): Promise<boolean> {
        const canNavigate = this.userFormSignal$$();
        if (canNavigate?.dirty) {
            return this.showApplyDialog();
        }
        return Promise.resolve(true);
    }

    async showApplyDialog(): Promise<boolean> {
        const { applyFunc, discardFunc } = this.onNavigate;
        const status = await this.dialogService.apply({ applyFunc, discardFunc });
        return status !== 'canceled';
    }

    setFormActions(actions: FormActions): void {
        this.onNavigate = actions;
    }
    injector = inject(EnvironmentInjector);

    ngOnInit(): void {
        runInInjectionContext(this.injector, () => {
            this.user$ = combineLatest([
                this.system?.infoSubject,
                toObservable(this.userId$$),
            ]).pipe(
                takeUntilDestroyed(),
                map(([_, userId]) =>
                    this.system.userManager.users.find(({ id }) => id.includes(userId)),
                ),
                filter(Boolean),
                startWith(this.user),
            );
        });
    }
}
