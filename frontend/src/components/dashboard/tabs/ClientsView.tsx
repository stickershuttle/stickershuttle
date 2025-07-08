import React from 'react';

interface ClientsViewProps {
  orders: any[];
  wholesaleClients: any[];
  clientsLoading: boolean;
  showCreateClientForm: boolean;
  setShowCreateClientForm: (show: boolean) => void;
  newClientData: any;
  setNewClientData: React.Dispatch<React.SetStateAction<any>>;
  creatingClient: boolean;
  selectedClientForOrders: string | null;
  setSelectedClientForOrders: (clientId: string | null) => void;
  selectedOrdersForAssignment: Set<string>;
  setSelectedOrdersForAssignment: React.Dispatch<React.SetStateAction<Set<string>>>;
  assigningOrders: boolean;
  setAssigningOrders: (assigning: boolean) => void;
  expandedClient: string | null;
  setExpandedClient: (clientId: string | null) => void;
  clientOrders: { [key: string]: any[] };
  user: any;
  setCurrentView: (view: string) => void;
  createWholesaleClient: any;
  getClientOrders: any;
  assignOrderToClient: any;
  unassignOrderFromClient: any;
  setActionNotification: (notification: { message: string; type: string }) => void;
  handleViewOrderDetails: (order: any) => void;
}

