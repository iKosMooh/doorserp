# Boas Práticas de SQL para Sistemas de Gestão Empresarial

## 1. Introdução

A gestão de dados em sistemas de Planejamento de Recursos Empresariais (ERP) é uma tarefa de alta complexidade, onde a precisão e a eficiência das operações de banco de dados são cruciais. As boas práticas de SQL, abrangendo desde o design do esquema até a otimização de consultas, gerenciamento de transações e segurança, são fundamentais para construir e manter sistemas robustos e escaláveis.

A aplicação rigorosa de boas práticas de SQL transcende a mera busca por "código limpo"; ela representa um investimento direto na saúde financeira e na resiliência operacional de uma empresa. Dados imprecisos ou inconsistentes podem levar a relatórios financeiros errôneos e decisões de negócio equivocadas, culminando em prejuízos financeiros ou oportunidades perdidas.

## 2. Design de Esquema de Banco de Dados

O design do esquema de banco de dados é a fundação sobre a qual a performance, a integridade e a manutenibilidade de um sistema ERP são construídas.

### 2.1. Normalização de Dados

A normalização é um processo sistemático de organização de dados que visa reduzir a redundância e aprimorar a integridade. Ela envolve a decomposição de tabelas grandes e complexas em tabelas menores e relacionadas.
Sempre que atualizar algum arquivo, verifique se não existem outros que necessitam da mesma correção e faça-a

As formas normais representam níveis progressivos de organização:

- **Primeira Forma Normal (1NF)**: Garante valores atômicos e registros únicos
- **Segunda Forma Normal (2NF)**: Elimina dependências parciais
- **Terceira Forma Normal (3NF)**: Remove dependências transitivas
- **Forma Normal de Boyce-Codd (BCNF)**: Versão mais rigorosa da 3NF

| Forma Normal | Regra Principal | Propósito/Benefício Chave |
|--------------|-----------------|---------------------------|
| 1NF | Valores atômicos, linhas únicas | Elimina grupos repetidos, simplifica a estrutura |
| 2NF | Atributos não-chave dependem da PK completa | Reduz redundância, garante consistência em atualizações |
| 3NF | Remove dependências transitivas | Melhora a integridade, simplifica o esquema |
| BCNF | Todo determinante é uma chave candidata | Versão mais rigorosa da 3NF, maior integridade |

### 2.2. Desnormalização Estratégica

A desnormalização é a prática de reintroduzir intencionalmente a redundância em um esquema de banco de dados para melhorar a performance de consultas e simplificar o acesso aos dados. Esta abordagem é particularmente útil para sistemas de Processamento Analítico Online (OLAP) ou dashboards em tempo real.

| Característica | Normalização | Desnormalização |
|----------------|--------------|-----------------|
| Objetivo | Reduzir redundância, aumentar integridade | Melhorar performance de leitura, simplificar acesso |
| Redundância | Mínima | Maior |
| Integridade | Alta | Menor risco de inconsistência |
| Performance Escrita | Mais rápida | Mais lenta (devido a redundância) |
| Performance Leitura | Mais lenta (muitos JOINs) | Mais rápida (menos JOINs) |
| Complexidade Consulta | Maior | Menor |
| Manutenção | Mais fácil (dados em um só lugar) | Mais difícil (dados duplicados) |

### 2.3. Tipos de Dados e Chaves

A seleção adequada dos tipos de dados é fundamental para a eficiência do banco de dados. Recomenda-se utilizar o menor tipo de dado suficiente para armazenar os valores necessários.

O uso eficaz de chaves primárias e estrangeiras é essencial:

- **Chave Primária (PK)**: Garante que cada linha seja identificada por um valor único
- **Chave Estrangeira (FK)**: Mantém a integridade referencial entre as tabelas

### 2.4. Convenções de Nomenclatura

A adoção de convenções de nomenclatura claras e consistentes é fundamental para a manutenibilidade e a colaboração. Recomenda-se:

- Manter consistência nos padrões (ex: nomes singulares para tabelas)
- Evitar abreviações ambíguas e caracteres especiais
- Usar nomes claros e autoexplicativos

