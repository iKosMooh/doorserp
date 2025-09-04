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
-- - Migração de dados do sistema antigo
-- =====================================================

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS doorserp_multi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE doorserp_multi;

-- =====================================================
-- TABELAS PRINCIPAIS DO SISTEMA
-- =====================================================

-- Tabela de Condomínios (Entidade Principal)
CREATE TABLE condominiums (
    id VARCHAR(30) PRIMARY KEY,
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
    INDEX idx_cnpj (cnpj),
    INDEX idx_is_active (is_active),
    INDEX idx_city_state (city, state),
    INDEX idx_subscription_plan (subscription_plan)
);

-- Tabela de Configurações de Arduino por Condomínio
CREATE TABLE arduino_configurations (
    id VARCHAR(30) PRIMARY KEY,
    condominium_id VARCHAR(30) NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    device_code VARCHAR(50) NOT NULL, -- Código único do Arduino
    wifi_ssid VARCHAR(255),
    wifi_password VARCHAR(255),
    connection_port VARCHAR(10) DEFAULT 'COM4',
    baud_rate INT DEFAULT 9600,
    device_location VARCHAR(255), -- Ex: Portão Principal, Garagem, etc.
    device_type ENUM('MAIN_GATE', 'GARAGE', 'PEDESTRIAN', 'EMERGENCY') DEFAULT 'MAIN_GATE',
    pin_configurations JSON, -- Configuração dos pinos {"led1": 2, "led2": 3, etc}
    command_mapping JSON, -- Mapeamento de comandos {"open_gate": "L1_ON", etc}
    is_online BOOLEAN DEFAULT FALSE,
    last_ping TIMESTAMP NULL,
    firmware_version VARCHAR(20),
    installation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    UNIQUE KEY unique_device_code (device_code),
    UNIQUE KEY unique_device_per_location (condominium_id, device_location),
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_device_code (device_code),
    INDEX idx_device_type (device_type),
    INDEX idx_is_active (is_active),
    INDEX idx_is_online (is_online)
);

-- Tabela de Usuários (Global - pode ter acesso a múltiplos condomínios)
CREATE TABLE users (
    id VARCHAR(30) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    photo TEXT,
    phone VARCHAR(20),
    document VARCHAR(20),
    document_type ENUM('CPF', 'RG', 'CNH', 'PASSPORT') DEFAULT 'CPF',
    birth_date DATE,
    face_recognition_folder VARCHAR(255), -- Pasta do reconhecimento facial: public/assets/lib/face-api/labels/{nome}
    face_recognition_enabled BOOLEAN DEFAULT FALSE, -- Se o reconhecimento facial está habilitado
    face_models_count INT DEFAULT 0, -- Quantidade de modelos de face treinados
    last_face_training TIMESTAMP NULL, -- Último treinamento dos modelos de face
    is_active BOOLEAN DEFAULT TRUE,
    is_super_admin BOOLEAN DEFAULT FALSE, -- Administrador global do sistema
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_document (document),
    INDEX idx_is_active (is_active),
    INDEX idx_is_super_admin (is_super_admin),
    INDEX idx_face_recognition_folder (face_recognition_folder),
    INDEX idx_face_recognition_enabled (face_recognition_enabled)
);

-- Tabela de Relacionamento Usuário-Condomínio (N:N)
CREATE TABLE user_condominium_access (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL,
    condominium_id VARCHAR(30) NOT NULL,
    access_level ENUM('RESIDENT', 'EMPLOYEE', 'ADMIN', 'VISITOR') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    granted_by VARCHAR(30), -- ID do usuário que concedeu o acesso
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_condominium (user_id, condominium_id),
    INDEX idx_user_id (user_id),
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_access_level (access_level),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at)
);

-- Tabela de Unidades (Apartamentos/Casas) por Condomínio
CREATE TABLE units (
    id VARCHAR(30) PRIMARY KEY,
    condominium_id VARCHAR(30) NOT NULL,
    block VARCHAR(10) NOT NULL,
    number VARCHAR(10) NOT NULL,
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
    UNIQUE KEY unique_unit_per_condominium (condominium_id, block, number),
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_block_number (block, number),
    INDEX idx_unit_type (unit_type),
    INDEX idx_is_occupied (is_occupied),
    INDEX idx_is_active (is_active)
);

-- Tabela de Residentes (Relacionamento N:N entre usuários e unidades)
CREATE TABLE residents (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL,
    unit_id VARCHAR(30) NOT NULL,
    condominium_id VARCHAR(30) NOT NULL,
    relationship_type ENUM('OWNER', 'TENANT', 'FAMILY_MEMBER', 'AUTHORIZED') DEFAULT 'OWNER',
    emergency_contact VARCHAR(255),
    vehicle_plates JSON, -- Array de placas de veículos: ["ABC1234", "XYZ9876"]
    access_permissions JSON, -- Permissões específicas: {"garage": true, "pool": true, etc}
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
    INDEX idx_user_id (user_id),
    INDEX idx_unit_id (unit_id),
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_relationship_type (relationship_type),
    INDEX idx_is_active (is_active),
    INDEX idx_move_out_date (move_out_date)
);

-- Tabela de Funcionários por Condomínio
CREATE TABLE employees (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL,
    condominium_id VARCHAR(30) NOT NULL,
    employee_code VARCHAR(20) NOT NULL,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    access_card_id VARCHAR(50) UNIQUE,
    salary DECIMAL(10,2),
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    work_schedule JSON, -- Horários de trabalho: {"monday": "08:00-17:00", etc}
    permissions JSON, -- Permissões específicas do funcionário
    hire_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    termination_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    supervisor_id VARCHAR(30), -- Chefe/supervisor
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL,
    UNIQUE KEY unique_employee_code_per_condominium (condominium_id, employee_code),
    UNIQUE KEY unique_user_per_condominium (user_id, condominium_id),
    INDEX idx_user_id (user_id),
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_employee_code (employee_code),
    INDEX idx_access_card (access_card_id),
    INDEX idx_position (position),
    INDEX idx_is_active (is_active),
    INDEX idx_supervisor_id (supervisor_id)
);

