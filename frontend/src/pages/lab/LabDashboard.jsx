import { useState, useEffect, useRef } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { FlaskConical, Upload, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function LabDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState({})
  const fileRefs = useRef({})

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/lab/orders/pending')
      setOrders(data)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const markSample = async (orderId) => {
    try {
      await api.put(`/lab/orders/${orderId}/sample`)
      toast.success('Sample collected')
      fetchOrders()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const uploadReport = async (order) => {
    const file = fileRefs.current[order.order_id]?.files?.[0]
    if (!file) return toast.error('Select a file first')
    setUploading(u => ({ ...u, [order.order_id]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(
        `/lab/reports/?order_id=${order.order_id}&patient_id=${order.patient_id}&report_type=blood&uploaded_by=${user.staff_id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      toast.success('Report uploaded! AI analysis started.')
      // Reset the file input
      if (fileRefs.current[order.order_id]) {
        fileRefs.current[order.order_id].value = ''
      }
      fetchOrders()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Upload failed'
      toast.error(typeof msg === 'string' ? msg : 'Upload failed — check console')
      console.error('Lab upload error:', err?.response?.data || err)
    } finally {
      setUploading(u => ({ ...u, [order.order_id]: false }))
    }
  }

  return (
    <Layout title="Lab Orders">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm text-slate-500">{orders.length} pending orders</div>
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
          <FlaskConical size={40} className="mx-auto text-slate-300 mb-3" />
          <div className="text-slate-500">No pending lab orders</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.order_id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{order.patient_id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {(order.tests || []).map(t => (
                      <span key={t} className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">{t}</span>
                    ))}
                  </div>
                  <div className="text-xs text-slate-400">
                    {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  {order.status === 'ordered' && (
                    <button onClick={() => markSample(order.order_id)} className="btn-secondary btn-sm">
                      <CheckCircle size={13} /> Mark Sample Collected
                    </button>
                  )}
                  {order.status === 'sample_collected' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        ref={el => fileRefs.current[order.order_id] = el}
                        className="text-xs text-slate-600 file:btn-secondary file:btn-sm file:mr-2"
                      />
                      <button
                        onClick={() => uploadReport(order)}
                        disabled={uploading[order.order_id]}
                        className="btn-primary btn-sm"
                      >
                        {uploading[order.order_id] ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        Upload Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
