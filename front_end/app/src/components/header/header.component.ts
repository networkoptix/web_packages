import {
    Component, Inject, OnInit,
    Renderer2
}                            from '@angular/core';
import {
    ActivatedRoute, NavigationEnd, Event,
    Router, RoutesRecognized
}                              from '@angular/router';
import { NxConfigService }     from '../../services/nx-config';
import { NxAppStateService }   from '../../services/nx-app-state.service';
import { NxAccountService }    from '../../services/account.service';
import { NxDialogsService }    from '../../dialogs/dialogs.service';
import { NxSessionService }    from '../../services/session.service';
import { NxSystemsService }    from '../../services/systems.service';
import { WINDOW }              from '../../services/window-provider';
import { LocalStorageService } from 'ngx-store';

@Component({
    selector: 'nx-header',
    templateUrl: 'header.component.html',
    styleUrls: [ 'header.component.scss' ]
})
export class NxHeaderComponent implements OnInit {

    CONFIG: any = {};

    systems: any;
    systemId: any;
    active: any = {};
    activeSystem: any = {};
    singleSystem: any = {};
    inline: any;
    navVisible: boolean;
    dropdownsVisible: boolean;
    viewHeader: boolean;
    systemCounter: number;
    loginState: any;

    constructor(@Inject(WINDOW) private window: Window,
                private renderer: Renderer2,
                private _config: NxConfigService,
                private appState: NxAppStateService,
                private route: ActivatedRoute,
                private systemsService: NxSystemsService,
                private dialogs: NxDialogsService,
                private accountService: NxAccountService,
                private sessionService: NxSessionService,
                private localStorage: LocalStorageService,
                private router: Router,
    ) {
        this.CONFIG = this._config.getConfig();
    }

    private isActive(val) {
        return this.window.location.pathname.indexOf(val) >= 0;
    }

    ngOnInit() {
        // TODO: root route is maintained by AJS - replace this once we get rid of it.
        this.inline = this.window.location.search.indexOf('inline') > 0;
        // this.route.queryParams.subscribe(params => {
        //     this.inline = params['inline'] !== 'undefined';
        // });
        this.navVisible = false;
        this.dropdownsVisible = false;
        this.viewHeader = this.CONFIG.showHeaderAndFooter;
        this.active = {};

        this.sessionService.loginStateSubject.subscribe((state) => {
            this.accountService
                .get()
                .then(account => {
                    if (account) {
                        this.dropdownsVisible = true;
                    }
                });
        });


        this.router.events
              .subscribe((event: Event) => {
                  if (event instanceof RoutesRecognized) {
                      this.systemId = event.state.root.firstChild.params.systemId;
                      this.localStorage.set('systemId', this.systemId);
                  }

                  if (event instanceof NavigationEnd) {
                      // You only receive NavigationEnd events
                      if (this.systemId && !this.systems) {
                          this.systemsService
                              .forceUpdateSystems()
                              .toPromise().then(() => {
                                  this.updateActiveSystem();
                                  this.updateActive();
                              });
                      } else {
                          this.updateActiveSystem();
                          this.updateActive();
                      }
                  }
              });

        this.sessionService.loginStateSubject.subscribe((loginState) => {
            this.loginState = loginState;
            if (loginState) {
                this.renderer.removeClass(document.body, 'loading');
                this.renderer.removeClass(document.body, 'anonymous');
                this.renderer.addClass(document.body, 'authorized');
                this.systemsService
                    .forceUpdateSystems(loginState)
                    .toPromise()
                    .then(() => this.updateActive());
            } else {
                this.renderer.removeClass(document.body, 'loading');
                this.renderer.removeClass(document.body, 'authorized');
                this.renderer.addClass(document.body, 'anonymous');
            }
        });

        this.systemsService.systemsSubject.subscribe((systems) => {
            if (!systems) {
                return;
            }

            this.systemId = this.localStorage.get('systemId');

            if (!this.systemId && this.route.firstChild && this.route.firstChild.snapshot.params.systemId) {
                this.systemId = this.route.firstChild.snapshot.params.systemId;
            }
            this.systems = systems;
            this.singleSystem = (this.systems.length === 1);
            this.systemCounter = this.systems.length;

            this.updateActiveSystem();
        });


    }

    login () {
        const url = this.window.location.pathname;
        const redirect = this.CONFIG.redirectPaths.some((path) => url.indexOf(path) > -1);
        // Handling promise to satisfy the linter.
        this.dialogs.login(this.accountService, !redirect).then(() => {});
    }

    logout () {
        this.accountService.logout(true);
    }

    updateActive() {
        this.active.ipvd = this.isActive('/ipvd');
        this.active.integrations = this.isActive('/integrations');
        this.active.register = this.isActive('/register');
        this.active.view = this.isActive('/view');
        this.active.information = this.isActive('/health');
        this.active.settings = this.systemId && this.isActive('/systems') && !this.isActive('/view') && !this.isActive('/health');
        this.navVisible = true;
    }

    updateActiveSystem() {
        if (!this.systems) {
            return;
        }

        if (this.singleSystem) { // Special case for a single system - it always active
            this.activeSystem = this.systems[0];
            return;
        }

        this.activeSystem = this.systems.find((system) => {
            return this.systemId === system.id;
        });
    }
}
