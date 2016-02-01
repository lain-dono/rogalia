var dragIgnoreTags = ['INPUT', 'TEXTAREA', 'BUTTON', 'CODE']
var dragIgnoreClass = 'no-drag'

var pad = 20
var lsKeyPrefix = 'panels.'

var zIndex = 100
var topPanel = null
var stack = []

export default {
    // TODO
    //  getTopExcept: function(except) {
    //      for (var i = stack.length-1; i >= 0; i--) {
    //          var panel = stack[i];
    //          if (panel.visible && panel.container && panel.container.id != except && panel.container.hasSpace())
    //              return panel.container;
    //      }
    //      return null;
    //  },

    template: require('raw!./panel.html'),
    props: {
        name: String,
        title: String,
        hasCloseButton:  { type: Boolean, default: true, },
        hasTitleBar:     { type: Boolean, default: true, },
        temporary:       { type: Boolean, default: false, },
        visible:         { type: Boolean, default: true, },
        zIndex:          { type: Number,  default: 1, },
        isTop:           { type: Boolean, default: false, },
    },
    computed: {
        x: {
            get()  { return this.$el.offsetLeft },
            set(x) { this.$el.style.left = x + 'px' },
        },
        y: {
            get()  { return this.$el.offsetTop },
            set(y) { this.$el.style.top = y + 'px' },
        },
        width: {
            get() { return parseInt(getComputedStyle(this.$el).width) },
            set(w) {
                this.$el.style.width = w + pad + 'px'
                this.$el.style.maxWidth = w + pad + 'px'
            },
        },
        height() {
            return parseInt(getComputedStyle(this.$el).height)
        },
    },
    methods: {
        toggle() {
            this.visible = !this.visible
        },
        toTop() {
            if (topPanel && topPanel != this) {
                topPanel.isTop = false
            }

            topPanel = this
            this.zIndex = ++zIndex
            this.isTop = true

            var index = stack.indexOf(this)
            if (index != -1) {
                stack.splice(index, 1)
            }
            stack.push(this)
        },
        popTop() {
            if (this.$button) {
                this.$button.classList.remove('active')
            }
            var next = stack.pop()
            if (next) {
                topPanel = next
            }
        },
        center() {
            this.x = window.innerWidth/2 - this.$el.offsetWidth/2
            this.y = window.innerHeight/2 - this.$el.offsetHeight/2
        },
        updateVisibility() {
            if (!this.visible || !this.$entity) {
                return
            }
            this.visible = game.player.canUse(this.$entity)
        },

        // drag'n'drop stuff

        mousemove(event) {
            var drag = this.$drag
            if (drag !== null) {
                this.$el.style.left = event.pageX - drag.dx + 'px'
                this.$el.style.top  = event.pageY - drag.dy + 'px'
            }
        },
        mouseup() {
            this.$drag = null
            this.savePosition()
        },
        mousedown(event) {
            var mod = game.controller.modifier
            if (!(mod.ctrl || mod.shift || mod.alt)) {
                this.toTop()
            }

            game.controller.makeHighlightCallback(this.name, false)

            if (getComputedStyle(event.target).cursor === 'pointer') {
                return
            }

            var checking = event.target
            while (checking && checking != this.$el) {
                if (checking.classList.contains('no-drag')) {
                    return
                }
                if (dragIgnoreTags.indexOf(checking.tagName) != -1) {
                    return
                }
                checking = checking.parentNode
            }

            this.$drag = {
                dx: event.pageX - this.$el.offsetLeft,
                dy: event.pageY - this.$el.offsetTop,
            }
        },

        // load/save position in localStorage

        loadPosition() {
            var key = 'panels.' + this.name
            var config = JSON.parse(localStorage.getItem(key)) || {}
            if(config.position) {
                this.x = config.position.x
                this.y = config.position.y
                this.visible = config.visible
            } else {
                this.center()
            }
        },
        savePosition() {
            if (!this.temporary) {
                var config = {
                    position: {
                        x: this.x,
                        y: this.y,
                    },
                    visible: this.visible,
                }
                var key = 'panels.' + this.name
                localStorage.setItem(key, JSON.stringify(config))
            }
        },
    },

    attached() {
        // dnd
        this.$drag = null
        this.$mousemove = this.mousemove.bind(this)
        this.$mouseup   = this.mouseup.bind(this)
        this.$mousedown = this.mousedown.bind(this)
        this.$el.addEventListener('mousedown', this.$mousedown)
        window.addEventListener('mouseup',     this.$mouseup)
        window.addEventListener('mousemove',   this.$mousemove)

        this.loadPosition()

        this.$el.id = this.name
    },
    detached() {
        // dnd
        this.$el.removeEventListener('mousedown', this.$mousedown)
        window.removeEventListener('mouseup',     this.$mouseup)
        window.removeEventListener('mousemove',   this.$mousemove)

        this.savePosition()
    },
    watch: {
        'visible': function() {
            this.savePosition()

            if (this.visible) {
                this.toTop()
                this.$broadcast('panel.show')
            } else {
                this.popTop()
            }
        },
    },
}
