# Team Email Implementation Guide

## Overview

The Team Email feature allows users to add multiple email addresses to their account, enabling team members to login with their own email while sharing the same account data and using the same password.

## Features

- **Multiple Email Support**: Add up to unlimited team email addresses
- **Role-Based Permissions**: Assign roles (Admin, Member, Viewer) with different access levels
- **Email Verification**: All team emails must be verified before use
- **Shared Password**: All team emails use the primary account's password
- **Activity Tracking**: Track last login time for each team email
- **Easy Management**: Add, remove, and update permissions from the dashboard

## Database Schema

### Team Emails Table

```sql
CREATE TABLE team_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  verification_token UUID DEFAULT uuid_generate_v4(),
  is_active BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{"can_view_orders": true, "can_edit_profile": false, "can_manage_team": false}'::jsonb,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Implementation Components

### 1. Backend (API)

- **GraphQL Schema**: Added team email types and resolvers
- **Database Functions**: 
  - `add_team_email()` - Add new team email
  - `verify_team_email()` - Verify email with token
  - `authenticate_team_email()` - Check if email is team email
  - `remove_team_email()` - Remove team email
  - `get_team_emails()` - List all team emails
  - `update_team_email_permissions()` - Update role/permissions

### 2. Frontend Components

- **TeamEmailManager.tsx**: Main component for managing team emails
- **team-email-mutations.js**: GraphQL queries and mutations
- **auth.ts**: Updated authentication to support team email login
- **verify-team-email.tsx**: Verification page

### 3. Authentication Flow

1. User enters email/password on login
2. System checks if email is a primary account
3. If not, checks if it's a verified team email
4. If team email found, logs in using primary account credentials
5. Stores team email info in session for reference

## Usage Guide

### Adding a Team Email

1. Go to Account Dashboard → Settings
2. Scroll to "Team Emails" section
3. Click "Add Team Member"
4. Enter email and select role
5. Click "Add Team Member" button
6. Team member receives verification email

### Role Permissions

- **Admin**: Can view orders, edit profile, and manage team
- **Member**: Can view orders only
- **Viewer**: Can view orders only (read-only access)

### Email Verification

1. Team member receives email with verification link
2. Clicking link verifies the email
3. Verified emails can be used to login immediately

### Logging In with Team Email

1. Team member goes to login page
2. Enters their team email address
3. Enters the primary account's password
4. System logs them in with appropriate permissions

## Security Considerations

- Team emails cannot be the same as primary account email
- Each email can only be associated with one account
- Verification required before use
- All team emails share the same password (primary account's)
- Permissions are enforced at API level

## Email Templates

### Verification Email (TODO)

```html
Subject: Verify your team email for Sticker Shuttle

Hi there,

You've been invited to join a team account at Sticker Shuttle.

Click here to verify your email: 
https://stickershuttle.com/verify-team-email?token={verification_token}

This link will expire in 24 hours.

Thanks,
The Sticker Shuttle Team
```

## Future Enhancements

1. **Email Notifications**: Send actual verification emails (currently just logs token)
2. **Individual Passwords**: Option for team members to have their own passwords
3. **Activity Logs**: Detailed tracking of actions by team members
4. **Custom Permissions**: More granular permission controls
5. **Invitation System**: Send invitations that create accounts automatically
6. **Two-Factor Authentication**: Per-email 2FA settings

## Troubleshooting

### Common Issues

1. **"Email already registered"**: The email is already a primary account
2. **"Email already added to another account"**: The email is a team email elsewhere
3. **Login not working**: Ensure email is verified and using correct password
4. **Permissions not applying**: Check role settings in dashboard

### Debug Queries

```sql
-- Check team emails for a user
SELECT * FROM team_emails WHERE primary_user_id = 'USER_ID';

-- Check if email exists
SELECT * FROM team_emails WHERE email = 'team@example.com';

-- Manually verify an email (for testing)
UPDATE team_emails 
SET is_verified = true, verified_at = now() 
WHERE email = 'team@example.com';
```

## Migration Script

To apply the team email system to your database:

```bash
# Run the SQL migration
psql -U your_user -d your_database -f docs/CREATE_TEAM_EMAILS_SYSTEM.sql
``` 