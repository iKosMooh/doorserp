-- SQL Setup para MySQL - ERP de Condomínio
-- Execute este script no seu servidor MySQL

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS doorserp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE doorserp_db;

-- Tabela de usuários
CREATE TABLE users (
    id VARCHAR(30) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_resident BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);

-- Tabela de unidades
CREATE TABLE units (
    id VARCHAR(30) PRIMARY KEY,
    block VARCHAR(10) NOT NULL,
    number VARCHAR(10) NOT NULL,
    floor INT,
    area DECIMAL(8,2),
    bedrooms INT,
    bathrooms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_unit (block, number),
    INDEX idx_block_number (block, number)
);

-- Tabela de moradores
CREATE TABLE residents (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) UNIQUE NOT NULL,
    unit_id VARCHAR(30) NOT NULL,
    phone VARCHAR(20),
    emergency_contact VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id),
    INDEX idx_user_id (user_id),
    INDEX idx_unit_id (unit_id)
);

-- Tabela de funcionários
CREATE TABLE employees (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) UNIQUE NOT NULL,
    position VARCHAR(100) NOT NULL,
    access_card_id VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    salary DECIMAL(10,2),
    hire_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_access_card (access_card_id),
    INDEX idx_is_active (is_active)
);

-- Tabela de convidados
CREATE TABLE guests (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(20),
    phone VARCHAR(20),
    invited_by_id VARCHAR(30) NOT NULL,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invited_by_id) REFERENCES residents(id),
    INDEX idx_invited_by (invited_by_id),
    INDEX idx_valid_until (valid_until),
    INDEX idx_is_active (is_active)
);

-- Tabela de logs de acesso
CREATE TABLE access_logs (
    id VARCHAR(30) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_type ENUM('RESIDENT', 'EMPLOYEE', 'GUEST') NOT NULL,
    status ENUM('APPROVED', 'REJECTED', 'PENDING') DEFAULT 'APPROVED',
    user_id VARCHAR(30),
    guest_id VARCHAR(30),
    arduino_command_sent VARCHAR(100),
    entry_exit VARCHAR(20),
    location VARCHAR(100),
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (guest_id) REFERENCES guests(id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_access_type (access_type),
    INDEX idx_status (status),
    INDEX idx_user_id (user_id),
    INDEX idx_guest_id (guest_id)
);

-- Tabela de lançamentos financeiros
CREATE TABLE financial_entries (
    id VARCHAR(30) PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    type ENUM('INCOME', 'EXPENSE') NOT NULL,
    category VARCHAR(100),
    resident_id VARCHAR(30),
    due_date TIMESTAMP,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date TIMESTAMP,
    payment_method VARCHAR(50),
    reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id),
    INDEX idx_date (date),
    INDEX idx_type (type),
    INDEX idx_category (category),
    INDEX idx_resident_id (resident_id),
    INDEX idx_is_paid (is_paid),
    INDEX idx_due_date (due_date)
);

-- Inserir dados de exemplo
-- Unidades
INSERT INTO units (id, block, number, floor, area, bedrooms, bathrooms) VALUES
('unit1', 'A', '101', 1, 65.50, 2, 1),
('unit2', 'A', '102', 1, 85.75, 3, 2),
('unit3', 'A', '201', 2, 65.50, 2, 1),
('unit4', 'B', '101', 1, 95.25, 3, 2),
('unit5', 'B', '102', 1, 120.00, 4, 3);

-- Usuários
INSERT INTO users (id, email, name, is_resident) VALUES
('user1', 'joao.silva@email.com', 'João Silva', TRUE),
('user2', 'maria.santos@email.com', 'Maria Santos', TRUE),
('user3', 'admin@doorserp.com', 'Administrador', FALSE),
('user4', 'porteiro@doorserp.com', 'José Porteiro', FALSE),
('user5', 'ana.costa@email.com', 'Ana Costa', TRUE);

-- Moradores
INSERT INTO residents (id, user_id, unit_id, phone, emergency_contact) VALUES
('res1', 'user1', 'unit1', '(11) 99999-1111', 'Esposa: (11) 88888-1111'),
('res2', 'user2', 'unit2', '(11) 99999-2222', 'Filho: (11) 88888-2222'),
('res3', 'user5', 'unit3', '(11) 99999-5555', 'Mãe: (11) 88888-5555');

