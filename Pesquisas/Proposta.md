Relatório Técnico de Formulação e Arquitetura para ERP de Condomínio
Este relatório detalha a formulação de um sistema de gestão de condomínio, integrando funcionalidades existentes de reconhecimento facial com a criação de um ERP. A arquitetura proposta é baseada na sinergia entre o Next.js, Prisma e bibliotecas específicas, com um foco particular em um modelo de dados escalável, uma comunicação robusta com hardware e uma interface de usuário intuitiva.

1. Visão Geral e Arquitetura do Sistema de Gestão de Condomínio
A base da aplicação de gestão de condomínio é uma arquitetura full-stack co-localizada, onde o Next.js atua não apenas como o framework de front-end, mas também como o backend. A escolha do Next.js, um framework React para web, é estratégica, pois ele oferece recursos essenciais para uma aplicação complexa como um ERP, incluindo roteamento avançado, renderização flexível (Server-Side Rendering e Client-Side Rendering) e a capacidade de criar Route Handlers (anteriormente API Routes) para lidar com as necessidades do servidor.   

A camada de acesso a dados é gerenciada pelo Prisma, um ORM moderno para Node.js e TypeScript. A integração do Prisma com o Next.js é amplamente reconhecida como uma combinação ideal para construir aplicações de alto desempenho e segurança. O Prisma define a estrutura do banco de dados de forma declarativa e, em seguida, gera um cliente de banco de dados tipado, o que assegura que o sistema permaneça coerentemente tipado de ponta a ponta, desde a base de dados até os componentes React.   

O fluxo de dados do reconhecimento facial até a ativação do hardware segue uma sequência lógica. O front-end, onde o reconhecimento facial já está funcionando, captura a imagem e identifica o usuário ou convidado. Em seguida, os dados de identificação (por exemplo, um ID de usuário) são enviados para o servidor Next.js. O servidor processa a solicitação através de um Route Handler ou Server Action, onde dois eventos críticos ocorrem: primeiro, o registro de acesso é persistido no banco de dados usando o Prisma Client, criando um histórico de entradas e saídas. Segundo, um comando é enviado ao Arduino para acionar a abertura da porta.

A arquitetura que utiliza o Next.js com um backend interno (API Routes ou Server Actions) é fundamental para a segurança e a coesão do sistema. As operações de banco de dados, como o salvamento de logs de acesso e outras informações sensíveis, não podem ser realizadas diretamente no front-end, pois isso exporia as credenciais do banco de dados e criaria vulnerabilidades de segurança. A abordagem de    

Route Handlers permite que a aplicação web atue como um proxy seguro, recebendo os dados do cliente e executando a lógica de negócios no servidor, onde as credenciais e o Prisma Client estão protegidos.   

Além disso, a evolução para as Server Actions no Next.js representa um avanço arquitetônico significativo. Elas permitem que o código de servidor seja executado diretamente a partir de um Client Component por meio de uma chamada de função simples, eliminando a necessidade de criar um endpoint de API explícito. Essa abordagem simplifica o código, reduz a latência e melhora a experiência de desenvolvimento, consolidando o servidor Next.js como o ponto central para toda a lógica de dados e integração com o hardware.   

2. Modelagem de Dados e Esquema com Prisma ORM
A espinha dorsal de qualquer sistema ERP é um banco de dados bem estruturado. A modelagem do banco de dados para a gestão de um condomínio requer a definição de entidades que representem os principais atores e processos. Com base em modelos de referência para sistemas de gestão de condomínios e ERPs, as seguintes entidades foram identificadas como essenciais para atender aos requisitos de gerenciamento de moradores, funcionários, convidados e logs de acesso.   

Modelos de Dados Principais
Usuario (User): Uma tabela central para autenticação e dados de perfil, como nome, e-mail e foto, servindo como a entidade raiz para Morador e Funcionario.

