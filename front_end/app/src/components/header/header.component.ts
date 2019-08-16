import {
    Component, Inject, OnInit,
    Renderer2
}                            from '@angular/core';
import {
    ActivatedRoute, NavigationEnd, Event,
    Router, RoutesRecognized
}                            from '@angular/router';
import { NxConfigService }   from '../../services/nx-config';
import { NxAppStateService } from '../../services/nx-app-state.service';
import { NxAccountService }  from '../../services/account.service';
import { NxDialogsService }  from '../../dialogs/dialogs.service';
import { NxSystemsService }  from '../../services/systems.service';
import { WINDOW }            from '../../services/window-provider';

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
    viewHeader: boolean;
    systemCounter: number;

    constructor(@Inject(WINDOW) private window: Window,
                private renderer: Renderer2,
                private _config: NxConfigService,
                private appState: NxAppStateService,
                private route: ActivatedRoute,
                private systemsService: NxSystemsService,
                private dialogs: NxDialogsService,
                private accountService: NxAccountService,
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

        this.viewHeader = this.CONFIG.showHeaderAndFooter;
        this.active = {};
        this.updateActive();

        this.systemsService.forceUpdateSystemsAsPromise().then(() => this.updateActive());

        this.router.events
              .subscribe((event: Event) => {
                  if (event instanceof RoutesRecognized) {
                      this.systemId = event.state.root.firstChild.params.systemId;
                  }

                  if (event instanceof NavigationEnd) {
                      // You only receive NavigationEnd events
                      if (this.systemId && !this.systems) {
                          this.systemsService.forceUpdateSystems();
                      }

                      this.updateActiveSystem();
                      this.updateActive();
                  }
              });

        this.accountService.loginStateSubject.subscribe((loginState) => {
            if (loginState) {
                this.renderer.removeClass(document.body, 'loading');
                this.renderer.removeClass(document.body, 'anonymous');
                this.renderer.addClass(document.body, 'authorized');
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
            this.systems = systems;
            this.singleSystem = (this.systems.length === 1);
            this.systemCounter = this.systems.length;

            this.updateActiveSystem();
        });


    }

    login () {
        const url = this.window.location.pathname;
        const redirect = this.CONFIG.redirectPaths.some((path) => url.indexOf(path) > -1);
        this.dialogs.login(!redirect);
    }

    logout () {
        this.accountService.logout(true);
    }

    updateActive() {
        this.active.ipvd = this.isActive('/ipvd');
        this.active.integrations = this.isActive('/integrations');
        this.active.register = this.isActive('/register');
        this.active.view = this.isActive('/view');
        this.active.settings = this.systemId && this.isActive('/systems') && !this.isActive('/view');
    }

    updateActiveSystem() {
        if (!this.systems) {
            return;
        }

        this.activeSystem = this.systems.find((system) => {
            return this.systemId === system.id;
        });
        if (this.singleSystem) { // Special case for a single system - it always active
            this.activeSystem = this.systems[0];
        }
    }


}
