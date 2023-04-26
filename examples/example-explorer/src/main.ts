// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import './style.css'
import { description } from '../package.json'
import manifest from './manifest.json'

const menuContent = document.querySelector<HTMLDivElement>('#menu-content')

const demoTarget = document.querySelector<HTMLIFrameElement>('[name=demo-target]')

document.querySelector<HTMLFormElement>('#description').innerHTML = description;

manifest.forEach(item => {
  const link = document.createElement('a')
  link.className = 'example-link'
  link.href = `./${item.packageDir}/${import.meta.env.PROD ? '' : 'index.html'}`
  link.innerHTML = `<li>${item.description}</li>`
  link.addEventListener('click', function (e) {
    e.preventDefault()
    if (import.meta.env.PROD) {
      demoTarget.src = link.href
    } else {
      demoTarget.contentWindow.location.href = link.href
    }
  })
  menuContent.appendChild(link)
})

demoTarget.addEventListener('load', function () {
  const current = import.meta.env.PROD ? this.src : this.contentWindow.location.href
  document.querySelectorAll<HTMLAnchorElement>('.example-link').forEach(link => {
    if (link.href === current) {
      link.classList.add('selected')
    } else {
      link.classList.remove('selected')
    }
  })
})