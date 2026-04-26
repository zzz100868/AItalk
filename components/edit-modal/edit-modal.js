Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '编辑'
    },
    inputTitle: {
      type: String,
      value: ''
    },
    inputContent: {
      type: String,
      value: ''
    }
  },

  methods: {
    onTitleInput(e) {
      this.triggerEvent('titleinput', { value: e.detail.value })
    },
    onContentInput(e) {
      this.triggerEvent('contentinput', { value: e.detail.value })
    },
    onCancel() {
      this.triggerEvent('cancel')
    },
    onConfirm() {
      this.triggerEvent('confirm')
    },
    preventBubble() {}
  }
})
