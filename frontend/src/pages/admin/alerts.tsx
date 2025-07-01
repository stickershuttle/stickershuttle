import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';

// GraphQL operations for alerts
const GET_ALL_ALERTS = gql`
  query GetAllSitewideAlerts {
    getAllSitewideAlerts {
      id
      title
      message
      backgroundColor
      textColor
      linkUrl
      linkText
      isActive
      startDate
      endDate
      createdAt
      updatedAt
      createdBy
    }
  }
`;

const CREATE_ALERT = gql`
  mutation CreateSitewideAlert($input: CreateSitewideAlertInput!) {
    createSitewideAlert(input: $input) {
      id
      title
      isActive
    }
  }
`;

const UPDATE_ALERT = gql`
  mutation UpdateSitewideAlert($id: ID!, $input: UpdateSitewideAlertInput!) {
    updateSitewideAlert(id: $id, input: $input) {
      id
      title
      isActive
    }
  }
`;

const DELETE_ALERT = gql`
  mutation DeleteSitewideAlert($id: ID!) {
    deleteSitewideAlert(id: $id)
  }
`;

const TOGGLE_ALERT = gql`
  mutation ToggleSitewideAlert($id: ID!, $isActive: Boolean!) {
    toggleSitewideAlert(id: $id, isActive: $isActive) {
      id
      isActive
    }
  }
`;

