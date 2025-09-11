-- CreateTable
CREATE TABLE `condominiums` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `zip_code` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `admin_contact` VARCHAR(191) NULL,
    `total_units` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `subscription_plan` ENUM('BASIC', 'PREMIUM', 'ENTERPRISE') NOT NULL DEFAULT 'BASIC',
    `subscription_expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `condominiums_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `photo` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `document` VARCHAR(191) NULL,
    `document_type` ENUM('CPF', 'RG', 'CNH', 'PASSPORT') NOT NULL DEFAULT 'CPF',
    `birth_date` DATETIME(3) NULL,
    `face_recognition_folder` VARCHAR(191) NULL,
    `face_recognition_enabled` BOOLEAN NOT NULL DEFAULT false,
    `face_models_count` INTEGER NOT NULL DEFAULT 0,
    `last_face_training` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_super_admin` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_condominium_access` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `access_level` ENUM('RESIDENT', 'EMPLOYEE', 'ADMIN', 'VISITOR') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `granted_by` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_condominium_access_user_id_condominium_id_key`(`user_id`, `condominium_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `arduino_configurations` (
    `id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `device_name` VARCHAR(191) NOT NULL,
    `device_code` VARCHAR(191) NOT NULL,
    `wifi_ssid` VARCHAR(191) NULL,
    `wifi_password` VARCHAR(191) NULL,
    `connection_port` VARCHAR(191) NOT NULL DEFAULT 'COM4',
    `baud_rate` INTEGER NOT NULL DEFAULT 9600,
    `device_location` VARCHAR(191) NULL,
    `device_type` ENUM('MAIN_GATE', 'GARAGE', 'PEDESTRIAN', 'EMERGENCY') NOT NULL DEFAULT 'MAIN_GATE',
    `pin_configurations` JSON NULL,
    `command_mapping` JSON NULL,
    `is_online` BOOLEAN NOT NULL DEFAULT false,
    `last_ping` DATETIME(3) NULL,
    `firmware_version` VARCHAR(191) NULL,
    `installation_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `arduino_configurations_device_code_key`(`device_code`),
    UNIQUE INDEX `arduino_configurations_condominium_id_device_location_key`(`condominium_id`, `device_location`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `block` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `floor` INTEGER NULL,
    `area` DECIMAL(8, 2) NULL,
    `bedrooms` INTEGER NULL,
    `bathrooms` INTEGER NULL,
    `parking_spaces` INTEGER NOT NULL DEFAULT 0,
    `unit_type` ENUM('APARTMENT', 'HOUSE', 'COMMERCIAL', 'STORAGE') NOT NULL DEFAULT 'APARTMENT',
    `monthly_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_occupied` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_condominium_id_block_number_key`(`condominium_id`, `block`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `residents` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `unit_id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `relationship_type` ENUM('OWNER', 'TENANT', 'FAMILY_MEMBER', 'AUTHORIZED') NOT NULL DEFAULT 'OWNER',
    `emergency_contact` VARCHAR(191) NULL,
    `vehicle_plates` JSON NULL,
    `access_permissions` JSON NULL,
    `move_in_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `move_out_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `residents_user_id_unit_id_key`(`user_id`, `unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `employee_code` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NULL,
    `access_card_id` VARCHAR(191) NULL,
    `salary` DECIMAL(10, 2) NULL,
    `commission_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `work_schedule` JSON NULL,
    `permissions` JSON NULL,
    `hire_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `termination_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `supervisor_id` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_access_card_id_key`(`access_card_id`),
    UNIQUE INDEX `employees_condominium_id_employee_code_key`(`condominium_id`, `employee_code`),
    UNIQUE INDEX `employees_user_id_condominium_id_key`(`user_id`, `condominium_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guests` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `document` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `invited_by_resident_id` VARCHAR(191) NOT NULL,
    `invited_by_employee_id` VARCHAR(191) NULL,
    `visit_purpose` VARCHAR(191) NULL,
    `vehicle_plate` VARCHAR(191) NULL,
    `access_code` VARCHAR(191) NULL,
    `valid_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valid_until` DATETIME(3) NULL,
    `access_duration_minutes` INTEGER NOT NULL DEFAULT 60,
    `auto_expire` BOOLEAN NOT NULL DEFAULT true,
    `max_entries` INTEGER NOT NULL DEFAULT 1,
    `current_entries` INTEGER NOT NULL DEFAULT 0,
    `authorized_locations` JSON NULL,
    `visitor_photo` VARCHAR(191) NULL,
    `face_recognition_folder` VARCHAR(191) NULL,
    `face_recognition_enabled` BOOLEAN NOT NULL DEFAULT false,
    `notification_sent` BOOLEAN NOT NULL DEFAULT false,
    `last_access_attempt` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `access_logs` (
    `id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `arduino_id` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `access_type` ENUM('RESIDENT', 'EMPLOYEE', 'GUEST', 'UNKNOWN', 'EMERGENCY') NOT NULL,
    `access_method` ENUM('FACIAL_RECOGNITION', 'ACCESS_CARD', 'ACCESS_CODE', 'MANUAL', 'EMERGENCY') NOT NULL,
    `status` ENUM('APPROVED', 'REJECTED', 'PENDING', 'FORCED') NOT NULL DEFAULT 'APPROVED',
    `user_id` VARCHAR(191) NULL,
    `guest_id` VARCHAR(191) NULL,
    `entry_exit` ENUM('ENTRY', 'EXIT') NOT NULL,
    `location` VARCHAR(191) NULL,
    `arduino_command_sent` VARCHAR(191) NULL,
    `response_time_ms` INTEGER NULL,
    `vehicle_plate` VARCHAR(191) NULL,
    `photo_evidence` VARCHAR(191) NULL,
    `additional_data` JSON NULL,
    `denial_reason` VARCHAR(191) NULL,
    `authorized_by` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `arduino_id` VARCHAR(191) NULL,
    `alert_type` ENUM('UNAUTHORIZED_ACCESS', 'FORCED_ENTRY', 'SYSTEM_OFFLINE', 'SUSPICIOUS_ACTIVITY', 'EMERGENCY') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `triggered_by` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `is_resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolved_by` VARCHAR(191) NULL,
    `resolved_at` DATETIME(3) NULL,
    `resolution_notes` VARCHAR(191) NULL,
    `additional_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_categories` (
    `id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `parent_category_id` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `financial_categories_condominium_id_name_key`(`condominium_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `account_name` VARCHAR(191) NOT NULL,
    `account_type` ENUM('CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'INVESTMENT') NOT NULL DEFAULT 'CHECKING',
    `bank_name` VARCHAR(191) NULL,
    `account_number` VARCHAR(191) NULL,
    `agency` VARCHAR(191) NULL,
    `current_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_entries` (
    `id` VARCHAR(191) NOT NULL,
    `condominium_id` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `transaction_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `due_date` DATETIME(3) NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL') NOT NULL DEFAULT 'PENDING',
    `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `paid_date` DATETIME(3) NULL,
    `payment_method` ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO', 'CHECK') NULL,
    `resident_id` VARCHAR(191) NULL,
    `unit_id` VARCHAR(191) NULL,
    `supplier_vendor` VARCHAR(191) NULL,
    `document_number` VARCHAR(191) NULL,
    `reference_month` VARCHAR(191) NULL,
    `is_recurring` BOOLEAN NOT NULL DEFAULT false,
    `recurrence_pattern` ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NULL,
    `parent_entry_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `approved_by` VARCHAR(191) NULL,
    `approval_date` DATETIME(3) NULL,
    `additional_data` JSON NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_condominium_access` ADD CONSTRAINT `user_condominium_access_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_condominium_access` ADD CONSTRAINT `user_condominium_access_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_condominium_access` ADD CONSTRAINT `user_condominium_access_granted_by_fkey` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `arduino_configurations` ADD CONSTRAINT `arduino_configurations_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guests` ADD CONSTRAINT `guests_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guests` ADD CONSTRAINT `guests_invited_by_resident_id_fkey` FOREIGN KEY (`invited_by_resident_id`) REFERENCES `residents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guests` ADD CONSTRAINT `guests_invited_by_employee_id_fkey` FOREIGN KEY (`invited_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_logs` ADD CONSTRAINT `access_logs_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_logs` ADD CONSTRAINT `access_logs_arduino_id_fkey` FOREIGN KEY (`arduino_id`) REFERENCES `arduino_configurations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_logs` ADD CONSTRAINT `access_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_logs` ADD CONSTRAINT `access_logs_guest_id_fkey` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_alerts` ADD CONSTRAINT `security_alerts_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_alerts` ADD CONSTRAINT `security_alerts_arduino_id_fkey` FOREIGN KEY (`arduino_id`) REFERENCES `arduino_configurations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_alerts` ADD CONSTRAINT `security_alerts_triggered_by_fkey` FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_alerts` ADD CONSTRAINT `security_alerts_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_categories` ADD CONSTRAINT `financial_categories_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_categories` ADD CONSTRAINT `financial_categories_parent_category_id_fkey` FOREIGN KEY (`parent_category_id`) REFERENCES `financial_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_accounts` ADD CONSTRAINT `financial_accounts_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_condominium_id_fkey` FOREIGN KEY (`condominium_id`) REFERENCES `condominiums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `financial_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `financial_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_resident_id_fkey` FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_parent_entry_id_fkey` FOREIGN KEY (`parent_entry_id`) REFERENCES `financial_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
