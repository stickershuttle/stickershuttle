import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADD_USER_CREDITS,
  ADD_CREDITS_TO_ALL_USERS,
  GET_ALL_CREDIT_TRANSACTIONS,
  GET_USER_CREDIT_HISTORY,
  GET_ALL_USERS
} from '../../lib/credit-mutations';
import dynamic from 'next/dynamic';
import 'react-datepicker/dist/react-datepicker.css';

// Dynamic import for date picker
const DatePicker = dynamic<any>(() => import('react-datepicker'), { ssr: false });

interface CreditTransaction {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  balance: number;
  reason: string;
  transactionType: string;
  orderId?: string;
  orderNumber?: string;
  createdAt: string;
  createdBy?: string;
  expiresAt?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
}

function AdminCredits() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [showAddToAllModal, setShowAddToAllModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // New search functionality states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const itemsPerPage = 20;

  // GraphQL mutations and queries
  const [addUserCredits] = useMutation(ADD_USER_CREDITS);
  const [addCreditsToAllUsers] = useMutation(ADD_CREDITS_TO_ALL_USERS);

  // GraphQL query for all users
  const { data: usersData, loading: loadingUsersQuery, error: usersError, refetch: refetchUsers } = useQuery(
    GET_ALL_USERS,
    {
      errorPolicy: 'all'
    }
  );

  // GraphQL query for credit transactions
  const { data: transactionsData, loading: loadingTransactions, error: transactionsError, refetch: refetchTransactions } = useQuery(
    GET_ALL_CREDIT_TRANSACTIONS,
    {
      variables: {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      },
      errorPolicy: 'all'
    }
  );

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (transactionsData?.getAllCreditTransactions) {
      setTransactions(transactionsData.getAllCreditTransactions.transactions || []);
      setTotalCount(transactionsData.getAllCreditTransactions.totalCount || 0);
    }
    
    // Log error if credit system is not set up
    if (transactionsError) {
      console.error('Error loading credit transactions:', transactionsError);
      console.warn('Credit system may not be set up. Please run the SQL scripts in Supabase:');
      console.warn('1. docs/CREATE_CREDITS_SYSTEM.sql');
      console.warn('2. docs/ADD_CREDITS_APPLIED_COLUMN.sql');
      
      // Set empty defaults on error
      setTransactions([]);
      setTotalCount(0);
    }
  }, [transactionsData, transactionsError]);

  useEffect(() => {
    if (usersData?.getAllUsers) {
      const formattedUsers = usersData.getAllUsers.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.firstName || user.lastName 
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
          : user.email?.split('@')[0] || 'Unknown User',
        company: user.company || ''
      }));
      setUsers(formattedUsers);
      setLoadingUsers(false);
    }
    
    if (usersError) {
      console.error('Error loading users:', usersError);
      setUsers([]);
      setLoadingUsers(false);
    }
  }, [usersData, usersError]);

  // Filter users based on search term
  useEffect(() => {
    if (userSearchTerm.trim() === '') {
      setFilteredUsers([]);
      setShowUserDropdown(false);
      return;
    }

    const filtered = users.filter(user => 
      user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (user.company && user.company.toLowerCase().includes(userSearchTerm.toLowerCase()))
    ).slice(0, 10); // Limit to 10 results

    setFilteredUsers(filtered);
    setShowUserDropdown(filtered.length > 0);
  }, [userSearchTerm, users]);

  const checkAuth = async () => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const isAdmin = session.user.email === 'justin@stickershuttle.com';
      
      if (!isAdmin) {
        router.push('/account/dashboard');
        return;
      }

      setIsAuthorized(true);
      setLoadingUsers(loadingUsersQuery);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCredits = async () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      alert('Please enter a valid credit amount');
      return;
    }

    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    try {
      const { data } = await addUserCredits({
        variables: {
          input: {
            userId: selectedUser.id,
            amount: parseFloat(creditAmount),
            reason: creditReason || 'Store credit added by admin',
            expiresAt: expiryDate?.toISOString()
          }
        }
      });

      if (data?.addUserCredits?.success) {
        alert('Credits added successfully!');
        setShowAddCreditModal(false);
        setCreditAmount('');
        setCreditReason('');
        setExpiryDate(null);
        setSelectedUser(null);
        setUserSearchTerm('');
        refetchTransactions();
      } else {
        alert(data?.addUserCredits?.error || 'Failed to add credits');
      }
    } catch (error) {
      console.error('Error adding credits:', error);
      alert('Failed to add credits');
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserSearchTerm(user.name + ' (' + user.email + ')');
    setShowUserDropdown(false);
  };

  const clearUserSelection = () => {
    setSelectedUser(null);
    setUserSearchTerm('');
    setShowUserDropdown(false);
  };

  const handleAddToAllUsers = async () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      alert('Please enter a valid credit amount');
      return;
    }

    const confirmMessage = `Are you sure you want to add $${creditAmount} credits to ALL users?`;
    if (!confirm(confirmMessage)) return;

    try {
      const { data } = await addCreditsToAllUsers({
        variables: {
          amount: parseFloat(creditAmount),
          reason: creditReason || 'Promotional credit'
        }
      });

      if (data?.addCreditsToAllUsers?.success) {
        alert(`Credits added to ${data.addCreditsToAllUsers.usersUpdated} users!`);
        setShowAddToAllModal(false);
        setCreditAmount('');
        setCreditReason('');
        refetchTransactions();
      } else {
        alert(data?.addCreditsToAllUsers?.error || 'Failed to add credits');
      }
    } catch (error) {
      console.error('Error adding credits to all users:', error);
      alert('Failed to add credits');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'add':
        return '➕';
      case 'used':
        return '💳';
      case 'deduct':
        return '➖';
      default:
        return '💰';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'text-green-400';
      case 'used':
        return 'text-blue-400';
      case 'deduct':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const filteredTransactions = transactions.filter(t =>
    t.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminLayout>
      <style jsx global>{`
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        @media (max-width: 768px) {
          .mobile-credit-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
            backdrop-filter: blur(12px);
          }
          
          .mobile-credit-card:active {
            transform: scale(0.98);
          }
        }
      `}</style>
      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#030140' }}>
                  <div className="w-full py-6 xl:py-8 pl-2 pr-4 sm:pr-6 xl:pr-8"> {/* Reduced left padding, keep right padding */}
          {/* Stats Cards - Mobile and Desktop */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6 xl:mb-8">
            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Credits Issued</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">
                {formatCurrency(transactions.filter(t => t.transactionType === 'add').reduce((sum, t) => sum + t.amount, 0))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                total issued
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Credits Used</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">
                {formatCurrency(transactions.filter(t => t.transactionType === 'used').reduce((sum, t) => sum + t.amount, 0))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                total used
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Active Users</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">
                {new Set(transactions.map(t => t.userId)).size}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                with credits
              </div>
            </div>

            <div className="glass-container rounded-xl p-4 xl:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs xl:text-sm">Total Transactions</span>
                <svg className="w-4 h-4 xl:w-5 xl:h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-xl xl:text-2xl font-bold text-white">{totalCount}</div>
              <div className="text-xs text-gray-500 mt-1">
                all time
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddCreditModal(true)}
              className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Credits</span>
              </div>
            </button>
            <button
              onClick={() => setShowAddToAllModal(true)}
              className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.4) 0%, rgba(147, 51, 234, 0.25) 50%, rgba(147, 51, 234, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(147, 51, 234, 0.4)',
                boxShadow: '0 8px 32px rgba(147, 51, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Add to All Users</span>
              </div>
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by email, name, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            />
          </div>

          {/* Transactions Table */}
          <div className="glass-container rounded-2xl overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400">No credit transactions found.</div>
              </div>
            ) : (
              <>
                {/* Mobile/Tablet Transaction List */}
                <div className="xl:hidden">
                  <div className="space-y-3 p-4">
                    {filteredTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className={`mobile-credit-card rounded-xl p-4 transition-all duration-200 ${
                          transaction.transactionType === 'add' 
                            ? 'border-green-500/40 bg-green-900/10' 
                            : transaction.transactionType === 'used'
                            ? 'border-blue-500/40 bg-blue-900/10'
                            : 'border-red-500/40 bg-red-900/10'
                        }`}
                        style={{
                          ...(transaction.transactionType === 'add' && {
                            borderColor: 'rgba(34, 197, 94, 0.4)',
                            background: 'rgba(34, 197, 94, 0.05)',
                          }),
                          ...(transaction.transactionType === 'used' && {
                            borderColor: 'rgba(59, 130, 246, 0.4)',
                            background: 'rgba(59, 130, 246, 0.05)',
                          }),
                          ...(transaction.transactionType === 'deduct' && {
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            background: 'rgba(239, 68, 68, 0.05)',
                          })
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-white">
                              {transaction.userName}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">{transaction.userEmail}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.transactionType === 'add' 
                              ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                              : transaction.transactionType === 'used'
                              ? 'bg-blue-900/30 text-blue-300 border border-blue-500/30'
                              : 'bg-red-900/30 text-red-300 border border-red-500/30'
                          }`}>
                            {getTransactionIcon(transaction.transactionType)} {transaction.transactionType === 'add' ? 'Earned' : transaction.transactionType.charAt(0).toUpperCase() + transaction.transactionType.slice(1)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">Amount</span>
                            <p className={`text-white font-semibold ${transaction.transactionType === 'add' ? 'text-green-400' : 'text-red-400'}`}>
                              {transaction.transactionType === 'add' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Date</span>
                            <p className="text-white">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <span className="text-gray-500 text-xs">Reason</span>
                          <p className="text-white">{transaction.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden xl:block">
                  <table className="min-w-full">
                    <thead className="border-b border-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Order</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-sm text-white">{transaction.userName}</div>
                            <div className="text-xs text-gray-400 mt-1">{transaction.userEmail}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.transactionType === 'add' 
                                ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                                : transaction.transactionType === 'used'
                                ? 'bg-blue-900/30 text-blue-300 border border-blue-500/30'
                                : 'bg-red-900/30 text-red-300 border border-red-500/30'
                            }`}>
                              {getTransactionIcon(transaction.transactionType)} {transaction.transactionType === 'add' ? 'Earned' : transaction.transactionType.charAt(0).toUpperCase() + transaction.transactionType.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold">
                            <span className={transaction.transactionType === 'add' ? 'text-green-400' : 'text-red-400'}>
                              {transaction.transactionType === 'add' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">{transaction.reason}</td>
                          <td className="px-6 py-4">
                            {transaction.orderNumber ? (
                              <button
                                onClick={() => router.push(`/admin/orders/${transaction.orderNumber}`)}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                View Order
                              </button>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">{formatDate(transaction.createdAt)}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {transaction.expiresAt ? formatDate(transaction.expiresAt) : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                <p className="text-gray-400 text-sm">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} transactions
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage * itemsPerPage >= totalCount}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Credit Modal */}
        {showAddCreditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div 
              className="rounded-2xl p-6 max-w-md w-full"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Add Credits to User</h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search User</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Search by name, email, or company..."
                      className="w-full px-4 py-3 pr-10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)'
                      }}
                      onFocus={() => userSearchTerm && setShowUserDropdown(filteredUsers.length > 0)}
                    />
                    {selectedUser && (
                      <button
                        onClick={clearUserSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        title="Clear selection"
                        aria-label="Clear user selection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* User Dropdown */}
                  {showUserDropdown && filteredUsers.length > 0 && (
                    <div 
                      className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10 max-h-60 overflow-y-auto"
                      style={{
                        background: 'rgba(30, 58, 138, 0.9)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                        >
                          <div className="text-white font-medium">{user.name}</div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                          {user.company && (
                            <div className="text-gray-500 text-xs">{user.company}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="Store credit for..."
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date (Optional)</label>
                  <DatePicker
                    selected={expiryDate}
                    onChange={(date: Date | null) => setExpiryDate(date)}
                    minDate={new Date()}
                    placeholderText="Never expires"
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    dateFormat="MM/dd/yyyy"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddCredits}
                  disabled={!selectedUser || !creditAmount || parseFloat(creditAmount) <= 0}
                  className="flex-1 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  Add Credits
                </button>
                <button
                  onClick={() => {
                    setShowAddCreditModal(false);
                    setCreditAmount('');
                    setCreditReason('');
                    setExpiryDate(null);
                    setSelectedUser(null);
                    setUserSearchTerm('');
                  }}
                  className="flex-1 px-6 py-3 rounded-lg font-medium text-white transition-colors"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to All Users Modal */}
        {showAddToAllModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div 
              className="rounded-2xl p-6 max-w-md w-full"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Add Credits to All Users</h2>
              
              <div 
                className="rounded-lg p-4 mb-6"
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <p className="text-amber-300 text-sm">
                  ⚠️ This will add credits to ALL {users.length} users in the system. This action cannot be undone.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="Promotional credit..."
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddToAllUsers}
                  disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                  className="flex-1 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.4) 0%, rgba(147, 51, 234, 0.25) 50%, rgba(147, 51, 234, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(147, 51, 234, 0.4)',
                    boxShadow: 'rgba(147, 51, 234, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  Add to All Users
                </button>
                <button
                  onClick={() => {
                    setShowAddToAllModal(false);
                    setCreditAmount('');
                    setCreditReason('');
                  }}
                  className="flex-1 px-6 py-3 rounded-lg font-medium text-white transition-colors"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          :global(.react-datepicker-wrapper) {
            width: 100% !important;
          }
          
          :global(.react-datepicker__input-container) {
            width: 100% !important;
          }
          
          :global(.react-datepicker__input-container input) {
            width: 100% !important;
            padding: 0.75rem 1rem !important;
            border-radius: 0.5rem !important;
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            backdrop-filter: blur(12px) !important;
            color: white !important;
          }
          
          :global(.react-datepicker) {
            background: rgba(31, 41, 55, 0.95) !important;
            backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 0.75rem !important;
          }
          
          :global(.react-datepicker__header) {
            background: rgba(55, 65, 81, 0.8) !important;
            backdrop-filter: blur(12px) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 0.75rem 0.75rem 0 0 !important;
          }
          
          :global(.react-datepicker__current-month) {
            color: white !important;
          }
          
          :global(.react-datepicker__day-name) {
            color: #9ca3af !important;
          }
          
          :global(.react-datepicker__day) {
            color: white !important;
          }
          
          :global(.react-datepicker__day:hover) {
            background: rgba(59, 130, 246, 0.3) !important;
            border-radius: 0.375rem !important;
          }
          
          :global(.react-datepicker__day--selected) {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%) !important;
            border: 1px solid rgba(59, 130, 246, 0.4) !important;
            border-radius: 0.375rem !important;
          }
          
          :global(.react-datepicker__day--keyboard-selected) {
            background: rgba(59, 130, 246, 0.2) !important;
            border-radius: 0.375rem !important;
          }
          
          :global(.react-datepicker__navigation) {
            top: 1rem !important;
          }
          
          :global(.react-datepicker__navigation--previous) {
            border-right-color: white !important;
          }
          
          :global(.react-datepicker__navigation--next) {
            border-left-color: white !important;
          }
        `}</style>
      </AdminLayout>
    );
  }

export default AdminCredits; 