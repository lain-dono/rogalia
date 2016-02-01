export default {
    template: require('raw!./price.html'),
    props: {
        cost: Number,
    },
    computed: {
        negative() { return this.cost < 0 },
        s() { return Math.abs(this.cost) % 100 },
        g() {
            var cost = (Math.abs(this.cost) - this.s) / 100
            return cost % 100
        },
        p() {
            var cost = (Math.abs(this.cost) - this.s) / 100
            cost = (cost - this.g) / 100
            return cost % 100
        },
    },
}
