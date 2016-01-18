'use strict'

function HashTable(data) {
    this.hash = {};
    this.array = [];
    if (data) {
        for (var key in data) {
            this.set(key, data[key]);
        }
    }
}

module.exports = HashTable

HashTable.prototype = {
    hash: null,
    array: null,
    get length() {
        return this.array.length;
    },
    has: function(key) {
        return this.get(key) !== undefined;
    },
    get: function(key) {
        return this.hash[key];
    },
    set: function(key, value) {
        this.remove(key);
        this.hash[key] = value;
        this.array.push(value);
    },
    remove: function(key) {
        var old = this.hash[key];
        if (old) {
            var i = this.array.findIndex(function(item) {
                return item === old;
            });
            this.array.splice(i, 1);
        }
        delete this.hash[key];

    },
    forEach: function(callback) {
        this.array.forEach(callback);
    },
    every: function(predicate) {
        return this.array.every(predicate);
    },
    some: function(predicate) {
        return this.array.some(predicate);
    },
    filter: function(predicate) {
        return this.array.filter(predicate);
    },
    map: function(predicate) {
        return this.array.map(predicate);
    },
};
