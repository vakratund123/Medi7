import React, { useState, useEffect, useRef } from 'react'
import { TABLETS_DATABASE } from '../data/medicinesData'
import { Pill, Check } from 'lucide-react'

export default function MedicineAutocomplete({ value, onChange, onSelectTablet, placeholder = "Type tablet name (e.g. 'm' for Metformin)" }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Filter tablets based on query (case insensitive search in name, generic, or category)
  const matches = query.trim()
    ? TABLETS_DATABASE.filter(t => {
        const q = query.toLowerCase()
        return (
          t.name.toLowerCase().includes(q) ||
          t.generic.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        )
      }).slice(0, 15) // Top 15 matches for speed and responsiveness
    : []

  useEffect(() => {
    setHighlightIdx(0)
  }, [query])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (tablet) => {
    setQuery(tablet.name)
    onChange(tablet.name)
    if (onSelectTablet) {
      onSelectTablet(tablet)
    }
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (!open || matches.length === 0) {
      if (e.key === 'ArrowDown') setOpen(true)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => (prev + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => (prev - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matches[highlightIdx]) {
        handleSelect(matches[highlightIdx])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          className="input pr-8"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const val = e.target.value
            setQuery(val)
            onChange(val)
            setOpen(true)
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Pill size={14} />
        </div>
      </div>

      {/* Auto-suggest Dropdown */}
      {open && matches.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>Tablets &amp; Medicines ({matches.length})</span>
            <span className="text-primary-600 font-normal">Press Enter or click to auto-fill</span>
          </div>
          {matches.map((tablet, idx) => {
            const isHighlighted = idx === highlightIdx
            return (
              <div
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault() // Prevent input blur before click
                  handleSelect(tablet)
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                  isHighlighted ? 'bg-primary-50 text-primary-900' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <span className="text-slate-900">{tablet.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                      {tablet.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    <span>Generic: {tablet.generic}</span> &bull; <span>Dose: {tablet.dosage}</span> &bull; <span>Freq: {tablet.frequency}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block font-medium">
                    {tablet.instructions}
                  </span>
                  {query.toLowerCase() === tablet.name.toLowerCase() && (
                    <Check size={13} className="text-emerald-600 ml-auto" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
