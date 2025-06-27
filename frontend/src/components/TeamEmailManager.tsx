import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { 
  GET_TEAM_EMAILS, 
  ADD_TEAM_EMAIL, 
  REMOVE_TEAM_EMAIL, 
  RESEND_VERIFICATION_EMAIL 
} from '../lib/team-email-mutations';
import { FiMail, FiCheck, FiX, FiAlertCircle, FiRefreshCw, FiTrash2, FiUser } from 'react-icons/fi';

interface TeamEmailManagerProps {
  userId: string;
}

interface TeamEmail {
  id: string;
  email: string;
  isVerified: boolean;
  verifiedAt: string | null;
  lastLoginAt: string | null;
  invitedAt: string;
}

const TeamEmailManager: React.FC<TeamEmailManagerProps> = ({ userId }) => {
  const [newEmail, setNewEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const { data, loading, error, refetch } = useQuery(GET_TEAM_EMAILS, {
    variables: { userId },
    skip: !userId,
  });

  const [addTeamEmail] = useMutation(ADD_TEAM_EMAIL);
  const [removeTeamEmail] = useMutation(REMOVE_TEAM_EMAIL);
  const [resendVerification] = useMutation(RESEND_VERIFICATION_EMAIL);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await addTeamEmail({
        variables: { email: newEmail }
      });
      
      if (result.data?.addTeamEmail?.success) {
        setNewEmail('');
        setShowAddForm(false);
        refetch();
        alert('Team email added! A verification email has been sent.');
      } else {
        alert(result.data?.addTeamEmail?.message || 'Failed to add team email');
      }
    } catch (err) {
      console.error('Error adding team email:', err);
      alert('Error adding team email');
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from your team?`)) {
      return;
    }
    
    try {
      const result = await removeTeamEmail({
        variables: { email }
      });
      
      if (result.data?.removeTeamEmail?.success) {
        refetch();
      } else {
        alert(result.data?.removeTeamEmail?.message || 'Failed to remove team email');
      }
    } catch (err) {
      console.error('Error removing team email:', err);
      alert('Error removing team email');
    }
  };

  const handleResendVerification = async (email: string) => {
    try {
      const result = await resendVerification({
        variables: { email }
      });
      
      if (result.data?.resendVerificationEmail?.success) {
        alert('Verification email sent!');
      } else {
        alert(result.data?.resendVerificationEmail?.message || 'Failed to send verification email');
      }
    } catch (err) {
      console.error('Error resending verification:', err);
      alert('Error resending verification email');
    }
  };

  if (loading) return <div className="text-gray-500">Loading team emails...</div>;
  if (error) return <div className="text-red-500">Error loading team emails</div>;

  const teamEmails: TeamEmail[] = data?.getTeamEmails || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Team Emails</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
          }}
        >
          {showAddForm ? 'Cancel' : 'Add Team Member'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddEmail} className="p-6 rounded-xl" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                placeholder="team-member@example.com"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full px-4 py-2 text-white font-medium rounded-lg transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Add Team Member
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {teamEmails.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiUser className="mx-auto text-4xl mb-2 opacity-50" />
            <p>No team members added yet</p>
          </div>
        ) : (
          teamEmails.map((email) => (
            <div
              key={email.id}
              className="p-4 rounded-xl flex items-center justify-between"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-full">
                  <FiMail className="text-white" />
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{email.email}</span>
                    {email.isVerified ? (
                      <span className="flex items-center text-green-400 text-sm">
                        <FiCheck className="mr-1" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center text-yellow-400 text-sm">
                        <FiAlertCircle className="mr-1" /> Pending
                      </span>
                    )}
                  </div>
                  
                  {email.lastLoginAt && (
                    <span className="text-xs text-gray-400">
                      Last login: {new Date(email.lastLoginAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!email.isVerified && (
                  <button
                    onClick={() => handleResendVerification(email.email)}
                    className="p-2 text-yellow-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Resend verification email"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={() => handleRemoveEmail(email.email)}
                  className="p-2 text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                  title="Remove team member"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {teamEmails.length > 0 && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <FiMail className="text-blue-400 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-medium text-white mb-1">How Team Access Works:</p>
              <p>Team members can log in using their email and your account password. They'll have full access to view and manage orders, just like you do.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamEmailManager; 