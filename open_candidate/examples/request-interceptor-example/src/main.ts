// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import './style.css'

import { RequestInterceptor, WithBearerMiddleware, WithVmsSessionMiddleware, WithFirstMiddleware } from '@networkoptix/request-interceptor'

import { description } from '../package.json'

document.querySelector<HTMLFormElement>('#description').innerHTML = description;

const tokenInput = document.querySelector<HTMLInputElement>('#token');

const tokenLabel = document.querySelector<HTMLLabelElement>('#token-label');

const sendButton = document.querySelector<HTMLButtonElement>('#send');

const getToken = () => tokenInput.value

const shouldAuthenticate = () => true

const useVmsToken = (token: string) => {
    tokenInput.value = token
    tokenInput.readOnly = true
    tokenLabel.innerText = 'Using VMS Token'
    sendButton.innerText = 'Make GET request using VMS Token'
    document.querySelector('.instructions').classList.add('vms')
}

/**
 * The request interceptor is registered with WithVmsSessionMiddleware and WithBearerMiddleware.
 *
 * The WithVmsSessionMiddleware will attempt to get a VMS token from the VMS API.
 *
 * The WithBearerMiddleware handles the Bearer token authentication with used without VMS auth.
 *
 * They are processed in order, so the WithVmsSessionMiddleware will be used if the session
 * token is available from the mediaserver else WithBearerMiddleware is used.
 */
RequestInterceptor.register([
    /**
     * In this example we use the WithFirstMiddleware higher order middleware to group middleware
     * so that we only one to process the first middleware that is able to process the request.
     */
    new WithFirstMiddleware([
        new WithVmsSessionMiddleware(useVmsToken),
        new WithBearerMiddleware(getToken, shouldAuthenticate),
    ])
])

sendButton.addEventListener('click', (e) => {
    e.preventDefault()
    fetch(document.querySelector<HTMLInputElement>('#url').value)
        .then(response => response.json())
        .then(json => document.querySelector<HTMLPreElement>('#response').innerText = JSON.stringify(json, null, 4))
        .catch(error => document.querySelector<HTMLPreElement>('#response').innerText = error.message)
})