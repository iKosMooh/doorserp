-- =====================================================
-- SISTEMA DE GESTÃO DE MÚLTIPLOS CONDOMÍNIOS - DATABASE SETUP COMPLETO
-- =====================================================
-- Sistema completo para gerenciar múltiplos condomínios com:
-- - Controle de acesso independente por condomínio
-- - Sistema financeiro separado por condomínio
-- - Configuração Arduino individual por condomínio
-- - Funcionários específicos por condomínio
-- - Múltiplos níveis de acesso e permissões
-- - Reconhecimento facial com pastas automáticas
-- - Sistema de timeout para visitantes
-- - Sistema de autenticação robusto
-- =====================================================

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS doorserp_multi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE doorserp_multi;

-- =====================================================
-- TABELAS PRINCIPAIS DO SISTEMA
-- =====================================================

-- Tabela de Condomínios (Entidade Principal)
CREATE TABLE condominiums (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    admin_contact VARCHAR(255),
    total_units INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_plan ENUM('BASIC', 'PREMIUM', 'ENTERPRISE') DEFAULT 'BASIC',
    subscription_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_condominiums_name (name),
    INDEX idx_condominiums_city (city),
    INDEX idx_condominiums_state (state),
    INDEX idx_condominiums_active (is_active)
);

-- Tabela de Usuários (Sistema de Autenticação)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    photo VARCHAR(500),
    phone VARCHAR(20),
    document VARCHAR(50),
    document_type ENUM('CPF', 'RG', 'CNH', 'PASSPORT') DEFAULT 'CPF',
    birth_date DATE,
    face_recognition_folder VARCHAR(255),
    face_recognition_enabled BOOLEAN DEFAULT FALSE,
    face_models_count INT DEFAULT 0,
    last_face_training TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    must_change_password BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_active (is_active),
    INDEX idx_users_admin (is_admin)
);

-- Tabela de Sessões de Usuário
CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_token (token),
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_expires_at (expires_at)
);

-- Tabela de Acesso de Usuários aos Condomínios
CREATE TABLE user_condominium_access (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    condominium_id VARCHAR(36) NOT NULL,
    access_level ENUM('RESIDENT', 'EMPLOYEE', 'ADMIN', 'VISITOR') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    granted_by VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_condominium (user_id, condominium_id),
    INDEX idx_access_user_id (user_id),
    INDEX idx_access_condominium_id (condominium_id),
    INDEX idx_access_level (access_level)
);

-- Tabela de Configurações do Arduino
CREATE TABLE arduino_configurations (
    id VARCHAR(36) PRIMARY KEY,
    condominium_id VARCHAR(36) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_code VARCHAR(100) UNIQUE NOT NULL,
    code TEXT,  -- Código completo do Arduino
    wifi_ssid VARCHAR(100),
    wifi_password VARCHAR(255),
    connection_port VARCHAR(20) DEFAULT 'COM4',
    baud_rate INT DEFAULT 9600,
    device_location VARCHAR(255),
    device_type ENUM('MAIN_GATE', 'GARAGE', 'PEDESTRIAN', 'EMERGENCY') DEFAULT 'MAIN_GATE',
    pin_configurations LONGTEXT,
    command_mapping LONGTEXT,
    is_online BOOLEAN DEFAULT FALSE,
    last_ping TIMESTAMP NULL,
    firmware_version VARCHAR(50),
    installation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    UNIQUE KEY unique_condominium_location (condominium_id, device_location),
    INDEX idx_arduino_condominium_id (condominium_id),
    INDEX idx_arduino_device_code (device_code),
    INDEX idx_arduino_online (is_online)
);

-- Tabela de Unidades
CREATE TABLE units (
    id VARCHAR(36) PRIMARY KEY,
    condominium_id VARCHAR(36) NOT NULL,
    block VARCHAR(10) NOT NULL,
    number VARCHAR(20) NOT NULL,
    floor INT,
    area DECIMAL(8,2),
    bedrooms INT,
    bathrooms INT,
    parking_spaces INT DEFAULT 0,
    unit_type ENUM('APARTMENT', 'HOUSE', 'COMMERCIAL', 'STORAGE') DEFAULT 'APARTMENT',
    monthly_fee DECIMAL(10,2) DEFAULT 0.00,
    is_occupied BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    UNIQUE KEY unique_unit_number_condominium (condominium_id, block, number),
    INDEX idx_units_condominium_id (condominium_id),
    INDEX idx_units_number (number),
    INDEX idx_units_occupied (is_occupied)
);

