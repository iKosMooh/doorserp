# Boas Práticas de Design Mobile-First e UI/UX

## Mobile-First Design

Um design mobile-first significa iniciar o projeto focando nas telas de dispositivos móveis e só depois ir ampliando para telas maiores. Os elementos mais importantes e essenciais devem aparecer primeiro no celular, deixando funcionalidades "extras" para desktop.

**Princípios fundamentais:**
- Cores, tipografia e layouts pensados para legibilidade em tela pequena
- Hierarquia visual clara
- Botões "thumb-friendly" (alvo de toque grande)

O Tailwind CSS adota uma abordagem mobile-first, aplicando utilitários não-prefixed (como `text-center`) a todas as telas, e utilitários com prefixos (`sm:`, `md:` etc.) só a partir desses pontos de interrupção para telas maiores. Portanto, é recomendável criar primeiro o layout móvel e só então ajustar para breakpoints maiores conforme necessário.

## Interface de Usuário vs. Painel Administrativo

### Interface de Usuário Comum

Ao desenhar telas de usuário comum, priorize simplicidade e foco nas tarefas principais. A interface deve ser "snackable" – fácil e rápida de consumir – já que usuários mobile estão em movimento.

**Diretrizes:**
- Use ícones e rótulos claros
- Menu de navegação simples
- Botões grandes e espaçados
- Minimize elementos na tela
- Evite animações excessivas ou pop-ups invasivos
- Mantenha barra de navegação clara com pouco texto
- Use espaços em branco ("white space") para facilitar a visualização
- Otimize o fluxo de telas com caminhos de navegação óbvios (botão "voltar" consistente, breadcrumb)
- Considere gestos intuitivos (swipe, tap)

### Telas Administrativas (Dashboards)

Telas administrativas exibem grande volume de dados. Também devem ser responsivos, mas podem permitir layouts um pouco mais complexos.

**Boas práticas:**
- Use gráficos e tabelas limpas
- Filtros visíveis e hierarquia de informação
- KPIs principais no topo, detalhes abaixo
- Layout minimalista: "ample white space, clean lines, and a limited, purposeful color palette"
- Priorize informações críticas: em telas pequenas mostre apenas os indicadores mais importantes
- Progressive disclosure: revele mais dados sob demanda
- Permita personalização (widgets rearranjáveis, tema claro/escuro)
- Assegure que menus e pesquisas globais sejam acessíveis

## Layout e Responsividade

### CSS e Breakpoints

Use layouts fluídos e responsivos para adaptar-se a qualquer tela.

**Implementação:**
1. Adicione `<meta name="viewport" content="width=device-width, initial-scale=1">` no `<head>`
2. Implemente grade CSS flexível ou CSS Grid
3. Comece com layout empilhado no mobile
4. Aplique flex ou grid nas quebras de tela maiores

**Exemplo Tailwind:**
```html
<div class="flex flex-col md:flex-row">
```

**Lembre-se:** Tailwind usa um sistema mobile-first, onde utilitários sem prefixo valem para todos os tamanhos, e utilitários com prefixo (`sm:`, `md:`, `lg:`, etc.) só se aplicam a partir daquela largura mínima.

### Outras Recomendações

- Use unidades relativas (`rem` ou `%`) em vez de pixels fixos
- Para textos, use tamanhos legíveis em celular com escala proporcional (ex: `text-sm sm:text-base`)
- Imagens e vídeos devem ser fluidos (`max-width: 100%` ou `w-full h-auto` no Tailwind)
- Para grids de cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Garanta que elementos-chave fiquem visíveis sem zoom ou rolagem horizontal no mobile

## Tabelas e Apresentação de Dados

Tabelas tradicionais são difíceis de ler em telas pequenas.

**Soluções:**
- Exiba dados em cards responsivos ou listas no mobile
- Se usar `<table>`, torne-a rolável horizontalmente:
    ```html
    <div class="overflow-x-auto">
        <table>...</table>
    </div>
    ```
- Use `table-auto` (colunas ajustáveis) ou `table-fixed` (largura fixa)
- Mantenha `<thead>` com `<th>` para rótulos semânticos
- Considere `<thead class="sr-only">` para acessibilidade
- Em mobile, transforme cada linha em bloco vertical usando CSS Grid

**Padrão mobile-first para tabelas:** empilhe os dados verticalmente em celulares e só então reponha colunas em `sm:`, `md:` etc.

## Cores, Paleta e Estilo Visual

### Paleta de Cores

**Diretrizes:**
- Escolha uma paleta consistente e legível
- Use poucas cores principais e tons neutros
- Evite cores muito saturadas
- Nunca transmita significado somente pela cor (use ícones ou rótulos)
- Siga recomendações de contraste WCAG:
    - Texto pequeno: contraste mínimo de **4.5:1**
    - Texto grande: contraste mínimo de **3:1**
