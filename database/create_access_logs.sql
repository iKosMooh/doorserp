-- SQL para adicionar/corrigir tabela access_logs
-- Execute este script se a tabela access_logs não existir ou estiver incorreta

USE doorserp_db;

-- Verificar se a tabela existe e dropar se necessário (cuidado em produção!)
DROP TABLE IF EXISTS access_logs;

-- Criar tabela access_logs compatível com o schema Prisma
CREATE TABLE access_logs (
    id VARCHAR(30) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessType ENUM('RESIDENT', 'EMPLOYEE', 'GUEST') NOT NULL,
    status ENUM('APPROVED', 'REJECTED', 'PENDING') DEFAULT 'APPROVED',
    userId VARCHAR(30) NULL,
    guestId VARCHAR(30) NULL,
    arduinoCommandSent VARCHAR(100) NULL,
    entryExit VARCHAR(20) NULL,
    location VARCHAR(100) NULL,
    notes TEXT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (guestId) REFERENCES guests(id) ON DELETE SET NULL,
    INDEX idx_timestamp (timestamp),
    INDEX idx_accessType (accessType),
    INDEX idx_status (status),
    INDEX idx_userId (userId),
    INDEX idx_guestId (guestId)
);

-- Inserir alguns dados de exemplo para testar
INSERT INTO access_logs (id, accessType, status, userId, entryExit, location, notes) VALUES
('log_test_1', 'RESIDENT', 'APPROVED', NULL, 'Entrada', 'Portão Principal', 'Acesso via reconhecimento facial'),
('log_test_2', 'EMPLOYEE', 'APPROVED', NULL, 'Entrada', 'Portão Principal', 'Acesso via reconhecimento facial'),
('log_test_3', 'GUEST', 'APPROVED', NULL, 'Entrada', 'Portão Principal', 'Acesso via reconhecimento facial');

-- Verificar se a tabela foi criada corretamente
DESCRIBE access_logs;

-- Mostrar os dados inseridos
SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 10;

COMMIT;
