/*
The checkCookie function starts on a 100ms interval once the user uploads a file.
Once the user submits the file we wait for the structure.json file to be returned.
When the file is sent to the user it also sets a cookie.
The check cookie function keeps checking the cookies until it a changed.
Afterwards it reloads the page so that the user can see any error messages with the file upload
*/
const pollingInterval = 1000
const modal = document.getElementById('preparing-package')
const progressBar = modal.getElementsByClassName('progress-bar')[0]
const contextStatus = document.getElementById('context-status')
var cookieCheckInterval = undefined;
var checkCookie = function () {
    var lastCookie = document.cookie;
    return function () {
        var currentCookie = document.cookie;
        if (currentCookie !== lastCookie) {
            clearInterval(cookieCheckInterval);
            window.location.reload();
        }
    };
}();

function cookieInterval() {
    const messageList = document.getElementsByClassName('messagelist')[0]
    const infoMessages = [...messageList.getElementsByClassName('info')]
    infoMessages.forEach(message => {
        if (message.classList.contains('hide')) {
            message.classList.remove('hide')
        }
    })
    cookieCheckInterval = setInterval(checkCookie, 100);
}

function togglePending(showPending) {
    const pending = document.getElementById('pending')
    const done = document.getElementById('done')
    if (showPending) {
        pending.style = "display:block;"
        done.style = "display:none;"
    } else {
        pending.style = "display:none;"
        done.style = "display:block;"
    }
}

togglePending(true)

function showError(message = 'Some unknown error occurred', title = "Preparing Package") {
    const contextStatus = document.getElementById('context-status')
    const progressWrapper = document.getElementsByClassName('progress-popup')[0]
    document.getElementById('progress-modal-title').innerText = title
    contextStatus.innerText = message
    progressWrapper.style = "display: none;"

}

function pollPackage(isDraft, taskId = null) {
    const package = packageUrl + (isDraft ? '?draft=True' : '')
    let download = downloadUrl + (isDraft ? '?draft=True' : '')
    const generateStatusUrl = (taskId) => celeryStatusUrl.replace('task_id', taskId)
    const progressModalTitle = document.getElementById('progress-modal-title')
    const contextStatus = document.getElementById('context-status')
    const progressWrapper = document.getElementsByClassName('progress-popup')[0]
    progressWrapper.style = "display: block;"
    progressModalTitle.innerText = "Preparing Package"
    contextStatus.innerText = "Processing contexts..."
    if (taskId) {
        download = download.replace('task_id', taskId)
        return fetch(generateStatusUrl(taskId)).then(
            res => res.json()
        ).then(status => {
            if (status.current && status.current < status.total) {
                contextStatus.innerText = `Processing context ${status.current} out of ${status.total}`
                progressBar.style = `width: ${Math.round(status.current / status.total * 100)}%;`
                setTimeout(() => pollPackage(isDraft, taskId), pollingInterval)
            } else if (status === 'SUCCESS') {
                togglePending(false)
                const downloadButton = document.getElementById('download-button')
                const successMessage = document.getElementById('success-message')
                downloadButton.href = download
                downloadButton.innerText = "Download Package"
                successMessage.innerText = `The package is ready and should have automatically downloaded. If the package didn't download automatically use the "Download Package" link below.`
            } else {
                showError()
            }
        }).catch(_ => {
            showError()
        })
    }
    fetch(package).then(
        res => res.text()
    ).then((response_content) => {

        try {
            const { is_ready: isReady, task_id: taskId } = JSON.parse(response_content)
            if (isReady) {
                window.open(download.replace('task_id', taskId))
            } else {
                if (!modal.classList.contains('show')) {
                    modal.classList.add('show')
                    togglePending(true)
                }
                setTimeout(() => pollPackage(isDraft, taskId), pollingInterval)
            }
        } catch (_) {
            if (!modal.classList.contains('show')) {
                modal.classList.add('show')
            }
            showError(response_content, "Error generating package")
        }
    })
}

(function checkTaskStatus(taskId) {
    if (!taskId) return;
    const messageList = document.getElementsByClassName('messagelist')[0]
    const spinner = '<span class="glyphicon glyphicon-repeat status-loader" id="status-glpyh"></span>'
    let asyncStatusInfo = document.getElementById('async-status-info')
    if (!asyncStatusInfo) {
        asyncStatusInfo = document.createElement('li')
        asyncStatusInfo.classList.add('info')
        asyncStatusInfo.id = 'async-status-info'
        asyncStatusInfo.innerHTML = spinner + '<span id="status-span">Processing assets...</span>'
        messageList.appendChild(asyncStatusInfo)
    }

    const generateStatusUrl = (taskId) => celeryStatusUrl.replace('task_id', taskId)
    return fetch(generateStatusUrl(taskId)).then(
        res => res.json()
    ).then(status => {
        let state = 'Processing assets...'
        if (status.current && status.current < status.total) {
            state = `Processing asset ${status.current} out of ${status.total}`
            setTimeout(() => checkTaskStatus(taskId), pollingInterval * 3)
        } else if (status === 'SUCCESS') {
            const glyphSpan = document.getElementById('status-glpyh')
            glyphSpan.classList.remove('glyphicon-repeat', 'status-loader')
            glyphSpan.classList.add('glyphicon-ok-sign')
            state = 'Done processing assets'
        } else if (status === 'PENDING') {
            state = 'Processing assets...'
            setTimeout(() => checkTaskStatus(taskId), pollingInterval * 5)
        } else {
            alert('Some unknown error occurred')
        }
        const statusSpan = document.getElementById('status-span')
        statusSpan.innerText = state
    })
})(taskId)

function closeModal() {
    modal.classList.remove('show')
}


if (fileName) {
    const fileInput = document.getElementById('id_file')
    const uploadButton = document.getElementById('upload')
    const forceInput = document.getElementById('id_force')
    fileInput.required = false
    uploadButton.disabled = true
    forceInput.addEventListener('input', event => {
        uploadButton.disabled = !event.target.checked && !fileInput.value
    })
    fileInput.addEventListener('input', event => {
        uploadButton.disabled = !event.target.value && !forceInput.checked
    })
}
