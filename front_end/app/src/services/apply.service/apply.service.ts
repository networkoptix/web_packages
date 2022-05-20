import { Overlay } from '@angular/cdk/overlay';
import {
    ComponentFactoryResolver,
    ComponentRef,
    Injectable,
    Injector,
    ViewContainerRef
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual, cloneDeep } from 'lodash-es';
import {
    BehaviorSubject,
    combineLatest as combineLatestFrom,
    Subject,
    Subscription,
} from 'rxjs';
import {
    combineLatest,
    distinctUntilChanged,
    map,
    startWith,
    takeUntil
} from 'rxjs/operators';

import { NxApplyComponent } from '@components/apply/apply.component';
import { ApplyModalContent } from '@dialogs/apply/apply.component';
import { DialogBase } from '@dialogs/dialog-base';
import { DialogConfig } from '@dialogs/dialog-config';
import { defaultConfig } from '@dialogs/dialog-ref';
import { isObject } from '@utils/general';

import { NxProcessService } from '../process.service';
import { Process } from '../process.service/process';

import { Watcher, SectionWatcher, FormWatcher } from './watcher';

type ExtNgForm = {
    form: NgForm,
    originalForm: {},
    save: Process,
    discard: () => void,
    hasChange: boolean,
    changedFields: Set<string>,
    subscr: Subscription,
};

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
/**
 * Make sure the route has the ApplyGuard in the canDeactivate part. Otherwise, navigation will
 * not be blocked when changes are made to the page.
 * How to use the service:
 * >
 * const component = viewContainerRef;
 * const saveProcess = this.processService.createProcess(() => {
 * >>
 *   doSomething();
 * >
 * }, { config });
 * const discardFunction = () => {
 * >>
 *     this.applyService.reset();
 * >
 * };
 * const dataWatcher = new Watcher<string>();
 * this.applyService.initPageWatcher(component, saveProcess, discardFunction, [dataWatcher]);
 * dataWatcher.value = 'first string'; // Nothing happens.
 * dataWatcher.value = 'new string'; // NxApplyComponent becomes visible.
 * @class
 */
export class NxApplyService extends DialogBase {
    public applyComponentRef: ComponentRef<NxApplyComponent>;
    private applyComponentInstance: NxApplyComponent;
    private applyFunctions: Process[] = [];
    private applyFormFunctions: Process[] = [];
    private applyFunction: Process;
    private component: ViewContainerRef;
    private submitFunctions: (() => void)[] = [];
    private discardFunctions: (() => void)[] = [];
    private discardFunction = () => this.discardFunctions.forEach(discFunc => discFunc());
    private nonSystem$ = new BehaviorSubject(true);
    private popupActive = false;
    private form: NgForm;
    private watchers: Watcher<any>[];

    private updatedWatchers$ = new Subject<string>();
    applyOnNavSubject = new BehaviorSubject('');
    isOnline$ = new BehaviorSubject(true);

    constructor(
        overlay: Overlay,
        injector: Injector,
        private factoryResolver: ComponentFactoryResolver,
        private processService: NxProcessService,
    ) {
        super(overlay, injector);
    }

    get locked() {
        return !!this.applyComponentInstance?.show;
    }

    set locked(value) {
        if (this.applyComponentInstance) {
            this.applyComponentInstance.show = value;
        }
    }

    /**
     * If hardReset is false all watchers are set to their first undefined value.
     * If hardReset is true all watchers are set to undefined. This should be used when the component stays the
     * same but the data changes. For an example of how to use this function look at
     * NxSystemUsersComponent.
     */
    reset(hardReset = false): void {
        if (this.watchers) {
            this.watchers.forEach(watcher => {
                hardReset ? watcher.value = undefined : watcher.reset();
            });
        }
        this.locked = false;
        this.setWarn('');
        if (this.applyComponentInstance) {
            this.applyComponentInstance.invalidFields = [];
            this.applyComponentInstance._disabled = false;
        }
    }

    // private touched(): void {
    //     this.locked = true;
    // }