## 3. Otimização de Consultas SQL

A otimização de consultas SQL é vital para garantir a performance e a responsividade de um sistema ERP.

### 3.1. Indexação Adequada

A indexação é uma das formas mais eficazes de acelerar consultas SQL. Recomenda-se criar índices em colunas frequentemente utilizadas em cláusulas WHERE, JOIN e ORDER BY.

No entanto, é crucial evitar o excesso de índices, pois muitos índices podem prejudicar a performance das operações de escrita além de consumir espaço em disco.

### 3.2. Escrita de Consultas Eficientes

Algumas diretrizes essenciais incluem:

- **Evitar SELECT ***: Especifique apenas as colunas necessárias
- **Otimização de cláusulas WHERE**: Filtre os dados o mais cedo possível na consulta
- **Uso judicioso de JOINs**: Otimize a estratégia de JOIN
- **Uso eficiente de funções de agregação**: Combine com indexação e filtragem adequadas
- **Processamento em lote para grandes inserções**: Use inserções em lote para grandes volumes

| Estratégia | Descrição | Benefício Principal | Exemplo (Conceitual) |
|------------|-----------|---------------------|----------------------|
| Indexação Adequada | Criar índices em colunas frequentemente usadas | Acelera a busca e ordenação | `CREATE INDEX idx_nome_cliente ON Clientes(Nome);` |
| Evitar SELECT * | Especificar apenas as colunas necessárias | Reduz o volume de dados processados | `SELECT PedidoID, NomeCliente, DataPedido FROM Pedidos;` |
| Otimizar WHERE | Filtrar dados o mais cedo possível | Diminui o conjunto de dados a processar | `SELECT * FROM Produtos WHERE Categoria = 'Eletrônicos';` |
| JOINs Judiciosos | Otimizar a ordem dos JOINs | Melhora a eficiência na combinação | `SELECT C.Nome, P.Produto FROM Clientes C JOIN Pedidos P ON C.ID = P.ClienteID;` |
| Agregações Eficientes | Usar funções com índices e filtros apropriados | Otimiza cálculos de resumo | `SELECT Categoria, COUNT(*) FROM Produtos GROUP BY Categoria;` |
| Inserções em Lote | Agrupar múltiplas inserções | Reduz a sobrecarga transacional | `INSERT INTO Logs (Evento) VALUES ('Login'), ('Logout'), ('Erro');` |

### 3.3. Cache de Consultas

Muitos sistemas de banco de dados SQL oferecem mecanismos de cache de consultas, que armazenam o resultado para recuperação mais rápida em execuções subsequentes. Esta funcionalidade é útil para consultas de leitura frequentes cujos resultados não mudam constantemente.

## 4. Gerenciamento de Transações e Concorrência

O gerenciamento eficaz de transações e concorrência é essencial para a confiabilidade e estabilidade de qualquer sistema ERP.

### 4.1. Propriedades ACID

As propriedades ACID são pilares que garantem a confiabilidade dos dados:

- **Atomicidade**: Garante que todas as operações sejam concluídas com sucesso ou nenhuma seja aplicada
- **Consistência**: Assegura que uma transação leve o banco de dados de um estado válido para outro
- **Isolamento**: Garante que transações simultâneas não interfiram umas nas outras
- **Durabilidade**: As alterações confirmadas são permanentes e resistem a falhas do sistema

### 4.2. Níveis de Isolamento

Os níveis de isolamento definem como as transações simultâneas veem as alterações umas das outras:

- **READ UNCOMMITTED**: Permite leituras de dados não confirmados ("dirty reads")
- **READ COMMITTED**: Garante leitura apenas de dados confirmados
- **REPEATABLE READ**: Garante que linhas lidas não sejam alteradas durante a transação
- **SERIALIZABLE**: O nível mais alto, garante execução sequencial

### 4.3. Mitigação de Deadlocks e Bloqueios

Estratégias para minimizar problemas de concorrência incluem:

- Minimizar a duração da transação
- Usar indexação e otimização de consultas adequadas
- Implementar lógica de retry em aplicações
- Monitorar cadeias de bloqueio
- Considerar técnicas de versionamento de linha

