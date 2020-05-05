import {
    Component, forwardRef, Input,
    OnChanges, OnDestroy, OnInit, Renderer2,
    SimpleChanges, ViewEncapsulation
}                                    from '@angular/core';
import { NG_VALUE_ACCESSOR }         from '@angular/forms';
import { ActivatedRoute }            from '@angular/router';
import { Subscription }              from 'rxjs';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import {
    NxConfigService, IConfig, NxUriService,
    NxUtilsService, NxLanguageProviderService
}                                    from '../../services';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

/* USAGE
 <nx-vendor-list
     vendors=[]
     cameras=[]
     [(ngModel)]="filterModel">
 </nx-vendor-list>
 */

@AutoUnsubscribe()
@Component({
    selector     : 'nx-vendor-list',
    templateUrl  : 'vendor-list.component.html',
    styleUrls    : ['vendor-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers    : [{
        provide    : NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => NxVendorListComponent),
        multi      : true
    }]
})
export class NxVendorListComponent implements OnInit, OnChanges, OnDestroy {
    @Input() vendors: any;
    @Input() cameras: any;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    public debug: boolean;
    public filters: any = [];
    public allVendors;
    public remainingVendors: number;

    private readonly uriPath: string;
    private filter: any = {};
    private ASC = true;
    private DESC = false;
    private uriSubscription: Subscription;

    constructor(configService: NxConfigService,
                language: NxLanguageProviderService,
                private uri: NxUriService,
                private _route: ActivatedRoute,
                private renderer: Renderer2
    ) {
        this.LANG = language.getTranslations();
        this.CONFIG = configService.getConfig();
        this.debug = false;
        this.uriPath = '/' + this._route.snapshot.url.map(e => e.path).join('/');

        this.filters = [
            {
                label      : this.LANG.cameraFilters.highRes,
                select     : { id: 'resolution', value: '8mp' },
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label      : this.LANG.cameraFilters.aptz,
                tagId      : 'isAptzSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label      : this.LANG.cameraFilters.ptz,
                tagId      : 'isPtzSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label      : this.LANG.cameraFilters.audio,
                tagId      : 'isAudioSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label      : this.LANG.cameraFilters.H265,
                tagId      : 'isH265',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label      : this.LANG.cameraFilters.encoder,
                multiselect: { id: 'hardwareTypes', value: 'encoder' }
            },
            {
                label: this.LANG.cameraFilters.TwWayAudio,
                tagId: 'isTwAudioSupported'
            },
            {
                label      : this.LANG.cameraFilters.multiSensor,
                multiselect: { id: 'hardwareTypes', value: 'multiSensorCamera' }
            },
            {
                label      : this.LANG.cameraFilters.fisheye,
                tagId      : 'isFisheye',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label      : this.LANG.cameraFilters.IO,
                tagId      : 'isIoSupported',
                multiselect: { id: 'hardwareTypes', value: 'other' }
            }
        ];
    }

    ngOnDestroy() {
    }

    ngOnInit() {
        this.uriSubscription = this.uri.getURI()
            .subscribe(params => {
                if (params.debug !== undefined) {
                    this.debug = true;
                }
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

    ngOnChanges(changes: SimpleChanges) {
        if (changes.vendors) {
            this.allVendors = changes.vendors.currentValue;
            this.remainingVendors = changes.vendors.currentValue.length - this.CONFIG.ipvd.vendorsShown;

            this.setVendorsShown(changes.vendors.currentValue);
        }
    }

    setVendorsShown(vendors) {
        const byCountDESC = NxUtilsService.byParam((elm) => {
            return elm.count;
        }, NxUtilsService.sortDESC);

        const byNameASC = NxUtilsService.byParam((elm) => {
            return elm.name.toLowerCase();
        }, NxUtilsService.sortASC);

        this.vendors = vendors.sort(byCountDESC)
            .slice(0, this.CONFIG.ipvd.vendorsShown)
            .sort(byNameASC);
    }

    toggleVendorsShown(element) {
        if (this.vendors.length !== this.allVendors.length) {
            this.vendors = this.allVendors;
            this.renderer.setProperty(element, 'innerText', 'Show Top ' + this.CONFIG.ipvd.vendorsShown);
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
            [key: string]: any;
        }

        const queryParams: Params = {};

        if (filter.select) {
            this.filter.selects.find((select) => {
                if (select.id === filter.select.id) {
                    select.selected = select.items.find(item => {
                        return item.name === filter.select.value;
                    });
                    queryParams.resolution = select.selected.name;
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
            this.filter.multiselects.find((select) => {
                if (select.id === filter.multiselect.id) {
                    select.selected.push(select.items.find(item => item.id === filter.multiselect.value).id);
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

    setVendor(vendor) {
        interface Params {
            [key: string]: any;
        }

        const queryParams: Params = {};

        this.filter.multiselects.find((select) => {
            if (select.id === 'vendors') {
                select.selected.push(vendor.name);

                queryParams[select.id] = select.selected;

                this.uri
                    .updateURI(this.uriPath, queryParams)
                    .catch(error => {
                        console.error(error);
                    });
            }
        });

        // Propagate component's value attribute (model)
        this.propagateChange({ ...this.filter });

        return false;
    }
}