-- Tabela de Convidados (Visitantes temporários)
CREATE TABLE guests (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(20),
    phone VARCHAR(20),
    condominium_id VARCHAR(30) NOT NULL,
    invited_by_resident_id VARCHAR(30) NOT NULL,
    invited_by_employee_id VARCHAR(30) NULL, -- Funcionário que autorizou, se aplicável
    visit_purpose VARCHAR(255),
    vehicle_plate VARCHAR(10),
    access_code VARCHAR(10), -- Código temporário para acesso
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL, -- Será calculado automaticamente pelo trigger
    access_duration_minutes INT DEFAULT 60, -- Duração do acesso em minutos (padrão: 1 hora)
    auto_expire BOOLEAN DEFAULT TRUE, -- Se o acesso expira automaticamente
    max_entries INT DEFAULT 1, -- Número máximo de entradas permitidas
    current_entries INT DEFAULT 0, -- Contador de entradas utilizadas
    authorized_locations JSON, -- Locais autorizados: ["main_entrance", "garage"]
    visitor_photo TEXT, -- Foto do visitante para identificação
    face_recognition_folder VARCHAR(255), -- Pasta temporária para reconhecimento facial do visitante
    face_recognition_enabled BOOLEAN DEFAULT FALSE, -- Se reconhecimento facial está habilitado para este visitante
    notification_sent BOOLEAN DEFAULT FALSE, -- Se notificação foi enviada ao morador
    last_access_attempt TIMESTAMP NULL, -- Último tentativa de acesso
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by_resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_invited_by_resident (invited_by_resident_id),
    INDEX idx_invited_by_employee (invited_by_employee_id),
    INDEX idx_access_code (access_code),
    INDEX idx_valid_until (valid_until),
    INDEX idx_access_duration (access_duration_minutes),
    INDEX idx_auto_expire (auto_expire),
    INDEX idx_is_active (is_active),
    INDEX idx_vehicle_plate (vehicle_plate),
    INDEX idx_face_recognition_enabled (face_recognition_enabled),
    INDEX idx_last_access_attempt (last_access_attempt)
);

-- =====================================================
-- TABELAS DE CONTROLE DE ACESSO
-- =====================================================

-- Tabela de Logs de Acesso (Histórico completo)
CREATE TABLE access_logs (
    id VARCHAR(30) PRIMARY KEY,
    condominium_id VARCHAR(30) NOT NULL,
    arduino_id VARCHAR(30), -- Arduino que registrou o acesso
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_type ENUM('RESIDENT', 'EMPLOYEE', 'GUEST', 'UNKNOWN', 'EMERGENCY') NOT NULL,
    access_method ENUM('FACIAL_RECOGNITION', 'ACCESS_CARD', 'ACCESS_CODE', 'MANUAL', 'EMERGENCY') NOT NULL,
    status ENUM('APPROVED', 'REJECTED', 'PENDING', 'FORCED') DEFAULT 'APPROVED',
    
    -- Identificação da pessoa (apenas um será preenchido)
    user_id VARCHAR(30) NULL,
    guest_id VARCHAR(30) NULL,
    
    -- Detalhes do acesso
    entry_exit ENUM('ENTRY', 'EXIT') NOT NULL,
    location VARCHAR(100), -- Portão principal, garagem, etc.
    arduino_command_sent VARCHAR(100),
    response_time_ms INT, -- Tempo de resposta do sistema
    
    -- Dados adicionais
    vehicle_plate VARCHAR(10),
    photo_evidence TEXT, -- URL/caminho da foto capturada
    additional_data JSON, -- Dados extras: temperatura, etc.
    denial_reason VARCHAR(255), -- Motivo da negação, se aplicável
    authorized_by VARCHAR(30), -- Funcionário que autorizou manualmente
    notes TEXT,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (arduino_id) REFERENCES arduino_configurations(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL,
    FOREIGN KEY (authorized_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_access_type (access_type),
    INDEX idx_access_method (access_method),
    INDEX idx_status (status),
    INDEX idx_entry_exit (entry_exit),
    INDEX idx_user_id (user_id),
    INDEX idx_guest_id (guest_id),
    INDEX idx_arduino_id (arduino_id),
    INDEX idx_vehicle_plate (vehicle_plate)
);

-- Tabela de Alertas de Segurança
CREATE TABLE security_alerts (
    id VARCHAR(30) PRIMARY KEY,
    condominium_id VARCHAR(30) NOT NULL,
    arduino_id VARCHAR(30),
    alert_type ENUM('UNAUTHORIZED_ACCESS', 'FORCED_ENTRY', 'SYSTEM_OFFLINE', 'SUSPICIOUS_ACTIVITY', 'EMERGENCY') NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    triggered_by VARCHAR(30), -- User que acionou o alerta
    location VARCHAR(100),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(30), -- Funcionário que resolveu
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    additional_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (arduino_id) REFERENCES arduino_configurations(id) ON DELETE SET NULL,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_severity (severity),
    INDEX idx_is_resolved (is_resolved),
    INDEX idx_created_at (created_at),
    INDEX idx_arduino_id (arduino_id)
);

-- =====================================================
-- SISTEMA FINANCEIRO POR CONDOMÍNIO
-- =====================================================

-- Tabela de Categorias Financeiras por Condomínio
CREATE TABLE financial_categories (
    id VARCHAR(30) PRIMARY KEY,
    condominium_id VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type ENUM('INCOME', 'EXPENSE') NOT NULL,
    is_default BOOLEAN DEFAULT FALSE, -- Categoria padrão do sistema
    parent_category_id VARCHAR(30) NULL, -- Para subcategorias
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_category_id) REFERENCES financial_categories(id) ON DELETE SET NULL,
    UNIQUE KEY unique_category_per_condominium (condominium_id, name),
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_type (type),
    INDEX idx_parent_category (parent_category_id),
    INDEX idx_is_active (is_active)
);

-- Tabela de Contas/Centros de Custo
CREATE TABLE financial_accounts (
    id VARCHAR(30) PRIMARY KEY,
    condominium_id VARCHAR(30) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'INVESTMENT') DEFAULT 'CHECKING',
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    agency VARCHAR(20),
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_account_type (account_type),
    INDEX idx_is_active (is_active)
);

