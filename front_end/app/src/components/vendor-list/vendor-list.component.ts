import {
    Component,
    forwardRef,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Renderer2,
    ViewEncapsulation
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxUriService } from '@services/uri.service';
import { paramSortFunc } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

/* USAGE
 <nx-vendor-list
     vendors=[]
     cameras=[]
     [(ngModel)]="filterModel">
 </nx-vendor-list>
 */

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-vendor-list',
    templateUrl: 'vendor-list.component.html',
    styleUrls: ['vendor-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => NxVendorListComponent),
        multi: true
    }]
})
export class NxVendorListComponent implements OnInit, OnChanges, OnDestroy {
    @Input() vendors;
    @Input() cameras;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    topXByVolume: any = {};
    public debug: boolean;
    public filters: any = [];
    public allVendors;

    private readonly uriPath: string;
    private filter: any = {};
    private ASC = true;
    private DESC = false;
    private uriSubscription: Subscription;
    private routerSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private uri: NxUriService,
        private router: Router,
        private _route: ActivatedRoute,
        private renderer: Renderer2
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
        this.debug = false;
        this.uriPath = '/' + this._route.snapshot.url.map(e => e.path).join('/');

        this.topXByVolume = {
            value: this.CONFIG.ipvd.vendorsShown
        };

        this.filters = [
            {
                label: this.LANG.cameraFilters.highRes(),
                select: { id: 'resolution', value: '8000000' },
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.aptz(),
                tagId: 'isAptzSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.ptz(),
                tagId: 'isPtzSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.audio(),
                tagId: 'isAudioSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.H265(),
                tagId: 'isH265',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.encoder(),
                multiselect: { id: 'hardwareTypes', value: 'encoder' }
            },
            {
                label: this.LANG.cameraFilters.TwWayAudio(),
                tagId: 'isTwAudioSupported'
            },
            {
                label: this.LANG.cameraFilters.multiSensor(),
                multiselect: { id: 'hardwareTypes', value: 'multiSensorCamera' }
            },
            {
                label: this.LANG.cameraFilters.fisheye(),
                tagId: 'isFisheye',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.IO(),
                tagId: 'isIoSupported',
                multiselect: { id: 'hardwareTypes', value: 'other' }
            }
        ];
    }

    ngOnDestroy() {
    }

    ngOnInit() {
        this.uriSubscription = this.uri.getParams()
            .subscribe(params => {
                if (params.debug !== undefined) {
                    this.debug = true;
                }
            });

        this.routerSubscription = this.router.events
            .pipe(
                filter(event => event instanceof ActivationEnd)
            )
            .subscribe((event: ActivationEnd) => {
                this.filter.multiselects.find(select => {
                    if (select.id === 'vendors') {
                        select.selected.push(event.snapshot.queryParams.vendors);
                    }
                });

                // Propagate component's value attribute (model)
                this.propagateChange({ ...this.filter });
            });
    }

    // Form control functions
    // The method set in registerOnChange to emit changes back to the form
    private propagateChange = (_: any) => {
    };

    writeValue(value: any) {
        if (value) {
            this.filter = value;
        }
    }

    ngOnChanges(changes: NgChanges<NxVendorListComponent>) {
        if (changes.vendors) {
            this.allVendors = changes.vendors.currentValue;
            this.setVendorsShown(changes.vendors.currentValue);
        }
    }

    setVendorsShown(vendors) {
        const byCountDESC = paramSortFunc((elm: any) => elm.count, false);

        const byNameASC = paramSortFunc((elm: any) => elm.name.toLowerCase());

        this.vendors = vendors.sort(byCountDESC)
            .slice(0, this.CONFIG.ipvd.vendorsShown)
            .sort(byNameASC);
    }

    toggleVendorsShown(element) {
        if (this.vendors.length !== this.allVendors.length) {
            this.vendors = this.allVendors;
            this.renderer.setProperty(
                element,
                'innerText',
                'Show Top ' + this.CONFIG.ipvd.vendorsShown
            );
        } else {
            this.setVendorsShown(this.allVendors);
            this.renderer.setProperty(element, 'innerText', 'Show All');
        }
    }

    trackItem(index, item) {
        return item ? item.name : undefined;
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn) {
        this.propagateChange = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: () => void): void {
    }

    setFilter(filter) {
        interface Params {
            [key: string]: string;
        }

        const queryParams: Params = {};

        if (filter.select) {
            this.filter.selects.find(select => {
                if (select.id === filter.select.id) {
                    select.selected = select.items.find(item => {
                        return item.value === filter.select.value;
                    });
                    queryParams.resolution = select.selected.value;
                }
            });
        }

        if (filter.tagId) {
            queryParams.tags = filter.tagId;
            this.filter.tags.find(tag => {
                if (tag.id === filter.tagId) {
                    tag.value = true;
                }
            });
        }

        if (filter.multiselect) {
            this.filter.multiselects.find(select => {
                if (select.id === filter.multiselect.id) {
                    select.selected.push(
                        select.items.find(item =>
                            item.id === filter.multiselect.value
                        ).id
                    );
                    queryParams.hardwareTypes = select.selected;
                }
            });
        }

        this.uri
            .updateURI('/ipvd', queryParams)
            .catch(error => {
                console.error(error);
            });

        // Propagate component's value attribute (model)
        this.propagateChange({ ...this.filter });

        return false;
    }
}
