-- Create database
CREATE DATABASE IF NOT EXISTS `tatadb` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `tatadb`;

-- Table: companies
CREATE TABLE `companies` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `sno` INT(11) DEFAULT NULL,
  `company_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `legal_name` VARCHAR(255) DEFAULT NULL,
  `logo` TEXT DEFAULT NULL,
  `founded_date` DATE DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `industry` VARCHAR(255) DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `no_of_employees` INT(11) DEFAULT NULL,
  `tax_id` TEXT DEFAULT NULL,
  `address_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (JSON_VALID(`address_json`)),
  `social_links_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (JSON_VALID(`social_links_json`)),
  `status` VARCHAR(50) DEFAULT NULL,
  `secure_version` VARCHAR(50) DEFAULT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `delete_on` TIMESTAMP NULL DEFAULT NULL,
  `restored_at` TIMESTAMP NULL DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id` (`company_id`),
  UNIQUE KEY `sno` (`sno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: branches
CREATE TABLE `branches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `sno` INT(11) DEFAULT NULL,
  `company_id` VARCHAR(30) NOT NULL,
  `branch_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `legal_name` VARCHAR(255) DEFAULT NULL,
  `logo` TEXT DEFAULT NULL,
  `founded_date` DATE DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `no_of_employees` INT(11) DEFAULT NULL,
  `tax_id` TEXT DEFAULT NULL,
  `address_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (JSON_VALID(`address_json`)),
  `status` VARCHAR(50) DEFAULT NULL,
  `secure_version` VARCHAR(50) DEFAULT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `delete_on` TIMESTAMP NULL DEFAULT NULL,
  `restored_at` TIMESTAMP NULL DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_id` (`branch_id`),
  UNIQUE KEY `sno` (`sno`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: departments
CREATE TABLE `departments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `sno` INT(11) DEFAULT NULL,
  `company_id` VARCHAR(30) NOT NULL,
  `branch_id` VARCHAR(30) DEFAULT NULL,
  `department_id` VARCHAR(30) NOT NULL,
  `department` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `delete_on` TIMESTAMP NULL DEFAULT NULL,
  `restored_at` TIMESTAMP NULL DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `department_id` (`department_id`),
  UNIQUE KEY `sno` (`sno`),
  KEY `company_id` (`company_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `departments_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: designations
CREATE TABLE `designations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `sno` INT(11) DEFAULT NULL,
  `company_id` VARCHAR(30) NOT NULL,
  `branch_id` VARCHAR(30) DEFAULT NULL,
  `department_id` VARCHAR(30) DEFAULT NULL,
  `designation_id` VARCHAR(30) NOT NULL,
  `designation` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `delete_on` TIMESTAMP NULL DEFAULT NULL,
  `restored_at` TIMESTAMP NULL DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `designation_id` (`designation_id`),
  UNIQUE KEY `sno` (`sno`),
  KEY `company_id` (`company_id`),
  KEY `branch_id` (`branch_id`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `designations_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `designations_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `designations_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: roles
CREATE TABLE `roles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: employees
CREATE TABLE `employees` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `sno` INT(11) DEFAULT NULL,
  `company_id` VARCHAR(30) DEFAULT NULL,
  `branch_id` VARCHAR(30) DEFAULT NULL,
  `user_id` VARCHAR(30) NOT NULL,
  `employee_id` VARCHAR(30) NOT NULL,
  `first_name` VARCHAR(255) DEFAULT NULL,
  `last_name` VARCHAR(255) DEFAULT NULL,
  `role_id` INT(3) DEFAULT NULL,
  `birth_date` DATE DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `phone_alt` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `email_alt` VARCHAR(100) DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `password` TEXT DEFAULT NULL,
  `joined_date` DATE DEFAULT NULL,
  `secure_version` VARCHAR(50) DEFAULT NULL,
  `allow_authentication` TINYINT(1) DEFAULT 0,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `delete_on` TIMESTAMP NULL DEFAULT NULL,
  `restored_at` TIMESTAMP NULL DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  UNIQUE KEY `sno` (`sno`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `company_id` (`company_id`),
  KEY `branch_id` (`branch_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `employees_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `employees_ibfk_3` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: employee_work
CREATE TABLE `employee_work` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `company_id` VARCHAR(30) DEFAULT NULL,
  `branch_id` VARCHAR(30) DEFAULT NULL,
  `employee_id` VARCHAR(30) DEFAULT NULL,
  `department_id` VARCHAR(30) DEFAULT NULL,
  `designation_id` VARCHAR(30) DEFAULT NULL,
  `device_id` VARCHAR(30) DEFAULT NULL,
  `device_user_id` VARCHAR(30) DEFAULT NULL,
  `schedule_id` VARCHAR(30) DEFAULT NULL,
  `geofence` TEXT DEFAULT NULL,
  `max_leaves` INT(11) DEFAULT NULL,
  `priority` INT(11) DEFAULT NULL,
  `in_devices` TEXT DEFAULT NULL,
  `storage` TEXT DEFAULT NULL,
  `account_status` VARCHAR(50) DEFAULT NULL,
  `work_force` TEXT DEFAULT NULL,
  `last_update` DATETIME DEFAULT NULL,
  `secure_version` VARCHAR(50) DEFAULT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `delete_on` TIMESTAMP NULL DEFAULT NULL,
  `restored_at` TIMESTAMP NULL DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `branch_id` (`branch_id`),
  KEY `employee_id` (`employee_id`),
  KEY `department_id` (`department_id`),
  KEY `designation_id` (`designation_id`),
  CONSTRAINT `employee_work_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `employee_work_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `employee_work_ibfk_3` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `employee_work_ibfk_4` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `employee_work_ibfk_5` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: permissions
CREATE TABLE `permissions` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` ENUM('create','import','view','edit','export','delete') NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_type_unique` (`name`, `type`),
  KEY `name` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: role_permissions
CREATE TABLE `role_permissions` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT(11) NOT NULL,
  `permission_id` BIGINT(20) UNSIGNED NOT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tokens
CREATE TABLE `tokens` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(30) DEFAULT NULL,
  `token` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `used_at` TIMESTAMP NULL DEFAULT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tokens_user_id_index` (`user_id`),
  KEY `tokens_token_index` (`token`),
  KEY `tokens_type_index` (`type`),
  KEY `tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_permissions
CREATE TABLE `user_permissions` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(30) NOT NULL,
  `permission_id` BIGINT(20) UNSIGNED NOT NULL,
  `created_by` VARCHAR(30) DEFAULT NULL,
  `updated_by` VARCHAR(30) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