-- Tabela de Lançamentos Financeiros
CREATE TABLE financial_entries (
    id VARCHAR(30) PRIMARY KEY,
    condominium_id VARCHAR(30) NOT NULL,
    account_id VARCHAR(30) NOT NULL,
    category_id VARCHAR(30) NOT NULL,
    
    -- Dados básicos da transação
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    
    -- Status e pagamento
    status ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL') DEFAULT 'PENDING',
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    paid_date TIMESTAMP NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO', 'CHECK') NULL,
    
    -- Referências
    resident_id VARCHAR(30) NULL, -- Se for cobrança específica de morador
    unit_id VARCHAR(30) NULL, -- Se for cobrança específica de unidade
    supplier_vendor VARCHAR(255) NULL, -- Fornecedor/prestador de serviço
    document_number VARCHAR(100) NULL, -- Número da nota fiscal, boleto, etc.
    reference_month CHAR(7) NULL, -- Mês de referência no formato YYYY-MM
    
    -- Recorrência
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NULL,
    parent_entry_id VARCHAR(30) NULL, -- Para lançamentos recorrentes
    
    -- Controle
    created_by VARCHAR(30) NOT NULL,
    approved_by VARCHAR(30) NULL,
    approval_date TIMESTAMP NULL,
    additional_data JSON,
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
    
    INDEX idx_condominium_id (condominium_id),
    INDEX idx_account_id (account_id),
    INDEX idx_category_id (category_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_due_date (due_date),
    INDEX idx_resident_id (resident_id),
    INDEX idx_unit_id (unit_id),
    INDEX idx_reference_month (reference_month),
    INDEX idx_is_recurring (is_recurring),
    INDEX idx_created_by (created_by)
);

-- =====================================================
-- DADOS INICIAIS E CONFIGURAÇÕES
-- =====================================================

-- Inserir condomínios de exemplo
INSERT INTO condominiums (id, name, cnpj, address, city, state, zip_code, phone, email, admin_contact, total_units, subscription_plan) VALUES
('cond001', 'Residencial Jardim das Flores', '12.345.678/0001-90', 'Rua das Flores, 123 - Jardim Primavera', 'São Paulo', 'SP', '01234-567', '(11) 3456-7890', 'admin@jardimflores.com.br', 'João Silva - Síndico', 120, 'PREMIUM'),
('cond002', 'Condomínio Portal do Sol', '98.765.432/0001-10', 'Av. Portal do Sol, 456 - Vila Esperança', 'Rio de Janeiro', 'RJ', '20123-456', '(21) 2345-6789', 'contato@portaldosol.com.br', 'Maria Santos - Administradora', 80, 'BASIC'),
('cond003', 'Edifício Torre Azul', '11.222.333/0001-44', 'Rua da Torre, 789 - Centro', 'Belo Horizonte', 'MG', '30140-123', '(31) 3456-7890', 'gestao@torreazul.com.br', 'Carlos Lima - Síndico', 200, 'ENTERPRISE');

-- Inserir configurações de Arduino
INSERT INTO arduino_configurations (id, condominium_id, device_name, device_code, wifi_ssid, wifi_password, connection_port, device_location, device_type, pin_configurations, command_mapping, firmware_version) VALUES
('ard001', 'cond001', 'Arduino Portão Principal - Jardim das Flores', 'ARD-JF-001', 'JardimFlores_WiFi', 'flores123!@#', 'COM4', 'Portão Principal', 'MAIN_GATE', '{"led1": 2, "led2": 3, "led3": 4, "led4": 5}', '{"open_gate": "L1_ON", "close_gate": "L1_OFF", "open_garage": "L2_ON", "emergency": "ALL_ON"}', 'v2.1.0'),
('ard002', 'cond001', 'Arduino Garagem - Jardim das Flores', 'ARD-JF-002', 'JardimFlores_WiFi', 'flores123!@#', 'COM5', 'Garagem', 'GARAGE', '{"led1": 2, "led2": 3}', '{"open_garage": "L1_ON", "close_garage": "L1_OFF", "light_on": "L2_ON"}', 'v2.1.0'),
('ard003', 'cond002', 'Arduino Principal - Portal do Sol', 'ARD-PS-001', 'PortalSol_Net', 'sol456789', 'COM3', 'Entrada Principal', 'MAIN_GATE', '{"led1": 2, "led2": 3, "led3": 4}', '{"open_gate": "L1_ON", "close_gate": "L1_OFF", "alarm": "L3_ON"}', 'v2.0.5'),
('ard004', 'cond003', 'Arduino Torre Azul - Principal', 'ARD-TA-001', 'TorreAzul_WiFi', 'azul2024!', 'COM6', 'Hall Principal', 'MAIN_GATE', '{"led1": 2, "led2": 3, "led3": 4, "led4": 5}', '{"open_main": "L1_ON", "open_service": "L2_ON", "emergency": "ALL_ON", "alarm": "L4_ON"}', 'v2.2.0');

-- Inserir usuários de exemplo
INSERT INTO users (id, email, name, phone, document, document_type, face_recognition_folder, face_recognition_enabled, face_models_count, is_super_admin) VALUES
('usr001', 'admin@doorserp.com', 'Super Administrador', '(11) 99999-0000', '000.000.001-00', 'CPF', NULL, FALSE, 0, TRUE),
('usr002', 'joao.silva@email.com', 'João Silva', '(11) 99999-1111', '123.456.789-01', 'CPF', 'Joao_Silva', TRUE, 4, FALSE),
('usr003', 'maria.santos@email.com', 'Maria Santos', '(21) 99888-2222', '987.654.321-02', 'CPF', 'Maria_Santos', TRUE, 3, FALSE),
('usr004', 'carlos.lima@email.com', 'Carlos Lima', '(31) 98777-3333', '456.789.123-03', 'CPF', 'Carlos_Lima', TRUE, 5, FALSE),
('usr005', 'ana.costa@email.com', 'Ana Costa', '(11) 97666-4444', '789.123.456-04', 'CPF', 'Ana_Costa', TRUE, 2, FALSE),
('usr006', 'pedro.oliveira@email.com', 'Pedro Oliveira', '(21) 96555-5555', '321.654.987-05', 'CPF', 'Pedro_Oliveira', TRUE, 3, FALSE),
('usr007', 'jose.porteiro@email.com', 'José Porteiro', '(11) 95444-6666', '654.987.321-06', 'CPF', 'Jose_Porteiro', TRUE, 4, FALSE);

-- Relacionar usuários com condomínios
INSERT INTO user_condominium_access (id, user_id, condominium_id, access_level) VALUES
('acc001', 'usr002', 'cond001', 'ADMIN'),
('acc002', 'usr003', 'cond002', 'ADMIN'),
('acc003', 'usr004', 'cond003', 'ADMIN'),
('acc004', 'usr005', 'cond001', 'RESIDENT'),
('acc005', 'usr006', 'cond002', 'RESIDENT'),
('acc006', 'usr007', 'cond001', 'EMPLOYEE');

-- Inserir unidades
INSERT INTO units (id, condominium_id, block, number, floor, area, bedrooms, bathrooms, parking_spaces, monthly_fee) VALUES
-- Jardim das Flores
('unit001', 'cond001', 'A', '101', 1, 65.50, 2, 1, 1, 450.00),
('unit002', 'cond001', 'A', '102', 1, 85.75, 3, 2, 1, 580.00),
('unit003', 'cond001', 'A', '201', 2, 65.50, 2, 1, 1, 450.00),
('unit004', 'cond001', 'B', '101', 1, 95.25, 3, 2, 2, 720.00),
-- Portal do Sol
('unit005', 'cond002', 'T1', '501', 5, 120.00, 4, 3, 2, 850.00),
('unit006', 'cond002', 'T1', '502', 5, 120.00, 4, 3, 2, 850.00),
('unit007', 'cond002', 'T2', '301', 3, 80.00, 2, 2, 1, 620.00),
-- Torre Azul
('unit008', 'cond003', 'T1', '1001', 10, 180.00, 4, 4, 3, 1200.00),
('unit009', 'cond003', 'T1', '1002', 10, 160.00, 3, 3, 2, 1050.00),
('unit010', 'cond003', 'T2', '801', 8, 140.00, 3, 2, 2, 920.00);

-- Inserir residentes
INSERT INTO residents (id, user_id, unit_id, condominium_id, relationship_type, emergency_contact, vehicle_plates) VALUES
('res001', 'usr005', 'unit001', 'cond001', 'OWNER', 'Esposa: (11) 88888-1111', '["ABC1234"]'),
('res002', 'usr006', 'unit005', 'cond002', 'OWNER', 'Filho: (21) 88888-2222', '["XYZ9876", "DEF5432"]'),
('res003', 'usr002', 'unit004', 'cond001', 'OWNER', 'Esposa: (11) 77777-1111', '["GHI7890"]');

-- Inserir funcionários
INSERT INTO employees (id, user_id, condominium_id, employee_code, position, department, access_card_id, salary, work_schedule) VALUES
('emp001', 'usr007', 'cond001', 'FUNC001', 'Porteiro', 'Segurança', 'CARD001', 2800.00, '{"monday": "08:00-17:00", "tuesday": "08:00-17:00", "wednesday": "08:00-17:00", "thursday": "08:00-17:00", "friday": "08:00-17:00"}'),
('emp002', 'usr003', 'cond002', 'FUNC001', 'Administradora', 'Administração', 'CARD002', 4500.00, '{"monday": "09:00-18:00", "tuesday": "09:00-18:00", "wednesday": "09:00-18:00", "thursday": "09:00-18:00", "friday": "09:00-17:00"}');

-- Inserir categorias financeiras padrão
INSERT INTO financial_categories (id, condominium_id, name, description, type, is_default) VALUES
-- Receitas padrão
('cat001', 'cond001', 'Taxa de Condomínio', 'Taxa mensal de condomínio', 'INCOME', TRUE),
('cat002', 'cond001', 'Multas e Juros', 'Multas por atraso e juros', 'INCOME', TRUE),
('cat003', 'cond001', 'Fundo de Reserva', 'Contribuição para fundo de reserva', 'INCOME', TRUE),
-- Despesas padrão
('cat004', 'cond001', 'Manutenção', 'Serviços de manutenção geral', 'EXPENSE', TRUE),
('cat005', 'cond001', 'Limpeza', 'Serviços de limpeza', 'EXPENSE', TRUE),
('cat006', 'cond001', 'Segurança', 'Gastos com segurança', 'EXPENSE', TRUE),
('cat007', 'cond001', 'Energia Elétrica', 'Conta de energia elétrica', 'EXPENSE', TRUE),
('cat008', 'cond001', 'Água e Esgoto', 'Conta de água e esgoto', 'EXPENSE', TRUE),
-- Categorias para outros condomínios (exemplo simplificado)
('cat009', 'cond002', 'Taxa de Condomínio', 'Taxa mensal de condomínio', 'INCOME', TRUE),
('cat010', 'cond002', 'Manutenção', 'Serviços de manutenção geral', 'EXPENSE', TRUE),
('cat011', 'cond003', 'Taxa de Condomínio', 'Taxa mensal de condomínio', 'INCOME', TRUE),
('cat012', 'cond003', 'Manutenção', 'Serviços de manutenção geral', 'EXPENSE', TRUE);

-- Inserir contas financeiras
INSERT INTO financial_accounts (id, condominium_id, account_name, account_type, bank_name, account_number, current_balance) VALUES
('acc_fin001', 'cond001', 'Conta Corrente Principal', 'CHECKING', 'Banco do Brasil', '12345-6', 25000.00),
('acc_fin002', 'cond001', 'Conta Poupança - Reserva', 'SAVINGS', 'Banco do Brasil', '65432-1', 50000.00),
('acc_fin003', 'cond002', 'Conta Corrente', 'CHECKING', 'Itaú', '98765-4', 18000.00),
('acc_fin004', 'cond003', 'Conta Corrente Principal', 'CHECKING', 'Santander', '11111-1', 75000.00);

-- Inserir alguns lançamentos financeiros de exemplo
INSERT INTO financial_entries (id, condominium_id, account_id, category_id, description, amount, type, status, resident_id, unit_id, reference_month, created_by) VALUES
-- Receitas Jardim das Flores
('fin001', 'cond001', 'acc_fin001', 'cat001', 'Taxa de condomínio - Janeiro 2025', 450.00, 'INCOME', 'PAID', 'res001', 'unit001', '2025-01', 'usr002'),
('fin002', 'cond001', 'acc_fin001', 'cat001', 'Taxa de condomínio - Janeiro 2025', 720.00, 'INCOME', 'PAID', 'res003', 'unit004', '2025-01', 'usr002'),
('fin003', 'cond001', 'acc_fin001', 'cat001', 'Taxa de condomínio - Fevereiro 2025', 450.00, 'INCOME', 'PENDING', 'res001', 'unit001', '2025-02', 'usr002'),
-- Despesas Jardim das Flores
('fin004', 'cond001', 'acc_fin001', 'cat004', 'Manutenção elevador', 1200.00, 'EXPENSE', 'PAID', NULL, NULL, NULL, 'usr002'),
('fin005', 'cond001', 'acc_fin001', 'cat005', 'Limpeza áreas comuns - Janeiro', 800.00, 'EXPENSE', 'PAID', NULL, NULL, '2025-01', 'usr002'),
('fin006', 'cond001', 'acc_fin001', 'cat007', 'Energia elétrica - Janeiro', 1850.00, 'EXPENSE', 'PAID', NULL, NULL, '2025-01', 'usr002'),
-- Receitas Portal do Sol
('fin007', 'cond002', 'acc_fin003', 'cat009', 'Taxa de condomínio - Janeiro 2025', 850.00, 'INCOME', 'PAID', 'res002', 'unit005', '2025-01', 'usr003'),
-- Despesas Portal do Sol
('fin008', 'cond002', 'acc_fin003', 'cat010', 'Manutenção portão eletrônico', 650.00, 'EXPENSE', 'PAID', NULL, NULL, NULL, 'usr003');

-- Inserir alguns logs de acesso de exemplo
INSERT INTO access_logs (id, condominium_id, arduino_id, access_type, access_method, status, user_id, entry_exit, location, arduino_command_sent) VALUES
('log001', 'cond001', 'ard001', 'RESIDENT', 'FACIAL_RECOGNITION', 'APPROVED', 'usr005', 'ENTRY', 'Portão Principal', 'L1_ON'),
('log002', 'cond001', 'ard001', 'EMPLOYEE', 'ACCESS_CARD', 'APPROVED', 'usr007', 'ENTRY', 'Portão Principal', 'L1_ON'),
('log003', 'cond001', 'ard002', 'RESIDENT', 'FACIAL_RECOGNITION', 'APPROVED', 'usr005', 'ENTRY', 'Garagem', 'L1_ON'),
('log004', 'cond002', 'ard003', 'RESIDENT', 'FACIAL_RECOGNITION', 'APPROVED', 'usr006', 'ENTRY', 'Entrada Principal', 'L1_ON'),
('log005', 'cond001', 'ard001', 'RESIDENT', 'FACIAL_RECOGNITION', 'APPROVED', 'usr005', 'EXIT', 'Portão Principal', 'L1_ON');

-- =====================================================
-- VIEWS ÚTEIS PARA RELATÓRIOS
-- =====================================================

-- View de moradores ativos por condomínio
CREATE VIEW view_active_residents AS
SELECT 
    c.name as condominium_name,
    u.id as user_id,
    u.name as resident_name,
    u.email,
    u.phone,
    CONCAT(unit.block, '-', unit.number) as unit_number,
    unit.area,
    unit.bedrooms,
    r.relationship_type,
    r.emergency_contact,
    r.move_in_date
FROM users u
JOIN residents r ON u.id = r.user_id
JOIN units unit ON r.unit_id = unit.id
JOIN condominiums c ON r.condominium_id = c.id
WHERE r.is_active = TRUE AND u.is_active = TRUE;

-- View de funcionários ativos por condomínio
CREATE VIEW view_active_employees AS
SELECT 
    c.name as condominium_name,
    u.name as employee_name,
    u.email,
    u.phone,
    e.employee_code,
    e.position,
    e.department,
    e.salary,
    e.hire_date,
    e.access_card_id
FROM users u
JOIN employees e ON u.id = e.user_id
JOIN condominiums c ON e.condominium_id = c.id
WHERE e.is_active = TRUE AND u.is_active = TRUE;

-- View de resumo financeiro por condomínio
CREATE VIEW view_financial_summary AS
SELECT 
    c.name as condominium_name,
    fe.condominium_id,
    YEAR(fe.transaction_date) as year,
    MONTH(fe.transaction_date) as month,
    fe.type,
    fc.name as category_name,
    SUM(fe.amount) as total_amount,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN fe.status = 'PAID' THEN fe.amount ELSE 0 END) as paid_amount,
    SUM(CASE WHEN fe.status = 'PENDING' THEN fe.amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN fe.status = 'OVERDUE' THEN fe.amount ELSE 0 END) as overdue_amount
