import { Pipe, PipeTransform } from '@angular/core';
import { NxUtilsService }      from '../../../../../../../services/utils.service';

@Pipe({
    name: 'ip_info'
})
export default class IpInfoPipe implements PipeTransform {
    public transform (url) {
        if (url.indexOf('://') !== -1) {
            url = url.split('://')[1];
        }
        if (url.indexOf(':') !== -1) {
            // remove port - split by last occurrence of ":" ... just in case we have IPv6
            url = url.split(/:(?=[^:]+$)/)[0];
        } else {
            url = url.split('/')[0];
        }
        return url;
    }
}
