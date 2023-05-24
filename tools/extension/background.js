console.log('<----- Background script started running ----->');

const onUpdate = (tabId, info, tab) => /https?:/.test(info.url) && findTab([tab]);

let tabId;
let overrides;
let url;
findTab();

chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'keepAlive') {
        setTimeout(() => port.disconnect(), 250e3);
        port.onDisconnect.addListener(() => findTab());
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    switch (message.action) {
        case 'openNewTab':
            chrome.tabs.query({
                currentWindow: true,
                active: true
            }, function(tabs) {
                const rootUrlPattern = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/g;
                const match = rootUrlPattern.exec(tabs[0].url);
                const rootUrl = match ? match[1] : null;
                url = rootUrl;

                chrome.tabs.sendMessage(tabs[0].id, {
                    tabId: tabs[0].id,
                    action: 'tabId'
                });
            });
            break;
        case 'sendpopup':
            sendResponse({
                action: "tabId",
                id: tabId,
                url: url
            });
            break;
        case 'updateFlag':
            chrome.tabs.query({
                currentWindow: true,
                active: true
            }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateFlag',
                    flags: message.flags
                });
            });
            break;
        case 'overrides':
            const regex = /^featureFlags\./;
            const configOverrides = JSON.parse(message.overrides);

            for (const key in configOverrides) {
                const result = key.replace(regex, "");
                const value = configOverrides[key] === true ? true : false;

                configOverrides[result] = value;
                delete configOverrides[key];
            }

            overrides = configOverrides;
            break;
        case 'getOverrides':
            sendResponse({
                action: "overrides",
                overrides: overrides
            });
            break;
        case 'reload':
             chrome.tabs.query({
             currentWindow: true,
             active: true
            }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'reload'
                });
            });
    }
});

async function findTab(tabs) {
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function(tabs) {
        tabId = tabs[0].id;
    });
    if (chrome.runtime.lastError) {
        console.log('last error');
        for (const {
                id: tabId
            }
            of tabs || await chrome.tabs.query({
                url: ':///'
            })) {
            try {
                await chrome.scripting.executeScript({
                    target: {
                        tabId
                    },
                    func: connect
                });
                chrome.tabs.onUpdated.removeListener(onUpdate);
                return;
            } catch (e) {}
        }
        chrome.tabs.onUpdated.addListener(onUpdate);
    }
}

function connect() {
    console.log('connect');
    chrome.runtime.connect({
        name: 'keepAlive'
    }).onDisconnect.addListener(connect);
}