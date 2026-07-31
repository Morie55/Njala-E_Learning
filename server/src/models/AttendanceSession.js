import mongoose from 'mongoose'

const attendanceSessionSchema = new mongoose.Schema(
  {
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lecturerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:        { type: Date, required: true, default: Date.now },
    topic:       { type: String, default: '' },
    records: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        status:    { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'absent' },
      }
    ],
  },
  { timestamps: true }
)

attendanceSessionSchema.index({ courseId: 1, date: -1 })
attendanceSessionSchema.index({ 'records.studentId': 1 })

export default mongoose.models.AttendanceSession || mongoose.model('AttendanceSession', attendanceSessionSchema)
