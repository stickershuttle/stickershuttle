import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useQuery, gql } from '@apollo/client';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '@/utils/cloudinary';

const GET_ALL_USERS = gql`
  query GetAllUsers {
    getAllUsers {
      id
      email
      firstName
      lastName
      createdAt
    }
  }
`;

interface Creator {
  id: string;
  user_id: string;
  creator_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  profile_photo_url?: string;
  profile_photo_public_id?: string;
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface CreatorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCreator?: Creator | null;
  onCreatorSaved: () => void;
}

export default function CreatorManagementModal({
  isOpen,
  onClose,
  editingCreator,
  onCreatorSaved
}: CreatorManagementModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoPublicId, setProfilePhotoPublicId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const supabase = getSupabase();
  const { data: allUsersData, loading: allUsersLoading, error: allUsersError } = useQuery(GET_ALL_USERS);

  useEffect(() => {
    if (isOpen) {
      if (editingCreator) {
        // Editing mode - populate form with existing creator data
        setCreatorName(editingCreator.creator_name);
        setProfilePhotoUrl(editingCreator.profile_photo_url || '');
        setProfilePhotoPublicId(editingCreator.profile_photo_public_id || '');
        setSearchQuery('');
        setSelectedUser(null);
      } else {
        // Adding mode - reset form
        setCreatorName('');
        setProfilePhotoUrl('');
        setProfilePhotoPublicId('');
        setSearchQuery('');
        setSelectedUser(null);
        fetchUsers();
      }
    }
  }, [isOpen, editingCreator]);

  const fetchUsers = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    try {
      setIsLoading(true);
      
      if (!allUsersData?.getAllUsers) {
        console.warn('No user data available from GraphQL');
        setUsers([]);
        return;
      }

      // Filter users by email search query
      const filteredUsers = allUsersData.getAllUsers.filter((user: any) => 
        user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Format users for display
      const formattedUsers = filteredUsers.map((user: any) => ({
        id: user.id,
        email: user.email,
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        created_at: user.createdAt
      }));

      // Sort by creation date (newest first) and limit to 10
      const sortedUsers = formattedUsers
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error filtering users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger search when query changes or data loads
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allUsersData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCreator) {
      // Editing existing creator
      if (!creatorName.trim()) {
        alert('Please enter a creator name');
        return;
      }

      setIsLoading(true);

      try {
        const updateData = {
          creator_name: creatorName.trim(),
          profile_photo_url: profilePhotoUrl || null,
          profile_photo_public_id: profilePhotoPublicId || null,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('creators')
          .update(updateData)
          .eq('id', editingCreator.id);

        if (error) throw error;

        alert('Creator updated successfully!');
        onCreatorSaved();
        onClose();
      } catch (error) {
        console.error('Error updating creator:', error);
        alert('Error updating creator. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Adding new creator
      if (!selectedUser) {
        alert('Please select a user to assign as creator');
        return;
      }

      setIsLoading(true);

      try {
        // Check if user is already an active creator
        const { data: existingCreator } = await supabase
          .from('creators')
          .select('id, is_active')
          .eq('user_id', selectedUser.id)
          .single();

        if (existingCreator?.is_active) {
          alert('This user is already assigned as an active creator');
          return;
        }

        // If creator exists but is inactive, reactivate them instead of creating new record
        if (existingCreator && !existingCreator.is_active) {
          const { error } = await supabase
            .from('creators')
            .update({ 
              is_active: true, 
              updated_at: new Date().toISOString(),
              creator_name: `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email,
              email: selectedUser.email
            })
            .eq('user_id', selectedUser.id);

          if (error) throw error;

          alert('Creator has been reactivated successfully!');
          onCreatorSaved();
          onClose();
          return;
        }

        const creatorData = {
          user_id: selectedUser.id,
          creator_name: `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email,
          email: selectedUser.email,
          is_active: true
        };

        const { error } = await supabase
          .from('creators')
          .insert([creatorData]);

        if (error) throw error;

        onCreatorSaved();
        onClose();
      } catch (error) {
        console.error('Error saving creator:', error);
        alert('Error saving creator. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setUsers([]); // Clear search results
  };

  const handleProfilePhotoUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(null);
    
    try {
      // Validate file using the utility function
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid file');
      }

      // Upload using the same function as other components
      const result: CloudinaryUploadResult = await uploadToCloudinary(
        file,
        undefined, // No metadata needed
        (progress: UploadProgress) => {
          setUploadProgress(progress);
        },
        'creator-profiles' // folder
      );

      setProfilePhotoUrl(result.secure_url);
      setProfilePhotoPublicId(result.public_id);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleProfilePhotoUpload(file);
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const removeProfilePhoto = () => {
    setProfilePhotoUrl('');
    setProfilePhotoPublicId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="w-full max-w-md rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {editingCreator ? 'Edit Creator' : 'Add New Creator'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {allUsersError && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              Error loading users: {allUsersError.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {editingCreator ? (
                /* Editing Mode - Show creator fields */
                <>
                  {/* Creator Name */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Creator Display Name *</label>
                    <input
                      type="text"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter creator display name..."
                      required
                    />
                  </div>

                  {/* Profile Photo Upload */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Profile Picture</label>
                    
                    {/* Hidden file input */}
                    <input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                      aria-label="Upload creator profile picture"
                    />

                    {/* Current photo or upload area */}
                    {profilePhotoUrl ? (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-800 border border-white/20">
                        <img
                          src={profilePhotoUrl}
                          alt="Creator profile"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => document.getElementById('profile-photo-upload')?.click()}
                              className="p-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-xs"
                              disabled={isUploading}
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={removeProfilePhoto}
                              className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs"
                              disabled={isUploading}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="w-24 h-24 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => document.getElementById('profile-photo-upload')?.click()}
                      >
                        {isUploading ? (
                          <div className="text-center">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                            <span className="text-xs text-white/70">
                              {uploadProgress ? `${uploadProgress.percentage}%` : 'Uploading...'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="w-6 h-6 text-white/50 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs text-white/70">Add Photo</span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-gray-400 text-xs mt-2">Click to upload a profile picture for this creator</p>
                  </div>
                </>
              ) : (
                /* Adding Mode - Show user search */
                <div>
                  <div className="relative">
                    <input
                      type="email"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter user email address..."
                      required
                    />
                    {(isLoading || allUsersLoading) && (
                      <div className="absolute right-3 top-2.5">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Search Results */}
                  {users.length > 0 && (
                    <div className="mt-2 border border-white/20 rounded-lg bg-white/5 backdrop-blur-sm max-h-48 overflow-y-auto">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                        >
                          <div className="text-white font-medium">{user.email}</div>
                          {(user.first_name || user.last_name) && (
                            <div className="text-gray-400 text-sm">
                              {user.first_name} {user.last_name}
                            </div>
                          )}
                          <div className="text-gray-500 text-xs">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected User Preview - Only show in adding mode */}
              {!editingCreator && selectedUser && (
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <h3 className="text-white font-medium mb-2">Selected User:</h3>
                  <div className="text-white">{selectedUser.email}</div>
                  {(selectedUser.first_name || selectedUser.last_name) && (
                    <div className="text-gray-400 text-sm">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </div>
                  )}
                  <div className="text-gray-500 text-xs mt-1">
                    This user will be assigned as a creator and can then be assigned to products.
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || (!editingCreator && !selectedUser) || (editingCreator && !creatorName.trim())}
                className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                  color: 'white'
                }}
              >
                {isLoading 
                  ? (editingCreator ? 'Updating Creator...' : 'Adding Creator...') 
                  : (editingCreator ? 'Update Creator' : 'Add Creator')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}