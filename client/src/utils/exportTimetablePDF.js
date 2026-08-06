import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WORK_DAYS = [1, 2, 3, 4, 5, 6]

/**
 * Generates and downloads a beautifully styled A4 Landscape PDF for the student's timetable.
 *
 * @param {Array} slots - List of timetable slots
 * @param {Object} dbUser - Current logged in user object
 */
export function exportTimetablePDF(slots = [], dbUser = {}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const navyColor = [3, 34, 77]       // #03224d (Primary Njala Navy)
  const greenColor = [8, 107, 83]     // #086b53 (Njala Emerald Accent)
  const darkGray = [27, 28, 28]       // #1b1c1c
  const mutedGray = [116, 119, 128]   // #747780
  const lightBg = [246, 243, 242]     // #f6f3f2

  // ── 1. Top Header Banner ────────────────────────────────────────────────
  doc.setFillColor(...navyColor)
  doc.rect(0, 0, 297, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('NJALA UNIVERSITY', 14, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('SCHOOL OF TECHNOLOGY & COMPUTER SCIENCE — CLASS TIMETABLE', 14, 18)

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(`DATE GENERATED: ${dateStr.toUpperCase()}`, 283, 14, { align: 'right' })

  // ── 2. Student Info Card ────────────────────────────────────────────────
  doc.setTextColor(...darkGray)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const studentName = dbUser?.fullName || 'Student'
  doc.text(`Official Weekly Schedule — ${studentName}`, 14, 32)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...mutedGray)
  const idPart = dbUser?.idNumber ? `Student ID: ${dbUser.idNumber}   |   ` : ''
  const rolePart = dbUser?.role ? `Role: ${dbUser.role.toUpperCase()}   |   ` : ''
  doc.text(`${idPart}${rolePart}Academic Term: 2025/2026 First Semester`, 14, 38)

  // ── 3. Build Weekly Grid Matrix ─────────────────────────────────────────
  const head = [['Time Slot', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']]
  const rows = []

  // Generate hour slots 07:00 to 19:00
  for (let h = 7; h <= 19; h++) {
    const startStr = `${h.toString().padStart(2, '0')}:00`
    const endStr = `${(h + 1).toString().padStart(2, '0')}:00`
    const row = [`${startStr} – ${endStr}`]

    for (const d of WORK_DAYS) {
      const daySlots = slots.filter(s => {
        if (s.dayOfWeek !== d) return false
        const sHour = parseInt((s.startTime || '08:00').split(':')[0], 10)
        return sHour === h
      })

      if (daySlots.length === 0) {
        row.push('')
      } else {
        const text = daySlots.map(s => {
          const code = s.courseId?.code || 'Course'
          const title = s.courseId?.title ? `\n${s.courseId.title}` : ''
          const time = `\n⏱ ${s.startTime}–${s.endTime}`
          const venue = s.venue ? `\n📍 ${s.venue}` : ''
          return `${code}${title}${time}${venue}`
        }).join('\n───────────\n')
        row.push(text)
      }
    }
    rows.push(row)
  }

  // Render Grid Table
  autoTable(doc, {
    startY: 43,
    head: head,
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 27, fontStyle: 'bold', halign: 'center', fillColor: lightBg, fontSize: 8 },
      1: { cellWidth: 40 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 40 },
      5: { cellWidth: 40 },
      6: { cellWidth: 40 },
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'top',
      lineColor: [196, 198, 208],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [253, 252, 251],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...mutedGray)
      doc.text(`Page ${data.pageNumber} of ${pageCount} — Njala University E-Learning Portal`, 14, 203)
      doc.text('Official Academic Record — NELMS Engine', 283, 203, { align: 'right' })
    }
  })

  // ── 4. Detailed Schedule Summary List (Page 2 / Below Grid) ──────────────
  if (slots.length > 0) {
    const finalY = doc.lastAutoTable?.finalY ?? 150
    // Check if space remains on page 1, else add page
    if (finalY > 140) {
      doc.addPage('a4', 'landscape')
    }

    const startListY = doc.lastAutoTable?.finalY > 140 ? 20 : finalY + 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...navyColor)
    doc.text('Course & Venue Breakdown Summary', 14, startListY)

    const listHead = [['Day', 'Time Slot', 'Course Code', 'Course Title', 'Venue / Lecture Hall']]
    const listRows = slots.map(s => [
      DAYS[s.dayOfWeek] || 'Unknown',
      `${s.startTime} – ${s.endTime}`,
      s.courseId?.code || 'N/A',
      s.courseId?.title || 'N/A',
      s.venue ? `📍 ${s.venue}` : 'Main Campus',
    ])

    autoTable(doc, {
      startY: startListY + 4,
      head: listHead,
      body: listRows,
      theme: 'striped',
      headStyles: {
        fillColor: greenColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ── 5. Trigger PDF Download ─────────────────────────────────────────────
  const rawId = dbUser?.idNumber || dbUser?.fullName || 'Student'
  const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `Njala_Timetable_${cleanId}.pdf`

  doc.save(filename)
}