Morador (Resident): Armazena detalhes específicos dos moradores, incluindo a unidade à qual pertencem e informações de contato.

Funcionario (Employee): Contém informações de funcionários do condomínio, como cargo e status.

Convidado (Guest): Modelagem para registrar visitantes temporários, com dados como nome, quem o convidou (Morador) e a data de validade do acesso.

Unidade (Unit): Representa as unidades residenciais (apartamentos, casas), contendo informações como bloco e número. Uma unidade se relaciona com um ou mais moradores.

LogAcesso (AccessLog): Esta é a tabela mais crítica para a funcionalidade de controle de acesso. Ela registra cada tentativa de entrada ou saída, incluindo a data e a hora (dataHora), o status da ação (por exemplo, "Aprovado", "Rejeitado"), e uma referência ao Usuario ou Convidado que tentou o acesso. Um campo adicional para registrar o comando enviado ao Arduino (comandoArduinoAcionado) é crucial para a rastreabilidade da interação com o hardware.   

LancamentoFinanceiro (FinancialEntry): Para o módulo financeiro "simples" solicitado, um sistema de contabilidade de entrada única é a abordagem mais adequada e prática. A tabela    

LancamentoFinanceiro registra cada transação como uma única entrada, com campos como data, descricao, valor, tipo ("Receita" ou "Despesa") e categoria para classificações como "Taxa de Condomínio" ou "Manutenção".

O esquema do banco de dados é definido no arquivo schema.prisma, que é a "fonte da verdade" para o Prisma ORM. Abaixo, é apresentado o código    

schema.prisma completo, que pode ser copiado e colado para iniciar o projeto.

Esquema Prisma Proposto (schema.prisma)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // Pode ser alterado para 'mysql' ou 'sqlite'
  url      = env("DATABASE_URL")
}

model User {
  id              String      @id @default(cuid())
  email           String      @unique
  name            String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  isResident      Boolean     @default(true)
  resident        Resident?
  employee        Employee?
  accessLogs      AccessLog
}

model Resident {
  id        String    @id @default(cuid())
  userId    String    @unique
  user      User      @relation(fields: [userId], references: [id])
  unitId    String
  unit      Unit      @relation(fields: [unitId], references: [id])
  guests    Guest
  financialEntries FinancialEntry
}

model Employee {
  id           String @id @default(cuid())
  userId       String @unique
  user         User   @relation(fields: [userId], references: [id])
  position     String
  accessCardId String @unique
}

model Guest {
  id          String   @id @default(cuid())
  name        String
  invitedById String
  invitedBy   Resident @relation(fields: [invitedById], references: [id])
  validUntil  DateTime
  accessLogs  AccessLog
}

model Unit {
  id       String    @id @default(cuid())
  block    String
  number   String
  residents Resident
}

enum AccessType {
  RESIDENT
  EMPLOYEE
  GUEST
}

model AccessLog {
  id                    String     @id @default(cuid())
  timestamp             DateTime   @default(now())
  accessType            AccessType
  status                String     @default("Aprovado") // ou "Rejeitado"
  userId                String?
  user                  User?      @relation(fields: [userId], references: [id])
  guestId               String?
  guest                 Guest?     @relation(fields: [guestId], references: [id])
  arduinoCommandSent    String? // Ex: "abrir_porta_principal"
  entryExit             String?    // "Entrada" ou "Saida"
}