    /**
     * This iterates through the applyFunctions which is a Process[], it calls them in series until one fails.
     *
     * The this.applyFunctions.reduce starts with a resolved promise, calls .then on the promise then returns the next promise.
     *
     * If a process along the chain gets rejected, subsequent promises reject until it gets returned.
     *
     * When a process fails that rejected promise gets returned and is handled by the process that this.runProcesses was passed to.
     *
     * Two things to consider. The Process.then(successCB, errorCB) callbacks need to return something else the chain will end.
     * The other thing that still needs to be done are processes that trigger dialogs, need to find a way to only show the last.
     */
    runProcesses = () => this.applyFunctions.reduce(
        (prevPromise, process, index) => {
            return prevPromise.then(prevRes => {
                return new Promise((resolve, reject) => {
                    process.run(res => resolve(res || prevRes), res => reject(res || prevRes));
                }).catch(res => Promise.reject(res));
            }).catch(res => Promise.reject(res));
        }, Promise.resolve({ result: 'ok' })
    );

    /**
     * Creates the NxApplyComponent for the current page and sets the watchers.
     * @param component The target component where the NxApplyComponent is to be created.
     * @param saveFunction The process that is supposed to run when save is pressed.
     * @param discardFunction The process that is supposed to run when discard is pressed.
     * @param watchers An array of watchers which will trigger the NxApplyComponent to show
     *     if a value on the page has been changed.
     * @param {NgForm=} form Optional form to pass to the process-button
     * @param submitFn
     * @param nonSystem
     * @param onlyShowSectionWatchers
     */
    initPageWatcher(
        component: ViewContainerRef,
        saveFunction: Process = this.processService.createProcess(() => Promise.resolve()),
        discardFunction: () => void = () => null,
        watchers: Watcher<any>[] = [],
        form?: NgForm,
        submitFn?: () => any,
        nonSystem = false,
        onlyShowSectionWatchers = false
    ): void {
        // restore discardFunction in case previous page used form watcher
        // this should go away once we convert all components to use form watcher
        this.discardFunction = () => this.discardFunctions.forEach(discFunc => discFunc());

        this.nonSystem$.next(nonSystem);
        this.component = component;

        this.createComponent(onlyShowSectionWatchers);
        this.applyFunctions = [saveFunction];
        this.applyFunction = this.processService.createProcess(
            this.runProcesses,
            {
                ignoreError: true
            },
            res => {
                this.reset();
                return res;
            }
        );
        if (discardFunction) {
            this.discardFunctions = [discardFunction];
        }
        if (form) {
            this.setForm(form);
        }
        this.watchers = [];
        this.addWatchers(watchers);
        this.applyComponentInstance = this.applyComponentRef.instance;
        setTimeout(() => {
            this.applyComponentRef.instance.ready = true;
        }, 0);
        if (submitFn) {
            this.submitFunctions = [submitFn];
        }
        this.applyComponentRef.instance.submitFn =
            () => this.submitFunctions.forEach(submitFn => submitFn());
        this.applyComponentRef.instance.discard = this.discardFunction;
        this.applyComponentRef.instance.save = this.applyFunction;
    }

    // *************************************************************************
    // Form watcher
    // *************************************************************************
    /**
     * Creates the NxApplyComponent for the current page and clear forms.
     * @param component The target component where the NxApplyComponent is to be created.
     * @param nonSystem
     */
    forms: any = {};
    resetForms$ = new Subject();

    initPageFormsWatcher(
        component: ViewContainerRef,
        nonSystem = false
    ): void {
        this.nonSystem$.next(nonSystem);
        this.component = component;
        this.forms = {};
        this.applyFunction = undefined;
        this.discardFunction = undefined;

        this.createComponent();
        this.applyComponentInstance = this.applyComponentRef.instance;
        setTimeout(() => {
            this.applyComponentRef.instance.ready = true;
        }, 0);
    }

    resetFormWatchers(): void {
        this.applyComponentInstance.forms && this.resetForms$.next();
        for (const id in this.applyComponentInstance.forms) {
            delete this.applyComponentInstance.forms[id];
        }
    }

    removeFormWatcher(id: string): void {
        const watcher = this.applyComponentInstance.forms[id];
        watcher?.subscr.unsubscribe();
        delete this.applyComponentInstance.forms[id];
    }

