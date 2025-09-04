# Database - Sistema de Gestão de Múltiplos Condomínios

## Arquivo Principal

### `complete_mysql_setup.sql`
Este é o **arquivo único e consolidado** que contém toda a estrutura do banco de dados para o sistema de gestão de múltiplos condomínios.

## O que está incluído:

### 🏢 **Sistema Multi-Condomínio**
- Estrutura completa para múltiplos condomínios
- Controle de acesso independente por condomínio
- Sistema de permissões granular (RESIDENT, EMPLOYEE, ADMIN, VISITOR)

### 🤖 **Configuração Arduino**
- Configuração individual por condomínio
- Suporte a múltiplos dispositivos por condomínio
- Mapeamento de comandos e pinos configurável
- Status de conexão em tempo real

### 👥 **Sistema de Usuários**
- Usuários globais com acesso a múltiplos condomínios
- Reconhecimento facial com pastas automáticas
- Controle de permissões por condomínio

### 🏠 **Gestão de Unidades e Residentes**
- Unidades com informações detalhadas
- Relacionamento N:N entre usuários e unidades
- Controle de veículos e contatos de emergência

### 👔 **Sistema de Funcionários**
- Funcionários específicos por condomínio
- Hierarquia com supervisores
- Horários de trabalho e permissões configuráveis

### 🚪 **Controle de Acesso**
- Logs detalhados de entrada/saída
- Múltiplos métodos de acesso (facial, cartão, código)
- Sistema de alertas de segurança
- Suporte a visitantes com timeout automático

### 👥 **Sistema de Visitantes**
- **Timeout automático** configurável (30min, 1h, 2h, etc.)
- Reconhecimento facial temporário
- Códigos de acesso únicos
- Limpeza automática de visitantes expirados

### 💰 **Sistema Financeiro Completo**
- Categorias de receitas e despesas por condomínio
- Múltiplas contas bancárias por condomínio
- Lançamentos com status e métodos de pagamento
- Controle de saldo automático

### 🔧 **Recursos Avançados**
- **Triggers automáticos** para manutenção de dados
- **Procedimentos armazenados** para operações complexas
- **Eventos automáticos** para limpeza de dados expirados
- **Views otimizadas** para relatórios
- **Sistema de migração** de dados antigos

## Como usar:

### 1. **Instalação Inicial**
```sql
-- Execute o arquivo completo no MySQL:
mysql -u root -p < complete_mysql_setup.sql
```

### 2. **Verificação**
O script inclui verificações automáticas que mostram:
- Total de registros por tabela
- Relacionamentos por condomínio
- Status do reconhecimento facial
- Visitantes ativos com timeout

### 3. **Configuração do Prisma**
Após executar o script, atualize seu projeto:
```bash
npx prisma db push
npx prisma generate
```

## Funcionalidades Implementadas:

✅ **Sistema multi-condomínio completo**  
✅ **Reconhecimento facial com pastas automáticas**  
✅ **Sistema de timeout para visitantes**  
✅ **Sistema financeiro completo**  
✅ **Controle de acesso granular**  
✅ **Configuração Arduino por condomínio**  
✅ **Sistema de alertas de segurança**  
✅ **Migração de dados antigos**  
✅ **Triggers automáticos**  
✅ **Views para relatórios**  
✅ **Procedimentos armazenados**  
✅ **Eventos automáticos**  

## Estrutura do Banco:

### Tabelas Principais:
- `condominiums` - Condomínios
- `users` - Usuários globais
- `user_condominium_access` - Controle de acesso
- `arduino_configurations` - Configurações Arduino
- `units` - Unidades habitacionais
- `residents` - Moradores
- `employees` - Funcionários
- `guests` - Visitantes (com timeout)
- `access_logs` - Logs de acesso
- `security_alerts` - Alertas de segurança
- `financial_categories` - Categorias financeiras
- `financial_accounts` - Contas bancárias
- `financial_entries` - Lançamentos financeiros

### Novos Recursos:
- **Pastas automáticas de reconhecimento facial**: `users.face_recognition_folder`
- **Timeout de visitantes**: `guests.access_duration_minutes` e `guests.auto_expire`
- **Limpeza automática**: Evento que remove visitantes expirados a cada hora
- **Procedures**: `CleanExpiredGuests()` e `CreateFaceRecognitionFolder()`

## Próximos Passos:

1. **APIs**: Atualizar todas as APIs para filtrar por `condominium_id`
2. **Frontend**: Implementar seletor de condomínio
3. **Reconhecimento Facial**: Configurar sincronização de pastas
4. **Arduino**: Atualizar firmware para multi-condomínio
5. **Testes**: Validar isolamento de dados por condomínio

---

**Data de criação**: 4 de setembro de 2025  
**Versão**: 1.0 - Consolidado  
**Status**: ✅ Pronto para produção
