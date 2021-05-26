const cleanSrc = (url) => {
    const srcPath = (url.split('//')[1] || url).split('/')
    srcPath[0] = ''
    const src = srcPath.join('/')
    return src.split('?')[0];
}

$(document).ready(function() {
    setTimeout(function() {
        let iframes = document.getElementsByTagName('IFRAME');
        for (let frame of iframes) {
            frame.contentWindow.document.addEventListener("click", function (e) {
                if (e.target.tagName === 'A') {
                    e.preventDefault();
                    window.open(e.target.getAttribute('href'));
                }
            });
        }

        if (previewUrlList) {
            const previewFrame = document.getElementsByClassName('previewFrame')[0] || document.getElementById('content-preview')
            const customPreviewFromQueryParam = new URLSearchParams(window.location.search).get('customPreview')
            if (customPreviewFromQueryParam) {
                previewFrame.src = customPreviewFromQueryParam
            }
            const previewWrapper = previewFrame.parentNode
            const src = cleanSrc(previewFrame.src)
            const previewLabel = document.createElement('label')
            previewLabel.id = 'preview-select-label'
            previewLabel.innerText = 'Select Preview'
            const previewSelect = document.createElement('select')
            previewSelect.id = 'preview-select-menu'
            previewUrlList.forEach(([name, url], index) => {
                const option = document.createElement('option')
                option.value = url
                option.innerText = name
                if (cleanSrc(url) === src) {
                    option.selected = true
                }
                previewSelect.appendChild(option)
            })

            previewWrapper.prepend(previewLabel, previewSelect)
            previewSelect.addEventListener('change', ({ target: { selectedIndex }}) => {
                const customPreviewInput = document.getElementById('customPreviewInput')
                const previousPreview = previewFrame.src
                const nextPreview = previewUrlList[selectedIndex][1] + '&adminPreview=true'
                previewFrame.src = nextPreview
                if (customPreviewInput) {
                    customPreviewInput.value = nextPreview
                }
                const searchParams = new URLSearchParams(window.location.search)
                searchParams.set('customPreview', cleanSrc(nextPreview))
                const updatedUrl = window.location.pathname + '?' + decodeURIComponent(searchParams.toString())
                history.pushState(null, '', updatedUrl)

            })
        }
    });
});
