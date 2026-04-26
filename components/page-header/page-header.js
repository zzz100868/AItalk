Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    variant: {
      type: String,
      value: 'light'
    },
    showBack: {
      type: Boolean,
      value: false
    },
    showAvatar: {
      type: Boolean,
      value: false
    },
    avatar: {
      type: String,
      value: ''
    },
    author: {
      type: String,
      value: ''
    },
    showDot: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onLeftTap() {
      if (this.data.showBack) {
        this.triggerEvent('back')
        return
      }
      if (this.data.showAvatar) {
        this.triggerEvent('avatartap', { author: this.data.author })
      }
    }
  }
})
