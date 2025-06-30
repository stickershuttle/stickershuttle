# 🧪 Critical Path Testing Checklist

## 🎯 **TESTING OVERVIEW**

**Objective**: Verify all critical user journeys work flawlessly before launch  
**Priority**: CRITICAL - Must be completed before any public access  
**Time Estimate**: 6-8 hours comprehensive testing  

---

## 🛒 **FLOW 1: COMPLETE CHECKOUT JOURNEY (CRITICAL)**

### **Test Case 1.1: Guest Checkout**
**Priority**: CRITICAL ⚠️
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Navigate to product page (e.g., vinyl stickers)
2. [ ] Configure product options (size, material, cut, quantity)
3. [ ] Upload design file (test with different formats: PNG, JPG, PDF, SVG)
4. [ ] Add to cart
5. [ ] Proceed to checkout as guest
6. [ ] Enter shipping information
7. [ ] Enter billing information
8. [ ] Apply discount code (if available)
9. [ ] Complete Stripe payment
10. [ ] Verify order confirmation page
11. [ ] Check order confirmation email received

**Expected Results**:
- [ ] Product configuration saves correctly
- [ ] File upload works for all supported formats
- [ ] Cart calculations are accurate
- [ ] Stripe payment processes successfully
- [ ] Order appears in admin panel
- [ ] Customer receives confirmation email
- [ ] Order status is "Building Proof"

**Test Data**:
```
Test Email: test-guest@example.com
Test Card: 4242 4242 4242 4242 (Stripe test)
Test Amount: $25+ (minimum order)
```

### **Test Case 1.2: Logged-in User Checkout**
**Priority**: HIGH
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Create account or login
2. [ ] Complete same checkout flow as guest
3. [ ] Verify order appears in user dashboard
4. [ ] Test reorder functionality

**Expected Results**:
- [ ] User profile created/updated
- [ ] Order linked to user account
- [ ] Dashboard shows order history
- [ ] Reorder button functions correctly

### **Test Case 1.3: Payment Edge Cases**
**Priority**: HIGH
**Status**: ❌ Not Tested

**Test Scenarios**:
- [ ] **Declined Card**: Test with `4000 0000 0000 0002`
- [ ] **Insufficient Funds**: Test with `4000 0000 0000 9995`
- [ ] **Payment Timeout**: Cancel payment mid-process
- [ ] **3D Secure**: Test with `4000 0000 0000 3220`

**Expected Results**:
- [ ] Failed payments show appropriate error messages
- [ ] Cart contents preserved after payment failure
- [ ] No duplicate orders created
- [ ] User can retry payment

---

## 🎨 **FLOW 2: PROOF SYSTEM WORKFLOW (CRITICAL)**

### **Test Case 2.1: Proof Generation**
**Priority**: CRITICAL ⚠️
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Place order (use Test Case 1.1)
2. [ ] Login to admin panel
3. [ ] Navigate to orders → find test order
4. [ ] Upload proof file via admin interface
5. [ ] Add proof title and notes
6. [ ] Save proof

**Expected Results**:
- [ ] Proof uploads successfully
- [ ] Proof appears in order details
- [ ] Order status remains "Building Proof"

### **Test Case 2.2: Send Proofs to Customer**
**Priority**: CRITICAL ⚠️
**Status**: ❌ Not Tested

**Steps**:
1. [ ] From admin panel, click "Send Proofs"
2. [ ] Verify proof email sent to customer
3. [ ] Check customer receives proof approval link
4. [ ] Verify order status changes to "Awaiting Approval"

**Expected Results**:
- [ ] Email sent successfully
- [ ] Proof approval page loads correctly
- [ ] Customer can view proof images
- [ ] Approval/rejection buttons work

### **Test Case 2.3: Customer Proof Approval**
**Priority**: CRITICAL ⚠️
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Click proof approval link from email
2. [ ] Review proof images
3. [ ] Click "Approve Proof"
4. [ ] Verify confirmation message

