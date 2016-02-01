var util = require('../util.js')

export default {
    template: require('raw!./param.html'),
    props: {
        icon: String,
        current: Number,
        max: Number,
        digits: {type: Number, default: 0},
    },
    filters: {
        toFixed(val, digits) {
            return util.toFixed(val, digits | 0)
        },
    },
    methods: {
        formatParam() {
            var current = '0'
            if (this.current !== 0) {
                current = util.toFixed(this.current, this.digits | 0)
            }
            var max = util.toFixed(this.max, 0)
            return current + ' / ' + max
        },
    },
}
