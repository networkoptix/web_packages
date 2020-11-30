import {
    ComponentFactoryResolver, Injectable,
    ViewContainerRef, ComponentRef, ViewChild
} from '@angular/core';
import { NgForm }                               from '@angular/forms';
import { BehaviorSubject, merge, Subscription, Observable, from } from 'rxjs';
import {
    distinctUntilChanged, filter, skip, map, combineLatest
}                                               from 'rxjs/operators';

import { NxApplyComponent }          from '../components/apply/apply.component';
import { Process, NxProcessService } from './process.service';
import { NxUtilsService }            from './utils.service';
import { ApplyModalContent }         from '../dialogs/apply/apply.component';
import { NgbModal }                  from '@ng-bootstrap/ng-bootstrap';

interface IParams<Value = any> {
    [key: string]: Value;
}

/**
 * Allows making subscriptions to variables similar to $watch from AngularJS.
 * Usage:
 * >
 * const someVar = new Watcher<any>;
 * someVar.subscribe((data) => {
 * >>
 * doSomething();
 * >
 * });
 * someVar.value = {data: 'test'};
 * @class
 */
export class Watcher<T extends any> {
    originalValue: T;
    valueSubject = new BehaviorSubject<T>(undefined);

    constructor(value?: T) {
        this.value = value;
    }

    get value() {
        return this.valueSubject.getValue();
    }

    set value(data) {
        if (this.value === undefined) {
            this.originalValue = data;
        }
        if (this.value !== data) {
            this.valueSubject.next(data);
        }
    }

    get changed() {
        return this.originalValue !== this.value;
    }

    // Resets the value of the watcher to the first value that was not undefined.
    reset = () => {
        this.valueSubject.next(this.originalValue);
    }

    static extendedWatcherFactory<T extends any, Extended extends { [key: string]: any }>(
        value: T, extendedProperties: Extended
    ) {
        const watcher = new Watcher(value) as Watcher<T> & Extended;
        Object.assign(watcher, extendedProperties);
        return watcher;
    }
}

/**
 * Section watcher that that is api compatible with watcher.
 */
export class SectionWatcher {
    originalValue;
    valueSubject = new BehaviorSubject(undefined);
    constructor(public watchers: Watcher<any>[]) {
        this.watchers.forEach(watcher => {
            watcher.valueSubject.subscribe(_ => {
                this.updateHash();
            });
        });
    }

    get value() {
        return this.watchers.reduce((acc, cur) => acc.concat(cur.value), '');
    }

    set value(data) {
        if (this.value === undefined) {
            this.originalValue = data;
        }
        if (this.value !== data) {
            this.valueSubject.next(data);
        }
        this.watchers.forEach(watcher => {
            watcher.value = data;
        });
    }

    get changed() {
        return this.watchers.some(watcher => watcher.changed);
    }

    private updateHash = () => {
        this.valueSubject.next(this.value);
    }

    reset = () => {
        this.watchers.forEach(watcher => watcher.reset());
    }
}

export class FormWatcher {
    originalValue;
    valueSubject = new BehaviorSubject(false);
    changed: boolean;

    get value() {
        return this.valueSubject.value;
    }

    constructor(private form: NgForm) {
        form.valueChanges.subscribe((change) => {
            if (!this.originalValue || Object.keys(this.originalValue).length < Object.keys(change).length) {
                this.originalValue = change;
            } else {
                this.changed = !NxUtilsService.isEqual(this.originalValue, change);
                this.valueSubject.next(change);
            }
        });
    }

    hardReset = () => {
        const { value } = this.valueSubject;
        Object.assign(this.originalValue, value);
        this.form.reset(value);
    }

    reset = () => {
        this.form.reset(this.originalValue);
    }

    saved = () => {
        this.originalValue = this.value;
        this.changed = false;
        this.reset();
    }
}

