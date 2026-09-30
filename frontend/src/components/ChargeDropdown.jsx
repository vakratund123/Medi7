import { useState, useRef, useEffect } from 'react'
import { HOSPITAL_TARIFF } from '../data/hospitalTariffData'
import { Search, ChevronDown, Plus, Tag, Sparkles, Building2, Stethoscope } from 'lucide-react'

export default function ChargeDropdown({ onSelectCharge, stayType = 'ALL', className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(stayType === 'IPD' ? 'IPD' : 'ALL') // 'ALL' | 'OPD' | 'IPD'
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  // Sync activeTab if stayType prop changes
  useEffect(() => {
    if (stayType === 'IPD') setActiveTab('IPD')
  }, [stayType])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Filter items
  const filteredTariff = HOSPITAL_TARIFF.filter((item) => {
    // Tab filter
    if (activeTab === 'IPD' && !item.is_ipd) return false
    if (activeTab === 'OPD' && item.is_ipd) return false

    // Search filter
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      (item.kannada_name && item.kannada_name.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    )
  })

  const handleItemClick = (item) => {
    onSelectCharge({
      name: item.name,
      category: item.category,
      unit_price: Number(item.rate) || 0,
      quantity: 1,
      total: Number(item.rate) || 0,
      code: item.code,
      is_ipd: item.is_ipd,
      unit: item.unit,
    })
    setIsOpen(false)
    setSearch('')
  }

  const handleAddCustom = () => {
    if (!search.trim()) return
    onSelectCharge({
      name: search.trim(),
      category: activeTab === 'IPD' ? 'Bed Charges' : 'General',
      unit_price: 0,
      quantity: 1,
      total: 0,
      code: 'CUSTOM',
    })
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      >
        <span className="flex items-center gap-2 truncate">
          <Sparkles size={14} className="text-primary-600 shrink-0" />
          <span>Select Charge from Hospital Tariff...</span>
        </span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 w-full min-w-[340px] max-w-lg animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Stay Category Tabs */}
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Hospital Master Tariff
            </span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('OPD')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'OPD' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Stethoscope size={11} />
                <span>OPD</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('IPD')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'IPD' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 size={11} />
                <span>IPD Specific</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
              placeholder="Search by charge name, Kannada, or code (e.g. ECG, ICU, Dressing)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Charges List */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {filteredTariff.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-500">No standard charge matched &quot;{search}&quot;</p>
                {search.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                  >
                    <Plus size={13} /> Add &quot;{search.trim()}&quot; as custom item
                  </button>
                )}
              </div>
            ) : (
              filteredTariff.map((item) => (
                <button
                  key={item.code || item.name}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="w-full text-left p-2 hover:bg-primary-50/70 hover:border-primary-200 rounded-xl border border-transparent transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-primary-900 leading-tight">
                        {item.name}
                      </span>
                      {item.is_ipd && (
                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md">
                          IPD
                        </span>
                      )}
                      {item.code && (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-mono font-semibold rounded-md">
                          {item.code}
                        </span>
                      )}
                    </div>
                    {item.kannada_name && (
                      <div className="text-[11px] text-slate-500 group-hover:text-slate-600 font-normal truncate mt-0.5">
                        {item.kannada_name}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900 group-hover:text-primary-700">
                      ₹{item.rate}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {item.unit || 'Per Unit'}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Quick Custom Item Footer */}
          {search.trim() && (
            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Need something else?</span>
              <button
                type="button"
                onClick={handleAddCustom}
                className="font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus size={12} /> Add custom &quot;{search}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
