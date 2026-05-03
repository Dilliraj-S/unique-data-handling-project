-- Insert Roles (3 roles: Admin, Manager, Staff)
INSERT INTO `tatadb`.`roles` (
    `id`, `name`, `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
(1, 'Admin', 'USR0004', 'USR0004', NOW(), NOW()),
(2, 'Manager', 'USR0004', 'USR0004', NOW(), NOW()),
(3, 'Staff', 'USR0004', 'USR0004', NOW(), NOW());

-- Insert Companies (3 for BIZ0001)
INSERT INTO `tatadb`.`companies` (
    `id`, `sno`, `company_id`, `name`, `legal_name`, `logo`, `founded_date`, `phone`, `email`, `industry`, `website`,
    `no_of_employees`, `tax_id`, `address_json`, `social_links_json`, `status`, `secure_version`, `created_by`, `updated_by`,
    `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
(1, 1, 'CMP0001', 'Tata Motors', 'Tata Motors Ltd', NULL, '1945-01-01', '+91-9876100001', 'motors@tata.in', 'Automobile', 'https://tatamotors.in', 3000, 'TAXIN001', '{}', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0002', 'TCS', 'Tata Consultancy Services Pvt Ltd', NULL, '1968-01-01', '+91-9876200002', 'tcs@tata.in', 'IT', 'https://tcs.in', 8000, 'TAXIN002', '{}', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0003', 'Tata Steel', 'Tata Steel Ltd', NULL, '1907-08-26', '+91-9876300003', 'steel@tata.in', 'Steel', 'https://tatasteel.in', 5000, 'TAXIN003', '{}', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW());

-- Insert Branches (3 per company, 9 total)
INSERT INTO `tatadb`.`branches` (
    `id`, `sno`, `company_id`, `branch_id`, `name`, `legal_name`, `logo`, `founded_date`, `phone`, `email`,
    `no_of_employees`, `tax_id`, `address_json`, `status`, `secure_version`, `created_by`, `updated_by`, `delete_on`,
    `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
-- CMP0001 (Tata Motors)
(1, 1, 'CMP0001', 'BRN0001', 'Tata Motors Pune', 'Tata Motors Pune Branch', NULL, '1945-01-01', '+91-9876100004', 'pune.motors@tata.in', 1000, 'TAXIN004', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0001', 'BRN0002', 'Tata Motors Jamshedpur', 'Tata Motors Jamshedpur Branch', NULL, '1945-01-01', '+91-9876100005', 'jamshedpur.motors@tata.in', 1200, 'TAXIN005', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0001', 'BRN0003', 'Tata Motors Lucknow', 'Tata Motors Lucknow Branch', NULL, '1945-01-01', '+91-9876100006', 'lucknow.motors@tata.in', 800, 'TAXIN006', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- CMP0002 (TCS)
(4, 4, 'CMP0002', 'BRN0004', 'TCS Mumbai', 'TCS Mumbai Branch', NULL, '1968-01-01', '+91-9876200004', 'mumbai.tcs@tata.in', 3000, 'TAXIN007', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(5, 5, 'CMP0002', 'BRN0005', 'TCS Bangalore', 'TCS Bangalore Branch', NULL, '1968-01-01', '+91-9876200005', 'bangalore.tcs@tata.in', 2500, 'TAXIN008', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(6, 6, 'CMP0002', 'BRN0006', 'TCS Chennai', 'TCS Chennai Branch', NULL, '1968-01-01', '+91-9876200006', 'chennai.tcs@tata.in', 2000, 'TAXIN009', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- CMP0003 (Tata Steel)
(7, 7, 'CMP0003', 'BRN0007', 'Tata Steel Jamshedpur', 'Tata Steel Jamshedpur Branch', NULL, '1907-08-26', '+91-9876300004', 'jamshedpur.steel@tata.in', 2000, 'TAXIN010', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(8, 8, 'CMP0003', 'BRN0008', 'Tata Steel Kalinganagar', 'Tata Steel Kalinganagar Branch', NULL, '1907-08-26', '+91-9876300005', 'kalinganagar.steel@tata.in', 1500, 'TAXIN011', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(9, 9, 'CMP0003', 'BRN0009', 'Tata Steel Dhenkanal', 'Tata Steel Dhenkanal Branch', NULL, '1907-08-26', '+91-9876300006', 'dhenkanal.steel@tata.in', 1000, 'TAXIN012', '{}', 'active', '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW());

-- Insert Departments (5 per branch, 45 total)
INSERT INTO `tatadb`.`departments` (
    `id`, `sno`, `company_id`, `branch_id`, `department_id`, `department`, `description`, `status`, `created_by`,
    `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
-- BRN0001 (Tata Motors Pune)
(1, 1, 'CMP0001', 'BRN0001', 'DEP0001', 'Manufacturing', 'Automobile manufacturing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0001', 'BRN0001', 'DEP0002', 'Quality Control', 'Quality assurance for vehicles', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0001', 'BRN0001', 'DEP0003', 'R&D', 'Research and development', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(4, 4, 'CMP0001', 'BRN0001', 'DEP0004', 'Supply Chain', 'Logistics and supply management', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(5, 5, 'CMP0001', 'BRN0001', 'DEP0005', 'HR', 'Human resources', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0002 (Tata Motors Jamshedpur)
(6, 6, 'CMP0001', 'BRN0002', 'DEP0006', 'Production', 'Vehicle production', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(7, 7, 'CMP0001', 'BRN0002', 'DEP0007', 'Maintenance', 'Equipment maintenance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(8, 8, 'CMP0001', 'BRN0002', 'DEP0008', 'Engineering', 'Engineering design', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(9, 9, 'CMP0001', 'BRN0002', 'DEP0009', 'Finance', 'Financial operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(10, 10, 'CMP0001', 'BRN0002', 'DEP0010', 'Safety', 'Workplace safety', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0003 (Tata Motors Lucknow)
(11, 11, 'CMP0001', 'BRN0003', 'DEP0011', 'Assembly', 'Vehicle assembly', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(12, 12, 'CMP0001', 'BRN0003', 'DEP0012', 'Testing', 'Vehicle testing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(13, 13, 'CMP0001', 'BRN0003', 'DEP0013', 'Procurement', 'Material procurement', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(14, 14, 'CMP0001', 'BRN0003', 'DEP0014', 'Marketing', 'Marketing and sales', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(15, 15, 'CMP0001', 'BRN0003', 'DEP0015', 'IT', 'Information technology', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0004 (TCS Mumbai)
(16, 16, 'CMP0002', 'BRN0004', 'DEP0016', 'Software Development', 'Software development', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(17, 17, 'CMP0002', 'BRN0004', 'DEP0017', 'Consulting', 'IT consulting services', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(18, 18, 'CMP0002', 'BRN0004', 'DEP0018', 'Testing', 'Software testing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(19, 19, 'CMP0002', 'BRN0004', 'DEP0019', 'Project Management', 'Project management', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(20, 20, 'CMP0002', 'BRN0004', 'DEP0020', 'HR', 'Human resources', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0005 (TCS Bangalore)
(21, 21, 'CMP0002', 'BRN0005', 'DEP0021', 'AI Development', 'AI and ML development', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(22, 22, 'CMP0002', 'BRN0005', 'DEP0022', 'Cloud Services', 'Cloud computing services', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(23, 23, 'CMP0002', 'BRN0005', 'DEP0023', 'Cybersecurity', 'Cybersecurity solutions', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(24, 24, 'CMP0002', 'BRN0005', 'DEP0024', 'Finance', 'Financial operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(25, 25, 'CMP0002', 'BRN0005', 'DEP0025', 'Support', 'Technical support', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0006 (TCS Chennai)
(26, 26, 'CMP0002', 'BRN0006', 'DEP0026', 'Data Analytics', 'Data analytics services', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(27, 27, 'CMP0002', 'BRN0006', 'DEP0027', 'DevOps', 'DevOps engineering', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(28, 28, 'CMP0002', 'BRN0006', 'DEP0028', 'Quality Assurance', 'Quality assurance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(29, 29, 'CMP0002', 'BRN0006', 'DEP0029', 'Marketing', 'Marketing services', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(30, 30, 'CMP0002', 'BRN0006', 'DEP0030', 'IT', 'Information technology', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0007 (Tata Steel Jamshedpur)
(31, 31, 'CMP0003', 'BRN0007', 'DEP0031', 'Production', 'Steel production', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(32, 32, 'CMP0003', 'BRN0007', 'DEP0032', 'Quality Control', 'Quality assurance for steel', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(33, 33, 'CMP0003', 'BRN0007', 'DEP0033', 'Maintenance', 'Equipment maintenance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(34, 34, 'CMP0003', 'BRN0007', 'DEP0034', 'Supply Chain', 'Logistics and supply', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(35, 35, 'CMP0003', 'BRN0007', 'DEP0035', 'Safety', 'Workplace safety', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0008 (Tata Steel Kalinganagar)
(36, 36, 'CMP0003', 'BRN0008', 'DEP0036', 'Operations', 'Steel plant operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(37, 37, 'CMP0003', 'BRN0008', 'DEP0037', 'Engineering', 'Engineering design', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(38, 38, 'CMP0003', 'BRN0008', 'DEP0038', 'Finance', 'Financial operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(39, 39, 'CMP0003', 'BRN0008', 'DEP0039', 'HR', 'Human resources', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(40, 40, 'CMP0003', 'BRN0008', 'DEP0040', 'R&D', 'Research and development', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0009 (Tata Steel Dhenkanal)
(41, 41, 'CMP0003', 'BRN0009', 'DEP0041', 'Manufacturing', 'Steel manufacturing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(42, 42, 'CMP0003', 'BRN0009', 'DEP0042', 'Procurement', 'Material procurement', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(43, 43, 'CMP0003', 'BRN0009', 'DEP0043', 'Marketing', 'Marketing and sales', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(44, 44, 'CMP0003', 'BRN0009', 'DEP0044', 'IT', 'Information technology', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(45, 45, 'CMP0003', 'BRN0009', 'DEP0045', 'Safety', 'Workplace safety', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW());

-- Insert Designations (10 per branch, 2 per department, 90 total)
INSERT INTO `tatadb`.`designations` (
    `id`, `sno`, `company_id`, `branch_id`, `department_id`, `designation_id`, `designation`, `description`, `status`,
    `created_by`, `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
-- BRN0001 (Tata Motors Pune)
(1, 1, 'CMP0001', 'BRN0001', 'DEP0001', 'DSG0001', 'Production Manager', 'Manages production lines', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0001', 'BRN0001', 'DEP0001', 'DSG0002', 'Production Supervisor', 'Supervises production', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0001', 'BRN0001', 'DEP0002', 'DSG0003', 'Quality Manager', 'Oversees quality control', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(4, 4, 'CMP0001', 'BRN0001', 'DEP0002', 'DSG0004', 'Quality Inspector', 'Inspects products', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(5, 5, 'CMP0001', 'BRN0001', 'DEP0003', 'DSG0005', 'R&D Engineer', 'Develops new technologies', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(6, 6, 'CMP0001', 'BRN0001', 'DEP0003', 'DSG0006', 'R&D Analyst', 'Analyzes research data', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(7, 7, 'CMP0001', 'BRN0001', 'DEP0004', 'DSG0007', 'Supply Chain Manager', 'Manages logistics', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(8, 8, 'CMP0001', 'BRN0001', 'DEP0004', 'DSG0008', 'Logistics Coordinator', 'Coordinates shipments', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(9, 9, 'CMP0001', 'BRN0001', 'DEP0005', 'DSG0009', 'HR Manager', 'Manages HR operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(10, 10, 'CMP0001', 'BRN0001', 'DEP0005', 'DSG0010', 'HR Assistant', 'Supports HR tasks', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0002 (Tata Motors Jamshedpur)
(11, 11, 'CMP0001', 'BRN0002', 'DEP0006', 'DSG0011', 'Production Lead', 'Leads production team', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(12, 12, 'CMP0001', 'BRN0002', 'DEP0006', 'DSG0012', 'Assembly Technician', 'Assembles vehicles', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(13, 13, 'CMP0001', 'BRN0002', 'DEP0007', 'DSG0013', 'Maintenance Manager', 'Oversees maintenance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(14, 14, 'CMP0001', 'BRN0002', 'DEP0007', 'DSG0014', 'Maintenance Technician', 'Performs maintenance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(15, 15, 'CMP0001', 'BRN0002', 'DEP0008', 'DSG0015', 'Design Engineer', 'Designs vehicle components', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(16, 16, 'CMP0001', 'BRN0002', 'DEP0008', 'DSG0016', 'CAD Specialist', 'Creates CAD models', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(17, 17, 'CMP0001', 'BRN0002', 'DEP0009', 'DSG0017', 'Finance Manager', 'Manages finances', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(18, 18, 'CMP0001', 'BRN0002', 'DEP0009', 'DSG0018', 'Accountant', 'Handles accounts', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(19, 19, 'CMP0001', 'BRN0002', 'DEP0010', 'DSG0019', 'Safety Officer', 'Ensures safety compliance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(20, 20, 'CMP0001', 'BRN0002', 'DEP0010', 'DSG0020', 'Safety Inspector', 'Conducts safety audits', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0003 (Tata Motors Lucknow)
(21, 21, 'CMP0001', 'BRN0003', 'DEP0011', 'DSG0021', 'Assembly Manager', 'Manages assembly lines', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(22, 22, 'CMP0001', 'BRN0003', 'DEP0011', 'DSG0022', 'Assembly Worker', 'Works on assembly', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(23, 23, 'CMP0001', 'BRN0003', 'DEP0012', 'DSG0023', 'Test Engineer', 'Tests vehicles', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(24, 24, 'CMP0001', 'BRN0003', 'DEP0012', 'DSG0024', 'Test Technician', 'Assists in testing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(25, 25, 'CMP0001', 'BRN0003', 'DEP0013', 'DSG0025', 'Procurement Manager', 'Manages procurement', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(26, 26, 'CMP0001', 'BRN0003', 'DEP0013', 'DSG0026', 'Procurement Assistant', 'Supports procurement', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(27, 27, 'CMP0001', 'BRN0003', 'DEP0014', 'DSG0027', 'Marketing Manager', 'Manages marketing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(28, 28, 'CMP0001', 'BRN0003', 'DEP0014', 'DSG0028', 'Sales Executive', 'Handles sales', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(29, 29, 'CMP0001', 'BRN0003', 'DEP0015', 'DSG0029', 'IT Manager', 'Manages IT systems', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(30, 30, 'CMP0001', 'BRN0003', 'DEP0015', 'DSG0030', 'IT Support', 'Provides IT support', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0004 (TCS Mumbai)
(31, 31, 'CMP0002', 'BRN0004', 'DEP0016', 'DSG0031', 'Software Engineer', 'Develops software', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(32, 32, 'CMP0002', 'BRN0004', 'DEP0016', 'DSG0032', 'Senior Developer', 'Leads development', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(33, 33, 'CMP0002', 'BRN0004', 'DEP0017', 'DSG0033', 'IT Consultant', 'Provides consulting', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(34, 34, 'CMP0002', 'BRN0004', 'DEP0017', 'DSG0034', 'Business Analyst', 'Analyzes business needs', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(35, 35, 'CMP0002', 'BRN0004', 'DEP0018', 'DSG0035', 'Test Engineer', 'Tests software', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(36, 36, 'CMP0002', 'BRN0004', 'DEP0018', 'DSG0036', 'QA Analyst', 'Ensures quality', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(37, 37, 'CMP0002', 'BRN0004', 'DEP0019', 'DSG0037', 'Project Manager', 'Manages projects', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(38, 38, 'CMP0002', 'BRN0004', 'DEP0019', 'DSG0038', 'Scrum Master', 'Facilitates agile teams', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(39, 39, 'CMP0002', 'BRN0004', 'DEP0020', 'DSG0039', 'HR Manager', 'Manages HR operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(40, 40, 'CMP0002', 'BRN0004', 'DEP0020', 'DSG0040', 'HR Coordinator', 'Coordinates HR tasks', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0005 (TCS Bangalore)
(41, 41, 'CMP0002', 'BRN0005', 'DEP0021', 'DSG0041', 'AI Engineer', 'Develops AI solutions', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(42, 42, 'CMP0002', 'BRN0005', 'DEP0021', 'DSG0042', 'ML Scientist', 'Researches ML models', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(43, 43, 'CMP0002', 'BRN0005', 'DEP0022', 'DSG0043', 'Cloud Architect', 'Designs cloud solutions', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(44, 44, 'CMP0002', 'BRN0005', 'DEP0022', 'DSG0044', 'Cloud Engineer', 'Implements cloud systems', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(45, 45, 'CMP0002', 'BRN0005', 'DEP0023', 'DSG0045', 'Security Analyst', 'Analyzes security threats', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(46, 46, 'CMP0002', 'BRN0005', 'DEP0023', 'DSG0046', 'Security Engineer', 'Implements security measures', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(47, 47, 'CMP0002', 'BRN0005', 'DEP0024', 'DSG0047', 'Finance Manager', 'Manages finances', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(48, 48, 'CMP0002', 'BRN0005', 'DEP0024', 'DSG0048', 'Accountant', 'Handles accounts', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(49, 49, 'CMP0002', 'BRN0005', 'DEP0025', 'DSG0049', 'Support Engineer', 'Provides technical support', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(50, 50, 'CMP0002', 'BRN0005', 'DEP0025', 'DSG0050', 'Support Analyst', 'Analyzes support issues', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0006 (TCS Chennai)
(51, 51, 'CMP0002', 'BRN0006', 'DEP0026', 'DSG0051', 'Data Scientist', 'Analyzes data', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(52, 52, 'CMP0002', 'BRN0006', 'DEP0026', 'DSG0052', 'Data Analyst', 'Processes data', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(53, 53, 'CMP0002', 'BRN0006', 'DEP0027', 'DSG0053', 'DevOps Engineer', 'Manages DevOps pipelines', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(54, 54, 'CMP0002', 'BRN0006', 'DEP0027', 'DSG0054', 'Site Reliability Engineer', 'Ensures system reliability', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(55, 55, 'CMP0002', 'BRN0006', 'DEP0028', 'DSG0055', 'QA Engineer', 'Tests software quality', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(56, 56, 'CMP0002', 'BRN0006', 'DEP0028', 'DSG0056', 'QA Lead', 'Leads QA team', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(57, 57, 'CMP0002', 'BRN0006', 'DEP0029', 'DSG0057', 'Marketing Manager', 'Manages marketing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(58, 58, 'CMP0002', 'BRN0006', 'DEP0029', 'DSG0058', 'Marketing Executive', 'Executes marketing plans', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(59, 59, 'CMP0002', 'BRN0006', 'DEP0030', 'DSG0059', 'IT Manager', 'Manages IT systems', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(60, 60, 'CMP0002', 'BRN0006', 'DEP0030', 'DSG0060', 'IT Administrator', 'Administers IT systems', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0007 (Tata Steel Jamshedpur)
(61, 61, 'CMP0003', 'BRN0007', 'DEP0031', 'DSG0061', 'Production Manager', 'Manages steel production', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(62, 62, 'CMP0003', 'BRN0007', 'DEP0031', 'DSG0062', 'Production Supervisor', 'Supervises production', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(63, 63, 'CMP0003', 'BRN0007', 'DEP0032', 'DSG0063', 'Quality Manager', 'Oversees quality control', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(64, 64, 'CMP0003', 'BRN0007', 'DEP0032', 'DSG0064', 'Quality Inspector', 'Inspects steel products', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(65, 65, 'CMP0003', 'BRN0007', 'DEP0033', 'DSG0065', 'Maintenance Manager', 'Oversees maintenance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(66, 66, 'CMP0003', 'BRN0007', 'DEP0033', 'DSG0066', 'Maintenance Technician', 'Performs maintenance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(67, 67, 'CMP0003', 'BRN0007', 'DEP0034', 'DSG0067', 'Supply Chain Manager', 'Manages logistics', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(68, 68, 'CMP0003', 'BRN0007', 'DEP0034', 'DSG0068', 'Logistics Coordinator', 'Coordinates shipments', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(69, 69, 'CMP0003', 'BRN0007', 'DEP0035', 'DSG0069', 'Safety Officer', 'Ensures safety compliance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(70, 70, 'CMP0003', 'BRN0007', 'DEP0035', 'DSG0070', 'Safety Inspector', 'Conducts safety audits', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0008 (Tata Steel Kalinganagar)
(71, 71, 'CMP0003', 'BRN0008', 'DEP0036', 'DSG0071', 'Operations Manager', 'Manages plant operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(72, 72, 'CMP0003', 'BRN0008', 'DEP0036', 'DSG0072', 'Operations Supervisor', 'Supervises operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(73, 73, 'CMP0003', 'BRN0008', 'DEP0037', 'DSG0073', 'Design Engineer', 'Designs steel components', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(74, 74, 'CMP0003', 'BRN0008', 'DEP0037', 'DSG0074', 'CAD Specialist', 'Creates CAD models', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(75, 75, 'CMP0003', 'BRN0008', 'DEP0038', 'DSG0075', 'Finance Manager', 'Manages finances', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(76, 76, 'CMP0003', 'BRN0008', 'DEP0038', 'DSG0076', 'Accountant', 'Handles accounts', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(77, 77, 'CMP0003', 'BRN0008', 'DEP0039', 'DSG0077', 'HR Manager', 'Manages HR operations', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(78, 78, 'CMP0003', 'BRN0008', 'DEP0039', 'DSG0078', 'HR Assistant', 'Supports HR tasks', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(79, 79, 'CMP0003', 'BRN0008', 'DEP0040', 'DSG0079', 'R&D Engineer', 'Develops new technologies', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(80, 80, 'CMP0003', 'BRN0008', 'DEP0040', 'DSG0080', 'R&D Analyst', 'Analyzes research data', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0009 (Tata Steel Dhenkanal)
(81, 81, 'CMP0003', 'BRN0009', 'DEP0041', 'DSG0081', 'Manufacturing Manager', 'Manages manufacturing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(82, 82, 'CMP0003', 'BRN0009', 'DEP0041', 'DSG0082', 'Manufacturing Supervisor', 'Supervises manufacturing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(83, 83, 'CMP0003', 'BRN0009', 'DEP0042', 'DSG0083', 'Procurement Manager', 'Manages procurement', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(84, 84, 'CMP0003', 'BRN0009', 'DEP0042', 'DSG0084', 'Procurement Assistant', 'Supports procurement', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(85, 85, 'CMP0003', 'BRN0009', 'DEP0043', 'DSG0085', 'Marketing Manager', 'Manages marketing', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(86, 86, 'CMP0003', 'BRN0009', 'DEP0043', 'DSG0086', 'Sales Executive', 'Handles sales', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(87, 87, 'CMP0003', 'BRN0009', 'DEP0044', 'DSG0087', 'IT Manager', 'Manages IT systems', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(88, 88, 'CMP0003', 'BRN0009', 'DEP0044', 'DSG0088', 'IT Support', 'Provides IT support', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(89, 89, 'CMP0003', 'BRN0009', 'DEP0045', 'DSG0089', 'Safety Officer', 'Ensures safety compliance', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(90, 90, 'CMP0003', 'BRN0009', 'DEP0045', 'DSG0090', 'Safety Inspector', 'Conducts safety audits', 'active', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW());

-- Insert Employees (10, 1 with allow_authentication = 1)
INSERT INTO `tatadb`.`employees` (
    `id`, `sno`, `company_id`, `branch_id`, `user_id`, `employee_id`, `first_name`, `last_name`, `role_id`, `birth_date`, `phone`,
    `phone_alt`, `email`, `email_alt`, `username`, `password`, `joined_date`, `secure_version`, `allow_authentication`,
    `created_by`, `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
(1, 1, 'CMP0001', 'BRN0001', 'USR0004', 'EMP0001', 'Vikram', 'Singh', 2, '1985-06-15', '+91-9876100007', NULL, 'vikram.singh@tatatech.in', NULL, 'vikram.singh', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 1, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0001', 'BRN0001', 'USR0015', 'EMP0002', 'Arjun', 'Reddy', 3, '1990-09-20', '+91-9876100008', NULL, 'arjun.reddy@tatatech.in', NULL, 'arjun.reddy', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0001', 'BRN0002', 'USR0016', 'EMP0003', 'Kavya', 'Rao', 3, '1988-04-25', '+91-9876100009', NULL, 'kavya.rao@tatatech.in', NULL, 'kavya.rao', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(4, 4, 'CMP0001', 'BRN0003', 'USR0017', 'EMP0004', 'Sanjay', 'Verma', 3, '1987-07-30', '+91-9876100010', NULL, 'sanjay.verma@tatatech.in', NULL, 'sanjay.verma', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(5, 5, 'CMP0002', 'BRN0004', 'USR0018', 'EMP0005', 'Pooja', 'Mehta', 3, '1992-02-10', '+91-9876200007', NULL, 'pooja.mehta@tatatech.in', NULL, 'pooja.mehta', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(6, 6, 'CMP0002', 'BRN0005', 'USR0019', 'EMP0006', 'Rohit', 'Patel', 3, '1986-11-05', '+91-9876200008', NULL, 'rohit.patel@tatatech.in', NULL, 'rohit.patel', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(7, 7, 'CMP0002', 'BRN0006', 'USR0020', 'EMP0007', 'Divya', 'Nair', 3, '1991-03-15', '+91-9876200009', NULL, 'divya.nair@tatatech.in', NULL, 'divya.nair', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(8, 8, 'CMP0003', 'BRN0007', 'USR0021', 'EMP0008', 'Manish', 'Gupta', 3, '1989-08-20', '+91-9876300007', NULL, 'manish.gupta@tatatech.in', NULL, 'manish.gupta', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(9, 9, 'CMP0003', 'BRN0008', 'USR0022', 'EMP0009', 'Sneha', 'Joshi', 3, '1993-01-25', '+91-9876300008', NULL, 'sneha.joshi@tatatech.in', NULL, 'sneha.joshi', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(10, 10, 'CMP0003', 'BRN0009', 'USR0023', 'EMP0010', 'Kiran', 'Sharma', 3, '1987-06-30', '+91-9876300009', NULL, 'kiran.sharma@tatatech.in', NULL, 'kiran.sharma', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2020-01-01', '1', 0, 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW());

-- Insert Employee Work Details (for 10 employees)
INSERT INTO `tatadb`.`employee_work` (
    `id`, `company_id`, `branch_id`, `employee_id`, `department_id`, `designation_id`, `device_id`, `device_user_id`,
    `schedule_id`, `geofence`, `max_leaves`, `priority`, `in_devices`, `storage`, `account_status`, `work_force`,
    `last_update`, `secure_version`, `created_by`, `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
(1, 'CMP0001', 'BRN0001', 'EMP0001', 'DEP0001', 'DSG0001', NULL, NULL, NULL, '{}', 30, 1, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(2, 'CMP0001', 'BRN0001', 'EMP0002', 'DEP0002', 'DSG0004', NULL, NULL, NULL, '{}', 25, 2, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(3, 'CMP0001', 'BRN0002', 'EMP0003', 'DEP0006', 'DSG0012', NULL, NULL, NULL, '{}', 25, 3, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(4, 'CMP0001', 'BRN0003', 'EMP0004', 'DEP0011', 'DSG0022', NULL, NULL, NULL, '{}', 25, 4, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(5, 'CMP0002', 'BRN0004', 'EMP0005', 'DEP0016', 'DSG0031', NULL, NULL, NULL, '{}', 25, 5, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(6, 'CMP0002', 'BRN0005', 'EMP0006', 'DEP0021', 'DSG0041', NULL, NULL, NULL, '{}', 25, 6, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(7, 'CMP0002', 'BRN0006', 'EMP0007', 'DEP0026', 'DSG0051', NULL, NULL, NULL, '{}', 25, 7, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(8, 'CMP0003', 'BRN0007', 'EMP0008', 'DEP0031', 'DSG0062', NULL, NULL, NULL, '{}', 25, 8, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(9, 'CMP0003', 'BRN0008', 'EMP0009', 'DEP0036', 'DSG0072', NULL, NULL, NULL, '{}', 25, 9, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW()),
(10, 'CMP0003', 'BRN0009', 'EMP0010', 'DEP0041', 'DSG0082', NULL, NULL, NULL, '{}', 25, 10, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0004', 'USR0004', NULL, NULL, NULL, NOW(), NOW());