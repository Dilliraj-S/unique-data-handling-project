-- Insert Roles (3 roles: Admin, Manager, Staff)
INSERT INTO `infosysdb`.`roles` (
    `id`, `name`, `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
(1, 'Admin', 'USR0005', 'USR0005', NOW(), NOW()),
(2, 'Manager', 'USR0005', 'USR0005', NOW(), NOW()),
(3, 'Staff', 'USR0005', 'USR0005', NOW(), NOW());

-- Insert Companies (3 for BIZ0002)
INSERT INTO `infosysdb`.`companies` (
    `id`, `sno`, `company_id`, `name`, `legal_name`, `logo`, `founded_date`, `phone`, `email`, `industry`, `website`,
    `no_of_employees`, `tax_id`, `address_json`, `social_links_json`, `status`, `secure_version`, `created_by`, `updated_by`,
    `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
(1, 1, 'CMP0001', 'Infosys Bangalore', 'Infosys Bangalore Ltd', NULL, '1981-07-02', '+91-9123000001', 'blr@infosys.in', 'IT Services', 'https://infosys.in', 6000, 'TAXIN001', '{}', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0002', 'Infosys Pune', 'Infosys Pune Ltd', NULL, '1981-07-02', '+91-9123000002', 'pune@infosys.in', 'IT Services', 'https://infosys.in', 4000, 'TAXIN002', '{}', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0003', 'Infosys Hyderabad', 'Infosys Hyderabad Ltd', NULL, '1981-07-02', '+91-9123000003', 'hyd@infosys.in', 'IT Services', 'https://infosys.in', 5000, 'TAXIN003', '{}', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW());

-- Insert Branches (3 per company, 9 total)
INSERT INTO `infosysdb`.`branches` (
    `id`, `sno`, `company_id`, `branch_id`, `name`, `legal_name`, `logo`, `founded_date`, `phone`, `email`,
    `no_of_employees`, `tax_id`, `address_json`, `status`, `secure_version`, `created_by`, `updated_by`, `delete_on`,
    `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
-- CMP0001 (Infosys Bangalore)
(1, 1, 'CMP0001', 'BRN0001', 'Infosys Bangalore Campus 1', 'Infosys Bangalore Campus 1 Branch', NULL, '1981-07-02', '+91-9123000004', 'blr.campus1@infosys.in', 2000, 'TAXIN004', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0001', 'BRN0002', 'Infosys Bangalore Campus 2', 'Infosys Bangalore Campus 2 Branch', NULL, '1981-07-02', '+91-9123000005', 'blr.campus2@infosys.in', 2000, 'TAXIN005', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0001', 'BRN0003', 'Infosys Bangalore Campus 3', 'Infosys Bangalore Campus 3 Branch', NULL, '1981-07-02', '+91-9123000006', 'blr.campus3@infosys.in', 2000, 'TAXIN006', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- CMP0002 (Infosys Pune)
(4, 4, 'CMP0002', 'BRN0004', 'Infosys Pune Campus 1', 'Infosys Pune Campus 1 Branch', NULL, '1981-07-02', '+91-9123000007', 'pune.campus1@infosys.in', 1500, 'TAXIN007', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(5, 5, 'CMP0002', 'BRN0005', 'Infosys Pune Campus 2', 'Infosys Pune Campus 2 Branch', NULL, '1981-07-02', '+91-9123000008', 'pune.campus2@infosys.in', 1250, 'TAXIN008', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(6, 6, 'CMP0002', 'BRN0006', 'Infosys Pune Campus 3', 'Infosys Pune Campus 3 Branch', NULL, '1981-07-02', '+91-9123000009', 'pune.campus3@infosys.in', 1250, 'TAXIN009', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- CMP0003 (Infosys Hyderabad)
(7, 7, 'CMP0003', 'BRN0007', 'Infosys Hyderabad Campus 1', 'Infosys Hyderabad Campus 1 Branch', NULL, '1981-07-02', '+91-9123000010', 'hyd.campus1@infosys.in', 1700, 'TAXIN010', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(8, 8, 'CMP0003', 'BRN0008', 'Infosys Hyderabad Campus 2', 'Infosys Hyderabad Campus 2 Branch', NULL, '1981-07-02', '+91-9123000011', 'hyd.campus2@infosys.in', 1650, 'TAXIN011', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(9, 9, 'CMP0003', 'BRN0009', 'Infosys Hyderabad Campus 3', 'Infosys Hyderabad Campus 3 Branch', NULL, '1981-07-02', '+91-9123000012', 'hyd.campus3@infosys.in', 1650, 'TAXIN012', '{}', 'active', '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW());

-- Insert Departments (5 per branch, 45 total)
INSERT INTO `infosysdb`.`departments` (
    `id`, `sno`, `company_id`, `branch_id`, `department_id`, `department`, `description`, `status`, `created_by`,
    `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
-- BRN0001 (Infosys Bangalore Campus 1)
(1, 1, 'CMP0001', 'BRN0001', 'DEP0001', 'Software Development', 'Software development and delivery', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0001', 'BRN0001', 'DEP0002', 'Quality Assurance', 'Software testing and QA', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0001', 'BRN0001', 'DEP0003', 'Project Management', 'Project management and delivery', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(4, 4, 'CMP0001', 'BRN0001', 'DEP0004', 'HR', 'Human resources management', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(5, 5, 'CMP0001', 'BRN0001', 'DEP0005', 'IT Infrastructure', 'IT systems and infrastructure', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0002 (Infosys Bangalore Campus 2)
(6, 6, 'CMP0001', 'BRN0002', 'DEP0006', 'Cloud Computing', 'Cloud services and solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(7, 7, 'CMP0001', 'BRN0002', 'DEP0007', 'Cybersecurity', 'Cybersecurity solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(8, 8, 'CMP0001', 'BRN0002', 'DEP0008', 'Data Analytics', 'Data analytics and insights', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(9, 9, 'CMP0001', 'BRN0002', 'DEP0009', 'Finance', 'Financial operations', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(10, 10, 'CMP0001', 'BRN0002', 'DEP0010', 'Consulting', 'IT consulting services', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0003 (Infosys Bangalore Campus 3)
(11, 11, 'CMP0001', 'BRN0003', 'DEP0011', 'AI Development', 'AI and ML development', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(12, 12, 'CMP0001', 'BRN0003', 'DEP0012', 'DevOps', 'DevOps and CI/CD pipelines', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(13, 13, 'CMP0001', 'BRN0003', 'DEP0013', 'Technical Support', 'Customer and technical support', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(14, 14, 'CMP0001', 'BRN0003', 'DEP0014', 'Marketing', 'Marketing and branding', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(15, 15, 'CMP0001', 'BRN0003', 'DEP0015', 'R&D', 'Research and development', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0004 (Infosys Pune Campus 1)
(16, 16, 'CMP0002', 'BRN0004', 'DEP0016', 'Software Engineering', 'Software engineering and design', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(17, 17, 'CMP0002', 'BRN0004', 'DEP0017', 'Testing', 'Software and system testing', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(18, 18, 'CMP0002', 'BRN0004', 'DEP0018', 'Project Delivery', 'Project execution and delivery', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(19, 19, 'CMP0002', 'BRN0004', 'DEP0019', 'HR Operations', 'HR operations and recruitment', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(20, 20, 'CMP0002', 'BRN0004', 'DEP0020', 'Network Management', 'Network infrastructure management', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0005 (Infosys Pune Campus 2)
(21, 21, 'CMP0002', 'BRN0005', 'DEP0021', 'Cloud Architecture', 'Cloud architecture and solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(22, 22, 'CMP0002', 'BRN0005', 'DEP0022', 'Security Operations', 'Security operations and monitoring', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(23, 23, 'CMP0002', 'BRN0005', 'DEP0023', 'Business Analytics', 'Business intelligence and analytics', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(24, 24, 'CMP0002', 'BRN0005', 'DEP0024', 'Finance Operations', 'Financial management and accounting', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(25, 25, 'CMP0002', 'BRN0005', 'DEP0025', 'IT Consulting', 'Strategic IT consulting', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0006 (Infosys Pune Campus 3)
(26, 26, 'CMP0002', 'BRN0006', 'DEP0026', 'Machine Learning', 'Machine learning solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(27, 27, 'CMP0002', 'BRN0006', 'DEP0027', 'Automation', 'Automation and robotics', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(28, 28, 'CMP0002', 'BRN0006', 'DEP0028', 'Support Services', 'Customer support services', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(29, 29, 'CMP0002', 'BRN0006', 'DEP0029', 'Digital Marketing', 'Digital marketing and campaigns', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(30, 30, 'CMP0002', 'BRN0006', 'DEP0030', 'Innovation', 'Innovation and product development', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0007 (Infosys Hyderabad Campus 1)
(31, 31, 'CMP0003', 'BRN0007', 'DEP0031', 'Application Development', 'Application development and maintenance', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(32, 32, 'CMP0003', 'BRN0007', 'DEP0032', 'Quality Control', 'Quality control and assurance', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(33, 33, 'CMP0003', 'BRN0007', 'DEP0033', 'Program Management', 'Program and portfolio management', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(34, 34, 'CMP0003', 'BRN0007', 'DEP0034', 'Talent Acquisition', 'Recruitment and talent management', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(35, 35, 'CMP0003', 'BRN0007', 'DEP0035', 'Systems Administration', 'Systems administration and support', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0008 (Infosys Hyderabad Campus 2)
(36, 36, 'CMP0003', 'BRN0008', 'DEP0036', 'Cloud Engineering', 'Cloud engineering and deployment', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(37, 37, 'CMP0003', 'BRN0008', 'DEP0037', 'Threat Analysis', 'Threat analysis and mitigation', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(38, 38, 'CMP0003', 'BRN0008', 'DEP0038', 'Data Science', 'Data science and predictive analytics', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(39, 39, 'CMP0003', 'BRN0008', 'DEP0039', 'Accounting', 'Accounting and financial reporting', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(40, 40, 'CMP0003', 'BRN0008', 'DEP0040', 'Business Consulting', 'Business strategy and consulting', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0009 (Infosys Hyderabad Campus 3)
(41, 41, 'CMP0003', 'BRN0009', 'DEP0041', 'AI Engineering', 'AI engineering and solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(42, 42, 'CMP0003', 'BRN0009', 'DEP0042', 'CI/CD Engineering', 'Continuous integration and deployment', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(43, 43, 'CMP0003', 'BRN0009', 'DEP0043', 'Customer Support', 'Customer support and service', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(44, 44, 'CMP0003', 'BRN0009', 'DEP0044', 'Brand Management', 'Brand management and promotion', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(45, 45, 'CMP0003', 'BRN0009', 'DEP0045', 'Product Development', 'Product development and innovation', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW());

-- Insert Designations (10 per branch, 2 per department, 90 total)
INSERT INTO `infosysdb`.`designations` (
    `id`, `sno`, `company_id`, `branch_id`, `department_id`, `designation_id`, `designation`, `description`, `status`,
    `created_by`, `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
-- BRN0001 (Infosys Bangalore Campus 1)
(1, 1, 'CMP0001', 'BRN0001', 'DEP0001', 'DSG0001', 'Software Engineer', 'Develops software solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0001', 'BRN0001', 'DEP0001', 'DSG0002', 'Senior Developer', 'Leads software development', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0001', 'BRN0001', 'DEP0002', 'DSG0003', 'QA Engineer', 'Tests software quality', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(4, 4, 'CMP0001', 'BRN0001', 'DEP0002', 'DSG0004', 'QA Lead', 'Leads QA team', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(5, 5, 'CMP0001', 'BRN0001', 'DEP0003', 'DSG0005', 'Project Manager', 'Manages projects', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(6, 6, 'CMP0001', 'BRN0001', 'DEP0003', 'DSG0006', 'Scrum Master', 'Facilitates agile teams', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(7, 7, 'CMP0001', 'BRN0001', 'DEP0004', 'DSG0007', 'HR Manager', 'Manages HR operations', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(8, 8, 'CMP0001', 'BRN0001', 'DEP0004', 'DSG0008', 'HR Coordinator', 'Coordinates HR tasks', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(9, 9, 'CMP0001', 'BRN0001', 'DEP0005', 'DSG0009', 'IT Manager', 'Manages IT infrastructure', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(10, 10, 'CMP0001', 'BRN0001', 'DEP0005', 'DSG0010', 'Systems Administrator', 'Administers IT systems', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0002 (Infosys Bangalore Campus 2)
(11, 11, 'CMP0001', 'BRN0002', 'DEP0006', 'DSG0011', 'Cloud Engineer', 'Implements cloud solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(12, 12, 'CMP0001', 'BRN0002', 'DEP0006', 'DSG0012', 'Cloud Architect', 'Designs cloud systems', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(13, 13, 'CMP0001', 'BRN0002', 'DEP0007', 'DSG0013', 'Security Analyst', 'Analyzes security threats', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(14, 14, 'CMP0001', 'BRN0002', 'DEP0007', 'DSG0014', 'Security Engineer', 'Implements security measures', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(15, 15, 'CMP0001', 'BRN0002', 'DEP0008', 'DSG0015', 'Data Analyst', 'Analyzes data', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(16, 16, 'CMP0001', 'BRN0002', 'DEP0008', 'DSG0016', 'Data Scientist', 'Develops data models', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(17, 17, 'CMP0001', 'BRN0002', 'DEP0009', 'DSG0017', 'Finance Manager', 'Manages finances', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(18, 18, 'CMP0001', 'BRN0002', 'DEP0009', 'DSG0018', 'Accountant', 'Handles accounts', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(19, 19, 'CMP0001', 'BRN0002', 'DEP0010', 'DSG0019', 'IT Consultant', 'Provides consulting services', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(20, 20, 'CMP0001', 'BRN0002', 'DEP0010', 'DSG0020', 'Business Analyst', 'Analyzes business needs', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0003 (Infosys Bangalore Campus 3)
(21, 21, 'CMP0001', 'BRN0003', 'DEP0011', 'DSG0021', 'AI Engineer', 'Develops AI solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(22, 22, 'CMP0001', 'BRN0003', 'DEP0011', 'DSG0022', 'ML Scientist', 'Researches ML models', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(23, 23, 'CMP0001', 'BRN0003', 'DEP0012', 'DSG0023', 'DevOps Engineer', 'Manages CI/CD pipelines', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(24, 24, 'CMP0001', 'BRN0003', 'DEP0012', 'DSG0024', 'Site Reliability Engineer', 'Ensures system reliability', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(25, 25, 'CMP0001', 'BRN0003', 'DEP0013', 'DSG0025', 'Support Engineer', 'Provides technical support', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(26, 26, 'CMP0001', 'BRN0003', 'DEP0013', 'DSG0026', 'Support Analyst', 'Analyzes support issues', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(27, 27, 'CMP0001', 'BRN0003', 'DEP0014', 'DSG0027', 'Marketing Manager', 'Manages marketing', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(28, 28, 'CMP0001', 'BRN0003', 'DEP0014', 'DSG0028', 'Marketing Executive', 'Executes marketing plans', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(29, 29, 'CMP0001', 'BRN0003', 'DEP0015', 'DSG0029', 'R&D Engineer', 'Conducts research', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(30, 30, 'CMP0001', 'BRN0003', 'DEP0015', 'DSG0030', 'R&D Analyst', 'Analyzes research data', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0004 (Infosys Pune Campus 1)
(31, 31, 'CMP0002', 'BRN0004', 'DEP0016', 'DSG0031', 'Software Developer', 'Develops applications', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(32, 32, 'CMP0002', 'BRN0004', 'DEP0016', 'DSG0032', 'Lead Developer', 'Leads development teams', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(33, 33, 'CMP0002', 'BRN0004', 'DEP0017', 'DSG0033', 'Test Engineer', 'Tests software', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(34, 34, 'CMP0002', 'BRN0004', 'DEP0017', 'DSG0034', 'Test Lead', 'Leads testing efforts', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(35, 35, 'CMP0002', 'BRN0004', 'DEP0018', 'DSG0035', 'Delivery Manager', 'Manages project delivery', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(36, 36, 'CMP0002', 'BRN0004', 'DEP0018', 'DSG0036', 'Project Coordinator', 'Coordinates projects', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(37, 37, 'CMP0002', 'BRN0004', 'DEP0019', 'DSG0037', 'HR Specialist', 'Handles recruitment', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(38, 38, 'CMP0002', 'BRN0004', 'DEP0019', 'DSG0038', 'HR Assistant', 'Supports HR tasks', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(39, 39, 'CMP0002', 'BRN0004', 'DEP0020', 'DSG0039', 'Network Engineer', 'Manages networks', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(40, 40, 'CMP0002', 'BRN0004', 'DEP0020', 'DSG0040', 'Network Administrator', 'Administers networks', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0005 (Infosys Pune Campus 2)
(41, 41, 'CMP0002', 'BRN0005', 'DEP0021', 'DSG0041', 'Cloud Solutions Engineer', 'Implements cloud solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(42, 42, 'CMP0002', 'BRN0005', 'DEP0021', 'DSG0042', 'Cloud Solutions Architect', 'Designs cloud architectures', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(43, 43, 'CMP0002', 'BRN0005', 'DEP0022', 'DSG0043', 'Security Operations Analyst', 'Monitors security operations', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(44, 44, 'CMP0002', 'BRN0005', 'DEP0022', 'DSG0044', 'Security Operations Engineer', 'Implements security operations', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(45, 45, 'CMP0002', 'BRN0005', 'DEP0023', 'DSG0045', 'Business Intelligence Analyst', 'Analyzes business data', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(46, 46, 'CMP0002', 'BRN0005', 'DEP0023', 'DSG0046', 'Business Intelligence Developer', 'Develops BI solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(47, 47, 'CMP0002', 'BRN0005', 'DEP0024', 'DSG0047', 'Financial Analyst', 'Analyzes financial data', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(48, 48, 'CMP0002', 'BRN0005', 'DEP0024', 'DSG0048', 'Accountant', 'Handles financial records', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(49, 49, 'CMP0002', 'BRN0005', 'DEP0025', 'DSG0049', 'Consulting Manager', 'Manages consulting projects', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(50, 50, 'CMP0002', 'BRN0005', 'DEP0025', 'DSG0050', 'Strategy Consultant', 'Provides strategic advice', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0006 (Infosys Pune Campus 3)
(51, 51, 'CMP0002', 'BRN0006', 'DEP0026', 'DSG0051', 'ML Engineer', 'Develops ML models', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(52, 52, 'CMP0002', 'BRN0006', 'DEP0026', 'DSG0052', 'ML Researcher', 'Researches ML techniques', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(53, 53, 'CMP0002', 'BRN0006', 'DEP0027', 'DSG0053', 'Automation Engineer', 'Develops automation solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(54, 54, 'CMP0002', 'BRN0006', 'DEP0027', 'DSG0054', 'Robotics Engineer', 'Designs robotic systems', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(55, 55, 'CMP0002', 'BRN0006', 'DEP0028', 'DSG0055', 'Support Specialist', 'Provides customer support', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(56, 56, 'CMP0002', 'BRN0006', 'DEP0028', 'DSG0056', 'Support Lead', 'Leads support team', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(57, 57, 'CMP0002', 'BRN0006', 'DEP0029', 'DSG0057', 'Digital Marketing Manager', 'Manages digital campaigns', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(58, 58, 'CMP0002', 'BRN0006', 'DEP0029', 'DSG0058', 'SEO Specialist', 'Optimizes web content', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(59, 59, 'CMP0002', 'BRN0006', 'DEP0030', 'DSG0059', 'Innovation Manager', 'Drives innovation', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(60, 60, 'CMP0002', 'BRN0006', 'DEP0030', 'DSG0060', 'Product Developer', 'Develops new products', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0007 (Infosys Hyderabad Campus 1)
(61, 61, 'CMP0003', 'BRN0007', 'DEP0031', 'DSG0061', 'Application Developer', 'Develops applications', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(62, 62, 'CMP0003', 'BRN0007', 'DEP0031', 'DSG0062', 'Application Support', 'Supports applications', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(63, 63, 'CMP0003', 'BRN0007', 'DEP0032', 'DSG0063', 'Quality Analyst', 'Ensures quality standards', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(64, 64, 'CMP0003', 'BRN0007', 'DEP0032', 'DSG0064', 'Quality Manager', 'Manages quality processes', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(65, 65, 'CMP0003', 'BRN0007', 'DEP0033', 'DSG0065', 'Program Manager', 'Manages programs', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(66, 66, 'CMP0003', 'BRN0007', 'DEP0033', 'DSG0066', 'Portfolio Manager', 'Manages project portfolios', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(67, 67, 'CMP0003', 'BRN0007', 'DEP0034', 'DSG0067', 'Recruitment Manager', 'Manages recruitment', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(68, 68, 'CMP0003', 'BRN0007', 'DEP0034', 'DSG0068', 'Talent Scout', 'Identifies talent', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(69, 69, 'CMP0003', 'BRN0007', 'DEP0035', 'DSG0069', 'Systems Engineer', 'Manages systems', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(70, 70, 'CMP0003', 'BRN0007', 'DEP0035', 'DSG0070', 'Systems Administrator', 'Administers systems', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0008 (Infosys Hyderabad Campus 2)
(71, 71, 'CMP0003', 'BRN0008', 'DEP0036', 'DSG0071', 'Cloud Engineer', 'Implements cloud solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(72, 72, 'CMP0003', 'BRN0008', 'DEP0036', 'DSG0072', 'Cloud Architect', 'Designs cloud systems', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(73, 73, 'CMP0003', 'BRN0008', 'DEP0037', 'DSG0073', 'Threat Analyst', 'Analyzes security threats', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(74, 74, 'CMP0003', 'BRN0008', 'DEP0037', 'DSG0074', 'Security Specialist', 'Implements security measures', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(75, 75, 'CMP0003', 'BRN0008', 'DEP0038', 'DSG0075', 'Data Scientist', 'Develops data models', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(76, 76, 'CMP0003', 'BRN0008', 'DEP0038', 'DSG0076', 'Data Analyst', 'Analyzes data', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(77, 77, 'CMP0003', 'BRN0008', 'DEP0039', 'DSG0077', 'Finance Manager', 'Manages finances', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(78, 78, 'CMP0003', 'BRN0008', 'DEP0039', 'DSG0078', 'Accountant', 'Handles accounts', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(79, 79, 'CMP0003', 'BRN0008', 'DEP0040', 'DSG0079', 'Business Consultant', 'Provides consulting services', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(80, 80, 'CMP0003', 'BRN0008', 'DEP0040', 'DSG0080', 'Strategy Analyst', 'Analyzes business strategies', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
-- BRN0009 (Infosys Hyderabad Campus 3)
(81, 81, 'CMP0003', 'BRN0009', 'DEP0041', 'DSG0081', 'AI Engineer', 'Develops AI solutions', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(82, 82, 'CMP0003', 'BRN0009', 'DEP0041', 'DSG0082', 'ML Engineer', 'Develops ML models', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(83, 83, 'CMP0003', 'BRN0009', 'DEP0042', 'DSG0083', 'CI/CD Engineer', 'Manages CI/CD pipelines', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(84, 84, 'CMP0003', 'BRN0009', 'DEP0042', 'DSG0084', 'DevOps Specialist', 'Implements DevOps practices', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(85, 85, 'CMP0003', 'BRN0009', 'DEP0043', 'DSG0085', 'Support Engineer', 'Provides customer support', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(86, 86, 'CMP0003', 'BRN0009', 'DEP0043', 'DSG0086', 'Support Analyst', 'Analyzes support issues', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(87, 87, 'CMP0003', 'BRN0009', 'DEP0044', 'DSG0087', 'Brand Manager', 'Manages brand strategy', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(88, 88, 'CMP0003', 'BRN0009', 'DEP0044', 'DSG0088', 'Marketing Executive', 'Executes marketing plans', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(89, 89, 'CMP0003', 'BRN0009', 'DEP0045', 'DSG0089', 'Product Manager', 'Manages product development', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(90, 90, 'CMP0003', 'BRN0009', 'DEP0045', 'DSG0090', 'Product Developer', 'Develops new products', 'active', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW());

-- Insert Employees (10, 2 with allow_authentication = 1)
INSERT INTO `infosysdb`.`employees` (
    `id`, `sno`, `company_id`, `branch_id`, `user_id`, `employee_id`, `first_name`, `last_name`, `role_id`, `birth_date`, `phone`,
    `phone_alt`, `email`, `email_alt`, `username`, `password`, `joined_date`, `secure_version`, `allow_authentication`,
    `created_by`, `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
(1, 1, 'CMP0001', 'BRN0001', 'USR0005', 'EMP0001', 'Anjali', 'Patel', 1, '1984-03-10', '+91-9123000013', NULL, 'anjali.patel@infosys.in', NULL, 'anjali.patel', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 1, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(2, 2, 'CMP0001', 'BRN0002', 'USR0006', 'EMP0002', 'Rahul', 'Sharma', 2, '1986-07-15', '+91-9123000014', NULL, 'rahul.sharma@infosys.in', NULL, 'rahul.sharma', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 1, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(3, 3, 'CMP0001', 'BRN0003', 'USR0007', 'EMP0003', 'Priya', 'Mehta', 3, '1990-05-20', '+91-9123000015', NULL, 'priya.mehta@infosys.in', NULL, 'priya.mehta', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 0, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(4, 4, 'CMP0002', 'BRN0004', 'USR0008', 'EMP0004', 'Vikram', 'Singh', 3, '1988-09-25', '+91-9123000016', NULL, 'vikram.singh@infosys.in', NULL, 'vikram.singh', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 0, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(5, 5, 'CMP0002', 'BRN0005', 'USR0009', 'EMP0005', 'Sneha', 'Verma', 3, '1992-02-10', '+91-9123000017', NULL, 'sneha.verma@infosys.in', NULL, 'sneha.verma', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 0, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(6, 6, 'CMP0002', 'BRN0006', 'USR0010', 'EMP0006', 'Arjun', 'Reddy', 3, '1987-11-05', '+91-9123000018', NULL, 'arjun.reddy@infosys.in', NULL, 'arjun.reddy', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 0, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(7, 7, 'CMP0003', 'BRN0007', 'USR0011', 'EMP0007', 'Kavya', 'Rao', 3, '1991-04-15', '+91-9123000019', NULL, 'kavya.rao@infosys.in', NULL, 'kavya.rao', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 0, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(8, 8, 'CMP0003', 'BRN0008', 'USR0012', 'EMP0008', 'Sanjay', 'Kumar', 3, '1989-08-20', '+91-9123000020', NULL, 'sanjay.kumar@infosys.in', NULL, 'sanjay.kumar', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 0, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(9, 9, 'CMP0003', 'BRN0009', 'USR0013', 'EMP0009', 'Pooja', 'Nair', 3, '1993-01-25', '+91-9123000021', NULL, 'pooja.nair@infosys.in', NULL, 'pooja.nair', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 0, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(10, 10, 'CMP0003', 'BRN0009', 'USR0014 ', 'EMP0010', 'Rohit', 'Joshi', 3, '1987-06-30', '+91-9123000022', NULL, 'rohit.joshi@infosys.in', NULL, 'rohit.joshi', '$2y$12$eXlUhkp.JLmNR8Z242VReuomhtlVmN57W1LVDhYxUuVGv9obfq40G', '2019-01-01', '1', 0, 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW());

-- Insert Employee Work Details (for 10 employees)
INSERT INTO `infosysdb`.`employee_work` (
    `id`, `company_id`, `branch_id`, `employee_id`, `department_id`, `designation_id`, `device_id`, `device_user_id`,
    `schedule_id`, `geofence`, `max_leaves`, `priority`, `in_devices`, `storage`, `account_status`, `work_force`,
    `last_update`, `secure_version`, `created_by`, `updated_by`, `delete_on`, `restored_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
(1, 'CMP0001', 'BRN0001', 'EMP0001', 'DEP0003', 'DSG0005', NULL, NULL, NULL, '{}', 30, 1, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(2, 'CMP0001', 'BRN0002', 'EMP0002', 'DEP0006', 'DSG0012', NULL, NULL, NULL, '{}', 30, 2, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(3, 'CMP0001', 'BRN0003', 'EMP0003', 'DEP0011', 'DSG0021', NULL, NULL, NULL, '{}', 25, 3, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(4, 'CMP0002', 'BRN0004', 'EMP0004', 'DEP0016', 'DSG0031', NULL, NULL, NULL, '{}', 25, 4, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(5, 'CMP0002', 'BRN0005', 'EMP0005', 'DEP0021', 'DSG0041', NULL, NULL, NULL, '{}', 25, 5, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(6, 'CMP0002', 'BRN0006', 'EMP0006', 'DEP0026', 'DSG0051', NULL, NULL, NULL, '{}', 25, 6, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(7, 'CMP0003', 'BRN0007', 'EMP0007', 'DEP0031', 'DSG0061', NULL, NULL, NULL, '{}', 25, 7, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(8, 'CMP0003', 'BRN0008', 'EMP0008', 'DEP0036', 'DSG0071', NULL, NULL, NULL, '{}', 25, 8, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(9, 'CMP0003', 'BRN0009', 'EMP0009', 'DEP0041', 'DSG0081', NULL, NULL, NULL, '{}', 25, 9, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW()),
(10, 'CMP0003', 'BRN0009', 'EMP0010', 'DEP0043', 'DSG0085', NULL, NULL, NULL, '{}', 25, 10, '{}', '{}', 'active', '{}', NOW(), '1', 'USR0005', 'USR0005', NULL, NULL, NULL, NOW(), NOW());