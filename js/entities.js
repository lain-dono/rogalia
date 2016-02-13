var Entity = require('./entity.js')

import {forEach, map} from 'fast.js'

Entity.MT_PORTABLE = 0;
Entity.MT_LIFTABLE = 1;
Entity.MT_STATIC = 2;

Entity.LOCATION_ON_GROUND = 0;
Entity.LOCATION_IN_CONTAINER = 1;
Entity.LOCATION_EQUIPPED = 2;
Entity.LOCATION_BURDEN = 3;
Entity.LOCATION_VENDOR = 4;


Entity.templates = {};

Entity.init = function(data) {
    data.forEach(function(props) {
        var e = new Entity();
        e.sync(props);
        Entity.templates[e.Type] = e;
    });
};

Entity.get = function(id) {
    return game.entities.get(parseInt(id));
}; // jshint ignore:line
Entity.exists = function(id) {
    return !!Entity.get(id);
};

Entity.getPreview = function(group) {
    var image = new Image();
    for (var type in Entity.templates) {
        var template = Entity.templates[type];
        if (Entity.prototype.is.call(template, group)) {
            image = template.icon();
            break;
        }
    }
    image.className = "item-preview";
    return image;
};

Entity.find = function(pattern) {
    var regex = new RegExp(pattern);
    return game.entities.filter(function(e) {
        return regex.test(e.Type);
    });
};

Entity.wipe = function(pattern) {
    var queue = Entity.find(pattern);
    var interval = setInterval(function() {
        if (queue.length > 0) {
            queue.pop().destroy();
        } else {
            clearInterval(interval);
        }
    }, 500);
};

Entity.books = {
    $intro: "Именем Императора и Его Синода",
};
