if (window.conflicts.length) {
    const fileInput = document.getElementById('id_file')
    fileInput.required = false
}
if (window.menuName) {
    const fileInput = document.getElementById('id_file')
    const importButton = document.getElementById('import')
    const forceInput = document.getElementById('id_force')
    fileInput.required = false
    importButton.disabled = !!window.conflicts.length
    forceInput.addEventListener('input', event => {
        importButton.disabled = !event.target.checked && !fileInput.value && !!window.conflicts.length
    })
    fileInput.addEventListener('input', event => {
        importButton.disabled = !event.target.value && !forceInput.checked && !!window.conflicts.length
    })
}
const conflictWrapper = document.getElementById('conflicts')
if (window.conflicts.length) {
    conflictWrapper.innerHTML = window.conflictsHeader
    const conflictList = document.createElement('ul')
    window.conflicts.forEach(conflict => {
        const conflictItem = document.createElement('li')
        conflictItem.innerHTML = conflict
        conflictList.appendChild(conflictItem)
    })
    conflictWrapper.appendChild(conflictList)
}

const messageList = document.getElementsByClassName('messagelist')[0]
if (messageList) {
    const infoMessages = messageList.getElementsByClassName('info')
    if (infoMessages.length && window.menuName) {
        const checkForWarningsOrSuccessInterval = setInterval(() => {
            const warningMessages = messageList.getElementsByClassName('warning')
            const successMessages = messageList.getElementsByClassName('success')
            if (successMessages.length || warningMessages.length) {
                [...infoMessages].forEach(message => {
                    messageList.removeChild(message)
                })
                clearInterval(checkForWarningsOrSuccessInterval)
            }
        }, 1000)
    } else if (!window.menuName) {
        [...infoMessages].forEach(message => {
            if (!message.classList.contains('hide')) {
                message.classList.add('hide')
            }
        })
    } else {
        [...infoMessages].forEach(message => {
            if (message.classList.contains('hide')) {
                message.classList.remove('hide')
            }
        }) 
    }

}

function updateMessages() {
    const messageList = document.getElementsByClassName('messagelist')[0]
    const infoMessages = [...messageList.getElementsByClassName('info')]
    infoMessages.forEach(message => {
        if (message.classList.contains('hide')) {
            message.classList.remove('hide')
        }
    }) 
}