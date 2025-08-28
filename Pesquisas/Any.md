Guia de Boas Práticas: Evitando o Uso de any em Aplicações Next.js com Prisma e TypeScript

Este guia apresenta recomendações detalhadas para eliminar o tipo any, reforçar a segurança de tipos e adotar padrões que garantam a robustez e manutenibilidade de aplicações Next.js usando Prisma e TypeScript.

1. Por Que Evitar o Tipo any

Desativa a verificação de tipos: Usar any faz o TypeScript tratar a variável sem quaisquer restrições, empurrando erros para tempo de execução.

Diminui a legibilidade: Sem tipos claros, outros desenvolvedores não sabem qual estrutura de dados esperar.

Complica refatorações: Mudanças em campos ou modelos tornam-se propensas a bugs silenciosos.

Regra: Nunca anote parâmetros, variáveis ou retornos de função como any. Use tipos explícitos ou, no caso de incerteza, unknown com type guards.

2. Utilizando os Tipos Gerados pelo Prisma

2.1 Modelos Prisma e Inferência Automática

Defina seus modelos em schema.prisma. Exemplo:

model ImageProduct {
  id          Int    @id @default(autoincrement())
  url         String
  name        String
  mainImage   Boolean
  order       Int
}

Gere o cliente Prisma:

npx prisma generate

As consultas findMany() inferem automaticamente o tipo:

const images = await prisma.imageProduct.findMany();
// images: ImageProduct[] (sem usar any)

2.2 Tipagem Explícita e Utilitários

Para maior clareza, importe tipos:

import { PrismaClient, ImageProduct } from '@prisma/client';

async function getImages(): Promise<ImageProduct[]> {
  return prisma.imageProduct.findMany();
}

Use utilitários para select ou include:

import { PrismaClient, Prisma } from '@prisma/client';

type ImageTitles = Prisma.ImageProductGetPayload<{ select: { id: true; name: true } }>;

async function getTitles(): Promise<ImageTitles[]> {
  return prisma.imageProduct.findMany({ select: { id: true, name: true } });
}

3. Regras de ESLint para Proibir any

Instale dependências:

npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

Configure .eslintrc.json:

{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["plugin:@typescript-eslint/recommended", "next/core-web-vitals"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}

Habilite linting ciente de tipos (opcional para regras mais avançadas):

{
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "extends": ["plugin:@typescript-eslint/recommended-type-checked"]
}

Integre no CI/CD e execute via next lint.

Regra: Qualquer ocorrência de any deve falhar no lint, forçando a correção antes do merge.

4. Padrões de Prisma Client no Next.js

4.1 Singleton para Hot Reload

// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient;
}

export const prisma =
  global.prisma ||
  new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

4.2 Uso em Route Handlers ou Server Components

// app/api/images/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  const images = await prisma.imageProduct.findMany();
  return NextResponse.json({ images });
}

Nunca use any para tipar req, res ou resultados; confie nos tipos gerados.

5. Depuração de Erros de Tipo no Prisma

P2002 (Unique), P2003 (Foreign Key), P2025 (Not Found): trate via try/catch e valide antes de executar.

PrismaClientValidationError: indica uso incorreto de campos; revise tipos ou seleções.

Checklist:

npx prisma validate

npm run type-check

npm run lint

6. Integração com IA: Engenharia de Prompt Ciente de Tipos

Evite dizer: "Use any aqui".

Prefira: "Use ImageProduct do Prisma para tipar os resultados da consulta".

Estrategicamente: insira exemplos few-shot com assinaturas de função tipadas corretamente.

7. Conclusão

A eliminação do any e a adoção de tipos gerados pelo Prisma, reforçadas pelo ESLint e padrões de singleton no Next.js, formam a base de aplicações seguras e confiáveis. Aliado a práticas de prompting para IA, esse fluxo assegura qualidade de código de ponta a ponta.

