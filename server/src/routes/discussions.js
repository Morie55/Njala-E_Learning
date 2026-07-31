import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import DiscussionPost from '../models/DiscussionPost.js'
import Course from '../models/Course.js'
import Enrollment from '../models/Enrollment.js'
import Notification from '../models/Notification.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** Ensure user is enrolled in or teaches the course */
async function canAccessCourse(userId, role, courseId) {
  if (['admin', 'dept_head'].includes(role)) return true
  if (role === 'lecturer') {
    const c = await Course.findById(courseId).lean()
    return c?.lecturerId?.toString() === userId.toString()
  }
  // student — check enrollment
  const enr = await Enrollment.findOne({ courseId, studentId: userId, status: 'active' }).lean()
  return !!enr
}

/** GET /api/v1/discussions/course/:courseId — List all posts */
router.get('/course/:courseId', ...auth, async (req, res, next) => {
  try {
    const { courseId } = req.params
    const { _id, role } = req.dbUser

    if (!await canAccessCourse(_id, role, courseId)) {
      return res.status(403).json({ error: 'You are not enrolled in this course' })
    }

    const posts = await DiscussionPost.find({ courseId })
      .sort({ pinned: -1, createdAt: -1 })
      .populate('authorId', 'fullName role idNumber')
      .select('-replies')   // don't load all replies in list view
      .lean()

    const enriched = posts.map(p => ({
      ...p,
      replyCount: p.replies?.length ?? 0,
      likeCount: p.likes?.length ?? 0,
      isLiked: p.likes?.some(l => l.toString() === _id.toString()) ?? false,
    }))

    res.json({ posts: enriched })
  } catch (err) { next(err) }
})

/** POST /api/v1/discussions/course/:courseId — Create a post */
router.post('/course/:courseId', ...auth, async (req, res, next) => {
  try {
    const { courseId } = req.params
    const { _id, role } = req.dbUser

    if (!await canAccessCourse(_id, role, courseId)) {
      return res.status(403).json({ error: 'Not enrolled in this course' })
    }

    const { title, body } = req.body
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'Title and body are required' })
    }

    const post = await DiscussionPost.create({
      courseId, authorId: _id,
      title: title.trim(), body: body.trim(),
    })

    await post.populate('authorId', 'fullName role')
    res.status(201).json(post)
  } catch (err) { next(err) }
})

/** GET /api/v1/discussions/:id — Get a single post with all replies */
router.get('/:id', ...auth, async (req, res, next) => {
  try {
    const post = await DiscussionPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('authorId', 'fullName role idNumber')
      .populate('replies.authorId', 'fullName role idNumber')
      .lean()

    if (!post) return res.status(404).json({ error: 'Post not found' })

    const { _id } = req.dbUser
    const enriched = {
      ...post,
      likeCount: post.likes?.length ?? 0,
      isLiked: post.likes?.some(l => l.toString() === _id.toString()) ?? false,
      replies: post.replies?.map(r => ({
        ...r,
        likeCount: r.likes?.length ?? 0,
        isLiked: r.likes?.some(l => l.toString() === _id.toString()) ?? false,
      })) ?? [],
    }

    res.json(enriched)
  } catch (err) { next(err) }
})

/** POST /api/v1/discussions/:id/replies — Add a reply */
router.post('/:id/replies', ...auth, async (req, res, next) => {
  try {
    const { _id, role } = req.dbUser
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Reply body is required' })

    const post = await DiscussionPost.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.closed && !['admin', 'dept_head', 'lecturer'].includes(role)) {
      return res.status(403).json({ error: 'This discussion is closed' })
    }

    post.replies.push({ authorId: _id, body: body.trim() })
    await post.save()

    // Notify OP if replier is not the author
    if (post.authorId.toString() !== _id.toString()) {
      await Notification.create({
        recipientId: post.authorId.toString(),
        senderId: _id.toString(),
        title: 'New reply on your discussion',
        message: `Someone replied to your post: "${post.title}"`,
        type: 'system',
        link: `/courses/${post.courseId}/discussions/${post._id}`,
      })
    }

    await post.populate('replies.authorId', 'fullName role')
    const newReply = post.replies[post.replies.length - 1]
    res.status(201).json(newReply)
  } catch (err) { next(err) }
})

