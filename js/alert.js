'use strict'

var dom = require('./dom.js')
var Panel = require('./panel.js')

module.exports = function Alert() {
    var overlay = dom.div("alert-overlay");
    dom.insert(overlay);
    dom.hide(overlay);

    var panel = new Panel("alert");
    panel.temporary = true;
    dom.move(panel.element, overlay);

    panel.hooks.show = function() {
        dom.show(overlay);
        ok.focus();
    };
    var nop = function(){};
    var callback = nop;
    panel.hooks.hide = function() {
        dom.hide(overlay);
        callback();
        callback = nop;
    };

    var ok = dom.button(T("Ok"));
    ok.onclick = panel.hide.bind(panel);

    return function(message, onclose) {
        var msg = dom.div();
        msg.textContent = T(message);
        panel.setContents([msg, ok,]);
        panel.show();
        panel.center();
        if (onclose)
            callback = onclose;
    };
}