const ClientsView: React.FC<ClientsViewProps> = ({
  orders,
  wholesaleClients,
  clientsLoading,
  showCreateClientForm,
  setShowCreateClientForm,
  newClientData,
  setNewClientData,
  creatingClient,
  selectedClientForOrders,
  setSelectedClientForOrders,
  selectedOrdersForAssignment,
  setSelectedOrdersForAssignment,
  assigningOrders,
  setAssigningOrders,
  expandedClient,
  setExpandedClient,
  clientOrders,
  user,
  setCurrentView,
  createWholesaleClient,
  getClientOrders,
  assignOrderToClient,
  unassignOrderFromClient,
  setActionNotification,
  handleViewOrderDetails
}) => {
  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as XXX-XXX-XXXX
    if (phoneNumber.length >= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    } else if (phoneNumber.length >= 3) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return phoneNumber;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setNewClientData(prev => ({ ...prev, clientPhone: formatted }));
  };
  const handleCreateClient = async () => {
    if (!newClientData.clientName.trim()) {
      setActionNotification({
        message: 'Client name is required',
        type: 'error'
      });
      return;
    }

    try {
      await createWholesaleClient({
        variables: {
          input: newClientData
        }
      });
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleToggleClientOrders = (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
      if (!clientOrders[clientId]) {
        getClientOrders({ variables: { clientId } });
      }
    }
  };

  return (
    <div className="space-y-6 mobile-content">
      <div className="flex items-center justify-between mobile-container">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#fbbf24' }}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          Client Management
        </h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mobile-container">
        <div className="container-style p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {wholesaleClients.length}
            </div>
            <div className="text-sm text-gray-300">Total Clients</div>
          </div>
        </div>
        
        <div className="container-style p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {wholesaleClients.reduce((sum, client) => sum + client.orderCount, 0)}
            </div>
            <div className="text-sm text-gray-300">Total Orders</div>
          </div>
        </div>
        
        <div className="container-style p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              ${wholesaleClients.reduce((sum, client) => sum + client.totalSpent, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-300">Total Revenue</div>
          </div>
        </div>
        
        <div className="container-style p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              ${(() => {
                // Calculate total store credit earned from all transactions
                const earnedCredits = (user as any)?.creditHistory?.transactions?.filter((transaction: any) => 
                  transaction.transactionType === 'earned'
                ) || [];
                
                const totalEarned = earnedCredits.reduce((sum: number, transaction: any) => 
                  sum + (transaction.amount || 0), 0
                );
                
                return totalEarned.toFixed(2);
              })()}
            </div>
            <div className="text-sm text-gray-300">Credits Earned</div>
          </div>
        </div>
      </div>

      {/* Add Client Button */}
      <div className="mobile-container">
        <button
          onClick={() => setShowCreateClientForm(true)}
          className="w-full md:w-auto px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Client
        </button>
      </div>

      {/* Create Client Form */}
      {showCreateClientForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="container-style max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add New Client</h3>
              <button
                onClick={() => setShowCreateClientForm(false)}
                className="text-gray-400 hover:text-white"
                title="Close form"
                aria-label="Close client form"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={newClientData.clientName}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                  placeholder="Enter client name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newClientData.clientEmail}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                  placeholder="client@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newClientData.clientPhone}
                  onChange={handlePhoneChange}
                  maxLength={12}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                  placeholder="555-123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={newClientData.clientCompany}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, clientCompany: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                  placeholder="Company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={newClientData.notes}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 h-20 resize-none"
                  placeholder="Additional notes about this client"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateClientForm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClient}
                disabled={creatingClient || !newClientData.clientName.trim()}
                className="flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                {creatingClient ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Assignment Modal */}
      {selectedClientForOrders && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="container-style max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Assign Orders to {wholesaleClients.find(c => c.id === selectedClientForOrders)?.clientName}
              </h3>
              <button
                onClick={() => {
                  setSelectedClientForOrders(null);
                  setSelectedOrdersForAssignment(new Set());
                }}
                className="text-gray-400 hover:text-white"
                title="Close modal"
                aria-label="Close order assignment modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-300">
                Select orders to assign to this client. Orders already assigned to other clients will be reassigned.
              </div>

              {/* Orders List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {orders.map((order) => {
                  const isSelected = selectedOrdersForAssignment.has(order.id);
                  const isAssigned = order._fullOrderData?.wholesaleClientId;
                  const assignedClientName = isAssigned ? 
                    wholesaleClients.find(c => c.id === order._fullOrderData?.wholesaleClientId)?.clientName : null;
                  
                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-yellow-400 bg-yellow-400/10' 
                          : 'border-white/20 bg-white/5 hover:border-white/40'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedOrdersForAssignment);
                        if (isSelected) {
                          newSelected.delete(order.id);
                        } else {
                          newSelected.add(order.id);
                        }
                        setSelectedOrdersForAssignment(newSelected);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'border-yellow-400 bg-yellow-400' : 'border-white/40'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              Order #{order.orderNumber || order.id}
                            </div>
                            <div className="text-sm text-gray-400">
                              {new Date(order.date).toLocaleDateString()} • ${order.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {isAssigned && (
                            <div className="text-xs text-blue-400">
                              Currently assigned to: {assignedClientName || 'Unknown Client'}
                            </div>
                          )}
                          <div className="text-sm text-gray-300">
                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setSelectedClientForOrders(null);
                    setSelectedOrdersForAssignment(new Set());
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (selectedOrdersForAssignment.size === 0) return;
                    
                    setAssigningOrders(true);
                    try {
                      // Assign all selected orders
                      const promises = Array.from(selectedOrdersForAssignment).map(orderId =>
                        assignOrderToClient({ variables: { orderId, clientId: selectedClientForOrders } })
                      );
                      
                      await Promise.all(promises);
                      
                      // Close modal and reset state
                      setSelectedClientForOrders(null);
                      setSelectedOrdersForAssignment(new Set());
                      
                      setActionNotification({
                        message: `Successfully assigned ${selectedOrdersForAssignment.size} order${selectedOrdersForAssignment.size > 1 ? 's' : ''}!`,
                        type: 'success'
                      });
                    } catch (error) {
                      console.error('Error assigning orders:', error);
                      setActionNotification({
                        message: 'Failed to assign some orders',
                        type: 'error'
                      });
                    } finally {
                      setAssigningOrders(false);
                    }
                  }}
                  disabled={selectedOrdersForAssignment.size === 0 || assigningOrders}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0.25) 50%, rgba(251, 191, 36, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    boxShadow: 'rgba(251, 191, 36, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  {assigningOrders ? 'Assigning...' : `Assign ${selectedOrdersForAssignment.size} Order${selectedOrdersForAssignment.size > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients List */}
      <div className="mobile-container mobile-full-width">
        {clientsLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">Loading clients...</div>
          </div>
        ) : wholesaleClients.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No clients yet</div>
            <p className="text-gray-500 text-sm">Add your first client to get started with order management.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {wholesaleClients.map((client) => (
              <div
                key={client.id}
                className="container-style p-6 space-y-4"
              >
                {/* Client Header */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{client.clientName}</h3>
                    {client.clientCompany && (
                      <p className="text-sm text-gray-300">{client.clientCompany}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      {client.clientEmail && <span>{client.clientEmail}</span>}
                      {client.clientPhone && <span>{client.clientPhone}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-300">
                      {client.orderCount} orders • ${client.totalSpent.toFixed(2)}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setSelectedClientForOrders(client.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0.25) 50%, rgba(251, 191, 36, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(251, 191, 36, 0.4)',
                          boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                          color: 'white'
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Assign Orders
                      </button>
                      <button
                        onClick={() => handleToggleClientOrders(client.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                          color: 'white'
                        }}
                      >
                        {expandedClient === client.id ? 'Hide Orders' : 'View Orders'}
                        <svg 
                          className={`w-4 h-4 transition-transform duration-200 ${expandedClient === client.id ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Client Orders */}
                {expandedClient === client.id && (
                  <div className="border-t border-white/10 pt-4">
                    {clientOrders[client.id] ? (
                      clientOrders[client.id].length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-gray-400">No orders yet for this client</div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
                            </svg>
                            Orders ({clientOrders[client.id].length})
                          </h4>
                          {clientOrders[client.id].map((order) => (
                            <div
                              key={order.id}
                              className="bg-white/5 rounded-lg p-4 border border-white/10 relative"
                            >
                              {/* Assigned Badge with Price and Items */}
                              <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                                <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                  Assigned
                                </div>
                                <div className="font-bold text-white text-lg">
                                  ${order.totalPrice.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {order.items.length} item{order.items.length > 1 ? 's' : ''}
                                </div>
                              </div>
                              
                              <div className="flex items-start justify-between pr-32">
                                <div className="flex-1">
                                  <div className="font-medium text-white mb-1">
                                    Order #{order.orderNumber}
                                  </div>
                                  <div className="text-sm text-gray-300 mb-2">
                                    {new Date(order.orderCreatedAt).toLocaleDateString()}
                                  </div>
                                  <div className="text-sm text-gray-300">
                                    Status: <span className="text-white">{order.orderStatus}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                                <button
                                  onClick={() => handleViewOrderDetails(order)}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                    backdropFilter: 'blur(25px) saturate(180%)',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                    color: 'white'
                                  }}
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                  </svg>
                                  View Details
                                </button>
                                <button
                                  onClick={() => unassignOrderFromClient({ variables: { orderId: order.id } })}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 hover:bg-red-500/20"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                                    backdropFilter: 'blur(25px) saturate(180%)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                    color: 'white'
                                  }}
                                  title="Unassign from client"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Unassign
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400">Loading orders...</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
      `}</style>
    </div>
  );
};

export default ClientsView;