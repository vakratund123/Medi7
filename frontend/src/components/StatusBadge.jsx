import clsx from 'clsx'
import { CheckCircle, AlertCircle, Clock, AlertTriangle } from 'lucide-react'

const STATUS_CONFIG = {
  // Visit status
  waiting:         { label: 'Waiting',          cls: 'badge-blue',   Icon: Clock },
  in_consultation: { label: 'In Consultation',  cls: 'badge-orange', Icon: AlertCircle },
  admitted:        { label: 'Admitted (IPD)',   cls: 'bg-purple-100 text-purple-800 border border-purple-300 font-semibold', Icon: AlertCircle },
  completed:       { label: 'Completed',         cls: 'badge-green',  Icon: CheckCircle },
  cancelled:       { label: 'Cancelled',         cls: 'badge-gray',   Icon: AlertCircle },
  // Lab / radiology status
  ordered:         { label: 'Ordered',           cls: 'badge-blue',   Icon: Clock },
  sample_collected:{ label: 'Sample Collected',  cls: 'badge-orange', Icon: AlertCircle },
  // Generic
  sent:            { label: 'Sent',              cls: 'badge-green',  Icon: CheckCircle },
  failed:          { label: 'Failed',            cls: 'badge-red',    Icon: AlertTriangle },
  pending:         { label: 'Pending',           cls: 'badge-blue',   Icon: Clock },
  low:             { label: 'Low Stock',         cls: 'badge-red',    Icon: AlertTriangle },
  ok:              { label: 'In Stock',          cls: 'badge-green',  Icon: CheckCircle },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, cls: 'badge-gray', Icon: Clock }
  const { label, cls, Icon } = config
  return (
    <span className={cls}>
      <Icon size={11} />
      {label}
    </span>
  )
}