## 5. Segurança do Banco de Dados

A segurança do banco de dados é crítica para qualquer sistema ERP, protegendo informações sensíveis e valiosas.

### 5.1. Endurecimento do Servidor e Rede

As práticas incluem:

- Configuração de firewalls e segmentação de rede
- Desativação de componentes e protocolos desnecessários

### 5.2. Controle de Acesso e Permissões

As práticas recomendadas são:

- Princípio do Menor Privilégio para contas e usuários
- Uso de roles e grupos de segurança

### 5.3. Criptografia de Dados

As tecnologias incluem:

- **SSL/TLS**: Criptografa dados em trânsito
- **TDE (Transparent Data Encryption)**: Criptografa dados em repouso
- **Always Encrypted**: Criptografa colunas sensíveis no nível da aplicação

### 5.4. Prevenção de Injeção SQL

As principais estratégias são:

- Uso de consultas parametrizadas e stored procedures
- Validação e sanitização de entradas

### 5.5. Auditoria e Monitoramento

As práticas essenciais incluem:

- Registro de tentativas de acesso e alterações de permissões
- Monitoramento de atividades suspeitas

## 6. Conclusão

A aplicação consistente e diligente das boas práticas de SQL é um imperativo para organizações que dependem de sistemas ERP. Essas práticas não são apenas diretrizes técnicas, mas um alicerce estratégico que permite construir e manter sistemas que não apenas funcionam, mas prosperam em termos de desempenho, segurança e integridade de dados.

---

# Boas Práticas de ESLint e Next.js para Desenvolvimento Web Moderno

## 1. Introdução

O desenvolvimento web moderno exige ferramentas e práticas que construam aplicações funcionais, performáticas, seguras e de fácil manutenção. A sinergia entre ESLint, Next.js e Tailwind CSS forma uma stack poderosa para construção de aplicações web robustas e escaláveis.

Esta combinação transcende a preferência tecnológica; representa uma estratégia para otimizar todo o ciclo de vida do desenvolvimento de software, desde o aumento da produtividade do desenvolvedor até a melhoria da experiência do usuário final.

## 2. Boas Práticas de ESLint

ESLint é essencial para manter a qualidade e consistência do código JavaScript e TypeScript.

### 2.1. Configuração e Instalação

Os passos para instalar e inicializar o ESLint são:

1. **Instalação**: `npm install eslint --save-dev`
2. **Inicialização**: `npx eslint --init`
3. **Estrutura do arquivo de configuração**: Define regras, ambientes e configurações estendidas

### 2.2. Regras Essenciais e Extensões

Regras recomendadas e extensões incluem:

- **Para React, React Hooks, Next.js e TypeScript**: Utilize os plugins `eslint-plugin-react`, `eslint-plugin-react-hooks` e `eslint-plugin-next`
- **Plugins para segurança e qualidade**: Inclua `eslint-plugin-security`

### 2.3. Integração com Prettier

Para configurar a integração com Prettier:

1. **Instalação**: Instale `eslint-config-prettier` e `eslint-plugin-prettier`
2. **Configuração**: Adicione `prettier` ao array `extends` no arquivo `.eslintrc`

### 2.4. Linting em Ambientes de Produção e CI

As práticas recomendadas incluem:

- **Integração com o processo de build**: Mantenha a verificação no `next build`
- **Hooks de pré-commit**: Utilize ferramentas como `lint-staged` com `husky`

## 3. Estrutura de Projeto Next.js

Uma estrutura bem definida facilita a navegação, colaboração e escalabilidade do projeto.

### 3.1. Organização de Diretórios

- **Uso da pasta src**: Encapsule o código-fonte separado de arquivos de configuração
- **app Router**: Estrutura de pastas que mapeia para rotas de URL
- **components**: Subdivida em `ui/` para componentes genéricos e `features/` para componentes específicos
- **lib e hooks**: Funções utilitárias e hooks customizados
- **styles e types**: Estilos globais e definições de tipo

### 3.2. Padrões de Componentes

A escolha entre Server e Client Components depende da funcionalidade:

