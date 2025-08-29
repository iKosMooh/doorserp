import Link from 'next/link'
import { 
  Camera, 
  Users, 
  DollarSign, 
  Building, 
  Shield, 
  Activity,
  ArrowRight,
  CheckCircle,
  Zap,
  Monitor
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-500 to-orange-500 w-10 h-10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">DoorsERP</h1>
                <p className="text-sm text-gray-600">Sistema de Portaria</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/home" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Dashboard
              </Link>
              <Link href="/face-recognition" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Reconhecimento
              </Link>
              <Link href="/residents" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Moradores
              </Link>
            </nav>
            <Link href="/home" className="modern-button-primary inline-flex items-center">
              Acessar Sistema
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Conteúdo */}
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <Zap className="w-4 h-4 mr-2" />
                  Sistema Moderno de Controle
                </div>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Controle Total da sua{' '}
                  <span className="gradient-text">Portaria</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Sistema completo com reconhecimento facial, controle financeiro e gestão de moradores. 
                  Segurança e praticidade em uma única plataforma.
                </p>
              </div>

              {/* Features em destaque */}
              <div className="space-y-4">
                {[
                  'Reconhecimento facial avançado',
                  'Controle financeiro integrado',
                  'Gestão completa de moradores',
                  'Interface moderna e intuitiva'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/home" className="modern-button-primary inline-flex items-center justify-center">
                  Começar Agora
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                <Link href="/face-recognition" className="modern-button-secondary inline-flex items-center justify-center">
                  <Camera className="mr-2 w-4 h-4" />
                  Testar Reconhecimento
                </Link>
              </div>
            </div>

            {/* Visual/Cards */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-6">
                {/* Card 1 */}
                <div className="modern-card hover-lift">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <Camera className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Reconhecimento Facial</h3>
                  <p className="text-sm text-gray-600">Sistema avançado de identificação em tempo real</p>
                </div>

                {/* Card 2 */}
                <div className="modern-card hover-lift mt-8">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Gestão de Moradores</h3>
                  <p className="text-sm text-gray-600">Controle completo de residentes e funcionários</p>
                </div>

                {/* Card 3 */}
                <div className="modern-card hover-lift -mt-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Controle Financeiro</h3>
                  <p className="text-sm text-gray-600">Gestão de taxas e pagamentos automatizada</p>
                </div>

                {/* Card 4 */}
                <div className="modern-card hover-lift mt-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <Monitor className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Arduino Control</h3>
                  <p className="text-sm text-gray-600">Integração com dispositivos IoT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Recursos */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Recursos Principais
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tudo que você precisa para gerenciar sua portaria com eficiência e segurança
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Recurso 1 */}
            <div className="modern-card hover-glow text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Reconhecimento Facial</h3>
              <p className="text-gray-600 leading-relaxed">
                Tecnologia avançada de IA para identificação automática de moradores e visitantes
              </p>
            </div>

            {/* Recurso 2 */}
            <div className="modern-card hover-glow text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Gestão de Pessoas</h3>
              <p className="text-gray-600 leading-relaxed">
                Cadastro e controle completo de moradores, funcionários e visitantes
              </p>
            </div>

            {/* Recurso 3 */}
            <div className="modern-card hover-glow text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Financeiro</h3>
              <p className="text-gray-600 leading-relaxed">
                Controle de taxas condominiais, multas e relatórios financeiros detalhados
              </p>
            </div>

            {/* Recurso 4 */}
            <div className="modern-card hover-glow text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Building className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Unidades</h3>
              <p className="text-gray-600 leading-relaxed">
                Gestão completa de apartamentos, casas e áreas comuns do condomínio
              </p>
            </div>

            {/* Recurso 5 */}
            <div className="modern-card hover-glow text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Logs de Acesso</h3>
              <p className="text-gray-600 leading-relaxed">
                Histórico completo de entradas e saídas com timestamps precisos
              </p>
            </div>

            {/* Recurso 6 */}
            <div className="modern-card hover-glow text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Arduino Control</h3>
              <p className="text-gray-600 leading-relaxed">
                Integração com dispositivos IoT para controle de portões e iluminação
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-green-500 to-orange-500">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Pronto para modernizar sua portaria?
          </h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Experimente agora o DoorsERP e descubra como a tecnologia pode transformar 
            a gestão do seu condomínio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/home" 
              className="bg-white text-green-600 font-semibold py-4 px-8 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:shadow-lg inline-flex items-center justify-center"
            >
              Acessar Dashboard
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              href="/face-recognition" 
              className="bg-white/20 text-white font-semibold py-4 px-8 rounded-xl hover:bg-white/30 transition-all duration-300 backdrop-blur-md inline-flex items-center justify-center border border-white/30"
            >
              <Camera className="mr-2 w-5 h-5" />
              Testar Reconhecimento
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="bg-gradient-to-r from-green-500 to-orange-500 w-10 h-10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">DoorsERP</h3>
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
  )
}
