module.exports = function tabPage(tabIndex) {
  return Behavior({
    definitionFilter(defFields) {
      const origOnShow = defFields.onShow
      defFields.onShow = function () {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({ selected: tabIndex })
        }
        if (origOnShow) origOnShow.call(this)
      }
    }
  })
}