**Expected Results**:
- [ ] Proof status changes to "Approved"
- [ ] Order status changes to "Printing"
- [ ] Customer receives approval confirmation
- [ ] Admin notification sent

### **Test Case 2.4: Customer Request Changes**
**Priority**: HIGH
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Click proof approval link
2. [ ] Click "Request Changes"
3. [ ] Enter change request notes
4. [ ] Submit request

**Expected Results**:
- [ ] Proof status changes to "Changes Requested"
- [ ] Admin receives change request notification
- [ ] Customer receives confirmation
- [ ] Admin can see requested changes

---

## 📦 **FLOW 3: ORDER TRACKING & FULFILLMENT (HIGH)**

### **Test Case 3.1: Shipping Label Creation**
**Priority**: HIGH
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Use approved order from Flow 2
2. [ ] Navigate to shipping labels page
3. [ ] Create EasyPost shipment
4. [ ] Purchase shipping label
5. [ ] Verify tracking number generated

**Expected Results**:
- [ ] Shipment created successfully
- [ ] Label purchased without errors
- [ ] Tracking number assigned to order
- [ ] Customer notified of shipping

### **Test Case 3.2: Tracking Updates**
**Priority**: MEDIUM
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Verify EasyPost webhook endpoint working
2. [ ] Simulate tracking updates
3. [ ] Check order status updates
4. [ ] Verify customer notifications

**Expected Results**:
- [ ] Webhooks received and processed
- [ ] Order status updates correctly
- [ ] Customer receives shipping notifications

---

## 👨‍💼 **FLOW 4: ADMIN ORDER MANAGEMENT (HIGH)**

### **Test Case 4.1: Order Search & Filtering**
**Priority**: HIGH
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Login to admin panel
2. [ ] Test order search by email
3. [ ] Test order search by order number
4. [ ] Test status filters
5. [ ] Test date range filters

**Expected Results**:
- [ ] Search results accurate
- [ ] Filters work correctly
- [ ] Performance acceptable with multiple orders

### **Test Case 4.2: Order Status Updates**
**Priority**: HIGH
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Select test order
2. [ ] Update order status manually
3. [ ] Update fulfillment status
4. [ ] Add tracking information
5. [ ] Save changes

**Expected Results**:
- [ ] Status updates save correctly
- [ ] Customer notifications triggered
- [ ] Order timeline updated
- [ ] Changes reflected immediately

### **Test Case 4.3: Order Printing & Export**
**Priority**: MEDIUM
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Test order slip printing
2. [ ] Verify print layout (4x6 label)
3. [ ] Test bulk order export
4. [ ] Verify CSV export format

**Expected Results**:
- [ ] Print layout correct and readable
- [ ] All order information included
- [ ] Export includes all necessary data

---

## 📱 **FLOW 5: MOBILE COMPATIBILITY (HIGH)**

### **Test Case 5.1: Mobile Checkout**
**Priority**: HIGH
**Status**: ❌ Not Tested

**Devices to Test**:
- [ ] **iPhone Safari** (iOS latest)
- [ ] **Android Chrome** (latest)
- [ ] **iPad Safari**
- [ ] **Android Tablet**

**Steps**:
1. [ ] Complete full checkout flow on mobile
2. [ ] Test file upload on mobile
3. [ ] Test form filling and validation
4. [ ] Test payment process
5. [ ] Test proof approval on mobile

**Expected Results**:
- [ ] UI responsive and usable
- [ ] File upload works on mobile
- [ ] Payment flows work correctly
- [ ] No horizontal scrolling
- [ ] Touch targets appropriate size

### **Test Case 5.2: Mobile Admin Panel**
**Priority**: MEDIUM
**Status**: ❌ Not Tested

**Steps**:
1. [ ] Login to admin on mobile
2. [ ] Test order management
3. [ ] Test proof upload on mobile
4. [ ] Test order status updates