    createFormWatcher(
        componentId: string,
        form: NgForm,
        saveFunction: Process,
        discardFunction?: () => void,
        owner = undefined,
        nonSystem = true
    ) {
        const updateOriginalForm = () => {
            const forms = this.applyComponentInstance.forms;
            Object.keys(forms)
                .forEach(key => {
                    const item = forms[key];
                    item.hasChange = false;
                    item.changedFields.clear();

                    const form = item.form.form;
                    Object.keys(form.controls).forEach(key => {
                        item.originalForm[key] = form.controls[key].value;
                        form.controls[key].markAsPristine();
                        form.controls[key].markAsUntouched();
                    });
                    form.markAsPristine();
                    form.markAsUntouched();
                });

            this.applyComponentInstance.show = false;
        };

        const revertOriginalValues = () => {
            const forms = this.applyComponentInstance.forms;
            Object.keys(forms)
                .forEach(key => {
                    const item = forms[key];
                    if (item.hasChange) {
                        item.hasChange = false;
                        item.changedFields.clear();

                        Object.keys(item.originalForm).forEach(key => {
                            item.form.form.controls[key].setValue(item.originalForm[key]);
                        });

                        item.discard && item.discard();
                    }
                });
        };

        const runFormProcesses = () => {
            // run SAVE only for changed forms
            this.applyFormFunctions = [];
            for (const frm in this.forms) {
                if (this.forms[frm].form.invalid) {
                    return Promise.resolve(); // abort running SAVE processes!
                }
                if (this.forms[frm].hasChange) {
                    this.applyFormFunctions.push(this.forms[frm].save);
                }
            }

            return this.applyFormFunctions.reduce(
                (prevPromise, process, index) => {
                    return prevPromise.then(prevRes => {
                        return new Promise((resolve, reject) => {
                            process.run(
                                res => resolve(res || prevRes),
                                res => reject(res || prevRes)
                            );
                        }).catch(res => Promise.reject(res));
                    }).catch(res => Promise.reject(res));
                }, Promise.resolve({ result: 'ok' })
            );
        };

        this.nonSystem$.next(nonSystem);

        if (this.applyComponentRef) {
            const formatInitial = () => {
                const formatted = {};
                for (const ctrl in form.form.controls) {
                    formatted[ctrl] = form.form.controls[ctrl].value;
                }

                return formatted;
            };

            const initialForm =
                !form.form.controls.fields && Object.keys(form.form.controls).length
                    ? formatInitial()
                    : {};
            const extNgForm: ExtNgForm = {
                form: form,
                originalForm: initialForm,
                save: saveFunction,
                discard: discardFunction,
                hasChange: false,
                changedFields: new Set(),
                subscr: new Subscription(),
            };

            extNgForm.subscr = extNgForm.form.valueChanges
                .pipe(
                    untilDestroyed(this),
                    takeUntil(this.resetForms$),
                )
                .subscribe(change => {
                    // Init phase ... in some cases form doesn't provide initial controls
                    // but valueChanges triggers on every control init
                    if (Object.values(extNgForm.originalForm).length !== Object.values(change).length) {
                        // if form contain multiselect (array) spread is not enough
                        extNgForm.originalForm = cloneDeep(change);
                        return;
                    } else {
                        // cover a case with dynamic fields in form represented as array
                        // filter out ddMultiSelect as selected items are represented as
                        // an array (same as dynamic form fields)
                        // I don't want to overcomplicate the logic -> so if we ever have a need
                        // to use ddMultiSelect in dynamic form we'll need to refactor this -- TT
                        Object.keys(change)
                            .filter(key => key !== 'ddMultiSelect')
                            .forEach(key => {
                                if (Array.isArray(change[key])) {
                                    if (change[key].length !== extNgForm.originalForm[key].length) {
                                        extNgForm.originalForm[key] = cloneDeep(change[key]);
                                    }
                                }
                            });
                    }

                    extNgForm.changedFields.clear();
                    Object.keys(extNgForm.originalForm).forEach(key => {
                        if (
                            (isObject(extNgForm.originalForm[key]) && !isEqual(extNgForm.originalForm[key], change[key])) ||
                            (!isObject(extNgForm.originalForm[key]) && extNgForm.originalForm[key] !== change[key])) {
                            extNgForm.changedFields.add(key);
                        }
                    });
                    extNgForm.hasChange = (extNgForm.changedFields.size > 0);

                    if (this.applyComponentRef) {
                        this.applyComponentInstance.show = extNgForm.hasChange;
                        const hasInvalid = Object.keys(this.applyComponentInstance.forms)
                            .some(key => this.applyComponentInstance.forms[key].form.invalid);

                        this.applyComponentInstance.setInvalid(hasInvalid);
                    }
                });

            this.forms[componentId] = extNgForm;

            this.applyComponentInstance.forms = this.forms;
            this.applyComponentInstance.applyVisible = true;

            this.applyComponentInstance.save = this.processService.createProcess(() => {
                return runFormProcesses();
            }, { ignoreError: true, ignoreUnauthorized: true }, result => {
                if (result) {
                    updateOriginalForm();
                }
            }, () => {
            });

            this.applyComponentInstance.discard = () => {
                revertOriginalValues();
            };
        }

        return new FormWatcher(form, owner);
    }