-- Tabela de Moradores
CREATE TABLE residents (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    unit_id VARCHAR(36) NOT NULL,
    condominium_id VARCHAR(36) NOT NULL,
    relationship_type ENUM('OWNER', 'TENANT', 'FAMILY_MEMBER', 'AUTHORIZED') DEFAULT 'OWNER',
    emergency_contact VARCHAR(255),
    vehicle_plates LONGTEXT,
    access_permissions LONGTEXT,
    move_in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    move_out_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_unit (user_id, unit_id),
    INDEX idx_residents_condominium_id (condominium_id),
    INDEX idx_residents_unit_id (unit_id),
    INDEX idx_residents_user_id (user_id)
);

-- Tabela de Funcionários
CREATE TABLE employees (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    condominium_id VARCHAR(36) NOT NULL,
    employee_code VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    access_card_id VARCHAR(50) UNIQUE,
    salary DECIMAL(10,2),
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    work_schedule LONGTEXT,
    permissions LONGTEXT,
    hire_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    termination_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    supervisor_id VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL,
    UNIQUE KEY unique_condominium_employee_code (condominium_id, employee_code),
    UNIQUE KEY unique_user_condominium_employee (user_id, condominium_id),
    INDEX idx_employees_condominium_id (condominium_id),
    INDEX idx_employees_user_id (user_id),
    INDEX idx_employees_supervisor_id (supervisor_id)
);

-- Tabela de Hóspedes/Visitantes
CREATE TABLE guests (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(50),
    phone VARCHAR(20),
    condominium_id VARCHAR(36) NOT NULL,
    invited_by_resident_id VARCHAR(36) NOT NULL,
    invited_by_employee_id VARCHAR(36),
    visit_purpose TEXT,
    vehicle_plate VARCHAR(10),
    access_code VARCHAR(20),
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL,
    access_duration_minutes INT DEFAULT 60,
    auto_expire BOOLEAN DEFAULT TRUE,
    max_entries INT DEFAULT 1,
    current_entries INT DEFAULT 0,
    authorized_locations LONGTEXT,
    visitor_photo VARCHAR(500),
    face_recognition_folder VARCHAR(255),
    face_recognition_enabled BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    last_access_attempt TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by_resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    INDEX idx_guests_condominium_id (condominium_id),
    INDEX idx_guests_invited_by_resident_id (invited_by_resident_id),
    INDEX idx_guests_invited_by_employee_id (invited_by_employee_id),
    INDEX idx_guests_valid_until (valid_until)
);

-- Tabela de Logs de Acesso
CREATE TABLE access_logs (
    id VARCHAR(36) PRIMARY KEY,
    condominium_id VARCHAR(36) NOT NULL,
    arduino_id VARCHAR(36),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_type ENUM('RESIDENT', 'EMPLOYEE', 'GUEST', 'UNKNOWN', 'EMERGENCY') NOT NULL,
    access_method ENUM('FACIAL_RECOGNITION', 'ACCESS_CARD', 'ACCESS_CODE', 'MANUAL', 'EMERGENCY') NOT NULL,
    status ENUM('APPROVED', 'REJECTED', 'PENDING', 'FORCED') DEFAULT 'APPROVED',
    user_id VARCHAR(36),
    guest_id VARCHAR(36),
    entry_exit ENUM('ENTRY', 'EXIT') NOT NULL,
    location VARCHAR(255),
    arduino_command_sent VARCHAR(255),
    response_time_ms INT,
    vehicle_plate VARCHAR(10),
    photo_evidence VARCHAR(500),
    additional_data LONGTEXT,
    denial_reason TEXT,
    authorized_by VARCHAR(36),
    notes TEXT,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (arduino_id) REFERENCES arduino_configurations(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL,
    INDEX idx_access_logs_condominium_id (condominium_id),
    INDEX idx_access_logs_timestamp (timestamp),
    INDEX idx_access_logs_access_type (access_type),
    INDEX idx_access_logs_access_method (access_method),
    INDEX idx_access_logs_arduino_id (arduino_id)
);

-- Tabela de Alertas de Segurança
CREATE TABLE security_alerts (
    id VARCHAR(36) PRIMARY KEY,
    condominium_id VARCHAR(36) NOT NULL,
    arduino_id VARCHAR(36),
    alert_type ENUM('UNAUTHORIZED_ACCESS', 'FORCED_ENTRY', 'SYSTEM_OFFLINE', 'SUSPICIOUS_ACTIVITY', 'EMERGENCY') NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    triggered_by VARCHAR(36),
    location VARCHAR(255),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(36),
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    additional_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (arduino_id) REFERENCES arduino_configurations(id) ON DELETE SET NULL,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_security_alerts_condominium_id (condominium_id),
    INDEX idx_security_alerts_created_at (created_at),
    INDEX idx_security_alerts_resolved (is_resolved),
    INDEX idx_security_alerts_alert_type (alert_type)
);

-- Tabela de Categorias Financeiras
CREATE TABLE financial_categories (
    id VARCHAR(36) PRIMARY KEY,
    condominium_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    parent_category_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_category_id) REFERENCES financial_categories(id) ON DELETE SET NULL,
    UNIQUE KEY unique_condominium_category_name (condominium_id, name),
    INDEX idx_financial_categories_condominium_id (condominium_id),
    INDEX idx_financial_categories_type (type),
    INDEX idx_financial_categories_parent_id (parent_category_id)
);

