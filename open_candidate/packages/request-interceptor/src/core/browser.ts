// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { HttpRequestEventMap, Interceptor } from '@mswjs/interceptors'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'

export const interceptors: (Interceptor<HttpRequestEventMap> | XMLHttpRequestInterceptor| FetchInterceptor) [] = ([XMLHttpRequestInterceptor, FetchInterceptor]).map(Interceptor => new Interceptor())