console.log('<----- Extension script started running ----->');
let tabId;
let url;
let overrides;

(function connect() {
    chrome.runtime.connect({
        name: 'keepAlive'
    }).onDisconnect.addListener(connect);
})();

document.addEventListener('DOMContentLoaded', documentEvents, false);

function documentEvents() {
    console.log("DOM is ready");

    chrome.runtime.sendMessage({
        action: 'sendpopup'
    }, function(response) {
        url = response.url;
        tabId = response.id;
    })

    chrome.runtime.sendMessage({
        action: 'getOverrides'
    }, function(response) {
        overrides = response.overrides;
    })

    document.getElementById('reload').addEventListener('click', reload);
    document.getElementById('update').addEventListener('click', update);

    setTimeout(() => {
        setTabs();
        showVersionInfo();
        showInfo();
    }, 500);

}

function reload() {
    chrome.runtime.sendMessage({
        action: 'reload'
    });
}

function setTabs() {
    const tabButtons = document.querySelectorAll('.tab');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            button.classList.add('active');

            const tabId = button.dataset.tabId;
            const tabContent = document.getElementById(tabId);
            const allTabContents = document.querySelectorAll('.tab-content');
            allTabContents.forEach(content => {
                content.classList.remove('active');
            });

            tabContent.classList.add('active');
        });
    });
}

function showVersionInfo() {
    fetch(`https://${url}/static/version.txt`).then((res) => {
            if (res.ok) {
                return res.text();
            }
            throw new Error('Something went wrong');
        }).then((data) => {
            if (data) {
                const wordsToSplit = ['Author:', 'Date:', 'Branch:'];
                const regex = new RegExp(wordsToSplit.join('|'), 'gi');
                const separated = data.split(regex);
                const datePattern = /\+\d{4}/;

                const lineOne = separated[0];
                const lineTwo = separated[1];
                const dateAndMsg = separated[2].split(datePattern);
                const lineThree = dateAndMsg[0];
                const lineFive = dateAndMsg[1];
                const lineFour = separated[3];

                let commit = document.getElementById('commit-hash');
                commit.innerHTML = lineOne;

                let author = document.getElementById('author');
                author.innerHTML = `Author: ${lineTwo}`;

                let dateInfo = document.getElementById('date');
                dateInfo.innerHTML = `Date: ${lineThree}`;

                let branch = document.getElementById('branch');
                branch.innerHTML = `Branch: ${lineFour}`;

                let msg = document.getElementById('msg');
                msg.innerHTML = `${lineFive}`;
            }
        })
        .catch((error) => {
            console.log(error);
            let noInfo = document.getElementById(('no-info'));
            noInfo.innerHTML = 'No version info available.'
        })
}

function showInfo() {
    let apiCall = new XMLHttpRequest();
    apiCall.open("GET", `https://${url}/api/utils/settings`);
    apiCall.send();
    apiCall.onload = () => {
        if (apiCall.status !== 200) {
            console.log(`Error ${apiCall.status}: ${apiCall.statusText}`);
        } else {

        const response = JSON.parse(apiCall.response);
        const featureFlags = response.featureFlags;
        const relayHost = response.trafficRelayHost

        for (const prop in overrides) {
            if (featureFlags.hasOwnProperty(prop)) {
                delete featureFlags[prop];
            }
        }

        let host = document.getElementById('relay-host');
        host.innerHTML = relayHost;
        host.classList.add('host');

        const featureFlagsContainer = document.getElementById('featureFlags');
        const configContainer = document.getElementById('configOverrides');

        for (const property in featureFlags) {
            const div = document.createElement('div');
            div.classList.add('checkbox-container');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = property;
            checkbox.checked = featureFlags[property] === true ? true : false;
            checkbox.addEventListener('change', handleCheckboxChange);

            const label = document.createElement('label');
            label.textContent = property;

            div.appendChild(checkbox);
            div.appendChild(label);
            div.appendChild(document.createElement('br'));
            featureFlagsContainer.appendChild(div);
        }

        for (const property in overrides) {
            const div = document.createElement('div');
            div.classList.add('checkbox-container');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = property;
            checkbox.checked = overrides[property] === true ? true : false;
            checkbox.addEventListener('change', handleCheckboxChange);

            const label = document.createElement('label');
            label.textContent = property;

            div.appendChild(checkbox);
            div.appendChild(label);
            div.appendChild(document.createElement('br'));
            configContainer.appendChild(div);
        }
    }
}
}

function handleCheckboxChange(event) {
    const checkbox = event.target;
    checkbox.classList.add('changed');
}

function update() {
    const changed = document.getElementsByClassName('changed');
    const flags = {};

    for (let i = 0; i < changed.length; i++) {
        flags[`featureFlags.${changed[i].value}`] = changed[i].checked;
    }

    chrome.runtime.sendMessage({
        action: 'updateFlag',
        flags: flags
    });

    document.getElementById('reload').disabled = false;
}