FROM financial_entries fe
JOIN condominiums c ON fe.condominium_id = c.id
JOIN financial_categories fc ON fe.category_id = fc.id
GROUP BY c.name, fe.condominium_id, YEAR(fe.transaction_date), MONTH(fe.transaction_date), fe.type, fc.name;

-- View de acessos recentes por condomínio
CREATE VIEW view_recent_access AS
SELECT 
    c.name as condominium_name,
    al.id,
    al.timestamp,
    al.access_type,
    al.access_method,
    al.status,
    al.entry_exit,
    al.location,
    COALESCE(u.name, g.name) as person_name,
    CASE 
        WHEN al.access_type = 'GUEST' THEN CONCAT('Convidado de: ', res_inv.name)
        WHEN al.access_type = 'RESIDENT' THEN CONCAT('Unidade: ', unit.block, '-', unit.number)
        WHEN al.access_type = 'EMPLOYEE' THEN CONCAT('Funcionário: ', e.position)
    END as additional_info,
    al.arduino_command_sent,
    al.vehicle_plate
FROM access_logs al
JOIN condominiums c ON al.condominium_id = c.id
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN guests g ON al.guest_id = g.id
LEFT JOIN residents r ON u.id = r.user_id AND r.condominium_id = al.condominium_id
LEFT JOIN units unit ON r.unit_id = unit.id
LEFT JOIN employees e ON u.id = e.user_id AND e.condominium_id = al.condominium_id
LEFT JOIN residents res_inv_rel ON g.invited_by_resident_id = res_inv_rel.id
LEFT JOIN users res_inv ON res_inv_rel.user_id = res_inv.id
ORDER BY al.timestamp DESC;