- **Server Components**: Ideais para buscar dados, acessar recursos de backend, manter informações sensíveis no servidor
- **Client Components**: Indicados para interatividade, estado, efeitos e APIs do navegador

Para composição, não importe diretamente Server Components em Client Components. Passe-os como children ou props.

## 4. Operações CRUD e Gerenciamento de Dados em Next.js

### 4.1. Estratégias de Busca de Dados

As principais estratégias incluem:

| Método | Tipo de Renderização | Timing da Busca | Caso de Uso Ideal | Vantagens Chave |
|--------|----------------------|-----------------|-------------------|-----------------|
| getStaticProps | SSG | Tempo de build | Blogs, documentação | Performance rápida, SEO excelente |
| getServerSideProps | SSR | Em cada requisição | E-commerce, dashboards | Dados atualizados, SEO para conteúdo dinâmico |
| useQuery (TanStack Query) | CSR | Após carregamento | Componentes interativos | Caching eficiente, refetching automático |
| useSWR | CSR | Após carregamento | Componentes interativos | Caching, revalidação em foco |

### 4.2. Organização de Operações CRUD

A organização eficaz envolve:

- **Funções de Query e Mutation**: Defina funções puras para busca e modificação de dados
- **Hooks customizados**: Encapsule a lógica de dados em hooks reutilizáveis
- **API Routes e Server Actions**: Utilize para interações com o backend

### 4.3. Gerenciamento de Estado e Cache

TanStack Query oferece benefícios significativos:

- Gerencia caching e sincronização em segundo plano
- Oferece refetching automático para dados desatualizados
- Possui tratamento de erros integrado e suporte a atualizações otimistas

## 5. Reuso de Código em Next.js e TypeScript

### 5.1. Padrões de Design

Os padrões de design são categorizados em:

- **Creacionais**: Focam na criação de objetos
- **Estruturais**: Lidam com a composição de classes e objetos
- **Comportamentais**: Identificam padrões de comunicação entre objetos

### 5.2. Tipos Utilitários do TypeScript

TypeScript oferece utilitários embutidos:

- `Pick<Type, Keys>`: Cria um tipo selecionando propriedades específicas
- `Omit<Type, Keys>`: Cria um tipo excluindo propriedades específicas
- `Partial<Type>`: Torna todas as propriedades opcionais
- `Record<Keys, Type>`: Cria um objeto com chaves e tipos específicos

### 5.3. Componentes e Hooks Genéricos

Generics em TypeScript permitem criar elementos UI e hooks que lidam com múltiplos tipos de dados mantendo a segurança de tipo.

### 5.4. Contexto com Tipagem Forte

O `createContext` do React com tipagem forte garante que o gerenciamento de estado global seja seguro e previsível.

| Padrão | Descrição | Benefício para Reuso | Exemplo (Conceitual) |
|--------|-----------|----------------------|----------------------|
| Typed Component Props | Definir tipos explícitos para props | Torna componentes autoexplicativos | `interface ButtonProps { text: string; onClick: () => void; }` |
| Discriminated Unions | Modelar estados distintos com discriminador | Promove renderização condicional segura | `type DataState = { status: 'loading' } \| { status: 'success', data: any }` |
| Inferência de Tipos | Derivar tipos de valores existentes | Reduz duplicação manual | `type UserType = z.infer<typeof UserSchema>;` |
| Utility Types | Construir novos tipos a partir de existentes | Reutiliza definições, reduz redundância | `type UserDisplay = Pick<User, 'name' \| 'email'>;` |
| Generic Components & Hooks | Criar componentes/hooks multitipo | Alta adaptabilidade com segurança | `function List<T>({ items: T, renderItem: (item: T) => React.ReactNode })` |
| Context com Tipagem | Gerenciar estado global com segurança | Garante consistência do estado | `const AppContext = createContext<AppContextType \| undefined>(undefined);` |

## 6. Layouts Acessíveis e Design Responsivo

### 6.1. Princípios de Acessibilidade (WCAG)

