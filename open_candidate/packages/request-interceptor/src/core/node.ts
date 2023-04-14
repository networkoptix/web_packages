// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'

export const interceptors: (ClientRequestInterceptor | XMLHttpRequestInterceptor | FetchInterceptor)[] = ([XMLHttpRequestInterceptor, FetchInterceptor, ClientRequestInterceptor]).map(Interceptor => new Interceptor())