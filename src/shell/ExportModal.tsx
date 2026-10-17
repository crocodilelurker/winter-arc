import { useState } from 'react'
import type { Db } from '../db/types'
import {
  generateMarkdownReport,
  generatePrintableHtml,
  downloadFile,
  getDateRange,
} from './exportReport'

type Props = {
  db: Db
  onClose: () => void
}

export default function ExportModal({ db, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const defaultStart = db.profile.startedOn || today

  const [startDate, setStartDate] = useState(defaultStart <= today ? defaultStart : today)
  const [endDate, setEndDate] = useState(today)
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Compute total days in selection
  const daysSelected =
    startDate && endDate && startDate <= endDate
      ? getDateRange(startDate, endDate).length
      : 0

  const handleSetPreset = (type: 'arc' | '30' | '7' | 'today') => {
    const end = today
    if (type === 'today') {
      setStartDate(end)
      setEndDate(end)
    } else if (type === '7') {
      const d = new Date()
      d.setDate(d.getDate() - 6)
      setStartDate(d.toISOString().split('T')[0])
      setEndDate(end)
    } else if (type === '30') {
      const d = new Date()
      d.setDate(d.getDate() - 29)
      setStartDate(d.toISOString().split('T')[0])
      setEndDate(end)
    } else if (type === 'arc') {
      setStartDate(db.profile.startedOn || today)
      setEndDate(end)
    }
  }

  const handleDownloadMarkdown = () => {
    if (!startDate || !endDate || startDate > endDate) {
      alert('Please select a valid date range.')
      return
    }
    const md = generateMarkdownReport(db, startDate, endDate)
    const filename = `winter-arc-report-${startDate}-to-${endDate}.md`
    downloadFile(md, filename, 'text/markdown;charset=utf-8')
  }

  const handlePrintPdf = () => {
    if (!startDate || !endDate || startDate > endDate) {
      alert('Please select a valid date range.')
      return
    }
    const html = generatePrintableHtml(db, startDate, endDate)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
    } else {
      alert('Please allow popups for this site to open the print-ready PDF window.')
    }
  }

  const handleCopyMarkdown = async () => {
    if (!startDate || !endDate || startDate > endDate) return
    const md = generateMarkdownReport(db, startDate, endDate)
    try {
      await navigator.clipboard.writeText(md)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      window.prompt('Copy report:', md)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>Export Progress Report</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              Generate a summary of nutrition, tasks, workouts, and habits.
            </p>
          </div>
          <button
            type="button"
            className="ghost sm"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Quick Date Presets */}
          <div className="form-group">
            <span className="form-label">Quick Presets</span>
            <div className="preset-chips">
              <button
                type="button"
                className="preset-chip"
                onClick={() => handleSetPreset('arc')}
              >
                Full Arc
              </button>
              <button
                type="button"
                className="preset-chip"
                onClick={() => handleSetPreset('30')}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                className="preset-chip"
                onClick={() => handleSetPreset('7')}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                className="preset-chip"
                onClick={() => handleSetPreset('today')}
              >
                Today
              </button>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                max={endDate || today}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Days summary */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 'var(--r)',
              fontSize: '12px',
              color: 'var(--text-2)',
            }}
          >
            {daysSelected > 0 ? (
              <span>
                Selected <strong>{daysSelected}</strong> {daysSelected === 1 ? 'day' : 'days'} ({startDate} to {endDate})
              </span>
            ) : (
              <span style={{ color: 'var(--red)' }}>Start date must be before or equal to end date.</span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button
            type="button"
            className="ghost sm"
            onClick={handleCopyMarkdown}
            disabled={daysSelected === 0}
          >
            {copyFeedback ? 'Copied! ✓' : 'Copy Markdown'}
          </button>

          <button
            type="button"
            className="ghost sm"
            onClick={handlePrintPdf}
            disabled={daysSelected === 0}
            title="Open print window to save as PDF"
          >
            PDF / Print
          </button>

          <button
            type="button"
            className="primary sm"
            onClick={handleDownloadMarkdown}
            disabled={daysSelected === 0}
          >
            Download .md
          </button>
        </div>
      </div>
    </div>
  )
}
