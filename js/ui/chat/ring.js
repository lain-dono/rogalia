'use strict'

module.exports = function ChatRing() {
    this.ring =  [];
    this.current =  this.ring.length;
    this.backup = "";

    this.last = function() {
        if (this.ring.length === 0)
            return null;
        return this.ring[this.ring.length-1];
    };

    this.prev = function() {
        this.current = Math.max(0, this.current-1);
        if (this.ring.length === 0)
            return this.backup;

        return this.ring[this.current];
    };

    this.next = function() {
        this.current = Math.min(this.ring.length, this.current+1);
        if (this.current == this.ring.length)
            return this.backup;

        return this.ring[this.current];
    };

    this.save = function(message) {
        if (this.current >= this.ring.length)
            this.backup = message;
    };

    this.push = function(message) {
        if (this.last() == message)
            return;

        this.ring.push(message);
        this.current = this.ring.length;
    };

    this.loadFromStorage = function() {
        var saved = JSON.parse(localStorage.getItem("chat.ring"));
        this.ring = saved || [];
        this.current = this.ring.length;
    };

    this.saveToStorage = function() {
        localStorage["chat.ring"] = JSON.stringify(this.ring);
    };
}
