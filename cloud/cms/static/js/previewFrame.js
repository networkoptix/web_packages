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
    });
});
