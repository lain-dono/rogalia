export function Point(x, y) {
    this.x = x || 0
    this.y = y || 0
    switch(arguments.length) {
    case 0: break
    case 2: break
    case 1:
        if (x instanceof Object && 'x' in x && 'y' in x) {
            this.x = x.x
            this.y = x.y
        } else if (x instanceof Object && 'X' in x && 'Y' in x) {
            this.x = x.X
            this.y = x.Y
        } else {
            console.error('No x or y in %j', x)
        }
        break
    default:
        console.error('Illegal arguments in point constructor')
    }
}

//export function fromEvent(e) {
    //return new Point().fromEvent(e)
//}

//export function fromPoint(p) {
    //return new Point(p.x, p.y)
//}

// XXX speed hack
var abs = Math.abs
var floor = Math.floor
var ceil = Math.ceil
var round = Math.round
var sin = Math.sin
var cos = Math.cos
var hypot = Math.hypot

export function toWorld(p) {
    var x = p.x
    p.x = p.y + x / 2
    p.y = p.y - x / 2
    return p
}
export function toScreen(p) {
    var x = p.x
    p.x = (x - p.y)
    p.y = (x + p.y) / 2
    p.x = round(p.x)
    p.y = round(p.y)
    return p
}

// FIXME
var bias = 1e-6
Point.prototype.equals = function(o) {
    return abs(this.x - o.x) < bias && abs(this.y - o.y) < bias
}

Point.prototype.ceil = function() {
    this.x = ceil(this.x)
    this.y = ceil(this.y)
    return this
}
Point.prototype.floor = function() {
    this.x = floor(this.x)
    this.y = floor(this.y)
    return this
}
Point.prototype.round = function() {
    this.x = round(this.x)
    this.y = round(this.y)
    return this
}
Point.prototype.clone = function() {
    return new Point(this.x, this.y)
}
Point.prototype.set = function(x, y) {
    this.x = x
    this.y = y
    return this
}

Point.prototype.toScreen = function() {
    return toScreen(this)
}
Point.prototype.toWorld = function() {
    return toWorld(this)
}

//Point.prototype.fromEvent = function(e) {
    //this.x = e.pageX
    //this.y = e.pageY
    //return this
//}
//Point.prototype.fromPoint = function(point) {
    //this.x = point.x
    //this.y = point.y
    //return this
//}

Point.prototype.json = function() {
    return {x: this.x, y: this.y}
}
Point.prototype.toString = function() {
    return '(' + this.x + ', ' + this.y + ')'
}
Point.prototype.sub = function(p) {
    this.x -= p.x
    this.y -= p.y
    return this
}
Point.prototype.add = function(p) {
    this.x += p.x
    this.y += p.y
    return this
}
Point.prototype.mul = function(v) {
    this.x *= v
    this.y *= v
    return this
}
Point.prototype.mulPoint = function(p) {
    this.x *= p.x
    this.y *= p.y
    return this
}
Point.prototype.div = function(v) {
    this.x /= v
    this.y /= v
    return this
}
Point.prototype.divPoint = function(p) {
    this.x /= p.x
    this.y /= p.y
    return this
}
Point.prototype.length = function() {
    return hypot(this.x, this.y)
}
Point.prototype.normalize = function() {
    var len = this.length()
    this.x /= len
    this.y /= len
    return this
}
Point.prototype.rotate = function(angle) {
    var cs = cos(angle)
    var sn = sin(angle)
    var x = this.x * cs - this.y * sn
    this.y = this.x * sn + this.y * cs
    this.x = x
    return this
}
Point.prototype.align = function(to) {
    if (to.x !== 0) {
        this.x = to.x * floor((this.x + to.x/2) / to.x)
    }
    if (to.y !== 0) {
        this.y = to.x * floor((this.y + to.y/2) / to.y)
    }
    return this
}
