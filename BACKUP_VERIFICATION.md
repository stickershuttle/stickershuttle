# 🗄️ Database Backup Verification & Recovery

## ✅ **BACKUP STATUS CHECKLIST**

### 1. **Supabase Backup Settings**
- [ ] **Daily Backups Enabled**: Verify in Supabase Dashboard → Settings → Database → Backups
- [ ] **Retention Policy**: Confirm 7-day retention minimum (recommend 30 days for production)
- [ ] **Point-in-Time Recovery**: Verify PITR is enabled for last 7 days
- [ ] **Backup Monitoring**: Check backup success logs and alerts

### 2. **Backup Verification Steps**
```bash
# Test backup accessibility
# 1. Go to Supabase Dashboard
# 2. Navigate to Settings → Database → Backups
# 3. Verify recent backups are listed
# 4. Check backup file sizes are reasonable (not 0 bytes)
# 5. Verify backup timestamps are recent (within 24 hours)
```

---

## 🔧 **RECOVERY PROCEDURES**

### **Scenario 1: Data Corruption/Loss (Partial)**
**Time to Recovery**: 15-30 minutes

**Steps**:
1. **Identify Affected Tables**
   ```sql
   -- Check table row counts
   SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
   FROM pg_stat_user_tables 
   ORDER BY n_tup_ins DESC;
   ```

2. **Restore Specific Data**
   - Use Supabase SQL Editor
   - Query backup for specific records
   - Use `INSERT ... ON CONFLICT` for safe restoration

3. **Verify Data Integrity**
   ```sql
   -- Verify critical tables
   SELECT COUNT(*) FROM orders_main WHERE created_at > NOW() - INTERVAL '7 days';
   SELECT COUNT(*) FROM user_profiles;
   SELECT COUNT(*) FROM blog_posts WHERE status = 'published';
   ```

### **Scenario 2: Complete Database Failure**
**Time to Recovery**: 1-4 hours

**Steps**:
1. **Create New Database Instance**
   - Create new Supabase project
   - Configure connection strings
   - Update environment variables

2. **Restore from Backup**
   - Download latest backup from Supabase
   - Import using `pg_restore` or Supabase import tools
   - Verify schema and data integrity

3. **Reconnect Applications**
   - Update API environment variables
   - Test all database connections
   - Verify GraphQL queries work

### **Scenario 3: Point-in-Time Recovery**
**Time to Recovery**: 30-60 minutes

**Steps**:
1. **Identify Recovery Point**
   - Determine exact timestamp before issue
   - Check application logs for last known good state

2. **Initiate PITR**
   - Use Supabase Dashboard → Database → Backups
   - Select Point-in-Time Recovery
   - Choose specific timestamp

3. **Validate Recovery**
   - Check data consistency
   - Verify recent transactions
   - Test application functionality

---

## 🚨 **CRITICAL DATA TABLES**

### **Priority 1 (CRITICAL)**
- `orders_main` - All customer orders
- `order_items` - Order line items
- `user_profiles` - Customer accounts
- `auth.users` - Authentication data

### **Priority 2 (HIGH)**
- `reviews` - Product reviews
- `credits_main` - Customer credits
- `discount_codes` - Active discounts
- `blog_posts` - Published content

### **Priority 3 (MEDIUM)**
- `credit_transactions` - Credit history
- `klaviyo_profiles` - Marketing data
- `analytics_data` - Business metrics

---

## 📊 **BACKUP MONITORING**

### **Daily Checks** (Automated)
```javascript
// Add to API health check endpoint
const backupStatus = await supabase
  .from('pg_stat_archiver')
  .select('*')
  .single();

// Monitor backup age
const lastBackup = await supabase.rpc('get_last_backup_time');
const backupAge = new Date() - new Date(lastBackup);
const isBackupCurrent = backupAge < 25 * 60 * 60 * 1000; // 25 hours
```

### **Weekly Checks** (Manual)
- [ ] Verify backup file integrity
- [ ] Test restoration of sample data
- [ ] Review backup storage usage
- [ ] Check backup retention policy

### **Monthly Checks** (Manual)
- [ ] Full backup restoration test
- [ ] Disaster recovery drill
- [ ] Update recovery documentation
- [ ] Review backup costs and optimization

---

## 🔗 **SUPABASE BACKUP CONFIGURATION**

### **Access Backup Settings**
1. **Login to Supabase Dashboard**
   - URL: https://app.supabase.com
   - Navigate to your project

2. **Database Backup Settings**
   - Go to: Settings → Database → Backups
   - Enable daily backups
   - Set retention period (recommend 30 days)

3. **Point-in-Time Recovery**
   - Enable PITR (7-day window recommended)
   - Monitor WAL archiving status

### **Backup Download Process**
```bash
# Download backup via Supabase CLI
supabase db dump --local
# Or use dashboard download feature
```

---

## 📞 **EMERGENCY CONTACTS**

### **Supabase Support**
- **Email**: support@supabase.com
- **Dashboard**: https://app.supabase.com/support
- **Response Time**: 24-48 hours (depending on plan)

### **Internal Team**
- **Database Admin**: [Add contact]
- **DevOps Lead**: [Add contact]  
- **CTO/Technical Lead**: [Add contact]

### **Escalation Process**
1. **Level 1**: Check automated backups and attempt self-recovery
2. **Level 2**: Contact Supabase support for assistance
3. **Level 3**: Engage external database consultant if needed

---

## 🧪 **RECOVERY TESTING**

### **Test Schedule**
- **Weekly**: Verify backup accessibility
- **Monthly**: Test partial data restoration
- **Quarterly**: Full disaster recovery drill

### **Test Documentation**
```
Test Date: [DATE]
Test Type: [FULL/PARTIAL/PITR]
Recovery Time: [MINUTES]
Data Integrity: [PASS/FAIL]
Issues Found: [DESCRIPTION]
Actions Taken: [STEPS]
```

---

## 📋 **IMMEDIATE ACTION ITEMS**

### **Today**
- [ ] Verify Supabase backup settings are enabled
- [ ] Check last backup timestamp
- [ ] Document current retention policy
- [ ] Test backup download process

### **This Week**
- [ ] Set up backup monitoring alerts
- [ ] Create automated backup health checks
- [ ] Train team on recovery procedures
- [ ] Test Point-in-Time Recovery

### **This Month**
- [ ] Conduct full disaster recovery drill
- [ ] Optimize backup retention policy
- [ ] Document all recovery procedures
- [ ] Create backup cost optimization plan

---

**Status**: 🟡 In Progress - Verification Required  
**Last Updated**: Today  
**Next Review**: Weekly  

**Critical**: Verify backup settings are enabled BEFORE launch! 