/** PATCH /api/v1/discussions/:id/like — Toggle like on a post */
router.patch('/:id/like', ...auth, async (req, res, next) => {
  try {
    const { _id } = req.dbUser
    const post = await DiscussionPost.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const idx = post.likes.findIndex(l => l.toString() === _id.toString())
    if (idx === -1) post.likes.push(_id)
    else post.likes.splice(idx, 1)
    await post.save()

    res.json({ likeCount: post.likes.length, isLiked: idx === -1 })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/discussions/:id/replies/:replyId/like — Toggle like on a reply */
router.patch('/:id/replies/:replyId/like', ...auth, async (req, res, next) => {
  try {
    const { _id } = req.dbUser
    const post = await DiscussionPost.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const reply = post.replies.id(req.params.replyId)
    if (!reply) return res.status(404).json({ error: 'Reply not found' })

    const idx = reply.likes.findIndex(l => l.toString() === _id.toString())
    if (idx === -1) reply.likes.push(_id)
    else reply.likes.splice(idx, 1)
    await post.save()

    res.json({ likeCount: reply.likes.length, isLiked: idx === -1 })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/discussions/:id — Pin/close/edit (lecturers & admin) */
router.patch('/:id', ...auth, async (req, res, next) => {
  try {
    const { _id, role } = req.dbUser
    const post = await DiscussionPost.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const isAuthor = post.authorId.toString() === _id.toString()
    const isMod = ['lecturer', 'dept_head', 'admin'].includes(role)

    const { pinned, closed, title, body } = req.body

    // Only mod can pin/close
    if ((pinned !== undefined || closed !== undefined) && !isMod) {
      return res.status(403).json({ error: 'Only lecturers or admins can pin or close posts' })
    }
    // Only author or mod can edit title/body
    if ((title !== undefined || body !== undefined) && !isAuthor && !isMod) {
      return res.status(403).json({ error: 'You can only edit your own posts' })
    }

    if (pinned !== undefined) post.pinned = pinned
    if (closed !== undefined) post.closed = closed
    if (title !== undefined) { post.title = title.trim(); post.edited = true }
    if (body !== undefined) { post.body = body.trim(); post.edited = true }

    await post.save()
    res.json(post)
  } catch (err) { next(err) }
})

/** DELETE /api/v1/discussions/:id — Delete a post */
router.delete('/:id', ...auth, async (req, res, next) => {
  try {
    const { _id, role } = req.dbUser
    const post = await DiscussionPost.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const isAuthor = post.authorId.toString() === _id.toString()
    const isMod = ['lecturer', 'dept_head', 'admin'].includes(role)
    if (!isAuthor && !isMod) return res.status(403).json({ error: 'Forbidden' })

    await DiscussionPost.findByIdAndDelete(req.params.id)
    res.json({ message: 'Post deleted' })
  } catch (err) { next(err) }
})

/** DELETE /api/v1/discussions/:id/replies/:replyId — Delete a reply */
router.delete('/:id/replies/:replyId', ...auth, async (req, res, next) => {
  try {
    const { _id, role } = req.dbUser
    const post = await DiscussionPost.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const reply = post.replies.id(req.params.replyId)
    if (!reply) return res.status(404).json({ error: 'Reply not found' })

    const isAuthor = reply.authorId.toString() === _id.toString()
    const isMod = ['lecturer', 'dept_head', 'admin'].includes(role)
    if (!isAuthor && !isMod) return res.status(403).json({ error: 'Forbidden' })

    reply.deleteOne()
    await post.save()
    res.json({ message: 'Reply deleted' })
  } catch (err) { next(err) }
})

export default router
