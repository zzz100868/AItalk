var common = require('./common.js')

function toggleLike(pageCtx, e, saveFn) {
  var id = e.currentTarget.dataset.id
  var posts = pageCtx.data.posts
  var idx = posts.findIndex(function(p) { return p.id === id })
  if (idx === -1) return

  common.tapGuard(pageCtx, '_likeTap', function() {
    var post = posts[idx]
    var newLiked = !post.liked
    post.liked = newLiked
    post.likes = newLiked ? post.likes + 1 : post.likes - 1

    var update = {}
    update['posts[' + idx + '].liked'] = newLiked
    update['posts[' + idx + '].likes'] = post.likes
    if (newLiked) {
      post.heartBeating = true
      update['posts[' + idx + '].heartBeating'] = true
    }
    pageCtx.setData(update)
    if (saveFn) saveFn(posts)

    if (newLiked) {
      setTimeout(function() {
        post.heartBeating = false
        var u = {}
        u['posts[' + idx + '].heartBeating'] = false
        pageCtx.setData(u)
      }, 500)
    }
  }, 300)
}

function addComment(pageCtx, e, saveFn) {
  var postId = e.currentTarget.dataset.id
  var content = e.detail.value
  if (!content || !content.trim()) return

  var posts = pageCtx.data.posts
  var idx = posts.findIndex(function(p) { return p.id === postId })
  if (idx === -1) return

  var info = common.loadUserInfo()
  var replying = pageCtx.data.replyingComment
  var newItem = {
    id: Date.now(),
    author: info.name,
    avatar: info.avatar,
    content: content.trim()
  }

  if (replying && replying.postId === postId) {
    var commentIdx = posts[idx].comments.findIndex(function(c) { return c.id === replying.commentId })
    if (commentIdx !== -1) {
      newItem.replyTo = replying.author
      if (!posts[idx].comments[commentIdx].replies) {
        posts[idx].comments[commentIdx].replies = []
      }
      posts[idx].comments[commentIdx].replies.push(newItem)
      var update = {}
      update['posts[' + idx + '].comments'] = posts[idx].comments
      update['posts[' + idx + '].commentInput'] = ''
      update.replyingComment = null
      update.focusInputPostId = null
      pageCtx.setData(update)
    }
  } else {
    newItem.replies = []
    posts[idx].comments.push(newItem)
    posts[idx].commentInput = ''
    var update2 = {}
    update2['posts[' + idx + '].comments'] = posts[idx].comments
    update2['posts[' + idx + '].commentInput'] = ''
    update2.focusInputPostId = null
    pageCtx.setData(update2)
  }
  if (saveFn) saveFn(posts)
}

function deleteComment(pageCtx, postId, commentId, saveFn) {
  wx.showModal({
    title: '确认删除',
    content: '确定要删除这条评论吗？',
    confirmColor: '#c45a5a',
    success: function(res) {
      if (res.confirm) {
        var posts = pageCtx.data.posts
        var idx = posts.findIndex(function(p) { return p.id === postId })
        if (idx === -1) return
        posts[idx].comments = posts[idx].comments.filter(function(c) { return c.id !== commentId })
        var update = {}
        update['posts[' + idx + '].comments'] = posts[idx].comments
        pageCtx.setData(update)
        if (saveFn) saveFn(posts)
      }
    }
  })
}

function deleteReply(pageCtx, postId, commentId, replyId, saveFn) {
  wx.showModal({
    title: '确认删除',
    content: '确定要删除这条回复吗？',
    confirmColor: '#c45a5a',
    success: function(res) {
      if (res.confirm) {
        var posts = pageCtx.data.posts
        var idx = posts.findIndex(function(p) { return p.id === postId })
        if (idx === -1) return
        var commentIdx = posts[idx].comments.findIndex(function(c) { return c.id === commentId })
        if (commentIdx === -1) return
        var replies = posts[idx].comments[commentIdx].replies || []
        posts[idx].comments[commentIdx].replies = replies.filter(function(r) { return r.id !== replyId })
        var update = {}
        update['posts[' + idx + '].comments'] = posts[idx].comments
        pageCtx.setData(update)
        if (saveFn) saveFn(posts)
      }
    }
  })
}

function doStartReply(pageCtx, postId, commentId, author) {
  pageCtx.setData({
    replyingComment: { postId: postId, commentId: commentId, author: author },
    focusInputPostId: postId
  })
}

function cancelReply(pageCtx) {
  pageCtx.setData({ replyingComment: null })
}

function onCommentTap(pageCtx, e, saveFn) {
  var dataset = e.currentTarget.dataset
  var postId = dataset.postId
  var commentId = dataset.commentId
  var author = dataset.author
  var info = common.loadUserInfo()

  if (author === info.name) {
    wx.showActionSheet({
      itemList: ['删除'],
      itemColor: '#c45a5a',
      success: function(res) {
        if (res.tapIndex === 0) deleteComment(pageCtx, postId, commentId, saveFn)
      }
    })
  } else {
    wx.showActionSheet({
      itemList: ['回复', '举报'],
      itemColor: '#c45a5a',
      success: function(res) {
        if (res.tapIndex === 0) {
          doStartReply(pageCtx, postId, commentId, author)
        } else if (res.tapIndex === 1) {
          common.showReportSheet()
        }
      }
    })
  }
}

function onReplyTap(pageCtx, e, saveFn) {
  var dataset = e.currentTarget.dataset
  var postId = dataset.postId
  var commentId = dataset.commentId
  var replyId = dataset.replyId
  var author = dataset.author
  var content = dataset.content
  var info = common.loadUserInfo()

  if (author === info.name) {
    wx.showActionSheet({
      itemList: ['复制', '删除'],
      success: function(res) {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: content,
            success: function() { wx.showToast({ title: '已复制', icon: 'none' }) }
          })
        } else if (res.tapIndex === 1) {
          deleteReply(pageCtx, postId, commentId, replyId, saveFn)
        }
      }
    })
  } else {
    wx.showActionSheet({
      itemList: ['回复', '举报'],
      itemColor: '#c45a5a',
      success: function(res) {
        if (res.tapIndex === 0) {
          doStartReply(pageCtx, postId, commentId, author)
        } else if (res.tapIndex === 1) {
          common.showReportSheet()
        }
      }
    })
  }
}

module.exports = {
  toggleLike: toggleLike,
  addComment: addComment,
  deleteComment: deleteComment,
  deleteReply: deleteReply,
  doStartReply: doStartReply,
  cancelReply: cancelReply,
  onCommentTap: onCommentTap,
  onReplyTap: onReplyTap
}