- Ofereça modo escuro opcional

### Tipografia

- Prefira famílias sem serifa
- Tamanho adequado (evite texto muito pequeno em mobile)
- Garanta diferenciação hierárquica (títulos, legendas, corpo)

### Elementos de Interface

Use elementos "nativos":
- Links azuis sublinhados são claramente clicáveis
- Botões elevados parecem botões reais
- **Honestidade material:** se algo é botão, use `<button>` com estilo apropriado
- Padronize componentes (classes reutilizáveis)

## Acessibilidade (WCAG e UX Inclusivo)

A acessibilidade deve permear todo o design.

### Diretrizes WCAG

**Conteúdo:**
- Forneça texto alternativo (`alt`) em imagens informativas
- Garanta foco visível nos elementos interativos
- Use roles ARIA quando necessário
- Em tabelas, use `<th>` e resuma relações
- Em formulários, associe `<label>` a inputs
- Ofereça múltiplos canais: legendas em vídeos, contraste regulável

### Táctil (Mobile)

**Tamanhos de alvo:**
- Mínimo de **44×44 pixels** para botões e elementos clicáveis
- Deixe espaços generosos entre botões próximos
- Evite exigir gestos complexos
- Use controle de zoom e layouts responsivos
- Evite scroll horizontal ou zoom extremo

### Acesso de Teclado

Importante mesmo em apps móveis (tablets com teclado, acessibilidade por switch):
- Assegure navegação por teclado
- Tab order lógico
- Links skip nav

### Para Usuários com Deficiência Auditiva

- Forneça transcrição ou legendas em vídeos
- Evite áudio automático

### Princípios POUR do WCAG

1. **Perceptível:** contraste e alternativas textuais
2. **Operável:** teclado, toque, zoom
3. **Compreensível:** linguagem clara, erros compreensíveis
4. **Robusto:** compatível com tecnologias assistivas

## Performance e Otimização

Apps e sites precisam ser rápidos. **53% dos usuários móveis abandonam uma página que leva mais de 3 segundos para carregar.**

### Otimizações Essenciais

**Mídia:**
- Comprima imagens (JPEG/WEBP otimizados)
- Lazy-load de imagens fora da tela
- Imagens responsivas

**CSS/JS:**
- Remova CSS não utilizado (PurgeCSS no Tailwind)
- Agrupe e minimifique arquivos
- Use cache do navegador e CDN
- Carregamento assíncrono para scripts pesados

**Tailwind específico:**
- Ative o purge em produção
- Use diretivas `@apply` para evitar repetições
- Crie classes de utilidades reutilizáveis

**SPAs:**
- Code splitting
- Pré-renderização (SSR ou SSG)

**Monitoramento:**
- Métricas de performance (LCP, TTFB, etc.)
- Fontes em formato WOFF
- Otimize cada recurso para conexões móveis

## Ferramentas e Implementação

### Tailwind CSS

Tailwind CSS pode acelerar a implementação do design mobile-first.

**Boas práticas:**
- Aproveite utilitários de breakpoint (`sm:`, `md:`, etc.)
- Crie um sistema de design com componentes reutilizáveis:
    ```css
    .btn-submit {
        @apply bg-blue-500 text-white py-2 px-4;
    }
    ```
- Mantenha o código organizado com classes semânticas
- Use `tailwind.config.js` para tema e pontos de ruptura customizados
- Considere Tailwind UI ou Flowbite para componentes prontos

### Outros Frameworks

Os princípios são os mesmos:
- **Bootstrap, Material UI:** comece com layout mobile, use grid/fluid container
- **CSS puro:** use media queries mobile-first:
    ```css
    @media (min-width: 640px) { ... }
    ```
- **React/Vue/Angular:** separação clara de componentes, use `useMediaQuery` ou hooks

### Workflow

1. Documente padrões visuais e de código
2. Use ferramentas de prototipação (Figma, Sketch)
3. Integre com biblioteca de componentes final
4. Adicione ARIA e valide contraste (Tailwind não impõe acessibilidade)
5. Teste em diversos dispositivos (emuladores e dispositivos reais)

## Conclusão

Este relatório sintetiza diretrizes de design e implementação mobile-first, incluindo layout, cores, acessibilidade e performance. As práticas mencionadas garantem que tanto usuários comuns quanto administradores tenham interfaces claras, rápidas e inclusivas, funcionando bem em celulares, tablets e desktops.

---

**Fontes:** Documentação oficial do Tailwind CSS, artigos de UX design e acessibilidade (codica.com, glassbox.com, medium.com, uxpin.com, dev.to, brasil.uxdesign.cc, accessibilitychecker.org, tryhoverify.com).