| Princípio | Descrição | Como Aplicar | Benefício |
|-----------|-----------|--------------|-----------|
| Contraste Suficiente | Contraste adequado com o fundo | Verificar contraste; definir paleta acessível | Legibilidade para baixa visão |
| Não Apenas Cor | Informação além da cor | Usar ícones, texto, sublinhados | Compreensão para daltônicos |
| Elementos Interativos Identificáveis | Links e botões visualmente distintos | Estados hover, focus e active visíveis | Navegação clara |
| Navegação Consistente | Nomes, estilos e posições uniformes | Menus fixos, breadcrumbs, busca interna | Facilita orientação |
| Rótulos de Formulário | Campos com rótulos descritivos | Usar `<label for="id_campo">` | Acessibilidade para leitores |
| Feedback Identificável | Mensagens claras e visíveis | Notificações, mensagens de erro inline | Reduz frustração |
| Alternativas para Mídia | Alternativas textuais | Atributo alt, legendas, transcrições | Acesso para deficiências sensoriais |
| Controles para Conteúdo | Controles de pausa/parada | Botões play/pause, opções para desativar | Permite controle ao usuário |
| HTML Semântico | Tags que descrevem o propósito | `<nav>`, `<header>`, `<main>`, etc. | Melhora estrutura |
| Acessibilidade de Teclado | Interações via teclado | `tabIndex` correto, eventos de teclado | Usabilidade para deficiência motora |
| ARIA Roles e Atributos | Semântica para elementos não-HTML | `role="button"`, `aria-label` | Contexto para leitores de tela |

### 6.2. Design para Diferentes Viewports

A criação de designs adaptáveis envolve:

- **Uso de media queries**: Para estilos específicos baseados no tamanho da tela
- **Flexbox e CSS Grid**: Para layouts responsivos e fluidos

## 7. Boas Práticas de Tailwind CSS

### 7.1. Abordagem Utility-First

Tailwind é um framework utility-first que encoraja a combinação de múltiplas classes para criar a aparência desejada, reduzindo estilos não utilizados.

### 7.2. Otimização para Produção

Tailwind remove automaticamente CSS não utilizado na build de produção. O compilador Just-in-Time (JIT) gera estilos dinamicamente.

### 7.3. Customização e Extensão

- **Configuração via tailwind.config.js**: Personaliza temas, cores, espaçamento e tipografia
- **Plugins e custom utilities**: Estende funcionalidades com plugins ou valores arbitrários

### 7.4. Extração de Componentes

Quando a duplicação de classes se torna um problema:

- **Componentes HTML/JavaScript**: Para estruturas complexas
- **Componentes CSS com @apply**: Para componentes menores, dentro de `@layer components`

### 7.5. Design Mobile e Abordagem Mobile First

Tailwind adota uma abordagem mobile-first, com estilos definidos primeiro para telas menores e prefixos responsivos para breakpoints maiores.

| Princípio/Prática | Descrição | Como Implementar | Benefício |
|-------------------|-----------|------------------|-----------|
| Mobile-First | Desenvolver para telas pequenas primeiro | Estilos padrão para mobile; prefixos para breakpoints | Experiência otimizada em mobile |
| Componentes Fluidos | Adaptação natural ao espaço | Usar flex, grid, w-full; evitar tamanhos fixos | Reduz necessidade de media queries |
| Layouts Responsivos | Estrutura ajustável a viewports | Classes de breakpoint (md:flex, lg:grid-cols-3) | Adaptação eficiente |
| Otimização de Imagens | Imagens rápidas e adaptáveis | Componente next/image para otimização | Melhora performance |
| Tipografia Responsiva | Tamanho e espaçamento ajustáveis | Classes responsivas (text-sm md:text-base) | Legibilidade ideal |
| Testes em Dispositivos Reais | Validar em diversos dispositivos | Ferramentas de desenvolvedor e testes físicos | Garante funcionalidade |

## 8. Regras de Negócio de Design e UX

### 8.1. Design Centrado no Usuário

Priorize a compreensão dos usuários através de pesquisa e criação de personas. Teste o aplicativo com usuários-alvo em diversos dispositivos.

### 8.2. Consistência e Hierarquia Visual