    // *************************************************************************
    // Form watcher (END)
    // *************************************************************************

    /**
     * Instantiates and returns a SectionWatcher that is API compatible with Watcher.
     *
     * This method accepts the same params as initPageWatcher.
     *
     * This SectionWatcher should be passed as a watcher to initPageWatcher.
     *
     * If you want to display 'Page contains unsaved changes' instead of save and discard
     * at the bottom of page pass true to the onlyShowSectionWatchers param on initPageWatcher.
     *
     * If you want to have the save / discard at the bottom of the page to run all save processes
     * or discard all changes, that code will need to be implemented on the save and discard
     * functions passed to initPageWatcher.
     *
     * TODO: We might want to add a way to run all section save processes sequentially when
     * clicking save at the bottom of the page but it's probably too early to be able to
     * come up with the right abstraction until we have the SectionWatchers in use.
     */
    createSectionWatcher = (
        component: ViewContainerRef | null,
        saveFunction: Process,
        discardFunction: () => void,
        watchers: Watcher<any>[],
        form?: NgForm,
        submitFn?: () => void
    ) => {
        const sectionWatcher = new SectionWatcher(watchers);
        if (!component) {
            return sectionWatcher;
        }
        const compFactory = this.factoryResolver.resolveComponentFactory(NxApplyComponent);
        component.clear();
        const applyComponentRef = component.createComponent(compFactory);
        if (form) {
            applyComponentRef.instance.form = form;
        }
        applyComponentRef.instance.applyVisible = true;
        applyComponentRef.instance.save = saveFunction;
        applyComponentRef.instance.discard = discardFunction;
        applyComponentRef.instance.submitFn = submitFn;
        sectionWatcher.valueSubject.pipe(distinctUntilChanged()).subscribe(_ => {
            applyComponentRef.instance.show = sectionWatcher.changed;
        });
        this.isOnline$.pipe(distinctUntilChanged()).subscribe(isOnline => {
            applyComponentRef.instance.isOnline = isOnline;
        });
        return sectionWatcher;
    };

