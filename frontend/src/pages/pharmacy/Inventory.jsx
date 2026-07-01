import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { BarChart3, Plus, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Inventory() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ medicine_name: '', generic_name: '', quantity_available: 0, unit: 'tablets', reorder_level: 50 })

  const fetchInventory = async () => {
    try {
      const { data } = await api.get(`/pharmacy/inventory/${showLowOnly ? '?low_stock_only=true' : ''}`)
      setItems(data)
    } catch { toast.error('Failed to load inventory') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchInventory() }, [showLowOnly])

  const addItem = async (e) => {
    e.preventDefault()
    try {
      await api.post('/pharmacy/inventory/', newItem)
      toast.success('Item added')
      setShowAdd(false)
      fetchInventory()
    } catch { toast.error('Failed to add item') }
  }

  const updateQty = async (itemId, newQty) => {
    try {
      await api.put(`/pharmacy/inventory/${itemId}`, { quantity_available: parseInt(newQty) })
      toast.success('Quantity updated')
      fetchInventory()
    } catch { toast.error('Update failed') }
  }

  return (
    <Layout title="Pharmacy Inventory">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button onClick={() => setShowLowOnly(v => !v)} className={showLowOnly ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}>
          <AlertTriangle size={14} /> {showLowOnly ? 'Show All' : 'Low Stock Only'}
        </button>
        <button onClick={fetchInventory} className="btn-secondary btn-sm"><RefreshCw size={14} /> Refresh</button>
        <button onClick={() => setShowAdd(v => !v)} className="btn-primary btn-sm ml-auto"><Plus size={14} /> Add Item</button>
      </div>

      {showAdd && (
        <form onSubmit={addItem} className="card mb-4 animate-slide-up">
          <h3 className="font-semibold text-slate-800 mb-3">Add New Item</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Medicine Name</label>
              <input className="input" required value={newItem.medicine_name} onChange={e => setNewItem(n => ({...n, medicine_name: e.target.value}))} />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input type="number" className="input" value={newItem.quantity_available} onChange={e => setNewItem(n => ({...n, quantity_available: parseInt(e.target.value)}))} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={newItem.unit} onChange={e => setNewItem(n => ({...n, unit: e.target.value}))}>
                {['tablets', 'capsules', 'ml', 'units', 'strips'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reorder Level</label>
              <input type="number" className="input" value={newItem.reorder_level} onChange={e => setNewItem(n => ({...n, reorder_level: parseInt(e.target.value)}))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="btn-primary btn-sm">Save</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary btn-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center h-48 items-center"><Loader2 className="animate-spin text-primary-500" size={28} /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Update Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.item_id}>
                  <td>
                    <div className="font-medium text-slate-900">{item.medicine_name}</div>
                    {item.generic_name && <div className="text-xs text-slate-400">{item.generic_name}</div>}
                  </td>
                  <td className={`font-bold ${item.is_low_stock ? 'text-danger-600' : 'text-success-600'}`}>
                    {item.quantity_available}
                  </td>
                  <td className="text-slate-500">{item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>
                    {item.is_low_stock
                      ? <span className="badge badge-red"><AlertTriangle size={11} /> Low Stock</span>
                      : <span className="badge badge-green">In Stock</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={item.quantity_available}
                        className="input w-20 py-1 text-sm"
                        id={`qty-${item.item_id}`}
                      />
                      <button
                        onClick={() => updateQty(item.item_id, document.getElementById(`qty-${item.item_id}`).value)}
                        className="btn-secondary btn-sm"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
