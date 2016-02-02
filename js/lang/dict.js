var Vue = require('vue')

var dict = require('./ru/dict.js')
var util = require('../util.js')
var Entity = require('../entity.js')
var Panel = require('../panel.js')

function isString(s) {
    return (typeof s === "string" || s instanceof String);
}


// see also menu.js
function symbolToString(string) {
    return util.ucfirst(string.split("-").join(" "));
    // return this.ucfirst([].map.call(string, function(c, i) {
    //     if (i != 0) {
    //         var l = c.toLowerCase();
    //         if (c != l)
    //             return " " + l;
    //     }
    //     if (c == "-")
    //         return " ";
    //     return c;
    // }).join(""));
}

dict.init = function() {
    // TT translates text with substitutions
    // for client:
    // example 1: TT("Unlocks {lvl} lvl of the {skill} skill", {lvl: next.Name, skill: name});
    // for server:
    // example 2: TT("You need {need=Stoneworking} skill to craft {craft=Stone axe});
    window.TT = function(text, args) {
        if (!text)
            return "";
        args = args || {};
        var substs = {};
        text = text.replace(/{(.*?)(?:=(.*?))?}/g, function(_, name, value) {
            if (name in args)
                value = args[name];
            substs[name] = T(value);
            return "{" + name + "}";
        });
        text = T(text);

        if (text instanceof Function)
            return text(args);

        return text.replace(/{(.*?)}/g, function(_, name) {
            if (name in substs)
                return substs[name];

            var list = name.split(" ");
            var atom = list.shift();
            var index = args[atom] || 0;
            return list[index];
        });
    };
    window.TS = function(text) {
        return T(text, true);
    };

    if (game.lang != "ru") {
        dict.update = function(){};
        window.T = function(text) {
            return text;
        };

        return;
    }
    window.T = function(text, symbol) {
        if (!isString(text)) {
            return text;
        }
        if (symbol) {
            text = symbolToString(text);
        }
        var t = dict[text];
        if (t)
            return t;
        t = dict[util.ucfirst(text)];
        if (t)
            return util.lcfirst(t);
        return text;
    };

    Vue.filter('T', T)
    Vue.filter('TT', TT)
    Vue.filter('TS', TS)

    dict.update = function(elem) {
        function update(elem) {
            if (elem.nodeType == 3) {
                var text = elem.textContent;
                elem.textContent = T(text);
            } else if (elem.childNodes.length) {
                [].forEach.call(elem.childNodes, update);
            }
        }
        update(elem || document.body);
    };

    dict.update();
};

dict.getTranslations = function() {
    for (var type in Entity.templates) {
        var entity = Entity.templates[type];

        var title = entity.title.replace(/\[.*$/, "");
        if (!dict[title])
            dict[title] = "";

        for (var action in entity.getActions()) {
            action = symbolToString(action);
            if (action in dict)
                continue;
            dict[action] = "";
        }
    }
    for (type in Entity.recipes) {
        var recipe = Entity.recipes[type];
        for (var kind in recipe.Ingredients) {
            kind = symbolToString(kind);
            if (!dict[kind])
                dict[kind] = "";
        }
    }
    var textarea = document.createElement("textarea");
    textarea.value = JSON.stringify(dict);
    var panel = new Panel("Translations", "translations", [textarea]);
    panel.show();
};
