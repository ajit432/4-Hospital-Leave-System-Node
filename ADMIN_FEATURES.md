# Admin Features Documentation

## Overview
The Hospital Leave System now includes comprehensive admin functionality for managing doctor leave applications and allocations.

## Admin Features

### 1. Admin Dashboard (`/admin/dashboard`)
- **Overview Statistics**: View pending, approved, and rejected leave applications
- **Category Usage**: See how much leave is used per category
- **Top Requesters**: View doctors with the most leave requests
- **Year Filter**: Switch between different years
- **Quick Actions**: Direct access to key admin functions

### 2. Leave Applications Management (`/admin/leaves`)
- **View All Applications**: See all leave applications from all doctors
- **Filter by Status**: Filter by pending, approved, or rejected applications
- **Review Applications**: Approve or reject pending leave applications
- **Add Comments**: Provide admin comments when reviewing applications
- **Pagination**: Navigate through large numbers of applications

### 3. Leave Allocation Management (`/admin/leave-allocation`)
- **View All Doctors**: See list of all registered doctors
- **View Leave Balance**: Check current leave balance for any doctor
- **Set Allocations**: Allocate leave days by category for each doctor
- **Edit Allocations**: Modify existing leave allocations
- **Year-based Management**: Manage allocations for different years

## Admin Access Control

### Role-Based Navigation
- Admins see different navigation items compared to doctors
- Admin dashboard is separate from doctor dashboard
- All admin routes are protected and only accessible to admin users

### Admin-Only Routes
- `/admin/dashboard` - Admin overview dashboard
- `/admin/leaves` - Manage leave applications
- `/admin/leave-allocation` - Manage doctor leave allocations
- `/doctors` - View all doctors list

## Backend API Endpoints

### Leave Management
- `GET /api/leave/all` - Get all leave applications (admin only)
- `PUT /api/leave/:id/review` - Review leave application (admin only)
- `GET /api/leave/summary` - Get leave statistics summary (admin only)

### Doctor Management
- `GET /api/leave/doctors` - Get all doctors (admin only)
- `GET /api/leave/doctors/:doctorId/balance` - Get doctor leave balance (admin only)
- `PUT /api/leave/doctors/:doctorId/allocation` - Set doctor leave allocation (admin only)

## How to Use

### 1. Login as Admin
Use admin credentials to access the system. Admin users will be automatically redirected to the admin dashboard.

### 2. Review Leave Applications
1. Navigate to "Manage Leaves"
2. Use filters to find specific applications
3. Click "Review" on pending applications
4. Choose to approve or reject with optional comments

### 3. Manage Leave Allocations
1. Navigate to "Leave Allocation"
2. Select a doctor from the list
3. Click "View Balance" to see current allocations
4. Click "Set Allocation" to create/modify allocations
5. Choose leave category and set total days

### 4. Monitor System Usage
- Use the admin dashboard to get an overview
- Check category usage and top requesters
- Switch years to see historical data

## Key Features

### Automatic Balance Updates
- When leave is approved, the doctor's used days are automatically updated
- Remaining days are calculated automatically
- System prevents over-allocation

### Validation and Constraints
- Cannot set allocation less than already used days
- Cannot exceed maximum days per category
- Prevents overlapping leave applications

### Real-time Updates
- Changes are reflected immediately across the system
- Notifications provide feedback on all actions

## Security
- All admin endpoints require admin role authentication
- JWT token validation on every request
- Role-based access control throughout the application
