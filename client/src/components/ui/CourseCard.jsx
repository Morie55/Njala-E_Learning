import { useNavigate } from 'react-router-dom'
import StatusBadge from './StatusBadge'

export default function CourseCard({ course, linkTo }) {
  const navigate = useNavigate()
  const progress = course.progress ?? 0

  return (
    <div
      className="bg-white border border-[#c4c6d0] rounded-lg p-4 card-hover cursor-pointer group"
      onClick={() => linkTo && navigate(linkTo)}
      role="article"
    >
      {/* Thumbnail */}
      <div className="h-32 rounded-md mb-4 overflow-hidden relative bg-[#eae8e7]">
        {course.thumbnailUrl ? (
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            src={course.thumbnailUrl}
            alt={course.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-[#c4c6d0]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={course.status} />
        </div>
      </div>

      {/* Info */}
      <div className="mb-4">
        <span className="text-[12px] font-bold tracking-wider text-[#086b53] uppercase">{course.code}</span>
        <h4 className="text-[18px] font-medium leading-6 text-[#03224d] mt-1 line-clamp-2">{course.title}</h4>
        {course.lecturerName && (
          <p className="text-[14px] text-[#44474f] mt-1">{course.lecturerName}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-[12px]">
          <span className="text-[#44474f]">Course Progress</span>
          <span className="font-bold">{progress}%</span>
        </div>
        <div className="w-full bg-[#eae8e7] h-2 rounded-full overflow-hidden">
          <div className="bg-[#086b53] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