    applyDialog(
        applyFunc: Process,
        discardFunc: () => void,
        form: NgForm
    ) {
        // Blur activeElement to prevent ExpressionChangedAfterItHasBeenCheckedError
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        // when using FormWatchers
        if (!applyFunc && Object.keys(this.forms).length && this.applyComponentInstance) {
            applyFunc = this.applyComponentInstance.save;
            discardFunc = this.applyComponentInstance.discard;
        }

        const config: Partial<DialogConfig> = {
            data: {
                applyFunc,
                discardFunc,
                form
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(ApplyModalContent, dialogConfig)
            .afterClosed();
    }

    // The ApplyGuard will call show dialog. For an example look at the settings.module.ts.
    showDialog(): Promise<boolean> {
        // If apply dialog is active block all other attempts to open it.
        if (this.popupActive) {
            return Promise.resolve(false);
        }
        this.popupActive = true;
        this.applyOnNavSubject.next('');

        return this.applyDialog(this.applyFunction, this.discardFunction, this.form)
            .then(
                (status: string) => {
                    this.applyOnNavSubject.next(status);
                    if (status !== 'applied' && status !== 'discarded') {
                        return false;
                    }
                    this.reset();
                    return true;
                },
                (status: string) => {
                    this.applyOnNavSubject.next(status);
                    return false;
                }
            )
            .finally(() => { this.popupActive = false; });
    }

    canMove(): Promise<boolean> {
        return new Promise(resolve => {
            if (this.locked) {
                this.showDialog().then(state => {
                    resolve(state);
                });
            } else {
                resolve(true);
            }
        });
    }

    removeWatchers<Owner>(owner?: Owner): void {
        this.watchers = owner ? this.watchers.filter(watcher => watcher.owner !== owner) : [];
        this.updatedWatchers$.next('update');
    }

    private createComponent(onlyShowSectionWatchers: boolean = false): void {
        const compFactory = this.factoryResolver.resolveComponentFactory(NxApplyComponent);
        this.component.clear();
        this.applyComponentRef = this.component.createComponent(compFactory);
        if (onlyShowSectionWatchers) {
            this.applyComponentRef.instance.showSectionWarning = onlyShowSectionWatchers;
        }
        this.applyComponentRef.instance.applyVisible = false;
        this.nonSystem$.pipe(combineLatest(this.isOnline$, (nonSystem, isOnline) => nonSystem || isOnline)
        ).subscribe(isOnline => {
            this.applyComponentRef.instance.isOnline = isOnline;
        });
    }

    public setForm(form: NgForm): void {
        this.form = form;
        this.applyComponentRef.instance.form = form;
    }

    public setVisible(state?: boolean): void {
        state = (state === undefined) ? true : state;
        if (this.applyComponentRef) {
            setTimeout(() => {
                this.applyComponentRef.instance.applyVisible = state;
            }, 0);
        }
    }

    public setWarn(message: string): void {
        if (this.applyComponentRef) {
            this.applyComponentRef.instance.warn = message;
        }
    }

    public setInvalidField(name: string): void {
        if (this.applyComponentRef) {
            this.applyComponentRef.instance.setInvalidField(name);
        }
    }

    public unsetInvalidField(name: string): void {
        if (this.applyComponentRef) {
            this.applyComponentRef.instance.unsetInvalidField(name);
        }
    }

    public setInvalid(flag: boolean): void {
        if (this.applyComponentRef) {
            this.applyComponentRef.instance.setInvalid(flag);
        }
    }

    /**
     * What's happening here
     * 1) For each watcher create a new observable that only fires when the observable
     *     has a distinct change and the new value is not undefined.
     * 2) Clone and join all the new observables into one observable.
     * 3) Skip watchers.length to avoid firing when the initial values are set for the watchers.
     * 4) If any of the watchers are changed show the NxApplyComponent and block navigation
     *     until the user saves or discards the changes.
     * @param watchers
     * @param owner
     */
    public addWatchers(watchers: (Watcher<any> | SectionWatcher)[], owner?: any): void {
        this.updatedWatchers$.next('update');
        const watchersFilterOutCurrentOwner = (
            owner
                ? this.watchers.filter(watcher => !watcher.owner || watcher.owner !== owner)
                : this.watchers
        ) || [];
        const symbols = new Set<symbol>();
        this.watchers =
            [...watchers, ...watchersFilterOutCurrentOwner].filter(({ identity }) => {
                if (symbols.has(identity)) {
                    return false;
                }
                symbols.add(identity);
                return true;
            });

        const changedWatchers$ = Object.values(
            this.watchers
        ).map(watcher => watcher.valueSubject.pipe(
            map(current => {
                if (isObject(current)) {
                    // Form watcher
                    return !isEqual(current, watcher.originalValue);
                }

                return watcher.originalValue !== undefined && current !== watcher.originalValue;
            }),
            startWith(false)
        ));
        combineLatestFrom(
            changedWatchers$
        ).pipe(
            map(changedArray => changedArray.some(changed => changed)),
            takeUntil(this.updatedWatchers$)
        ).subscribe(changed => {
            this.locked = changed;
        });
    }

    public addWatchersAndFunctionsFromChild(
        watchers: Watcher<any>[],
        applyFunction: Process,
        discardFunction,
        submitFunction?,
        owner?
    ): void {
        this.addWatchers([...this.watchers, ...watchers], owner);
        this.extendApplyFunction(applyFunction);
        this.extendDiscardFunction(discardFunction);
        if (submitFunction) {
            this.extendSubmitFunction(submitFunction);
        }
    }

    private extendApplyFunction(applyFunction: Process): void {
        const { name } = applyFunction.settings;
        if (name) {
            this.applyFunctions = this.applyFunctions.filter((aF: Process) => {
                return aF.settings.name ? aF.settings.name !== name : true;
            });
        }
        this.applyFunctions.push(applyFunction);
    }

    private extendDiscardFunction(discardFunction: () => void): void {
        this.discardFunctions.push(discardFunction);
    }

    private extendSubmitFunction(submitFunction: () => void): void {
        this.submitFunctions.push(submitFunction);
    }
}
