'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Componente de carro 3D
interface CarProps {
  position: [number, number, number]
  color: string
  speed: number
  mouseX: number
  mouseY: number
}

function Car({ position, color, speed, mouseX }: Omit<CarProps, 'mouseY'>) {
  const meshRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [shaking, setShaking] = useState(false)
  const shakeOffset = useRef({ x: 0, y: 0, z: 0 })

  useFrame(() => {
    if (meshRef.current) {
      // Movimento contínuo dos carros
      meshRef.current.position.x += speed
      if (meshRef.current.position.x > 15) {
        meshRef.current.position.x = -15
      }

      // Interação com o mouse - APENAS rotação, SEM movimento vertical
      const targetRotationY = (mouseX / (typeof window !== 'undefined' ? window.innerWidth : 1) - 0.5) * 0.3
      
      meshRef.current.rotation.y += (targetRotationY - meshRef.current.rotation.y) * 0.05

      // Efeito de chacoalhar quando clicado
      if (shaking) {
        shakeOffset.current = {
          x: (Math.random() - 0.5) * 0.2,
          y: (Math.random() - 0.5) * 0.2,
          z: (Math.random() - 0.5) * 0.2
        }
      } else {
        shakeOffset.current.x *= 0.8
        shakeOffset.current.y *= 0.8
        shakeOffset.current.z *= 0.8
      }

      // Aplicar apenas shake de rotação (não de posição)
      meshRef.current.rotation.z = shakeOffset.current.x

      // Animação de hover
      if (hovered) {
        meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1)
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
      }
    }
  })

  const handleClick = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  return (
    <group ref={meshRef} position={position}>
      {/* Corpo do carro */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <boxGeometry args={[2, 0.8, 1]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Teto do carro */}
      <mesh position={[0, 0.6, 0]} onClick={handleClick}>
        <boxGeometry args={[1.2, 0.6, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Rodas - Corrigidas para rotação correta */}
      {[-0.7, 0.7].map((x, i) => (
        <group key={i}>
          {/* Roda traseira */}
          <mesh position={[x, -0.4, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Roda dianteira */}
          <mesh position={[x, -0.4, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Portão de entrada 3D com semáforo
function Gate({ loginStatus }: { loginStatus: 'idle' | 'error' | 'success' }) {
  const gateLeftRef = useRef<THREE.Mesh>(null)
  const gateRightRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (loginStatus === 'success') {
      // Abrir portão
      if (gateLeftRef.current && gateLeftRef.current.position.x > -5) {
        gateLeftRef.current.position.x -= 0.05
      }
      if (gateRightRef.current && gateRightRef.current.position.x < 5) {
        gateRightRef.current.position.x += 0.05
      }
    }
  })

  return (
    <group position={[0, 0, -5]}>
      {/* Pilares */}
      <mesh position={[-3, 1.5, 0]}>
        <boxGeometry args={[0.5, 3, 0.5]} />
        <meshStandardMaterial color="#4a5568" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[3, 1.5, 0]}>
        <boxGeometry args={[0.5, 3, 0.5]} />
        <meshStandardMaterial color="#4a5568" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Topo */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[7, 0.4, 0.5]} />
        <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Semáforo - Luz de Status */}
      <mesh position={[-3.5, 2.5, 0.3]}>
        <boxGeometry args={[0.3, 0.8, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Luz Vermelha (erro) */}
      <mesh position={[-3.5, 2.7, 0.4]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color={loginStatus === 'error' ? '#ef4444' : '#4a1a1a'} 
          emissive={loginStatus === 'error' ? '#ef4444' : '#000000'}
          emissiveIntensity={loginStatus === 'error' ? 2 : 0}
        />
      </mesh>
      
      {/* Luz Verde (sucesso) */}
      <mesh position={[-3.5, 2.3, 0.4]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color={loginStatus === 'success' ? '#10b981' : '#1a4a1a'} 
          emissive={loginStatus === 'success' ? '#10b981' : '#000000'}
          emissiveIntensity={loginStatus === 'success' ? 2 : 0}
        />
      </mesh>

      {/* X vermelho quando erro */}
      {loginStatus === 'error' && (
        <>
          <mesh position={[-3.5, 2.7, 0.5]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.3, 0.05, 0.01]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
          </mesh>
          <mesh position={[-3.5, 2.7, 0.5]} rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.3, 0.05, 0.01]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
          </mesh>
        </>
      )}
      
      {/* Placas "DoorsERP" */}
      <mesh position={[0, 3.5, 0.3]}>
        <boxGeometry args={[2.5, 0.5, 0.1]} />
        <meshStandardMaterial 
          color="#10b981" 
          emissive="#10b981" 
          emissiveIntensity={loginStatus === 'success' ? 1 : 0.3} 
        />
      </mesh>

      {/* Portão Esquerdo */}
      <mesh ref={gateLeftRef} position={[-1.5, 1.5, 0]}>
        <boxGeometry args={[1.3, 3, 0.1]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Portão Direito */}
      <mesh ref={gateRightRef} position={[1.5, 1.5, 0]}>
        <boxGeometry args={[1.3, 3, 0.1]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Cenário 3D completo
function Scene({ mouseX, loginStatus }: { mouseX: number; loginStatus: 'idle' | 'error' | 'success' }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2.5, 12]} />
      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} />
      
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#10b981" />
      
      <Environment preset="sunset" />
      
      {/* Portão */}
      <Gate loginStatus={loginStatus} />
      
      {/* Carros passando */}
      <Car position={[-8, 0.8, 2]} color="#ef4444" speed={0.05} mouseX={mouseX} />
      <Car position={[-4, 0.8, 0]} color="#3b82f6" speed={0.03} mouseX={mouseX} />
      <Car position={[2, 0.8, 1]} color="#10b981" speed={0.04} mouseX={mouseX} />
      <Car position={[6, 0.8, -1]} color="#f59e0b" speed={0.06} mouseX={mouseX} />
      
      {/* Estrada */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 20]} />
        <meshStandardMaterial color="#2d3748" roughness={0.8} />
      </mesh>
      
      {/* Linhas da estrada */}
      {[-2, 2].map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
          <planeGeometry args={[50, 0.2]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </>
  )
}

export default function LoginPage() {
    const { user, isLoading: authLoading, login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [loginStatus, setLoginStatus] = useState<'idle' | 'error' | 'success'>('idle')
    const router = useRouter()
    
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const smoothMouseX = useSpring(mouseX, { damping: 20, stiffness: 100 })

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX)
            mouseY.set(e.clientY)
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [mouseX, mouseY])

    useEffect(() => {
        if (!authLoading && user) {
            router.push('/dashboard')
        }
    }, [user, authLoading, router])

    if (authLoading || user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-emerald-950">
                <motion.div 
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="text-lg text-white">
                        {authLoading ? 'Verificando autenticação...' : 'Redirecionando...'}
                    </div>
                </motion.div>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        setLoginStatus('idle')

        try {
            const success = await login(email, password)
            
            if (success) {
                setLoginStatus('success')
                // O redirect será feito pelo useEffect quando user mudar
            } else {
                setError('Email ou senha incorretos')
                setLoginStatus('error')
                
                setTimeout(() => {
                    setLoginStatus('idle')
                }, 2000)
            }
        } catch (error) {
            console.error('Erro no login:', error)
            setError('Erro de conexão. Tente novamente.')
            setLoginStatus('error')
            
            setTimeout(() => {
                setLoginStatus('idle')
            }, 2000)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-emerald-950">
            {/* Efeito de flash vermelho quando erro */}
            {loginStatus === 'error' && (
                <motion.div
                    className="absolute inset-0 bg-red-600/30 z-20 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.5, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                />
            )}

            {/* Cenário 3D de fundo */}
            <div className="absolute inset-0 opacity-40">
                <Canvas shadows>
                    <Suspense fallback={null}>
                        <Scene mouseX={smoothMouseX.get()} loginStatus={loginStatus} />
                    </Suspense>
                </Canvas>
            </div>

            {/* Conteúdo principal */}
            <div className="relative z-10">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(50)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-green-400 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [0, -30, 0],
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </div>

            {/* Conteúdo principal */}
            <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Lado esquerdo - Branding */}
                    <motion.div
                        className="text-white space-y-8"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <motion.div
                            className="flex items-center space-x-4"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Image 
                                src="/logo.png" 
                                alt="DoorsERP Logo" 
                                width={80} 
                                height={80}
                                className="rounded-2xl shadow-2xl shadow-green-500/50"
                            />
                            <div>
                                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                                    DoorsERP
                                </h1>
                                <p className="text-gray-300 text-lg">Sistema de Portaria Inteligente</p>
                            </div>
                        </motion.div>

                        <motion.div
                            className="space-y-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent">
                                    Segurança que Abre Portas
                                </h2>
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    Controle inteligente de acesso com reconhecimento facial, 
                                    gestão completa de moradores e integração IoT. 
                                    Transforme a portaria do seu condomínio em um sistema 
                                    moderno, eficiente e seguro.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: '🎯', text: 'IA Avançada', color: 'from-blue-400 to-cyan-400' },
                                    { icon: '🔒', text: 'Ultra Seguro', color: 'from-green-400 to-emerald-400' },
                                    { icon: '⚡', text: 'Tempo Real', color: 'from-teal-400 to-cyan-400' },
                                    { icon: '🚗', text: 'IoT Control', color: 'from-emerald-400 to-green-500' },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.15)' }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        <div className="text-3xl mb-2">{item.icon}</div>
                                        <div className={`text-sm font-semibold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                                            {item.text}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Lado direito - Formulário de Login */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <motion.div
                            className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
                            whileHover={{ boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)' }}
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-extrabold text-white mb-2">
                                    Bem-vindo de volta
                                </h2>
                                <p className="text-gray-300">
                                    Entre com suas credenciais para acessar o sistema
                                </p>
                            </div>
                            
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative"
                                    >
                                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl backdrop-blur-sm">
                                            <div className="flex items-center">
                                                <motion.div
                                                    animate={{ 
                                                        rotate: [0, -10, 10, -10, 10, 0],
                                                        scale: [1, 1.1, 1]
                                                    }}
                                                    transition={{ duration: 0.5 }}
                                                    className="text-2xl mr-3"
                                                >
                                                    ❌
                                                </motion.div>
                                                <span>{error}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                                        Email
                                    </label>
                                    <motion.input
                                        whileFocus={{ scale: 1.02 }}
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-sm transition-all"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                                        Senha
                                    </label>
                                    <motion.input
                                        whileFocus={{ scale: 1.02 }}
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-sm transition-all"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Entrando...
                                            </span>
                                        ) : (
                                            'Entrar no Sistema'
                                        )}
                                    </Button>
                                </motion.div>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-400">
                                    Protegido por tecnologia de ponta 🔒
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Gradiente de overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-blue-950/20 to-emerald-950/40 pointer-events-none" />
            </div>
        </div>
    )
}
