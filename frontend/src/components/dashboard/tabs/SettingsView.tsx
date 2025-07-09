import React, { useEffect } from 'react';
import FileUploadToEmail from '../../FileUploadToEmail';

interface SettingsViewProps {
  user: any;
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  settingsData: any;
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  settingsNotification: any;
  setSettingsNotification: React.Dispatch<React.SetStateAction<any>>;
  isUpdatingProfile: boolean;
  setIsUpdatingProfile: (updating: boolean) => void;
  isUpdatingPassword: boolean;
  setIsUpdatingPassword: (updating: boolean) => void;
  uploadingProfilePhoto: boolean;
  setUploadingProfilePhoto: (uploading: boolean) => void;
  cachedProfilePhoto: string | null;
  setCachedProfilePhoto: (photo: string | null) => void;
  setCurrentView: (view: string) => void;
  getUserDisplayName: () => string;
  getSupabase: () => Promise<any>;
  handleProfilePictureClick: (e: React.MouseEvent) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  profile,
  setProfile,
  settingsData,
  setSettingsData,
  settingsNotification,
  setSettingsNotification,
  isUpdatingProfile,
  setIsUpdatingProfile,
  isUpdatingPassword,
  setIsUpdatingPassword,
  uploadingProfilePhoto,
  setUploadingProfilePhoto,
  cachedProfilePhoto,
  setCachedProfilePhoto,
  setCurrentView,
  getUserDisplayName,
  getSupabase,
  handleProfilePictureClick
}) => {
  // Auto-load user data when component mounts or user/profile changes
  useEffect(() => {
    if (user || profile) {
      console.log('🔄 Auto-loading user data into settings:', { user, profile });
      
      const firstName = profile?.first_name || profile?.firstName || user?.user_metadata?.first_name || '';
      const lastName = profile?.last_name || profile?.lastName || user?.user_metadata?.last_name || '';
      const companyName = profile?.company_name || profile?.companyName || '';
      const email = user?.email || '';
      
      setSettingsData((prev: any) => ({
        ...prev,
        firstName,
        lastName,
        companyName,
        email, // Auto-fill email from user auth data
      }));
      
      console.log('✅ Settings data auto-loaded:', {
        firstName,
        lastName,
        companyName,
        email
      });
    }
  }, [user, profile, setSettingsData]);
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettingsData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsUpdatingProfile(true);
    try {
      const supabase = await getSupabase();
      
      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', (user as any).id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile:', checkError);
        throw new Error('Failed to access profile data');
      }

      // Use update if profile exists, insert if it doesn't
      let profileError;
      if (existingProfile) {
        // Profile exists - update it
        const { error } = await supabase
          .from('user_profiles')
          .update({
            first_name: settingsData.firstName,
            last_name: settingsData.lastName,
            display_name: `${settingsData.firstName} ${settingsData.lastName}`.trim(),
            company_name: settingsData.companyName,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', (user as any).id);
        profileError = error;
      } else {
        // Profile doesn't exist - create it
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: (user as any).id,
            first_name: settingsData.firstName,
            last_name: settingsData.lastName,
            display_name: `${settingsData.firstName} ${settingsData.lastName}`.trim(),
            company_name: settingsData.companyName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        profileError = error;
      }

      if (profileError) {
        console.error('Profile operation error:', profileError);
        throw new Error(`Failed to save profile: ${profileError.message}`);
      }

      // Skip auth updates entirely to avoid permission issues
      console.log('Skipping auth metadata updates to prevent permission issues');
      // Update local profile state
      setProfile((prev: any) => ({
        ...prev,
        first_name: settingsData.firstName,
        last_name: settingsData.lastName,
        display_name: `${settingsData.firstName} ${settingsData.lastName}`.trim(),
        company_name: settingsData.companyName
      }));

      setSettingsNotification({
        message: 'Profile updated successfully!',
        type: 'success'
      });
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setSettingsNotification({
        message: error.message || 'Failed to update profile',
        type: 'error'
      });
    } finally {
      setIsUpdatingProfile(false);
      setTimeout(() => setSettingsNotification(null), 5000);
    }
  };

  const handleUpdatePassword = async () => {
    // Validate passwords
    if (!settingsData.currentPassword || !settingsData.newPassword) {
      setSettingsNotification({
        message: 'Please fill in all password fields',
        type: 'error'
      });
      setTimeout(() => setSettingsNotification(null), 3000);
      return;
    }

    if (settingsData.newPassword !== settingsData.confirmPassword) {
      setSettingsNotification({
        message: 'New passwords do not match',
        type: 'error'
      });
      setTimeout(() => setSettingsNotification(null), 3000);
      return;
    }

    if (settingsData.newPassword.length < 6) {
      setSettingsNotification({
        message: 'Password must be at least 6 characters',
        type: 'error'
      });
      setTimeout(() => setSettingsNotification(null), 3000);
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const supabase = await getSupabase();
      
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (user as any).email,
        password: settingsData.currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: settingsData.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Clear password fields
      setSettingsData((prev: any) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      setSettingsNotification({
        message: 'Password updated successfully!',
        type: 'success'
      });
      
      // Clear the notification after 8 seconds for success, 5 seconds for error
      setTimeout(() => setSettingsNotification(null), 8000);
      
    } catch (error: any) {
      console.error('Error updating password:', error);
      setSettingsNotification({
        message: error.message || 'Failed to update password',
        type: 'error'
      });
      
      // Clear error notifications faster
      setTimeout(() => setSettingsNotification(null), 5000);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        Settings
        </h2>
        <button 
          onClick={() => setCurrentView('default')}
          className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Enhanced Notification Banner */}
      {settingsNotification && (
        <div 
          className={`p-6 rounded-xl flex items-center justify-between transform transition-all duration-500 ease-out animate-pulse ${
            settingsNotification.type === 'success' ? 'bg-green-500/30 border-2 border-green-400/60' :
            settingsNotification.type === 'error' ? 'bg-red-500/30 border-2 border-red-400/60' :
            'bg-blue-500/30 border-2 border-blue-400/60'
          }`}
          style={{
            boxShadow: settingsNotification.type === 'success' 
              ? '0 0 30px rgba(34, 197, 94, 0.4), inset 0 0 20px rgba(34, 197, 94, 0.1)' 
              : settingsNotification.type === 'error'
              ? '0 0 30px rgba(239, 68, 68, 0.4), inset 0 0 20px rgba(239, 68, 68, 0.1)'
              : '0 0 30px rgba(59, 130, 246, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.1)',
            backdropFilter: 'blur(20px) saturate(180%)',
            animation: 'slideDown 0.5s ease-out, glow 2s ease-in-out infinite alternate'
          }}
        >
          <div className="flex items-center gap-4">
            {settingsNotification.type === 'success' && (
              <div className="w-12 h-12 rounded-full bg-green-500/40 flex items-center justify-center animate-bounce">
                <svg className="w-8 h-8 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {settingsNotification.type === 'error' && (
              <div className="w-12 h-12 rounded-full bg-red-500/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {settingsNotification.type === 'success' && <span className="text-2xl">🎉</span>}
                <span className={`font-bold text-lg ${
                  settingsNotification.type === 'success' ? 'text-green-200' :
                  settingsNotification.type === 'error' ? 'text-red-200' :
                  'text-blue-200'
                }`}>
                  {settingsNotification.type === 'success' ? 'Success!' : 
                   settingsNotification.type === 'error' ? 'Error!' : 'Info'}
                </span>
              </div>
              <span className={`text-base ${
                settingsNotification.type === 'success' ? 'text-green-100' :
                settingsNotification.type === 'error' ? 'text-red-100' :
                'text-blue-100'
              }`}>
                {settingsNotification.message}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSettingsNotification(null)}
            className="text-gray-300 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            title="Close notification"
            aria-label="Close notification"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Profile Settings Section */}
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile Settings
        </h3>
      
        <div className="space-y-6">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Profile Photo</label>
            <div className="flex items-center gap-6">
              <div 
                className="w-24 h-24 aspect-square rounded-full cursor-pointer transition-all duration-200 transform hover:scale-105 flex items-center justify-center relative group"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.2)'
                }}
                onClick={(e) => handleProfilePictureClick(e)}
                title="Click to change profile photo"
              >
                {uploadingProfilePhoto ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1"></div>
                    <span className="text-xs text-white">Uploading...</span>
                  </div>
                ) : (profile?.profile_photo_url || cachedProfilePhoto) ? (
                  <>
                    <img 
                      src={profile?.profile_photo_url || cachedProfilePhoto} 
                      alt="Profile" 
                      className="w-full h-full rounded-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold rounded-full">
                    {getUserDisplayName().charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Wholesale Indicator */}
                {profile?.isWholesaleCustomer && (
                  <div 
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white z-10"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(16, 185, 129, 0.9) 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.8)',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)',
                      backdropFilter: 'blur(4px)'
                    }}
                    title="Wholesale Customer"
                  >
                    <span className="text-[10px]">WS</span>
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={(e) => handleProfilePictureClick(e)}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  Change Photo
                </button>
                {/* Always show random avatar button */}
                <button
                  onClick={async () => {
                    if (!user || !confirm('Are you sure you want to reset your profile photo to a different random avatar?')) return;
                    
                    setUploadingProfilePhoto(true);
                    try {
                      // Get a random default avatar
                      const { getRandomAvatar } = await import('../../../utils/avatars');
                      const randomAvatar = getRandomAvatar();
                      console.log('🎭 Assigning new random avatar:', randomAvatar);

                      const supabase = await getSupabase();
                      const { error } = await supabase
                        .from('user_profiles')
                        .update({
                          profile_photo_url: randomAvatar,
                          profile_photo_public_id: null,
                          updated_at: new Date().toISOString()
                        })
                        .eq('user_id', (user as any).id);

                      if (error) throw error;

                      setProfile((prev: any) => ({
                        ...prev,
                        profile_photo_url: randomAvatar,
                        profile_photo_public_id: null
                      }));
                      
                      // Update cached photo
                      setCachedProfilePhoto(randomAvatar);
                      localStorage.setItem('userProfilePhoto', randomAvatar);

                      // Broadcast profile update to other components (like UniversalHeader)
                      window.dispatchEvent(new CustomEvent('profileUpdated', {
                        detail: {
                          profile_photo_url: randomAvatar,
                          profile_photo_public_id: null
                        }
                      }));
                      
                      setSettingsNotification({
                        message: 'Profile photo reset to new random avatar',
                        type: 'success'
                      });
                      setTimeout(() => setSettingsNotification(null), 3000);
                    } catch (error) {
                      console.error('Error resetting profile photo:', error);
                      setSettingsNotification({
                        message: 'Failed to reset profile photo',
                        type: 'error'
                      });
                      setTimeout(() => setSettingsNotification(null), 3000);
                    } finally {
                      setUploadingProfilePhoto(false);
                    }
                  }}
                  className="ml-2 px-4 py-2 rounded-lg text-blue-400 text-sm font-medium transition-all duration-200 transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                  disabled={uploadingProfilePhoto}
                >
                  {uploadingProfilePhoto ? 'Updating...' : 'New Random Avatar'}
                </button>
              </div>
            </div>
          </div>

          {/* First and Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={settingsData.firstName}
                onChange={handleSettingsChange}
                placeholder="Enter your first name"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={settingsData.lastName}
                onChange={handleSettingsChange}
                placeholder="Enter your last name"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
              Company Name (Optional)
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={settingsData.companyName}
              onChange={handleSettingsChange}
              placeholder="Enter your company name"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={settingsData.email}
              onChange={handleSettingsChange}
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Changing your email will require verification
            </p>
          </div>

          {/* Update Profile Button */}
          <button
            onClick={handleUpdateProfile}
            disabled={isUpdatingProfile}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: isUpdatingProfile 
                ? 'rgba(102, 102, 102, 0.5)' 
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: isUpdatingProfile 
                ? 'none' 
                : 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            }}
          >
            {isUpdatingProfile ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Update Profile
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Account Security Section */}
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Account Security
        </h3>
        
        <div className="space-y-4">
          {/* Current Password */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={settingsData.currentPassword}
              onChange={handleSettingsChange}
              placeholder="Enter current password"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            />
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={settingsData.newPassword}
              onChange={handleSettingsChange}
              placeholder="Enter new password"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={settingsData.confirmPassword}
              onChange={handleSettingsChange}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            />
          </div>

          {/* Update Password Button */}
          <button
            onClick={handleUpdatePassword}
            disabled={isUpdatingPassword}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: isUpdatingPassword 
                ? 'rgba(102, 102, 102, 0.5)' 
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: isUpdatingPassword 
                ? 'none' 
                : 'rgba(239, 68, 68, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            }}
          >
            {isUpdatingPassword ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Update Password
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Account Management Section */}
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Account Management
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="text-orange-300 text-sm mb-3">
              Need to delete your account? Contact our support team for assistance.
            </p>
            <button
              onClick={() => setCurrentView('support')}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.25) 50%, rgba(249, 115, 22, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                boxShadow: 'rgba(249, 115, 22, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
      
      {/* File Upload to Support Section */}
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Send File To Admin
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-2">
            Upload design files, documents, or other materials for our team to review. Your file will be sent directly to orbit@stickershuttle.com.
          </p>
        </div>
        
        <FileUploadToEmail
          userData={{
            email: (user as any)?.email || '',
            name: getUserDisplayName()
          }}
          onUploadComplete={(success) => {
            if (success) {
              setSettingsNotification({
                message: 'File uploaded and sent successfully!',
                type: 'success'
              });
              setTimeout(() => setSettingsNotification(null), 5000);
            } else {
              setSettingsNotification({
                message: 'Failed to upload file. Please try again.',
                type: 'error'
              });
              setTimeout(() => setSettingsNotification(null), 5000);
            }
          }}
        />
      </div>
    </div>
  );
};

export default SettingsView; 