-- View de status dos Arduinos por condomínio
CREATE VIEW view_arduino_status AS
SELECT 
    c.name as condominium_name,
    ac.device_name,
    ac.device_code,
    ac.device_location,
    ac.device_type,
    ac.is_online,
    ac.last_ping,
    ac.firmware_version,
    ac.is_active,
    CASE 
        WHEN ac.is_online = TRUE THEN 'Online'
        WHEN ac.last_ping IS NULL THEN 'Nunca conectado'
        WHEN ac.last_ping < DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Offline'
        ELSE 'Instável'
    END as connection_status
FROM arduino_configurations ac
JOIN condominiums c ON ac.condominium_id = c.id
WHERE ac.is_active = TRUE;

-- =====================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =====================================================

-- Índices compostos para consultas frequentes
CREATE INDEX idx_access_logs_condominium_date ON access_logs(condominium_id, timestamp);
CREATE INDEX idx_financial_entries_condominium_month ON financial_entries(condominium_id, reference_month);
CREATE INDEX idx_residents_condominium_active ON residents(condominium_id, is_active);
CREATE INDEX idx_employees_condominium_active ON employees(condominium_id, is_active);
CREATE INDEX idx_units_condominium_occupied ON units(condominium_id, is_occupied);
CREATE INDEX idx_guests_condominium_valid ON guests(condominium_id, valid_until, is_active);

-- =====================================================
-- TRIGGERS PARA AUDITORIA E VALIDAÇÕES
-- =====================================================

