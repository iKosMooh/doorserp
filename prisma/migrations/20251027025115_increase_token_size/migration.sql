-- DropIndex
DROP INDEX `sessions_token_key` ON `sessions`;

-- AlterTable
ALTER TABLE `access_logs` MODIFY `additional_data` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `arduino_configurations` MODIFY `pin_configurations` LONGTEXT NULL,
    MODIFY `command_mapping` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `employees` MODIFY `work_schedule` LONGTEXT NULL,
    MODIFY `permissions` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `financial_entries` MODIFY `additional_data` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `guests` MODIFY `authorized_locations` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `residents` MODIFY `vehicle_plates` LONGTEXT NULL,
    MODIFY `access_permissions` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `security_alerts` MODIFY `additional_data` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `sessions` MODIFY `token` TEXT NOT NULL;
