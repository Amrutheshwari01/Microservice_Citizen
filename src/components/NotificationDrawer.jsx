import React from 'react';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  RefreshCw, 
  Send,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert
} from 'lucide-react';

export default function NotificationDrawer({
  isOpen,
  onClose,
  events,
  onSimulateEvent
}) {
  if (!isOpen) return null;

  const getEventBadge = (type) => {
    switch(type) {
      case 'WalletCredited':
        return <span className="badge badge-green"><ArrowDownLeft size={12} /> WalletCredited</span>;
      case 'FundsHeld':
        return <span className="badge badge-amber"><Clock size={12} /> FundsHeld</span>;
      case 'FundsReleased':
        return <span className="badge badge-blue"><CheckCircle2 size={12} /> FundsReleased</span>;
      case 'FundsRefunded':
        return <span className="badge badge-purple"><RefreshCw size={12} /> FundsRefunded</span>;
      case 'TransferFailed':
        return <span className="badge badge-red"><AlertCircle size={12} /> TransferFailed</span>;
      case 'KYCTierChanged':
        return <span className="badge badge-purple"><Sparkles size={12} /> KYCTierChanged</span>;
      default:
        return <span className="badge badge-gray">{type}</span>;
    }
  };

  return (
    <div className="modal-overlay" style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div 
        className="modal-content drawer-content" 
        style={{ 
          maxWidth: '460px', 
          height: '100vh', 
          maxHeight: '100vh', 
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '50%', color: 'var(--primary-600)' }}>
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Microservice Outbox Relay</h3>
              <small className="text-muted">WAL-FR-14 · Guaranteed At-Least-Once Delivery</small>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '8px' }}>
            Simulate Incoming Event from Partner Services:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onSimulateEvent('WalletCredited')}
            >
              + Top-up Credited
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onSimulateEvent('FundsHeld')}
            >
              + RTO Escrow Hold
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onSimulateEvent('FundsReleased')}
            >
              + Produce Released
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onSimulateEvent('FundsRefunded')}
            >
              + Expired Refund
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div className="events-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map((evt) => (
              <div 
                key={evt.id} 
                className="event-card"
                style={{
                  background: 'white',
                  border: '1px solid var(--slate-200)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  {getEventBadge(evt.event_type)}
                  <span className="font-mono text-muted" style={{ fontSize: '0.72rem' }}>
                    {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '4px' }}>
                  Ref: <span className="font-mono">{evt.business_ref}</span>
                </div>

                <div 
                  className="font-mono" 
                  style={{ 
                    fontSize: '0.75rem', 
                    background: 'var(--slate-100)', 
                    padding: '8px', 
                    borderRadius: '6px',
                    color: 'var(--slate-700)',
                    marginBottom: '6px',
                    wordBreak: 'break-all'
                  }}
                >
                  {JSON.stringify(evt.payload, null, 1)}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                  Relayed to: {evt.delivered_to?.join(', ') || 'CitizenApp, NotificationAdapter'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
            Transactional Outbox Pattern (CIS-M6)
          </span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