interface Alert {
  id: string;
  title: string;
  message: string;
  backgroundColor: string;
  textColor: string;
  linkUrl?: string;
  linkText?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Predefined color options
const COLOR_OPTIONS = [
  { name: 'Gold', value: '#FFD700', description: 'Classic gold' },
  { name: 'Blue', value: '#3B82F6', description: 'Bright blue' },
  { name: 'Green', value: '#22C55E', description: 'Success green' },
  { name: 'Red', value: '#EF4444', description: 'Alert red' },
  { name: 'Purple', value: '#8B5CF6', description: 'Royal purple' },
  { name: 'Orange', value: '#F97316', description: 'Vibrant orange' },
  { name: 'Pink', value: '#EC4899', description: 'Hot pink' },
  { name: 'Cyan', value: '#06B6D4', description: 'Electric cyan' },
  { name: 'Indigo', value: '#6366F1', description: 'Deep indigo' },
  { name: 'Emerald', value: '#10B981', description: 'Rich emerald' }
];

const TEXT_COLOR_OPTIONS = [
  { name: 'Dark Blue', value: '#030140', description: 'Primary dark' },
  { name: 'White', value: '#FFFFFF', description: 'Pure white' },
  { name: 'Black', value: '#000000', description: 'Pure black' },
  { name: 'Dark Gray', value: '#374151', description: 'Charcoal gray' },
  { name: 'Light Gray', value: '#9CA3AF', description: 'Light gray' },
  { name: 'Navy', value: '#1E3A8A', description: 'Navy blue' },
  { name: 'Dark Green', value: '#14532D', description: 'Forest green' },
  { name: 'Dark Red', value: '#7F1D1D', description: 'Deep red' },
  { name: 'Dark Purple', value: '#581C87', description: 'Deep purple' },
  { name: 'Dark Orange', value: '#9A3412', description: 'Burnt orange' }
];

const ADMIN_EMAILS = ['justin@stickershuttle.com'];

export default function AlertsManagement() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    backgroundColor: '#FFD700',
    textColor: '#030140',
    linkUrl: '',
    linkText: '',
    isActive: false,
    startDate: '',
    endDate: ''
  });

  const { data, loading: alertsLoading, error, refetch } = useQuery(GET_ALL_ALERTS);
  const [createAlert] = useMutation(CREATE_ALERT);
  const [updateAlert] = useMutation(UPDATE_ALERT);
  const [deleteAlert] = useMutation(DELETE_ALERT);
  const [toggleAlert] = useMutation(TOGGLE_ALERT);

  // Check admin access
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?message=Admin access required');
          return;
        }

        if (!ADMIN_EMAILS.includes(session.user.email || '')) {
          router.push('/account/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAlert) {
        await updateAlert({
          variables: { id: editingAlert.id, input: formData }
        });
      } else {
        await createAlert({
          variables: { input: formData }
        });
      }
      
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error saving alert:', error);
      alert('Error saving alert. Please try again.');
    }
  };

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setFormData({
      title: alert.title,
      message: alert.message,
      backgroundColor: alert.backgroundColor,
      textColor: alert.textColor,
      linkUrl: alert.linkUrl || '',
      linkText: alert.linkText || '',
      isActive: alert.isActive,
      startDate: alert.startDate ? alert.startDate.split('T')[0] : '',
      endDate: alert.endDate ? alert.endDate.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    
    try {
      await deleteAlert({ variables: { id } });
      refetch();
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('Error deleting alert. Please try again.');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleAlert({ variables: { id, isActive } });
      refetch();
    } catch (error) {
      console.error('Error toggling alert:', error);
      alert('Error updating alert status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      backgroundColor: '#FFD700',
      textColor: '#030140',
      linkUrl: '',
      linkText: '',
      isActive: false,
      startDate: '',
      endDate: ''
    });
    setEditingAlert(null);
    setShowForm(false);
  };

  if (loading || !isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        <div className="w-full py-6 xl:py-8 px-4 sm:px-6 xl:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Sitewide Alerts</h1>
              <p className="text-gray-400">Manage promotional banners and announcements</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Create New Alert
            </button>
          </div>

          {/* Create/Edit Form */}
          {showForm && (
            <div 
              className="rounded-2xl p-6 mb-8"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h3 className="text-xl font-semibold text-white mb-6">
                {editingAlert ? 'Edit Alert' : 'Create New Alert'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-blue-400"
                      placeholder="e.g., Summer Sale!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Link Text</label>
                    <input
                      type="text"
                      value={formData.linkText}
                      onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-blue-400"
                      placeholder="e.g., Shop Now"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message *</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-blue-400"
                    placeholder="🎉 Get 25% off all custom stickers - Limited time offer!"
                  />
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Background Color</label>
                    <select
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:border-blue-400"
                      aria-label="Select background color"
                    >
                      {COLOR_OPTIONS.map((color) => (
                        <option key={color.value} value={color.value} className="bg-gray-800 text-white">
                          {color.name} - {color.description}
                        </option>
                      ))}
                    </select>
                    <div 
                      className="w-full h-4 rounded-lg mt-2 border border-white/20"
                      style={{ backgroundColor: formData.backgroundColor }}
                    ></div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Text Color</label>
                    <select
                      value={formData.textColor}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:border-blue-400"
                      aria-label="Select text color"
                    >
                      {TEXT_COLOR_OPTIONS.map((color) => (
                        <option key={color.value} value={color.value} className="bg-gray-800 text-white">
                          {color.name} - {color.description}
                        </option>
                      ))}
                    </select>
                    <div 
                      className="w-full h-4 rounded-lg mt-2 border border-white/20"
                      style={{ backgroundColor: formData.textColor }}
                    ></div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Link URL</label>
                    <input
                      type="url"
                      value={formData.linkUrl}
                      onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-blue-400"
                      placeholder="/products"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-400 focus:ring-blue-400"
                    />
                    <span className="text-sm font-medium text-gray-300">Make this alert active</span>
                  </label>
                </div>

                {/* Live Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Preview</label>
                  <div 
                    className="rounded-lg p-4 text-center font-semibold"
                    style={{
                      background: `rgba(${parseInt(formData.backgroundColor.slice(1, 3), 16)}, ${parseInt(formData.backgroundColor.slice(3, 5), 16)}, ${parseInt(formData.backgroundColor.slice(5, 7), 16)}, 0.15)`,
                      border: `1px solid rgba(${parseInt(formData.backgroundColor.slice(1, 3), 16)}, ${parseInt(formData.backgroundColor.slice(3, 5), 16)}, ${parseInt(formData.backgroundColor.slice(5, 7), 16)}, 0.3)`,
                      boxShadow: `rgba(${parseInt(formData.backgroundColor.slice(1, 3), 16)}, ${parseInt(formData.backgroundColor.slice(3, 5), 16)}, ${parseInt(formData.backgroundColor.slice(5, 7), 16)}, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset`,
                      backdropFilter: 'blur(12px)',
                      color: formData.textColor
                    }}
                  >
                    <span>{formData.title || 'Alert Title'}</span>
                    {formData.title && formData.message && ' - '}
                    <span>{formData.message || 'Alert message will appear here'}</span>
                    {formData.linkText && (
                      <span className="ml-2 underline">{formData.linkText}</span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    {editingAlert ? 'Update Alert' : 'Create Alert'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 rounded-lg font-medium text-gray-300 hover:text-white transition-colors border border-white/20 bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Alerts List */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white">All Alerts</h3>
            </div>
            
            {alertsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                <p className="text-gray-300 mt-4">Loading alerts...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-red-300 bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 inline-block">
                  Error: {error.message}
                </div>
              </div>
            ) : !data?.getAllSitewideAlerts?.length ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">No alerts found. Create your first one above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Alert</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Created</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.getAllSitewideAlerts.map((alert: Alert) => (
                      <tr key={alert.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-white">{alert.title}</div>
                            <div className="text-xs text-gray-400 mt-1">{alert.message}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            alert.isActive 
                              ? 'bg-green-500/20 text-green-300 border border-green-500/40' 
                              : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                          }`}>
                            {alert.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleToggle(alert.id, !alert.isActive)}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                alert.isActive
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : 'bg-green-500/20 text-green-300 border border-green-500/40'
                              }`}
                            >
                              {alert.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleEdit(alert)}
                              className="px-3 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(alert.id)}
                              className="px-3 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/40"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 