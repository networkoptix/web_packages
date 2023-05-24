console.log('<----- Content script started running ----->');
let tabId;

chrome.runtime.sendMessage({
    action: "openNewTab"
});

chrome.runtime.sendMessage({
    action: "overrides",
    overrides: localStorage.getItem('ngx-webstorage|configoverrides')
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    switch (request.action) {
        case 'tabId':
            tabId = request.tabId;
            break;
        case 'updateFlag':
            const newFlags = request.flags;
            const currentFlags = JSON.parse(localStorage['ngx-webstorage|configoverrides']);
            const flags = {
                ...currentFlags,
                ...newFlags
            };

            localStorage.setItem('ngx-webstorage|configoverrides', JSON.stringify(flags));
            break;
        case 'getOverrides':
            sendResponse(overrides);
            break;
        case 'reload':
            location.reload();
    }
})