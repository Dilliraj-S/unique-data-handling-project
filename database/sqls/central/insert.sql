-- Insert Businesses (3 businesses: Gotit Biometric HR, Tata Technologies, Infosys Solutions)
INSERT INTO `businesses` (
    `id`, `business_id`, `name`, `legal_name`, `logo`, `industry`, `registration_no`, `email`, `phone`, `website`, 
    `country`, `timezone`, `address_json`, `no_of_employees`, `hr_contact_email`, `hr_contact_phone`, `business_size`, 
    `currency`, `language`, `founded_date`, `tax_id`, `license_key`, `subscription_plan`, `billing_status`, `database_name`, 
    `total_migrations`, `total_migrated`, `migrated_at`, `database_status`, `meta_data`, `status`, `created_by`, `updated_by`, 
    `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
(1, 'CENTRAL', 'Gotit Biometric HR', 'Gotit Biometric HR Pvt Ltd', NULL, 'HR Tech', 'REG001', 'info@got4all.com', '+91-9000000000', 'https://got4all.com', 
    'India', 'Asia/Kolkata', '{}', 100, 'hr@got4all.com', '+91-9000000001', 'small', 'INR', 'English', '2018-01-01', 'TAXC001', 
    '123e4567-e89b-12d3-a456-426614174000', 'basic', 'active', 'central_db', 0, 0, NULL, 'active', '{}', 'active', 'USR0001', 'USR0001', 
    NULL, NULL, NULL, NOW(), NOW()),
(2, 'BIZ0001', 'Tata Technologies', 'Tata Technologies Ltd', NULL, 'Technology', 'REG002', 'contact@tatatech.in', '+91-9876000001', 'https://tatatech.in', 
    'India', 'Asia/Kolkata', '{}', 15000, 'hr@tatatech.in', '+91-9876000002', 'large', 'INR', 'English', '1899-01-01', 'TAXIN001', 
    '223e4567-e89b-12d3-a456-426614174001', 'basic', 'active', 'tatadb', 0, 0, NULL, 'active', '{}', 'active', 'USR0005', 'USR0005', 
    NULL, NULL, NULL, NOW(), NOW()),
(3, 'BIZ0002', 'Infosys Solutions', 'Infosys Solutions Pvt Ltd', NULL, 'IT Services', 'REG003', 'contact@infosys.in', '+91-9123000001', 'https://infosys.in', 
    'India', 'Asia/Kolkata', '{}', 18000, 'hr@infosys.in', '+91-9123000002', 'large', 'INR', 'English', '1981-07-02', 'TAXIN002', 
    '323e4567-e89b-12d3-a456-426614174002', 'basic', 'active', 'infosysdb', 0, 0, NULL, 'active', '{}', 'active', 'USR0005', 'USR0005', 
    NULL, NULL, NULL, NOW(), NOW());

-- Insert Companies (3 per business, 6 total for BIZ0001 and BIZ0002)
INSERT INTO `companies` (
    `id`, `company_id`, `business_id`, `name`, `legal_name`, `industry`, `industry_subtype`, `registration_no`, `email`, `phone`, 
    `address_json`, `operating_hours_json`, `employee_count`, `meta_data`, `status`, `created_by`, `updated_by`, `delete_on`, 
    `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
-- BIZ0001 (Tata Technologies)
(1, 'CMP0001', 'BIZ0001', 'Tata Motors', 'Tata Motors Ltd', 'Automobile', 'Manufacturing', 'REG004', 'motors@tata.in', '+91-9876100001', 
    '{}', '{}', 3000, '{}', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(2, 'CMP0002', 'BIZ0001', 'TCS', 'Tata Consultancy Services Pvt Ltd', 'IT', 'Software Services', 'REG005', 'tcs@tata.in', '+91-9876200002', 
    '{}', '{}', 8000, '{}', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(3, 'CMP0003', 'BIZ0001', 'Tata Steel', 'Tata Steel Ltd', 'Steel', 'Metallurgy', 'REG006', 'steel@tata.in', '+91-9876300003', 
    '{}', '{}', 5000, '{}', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BIZ0002 (Infosys Solutions)
(4, 'CMP0001', 'BIZ0002', 'Infosys Bangalore', 'Infosys Bangalore Ltd', 'IT Services', 'Software Development', 'REG007', 'blr@infosys.in', '+91-9123000001', 
    '{}', '{}', 6000, '{}', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(5, 'CMP0002', 'BIZ0002', 'Infosys Pune', 'Infosys Pune Ltd', 'IT Services', 'Consulting', 'REG008', 'pune@infosys.in', '+91-9123000002', 
    '{}', '{}', 4000, '{}', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(6, 'CMP0003', 'BIZ0002', 'Infosys Hyderabad', 'Infosys Hyderabad Ltd', 'IT Services', 'Cloud Services', 'REG009', 'hyd@infosys.in', '+91-9123000003', 
    '{}', '{}', 5000, '{}', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW());

-- Insert Roles (4 global roles: Supreme, Support, Developer, Guest)
INSERT INTO `roles` (
    `id`, `name`, `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
(1, 'Supreme', 'USR0001', 'USR0001', NOW(), NOW()),
(2, 'Support', 'USR0001', 'USR0001', NOW(), NOW()),
(3, 'Developer', 'USR0001', 'USR0001', NOW(), NOW()),
(4, 'Guest', 'USR0001', 'USR0001', NOW(), NOW());

-- Insert Users (4 global users + 3 business-specific users)
INSERT INTO `users` (
    `id`, `user_id`, `business_id`, `first_name`, `last_name`, `email`, `username`, `password`, `role_id`, `provider`, 
    `provider_id`, `provider_token`, `provider_refresh_token`, `two_factor_enabled`, `two_factor_secret`, 
    `two_factor_recovery_codes`, `two_factor_confirmed_at`, `two_factor_method`, `device_token`, `device_type`, 
    `fcm_enabled`, `password_updated_at`, `max_logins`, `verification`, `account_status`, `profile`, `last_login_at`, 
    `remember_token`, `created_by`, `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
-- Global Users (business_id = CENTRAL)
(1, 'USR0001', 'CENTRAL', 'Supreme', 'Admin', 'supreme@system.in', 'supreme.admin', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', 1, NULL, 
    NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NOW(), 5, 'verified', 'active', '{}', NULL, NULL, 
    'USR0001', 'USR0001', NULL, NULL, NULL, NOW(), NOW()),
(2, 'USR0002', 'CENTRAL', 'Support', 'Team', 'support@system.in', 'support.team', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', 2, NULL, 
    NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NOW(), 5, 'verified', 'active', '{}', NULL, NULL, 
    'USR0001', 'USR0001', NULL, NULL, NULL, NOW(), NOW()),
(3, 'USR0003', 'CENTRAL', 'Developer', 'Core', 'developer@system.in', 'developer.core', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', 3, NULL, 
    NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NOW(), 5, 'verified', 'active', '{}', NULL, NULL, 
    'USR0001', 'USR0001', NULL, NULL, NULL, NOW(), NOW()),
(4, 'USR0004', 'CENTRAL', 'Guest', 'User', 'guest@system.in', 'guest.user', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', 4, NULL, 
    NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NOW(), 1, 'unverified', 'active', '{}', NULL, NULL, 
    'USR0001', 'USR0001', NULL, NULL, NULL, NOW(), NOW()),
-- Business-Specific Users
(5, 'USR0005', 'BIZ0001', 'Vikram', 'Singh', 'vikram.singh@tatatech.in', 'vikram.singh', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', 1, NULL, 
    NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NOW(), 5, 'verified', 'active', '{}', NULL, NULL, 
    'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(6, 'USR0006', 'BIZ0002', 'Anjali', 'Patel', 'anjali.patel@infosys.in', 'anjali.patel', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', 1, NULL, 
    NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NOW(), 5, 'verified', 'active', '{}', NULL, NULL, 
    'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(7, 'USR0007', 'BIZ0002', 'Rahul', 'Sharma', 'rahul.sharma@infosys.in', 'rahul.sharma', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', 2, NULL, 
    NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NOW(), 5, 'verified', 'active', '{}', NULL, NULL, 
    'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW());

-- Insert User Profiles (for all 7 users)
INSERT INTO `user_profiles` (
    `id`, `user_id`, `phone`, `date_of_birth`, `gender`, `address`, `city`, `state`, `country`, `postal_code`, 
    `timezone`, `meta_data`, `bio`, `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
(1, 'USR0001', '+91-9000000001', '1980-01-01', 'Male', NULL, NULL, NULL, 'India', NULL, 'Asia/Kolkata', '{}', 'System Administrator', 
    'USR0001', 'USR0001', NOW(), NOW()),
(2, 'USR0002', '+91-9000000002', '1980-01-01', NULL, NULL, NULL, NULL, 'India', NULL, 'Asia/Kolkata', '{}', 'Support Team Member', 
    'USR0001', 'USR0001', NOW(), NOW()),
(3, 'USR0003', '+91-9000000003', '1980-01-01', NULL, NULL, NULL, NULL, 'India', NULL, 'Asia/Kolkata', '{}', 'Core Developer', 
    'USR0001', 'USR0001', NOW(), NOW()),
(4, 'USR0004', '+91-9000000004', '1980-01-01', NULL, NULL, NULL, NULL, 'India', NULL, 'Asia/Kolkata', '{}', 'Guest User', 
    'USR0001', 'USR0001', NOW(), NOW()),
(5, 'USR0005', '+91-9876100007', '1985-06-15', 'Male', '123 MG Road', 'Pune', 'Maharashtra', 'India', '411001', 'Asia/Kolkata', '{}', 
    'Senior Manager at Tata Technologies', 'USR0005', 'USR0005', NOW(), NOW()),
(6, 'USR0006', '+91-9123000013', '1984-03-10', 'Female', '456 Brigade Road', 'Bangalore', 'Karnataka', 'India', '560001', 'Asia/Kolkata', '{}', 
    'HR Lead at Infosys Solutions', 'USR0005', 'USR0005', NOW(), NOW()),
(7, 'USR0007', '+91-9123000014', '1986-07-15', 'Male', '789 Banjara Hills', 'Hyderabad', 'Telangana', 'India', '500034', 'Asia/Kolkata', '{}', 
    'Support Manager at Infosys Solutions', 'USR0005', 'USR0005', NOW(), NOW());