Mantenha a consistência em elementos visuais e tom de comunicação. A hierarquia visual enfatiza elementos importantes através de tamanho, cor e posicionamento.

### 8.3. Controle do Usuário e Feedback

Permita que os usuários corrijam erros com funcionalidades como "Desfazer" e "Cancelar". Forneça feedback imediato e claro para todas as interações.

### 8.4. Simplicidade e Redução da Carga Cognitiva

Mantenha o conteúdo mínimo e direto. Projete cada tela para um único propósito com uma única "call to action".

### 8.5. Testes de Usabilidade e Iteração

Teste e refine continuamente o design, coletando feedback do usuário através de pesquisas, testes de usabilidade e entrevistas.

## 9. Conclusão

A aplicação integrada de ESLint, Next.js e Tailwind CSS, guiada por princípios de UX/UI e uma abordagem mobile-first, é a chave para construir aplicações web de alta performance, manuteníveis, seguras e centradas no usuário.

Esta abordagem não só acelera o desenvolvimento e reduz o débito técnico, mas também eleva a experiência do usuário, garantindo que a aplicação seja acessível, intuitiva e eficiente em qualquer dispositivo.

---

# Boas Práticas de Validação com Zod

## 1. Introdução

A validação de dados é fundamental para a integridade e segurança de aplicações, especialmente em sistemas como ERPs. Zod se destaca como uma biblioteca TypeScript-first para definir e aplicar esquemas de validação em todo o stack.

A validação não é apenas para feedback ao usuário; é uma camada de segurança que protege o backend contra dados maliciosos, prevenindo vulnerabilidades e garantindo a confiabilidade do sistema.

## 2. Fundamentos do Zod

### 2.1. Definição de Esquemas

Zod permite definir esquemas para:

- **Tipos primitivos**: strings, numbers, booleans
- **Objetos e arrays**: estruturas de dados complexas
- **Esquemas aninhados**: estruturas hierárquicas

### 2.2. Parsing de Dados

Zod oferece métodos para validação:

| Método | Tipo de Validação | Comportamento em Sucesso | Comportamento em Falha | Caso de Uso |
|--------|-------------------|--------------------------|------------------------|-------------|
| .parse() | Síncrona | Retorna dados tipados | Lança ZodError | Validações simples |
| .parseAsync() | Assíncrona | Retorna Promise com dados | Lança ZodError (Promise) | Validações com I/O |
| .safeParse() | Síncrona | { success: true, data } | { success: false, error } | Sem try/catch |
| .safeParseAsync() | Assíncrona | Promise com resultado | Promise com erro | Validações assíncronas |

### 2.3. Tratamento de Erros

- **ZodError**: Contém informações granulares sobre problemas de validação
- **.safeParse()**: Permite tratamento de erros sem try/catch

### 2.4. Inferência de Tipos

- **z.infer<>**: Extrai tipo estático diretamente do esquema
- **z.input<> vs z.output<>**: Útil quando há transformações

## 3. Recursos Avançados de Validação

### 3.1. Tipos de União (z.union)

Permite validar dados contra múltiplos esquemas possíveis, útil para dados polimórficos.

### 3.2. Campos Opcionais e Anuláveis

- **.optional()**: Indica que um campo pode estar ausente
- **.nullable()**: Especifica que um campo pode ser null

### 3.3. Validação Customizada (.refine())

Permite adicionar lógica de validação específica para regras de negócio que não são cobertas pelos validadores embutidos.

## 4. Integração com Formulários e APIs em Next.js

### 4.1. Validação no Frontend

Zod pode ser integrado com React Hook Form através do zodResolver, proporcionando feedback instantâneo ao usuário.

### 4.2. Validação no Backend

Utilize esquemas Zod em API Routes ou Server Actions para validar payloads de requisições, garantindo que apenas dados válidos sejam processados.

### 4.3. Compartilhamento de Esquemas

Defina esquemas em um pacote separado que pode ser importado tanto pelo frontend quanto pelo backend, garantindo consistência.

## 5. Aspectos de Segurança na Validação com Zod