@Injectable({
    providedIn: 'root'
})
/**
 * Make sure the route has the ApplyGuard in the canDeactivate part. Other wise navigation will
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
export class NxApplyService {
    public applyComponentRef: ComponentRef<NxApplyComponent>;
    private applyFunctions: Process[] = [];
    private applyFunction: Process;
    private component: ViewContainerRef;
    private submitFunctions = [];
    private discardFunctions = [];
    private discardFunction = () => this.discardFunctions.forEach(discFunc => discFunc());
    private lockedSubject = new BehaviorSubject<boolean>(undefined);
    private nonSystem$ = new BehaviorSubject(true);
    private popupActive = false;
    private form: NgForm;
    private lockedSubscription: Subscription;
    private watchers: Watcher<any>[];

    private watchersSubscription: Subscription;

    isOnline$ = new BehaviorSubject(true);

    constructor(
        private factoryResolver: ComponentFactoryResolver,
        private processService: NxProcessService,
        private modalService: NgbModal,
    ) {}

    get locked() {
        return this.lockedSubject.getValue();
    }

    set locked(value) {
        this.lockedSubject.next(value);
    }

    /**
     * Resets all watchers to undefined. This should be used when the component stays the
     * same but the data changes. For an example of how to use this function look at
     * NxSystemUsersComponent.
     */
    hardReset() {
        if (this.watchers) {
            this.watchers.forEach((watcher) => {
                watcher.value = undefined;
            });
        }
        this.locked = false;
        this.setWarn('');
    }

    // Resets all watchers to their first value that wasn't undefined.
    reset(nonSystem = false) {
        if (this.watchers) {
            this.watchers.forEach((watcher) => {
                watcher.reset();
            });
        }
        this.locked = false;
        this.setWarn('');
    }

    private touched() {
        this.locked = true;
    }

    /**
     * This iterates through the applyFunctions which is an Process[], it calls them in series until one fails.
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
        async(prevPromise, process, index) => {
            return prevPromise.then(prevRes => {
                return new Promise((resolve, reject) => {
                    process.run((res) => resolve(res || prevRes), (res) => reject(res || prevRes));
                }).catch(res => Promise.reject(res));
            }).catch(res => Promise.reject(res));
        }, Promise.resolve()
    );

    /**
     * Creates the NxApplyComponent for the current page and sets the watchers.
     * @param component The target component where the NxApplyComponent is to be created.
     * @param saveFunction The process that is suppose to run when save is pressed.
     * @param discardFunction The process that is suppose to run when discard is pressed.
     * @param watchers An array of watchers which will trigger the NxApplyComponent to show
     *     if a value on the page has been changed.
     * @param {NgForm=} form Optional form to pass to the process-button
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
    ) {
        this.nonSystem$.next(nonSystem);
        this.clearSubscriptions();
        this.component = component;

        this.createComponent(onlyShowSectionWatchers);
        this.applyFunctions = [saveFunction];
        this.applyFunction = this.processService.createProcess(
            this.runProcesses,
            {
                ignoreError: true
            },
            (res) => {
                this.reset();
                return res;
            },
            (res) => {
                // need to figure out how to reset
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
        this.addWatchers(watchers);
        this.lockedSubscription = this.lockedSubject.subscribe((value) => {
            (<NxApplyComponent> this.applyComponentRef.instance).show = !!value;
        });
        setTimeout(() => {
            (<NxApplyComponent> this.applyComponentRef.instance).ready = true;
        }, 0);
        if (submitFn) {
            this.submitFunctions = [submitFn];
        }
        (<NxApplyComponent> this.applyComponentRef.instance).submitFn = () => this.submitFunctions.forEach(submitFn => submitFn());
        (<NxApplyComponent> this.applyComponentRef.instance).discard = this.discardFunction;
        (<NxApplyComponent> this.applyComponentRef.instance).save = this.applyFunction;
    }

    // ... Breadcrumbs ... TT
    formInit = true;
    originalForm: any;

    createFormWatcher(
        component: ViewContainerRef | null,
        form: NgForm,
        saveFunction: Process
    ) {
        component?.clear();
        const compFactory = this.factoryResolver.resolveComponentFactory(NxApplyComponent);
        const applyComponentRef = component?.createComponent(compFactory);
        if (form && applyComponentRef) {
            applyComponentRef.instance.form = form;
        }
        if (applyComponentRef) {
            applyComponentRef.instance.applyVisible = true;
            applyComponentRef.instance.save = saveFunction;
            applyComponentRef.instance.discard = () => {
                Object.keys(this.originalForm).forEach((key) => {
                    form.controls[key].setValue(this.originalForm[key]);
                });
            };
        }

        form.valueChanges.subscribe((change) => {
            // Init phase ... it's called during form controls init
            const hasChange = !NxUtilsService.isEqual(this.originalForm, change);
            if (this.formInit) {
                if (!this.originalForm || hasChange) {
                    this.originalForm = { ...change };
                    this.formInit = !Object.values(this.originalForm).every(x => x !== undefined);
                }
                return;
            }
            if (applyComponentRef) {
                applyComponentRef.instance.show = hasChange;
            }
        });

        return new FormWatcher(form);
    }

    // ... Breadcrumbs (END) ... TT

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
     * or discard all changes, that code will need to be implmemented on the save and discard
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
        submitFn?: () => any
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
    }

    createModal<Modal, Options extends IParams, Inputs extends IParams, Result extends any>(
        modal: Modal, options: Options, inputs: Inputs
    ): Promise<Result> {
        const modalRef = this.modalService.open(modal, options);
        Object.assign(modalRef.componentInstance, inputs);
        return modalRef.result;
    }

    applyDialog(applyFunc: Process, discardFunc: () => void, form: NgForm) {
        // Blur activeElement to prevent ExpressionChangedAfterItHasBeenCheckedError
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        return this.createModal(ApplyModalContent, options, { applyFunc, discardFunc, form });
    }

    // The ApplyGuard will call show dialog. For an example look at the settings.module.ts.
    showDialog() {
        // If the apply dialog is active block all other attempts to open it.
        if (this.popupActive) {
            return Promise.resolve(false);
        }
        this.popupActive = true;
        return this.applyDialog(this.applyFunction, this.discardFunction, this.form)
            .then(
                status => {
                    if (status !== 'applied' && status !== 'discarded') {
                        return false;
                    }
                    this.reset();
                    return true;
                },
                () => false
            )
            .finally(() => { this.popupActive = false; });
    }

    canMove() {
        return new Promise<boolean>((resolve) => {
            if (this.locked) {
                this.showDialog().then((state) => {
                    resolve(state);
                });
            } else {
                resolve(true);
            }
        });
    }

    private clearSubscriptions() {
        if (this.lockedSubscription) {
            this.lockedSubscription.unsubscribe();
        }
        if (this.watchersSubscription) {
            this.watchersSubscription.unsubscribe();
        }
    }

    private createComponent(onlyShowSectionWatchers = false) {
        const compFactory = this.factoryResolver.resolveComponentFactory(NxApplyComponent);
        this.component.clear();
        this.applyComponentRef = this.component.createComponent(compFactory);
        if (onlyShowSectionWatchers) {
            (<NxApplyComponent> this.applyComponentRef.instance).showSectionWarning = onlyShowSectionWatchers;
        }
        (<NxApplyComponent> this.applyComponentRef.instance).applyVisible = false;
        this.nonSystem$.pipe(combineLatest(this.isOnline$, (nonSystem, isOnline) => nonSystem || isOnline)
        ).subscribe(isOnline => {
            (<NxApplyComponent> this.applyComponentRef.instance).isOnline = isOnline;
        });
    }

    public setForm(form: NgForm) {
        this.form = form;
        (<NxApplyComponent> this.applyComponentRef.instance).form = form;
    }

    public setVisible(state?: boolean) {
        state = (state === undefined) ? true : state;
        if (this.applyComponentRef) {
            setTimeout(() => {
                (<NxApplyComponent> this.applyComponentRef.instance).applyVisible = state;
            }, 0);
        }
    }

    public setWarn(message: string) {
        if (this.applyComponentRef) {
            (<NxApplyComponent> this.applyComponentRef.instance).warn = message;
        }
    }

    /**
     * Whats happening here
     * 1) For each watcher create a new observable that only fires when the observable
     *     has a distinct change and the new value is not undefined.
     * 2) Clone and join all of the new observables into one observable.
     * 3) Skip watchers.length to avoid firing when the initial values are set for the watchers.
     * 4) If any of the watchers are changed show the NxApplyComponent and block navigation
     *     until the user saves or discards the changes.
     * @param watchers
     */
    private addWatchers(watchers: (Watcher<any> | SectionWatcher)[]) {
        this.watchers = watchers;
        this.watchersSubscription = merge(...watchers.map(watcher => {
            return watcher.valueSubject.pipe(
                distinctUntilChanged(),
                filter((watcher) => watcher !== undefined),
                map(() => watcher)
            );
        })).pipe(
            skip(this.watchers.length)
        ).subscribe(changedWatcher => {
            if (changedWatcher.changed) {
                this.touched();
            } else {
                this.locked = watchers.some((watcher) => watcher.changed);
            }
        });
    }

    public addWatchersAndFunctionsFromChild(
        watchers: Watcher<any>[],
        applyFunction: Process,
        discardFunction,
        submitFunction?
    ) {
        this.addWatchers([...this.watchers, ...watchers]);
        this.extendApplyFunction(applyFunction);
        this.extendDiscardFunction(discardFunction);
        if (submitFunction) {
            this.extendSubmitFunction(submitFunction);
        }
    }

    private extendApplyFunction(applyFunction: Process) {
        this.applyFunctions.push(applyFunction);
    }

    private extendDiscardFunction(discardFunction: () => void) {
        this.discardFunctions.push(discardFunction);
    };

    private extendSubmitFunction(submitFunction: () => void) {
        this.submitFunctions.push(submitFunction);
    }
}
