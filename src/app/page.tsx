'use client'

import Head from "next/head"
import Image from "next/image"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  return (
    <>
      <Head>
        <title>DoorsERP - Sistema Moderno de Portaria</title>
      </Head>
      <div className="bg-white font-['Inter',sans-serif]">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Image 
                  src="/logorbg.png" 
                  alt="DoorsERP Logo" 
                  width={40} 
                  height={40}
                  className="rounded-xl"
                />
                <span className="text-2xl font-bold text-gray-900">DoorsERP</span>
              </div>

              <div className="flex items-center space-x-4">
                {user ? (
                  <a 
                    href={user.isAdmin ? "/dashboard" : "/resident-dashboard"} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Ir para o Sistema
                  </a>
                ) : (
                  <a href="/login" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    Fazer Login
                  </a>
                )}
              </div>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="gradient-bg hero-pattern">
          <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Sistema Moderno de Controle
                </div>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Controle Total da sua <span className="text-green-600">Portaria</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-xl">
                  Simplifique a gestão do seu condomínio com tecnologia de ponta, segurança e eficiência em um único sistema integrado.
                </p>
                <div className="flex flex-wrap gap-6">
                  <a href="#solucao" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold flex justify-center items-center transition-colors">
                    Temos a solução da sua portaria
                    <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                    </svg>
                  </a>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-2xl">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl card-hover">
                      <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center mb-4 feature-icon">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Reconhecimento Facial</h3>
                      <p className="text-sm text-gray-600">Sistema avançado de identificação em tempo real</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl card-hover mt-8">
                      <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center mb-4 feature-icon">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Gestão de Moradores</h3>
                      <p className="text-sm text-gray-600">Controle completo de residentes e funcionários</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl card-hover -mt-4">
                      <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center mb-4 feature-icon">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Controle Financeiro</h3>
                      <p className="text-sm text-gray-600">Gestão de taxas e pagamentos automatizada</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl card-hover mt-4">
                      <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center mb-4 feature-icon">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Arduino Control</h3>
                      <p className="text-sm text-gray-600">Integração com dispositivos IoT</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About DoorsERP Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-3xl">
                  <div className="aspect-video bg-white rounded-2xl shadow-lg flex items-center justify-center">
                    <svg className="w-32 h-32 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 order-1 lg:order-2">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sobre o DoorsERP
                </div>
                
                <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                  O que é o <span className="text-blue-600">DoorsERP</span>?
                </h2>
                
                <p className="text-lg text-gray-600 leading-relaxed">
                  O <strong className="text-gray-900">DoorsERP</strong> é um sistema ERP (Enterprise Resource Planning) 
                  completo e moderno, desenvolvido especificamente para <strong className="text-gray-900">gestão de condomínios e portarias</strong>. 
                  Nossa plataforma integra tecnologias de ponta como reconhecimento facial, controle de acesso IoT e gestão financeira 
                  em uma única solução intuitiva.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Gestão Centralizada</h3>
                      <p className="text-gray-600">Todos os módulos integrados: moradores, funcionários, unidades, financeiro e controle de acesso.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Interface Moderna e Intuitiva</h3>
                      <p className="text-gray-600">Design responsivo com <strong>notificações toast</strong> não-intrusivas, substituindo alertas tradicionais por feedback visual elegante e profissional.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Segurança e Confiabilidade</h3>
                      <p className="text-gray-600">Autenticação JWT, criptografia bcrypt, tratamento de erros completo e logs detalhados para auditoria.</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-2xl border-l-4 border-green-500">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong className="text-gray-900">🎉 Sistema de Notificações Toast:</strong> Todas as operações do sistema agora utilizam 
                    <strong className="text-blue-600"> notificações toast modernas</strong> em vez de alerts tradicionais. 
                    Feedback visual elegante com 4 tipos (sucesso, erro, aviso, info), auto-dismiss configurável, 
                    animações suaves e possibilidade de empilhamento - proporcionando uma experiência de usuário profissional e não-intrusiva.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <span id="solucao"></span>

        {/* Problemática e Solução - Seção Acadêmica */}
        <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-24">
          <div className="max-w-7xl mx-auto px-6">
            {/* Título da Seção */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium mb-6">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                A Problemática que Empresas Enfrentam
              </div>
              <h2 className="text-5xl font-bold text-gray-900 mb-4">
                Por que <span className="text-red-600">Não Integrar</span> é um Risco?
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto">
                Riscos e ineficiências de não integrar controle de acesso físico à gestão corporativa
              </p>
            </div>

            {/* Problemas - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {/* Problema 1 */}
              <div className="bg-white rounded-3xl p-8 shadow-lg border-l-4 border-red-500 hover:shadow-2xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Fragmentação e Silos de Dados</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Quando a <strong className="text-gray-900">portaria funciona isoladamente</strong> — com seu próprio software 
                      ou gestão manual — e o restante da empresa utiliza um ERP para finanças, RH e produção, 
                      os <strong className="text-red-600">dados de acessos ficam desconectados</strong>.
                    </p>
                    <div className="bg-red-50 p-4 rounded-xl">
                      <p className="text-sm text-gray-700 font-medium">
                        ⚠️ Resultado: Redundância de cadastros, dados dispersos, retrabalho e inconsistências graves.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Problema 2 */}
              <div className="bg-white rounded-3xl p-8 shadow-lg border-l-4 border-orange-500 hover:shadow-2xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Falhas de Segurança Críticas</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Sem controle integrado, torna-se <strong className="text-gray-900">impossível aplicar política uniforme de permissões</strong>, 
                      rastrear acessos físicos correlacionados com operações digitais (estoque, sala de servidores, áreas restritas).
                    </p>
                    <div className="bg-orange-50 p-4 rounded-xl">
                      <p className="text-sm text-gray-700 font-medium">
                        🔓 Resultado: Vulnerabilidades tanto físicas quanto de informação, sem rastreabilidade efetiva.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Problema 3 */}
              <div className="bg-white rounded-3xl p-8 shadow-lg border-l-4 border-yellow-500 hover:shadow-2xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Baixa Eficiência e Alto Custo</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Portaria manual ou sistemas separados exigem <strong className="text-gray-900">recursos humanos constantes</strong>, 
                      são lentos, sujeitos a <strong className="text-red-600">falhas humanas</strong> e geram custos fixos elevados — 
                      especialmente em empresas com grande fluxo de pessoas.
                    </p>
                    <div className="bg-yellow-50 p-4 rounded-xl">
                      <p className="text-sm text-gray-700 font-medium">
                        💸 Resultado: Custos operacionais desnecessários, filas, espera e processos ineficientes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Problema 4 */}
              <div className="bg-white rounded-3xl p-8 shadow-lg border-l-4 border-red-600 hover:shadow-2xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Dificuldade de Auditoria e Compliance</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Em ambientes corporativos, especialmente indústrias com áreas sensíveis, a <strong className="text-gray-900">falta de logs integrados</strong> 
                      dificulta auditorias, rastreamento de incidentes e conformidade com <strong className="text-red-700">normas regulatórias e LGPD</strong>.
                    </p>
                    <div className="bg-red-50 p-4 rounded-xl">
                      <p className="text-sm text-gray-700 font-medium">
                        📋 Resultado: Impossibilidade de governança corporativa efetiva e risco de não-conformidade legal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divisor Visual */}
            <div className="relative py-12">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <div className="bg-white px-8 py-4 rounded-full shadow-lg border-2 border-green-500">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Solução */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                A Solução Integrada
              </div>
              <h2 className="text-5xl font-bold text-gray-900 mb-4">
                Integração entre <span className="text-green-600">Portaria Eletrônica</span> e ERP
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto">
                Sistema unificado onde o controle de acesso físico é parte integrante do sistema de gestão empresarial
              </p>
            </div>

            {/* Benefícios da Solução */}
            <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-3xl p-10 text-white shadow-2xl mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Benefício 1 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Centralização de Dados</h4>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Todas as informações (colaboradores, visitantes, horários, permissões, históricos) na mesma base do ERP, 
                    <strong> eliminando silos e duplicidades</strong>.
                  </p>
                </div>

                {/* Benefício 2 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Gestão de Permissões RBAC</h4>
                  <p className="text-white/90 text-sm leading-relaxed">
                    O ERP gerencia funções e cargos — a mesma lógica de <strong>roles (papéis e permissões)</strong> aplicada ao acesso físico. 
                    Consistência e segurança garantidas.
                  </p>
                </div>

                {/* Benefício 3 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Rastreabilidade Total</h4>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Combina histórico de acessos físicos com operações internas (estoque, produção, financeiro), 
                    permitindo <strong>auditorias abrangentes e conformidade regulatória</strong>.
                  </p>
                </div>

                {/* Benefício 4 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Redução de Custos</h4>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Automação de portaria <strong>elimina papel, reduz mão de obra presencial</strong> e ganha agilidade. 
                    Menos filas, menos espera, registros automáticos.
                  </p>
                </div>

                {/* Benefício 5 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Escalabilidade</h4>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Ao crescer a empresa (mais funcionários, unidades, sites), a solução integrada 
                    <strong> escala de forma padronizada</strong>, sem sistemas isolados adicionais.
                  </p>
                </div>

                {/* Benefício 6 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Segurança Corporativa</h4>
                  <p className="text-white/90 text-sm leading-relaxed">
                    ERPs modernos adotam <strong>RBAC, MFA e verificação biométrica</strong>, 
                    unificando controle de acessos físicos e digitais com alto nível de proteção.
                  </p>
                </div>
              </div>
            </div>

            {/* Evidências Acadêmicas */}
            <div className="bg-white rounded-3xl p-10 shadow-2xl">
              <div className="text-center mb-10">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Respaldo Acadêmico e Técnico
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Evidências Científicas que Comprovam a Eficácia
                </h3>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Esta solução não é apenas "bom senso" — há <strong className="text-gray-900">respaldo técnico e prático robusto</strong> para seus benefícios
                </p>
              </div>

              <div className="space-y-6">
                {/* Evidência 1 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-l-4 border-blue-500">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">
                        📄 Estudo: "Sistemas Integrados de Controle de Portaria em Plantas Industriais"
                      </h4>
                      <p className="text-gray-700 leading-relaxed text-sm mb-2">
                        Pesquisa bibliográfica demonstra que <strong>sistemas integrados de controle de portaria</strong> (biometria, CCTV, monitoramento) 
                        contribuem significativamente para <strong className="text-blue-700">segurança patrimonial e eficiência operacional</strong> 
                        em ambientes industriais e corporativos.
                      </p>
                      <p className="text-xs text-gray-500 italic">Fonte: Revista Acadêmica da Lusofonia</p>
                    </div>
                  </div>
                </div>

                {/* Evidência 2 */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border-l-4 border-green-500">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">
                        🔒 Artigo 2025: "Implementing Robust Data Privacy and Security in Modern ERP Systems"
                      </h4>
                      <p className="text-gray-700 leading-relaxed text-sm mb-2">
                        Pesquisa de 2025 destaca que ERPs modernos adotam <strong className="text-green-700">RBAC (Role-Based Access Control), 
                        autenticação multifatorial e verificação biométrica</strong> para proteção de dados sensíveis. 
                        Demonstra viabilidade de <strong>unificar controles físicos e digitais com alto nível de segurança</strong>.
                      </p>
                      <p className="text-xs text-gray-500 italic">Fonte: IJRSCEIT - International Journal of Research</p>
                    </div>
                  </div>
                </div>

                {/* Evidência 3 - DESTAQUE */}
                <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 p-8 rounded-2xl border-2 border-purple-500 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <div className="inline-flex items-center px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold mb-3">
                        🏆 ESTUDO DE CASO COMPROVADO
                      </div>
                      <h4 className="font-bold text-gray-900 mb-3 text-xl">
                        💰 Redução de 51,6% de Custos Operacionais com ERP em Nuvem + Controle de Acesso
                      </h4>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        Trabalho de 2014 <em>"Applying authentication and network security to in-cloud ERP system"</em> demonstrou que 
                        ERPs baseados em nuvem com <strong className="text-purple-700">controle de acesso eficaz e autenticação robusta</strong> 
                        alcançaram:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-xl border border-purple-200">
                          <div className="text-3xl font-bold text-purple-600 mb-2">48,4%</div>
                          <p className="text-sm text-gray-700">
                            do custo total em relação a ERPs tradicionais on-premise
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-purple-200">
                          <div className="text-3xl font-bold text-green-600 mb-2">5,2×</div>
                          <p className="text-sm text-gray-700">
                            maior número de acessos ao ERP na nuvem comparado ao tradicional
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 italic">Fonte: SpringerLink - International Journal of Cloud Computing</p>
                    </div>
                  </div>
                </div>

                {/* Evidência 4 */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-2xl border-l-4 border-orange-500">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">
                        🏭 Literatura ERP: Integração e Eliminação de Redundância
                      </h4>
                      <p className="text-gray-700 leading-relaxed text-sm mb-2">
                        Literatura técnica sobre ERPs define como <strong className="text-orange-700">vantagem central</strong> a 
                        <strong> "integração e padronização de processos"</strong> e <strong>"eliminação de redundância e duplicidade de dados"</strong> 
                        como fatores críticos de eficiência, redução de erros e conformidade operacional.
                      </p>
                      <p className="text-xs text-gray-500 italic">Fontes: FATEC ZL, SpringerLink, Wikipedia (Enterprise Resource Planning)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conclusão Técnica */}
              <div className="mt-10 bg-gradient-to-r from-green-600 to-blue-600 p-8 rounded-2xl text-white">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold mb-3">🎯 Conclusão: Vale a Pena — Sob as Condições Certas</h4>
                    <p className="text-white/95 leading-relaxed mb-4">
                      A integração de <strong>portaria eletrônica com sistema ERP</strong> representa uma <strong className="text-yellow-300">solução estratégica</strong>, 
                      não apenas operacional. Quando bem implementada, ela resolve a problemática de silos de dados, duplicidade, insegurança, 
                      retrabalho e dificuldade de governança.
                    </p>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-4">
                      <h5 className="font-bold text-lg mb-3">✅ Ideal para empresas que possuem:</h5>
                      <ul className="space-y-2 text-sm text-white/90">
                        <li className="flex items-start">
                          <span className="text-green-300 mr-2 flex-shrink-0">▶</span>
                          <span>Fluxo significativo de pessoas (colaboradores, visitantes, prestadores)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-300 mr-2 flex-shrink-0">▶</span>
                          <span>Múltiplas áreas ou unidades (galpões, plantas, escritórios, blocos)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-300 mr-2 flex-shrink-0">▶</span>
                          <span>Áreas sensíveis (estoque, salas restritas, produção, data centers)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-300 mr-2 flex-shrink-0">▶</span>
                          <span>Necessidade de governança, compliance e auditoria (LGPD, ISO, normas setoriais)</span>
                        </li>
                      </ul>
                    </div>
                    <p className="text-xs text-white/80 mt-4 italic">
                      ⚠️ A adoção deve ser acompanhada de boas práticas de segurança da informação: criptografia, autenticação, 
                      controle de privilégios e conformidade com legislação de proteção de dados (LGPD).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Tecnologias de Ponta
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Desenvolvido com as melhores e mais modernas tecnologias do mercado
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Frontend Stack */}
              <div className="bg-white p-8 rounded-3xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </span>
                  Frontend Moderno
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Next.js 14 + TypeScript</h4>
                      <p className="text-gray-600 text-sm">Framework React com renderização server-side, App Router e tipagem estática para máxima performance e segurança de código</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Tailwind CSS</h4>
                      <p className="text-gray-600 text-sm">Framework CSS utilitário para design responsivo e componentização eficiente</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Face-api.js</h4>
                      <p className="text-gray-600 text-sm">Biblioteca JavaScript para reconhecimento facial em tempo real usando TensorFlow.js</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">React Context API</h4>
                      <p className="text-gray-600 text-sm">Gerenciamento de estado global para autenticação e seleção de condomínio</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backend Stack */}
              <div className="bg-white p-8 rounded-3xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </span>
                  Backend Robusto
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Next.js API Routes</h4>
                      <p className="text-gray-600 text-sm">APIs RESTful serverless integradas ao Next.js para endpoints otimizados</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Prisma ORM</h4>
                      <p className="text-gray-600 text-sm">ORM moderno type-safe para gerenciamento do MySQL com migrations automáticas e queries otimizadas</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">bcryptjs + JWT</h4>
                      <p className="text-gray-600 text-sm">Criptografia de senhas com hash seguro e autenticação via tokens JWT</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Node.js File System</h4>
                      <p className="text-gray-600 text-sm">Gerenciamento de imagens de reconhecimento facial no sistema de arquivos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Architecture */}
            <div className="bg-white p-10 rounded-3xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </span>
                Arquitetura de Banco de Dados Híbrida
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border-l-4 border-blue-500 pl-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">MySQL (Relacional)</h4>
                  <p className="text-gray-600 mb-4">
                    Banco de dados principal gerenciado pelo Prisma ORM. Armazena toda a estrutura relacional do sistema com integridade referencial garantida.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      Usuários, Moradores e Funcionários
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      Condomínios, Unidades e Visitantes
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      Transações Financeiras
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      Configurações de Arduino
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-green-500 pl-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">MongoDB (NoSQL)</h4>
                  <p className="text-gray-600 mb-4">
                    Banco não-relacional dedicado exclusivamente para logs de acesso. Otimizado para escrita massiva e consultas rápidas de eventos temporais.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                      Logs de entrada/saída em tempo real
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                      Histórico de reconhecimento facial
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                      Eventos de abertura de portões
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                      Auditoria de ações do sistema
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl">
                <h5 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Por que essa arquitetura híbrida?
                </h5>
                <p className="text-gray-700 text-sm leading-relaxed">
                  <strong className="text-gray-900">Performance otimizada:</strong> MySQL oferece ACID compliance e relacionamentos complexos para dados estruturados, 
                  enquanto MongoDB fornece altíssima performance para inserção e leitura de logs sem afetar a base transacional. 
                  Essa separação garante que milhares de eventos de acesso não sobrecarreguem o banco principal, mantendo o sistema 
                  responsivo mesmo com alto volume de tráfego.
                </p>
              </div>
            </div>

            {/* IoT Integration */}
            <div className="mt-8 bg-white p-10 rounded-3xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </span>
                Integração IoT com Arduino
              </h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Sistema completo de comunicação serial com dispositivos Arduino para controle físico de portões, 
                catracas e iluminação. Inclui monitor serial em tempo real e deploy remoto de código.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-orange-50 p-4 rounded-xl">
                  <h5 className="font-semibold text-gray-900 mb-2">Web Serial API</h5>
                  <p className="text-gray-600">Comunicação direta browser-Arduino via porta serial</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl">
                  <h5 className="font-semibold text-gray-900 mb-2">Deploy OTA</h5>
                  <p className="text-gray-600">Upload de código para Arduino direto pela interface web</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl">
                  <h5 className="font-semibold text-gray-900 mb-2">Monitor Serial</h5>
                  <p className="text-gray-600">Debug em tempo real da comunicação com dispositivos</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Recursos Principais
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Tudo que você precisa para gerenciar sua portaria com eficiência e segurança
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-gray-50 p-8 rounded-3xl card-hover text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 feature-icon">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Reconhecimento Facial</h3>
                <p className="text-gray-600 leading-relaxed">
                  Tecnologia avançada de IA para identificação automática de moradores e visitantes
                </p>
              </div>
              {/* Card 2 */}
              <div className="bg-gray-50 p-8 rounded-3xl card-hover text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 feature-icon">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Gestão de Pessoas</h3>
                <p className="text-gray-600 leading-relaxed">
                  Cadastro e controle completo de moradores, funcionários e visitantes
                </p>
              </div>
              {/* Card 3 */}
              <div className="bg-gray-50 p-8 rounded-3xl card-hover text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 feature-icon">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Financeiro</h3>
                <p className="text-gray-600 leading-relaxed">
                  Controle de taxas condominiais, multas e relatórios financeiros detalhados
                </p>
              </div>
              {/* Card 4 */}
              <div className="bg-gray-50 p-8 rounded-3xl card-hover text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 feature-icon">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Unidades</h3>
                <p className="text-gray-600 leading-relaxed">
                  Gestão completa de apartamentos, casas e áreas comuns do condomínio
                </p>
              </div>
              {/* Card 5 */}
              <div className="bg-gray-50 p-8 rounded-3xl card-hover text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 feature-icon">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Logs de Acesso</h3>
                <p className="text-gray-600 leading-relaxed">
                  Histórico completo de entradas e saídas com timestamps precisos
                </p>
              </div>
              {/* Card 6 */}
              <div className="bg-gray-50 p-8 rounded-3xl card-hover text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 feature-icon">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Arduino Control</h3>
                <p className="text-gray-600 leading-relaxed">
                  Integração com dispositivos IoT para controle de portões e iluminação
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="cta-gradient p-5">
          <div className="max-w-4xl mx-auto text-center mb-10 mt-10">
            <h2 className="text-4xl font-bold text-white mb-10">
              Pronto para modernizar sua portaria?
            </h2>
            <p className="text-xl text-white/90 mb-10 leading-relaxed">
              Experimente agora o DoorsERP e descubra como a tecnologia pode transformar
              a gestão do seu condomínio.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
              <div className="flex items-center space-x-4">
                <Image 
                  src="/logo.png" 
                  alt="DoorsERP Logo" 
                  width={48} 
                  height={48}
                  className="rounded-xl"
                />
                <div>
                  <h3 className="text-2xl font-bold">DoorsERP</h3>
                  <p className="text-gray-400 text-sm">Sistema de Portaria Moderno</p>
                </div>
              </div>
              <div className="text-gray-400 text-sm">
                © 2025 DoorsERP. Todos os direitos reservados.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}