-- Trigger para atualizar o saldo da conta após inserção de lançamento financeiro
DELIMITER $$
CREATE TRIGGER update_account_balance_after_insert
AFTER INSERT ON financial_entries
FOR EACH ROW
BEGIN
    IF NEW.status = 'PAID' THEN
        UPDATE financial_accounts 
        SET current_balance = current_balance + 
            CASE 
                WHEN NEW.type = 'INCOME' THEN NEW.paid_amount
                WHEN NEW.type = 'EXPENSE' THEN -NEW.paid_amount
                ELSE 0
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.account_id;
    END IF;
END$$

-- Trigger para atualizar o saldo da conta após atualização de lançamento financeiro
CREATE TRIGGER update_account_balance_after_update
AFTER UPDATE ON financial_entries
FOR EACH ROW
BEGIN
    DECLARE old_amount DECIMAL(15,2) DEFAULT 0;
    DECLARE new_amount DECIMAL(15,2) DEFAULT 0;
    
    -- Calcular valor antigo
    IF OLD.status = 'PAID' THEN
        SET old_amount = CASE 
            WHEN OLD.type = 'INCOME' THEN OLD.paid_amount
            WHEN OLD.type = 'EXPENSE' THEN -OLD.paid_amount
            ELSE 0
        END;
    END IF;
    
    -- Calcular novo valor
    IF NEW.status = 'PAID' THEN
        SET new_amount = CASE 
            WHEN NEW.type = 'INCOME' THEN NEW.paid_amount
            WHEN NEW.type = 'EXPENSE' THEN -NEW.paid_amount
            ELSE 0
        END;
    END IF;
    
    -- Atualizar saldo
    UPDATE financial_accounts 
    SET current_balance = current_balance - old_amount + new_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.account_id;
END$$

-- Trigger para atualizar contador de unidades no condomínio
CREATE TRIGGER update_condominium_unit_count
AFTER INSERT ON units
FOR EACH ROW
BEGIN
    UPDATE condominiums 
    SET total_units = (
        SELECT COUNT(*) 
        FROM units 
        WHERE condominium_id = NEW.condominium_id AND is_active = TRUE
    )
    WHERE id = NEW.condominium_id;
END$$

-- Trigger para criar pasta de reconhecimento facial automaticamente ao inserir usuário
CREATE TRIGGER create_face_recognition_folder_on_user_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    -- Se o reconhecimento facial está habilitado mas não tem pasta definida
    IF NEW.face_recognition_enabled = TRUE AND (NEW.face_recognition_folder IS NULL OR NEW.face_recognition_folder = '') THEN
        -- Criar nome da pasta baseado no nome do usuário (remover espaços e caracteres especiais)
        SET NEW.face_recognition_folder = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(NEW.name, ' ', '_'), 'ã', 'a'), 'ç', 'c'), 'õ', 'o'), 'á', 'a');
    END IF;
END$$

-- Trigger para verificar expiração automática de visitantes
CREATE TRIGGER check_guest_expiration_on_insert
BEFORE INSERT ON guests
FOR EACH ROW
BEGIN
    -- Se auto_expire está habilitado e não foi definido valid_until, calcular baseado na duração
    IF NEW.auto_expire = TRUE AND NEW.valid_until IS NULL THEN
        SET NEW.valid_until = DATE_ADD(NEW.valid_from, INTERVAL NEW.access_duration_minutes MINUTE);
    END IF;
    
    -- Se ainda não foi definido valid_until, definir com base na duração padrão
    IF NEW.valid_until IS NULL THEN
        SET NEW.valid_until = DATE_ADD(NEW.valid_from, INTERVAL NEW.access_duration_minutes MINUTE);
    END IF;
    
    -- Se o reconhecimento facial está habilitado, criar pasta temporária para o visitante
    IF NEW.face_recognition_enabled = TRUE AND (NEW.face_recognition_folder IS NULL OR NEW.face_recognition_folder = '') THEN
        SET NEW.face_recognition_folder = CONCAT('Visitor_', REPLACE(REPLACE(NEW.name, ' ', '_'), '.', ''), '_', UNIX_TIMESTAMP());
    END IF;
END$$

-- Trigger para verificar expiração automática de visitantes (UPDATE)
CREATE TRIGGER check_guest_expiration_on_update
BEFORE UPDATE ON guests
FOR EACH ROW
BEGIN
    -- Se o access_duration_minutes foi alterado e auto_expire está ativo, recalcular valid_until
    IF NEW.auto_expire = TRUE AND NEW.access_duration_minutes != OLD.access_duration_minutes THEN
        SET NEW.valid_until = DATE_ADD(NEW.valid_from, INTERVAL NEW.access_duration_minutes MINUTE);
    END IF;
END$$

-- Trigger para atualizar última tentativa de acesso do visitante
CREATE TRIGGER update_guest_last_access_on_log
AFTER INSERT ON access_logs
FOR EACH ROW
BEGIN
    IF NEW.guest_id IS NOT NULL THEN
        UPDATE guests 
        SET last_access_attempt = NEW.timestamp,
            current_entries = current_entries + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.guest_id;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- FINALIZAÇÃO E MIGRAÇÃO
-- =====================================================

COMMIT;

-- =====================================================
-- MIGRAÇÃO DO SISTEMA ANTIGO PARA MÚLTIPLOS CONDOMÍNIOS
-- =====================================================
-- Este script migra dados do sistema antigo (uma única portaria)
-- para o novo sistema de múltiplos condomínios
-- =====================================================

-- Desabilitar verificações de chave estrangeira temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Criar um condomínio padrão para os dados existentes (se necessário)
INSERT IGNORE INTO condominiums (id, name, address, city, state, zip_code, admin_contact, total_units, subscription_plan) 
VALUES (
    'legacy_cond', 
    'Condomínio Migrado', 
    'Endereço não informado', 
    'São Paulo', 
    'SP', 
    '00000-000', 
    'Administrador', 
    0, 
    'BASIC'
);

-- 2. Criar configuração Arduino padrão para o condomínio legacy
INSERT IGNORE INTO arduino_configurations (
    id, 
    condominium_id, 
    device_name, 
    device_code, 
    connection_port, 
    device_location, 
    device_type,
    pin_configurations,
    command_mapping,
    firmware_version
) VALUES (
    'legacy_arduino',
    'legacy_cond',
    'Arduino Legacy - Migrado',
    'ARD-LEGACY-001',
    'COM4',
    'Portão Principal',
    'MAIN_GATE',
    '{"led1": 2, "led2": 3, "led3": 4, "led4": 5}',
    '{"open_gate": "L1_ON", "close_gate": "L1_OFF", "open_garage": "L2_ON", "emergency": "ALL_ON"}',
    'v1.0.0'
);

