const axios = require('axios');

class KlaviyoClient {
  constructor() {
    this.apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
    this.publicKey = process.env.KLAVIYO_PUBLIC_API_KEY;
    this.baseURL = 'https://a.klaviyo.com/api';
    
    // Multiple list support
    this.lists = {
      default: process.env.KLAVIYO_DEFAULT_LIST_ID,
      winback: process.env.KLAVIYO_WINBACK_LIST_ID,
      repeat: process.env.KLAVIYO_REPEAT_LIST_ID,
      newsletter: process.env.KLAVIYO_NEWSLETTER_LIST_ID
    };
    
    this.defaultListId = this.lists.default; // Backward compatibility
    
    if (!this.apiKey) {
      console.warn('KLAVIYO_PRIVATE_API_KEY not found in environment variables');
    }
    
    console.log('🎯 Klaviyo Lists Configured:', {
      default: this.lists.default ? '✅' : '❌',
      winback: this.lists.winback ? '✅' : '❌', 
      repeat: this.lists.repeat ? '✅' : '❌',
      newsletter: this.lists.newsletter ? '✅' : '❌'
    });
  }

  // Create axios instance with proper headers
  getClient() {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15'
      }
    });
  }

  // Create or update a profile in Klaviyo
  async createOrUpdateProfile(profileData) {
    try {
      const client = this.getClient();
      
      const payload = {
        data: {
          type: 'profile',
          attributes: {
            email: profileData.email,
            first_name: profileData.firstName || '',
            last_name: profileData.lastName || '',
            phone_number: profileData.phone || '',
            location: {
              city: profileData.city || '',
              region: profileData.state || '',
              country: profileData.country || 'US'
            },
            properties: {
              total_orders: profileData.totalOrders || 0,
              total_spent: profileData.totalSpent || 0,
              average_order_value: profileData.averageOrderValue || 0,
              first_order_date: profileData.firstOrderDate || null,
              last_order_date: profileData.lastOrderDate || null,
              marketing_source: 'Sticker Shuttle Website',
              customer_type: profileData.totalOrders > 1 ? 'returning' : 'new'
            }
          }
        }
      };

      const response = await client.post('/profiles/', payload);
      console.log('✅ Klaviyo profile created/updated:', profileData.email);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating/updating Klaviyo profile:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get profile by email
  async getProfileByEmail(email) {
    try {
      const client = this.getClient();
      const response = await client.get(`/profiles/?filter=equals(email,"${email}")`);
      
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching Klaviyo profile:', error.response?.data || error.message);
      return null;
    }
  }

  // Subscribe profile to a list
  async subscribeToList(email, listId = null) {
    try {
      const targetListId = listId || this.defaultListId;
      if (!targetListId) {
        throw new Error('No list ID provided and no default list configured');
      }

      const client = this.getClient();
      
      // First, get or create the profile
      let profile = await this.getProfileByEmail(email);
      if (!profile) {
        // Create basic profile if it doesn't exist
        await this.createOrUpdateProfile({ email });
        profile = await this.getProfileByEmail(email);
      }

      if (!profile) {
        throw new Error('Failed to create or retrieve profile');
      }

      // Subscribe to list
      const payload = {
        data: [
          {
            type: 'profile',
            id: profile.id
          }
        ]
      };

      await client.post(`/lists/${targetListId}/relationships/profiles/`, payload);
      console.log('✅ Subscribed to Klaviyo list:', email);
      
      return { success: true, profileId: profile.id };
    } catch (error) {
      console.error('❌ Error subscribing to Klaviyo list:', error.response?.data || error.message);
      throw error;
    }
  }

  // Unsubscribe profile from a list
  async unsubscribeFromList(email, listId = null) {
    try {
      const targetListId = listId || this.defaultListId;
      if (!targetListId) {
        throw new Error('No list ID provided and no default list configured');
      }

      const client = this.getClient();
      
      // Get the profile
      const profile = await this.getProfileByEmail(email);
      if (!profile) {
        console.log('Profile not found in Klaviyo:', email);
        return { success: true, message: 'Profile not found' };
      }

      // Unsubscribe from list
      await client.delete(`/lists/${targetListId}/relationships/profiles/`, {
        data: {
          data: [
            {
              type: 'profile',
              id: profile.id
            }
          ]
        }
      });

      console.log('✅ Unsubscribed from Klaviyo list:', email);
      return { success: true, profileId: profile.id };
    } catch (error) {
      console.error('❌ Error unsubscribing from Klaviyo list:', error.response?.data || error.message);
      throw error;
    }
  }

  // Check if profile is subscribed to a list
  async isSubscribedToList(email, listId = null) {
    try {
      const targetListId = listId || this.defaultListId;
      if (!targetListId) {
        return false;
      }

      const client = this.getClient();
      const profile = await this.getProfileByEmail(email);
      
      if (!profile) {
        return false;
      }

      // Check list membership
      const response = await client.get(`/lists/${targetListId}/profiles/?filter=equals(id,"${profile.id}")`);
      return response.data.data && response.data.data.length > 0;
    } catch (error) {
      console.error('❌ Error checking Klaviyo subscription status:', error.response?.data || error.message);
      return false;
    }
  }

  // Sync customer data from your database to Klaviyo
  async syncCustomerToKlaviyo(customerData) {
    try {
      // Create/update profile
      await this.createOrUpdateProfile(customerData);

      // Handle subscription status
      if (customerData.marketingOptIn) {
        await this.subscribeToList(customerData.email);
      } else {
        await this.unsubscribeFromList(customerData.email);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error syncing customer to Klaviyo:', error);
      return { success: false, error: error.message };
    }
  }

  // Track custom events (like order placed, proof approved, etc.)
  async trackEvent(email, eventName, properties = {}) {
    try {
      const client = this.getClient();
      
      const payload = {
        data: {
          type: 'event',
          attributes: {
            profile: {
              email: email
            },
            metric: {
              name: eventName
            },
            properties: {
              ...properties,
              timestamp: new Date().toISOString()
            }
          }
        }
      };

      await client.post('/events/', payload);
      console.log('✅ Klaviyo event tracked:', eventName, 'for', email);
      return { success: true };
    } catch (error) {
      console.error('❌ Error tracking Klaviyo event:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Get all lists
  async getLists() {
    try {
      const client = this.getClient();
      const response = await client.get('/lists/');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching Klaviyo lists:', error.response?.data || error.message);
      return [];
    }
  }

  // Get all segments
  async getSegments() {
    try {
      const client = this.getClient();
      const response = await client.get('/segments/');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching Klaviyo segments:', error.response?.data || error.message);
      return [];
    }
  }

  // Get profiles from a segment
  async getProfilesFromSegment(segmentId, limit = 100, cursor = null) {
    try {
      const client = this.getClient();
      let url = `/segments/${segmentId}/profiles/?page[size]=${limit}`;
      
      if (cursor) {
        url += `&page[cursor]=${cursor}`;
      }
      
      const response = await client.get(url);
      
      return {
        success: true,
        profiles: response.data.data || [],
        nextCursor: response.data.links?.next ? this.extractCursor(response.data.links.next) : null,
        total: response.data.data?.length || 0,
        segmentId
      };
    } catch (error) {
      console.error('❌ Error fetching profiles from Klaviyo segment:', error.response?.data || error.message);
      return {
        success: false,
        profiles: [],
        nextCursor: null,
        total: 0,
        segmentId,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  // Get configured lists info
  getConfiguredLists() {
    return {
      success: true,
      lists: Object.entries(this.lists)
        .filter(([key, id]) => id) // Only include configured lists
        .map(([key, id]) => ({
          id,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          type: key,
          configured: true
        }))
    };
  }

  // Get all profiles from Klaviyo
  async getAllProfiles(limit = 100, cursor = null) {
    try {
      const client = this.getClient();
      let url = `/profiles/?page[size]=${limit}`;
      
      if (cursor) {
        url += `&page[cursor]=${cursor}`;
      }
      
      const response = await client.get(url);
      
      return {
        success: true,
        profiles: response.data.data || [],
        nextCursor: response.data.links?.next ? this.extractCursor(response.data.links.next) : null,
        total: response.data.data?.length || 0
      };
    } catch (error) {
      console.error('❌ Error fetching Klaviyo profiles:', error.response?.data || error.message);
      return {
        success: false,
        profiles: [],
        nextCursor: null,
        total: 0,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  // Extract cursor from pagination URL
  extractCursor(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('page[cursor]');
    } catch {
      return null;
    }
  }

  // Get all profiles from a specific list
  async getProfilesFromList(listId, limit = 100, cursor = null) {
    try {
      const client = this.getClient();
      let url = `/lists/${listId}/profiles/?page[size]=${limit}`;
      
      if (cursor) {
        url += `&page[cursor]=${cursor}`;
      }
      
      const response = await client.get(url);
      
      return {
        success: true,
        profiles: response.data.data || [],
        nextCursor: response.data.links?.next ? this.extractCursor(response.data.links.next) : null,
        total: response.data.data?.length || 0,
        listId
      };
    } catch (error) {
      console.error('❌ Error fetching profiles from Klaviyo list:', error.response?.data || error.message);
      return {
        success: false,
        profiles: [],
        nextCursor: null,
        total: 0,
        listId,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  // Get profiles from all configured lists
  async getProfilesFromAllLists(limit = 100) {
    console.log('🔍 Getting profiles from all configured lists...');
    console.log('📋 Configured lists:', this.lists);
    
    const allProfiles = [];
    const results = {
      success: true,
      totalProfiles: 0,
      profilesByList: {},
      errors: []
    };

    for (const [listType, listId] of Object.entries(this.lists)) {
      if (!listId) {
        console.log(`⚠️ Skipping ${listType} - no list ID configured`);
        continue;
      }

      console.log(`🔍 Fetching profiles from ${listType} list (${listId})...`);
      
      try {
        const listResult = await this.getProfilesFromList(listId, limit);
        console.log(`📊 ${listType} result:`, {
          success: listResult.success,
          profileCount: listResult.profiles?.length || 0,
          error: listResult.error
        });
        
        if (listResult.success) {
          results.profilesByList[listType] = {
            listId,
            profiles: listResult.profiles,
            count: listResult.total
          };
          
          // Add profiles to combined list (avoid duplicates by email)
          listResult.profiles.forEach(profile => {
            if (!allProfiles.find(p => p.attributes?.email === profile.attributes?.email)) {
              allProfiles.push({
                ...profile,
                listMembership: [listType]
              });
            } else {
              // Add list membership to existing profile
              const existingProfile = allProfiles.find(p => p.attributes?.email === profile.attributes?.email);
              if (existingProfile && !existingProfile.listMembership.includes(listType)) {
                existingProfile.listMembership.push(listType);
              }
            }
          });
          
          results.totalProfiles += listResult.total;
        } else {
          console.error(`❌ Error fetching from ${listType}:`, listResult.error);
          results.errors.push({
            listType,
            listId,
            error: listResult.error
          });
        }
      } catch (error) {
        console.error(`❌ Exception fetching from ${listType}:`, error.message);
        results.errors.push({
          listType,
          listId,
          error: error.message
        });
      }
    }

    console.log('✅ Final results:', {
      totalProfiles: results.totalProfiles,
      uniqueProfiles: allProfiles.length,
      errors: results.errors.length
    });

    return {
      ...results,
      allProfiles,
      uniqueProfiles: allProfiles.length
    };
  }

  // Get profiles from all lists AND segments with full pagination
  async getAllKlaviyoProfiles(maxPerSource = 1000) {
    console.log('🔍 Getting ALL profiles from Klaviyo (lists + segments)...');
    console.log(`📊 Max profiles per source: ${maxPerSource}`);
    
    const allProfiles = [];
    const results = {
      success: true,
      totalProfiles: 0,
      profilesBySource: {},
      errors: []
    };

    try {
      // Get all lists
      console.log('📋 Fetching all lists...');
      const lists = await this.getLists();
      
      for (const list of lists) {
        console.log(`🔍 Fetching ALL profiles from list: ${list.attributes?.name} (${list.id})...`);
        
        try {
          const allListProfiles = await this.getAllProfilesFromSource('list', list.id, maxPerSource);
          
          if (allListProfiles.success && allListProfiles.profiles.length > 0) {
            const sourceName = `List: ${list.attributes?.name}`;
            results.profilesBySource[sourceName] = {
              id: list.id,
              type: 'list',
              profiles: allListProfiles.profiles,
              count: allListProfiles.profiles.length
            };
            
            // Add profiles (avoid duplicates)
            allListProfiles.profiles.forEach(profile => {
              if (!allProfiles.find(p => p.attributes?.email === profile.attributes?.email)) {
                allProfiles.push({
                  ...profile,
                  sources: [sourceName]
                });
              } else {
                const existingProfile = allProfiles.find(p => p.attributes?.email === profile.attributes?.email);
                if (existingProfile && !existingProfile.sources.includes(sourceName)) {
                  existingProfile.sources.push(sourceName);
                }
              }
            });
            
            results.totalProfiles += allListProfiles.profiles.length;
            console.log(`✅ ${sourceName}: ${allListProfiles.profiles.length} profiles (${allListProfiles.pages} pages)`);
          } else if (!allListProfiles.success) {
            console.log(`⚠️ ${list.attributes?.name}: ${allListProfiles.error}`);
            results.errors.push({
              source: `List: ${list.attributes?.name}`,
              error: allListProfiles.error
            });
          } else {
            console.log(`📭 ${list.attributes?.name}: 0 profiles`);
          }
        } catch (error) {
          console.error(`❌ Error fetching list ${list.attributes?.name}:`, error.message);
          results.errors.push({
            source: `List: ${list.attributes?.name}`,
            error: error.message
          });
        }
      }

      // Get all segments  
      console.log('🎯 Fetching all segments...');
      const segments = await this.getSegments();
      
      for (const segment of segments) {
        console.log(`🔍 Fetching ALL profiles from segment: ${segment.attributes?.name} (${segment.id})...`);
        
        try {
          const allSegmentProfiles = await this.getAllProfilesFromSource('segment', segment.id, maxPerSource);
          
          if (allSegmentProfiles.success && allSegmentProfiles.profiles.length > 0) {
            const sourceName = `Segment: ${segment.attributes?.name}`;
            results.profilesBySource[sourceName] = {
              id: segment.id,
              type: 'segment',
              profiles: allSegmentProfiles.profiles,
              count: allSegmentProfiles.profiles.length
            };
            
            // Add profiles (avoid duplicates)
            allSegmentProfiles.profiles.forEach(profile => {
              if (!allProfiles.find(p => p.attributes?.email === profile.attributes?.email)) {
                allProfiles.push({
                  ...profile,
                  sources: [sourceName]
                });
              } else {
                const existingProfile = allProfiles.find(p => p.attributes?.email === profile.attributes?.email);
                if (existingProfile && !existingProfile.sources.includes(sourceName)) {
                  existingProfile.sources.push(sourceName);
                }
              }
            });
            
            results.totalProfiles += allSegmentProfiles.profiles.length;
            console.log(`✅ ${sourceName}: ${allSegmentProfiles.profiles.length} profiles (${allSegmentProfiles.pages} pages)`);
          } else if (!allSegmentProfiles.success) {
            console.log(`⚠️ ${segment.attributes?.name}: ${allSegmentProfiles.error}`);
            results.errors.push({
              source: `Segment: ${segment.attributes?.name}`,
              error: allSegmentProfiles.error
            });
          } else {
            console.log(`📭 ${segment.attributes?.name}: 0 profiles`);
          }
        } catch (error) {
          console.error(`❌ Error fetching segment ${segment.attributes?.name}:`, error.message);
          results.errors.push({
            source: `Segment: ${segment.attributes?.name}`,
            error: error.message
          });
        }
      }

    } catch (error) {
      console.error('❌ Error in getAllKlaviyoProfiles:', error.message);
      results.success = false;
      results.errors.push({ error: error.message });
    }

    console.log('🎉 Final ALL profiles results:', {
      totalFromSources: results.totalProfiles,
      uniqueProfiles: allProfiles.length,
      sources: Object.keys(results.profilesBySource).length,
      errors: results.errors.length
    });

    return {
      ...results,
      allProfiles,
      uniqueProfiles: allProfiles.length
    };
  }

  // Helper method to get all profiles from a source with pagination
  async getAllProfilesFromSource(sourceType, sourceId, maxProfiles = 1000) {
    const allProfiles = [];
    let cursor = null;
    let pages = 0;
    const pageSize = 100; // Klaviyo's max

    try {
      do {
        pages++;
        console.log(`  📄 Fetching page ${pages}...`);
        
        let result;
        if (sourceType === 'list') {
          result = await this.getProfilesFromList(sourceId, pageSize, cursor);
        } else {
          result = await this.getProfilesFromSegment(sourceId, pageSize, cursor);
        }

        if (!result.success) {
          return {
            success: false,
            error: result.error,
            profiles: allProfiles,
            pages: pages - 1
          };
        }

        allProfiles.push(...result.profiles);
        cursor = result.nextCursor;

        // Stop if we hit our limit or no more pages
        if (allProfiles.length >= maxProfiles || !cursor) {
          break;
        }

        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 100));

      } while (cursor && allProfiles.length < maxProfiles);

      return {
        success: true,
        profiles: allProfiles.slice(0, maxProfiles), // Trim to exact limit
        pages,
        hasMore: Boolean(cursor)
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        profiles: allProfiles,
        pages
      };
    }
  }

  // Bulk sync customers (for initial migration)
  async bulkSyncCustomers(customers) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    console.log(`🔄 Starting bulk sync of ${customers.length} customers to Klaviyo...`);

    for (const customer of customers) {
      try {
        await this.syncCustomerToKlaviyo(customer);
        results.success++;
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: customer.email,
          error: error.message
        });
      }
    }

    console.log('✅ Bulk sync completed:', results);
    return results;
  }
}

module.exports = new KlaviyoClient(); 