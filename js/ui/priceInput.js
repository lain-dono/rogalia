export default {
    props: {
        p: {type:Number, default: 0},
        g: {type:Number, default: 0},
        s: {type:Number, default: 0},
    },
    computed: {
        cost: function() {
            return this.p * 10000 + this.g * 100 + this.s
        },
    },
}