-- Tabela de Contas Financeiras
CREATE TABLE financial_accounts (
    id VARCHAR(36) PRIMARY KEY,
    condominium_id VARCHAR(36) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type ENUM('CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'INVESTMENT') DEFAULT 'CHECKING',
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    agency VARCHAR(20),
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    INDEX idx_financial_accounts_condominium_id (condominium_id)
);

-- Tabela de Lançamentos Financeiros
CREATE TABLE financial_entries (
    id VARCHAR(36) PRIMARY KEY,
    condominium_id VARCHAR(36) NOT NULL,
    account_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    status ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL') DEFAULT 'PENDING',
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    paid_date TIMESTAMP NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO', 'CHECK'),
    resident_id VARCHAR(36),
    unit_id VARCHAR(36),
    supplier_vendor VARCHAR(255),
    document_number VARCHAR(100),
    reference_month VARCHAR(7),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern ENUM('MONTHLY', 'QUARTERLY', 'YEARLY'),
    parent_entry_id VARCHAR(36),
    created_by VARCHAR(36) NOT NULL,
    approved_by VARCHAR(36),
    approval_date TIMESTAMP NULL,
    additional_data LONGTEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES financial_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_entry_id) REFERENCES financial_entries(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_financial_entries_condominium_id (condominium_id),
    INDEX idx_financial_entries_account_id (account_id),
    INDEX idx_financial_entries_category_id (category_id),
    INDEX idx_financial_entries_type (type),
    INDEX idx_financial_entries_status (status),
    INDEX idx_financial_entries_due_date (due_date)
);

-- =====================================================
-- INSERÇÃO DE DADOS PADRÃO
-- =====================================================

-- Inserir usuário administrador global padrão
INSERT INTO users (
    id, 
    email, 
    password, 
    name, 
    is_active, 
    is_admin, 
    is_super_admin, 
    must_change_password
) VALUES (
    'admin-global-001',
    'admin@doorserp.com',
    '$2a$12$LQv3c1yqBwWDp0k4DtKjguQzBKHNHpCCOrLOcvpQb7NbIgfHa4bqa', -- admin123
    'Administrador Global',
    TRUE,
    TRUE,
    TRUE,
    TRUE
);

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View para resumo de condomínios
CREATE VIEW condominium_summary AS
SELECT 
    c.id,
    c.name,
    c.city,
    c.state,
    c.total_units,
    c.subscription_plan,
    COUNT(DISTINCT u.id) as total_units_created,
    COUNT(DISTINCT r.id) as total_residents,
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT g.id) as total_active_guests,
    COUNT(DISTINCT ac.id) as total_arduino_devices
FROM condominiums c
LEFT JOIN units u ON c.id = u.condominium_id AND u.is_active = TRUE
LEFT JOIN residents r ON c.id = r.condominium_id AND r.is_active = TRUE
LEFT JOIN employees e ON c.id = e.condominium_id AND e.is_active = TRUE
LEFT JOIN guests g ON c.id = g.condominium_id AND g.is_active = TRUE
LEFT JOIN arduino_configurations ac ON c.id = ac.condominium_id AND ac.is_active = TRUE
WHERE c.is_active = TRUE
GROUP BY c.id;

-- View para logs de acesso recentes
CREATE VIEW recent_access_logs AS
SELECT 
    al.id,
    al.condominium_id,
    c.name as condominium_name,
    al.access_type,
    al.access_method,
    al.location,
    COALESCE(u.name, g.name) as person_name,
    al.timestamp
