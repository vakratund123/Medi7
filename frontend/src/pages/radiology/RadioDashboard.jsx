import { useState, useEffect, useRef } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { Scan, Upload, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function RadioDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState({})
  const [remarks, setRemarks] = useState({})
  const fileRefs = useRef({})

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/radiology/orders/pending')
      setOrders(data)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const uploadScan = async (order) => {
    const file = fileRefs.current[order.scan_id]?.files?.[0]
    if (!file) return toast.error('Select a file first')
    setUploading(u => ({ ...u, [order.scan_id]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(
        `/radiology/scans/${order.scan_id}/upload?remarks=${encodeURIComponent(remarks[order.scan_id] || '')}&uploaded_by=${user.staff_id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      toast.success('Scan uploaded successfully')
      if (fileRefs.current[order.scan_id]) {
        fileRefs.current[order.scan_id].value = ''
      }
      fetchOrders()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Upload failed'
      toast.error(typeof msg === 'string' ? msg : 'Upload failed — check console')
      console.error('Radiology upload error:', err?.response?.data || err)
    } finally {
      setUploading(u => ({ ...u, [order.scan_id]: false }))
    }
  }

  return (
    <Layout title="Radiology Orders">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm text-slate-500">{orders.length} pending scans</div>
        <button onClick={fetchOrders} className="btn-secondary btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-primary-500" size={28} />
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-16">
          <Scan size={40} className="mx-auto text-slate-300 mb-3" />
          <div className="text-slate-500">No pending radiology orders</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.scan_id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{order.patient_id}</span>
                    <span className="badge badge-blue">{order.scan_type}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="text-xs text-slate-400">{format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}</div>
                </div>
              </div>
              <div className="space-y-2">
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Radiologist remarks..."
                  value={remarks[order.scan_id] || ''}
                  onChange={e => setRemarks(r => ({ ...r, [order.scan_id]: e.target.value }))}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.dcm,image/*"
                    ref={el => fileRefs.current[order.scan_id] = el}
                    className="text-xs text-slate-600 flex-1"
                  />
                  <button
                    onClick={() => uploadScan(order)}
                    disabled={uploading[order.scan_id]}
                    className="btn-primary btn-sm"
                  >
                    {uploading[order.scan_id] ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Upload Scan
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