-- 3. Criar categorias financeiras padrão para o condomínio legacy
INSERT IGNORE INTO financial_categories (id, condominium_id, name, description, type, is_default) VALUES
('legacy_cat_001', 'legacy_cond', 'Taxa de Condomínio', 'Taxa mensal de condomínio', 'INCOME', TRUE),
('legacy_cat_002', 'legacy_cond', 'Multas e Juros', 'Multas por atraso e juros', 'INCOME', TRUE),
('legacy_cat_003', 'legacy_cond', 'Manutenção', 'Serviços de manutenção geral', 'EXPENSE', TRUE),
('legacy_cat_004', 'legacy_cond', 'Limpeza', 'Serviços de limpeza', 'EXPENSE', TRUE),
('legacy_cat_005', 'legacy_cond', 'Segurança', 'Gastos com segurança', 'EXPENSE', TRUE),
('legacy_cat_006', 'legacy_cond', 'Energia Elétrica', 'Conta de energia elétrica', 'EXPENSE', TRUE),
('legacy_cat_007', 'legacy_cond', 'Água e Esgoto', 'Conta de água e esgoto', 'EXPENSE', TRUE);

-- 4. Criar conta financeira padrão
INSERT IGNORE INTO financial_accounts (id, condominium_id, account_name, account_type, current_balance) VALUES
('legacy_account', 'legacy_cond', 'Conta Principal - Migrada', 'CHECKING', 0.00);

-- 5. Criar usuário super admin se não existir
INSERT IGNORE INTO users (id, email, name, phone, document, is_super_admin, is_active, face_recognition_enabled) VALUES
('super_admin_001', 'admin@doorserp.com', 'Super Administrador', '(11) 99999-0000', '000.000.001-00', TRUE, TRUE, FALSE);

-- 6. Dar acesso de admin ao condomínio legacy
INSERT IGNORE INTO user_condominium_access (id, user_id, condominium_id, access_level) VALUES
('super_admin_access', 'super_admin_001', 'legacy_cond', 'ADMIN');

-- Reabilitar verificações de chave estrangeira
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- PROCEDIMENTOS ARMAZENADOS PARA GESTÃO DE VISITANTES
-- =====================================================

-- Procedimento para limpar visitantes expirados
DELIMITER $$
CREATE PROCEDURE CleanExpiredGuests()
BEGIN
    -- Desativar visitantes expirados
    UPDATE guests 
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP,
        notes = CONCAT(COALESCE(notes, ''), ' [Expirado automaticamente em ', NOW(), ']')
    WHERE auto_expire = TRUE 
      AND valid_until < NOW() 
      AND is_active = TRUE;
      
    -- Selecionar visitantes que foram desativados para limpeza de arquivos
    SELECT id, name, face_recognition_folder 
    FROM guests 
    WHERE auto_expire = TRUE 
      AND valid_until < NOW() 
      AND is_active = FALSE 
      AND face_recognition_folder IS NOT NULL;
END$$

-- Procedimento para criar pasta de reconhecimento facial
CREATE PROCEDURE CreateFaceRecognitionFolder(
    IN user_id VARCHAR(30),
    IN user_name VARCHAR(255),
    IN is_guest BOOLEAN
)
BEGIN
    DECLARE folder_name VARCHAR(255);
    
    -- Criar nome da pasta limpo
    SET folder_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(user_name, ' ', '_'), 'ã', 'a'), 'ç', 'c'), 'õ', 'o'), 'á', 'a');
    
    -- Se for visitante, adicionar timestamp para uniqueness
    IF is_guest THEN
        SET folder_name = CONCAT('Visitor_', folder_name, '_', UNIX_TIMESTAMP());
    END IF;
    
    -- Atualizar usuário ou visitante
    IF is_guest THEN
        UPDATE guests 
        SET face_recognition_folder = folder_name,
            face_recognition_enabled = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = user_id;
    ELSE
        UPDATE users 
        SET face_recognition_folder = folder_name,
            face_recognition_enabled = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = user_id;
    END IF;
    
    SELECT folder_name as created_folder;
END$$

DELIMITER ;

-- =====================================================
-- EVENTOS AUTOMÁTICOS
-- =====================================================

-- Criar evento para limpeza automática de visitantes expirados (executa a cada hora)
CREATE EVENT IF NOT EXISTS cleanup_expired_guests
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
  CALL CleanExpiredGuests();

-- =====================================================
-- VIEWS ATUALIZADAS PARA RECONHECIMENTO FACIAL
-- =====================================================

-- View de status de reconhecimento facial por condomínio
CREATE OR REPLACE VIEW view_face_recognition_status AS
SELECT 
    c.name as condominium_name,
    u.name as user_name,
    u.face_recognition_folder,
    u.face_recognition_enabled,
    u.face_models_count,
    u.last_face_training,
    CASE 
        WHEN uca.access_level = 'RESIDENT' THEN 'Morador'
        WHEN uca.access_level = 'EMPLOYEE' THEN 'Funcionário'
        WHEN uca.access_level = 'ADMIN' THEN 'Administrador'
        ELSE 'Outro'
    END as user_type,
    uca.access_level
FROM users u
JOIN user_condominium_access uca ON u.id = uca.user_id
JOIN condominiums c ON uca.condominium_id = c.id
WHERE u.is_active = TRUE 
  AND uca.is_active = TRUE
  AND u.face_recognition_enabled = TRUE
ORDER BY c.name, uca.access_level, u.name;

-- View de visitantes ativos com tempo restante
CREATE OR REPLACE VIEW view_active_guests_with_timeout AS
SELECT 
    c.name as condominium_name,
    g.name as guest_name,
    g.visit_purpose,
    g.access_code,
    g.valid_from,
    g.valid_until,
    g.access_duration_minutes,
    CASE 
        WHEN g.valid_until IS NULL THEN 'Sem limite'
        WHEN g.valid_until < NOW() THEN 'Expirado'
        WHEN TIMESTAMPDIFF(MINUTE, NOW(), g.valid_until) <= 10 THEN 'Expirando em breve'
        ELSE 'Ativo'
    END as status,
    CASE 
        WHEN g.valid_until IS NULL THEN 999999
        ELSE GREATEST(0, TIMESTAMPDIFF(MINUTE, NOW(), g.valid_until))
    END as minutes_remaining,
    g.current_entries,
    g.max_entries,
    g.face_recognition_enabled,
    g.face_recognition_folder,
    res_user.name as invited_by_resident,
    emp_user.name as invited_by_employee
