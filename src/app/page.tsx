'use client'

import Head from "next/head"
import Image from "next/image"

export default function HomePage() {
  return (
    <>
      <Head>
        <title>DoorsERP - Sistema Moderno de Portaria</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="bg-white font-['Inter',sans-serif]">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-10 bg-gradient-to-r from-green-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
                <span className="text-2xl font-bold text-gray-900">DoorsERP</span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-600 hover:text-green-600 transition-colors">Recursos</a>
                <a href="#demo" className="text-gray-600 hover:text-green-600 transition-colors">Algo</a>
                <a href="#contact" className="text-gray-600 hover:text-green-600 transition-colors">Contato</a>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/face-recognition" className="px-4 py-2 text-green-600 hover:text-green-700 transition-colors">
                  Testar Demo
                </a>
                <a href="/home" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                  Começar Agora
                </a>
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
                  <a href="/home" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center transition-colors">
                    Começar Agora
                    <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                    </svg>
                  </a>
                  <a href="/face-recognition" className="border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 py-4 rounded-xl font-semibold flex items-center transition-colors">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    Testar Reconhecimento
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
        <section className="cta-gradient py-20">
          <div className="max-w-4xl mx-auto text-center px-6">
            <h2 className="text-4xl font-bold text-white mb-6">
              Pronto para modernizar sua portaria?
            </h2>
            <p className="text-xl text-white/90 mb-10 leading-relaxed">
              Experimente agora o DoorsERP e descubra como a tecnologia pode transformar
              a gestão do seu condomínio.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a href="/home" className="bg-white text-green-600 font-semibold py-4 px-10 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:shadow-xl inline-flex items-center justify-center">
                Acessar Dashboard
                <svg className="ml-3 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                </svg>
              </a>
              <a href="/face-recognition" className="bg-white/20 text-white font-semibold py-4 px-10 rounded-xl hover:bg-white/30 transition-all duration-300 backdrop-blur-md inline-flex items-center justify-center border border-white/30">
                <svg className="mr-3 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Testar Reconhecimento
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-green-500 to-orange-500 w-12 h-12 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
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