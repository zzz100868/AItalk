const common = require('./common.js')

function toggleLike(pageCtx, e, saveFn) {
  const id = e.currentTarget.dataset.id
  const posts = pageCtx.data.posts
  const idx = posts.findIndex(p => p.id === id)
  if (idx === -1) return

  common.tapGuard(pageCtx, '_likeTap', () => {
    const post = posts[idx]
    const newLiked = !post.liked
    post.liked = newLiked
    post.likes = newLiked ? post.likes + 1 : post.likes - 1

    const update = {}
    update[`posts[${idx}].liked`] = newLiked
    update[`posts[${idx}].likes`] = post.likes
    if (newLiked) {
      post.heartBeating = true
      update[`posts[${idx}].heartBeating`] = true
    }
    pageCtx.setData(update)
    if (saveFn) saveFn(posts)

    if (newLiked) {
      setTimeout(() => {
        post.heartBeating = false
        const u = {}
        u[`posts[${idx}].heartBeating`] = false
        pageCtx.setData(u)
      }, 500)
    }
  }, 300)
}

function addComment(pageCtx, e, saveFn) {
  const postId = e.currentTarget.dataset.id
  const content = e.detail.value
  if (!content || !content.trim()) return

  const posts = pageCtx.data.posts
  const idx = posts.findIndex(p => p.id === postId)
  if (idx === -1) return

  const info = common.loadUserInfo()
  const replying = pageCtx.data.replyingComment
  const newItem = {
    id: Date.now(),
    author: info.name,
    avatar: info.avatar,
    content: content.trim()
  }

  if (replying && replying.postId === postId) {
    const commentIdx = posts[idx].comments.findIndex(c => c.id === replying.commentId)
    if (commentIdx !== -1) {
      newItem.replyTo = replying.author
      if (!posts[idx].comments[commentIdx].replies) {
        posts[idx].comments[commentIdx].replies = []
      }
      posts[idx].comments[commentIdx].replies.push(newItem)
      const update = {}
      update[`posts[${idx}].comments`] = posts[idx].comments
      update[`posts[${idx}].commentInput`] = ''
      update.replyingComment = null
      update.focusInputPostId = null
      pageCtx.setData(update)
    }
  } else {
    newItem.replies = []
    posts[idx].comments.push(newItem)
    posts[idx].commentInput = ''
    const update2 = {}
    update2[`posts[${idx}].comments`] = posts[idx].comments
    update2[`posts[${idx}].commentInput`] = ''
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
    success: (res) => {
      if (res.confirm) {
        const posts = pageCtx.data.posts
        const idx = posts.findIndex(p => p.id === postId)
        if (idx === -1) return
        posts[idx].comments = posts[idx].comments.filter(c => c.id !== commentId)
        const update = {}
        update[`posts[${idx}].comments`] = posts[idx].comments
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
    success: (res) => {
      if (res.confirm) {
        const posts = pageCtx.data.posts
        const idx = posts.findIndex(p => p.id === postId)
        if (idx === -1) return
        const commentIdx = posts[idx].comments.findIndex(c => c.id === commentId)
        if (commentIdx === -1) return
        const replies = posts[idx].comments[commentIdx].replies || []
        posts[idx].comments[commentIdx].replies = replies.filter(r => r.id !== replyId)
        const update = {}
        update[`posts[${idx}].comments`] = posts[idx].comments
        pageCtx.setData(update)
        if (saveFn) saveFn(posts)
      }
    }
  })
}

function doStartReply(pageCtx, postId, commentId, author) {
  pageCtx.setData({
    replyingComment: { postId, commentId, author },
    focusInputPostId: postId
  })
}

function cancelReply(pageCtx) {
  pageCtx.setData({ replyingComment: null })
}

function onCommentTap(pageCtx, e, saveFn) {
  const dataset = e.currentTarget.dataset
  const postId = dataset.postId
  const commentId = dataset.commentId
  const author = dataset.author
  const info = common.loadUserInfo()

  if (author === info.name) {
    wx.showActionSheet({
      itemList: ['删除'],
      itemColor: '#c45a5a',
      success: (res) => {
        if (res.tapIndex === 0) deleteComment(pageCtx, postId, commentId, saveFn)
      }
    })
  } else {
    wx.showActionSheet({
      itemList: ['回复', '举报'],
      itemColor: '#c45a5a',
      success: (res) => {
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
  const dataset = e.currentTarget.dataset
  const postId = dataset.postId
  const commentId = dataset.commentId
  const replyId = dataset.replyId
  const author = dataset.author
  const content = dataset.content
  const info = common.loadUserInfo()

  if (author === info.name) {
    wx.showActionSheet({
      itemList: ['复制', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          common.safeSetClipboardData(content)
        } else if (res.tapIndex === 1) {
          deleteReply(pageCtx, postId, commentId, replyId, saveFn)
        }
      }
    })
  } else {
    wx.showActionSheet({
      itemList: ['回复', '举报'],
      itemColor: '#c45a5a',
      success: (res) => {
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
  toggleLike,
  addComment,
  deleteComment,
  deleteReply,
  doStartReply,
  cancelReply,
  onCommentTap,
  onReplyTap
}
