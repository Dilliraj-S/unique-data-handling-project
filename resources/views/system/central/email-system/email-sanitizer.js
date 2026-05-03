// Robust HTML sanitizer and helpers for engage.blade.php
// Uses DOMPurify if available, otherwise falls back to a strict manual sanitizer

function robustSanitizeHtml(html, containerSelector = null) {
    if (!html || typeof html !== 'string') return '<p>No content available</p>';
    // Use DOMPurify if available
    if (typeof DOMPurify !== 'undefined') {
        let config = {
            ALLOWED_TAGS: [
                'a','b','i','u','em','strong','p','div','span','br','ul','ol','li','blockquote','pre','code',
                'img','table','thead','tbody','tr','th','td','hr','h1','h2','h3','h4','h5','h6','font','sup','sub'
            ],
            ALLOWED_ATTR: ['href','src','alt','title','style','class','width','height','align','target','rel'],
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+\.\-]+(?:[^a-z+\.\-:]|$))/i,
            FORBID_TAGS: ['script','iframe','object','embed','form','input','button','textarea','select','option','link','meta'],
            FORBID_ATTR: ['onerror','onload','onclick','onmouseover','onfocus','onblur','onchange','onsubmit','onreset','onselect','onabort','onbeforeunload','onhashchange','oninput','oninvalid','onsearch','onselectstart','onwheel','onmouseenter','onmouseleave','onmousemove','onmouseout','onmouseover','onmouseup','onmousedown','onkeydown','onkeypress','onkeyup','ondblclick','ondrag','ondragend','ondragenter','ondragleave','ondragover','ondragstart','ondrop','onmousewheel','onpaste','oncopy','oncut','oncontextmenu','onresize','onscroll','onunload','onloadstart','onloadend','onprogress','onratechange','onseeked','onseeking','onstalled','onsuspend','ontimeupdate','onvolumechange','onwaiting','onplay','onplaying','onpause','oncanplay','oncanplaythrough','oncuechange','ondurationchange','onemptied','onended','onerror','onloadeddata','onloadedmetadata','onloadstart','onpause','onplay','onplaying','onprogress','onratechange','onseeked','onseeking','onstalled','onsuspend','ontimeupdate','onvolumechange','onwaiting','onwheel','onauxclick','ongotpointercapture','onlostpointercapture','onpointercancel','onpointerdown','onpointerenter','onpointerleave','onpointermove','onpointerout','onpointerover','onpointerup'],
            KEEP_CONTENT: false
        };
        // Remove <style> tags or scope them
        html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, function(styleTag) {
            if (containerSelector) {
                // Scope all selectors to the container
                return styleTag.replace(/([^{}/]+){/g, function(match, selector) {
                    selector = selector.trim();
                    if (!selector) return match;
                    // Prefix each selector with containerSelector
                    return containerSelector + ' ' + selector + ' {';
                });
            } else {
                // Remove style tags if not scoping
                return '';
            }
        });
        return DOMPurify.sanitize(html, config);
    } else {
        // Fallback: strict manual sanitizer
        let div = document.createElement('div');
        div.innerHTML = html;
        // Remove script, iframe, object, embed, style, form, input, button, textarea, select, option, link, meta
        let forbidden = div.querySelectorAll('script,iframe,object,embed,style,form,input,button,textarea,select,option,link,meta');
        forbidden.forEach(el => el.remove());
        // Remove event handler attributes
        let all = div.querySelectorAll('*');
        all.forEach(el => {
            [].slice.call(el.attributes).forEach(attr => {
                if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
                if (attr.name === 'style') el.removeAttribute('style'); // Remove inline style for safety
            });
        });
        return div.innerHTML;
    }
}

// Detect if a string is HTML or plain text
function isHtmlString(str) {
    if (!str || typeof str !== 'string') return false;
    // If it contains any HTML tag
    return /<[a-z][\s\S]*>/i.test(str.trim());
}

// Convert plain text to HTML (preserve line breaks)
function plainTextToHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/\n/g, '<br>');
}

// Export for use in engage.blade.php
window.robustSanitizeHtml = robustSanitizeHtml;
window.isHtmlString = isHtmlString;
window.plainTextToHtml = plainTextToHtml;
