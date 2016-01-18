'use strict'

var util = require('./util.js')

module.exports = function Loader(assetsDir) {
    this.assetsDir = assetsDir;
};

module.exports.prototype = {
    get status() {
        return this._loaded + "/" + this._loading;
    },
    _loaded: 0,
    _loading: 0,
    assetsDir: "/",
    images: {},
    readyCallbacks: [],
    ready: function(callback) {
        this.readyCallbacks.push(callback);
        this.runCallbacks();
    },
    loadImage: function(name) {
        if(name === undefined || name.length === 0) {
            game.sendError("Trying to load undefined or empty image");
            return new Image();
        }

        var image = this.images[name];
        if (image) {
            return image;
        }

        this._loading++;
        image = new Image();
        this.images[name] = image;

        image.alt = name;
        image.addEventListener("load",  this.loaded.bind(this));

        image.onerror = function(e) {
            game.sendError("Cannot load " + name);
            this.loaded();
        }.bind(this);

        image.src = this.assetsDir + name;

        return image;
    },
    loadImages: function(images) {
        for (var name in images) {
            images[name] = this.loadImage(images[name]);
            images[name].name = name;
        }
        return images;
    },
    loaded: function() {
        this._loaded++;
        this.runCallbacks();
    },
    runCallbacks: function() {
        while (this.readyCallbacks.length) {
            if (this._loaded != this._loading)
                return;
            var callback = this.readyCallbacks.shift();
            callback();
        }
    },
    load: function(url, callback) {
        this._loading++;
        util.ajax(url, function(data) {
            callback(JSON.parse(data));
            this.loaded();
        }.bind(this));
    }
};
