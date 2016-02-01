export var tabs = {
    template: require('raw!./tabs.html'),
    data() {
        return {
            tabs: [],
            current: '',
        }
    },
    methods: {
        addTab(id, title) {
            this.tabs.push({ id: id, title: title, active: false })
            if(this.current === '') {
                this.current = id
            }
        },
    },
    created() {
        this.$watch('current', function() {
            this.$broadcast('test', this.current)
        })
    },
}

export var tab = {
    props: ['id', 'title'],
    template: '<div class="tab"><slot v-if="active"></slot></div>',
    data() {
        return {
            active: false
        }
    },
    ready() {
        this.$parent.addTab(this.id, this.title)
    },
    events: {
        test(id) {
            this.active = this.id === id
            if(this.active) {
                this.$dispatch('activate.tab', id)
            }
        },
    },
}