model FinancialEntry {
  id          String   @id @default(cuid())
  date        DateTime @default(now())
  description String
  value       Decimal  @db.Decimal(10, 2)
  type        String // Ex: "Receita" ou "Despesa"
  category    String?  // Ex: "Taxa de Condomínio", "Salário", "Manutenção"
  residentId  String
  resident    Resident @relation(fields: [residentId], references: [id])
}
```
Após a definição dos modelos, o comando npx prisma migrate dev --name init cria as tabelas no banco de dados, e o Prisma Studio (npx prisma studio) oferece uma interface gráfica para gerenciar os dados iniciais, facilitando a fase de desenvolvimento.   

3. Implementação da Lógica de Acesso e Integração com Hardware
A comunicação entre a aplicação Next.js e o Arduino é o ponto de contato entre o mundo digital e o físico. A análise da integração com o hardware revela duas abordagens principais: a comunicação serial direta e a comunicação via nuvem.

A comunicação serial, que utiliza bibliotecas como johnny-five ou serialport, exige uma conexão física (USB) entre o servidor Next.js e o Arduino. Embora eficaz para protótipos em ambientes de desenvolvimento local, essa abordagem apresenta uma limitação crítica: ela é incompatível com ambientes de produção baseados em plataformas serverless, como o Vercel, o parceiro-chave do Next.js. Nessas plataformas, o servidor é uma função efêmera que pode ser executada em qualquer data center, tornando a conexão física com um dispositivo local impossível.   

Para um ERP que visa a escalabilidade e a implantação em produção, a comunicação via nuvem é a solução arquitetônica correta. A plataforma Arduino IoT Cloud permite que o Arduino se conecte à internet e interaja com um serviço MQTT. A aplicação Next.js, por sua vez, se conecta ao mesmo serviço via uma API ou uma biblioteca JavaScript (   

arduino-iot-js), enviando e recebendo comandos de forma assíncrona. Essa abordagem desacopla a aplicação web do hardware, eliminando as restrições da conexão física e permitindo o deploy em qualquer serviço de hospedagem.   

Abaixo, um exemplo de código para um Route Handler no Next.js (utilizando o App Router) demonstra como essa lógica de integração seria implementada.

Exemplo de Código para um Route Handler
app/api/access/route.ts

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ArduinoIoTCloud } from 'arduino-iot-js';

// Configurações do Arduino IoT Cloud
const arduinoOptions = {
    deviceId: process.env.ARDUINO_DEVICE_ID,
    secretKey: process.env.ARDUINO_SECRET_KEY,
};

// POST handler para registrar acesso
export async function POST(request: Request) {
    try {
        const { userId, type, status, arduinoCommand } = await request.json();

        // 1. Salvar o log de acesso no banco de dados com Prisma
        const newLog = await prisma.accessLog.create({
            data: {
                userId,
                accessType: type,
                status,
                arduinoCommandSent: arduinoCommand,
                entryExit: "Entrada" // Exemplo
            },
        });

        // 2. Enviar o comando para o Arduino via Arduino IoT Cloud
        if (arduinoCommand && status === "Aprovado") {
            const client = await ArduinoIoTCloud.connect(arduinoOptions);
            await client.sendProperty('YOUR_THING_ID', 'YOUR_VARIABLE_NAME', arduinoCommand);
            console.log(`Comando '${arduinoCommand}' enviado ao Arduino.`);
        }

        return NextResponse.json({ success: true, log: newLog }, { status: 200 });

    } catch (error) {
        console.error('Erro ao processar o acesso:', error);
        return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
    }
}
```
4. Módulo Financeiro: Dados e Visualização
O módulo financeiro simplificado é modelado com base em um sistema de contabilidade de entrada única, ideal para a gestão básica de um condomínio. Nesse modelo, cada transação (uma receita ou despesa) é registrada de forma independente, o que torna a estrutura do banco de dados e a interface de gerenciamento diretas e eficientes. A tabela    

FinancialEntry captura todas as informações necessárias, como valor, data, descrição, tipo e categoria, permitindo uma análise clara do fluxo de caixa.

A visualização desses dados é um requisito central para um dashboard de ERP. Para a renderização de gráficos em uma aplicação Next.js, três bibliotecas se destacam: Chart.js, Recharts e Nivo. A escolha da biblioteca impacta a curva de aprendizado, a performance e a personalização do sistema.

