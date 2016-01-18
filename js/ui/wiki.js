'use strict'

var Panel = require('../panel.js')

module.exports = function Wiki() {
    var iframe = document.createElement("iframe");
    iframe.resize = true;
    this.panel = new Panel("wiki", "Wiki", [iframe]);
    this.panel.hooks.show = function() {
        iframe.src = "http://rogalia.ru/wiki/";
        this.panel.hooks.show = null;
    }.bind(this);
}