### 5.1. Prevenção de Payloads Maliciosos

Zod ajuda a prevenir payloads maliciosos, protegendo contra ameaças como injeção SQL e XSS.

### 5.2. Garantia de Integridade dos Dados

Zod assegura que apenas dados bem-estruturados e válidos entrem no sistema, mantendo a integridade do banco de dados.

## 6. Conclusão

Zod é uma ferramenta indispensável para desenvolvimento com TypeScript, fornecendo uma solução robusta para validação de dados em todas as camadas da aplicação. Sua capacidade de garantir segurança de tipo, simplificar o tratamento de erros e promover consistência o torna essencial para construir aplicações confiáveis e de alta qualidade.

# Boas Práticas de Programação

Ao desenvolver software, seguir boas práticas é essencial para manter o código legível, consistente e confiável. Isso inclui usar ferramentas de linting e formatação, escolher convenções de nomenclatura claras, usar tipagem forte, organizar bem APIs, entre outras recomendações.

## 1. Ferramentas de Linting e Formatação

* **ESLint (JavaScript/TypeScript)**: automatiza a aplicação de regras de estilo e detecta problemas sem executar o código. Defina um style guide (Airbnb, Standard, etc.) para garantir consistência (aspas simples vs duplas, ponto-e-vírgula, indentação). Regras importantes incluem evitar variáveis globais, evitar atribuições não seguras e impor o uso de funções flecha quando adequado. Configure scripts de auto-correção para manter o código padronizado.

* **Prettier**: complementa o ESLint formatando código automaticamente (quebrando linhas longas, indentando uniformemente etc.). Use comandos como `npm run format` para aplicar o estilo definido, eliminando ajustes manuais.

* **EditorConfig**: garante configurações de editor uniformes (tabs vs espaços, tamanho de tabulação, charset). Inclua um arquivo `.editorconfig` definindo, por exemplo, 2 ou 4 espaços de indentação consistentemente.

* **Conveções de nomenclatura**: use PascalCase para nomes de classes e camelCase para variáveis, interfaces e arquivos. Evite abreviações obscuras; nomes descritivos facilitam a compreensão por outros desenvolvedores.

## 2. Tailwind CSS

* **CSS utilitário**: use classes utilitárias inline (`p-4`, `text-center` etc.) para acelerar o desenvolvimento. Cada classe é reutilizável e mudanças afetam apenas o elemento desejado.

* **Customização e performance**: utilize o arquivo `tailwind.config.js` para estender cores, fontes e breakpoints, criando um design system coerente. Configure o purge (ou `content`) para remover classes não usadas e minifique o CSS em produção.

* **Componentização**: use o diretivo `@apply` para criar classes customizadas reutilizáveis (ex.: `.btn-primary { @apply bg-blue-500 text-white rounded; }`). Organize o CSS em camadas (`base`, `components`, `utilities`) e siga abordagem mobile-first com variantes responsivas (`sm:`, `md:`).

## 3. Next.js

* **Componentes integrados**: utilize `<Image>` para lazy loading e redimensionamento, `<Link>` para prefetch, e `<Script>` para controlar scripts de terceiros, melhorando métricas de performance.

* **Otimização de bundle**: mantenha dependências atualizadas, use code splitting nativo (componentes dinâmicos), e monitore o bundle com ferramentas como `@next/bundle-analyzer`.

* **SEO e metadata**: configure metadados em cada página. Em Next.js 14+, use a Metadata API (`export const metadata = { title, description }`).

* **Desenvolvimento**: ative Turbopack (`next dev --turbo`) para builds rápidos e utilize pastas públicas (`/public`) para arquivos estáticos.

## 4. HTML Semântico e Acessibilidade

