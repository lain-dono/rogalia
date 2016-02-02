import {forEach, every, some, filter, map} from 'fast.js'

export default function HashTable(data) {
    this.hash = {}
    this.array = []
    if (data) {
        for (var key in data) {
            this.set(key, data[key])
        }
    }
}

HashTable.prototype = {
    get length() { return this.array.length },
    has(key) { return this.hash[key] !== undefined },
    get(key) { return this.hash[key] },
    set(key, value) {
        this.remove(key)
        this.hash[key] = value
        this.array.push(value)
    },
    remove(key) {
        var old = this.hash[key]
        if (old) {
            var array = this.array
            for (var i = 0, l = array.length; i < l; i++) {
                if(array[i] === old) {
                    array.splice(i, 1)
                    break
                }
            }
        }
        delete this.hash[key]
    },
    forEach(fn) { return forEach(this.array, fn) },
    every(fn)   { return every(this.array, fn) },
    some(fn)    { return some(this.array, fn) },
    filter(fn)  { return filter(this.array, fn) },
    map(fn)     { return map(this.array, fn) },
}
