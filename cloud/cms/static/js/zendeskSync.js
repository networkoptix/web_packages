const selectedCustomization = window.location.hash.replace('#', '').split('?')[0]
const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
expandedCustomizations = new Set((urlParams.get('customizations') || '').split(',').filter(value => value))
expandedLogs = new Set((urlParams.get('logs') || '').split(',').filter(value => value))
const updateQueryParams = () => {
    const query = {}
    if (expandedCustomizations.size) {
        query.customizations = Array.from(expandedCustomizations)
    }

    if (expandedLogs.size) {
        query.logs = Array.from(expandedLogs)
    }

    const queryString = new URLSearchParams(query).toString()
    let url = location.href.split('?')[0]
    if (!expandedCustomizations.has(selectedCustomization)) {
        url = url.replace(`#${selectedCustomization}`, '')
    }
    const path = queryString ? url + '?' + queryString : url
    window.history.replaceState({path}, '', path)
}
const updateViewState = () => {
    const collapse = (node) => node.classList.remove('in')
    const expand = (node) => node.classList.add('in')
    const panels = document.querySelectorAll('.panel-collapse.collapse')
    const updatePanel = (panel) => {
        const [type, id] = panel.id.split(/_(.+)/)
        const setToCheck = type === 'customization' ? expandedCustomizations : expandedLogs
        const viewIsExpanded = panel.classList.contains('in')
        const shouldBeExpanded = setToCheck.has(id)
        if (viewIsExpanded !== shouldBeExpanded) {
            panel.classList[shouldBeExpanded ? 'add' : 'remove']('in')
        }
    }
    panels.forEach(updatePanel)
    updateQueryParams()
}
const toggleLogs = (event, logsOnly = false) => {
    const customizationToToggle = event.currentTarget ? event.currentTarget.dataset.customizationId : event
    const logToToggle = event.currentTarget.dataset.logId
    const expanded = expandedCustomizations.has(customizationToToggle)
    if (customizationToToggle && !logsOnly) {
        expandedCustomizations[ expanded ? 'delete' : 'add'](customizationToToggle)
    }
    if (logToToggle) {
        const expanded = expandedLogs.has(logToToggle)
        if (logsOnly) {
            expandedLogs.delete(logToToggle)
        } else {
            expandedLogs[expanded ? 'delete' : 'add'](logToToggle)
        }
    }
    const childPanels = event.currentTarget.parentNode.querySelectorAll('.panel-heading')
    if (childPanels && expanded) {
        childPanels.forEach(element => toggleLogs({currentTarget: element}, true))
    }
    updateViewState()
}
const expandSelectedCustomization = () => {
    if (!selectedCustomization) return
    const customizationPanel = document.querySelector(`#customization_${selectedCustomization}`)
    const panels = customizationPanel.querySelectorAll('.panel-heading')
    expandedCustomizations.add(selectedCustomization)
    panels.forEach(panel => expandedLogs.add(panel.dataset.logId))
    updateViewState()
}

const logHeaders = document.querySelectorAll('.panel-heading')

const removeClassFrom = element => className => element.classList.contains(className) && loader.classList.remove(className)

const addClassTo = element => className => !element.classList.contains(className) && loader.classList.add(className)

const loader = document.querySelector('.loading-placeholder')

const showLoading = () => ['hide', 'minimized', 'initial-load'].forEach(removeClassFrom(loader))

const minimizeLoading = () => addClassTo(loader)('minimized')

const hideLoading = () => addClassTo(loader)('hide')

const syncMenu = event => {
    event.stopPropagation()
    const menu_id = event.target.dataset.menuId
    const customization = event.target.dataset.customization
    const payload = {menu_id}
    const csrf = document.querySelector('[name="csrfmiddlewaretoken"]').value
    if (customization) {
        payload['customizations'] = [customization]
    }
    fetch(endpoint, {
        method: 'post',
        body: JSON.stringify(payload),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
            "X-CSRFToken": csrf
        }
    }).then(res => res.json()).then(message => {
        alert(message)
        window.location.reload()
        showLoading()
    })
}

const cancelSync = event => {
    event.stopPropagation()
    const log_id = event.target.dataset.logId
    const payload = { log_id }
    const csrf = document.querySelector('[name="csrfmiddlewaretoken"]').value
    fetch(cancelEndpoint, {
        method: 'post',
        body: JSON.stringify(payload),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
            "X-CSRFToken": csrf
        }
    }).then(res => res.json()).then(message => {
        alert(message)
        window.location.reload()
        showLoading()
    })
}

const replaceWithLocalTime = (element) => {
    const date = new Date(Math.round(parseFloat(element.innerText) * 1000 ))
    element.innerText = date.toLocaleString().replace(',','-')
}

logHeaders.forEach(header => header.addEventListener('click', toggleLogs))
expandSelectedCustomization()
updateViewState()

document.querySelector('#minimize').addEventListener('click', minimizeLoading)
document.querySelector('#refresh-button').addEventListener('click', () => window.location.reload())
document.querySelectorAll(".sync-button").forEach(button => button.addEventListener('click', syncMenu))
document.querySelectorAll(".cancel-sync-button").forEach(button => button.addEventListener('click', cancelSync))
document.querySelectorAll(".sync-time").forEach(replaceWithLocalTime)
document.querySelectorAll('.details-hidden').forEach(element => {
    if (element.childElementCount <= 2) {
        element.classList.remove('details-hidden')
    } else {
        element.addEventListener('click', (event) => event.currentTarget.classList.add('un-hide'))
    }
})

window.onload = () => setTimeout(hideLoading, 500)
window.onbeforeunload = showLoading