Chart.js é conhecido por sua simplicidade e facilidade de uso, sendo uma escolha popular para iniciantes e para projetos que necessitam de uma ampla gama de tipos de gráficos com configuração mínima. Para utilizá-lo no Next.js, é necessário usar o wrapper    

react-chartjs-2 e a diretiva "use client" para garantir que o componente seja renderizado no lado do cliente, já que ele depende de objetos do DOM.   

Recharts é uma biblioteca nativa do React que oferece um bom equilíbrio entre facilidade de uso e flexibilidade, com componentes declarativos e suporte nativo a SVG.   

Nivo é construído sobre a biblioteca D3.js, oferecendo alta personalização e gráficos responsivos, com suporte a renderização no servidor. A curva de aprendizado, no entanto, é mais acentuada do que a de suas concorrentes, o que pode não ser ideal para um projeto com foco em simplicidade.   

Para a necessidade de um sistema "simples", a recomendação é o uso de Chart.js com react-chartjs-2. A facilidade de implementação de gráficos padrão, como barras e pizzas, e a vasta documentação disponível o tornam a escolha mais direta para visualizar as finanças do condomínio.   

| Critério | Chart.js (c/ react-chartjs-2) | Recharts | Nivo |
| --- | --- | --- | --- |
| Curva de Aprendizado | Baixa, muito amigável para iniciantes. | Moderada, intuitivo para desenvolvedores React. | Moderada a alta, requer familiaridade com D3.js. |
| Performance | Boa para a maioria dos casos de uso, otimizada para Canvas. | Boa com datasets moderados, pode ter impacto com grandes volumes de dados. | Ótima, projetada para grandes conjuntos de dados. |
| Personalização | Boa, com opções de personalização via API. | Boa, componentes declarativos facilitam o ajuste. | Alta, oferece controle granular sobre a visualização. |
| Compatibilidade c/ Next.js | Requer react-chartjs-2 e a diretiva "use client". | Funciona de forma nativa com componentes React. | Suporte a SSR, mas com curva de aprendizado maior. |
5. Design e Componentes da Interface de Usuário Limpa
Para um ERP de condomínio, uma interface de usuário limpa e intuitiva é fundamental para evitar a frustração do usuário. As boas práticas de UI para dashboards enfatizam a simplicidade, a consistência visual e a acessibilidade, garantindo que as informações mais importantes sejam facilmente identificáveis e que a navegação seja fluida.   

Para acelerar o desenvolvimento e manter um design profissional, a utilização de kits de componentes é altamente recomendada. O Shadcn UI é uma solução exemplar para projetos Next.js. Diferentemente de bibliotecas de componentes tradicionais, o Shadcn UI não é uma dependência, mas um repositório de código-fonte de componentes que são adicionados diretamente ao projeto do desenvolvedor. Isso oferece controle total sobre a personalização, elimina o problema de "estilos vazados" e minimiza o tamanho final do pacote (bundle size), o que é vital para a performance. O kit oferece uma vasta coleção de componentes, incluindo botões, cards, tabelas, e elementos de formulário, que são perfeitos para a construção de um dashboard de ERP.   

Uma estrutura de dashboard proposta para o ERP pode ser dividida em seções-chave:

Dashboard Principal: Composta por Cards de resumo (Card, CardContent) exibindo o saldo financeiro atual, o número de acessos recentes e outras métricas importantes. Uma tabela de Logs de Acesso Recentes (Table) e um gráfico de barras financeiro podem fornecer uma visão geral imediata.   

Módulo de Logs de Acesso: Uma página dedicada com uma tabela de dados (Data Table) que permite filtrar, ordenar e pesquisar o histórico de acessos.   

Módulo Financeiro: Uma página que combina gráficos interativos (barras para despesas e pizza para categorias) com uma tabela de lançamentos financeiros, permitindo que o administrador lance e gerencie as contas.   

6. Roteiro de Implementação Passo a Passo
Para materializar o projeto, o seguinte roteiro de implementação é proposto:

