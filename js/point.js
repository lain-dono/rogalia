'use strict'

function Point(x, y) {
    switch(arguments.length) {
    case 0:
        this.x = 0;
        this.y = 0;
        break;
    case 1:
        if (x instanceof Object && "x" in x && "y" in x) {
            this.x = x.x;
            this.y = x.y;
        } else if (x instanceof Object && "X" in x && "Y" in x) {
            this.x = x.X;
            this.y = x.Y;
        } else {
            game.error("No x or y in %j", x);
        }
        break;
    case 2:
        this.x = x;
        this.y = y;
        break;
    default:
        game.error("Illegal arguments in point constructor");
    }
}

module.exports = Point

;['fromEvent', 'fromPoint'].forEach(function(method) {
    Point[method] = function(arg) {
        return new Point()[method](arg);
    };
});

Point.prototype = {
    x: 0,
    y: 0,
    equals: function(o) {
        //TODO: fixme
        var e = 1e-6;
        return Math.abs(this.x - o.x) < e && Math.abs(this.y - o.y) < e;
    },
    ceil: function() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    },
    floor: function() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    },
    round: function() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    },
    clone: function() {
        return new Point(this.x, this.y);
    },
    set: function(x, y) {
        this.x = x;
        this.y = y;
        return this;
    },
    toScreen: function() {
        var x = this.x;
        this.x = (x - this.y);
        this.y = (x + this.y) / 2;
        this.round();
        return this;
    },
    toWorld: function() {
        var x = this.x;
        this.x = (this.y + x / 2);
        this.y = (this.y - x / 2);
        return this;
    },
    fromEvent: function(e) {
        this.x = e.pageX;
        this.y = e.pageY;

        return this;
    },
    fromPoint: function(point) {
        this.x = point.x;
        this.y = point.y;
        return this;
    },
    json: function() {
        return {x: this.x, y: this.y};
    },
    toString: function() {
        return "(" + this.x + ", " + this.y + ")";
    },
    sub: function(p) {
        this.x -= p.x;
        this.y -= p.y;
        return this;
    },
    add: function(p) {
        this.x += p.x;
        this.y += p.y;
        return this;
    },
    mul: function(p) {
        if (p instanceof Point) {
            this.x *= p.x;
            this.y *= p.y;
        } else {
            this.x *= p;
            this.y *= p;
        }
        return this;
    },
    div: function(p) {
        if (p instanceof Point) {
            this.x /= p.x;
            this.y /= p.y;
        } else {
            this.x /= p;
            this.y /= p;
        }
        return this;
    },
    length: function() {
        return Math.hypot(this.x, this.y);
    },
    normalize: function() {
        var len = this.length();
        this.x /= len;
        this.y /= len;
        return this;
    },
    rotate: function(angle) {
        var cs = Math.cos(angle);
        var sn = Math.sin(angle);
        var x = this.x * cs - this.y * sn;
        this.y = this.x * sn + this.y * cs;
        this.x = x;
        return this;
    },
    align: function(to) {
        if (to.x !== 0) {
            this.x = to.x * Math.floor((this.x + to.x/2) / to.x);
        }
        if (to.y !== 0) {
            this.y = to.x * Math.floor((this.y + to.y/2) / to.y);
        }
        return this;
    }
}