FROM access_logs al
JOIN condominiums c ON al.condominium_id = c.id
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN guests g ON al.guest_id = g.id
WHERE al.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY al.timestamp DESC;

-- =====================================================
-- STORED PROCEDURES ÚTEIS
-- =====================================================

DELIMITER //

-- Procedure para limpar dados antigos
CREATE PROCEDURE CleanOldData()
BEGIN
    -- Limpar logs de acesso antigos (mais de 1 ano)
    DELETE FROM access_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    
    -- Limpar sessões expiradas
    DELETE FROM sessions WHERE expires_at < NOW();
    
    -- Limpar hóspedes com acesso expirado há mais de 30 dias
    DELETE FROM guests WHERE valid_until < DATE_SUB(NOW(), INTERVAL 30 DAY) AND is_active = FALSE;
    
    -- Limpar alertas resolvidos antigos (mais de 6 meses)
    DELETE FROM security_alerts WHERE resolved_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
END //

-- Procedure para backup de dados críticos
CREATE PROCEDURE BackupCriticalData()
BEGIN
    -- Esta procedure pode ser expandida para criar backups
    -- Por enquanto, apenas uma estrutura básica
    SELECT 'Backup procedure - implementar conforme necessário' as status;
END //

DELIMITER ;

-- =====================================================
-- TRIGGERS PARA AUDITORIA E INTEGRIDADE
-- =====================================================

DELIMITER //

-- Trigger para atualizar contador de unidades no condomínio
CREATE TRIGGER update_unit_count_after_insert
AFTER INSERT ON units
FOR EACH ROW
BEGIN
    UPDATE condominiums 
    SET total_units = (
        SELECT COUNT(*) FROM units 
        WHERE condominium_id = NEW.condominium_id AND is_active = TRUE
    )
    WHERE id = NEW.condominium_id;
END //

CREATE TRIGGER update_unit_count_after_update
AFTER UPDATE ON units
FOR EACH ROW
BEGIN
    UPDATE condominiums 
    SET total_units = (
        SELECT COUNT(*) FROM units 
        WHERE condominium_id = NEW.condominium_id AND is_active = TRUE
    )
    WHERE id = NEW.condominium_id;
END //

CREATE TRIGGER update_unit_count_after_delete
AFTER DELETE ON units
FOR EACH ROW
BEGIN
    UPDATE condominiums 
    SET total_units = (
        SELECT COUNT(*) FROM units 
        WHERE condominium_id = OLD.condominium_id AND is_active = TRUE
    )
    WHERE id = OLD.condominium_id;
END //

DELIMITER ;

-- =====================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =====================================================

-- Índices compostos para consultas frequentes
CREATE INDEX idx_access_logs_condominium_timestamp ON access_logs(condominium_id, timestamp DESC);
CREATE INDEX idx_residents_condominium_active ON residents(condominium_id, is_active);
CREATE INDEX idx_employees_condominium_active ON employees(condominium_id, is_active);
CREATE INDEX idx_guests_condominium_active_expires ON guests(condominium_id, is_active, valid_until);

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

/*
INSTRUÇÕES DE USO:

1. Execute este script em um servidor MySQL 8.0 ou superior
2. Certifique-se de que o banco doorserp_multi foi criado
3. O usuário admin padrão foi criado com:
   - Email: admin@doorserp.com
   - Senha: admin123 (DEVE ser alterada no primeiro login)

4. Para manutenção regular, execute:
   CALL CleanOldData();

5. Para monitoramento, use as views:
   SELECT * FROM condominium_summary;
   SELECT * FROM recent_access_logs;

6. Certifique-se de configurar backups regulares
7. Monitore o crescimento das tabelas de logs
8. Configure rotação de logs conforme necessário

SEGURANÇA:
- Todas as senhas são armazenadas com hash bcrypt
- Use conexões SSL em produção
- Configure firewall adequado
- Monitore tentativas de acesso não autorizadas
- Mantenha o MySQL atualizado

FUNCIONALIDADES INCLUÍDAS:
- Sistema completo de múltiplos condomínios
- Autenticação robusta com sessões
- Controle de acesso por condomínio
- Sistema financeiro completo
- Logs de acesso detalhados
- Alertas de segurança
- Configuração Arduino com código TEXT
- Views para relatórios
- Procedures para manutenção
- Triggers para integridade
- Índices otimizados para performance
*/
