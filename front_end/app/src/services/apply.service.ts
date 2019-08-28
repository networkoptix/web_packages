import { ComponentFactoryResolver, Injectable, ViewContainerRef } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, NavigationStart, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { NxDialogsService } from '../dialogs/dialogs.service';
import { NxApplyComponent } from '../components/apply/apply.component';


@Injectable({
    providedIn: 'root'
})
export class NxApplyService {
    applyComponentRef: any;
    applyFunction: any;
    component: ViewContainerRef;
    discardFunction: any;
    lockedSubject = new BehaviorSubject<boolean>(undefined);
    lockedSubscription: any;

    constructor(private factoryResolver: ComponentFactoryResolver,
                private router: Router,
                private dialogsService: NxDialogsService) {
        this.initRouteListener();
    }

    get locked() {
        return this.lockedSubject.getValue();
    }
    set locked(value) {
        this.lockedSubject.next(value);
    }
    reset() {
        this.locked = false;
    }

    touched() {
        this.locked = true;
    }

    initPageWatcher(component, saveFunction, discardFunction) {
        if (this.lockedSubscription) {
            this.lockedSubscription.unsubscribe();
        }
        this.component = component;
        this.locked = false;

        this.createComponent();
        this.setSaveFunction(saveFunction);
        this.setDiscardFunction(discardFunction);
        this.lockedSubscription = this.lockedSubject.subscribe((value) => {
            (<NxApplyComponent>this.applyComponentRef.instance).show = value;
        });
    }

    initRouteListener() {
        this.router.events.pipe(
            tap((event) => {
                // console.log(event);
            }),
            filter(event => event instanceof NavigationStart),
        ).subscribe((route: NavigationStart) => {
            const next = route.url;
            if (this.locked) {
                this.dialogsService.apply(this.applyFunction, this.discardFunction).then((status) => {
                    if (status !== 'applied' && status !== 'discarded') {
                        return;
                    }
                    this.locked = false;
                    setTimeout(() => {
                        this.router.navigateByUrl(next).catch((error) => {});
                        this.reset();
                    });
                }, (reason) => {
                    console.log(reason);
                });
            }
        });
    }

    createComponent() {
        const compFactory = this.factoryResolver.resolveComponentFactory(NxApplyComponent);
        this.component.clear();
        this.applyComponentRef = this.component.createComponent(compFactory);
    }

    setDiscardFunction(func: any) {
        this.discardFunction = func;
        (<NxApplyComponent>this.applyComponentRef.instance).discard = func;
    }

    setSaveFunction(func: any) {
        this.applyFunction = func;
        (<NxApplyComponent>this.applyComponentRef.instance).save = func;
    }
}


@Injectable()
export class ApplyGuard implements CanActivate {
    constructor(private applyService: NxApplyService) {}

    canActivate(route: ActivatedRouteSnapshot,
                state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return ! this.applyService.locked;
    }
}