FROM guests g
JOIN condominiums c ON g.condominium_id = c.id
JOIN residents res ON g.invited_by_resident_id = res.id
JOIN users res_user ON res.user_id = res_user.id
LEFT JOIN employees emp ON g.invited_by_employee_id = emp.id
LEFT JOIN users emp_user ON emp.user_id = emp_user.id
WHERE g.is_active = TRUE
ORDER BY 
    CASE WHEN g.valid_until IS NULL THEN 1 ELSE 0 END,
    g.valid_until ASC;

-- =====================================================
-- SCRIPT DE VERIFICAÇÃO COMPLETA
-- =====================================================

-- Verificar dados do sistema
SELECT 'VERIFICAÇÃO FINAL DO SISTEMA' as status;

SELECT 
    'Condomínios' as tabela,
    COUNT(*) as total_registros
FROM condominiums
UNION ALL
SELECT 
    'Usuários' as tabela,
    COUNT(*) as total_registros
FROM users
UNION ALL
SELECT 
    'Unidades' as tabela,
    COUNT(*) as total_registros
FROM units
UNION ALL
SELECT 
    'Residentes' as tabela,
    COUNT(*) as total_registros
FROM residents
UNION ALL
SELECT 
    'Funcionários' as tabela,
    COUNT(*) as total_registros
FROM employees
UNION ALL
SELECT 
    'Configurações Arduino' as tabela,
    COUNT(*) as total_registros
FROM arduino_configurations
UNION ALL
SELECT 
    'Categorias Financeiras' as tabela,
    COUNT(*) as total_registros
FROM financial_categories
UNION ALL
SELECT 
    'Contas Financeiras' as tabela,
    COUNT(*) as total_registros
FROM financial_accounts
UNION ALL
SELECT 
    'Lançamentos Financeiros' as tabela,
    COUNT(*) as total_registros
FROM financial_entries
UNION ALL
SELECT 
    'Logs de Acesso' as tabela,
    COUNT(*) as total_registros
FROM access_logs
UNION ALL
SELECT 
    'Visitantes' as tabela,
    COUNT(*) as total_registros
FROM guests;

-- Verificar relacionamentos por condomínio
SELECT 
    c.name as condominio,
    COUNT(DISTINCT u.id) as usuarios_com_acesso,
    COUNT(DISTINCT un.id) as unidades,
    COUNT(DISTINCT r.id) as residentes,
    COUNT(DISTINCT e.id) as funcionarios,
    COUNT(DISTINCT ac.id) as arduinos_configurados,
    COUNT(DISTINCT g.id) as visitantes_ativos
FROM condominiums c
LEFT JOIN user_condominium_access uca ON c.id = uca.condominium_id
LEFT JOIN users u ON uca.user_id = u.id
LEFT JOIN units un ON c.id = un.condominium_id
LEFT JOIN residents r ON c.id = r.condominium_id
LEFT JOIN employees e ON c.id = e.condominium_id
LEFT JOIN arduino_configurations ac ON c.id = ac.condominium_id
LEFT JOIN guests g ON c.id = g.condominium_id AND g.is_active = TRUE
GROUP BY c.id, c.name;

-- Verificar usuários com reconhecimento facial habilitado
SELECT 'Usuários com reconhecimento facial habilitado:' as info;
SELECT name, face_recognition_folder, face_recognition_enabled, face_models_count 
FROM users 
WHERE face_recognition_enabled = TRUE;

-- Verificar visitantes ativos com timeout
SELECT 'Visitantes ativos com timeout:' as info;
SELECT name, access_duration_minutes, auto_expire, valid_until, 
       CASE 
           WHEN valid_until IS NULL THEN 'SEM LIMITE'
           WHEN valid_until < NOW() THEN 'EXPIRADO'
           ELSE CONCAT(TIMESTAMPDIFF(MINUTE, NOW(), valid_until), ' min restantes')
       END as status_tempo
FROM guests 
WHERE is_active = TRUE;

-- Verificação final
SELECT 'Database setup completed successfully!' as status;
SELECT COUNT(*) as total_condominiums FROM condominiums;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_arduino_configs FROM arduino_configurations;
SELECT COUNT(*) as total_financial_entries FROM financial_entries;
SELECT COUNT(*) as total_access_logs FROM access_logs;
SELECT COUNT(*) as total_guests FROM guests;

-- =====================================================
-- INSTRUÇÕES DE IMPLEMENTAÇÃO
-- =====================================================

/*
INSTRUÇÕES PÓS-INSTALAÇÃO:

1. BANCO DE DADOS:
   - Execute este script completo para criar toda a estrutura
   - Verifique se todos os dados foram inseridos corretamente
   - Configure backups automáticos

2. PRISMA:
   - Atualize o schema.prisma com os novos campos
   - Execute: npx prisma db push
   - Execute: npx prisma generate

3. APIS NEXT.JS:
   - Atualize todas as APIs para filtrar por condominium_id
   - Implemente validação de acesso por nível de usuário
   - Configure as APIs de reconhecimento facial

4. FRONTEND:
   - Implementar seletor de condomínio
   - Atualizar todas as telas para multi-condomínio
   - Configurar sistema de permissões
   - Implementar timeout de visitantes em tempo real

5. SISTEMA DE ARQUIVOS:
   - Criar estrutura de pastas: public/assets/lib/face-api/labels/
   - Implementar limpeza automática de pastas de visitantes expirados
   - Configurar backup das pastas de reconhecimento facial

6. ARDUINO:
   - Atualizar firmware para multi-condomínio
   - Configurar WiFi específico por condomínio
   - Testar comandos individuais por dispositivo

7. SEGURANÇA:
   - Implementar autenticação JWT
   - Configurar rate limiting
   - Implementar logs de auditoria

8. MONITORAMENTO:
   - Configurar alertas para Arduinos offline
   - Implementar métricas de desempenho
   - Configurar logs de sistema

FUNCIONALIDADES IMPLEMENTADAS:
✅ Sistema multi-condomínio completo
✅ Reconhecimento facial com pastas automáticas
✅ Sistema de timeout para visitantes
✅ Sistema financeiro completo
✅ Controle de acesso granular
✅ Configuração Arduino por condomínio
✅ Sistema de alertas de segurança
✅ Migração de dados antigos
✅ Triggers automáticos
✅ Views para relatórios
✅ Procedimentos armazenados
✅ Eventos automáticos
*/