-- Funcionários
INSERT INTO employees (id, user_id, position, access_card_id, department, salary) VALUES
('emp1', 'user3', 'Administrador', 'CARD001', 'Administração', 5000.00),
('emp2', 'user4', 'Porteiro', 'CARD002', 'Segurança', 2500.00);

-- Lançamentos financeiros de exemplo
INSERT INTO financial_entries (id, description, value, type, category, resident_id, due_date, is_paid) VALUES
('fin1', 'Taxa de condomínio - Janeiro 2025', 350.00, 'INCOME', 'Taxa de Condomínio', 'res1', '2025-01-10', TRUE),
('fin2', 'Taxa de condomínio - Janeiro 2025', 450.00, 'INCOME', 'Taxa de Condomínio', 'res2', '2025-01-10', FALSE),
('fin3', 'Manutenção elevador', 1200.00, 'EXPENSE', 'Manutenção', NULL, NULL, TRUE),
('fin4', 'Limpeza áreas comuns', 800.00, 'EXPENSE', 'Limpeza', NULL, NULL, TRUE),
('fin5', 'Taxa de condomínio - Fevereiro 2025', 350.00, 'INCOME', 'Taxa de Condomínio', 'res1', '2025-02-10', FALSE);

-- Logs de acesso de exemplo
INSERT INTO access_logs (id, access_type, status, user_id, arduino_command_sent, entry_exit, location) VALUES
('log1', 'RESIDENT', 'APPROVED', 'user1', 'OPEN_MAIN_GATE', 'Entrada', 'Portão Principal'),
('log2', 'EMPLOYEE', 'APPROVED', 'user4', 'OPEN_MAIN_GATE', 'Entrada', 'Portão Principal'),
('log3', 'RESIDENT', 'APPROVED', 'user2', 'OPEN_GARAGE', 'Entrada', 'Garagem'),
('log4', 'RESIDENT', 'APPROVED', 'user1', 'OPEN_MAIN_GATE', 'Saída', 'Portão Principal');

-- Criar índices adicionais para performance
CREATE INDEX idx_access_logs_date ON access_logs(DATE(timestamp));
CREATE INDEX idx_financial_month ON financial_entries(YEAR(date), MONTH(date));
CREATE INDEX idx_residents_unit ON residents(unit_id);
CREATE INDEX idx_guests_validity ON guests(valid_until, is_active);

-- Criar views úteis
CREATE VIEW view_active_residents AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    r.phone,
    CONCAT(unit.block, '-', unit.number) as unit_number,
    unit.area,
    unit.bedrooms
FROM users u
JOIN residents r ON u.id = r.user_id
JOIN units unit ON r.unit_id = unit.id
WHERE u.is_resident = TRUE;

CREATE VIEW view_financial_summary AS
SELECT 
    YEAR(date) as year,
    MONTH(date) as month,
    type,
    category,
    SUM(value) as total_amount,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN is_paid = TRUE THEN value ELSE 0 END) as paid_amount,
    SUM(CASE WHEN is_paid = FALSE THEN value ELSE 0 END) as pending_amount
FROM financial_entries
GROUP BY YEAR(date), MONTH(date), type, category;

CREATE VIEW view_recent_access AS
SELECT 
    al.id,
    al.timestamp,
    al.access_type,
    al.status,
    al.entry_exit,
    al.location,
    COALESCE(u.name, g.name) as person_name,
    CASE 
        WHEN al.access_type = 'GUEST' THEN CONCAT('Convidado de: ', inv.name)
        WHEN al.access_type = 'RESIDENT' THEN CONCAT('Unidade: ', unit.block, '-', unit.number)
        WHEN al.access_type = 'EMPLOYEE' THEN CONCAT('Funcionário: ', e.position)
    END as additional_info
FROM access_logs al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN guests g ON al.guest_id = g.id
LEFT JOIN residents r ON u.id = r.user_id
LEFT JOIN units unit ON r.unit_id = unit.id
LEFT JOIN employees e ON u.id = e.user_id
LEFT JOIN residents inv ON g.invited_by_id = inv.id
ORDER BY al.timestamp DESC;

COMMIT;
