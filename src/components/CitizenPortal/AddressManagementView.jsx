import React, { useState } from 'react';
import { 
  MapPin, 
  Plus, 
  Home, 
  Briefcase, 
  Tractor, 
  Warehouse, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  X, 
  AlertCircle 
} from 'lucide-react';

export default function AddressManagementView({
  addresses = [],
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  onSetDefaultAddress
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const initialFormState = {
    address_type: 'RESIDENTIAL',
    address_label: '',
    house_flat_number: '',
    building_name: '',
    street_name: '',
    locality_area: '',
    landmark: '',
    city_town: '',
    district: '',
    state_code: 'KA',
    postal_code: '',
    country_code: 'IN',
    is_default: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState(null);

  const stateOptions = [
    { code: 'KA', name: 'Karnataka' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'TS', name: 'Telangana' },
    { code: 'KL', name: 'Kerala' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'PB', name: 'Punjab' },
    { code: 'HR', name: 'Haryana' },
    { code: 'RJ', name: 'Rajasthan' },
  ];

  const handleOpenAdd = () => {
    setEditingAddressId(null);
    setFormData(initialFormState);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddressId(addr.id);
    setFormData({
      address_type: addr.address_type || 'RESIDENTIAL',
      address_label: addr.address_label || '',
      house_flat_number: addr.house_flat_number || '',
      building_name: addr.building_name || '',
      street_name: addr.street_name || '',
      locality_area: addr.locality_area || '',
      landmark: addr.landmark || '',
      city_town: addr.city_town || '',
      district: addr.district || '',
      state_code: addr.state_code || 'KA',
      postal_code: addr.postal_code || '',
      country_code: addr.country_code || 'IN',
      is_default: !!addr.is_default
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.locality_area || !formData.city_town || !formData.postal_code) {
      setFormError('Please enter locality, city/town, and postal PIN code.');
      return;
    }
    if (!/^\d{6}$/.test(formData.postal_code.trim())) {
      setFormError('Postal PIN code must be exactly 6 digits.');
      return;
    }

    if (editingAddressId) {
      onUpdateAddress(editingAddressId, formData);
      setSuccessMessage('Address updated successfully.');
    } else {
      onAddAddress(formData);
      setSuccessMessage('New address added successfully.');
    }

    setIsModalOpen(false);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'FARM': return <Tractor size={18} className="text-success" />;
      case 'WAREHOUSE': return <Warehouse size={18} className="text-amber" />;
      case 'BUSINESS': return <Briefcase size={18} className="text-primary" />;
      default: return <Home size={18} className="text-primary" />;
    }
  };

  return (
    <div className="address-management-view">
      <div className="view-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Address & Location Management</h2>
          <p className="text-muted">Manage your delivery, farm, warehouse, and residential locations across the AgriLink network.</p>
        </div>
        <button className="primary-btn" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} />
          <span>Add New Address</span>
        </button>
      </div>

      {successMessage && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="empty-state-card" style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--slate-300)' }}>
          <MapPin size={40} style={{ color: 'var(--slate-400)', margin: '0 auto 12px' }} />
          <h3>No Addresses Saved Yet</h3>
          <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto 20px' }}>Add your primary delivery address, farm location, or warehouse to enable accurate logistics routing.</p>
          <button className="primary-btn" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Address
          </button>
        </div>
      ) : (
        <div className="addresses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {addresses.map((addr) => (
            <div 
              key={addr.id} 
              className={`address-card ${addr.is_default ? 'default-card' : ''}`}
              style={{
                background: '#fff',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: addr.is_default ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                boxShadow: 'var(--shadow-sm)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: 'var(--primary-50)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
                    {getTypeIcon(addr.address_type)}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--slate-900)' }}>
                      {addr.address_label || addr.address_type}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'capitalize' }}>
                      {addr.address_type?.toLowerCase()}
                    </div>
                  </div>
                </div>

                {addr.is_default && (
                  <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Default</span>
                )}
              </div>

              <div style={{ fontSize: '0.88rem', color: 'var(--slate-700)', lineHeight: '1.5', marginBottom: '16px', minHeight: '60px' }}>
                {addr.house_flat_number && `${addr.house_flat_number}, `}
                {addr.building_name && `${addr.building_name}, `}
                {addr.street_name && `${addr.street_name}, `}
                {addr.locality_area && `${addr.locality_area}, `}
                {addr.landmark && `Near ${addr.landmark}, `}
                <div><strong>{addr.city_town}</strong>, {addr.district ? `${addr.district}, ` : ''}{addr.state_code} - <strong>{addr.postal_code}</strong></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--slate-100)' }}>
                {!addr.is_default ? (
                  <button 
                    className="link-btn" 
                    onClick={() => onSetDefaultAddress(addr.id)}
                    style={{ fontSize: '0.82rem', color: 'var(--primary-700)', fontWeight: 600 }}
                  >
                    Set as Default
                  </button>
                ) : <span style={{ fontSize: '0.82rem', color: 'var(--primary-600)', fontWeight: 600 }}>Primary Destination</span>}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="action-icon-btn" 
                    onClick={() => handleOpenEdit(addr)}
                    title="Edit Address"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button 
                    className="action-icon-btn danger" 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this address?')) {
                        onDeleteAddress(addr.id);
                      }
                    }}
                    title="Delete Address"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3>{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div className="alert-callout danger" style={{ margin: 0 }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Address Type</label>
                  <select 
                    className="form-input" 
                    value={formData.address_type}
                    onChange={(e) => setFormData({ ...formData, address_type: e.target.value })}
                  >
                    <option value="RESIDENTIAL">Residential (Home)</option>
                    <option value="FARM">Agricultural Farm</option>
                    <option value="WAREHOUSE">Warehouse / Aggregator Storage</option>
                    <option value="BUSINESS">Business Office</option>
                    <option value="PICKUP">Produce Pickup Point</option>
                    <option value="DELIVERY">Delivery Hub</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Address Label (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Primary Residence, North Field Farm"
                    value={formData.address_label}
                    onChange={(e) => setFormData({ ...formData, address_label: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">House / Flat / Survey No.</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 402, 12-A, Sy. No. 84"
                    value={formData.house_flat_number}
                    onChange={(e) => setFormData({ ...formData, house_flat_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Building / Farm Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Green Valley Farm, Shanti Nilaya"
                    value={formData.building_name}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Street / Main Road</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Mandi Main Road, 5th Cross"
                  value={formData.street_name}
                  onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Locality / Village / Area *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Hebbal, Doddaballapura"
                    required
                    value={formData.locality_area}
                    onChange={(e) => setFormData({ ...formData, locality_area: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Landmark (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Near APMC Market Yard"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">City / Town *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Bengaluru"
                    required
                    value={formData.city_town}
                    onChange={(e) => setFormData({ ...formData, city_town: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">State *</label>
                  <select 
                    className="form-input" 
                    value={formData.state_code}
                    onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                  >
                    {stateOptions.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">PIN Code *</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    className="form-input font-mono" 
                    placeholder="560024"
                    required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <input 
                  type="checkbox" 
                  id="is_default_check"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="is_default_check" style={{ fontSize: '0.9rem', color: 'var(--slate-800)', cursor: 'pointer' }}>
                  Set as my default primary address
                </label>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
