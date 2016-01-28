'use strict'

require('./tabs.styl')

module.exports.tabs = {
    template: require('raw!./tabs.html'),
    data: function() {
        return {
            tabs: [],
            current: '',
        }
    },
    methods: {
        addTab: function(id, title) {
            this.tabs.push({ id: id, title: title, active: false })
            if(this.current === '') {
                this.current = id
            }
        },
    },
    created: function() {
        this.$watch('current', function() {
            this.$broadcast('test', this.current)
        })
    },
}

module.exports.tab = {
    props: ['id', 'title'],
    data: function() {
        return {
            active: false
        }
    },
    template: '<div class="tab"><slot v-if="active"></slot></div>',
    ready: function() {
        this.$parent.addTab(this.id, this.title)
    },
    events: {
        test: function(id) {
            this.active = this.id === id
            if(this.active) {
                this.$dispatch('activate.tab', id)
            }
        },
    },
}