**Expected Results**:
- [ ] Admin panel usable on mobile
- [ ] Critical functions accessible
- [ ] Performance acceptable

---

## 🔧 **FLOW 6: EDGE CASES & ERROR HANDLING (MEDIUM)**

### **Test Case 6.1: File Upload Edge Cases**
**Priority**: MEDIUM
**Status**: ❌ Not Tested

**Test Files**:
- [ ] **Large files** (>10MB)
- [ ] **Unsupported formats** (.txt, .doc)
- [ ] **Corrupted files**
- [ ] **Empty files** (0 bytes)
- [ ] **Files with special characters** in name

**Expected Results**:
- [ ] Appropriate error messages for invalid files
- [ ] File size limits enforced
- [ ] Upload progress indicators work
- [ ] No server crashes with bad files

### **Test Case 6.2: Network & Performance**
**Priority**: MEDIUM
**Status**: ❌ Not Tested

**Test Scenarios**:
- [ ] **Slow network** simulation
- [ ] **Network interruption** during checkout
- [ ] **Multiple simultaneous** checkouts
- [ ] **High load** testing

**Expected Results**:
- [ ] Graceful handling of network issues
- [ ] No data loss during interruptions
- [ ] Performance acceptable under load
- [ ] Proper loading states shown

---

## 📊 **TESTING PROGRESS TRACKER**

### **Critical Tests (Must Pass)**
- [ ] Guest Checkout Flow (Test Case 1.1)
- [ ] Proof Generation (Test Case 2.1)
- [ ] Send Proofs (Test Case 2.2)
- [ ] Customer Approval (Test Case 2.3)
- [ ] Admin Order Management (Test Case 4.1, 4.2)

### **High Priority Tests**
- [ ] Logged-in Checkout (Test Case 1.2)
- [ ] Payment Edge Cases (Test Case 1.3)
- [ ] Shipping Labels (Test Case 3.1)
- [ ] Mobile Checkout (Test Case 5.1)

### **Medium Priority Tests**
- [ ] Request Changes (Test Case 2.4)
- [ ] Tracking Updates (Test Case 3.2)
- [ ] Mobile Admin (Test Case 5.2)
- [ ] Edge Cases (Test Case 6.1, 6.2)

---

## 🚨 **BUG TRACKING**

### **Critical Bugs** (Block Launch)
```
Bug ID: [AUTO-INCREMENT]
Description: [DESCRIPTION]
Steps to Reproduce: [STEPS]
Expected Result: [EXPECTED]
Actual Result: [ACTUAL]
Severity: Critical/High/Medium/Low
Status: Open/In Progress/Resolved
Assigned To: [TEAM MEMBER]
```

### **Test Environment Setup**
```bash
# API Server Running
cd api && npm start

# Frontend Running  
cd frontend && npm run dev

# Test Database
Use Supabase test/staging environment

# Test Payment
Use Stripe test mode keys

# Test Shipping
Use EasyPost test mode
```

---

## 📞 **TESTING ASSIGNMENTS**

### **Frontend Developer**
- [ ] Mobile compatibility testing
- [ ] UI/UX validation
- [ ] File upload functionality
- [ ] Form validation

### **Backend Developer**
- [ ] API endpoint testing
- [ ] Payment processing
- [ ] Webhook functionality
- [ ] Database operations

### **Full Stack Developer**
- [ ] End-to-end flow testing
- [ ] Integration testing
- [ ] Admin panel functionality
- [ ] Error handling

### **QA/Business Analyst**
- [ ] User acceptance testing
- [ ] Business logic validation
- [ ] Edge case testing
- [ ] Documentation verification

---

**Status**: 🔴 Not Started - CRITICAL Priority  
**Next Action**: Begin Test Case 1.1 (Guest Checkout)  
**Completion Target**: 48 hours from start  

**⚠️ LAUNCH BLOCKER: All Critical tests must pass before launch** 