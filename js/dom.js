'use strict'

var dom = module.exports = {
    tag: function(tag, classOrId, cfg) {
        var elem = document.createElement(tag);

        if (classOrId) {
            this.setClassOrId(elem, classOrId);
        }
        if (cfg) {
            if ("text" in cfg)
                elem.textContent = cfg.text;
            if ("onclick" in cfg)
                elem.onclick = cfg.onclick;
            if ("title" in cfg)
                elem.title = cfg.title;
        }

        return elem;
    },
    setClassOrId: function(elem, classOrId) {
        switch (classOrId.charAt(0)) {
        case "#":
            elem.id = classOrId.substring(1);
            break;
        case ".":
            elem.className = classOrId.substring(1);
            break;
        default:
            elem.className = classOrId;
        }
    },
    text: function(text) {
        return document.createTextNode(text);
    },
    div: function(classOrId, cfg) {
        return this.tag("div", classOrId, cfg);
    },
    br: function() {
        return document.createElement("br");
    },
    hr: function() {
        return document.createElement("hr");
    },
    vr: function() {
        return this.div("vr");
    },
    slot: function() {
        return this.div("slot");
    },
    span: function(text, classOrId) {
        return this.tag("span", classOrId, {text: text});
    },
    img: function(src, classOrId) {
        var img = new Image();
        img.src = src;
        this.setClassOrId(img, classOrId);
        return img;
    },
    link: function(url, text) {
        var link = document.createElement("a");
        if (url) {
            link.target = "_blank";
            link.href = url;
        }
        if (text)
            link.textContent = text;
        return link;
    },
    button: function(text, classOrId, onclick) {
        return this.tag("button", classOrId, {text: text, onclick: onclick});
    },
    select: function(options, classOrId) {
        var select = this.tag("select", classOrId);
        options && options.forEach(function(option) {
            select.appendChild(option);
        }); // jshint ignore:line
        return select;
    },
    option: function(text) {
        return this.tag("option", null, {text: text});
    },
    insert: function(element, toElem) {
        toElem = toElem || document.body;
        toElem.insertBefore(element, toElem.firstChild);
    },
    clear: function(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },
    detachContents: function(element) {
        var contents = [];
        while (element.firstChild) {
            contents.push(element.firstChild);
            element.removeChild(element.firstChild);
        }
        return contents;
    },
    make: function(tag, contents) {
        return this.append(this.tag(tag), contents);
    },
    append: function(element, contents) {
        if (!Array.isArray(contents))
            contents = [contents];
        contents.forEach(function(child) {
            if (child) {
                element.appendChild((child instanceof Node) ? child : document.createTextNode(child));
            }
        });
        return element;
    },
    wrap: function(classOrId, elements, cfg) {
        return this.append(dom.div(classOrId, cfg), elements);
    },
    appendText: function(element, text) {
        element.appendChild(document.createTextNode(text));
    },
    input: function(text, value, type, name, textAfterInput) {
        var input = document.createElement("input");
        input.type = type || "text" ;
        if (name)
            input.name = name;
        if (value)
            input.value = value;
        var label = document.createElement("label");
        if (text && !textAfterInput)
            label.appendChild(document.createTextNode(text));

        label.appendChild(input);

        if (text && textAfterInput)
            label.appendChild(document.createTextNode(text));
        input.label = label;

        return input;
    },
    radioButton: function(text, name) {
        return this.input(text, null, "radio", name, true);
    },
    checkbox: function(text, name) {
        return this.input(text, null, "checkbox", name, true);
    },
    iframe: function(src, classOrName) {
        var iframe = dom.tag("iframe", classOrName);
        iframe.src = src;
        return iframe;
    },
    table: function(header, rows) {
        var dom = this;
        return this.make("table", [
            this.make("thead", this.make("tr", header.map(function(title) {
                return dom.make("th", title);
            }))),
            this.make("tbody", rows.map(function(row) {
                return dom.make("tr", row.map(function(cell) {
                    return dom.make("td", cell);
                }));
            }))
        ]);
    },
    /* * * * * */
    remove: function(element) {
        element.parentNode.removeChild(element);
    },
    hide: function(element) {
        if (!element || !element.classList) {
            console.error('fail hide', element)
            return
        }
        element.classList.add("hidden");
    },
    show: function(element) {
        if (!element || !element.classList) {
            console.error('fail show', element)
            return
        }
        element.classList.remove("hidden");
    },
    toggle: function(element) {
        if(element.classList.contains("hidden"))
            this.show(element);
        else
            this.hide(element);
    },
    replace: function(old, New) {
        if (!old.parentNode) {
            console.trace();
            console.error("Cannot replace node");
            return;
        }
        old.parentNode.insertBefore(New, old);
        old.parentNode.removeChild(old);
    },
    setContents: function(element, contents) {
        this.clear(element);
        return this.append(element, contents);
    },
    move: function(element, to) {
        this.remove(element);
        to.appendChild(element);
    },
    /* * * * * */
    forEach: function(selector, callback) {
        [].forEach.call(document.querySelectorAll(selector), function(elem) {
            callback.call(elem);
        });
    },
    addClass: function(selector, name) {
        this.forEach(selector, function() {
            this.classList.add(name);
        });
    },
    removeClass: function(selector, name) {
        this.forEach(selector, function() {
            this.classList.remove(name);
        });
    },
    /* * * * * */
    // dom.tabs([
    //     {
    //         title: T("text"),
    //         icon: new Image(), // *optional
    //         contents: [elem, ...],
    //         update: function(title, contents){}, // *optional
    //         init: function(title, contents){}, // *optional
    //     },
    //         ...
    // ]);
    tabs: function(cfg) {
        var tabs = dom.div("tabs");
        var titles = dom.div("tabs-titles");
        var hr = dom.hr();
        var contents = dom.div("tabs-contents");

        cfg.forEach(function(tab) {
            var title = dom.div("tab-title");
            if (tab.icon) {
                tab.icon.classList.add("tab-icon");
                title.appendChild(tab.icon);
            }
            dom.appendText(title, tab.title);
            titles.appendChild(title);


            var content = dom.div("tab-content");
            if (tab.contents)
                dom.append(content, tab.contents);
            contents.appendChild(content);

            if (tab.update)
                tab.update = tab.update.bind(tabs, title, content);

            title.onclick = function() {
                active.title.classList.remove("active");
                active.content.classList.remove("active");

                title.classList.add("active");
                content.classList.add("active");

                active.title = title;
                active.content = content;

                if (tab.update) {
                    tab.update();
                }
            };

            if (tab.init) {
                tab.init.call(tabs, title, content);
            }

            tab.isActive = function() {
                return title.classList.contains("active");
            };
            tab.tab = {
                title: title,
                content: content,
            };
        });

        tabs.appendChild(titles);
        tabs.appendChild(hr);
        tabs.appendChild(contents);
        tabs.titles = titles;
        tabs.hr = hr;
        tabs.contents = contents;
        tabs.tabs = cfg;

        var active = {
            title: titles.firstChild,
            content: contents.firstChild,
        };

        active.title.classList.add("active");
        active.content.classList.add("active");
        if (cfg[0].update) {
            cfg[0].update.call(tabs, active.title, active.content);
        }

        return tabs;
    }
};
