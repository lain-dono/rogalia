export default {
    template: require('raw!./price.html'),
    props: {
        cost: Number,
        editable: {type: Boolean, default: false},
    },
    computed: {
        negative() { return this.cost < 0 },
        s: {
            get() { return Math.abs(this.cost) % 100 },
            set(val) {
                this.cost -= this.s
                this.cost += Math.abs(val) % 100
            },
        },
        g: {
            get() {
                var a = Math.abs(this.cost)
                return (a % 10000 - a % 100) / 100
            },
            set(val) {
                this.cost -= this.g * 100
                this.cost += Math.abs(val) % 100 * 100
            },
        },
        p: {
            get() {
                var a = Math.abs(this.cost)
                return ((a - a % 10000 - a % 100) / 10000) | 0
            },
            set(val, old) {
                this.cost -= this.p * 100 * 100
                this.cost += Math.abs(val) * 100 * 100
            },
        },
    },
}