Fase 1: Configuração da Base
Inicialização do Projeto: Crie uma nova aplicação Next.js com TypeScript e o App Router usando npx create-next-app@latest.   

Configuração do Banco de Dados: Instale o Prisma CLI e o Prisma Client com npm install prisma --save-dev e npm install @prisma/client. Configure o ambiente e o arquivo    

schema.prisma com o comando npx prisma init.   

Estilização e Componentes: Instale e configure o Tailwind CSS e, em seguida, inicialize o Shadcn UI com npx shadcn-ui@latest init para começar a adicionar os componentes de UI.   

Fase 2: Banco de Dados
Definição do Esquema: Substitua o conteúdo do arquivo prisma/schema.prisma com o código fornecido na seção 2.

Migração Inicial: Execute a migração do banco de dados com npx prisma migrate dev --name init para criar as tabelas baseadas no esquema.   

População de Dados (Opcional): Use o Prisma Studio (npx prisma studio) para popular os dados iniciais de teste, como unidades e moradores.   

Fase 3: Lógica do Backend e Comunicação com Hardware
Desenvolvimento do Route Handler: Crie o Route Handler (por exemplo, em app/api/access/route.ts) para receber os dados do reconhecimento facial.

Integração com o Prisma: Dentro do Route Handler, utilize o Prisma Client para persistir o LogAcesso no banco de dados.   

Integração com o Arduino Cloud: Instale a biblioteca arduino-iot-js e configure o Route Handler para enviar comandos de acesso ao Arduino Cloud após o registro bem-sucedido no banco de dados.

Fase 4: Lógica do Frontend e Visualização
Desenvolvimento da Interface: Crie os Client Components para as páginas de dashboard, logs e financeiro. Utilize os componentes do Shadcn UI (Card, Table, etc.) para agilizar a construção da interface.   

Integração de Gráficos: Instale o chart.js e o react-chartjs-2 e implemente os gráficos na página do módulo financeiro, buscando os dados dos Route Handlers do próprio Next.js.   

Fase 5: Conexão e Testes
Validação do Fluxo: Teste o fluxo de dados de ponta a ponta: do reconhecimento facial (front-end) para o Route Handler (backend), do Route Handler para o banco de dados (Prisma) e, por fim, do Route Handler para o hardware (Arduino IoT Cloud).

Verificação do ERP: Certifique-se de que os logs de acesso e os lançamentos financeiros estão sendo salvos e visualizados corretamente nas respectivas páginas do dashboard.

7. Conclusão e Recomendações Finais
O projeto de um ERP de condomínio com reconhecimento facial se beneficia enormemente de uma arquitetura full-stack integrada. A combinação de Next.js, Prisma e Tailwind CSS fornece uma base sólida para um sistema escalável, seguro e de fácil manutenção. A principal decisão arquitetônica para viabilizar o projeto em um ambiente de produção é a adoção da comunicação via nuvem com o Arduino IoT Cloud, que dissocia a aplicação web do hardware e permite o deploy em plataformas serverless.

Para o futuro do projeto, as seguintes recomendações são pertinentes:

Autenticação e Permissões: O sistema exigirá uma solução robusta de autenticação. A biblioteca NextAuth.js se integra perfeitamente com o Prisma e é amplamente utilizada no ecossistema Next.js. Um sistema de controle de acesso baseado em papéis (RBAC) também será necessário para diferenciar as permissões entre moradores, funcionários e administradores.   

Segurança Adicional: Considerações sobre a segurança incluem a proteção das APIs com autenticação e a criptografia de dados sensíveis, como as imagens de reconhecimento facial, que já estão em uso.

Escalabilidade e Hospedagem: Para suportar o crescimento do condomínio, a migração do banco de dados para um serviço hospedado em nuvem, como o Vercel Postgres, que é otimizado para o ecossistema Next.js/Prisma, garantirá desempenho e escalabilidade.   

