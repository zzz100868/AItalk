Component({
  properties: {
    variant: {
      type: String,
      value: 'list'
    },
    rows: {
      type: Number,
      value: 3
    },
    active: {
      type: Boolean,
      value: true
    }
  },

  data: {
    rowArray: []
  },

  observers: {
    'rows': function (rows) {
      var arr = []
      for (var i = 0; i < rows; i++) arr.push(i)
      this.setData({ rowArray: arr })
    }
  },

  lifetimes: {
    attached: function () {
      var arr = []
      for (var i = 0; i < this.data.rows; i++) arr.push(i)
      this.setData({ rowArray: arr })
    }
  }
})
