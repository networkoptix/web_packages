import { ComponentFactoryResolver, Injectable, ViewContainerRef } from '@angular/core';
import { BehaviorSubject, merge } from 'rxjs';
import { distinctUntilChanged, filter, skip } from 'rxjs/operators';
import { NxDialogsService } from '../dialogs/dialogs.service';
import { NxApplyComponent } from '../components/apply/apply.component';

export class Watcher<T> {
    originalValue: T;
    valueSubject = new BehaviorSubject<T>(undefined);

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

    reset() {
        this.valueSubject.next(this.originalValue);
    }
}

@Injectable({
    providedIn: 'root'
})
export class NxApplyService {
    applyComponentRef: any;
    applyFunction: any;
    component: ViewContainerRef;
    discardFunction: any;
    private lockedSubject = new BehaviorSubject<boolean>(undefined);
    private lockedSubscription: any;
    popupActive = false;
    private watchers: any;
    private watchersSubscription: any;

    constructor(private factoryResolver: ComponentFactoryResolver,
                private dialogsService: NxDialogsService) {}

    get locked() {
        return this.lockedSubject.getValue();
    }
    set locked(value) {
        this.lockedSubject.next(value);
    }

    // Resets all watchers to undefined
    hardReset() {
        if (this.watchers) {
            this.watchers.forEach((watcher) => {
                watcher.value = undefined;
            });
        }
        this.locked = false;
    }

    // Resets all watchers to their first value that wasn't undefined
    reset() {
        if (this.watchers) {
            this.watchers.forEach((watcher) => {
                watcher.reset();
            });
        }
        this.locked = false;
    }

    touched() {
        this.locked = true;
    }

    initPageWatcher(component, saveFunction, discardFunction, watchers) {
        if (this.lockedSubscription) {
            this.lockedSubscription.unsubscribe();
        }
        if (this.watchersSubscription) {
            this.watchersSubscription.unsubscribe();
        }
        this.component = component;

        this.createComponent();
        this.setSaveFunction(saveFunction);
        this.setDiscardFunction(discardFunction);
        this.addWatchers(watchers);
        this.lockedSubscription = this.lockedSubject.subscribe((value) => {
            (<NxApplyComponent>this.applyComponentRef.instance).show = value;
        });
    }

    showDialog() {
        if (this.popupActive) {
            return Promise.resolve(false);
        }
        this.popupActive = true;
        return this.dialogsService.apply(this.applyFunction, this.discardFunction).then((status) => {
            if (status !== 'applied' && status !== 'discarded') {
                return false;
            }
            this.reset();
            return true;
        }, () => {
            return false;
        }).finally(() => {
            this.popupActive = false;
        });
    }

    private createComponent() {
        const compFactory = this.factoryResolver.resolveComponentFactory(NxApplyComponent);
        this.component.clear();
        this.applyComponentRef = this.component.createComponent(compFactory);
    }

    private setDiscardFunction(func: any) {
        this.discardFunction = func;
        (<NxApplyComponent>this.applyComponentRef.instance).discard = func;
    }

    private setSaveFunction(func: any) {
        this.applyFunction = func;
        (<NxApplyComponent>this.applyComponentRef.instance).save = func;
    }

    private addWatchers(watchers: Watcher<any>[]) {
        this.watchers = watchers;
        this.watchersSubscription = merge(...watchers.map(watcher => {
            return watcher.valueSubject.pipe(
                distinctUntilChanged(),
                filter((watcher) => watcher !== undefined));
        })).pipe(
            skip(this.watchers.length)
        ).subscribe((res) => {
            this.touched();
        });
    }
}
