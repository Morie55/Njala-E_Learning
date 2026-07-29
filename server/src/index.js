import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'

// Route imports
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import courseRoutes from './routes/courses.js'
import assignmentRoutes from './routes/assignments.js'
import assignmentSubmitRoutes from './routes/assignmentSubmit.js'
import submissionRoutes from './routes/submissions.js'
import materialRoutes from './routes/materials.js'
import announcementRoutes from './routes/announcements.js'
import schoolRoutes from './routes/schools.js'
import departmentRoutes from './routes/departments.js'
import adminRoutes from './routes/admin.js'
import notificationRoutes from './routes/notifications.js'

// Middleware & Script imports
import { enforceStatus } from './middleware/enforceStatus.js'
import { startLifecycleSweep } from './scripts/lifecycleSweep.js'
import { startKeepAlive } from './scripts/keepAlive.js'

const app = express()

app.use(helmet())
const rawOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)
const allowedOrigins = Array.from(new Set([...rawOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173']))

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true)
      }
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true)
      }
      callback(null, true)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// API routes (with enforceStatus status enforcement)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', enforceStatus, userRoutes)
app.use('/api/v1/courses', enforceStatus, courseRoutes)
app.use('/api/v1/assignments', enforceStatus, assignmentRoutes)
app.use('/api/v1/assignments', enforceStatus, assignmentSubmitRoutes)
app.use('/api/v1/submissions', enforceStatus, submissionRoutes)
app.use('/api/v1/materials', enforceStatus, materialRoutes)
app.use('/api/v1/announcements', enforceStatus, announcementRoutes)
app.use('/api/v1/schools', enforceStatus, schoolRoutes)
app.use('/api/v1/departments', enforceStatus, departmentRoutes)
app.use('/api/v1/admin', enforceStatus, adminRoutes)
app.use('/api/v1/notifications', enforceStatus, notificationRoutes)

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message)
  const status = err.status ?? err.statusCode ?? 500
  res.status(status).json({ error: err.message ?? 'Internal server error' })
})

// Connect to MongoDB and start server
const PORT = process.env.PORT ?? 4000
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

if (!mongoUri) {
  console.error('[DB] Error: Neither MONGODB_URI nor MONGO_URI is defined in .env')
}

mongoose
  .connect(mongoUri, {
    dbName: 'nelms',
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log('[DB] Connected to MongoDB Atlas')
    startLifecycleSweep()
    startKeepAlive()
    app.listen(PORT, () => console.log(`[SERVER] Listening on port ${PORT}`))
  })
  .catch(err => {
    console.error('[DB] Connection failed:', err.message)
    process.exit(1)
  })

export default app