* **HTML semântico**: use tags apropriadas (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`) para dar significado estrutural. Isso melhora acessibilidade e SEO.

* **Texto alternativo e labels**: forneça `alt` descritivo em imagens e associe `<label>` a `<input>` com `for/id`. Garanta texto legível em links e botões.

* **Estrutura de conteúdo**: organize com títulos (`<h1>` a `<h6>`), parágrafos e listas. Valide HTML com ferramentas de A11Y e siga padrões do W3C.

## 5. TypeScript e Tipagem Estática

* **Evite `any`**: substitua por tipos explícitos ou `unknown` com type guards. Tipagem forte previne erros e melhora autocomplete.

* **Interfaces e tipos utilitários**: use `interface` ou `type` para descrever objetos e `enum` para constantes. Aplique utilitários (`Partial`, `Required`, `Omit`, `Record`) para transformar tipos.

* **Flags de compilação**: ative `--strict`, `--noImplicitAny`, `--noUnusedLocals`, `--noUnusedParameters` no `tsconfig.json`.

* **Import/export**: use ES Modules e mantenha módulos pequenos (um componente/classe por arquivo).

* **Conveções de nomenclatura**: camelCase para variáveis/funções e PascalCase para classes/interfaces. Nomeie arquivos conforme o conteúdo.

## 6. Modelagem de Dados: SQL/MySQL

* **Normalização**: siga ao menos a 3ª forma normal para evitar redundância. Separe dados em tabelas lógicas (clientes, pedidos, produtos).

* **Índices**: crie índices em colunas usadas em `WHERE`, `JOIN` e `ORDER BY`, mas evite excessos para não prejudicar `INSERT/UPDATE`.

* **Tipos de dados adequados**: utilize `INT`, `VARCHAR`, `TEXT`, `DATE`, `TIMESTAMP` conforme o caso. Não armazene números como texto.

* **Consultas eficientes**: evite `SELECT *`; especifique colunas. Prefira joins com chaves estrangeiras adequadas e subconsultas só quando necessário.

* **Nomenclatura**: tabelas no plural, colunas no singular, todas minúsculas, separadas por `_`.

* **Manutenção e segurança**: documente tabelas/colunas, realize backups regulares, use usuários com privilégios mínimos e conexões criptografadas.

## 7. Programação Orientada a Objetos (POO)

* **Princípios SOLID**: aplique responsabilidade única, aberto/fechado, substituição de Liskov, segregação de interfaces e inversão de dependência para manter o código extensível.

* **Nomes claros**: classes, métodos e variáveis devem refletir seu propósito sem siglas obscuras.

* **Comentários úteis**: explique o motivo de decisões complexas, não o que o código já expressa claramente.

* **Testes e refatoração**: escreva testes unitários para lógica crítica e refatore continuamente para evitar duplicação e complexidade excessiva.

## 8. APIs e Microsserviços

* **RESTful**: modele recursos com URIs baseados em substantivos e use verbos HTTP adequados (`GET`, `POST`, `PUT`, `DELETE`).

* **Desacoplamento**: utilize JSON, documente com OpenAPI/Swagger, versionamento de API (`/v1/`).

* **Segurança**: proteja com HTTPS, JWT/OAuth para autenticação e validação de entrada para evitar injeções.

* **Tratamento de erros**: retorne JSON consistente com `code` e `message` e use status HTTP corretos.

## 9. Uso de Bibliotecas e Pacotes

* **Seleção**: prefira bibliotecas ativas e consolidadas. Verifique manutenção, popularidade e vulnerabilidades.

* **Versionamento e gerenciamento**: utilize lockfiles, atualize dependências periodicamente e evite atualizações que quebrem retrocompatibilidade.

* **Modularização**: importe apenas o que precisa para reduzir bundle. Ex.: `import debounce from 'lodash/debounce'`.

* **Documentação**: leia atentamente a documentação e contribua com bug reports ou PRs.

## 10. Resumo de Comandos e Estruturas

* **CLIs úteis**: `npx create-next-app`, `npm init tailwindcss`, `tsc --init`, além de comandos Git e Docker.

* **Padrões modernos**: arrow functions, `async/await`, spread/rest, desestruturação e ES Modules para legibilidade.

* **Arquiteturas**: use Express/Koa/Nest.js para APIs; Next.js/React para front-end. Aplique MVC ou padrões similares e injeção de dependência quando aplicável.

---

Este guia fornece um ponto de partida para aplicar boas práticas em projetos modernos, garantindo código limpo, seguro e escalável.
