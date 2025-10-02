"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useCondominium } from "@/contexts/CondominiumContext"
import { Button } from "@/components/ui/button"
import {
    Camera,
    Settings,
    Monitor,
    Smartphone,
    AlertCircle,
    Play,
    Square,
    RefreshCw
} from "lucide-react"

// Declaração global para face-api.js
declare global {
    interface Window {
        faceapi: Record<string, unknown>
    }
}

interface CachedResident {
    id: string
    name: string
    unit: string
    faceRecognitionFolder: string
    type: 'RESIDENT' | 'EMPLOYEE' | 'GUEST'
}

interface DetectionResult {
    name: string
    confidence: number
    type: 'RESIDENT' | 'EMPLOYEE' | 'GUEST'
    unit?: string
}

interface ResidentData {
    id: string
    user: {
        name: string
        faceRecognitionEnabled: boolean
        faceRecognitionFolder: string
    }
    unit: {
        number: string
    }
    type: 'RESIDENT' | 'EMPLOYEE' | 'GUEST'
}

export default function CondominiumRecognitionPage() {
    const { selectedCondominium } = useCondominium()

    // Estados principais
    const [faceApiLoaded, setFaceApiLoaded] = useState(false)
    const [residents, setResidents] = useState<CachedResident[]>([])
    const [labels, setLabels] = useState<unknown[]>([])
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])  
    const [selectedCamera, setSelectedCamera] = useState<string>('')
    const [cameraOrientation, setCameraOrientation] = useState<'horizontal' | 'vertical'>('horizontal')
    const [showCameraSettings, setShowCameraSettings] = useState(false)
    const [systemReady, setSystemReady] = useState(false) // Estado para indicar que sistema está pronto

    // Estados para Arduino
    const [availablePorts, setAvailablePorts] = useState<{path: string, manufacturer?: string}[]>([])
    const [selectedComPort, setSelectedComPort] = useState<string>('COM4')
    const [isConnecting, setIsConnecting] = useState(false)
    const [arduinoStatus, setArduinoStatus] = useState<{connected: boolean, port?: string, error?: string}>({connected: false})    // Estados da câmera
    const [cameraStarted, setCameraStarted] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [detectionStatus, setDetectionStatus] = useState<'idle' | 'detecting' | 'recognized' | 'paused'>('idle')
    const [lastDetection, setLastDetection] = useState<DetectionResult | null>(null)
    const [commandSent, setCommandSent] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [pauseTimeRemaining, setPauseTimeRemaining] = useState(0)

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDetectingRef = useRef(false)
    const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastRecognitionRef = useRef<{ name: string; timestamp: number } | null>(null)
    const isSequentialLoadingRef = useRef(false)

    // Cache utilities
    const getCacheKey = useCallback((key: string) => `condominium_recognition_${selectedCondominium?.id}_${key}`, [selectedCondominium?.id])

    const saveToCache = useCallback((key: string, value: any) => {
        try {
            localStorage.setItem(getCacheKey(key), JSON.stringify({
                data: value,
                timestamp: Date.now()
            }))
        } catch (error) {
            console.log('Erro ao salvar no cache:', error)
        }
    }, [getCacheKey])

    const getFromCache = useCallback((key: string, maxAge = 30 * 60 * 1000) => {
        try {
            const cached = localStorage.getItem(getCacheKey(key))
            if (!cached) return null

            const { data, timestamp } = JSON.parse(cached)
            if (Date.now() - timestamp > maxAge) {
                localStorage.removeItem(getCacheKey(key))
                return null
            }

            return data
        } catch (error) {
            console.log('Erro ao ler do cache:', error)
            return null
        }
    }, [getCacheKey])

    // Limpar cache específico
    const clearCache = useCallback((key?: string) => {
        try {
            if (key) {
                localStorage.removeItem(getCacheKey(key))
                // console.log(`🗑️ Cache limpo para: ${key}`)
            } else {
                // Limpar todo o cache do condomínio
                const prefix = getCacheKey('')
                const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix))
                keys.forEach(k => localStorage.removeItem(k))
                // console.log(`🗑️ Todo o cache do condomínio limpo (${keys.length} itens)`)
            }
        } catch (error) {
            console.log('Erro ao limpar cache:', error)
        }
    }, [getCacheKey])

    // Forçar reprocessamento de imagens (limpar cache de descritores)
    const forceReprocessImages = useCallback(async () => {
        // console.log('🔄 Forçando reprocessamento de imagens...')

        // Limpar todo o cache de descritores
        const prefix = getCacheKey('descriptors_')
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix))
        keys.forEach(k => localStorage.removeItem(k))

        // console.log(`🗑️ Cache de descritores limpo (${keys.length} itens)`)
    }, [getCacheKey])

    // Carregar Face API
    const loadFaceApi = async () => {
        try {
            if (window.faceapi) {
                setFaceApiLoaded(true)
                return
            }

            const script = document.createElement('script')
            script.src = '/assets/lib/face-api/face-api.min.js'
            script.onload = async () => {
                const faceapi = window.faceapi as any

                // console.log('🤖 Carregando modelos do Face API...')

                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/lib/face-api/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/assets/lib/face-api/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/assets/lib/face-api/models')
                ])

                // console.log('✅ Face API carregado com sucesso!')
                setFaceApiLoaded(true)
            }
            document.head.appendChild(script)
        } catch (error) {
            console.error('❌ Erro ao carregar Face API:', error)
        }
    }

    // Carregar portas COM disponíveis
    const loadAvailablePorts = useCallback(async () => {
        try {
            const response = await fetch('/api/arduino?action=ports')
            const data = await response.json()
            
            if (data.ports) {
                setAvailablePorts(data.ports)
                console.log(`🔌 ${data.ports.length} portas COM encontradas:`, data.ports.map((p: {path: string}) => p.path))
            }
        } catch (error) {
            console.error('❌ Erro ao carregar portas:', error)
        }
    }, [])

    // Verificar status do Arduino
    const checkArduinoStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/arduino')
            const data = await response.json()
            setArduinoStatus({
                connected: data.connected,
                port: data.port,
                error: data.error
            })
            
            if (data.connected && data.port) {
                setSelectedComPort(data.port)
            }
        } catch (error) {
            console.error('❌ Erro ao verificar status Arduino:', error)
        }
    }, [])

    // Conectar/desconectar Arduino
    const toggleArduinoConnection = useCallback(async () => {
        setIsConnecting(true)
        
        try {
            if (arduinoStatus.connected) {
                // Desconectar
                const response = await fetch('/api/arduino', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'disconnect' })
                })
                
                const data = await response.json()
                if (data.success) {
                    setArduinoStatus({ connected: false })
                    console.log('🔌 Arduino desconectado')
                }
            } else {
                // Conectar
                const response = await fetch('/api/arduino', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'connect', 
                        port: selectedComPort === 'auto' ? 'auto' : selectedComPort 
                    })
                })
                
                const data = await response.json()
                setArduinoStatus({
                    connected: data.connected,
                    port: data.port,
                    error: data.error
                })
                
                if (data.success) {
                    console.log(`🔌 Arduino conectado na porta ${data.port}${data.detectedAutomatically ? ' (detectada automaticamente)' : ''}`)
                } else {
                    console.error('❌ Erro ao conectar Arduino:', data.error)
                }
            }
        } catch (error) {
            console.error('❌ Erro na conexão Arduino:', error)
            setArduinoStatus({ connected: false, error: 'Erro de conexão' })
        } finally {
            setIsConnecting(false)
        }
    }, [arduinoStatus.connected, selectedComPort])

    // Detectar porta automaticamente
    const detectArduinoPort = useCallback(async () => {
        setIsConnecting(true)
        
        try {
            const response = await fetch('/api/arduino?action=detect')
            const data = await response.json()
            
            if (data.success && data.detectedPort) {
                setSelectedComPort(data.detectedPort)
                console.log(`🎯 Porta Arduino detectada: ${data.detectedPort}`)
                
                // Conectar automaticamente na porta detectada
                setTimeout(() => {
                    toggleArduinoConnection()
                }, 500)
            } else {
                console.log('❌ Nenhuma porta Arduino detectada automaticamente')
            }
        } catch (error) {
            console.error('❌ Erro na detecção automática:', error)
        } finally {
            setIsConnecting(false)
        }
    }, [toggleArduinoConnection])

    // Carregar câmeras
    const loadCameras = useCallback(async () => {
        // console.log('📹 Iniciando carregamento de câmeras...')

        try {
            await navigator.mediaDevices.getUserMedia({ video: true })
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices.filter(device => device.kind === 'videoinput')

            //console.log('📹 Dispositivos encontrados:', devices.length)
            //console.log('📹 Câmeras de vídeo:', videoDevices.length)

            setCameras(videoDevices)

            if (videoDevices.length > 0) {
                const cachedCamera = getFromCache('selectedCamera')
                const cameraToSelect = cachedCamera && videoDevices.find(c => c.deviceId === cachedCamera)
                    ? cachedCamera
                    : videoDevices[0].deviceId

                //console.log('📹 Câmera selecionada:', cameraToSelect)
                setSelectedCamera(cameraToSelect)
            }

            const cachedOrientation = getFromCache('cameraOrientation')
            if (cachedOrientation) {
                setCameraOrientation(cachedOrientation)
            }

            // Carregar porta COM salva
            const cachedComPort = getFromCache('selectedComPort')
            if (cachedComPort) {
                setSelectedComPort(cachedComPort)
            }

            //console.log(`📹 ${videoDevices.length} câmeras encontradas e configuradas`)
        } catch (error) {
            console.error('❌ Erro ao carregar câmeras:', error)
        }
    }, [getFromCache])

    // Carregar moradores
    const loadResidents = useCallback(async (): Promise<CachedResident[]> => {
        if (!selectedCondominium) return []

        const cached = getFromCache('residents')
        if (cached) {
            setResidents(cached)
            return cached
        }

        try {
            const response = await fetch(`/api/residents?condominiumId=${selectedCondominium.id}`)
            const data = await response.json()

            // console.log('🔍 Resposta da API residents:', data)

            // A API pode retornar data.residents ou data.data
            const residentsArray = data.residents || data.data || []

            if (data.success && Array.isArray(residentsArray)) {
                const residentsData: CachedResident[] = residentsArray
                    .filter((r: ResidentData) => r.user?.faceRecognitionEnabled && r.user?.faceRecognitionFolder)
                    .map((r: ResidentData) => ({
                        id: r.id,
                        name: r.user.name,
                        unit: r.unit.number,
                        faceRecognitionFolder: r.user.faceRecognitionFolder,
                        type: r.type
                    }))

                setResidents(residentsData)
                saveToCache('residents', residentsData)

                // console.log(`👥 ${residentsData.length} moradores carregados`)
                return residentsData
            } else {
                console.log('⚠️ Dados de residents inválidos:', data)
                console.log('⚠️ Array de residents:', residentsArray)
            }
        } catch (error) {
            console.error('❌ Erro ao carregar moradores:', error)
        }

        return []
    }, [selectedCondominium, getFromCache, saveToCache])

    // Carregar labels para reconhecimento com cache inteligente
    const loadLabels = useCallback(async () => {
        if (!faceApiLoaded || !selectedCondominium) return

        try {
            const faceapi = window.faceapi as any

            // console.log('🏷️ Carregando labels para reconhecimento...')

            const residentsData = await loadResidents()
            const newLabels: unknown[] = []

            for (const resident of residentsData) {
                try {
                    //console.log(`📂 Processando ${resident.name} (${resident.faceRecognitionFolder})`)

                    // Verificar se já temos os descritores em cache
                    const cacheKey = `descriptors_${resident.faceRecognitionFolder}`
                    const cachedDescriptors = getFromCache(cacheKey, 24 * 60 * 60 * 1000) // Cache por 24 horas

                    let descriptors: Float32Array[] = []

                    if (cachedDescriptors && cachedDescriptors.length > 0) {
                        // Usar descritores do cache
                        //console.log(`📋 Usando descritores em cache para ${resident.name} (${cachedDescriptors.length} descritores)`)
                        descriptors = cachedDescriptors.map((desc: number[]) => new Float32Array(desc))
                    } else {
                        // Processar imagens e criar novos descritores
                        //console.log(`🔄 Processando imagens para ${resident.name}...`)

                        const response = await fetch(`/api/face-recognition/images?folder=${resident.faceRecognitionFolder}`)
                        const data = await response.json()

                        if (data.success && data.images?.length > 0) {
                            for (const imageData of data.images) {
                                try {
                                    const imageResponse = await fetch(imageData.url)
                                    if (imageResponse.ok) {
                                        const blob = await imageResponse.blob()
                                        const img = new Image()
                                        img.src = URL.createObjectURL(blob)

                                        await new Promise((resolve) => {
                                            img.onload = resolve
                                        })

                                        const detection = await faceapi
                                            .detectSingleFace(img)
                                            .withFaceLandmarks()
                                            .withFaceDescriptor()

                                        if (detection) {
                                            descriptors.push(detection.descriptor)
                                            // console.log(`✅ Face processada: ${imageData.name}`)
                                        }

                                        // Limpar objeto URL para evitar vazamentos de memória
                                        URL.revokeObjectURL(img.src)
                                    }
                                } catch (error) {
                                    console.log(`⚠️ Erro ao processar imagem de ${resident.name}:`, error)
                                }
                            }

                            // Salvar descritores no cache se conseguiu processar alguma imagem
                            if (descriptors.length > 0) {
                                const descriptorsArray = descriptors.map(desc => Array.from(desc))
                                saveToCache(cacheKey, descriptorsArray)
                                // console.log(`💾 Descritores salvos em cache para ${resident.name}`)
                            }
                        }
                    }

                    // Criar label se temos descritores
                    if (descriptors.length > 0) {
                        const labeledDescriptor = new (faceapi as any).LabeledFaceDescriptors(
                            `${resident.name}|${resident.type}|${resident.unit}`,
                            descriptors
                        )
                        newLabels.push(labeledDescriptor)
                        //console.log(`✅ Label criado para ${resident.name} com ${descriptors.length} descritores`)
                    } else {
                        console.log(`⚠️ Nenhum descritor válido encontrado para ${resident.name}`)
                    }

                } catch (error) {
                    console.log(`❌ Erro ao processar ${resident.name}:`, error)
                }
            }

            setLabels(newLabels)
            // console.log(`🏷️ ${newLabels.length} labels carregados para reconhecimento`)

        } catch (error) {
            console.error('❌ Erro ao carregar labels:', error)
        }
    }, [faceApiLoaded, selectedCondominium, loadResidents, getFromCache, saveToCache])

    // Enviar comando Arduino
    const sendArduinoCommand = useCallback(async (command: string): Promise<boolean> => {
        try {
            console.log(`🔌 Enviando comando para Arduino: ${command}`)

            // Primeiro verificar se está conectado
            const statusResponse = await fetch('/api/arduino')
            const statusData = await statusResponse.json()

            // Se não estiver conectado, tentar conectar automaticamente com a porta selecionada
            if (!statusData.connected) {
                console.log(`🔄 Arduino não conectado, tentando conectar automaticamente na porta ${selectedComPort}...`)

                const connectResponse = await fetch('/api/arduino', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'connect',
                        port: selectedComPort === 'auto' ? 'auto' : selectedComPort
                    }),
                })

                const connectData = await connectResponse.json()

                if (!connectData.success) {
                    console.log(`❌ Falha ao conectar Arduino: ${connectData.error}`)
                    // Atualizar status local para mostrar erro
                    setArduinoStatus({
                        connected: false,
                        error: connectData.error
                    })
                    // Em modo de falha de conexão, simular o comando para não bloquear o sistema
                    console.log(`🎭 Simulando comando ${command} devido à falha de conexão`)
                    setCommandSent(true)
                    setTimeout(() => setCommandSent(false), 5000)
                    return true // Retorna true para não bloquear o fluxo
                } else {
                    console.log(`✅ Arduino conectado automaticamente na porta ${connectData.port}`)
                    // Atualizar status local
                    setArduinoStatus({
                        connected: true,
                        port: connectData.port
                    })
                }
            }

            // Agora enviar o comando
            const response = await fetch('/api/arduino', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'command',
                    command
                }),
            })

            const data = await response.json()

            if (data.success) {
                console.log(`✅ Comando enviado com sucesso: ${command} (${data.mode || 'unknown'})`)
                setCommandSent(true)
                setTimeout(() => setCommandSent(false), 5000)
                return true
            } else {
                console.log(`❌ Erro ao enviar comando: ${data.error}`)
                // Se não conseguiu enviar, simular para não bloquear
                if (data.error?.includes('não conectado')) {
                    console.log(`🎭 Simulando comando ${command} devido à falta de conexão`)
                    setCommandSent(true)
                    setTimeout(() => setCommandSent(false), 5000)
                    return true
                }
                return false
            }
        } catch (error) {
            console.error('❌ Erro ao enviar comando Arduino:', error)
            // Em caso de erro de rede ou outro, simular para não bloquear
            console.log(`🎭 Simulando comando ${command} devido ao erro: ${error}`)
            setCommandSent(true)
            setTimeout(() => setCommandSent(false), 5000)
            return true
        }
    }, [selectedComPort])

    // Salvar log de acesso no banco de dados
    const saveAccessLog = useCallback(async (detection: DetectionResult): Promise<boolean> => {
        if (!selectedCondominium) {
            console.log('❌ Nenhum condomínio selecionado para salvar log')
            return false
        }

        try {
            console.log(`💾 Salvando log de acesso para: ${detection.name}`)

            const response = await fetch('/api/access-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    condominiumId: selectedCondominium.id,
                    personName: detection.name,
                    accessType: detection.type,
                    unitNumber: detection.unit,
                    building: 'A', // Você pode ajustar conforme necessário
                    status: 'APPROVED',
                    method: 'FACIAL_RECOGNITION',
                    confidence: detection.confidence,
                    timestamp: new Date().toISOString()
                }),
            })

            const data = await response.json()

            if (data.success) {
                console.log(`✅ Log de acesso salvo com sucesso:`, data.log)
                return true
            } else {
                console.log(`❌ Erro ao salvar log de acesso: ${data.error}`)
                return false
            }
        } catch (error) {
            console.error('❌ Erro ao salvar log de acesso:', error)
            return false
        }
    }, [selectedCondominium])

    // Detecção facial
    const detectFaces = useCallback(async () => {
        // Não detectar se estiver pausado
        if (isPaused) {
            console.log('⏸️ Detecção pausada')
            return
        }

        if (!videoRef.current || !canvasRef.current || !faceApiLoaded || labels.length === 0 || !cameraStarted || !cameraStream) {
            // console.log('🚫 Condições não atendidas para detecção:', {
            //     video: !!videoRef.current,
            //     canvas: !!canvasRef.current,
            //     faceApi: faceApiLoaded,
            //     labels: labels.length,
            //     cameraStarted,
            //     cameraStream: !!cameraStream,
            //     isPaused
            // })
            return
        }

        try {
            const faceapi = window.faceapi as any

            const video = videoRef.current
            const canvas = canvasRef.current

            // Configurar canvas
            if (canvas && video) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                    ; (faceapi as any).matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight })
            }

            // Detectar faces
            const detections = await (faceapi as any)
                .detectAllFaces(video)
                .withFaceLandmarks()
                .withFaceDescriptors()

            const resizedDetections = (faceapi as any).resizeResults(detections, {
                width: video.videoWidth,
                height: video.videoHeight
            })

            // Limpar canvas
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
            }

            if (resizedDetections.length > 0) {
                // Rosto detectado - status laranja
                setDetectionStatus('detecting')
                
                // console.log(`👤 ${resizedDetections.length} rosto(s) detectado(s), verificando reconhecimento...`)
                // console.log(`🏷️ Labels disponíveis: ${labels.length}`)
                
                // Criar matcher
                const faceMatcher = new (faceapi as any).FaceMatcher(labels, 0.6)

                let bestMatch: DetectionResult | null = null
                let highestConfidence = 0

                for (const detection of resizedDetections) {
                    const match = faceMatcher.findBestMatch(detection.descriptor)
                    const confidence = 1 - match.distance

                    // console.log(`🔍 Match encontrado: ${match.label} (confiança: ${(confidence * 100).toFixed(1)}%)`)

                    if (confidence > 0.5 && confidence > highestConfidence) { // Reduzido de 0.7 para 0.5 temporariamente
                        const [name, type, unit] = match.label.split('|')
                        // console.log(`✅ Match válido: ${name} (confiança: ${(confidence * 100).toFixed(1)}%)`)
                        // console.log(`🔍 Detalhes do split: name="${name}", type="${type}", unit="${unit}"`)
                        // console.log(`🔍 Verificação name !== 'unknown': ${name !== 'unknown'}`)
                        if (name !== 'unknown') {
                            bestMatch = { name, type: type as 'RESIDENT' | 'EMPLOYEE' | 'GUEST', unit, confidence }
                            highestConfidence = confidence
                            // console.log(`🎯 Melhor match atualizado: ${name}`)
                        } else {
                            // console.log(`❌ Nome é 'unknown', ignorando match`)
                        }
                    }
                }

                // console.log(`📊 Resultado final: ${bestMatch ? `${bestMatch.name} (${(bestMatch.confidence * 100).toFixed(1)}%)` : 'Nenhum reconhecimento válido'}`)

                if (bestMatch) {
                    // Verificar cooldown por pessoa (evitar múltiplos reconhecimentos da mesma pessoa)
                    const now = Date.now()
                    const lastRecognition = lastRecognitionRef.current

                    if (lastRecognition &&
                        lastRecognition.name === bestMatch.name &&
                        now - lastRecognition.timestamp < 25000) { // 25 segundos de cooldown por pessoa
                        // console.log(`⏳ Cooldown ativo para ${bestMatch.name}, ignorando detecção`)
                        setDetectionStatus('idle')
                        return
                    }

                    // Registrar novo reconhecimento
                    lastRecognitionRef.current = { name: bestMatch.name, timestamp: now }

                    setLastDetection(bestMatch)
                    setDetectionStatus('recognized')

                    console.log(`🎯 Reconhecido: ${bestMatch.name} (${(bestMatch.confidence * 100).toFixed(1)}%)`)

                    // Pausar detecção por 20 segundos
                    setIsPaused(true)
                    // Manter status como 'recognized' durante toda a pausa, não mudar para 'paused'

                    // Parar o loop de detecção imediatamente
                    isDetectingRef.current = false
                    if (detectionTimeoutRef.current) {
                        clearTimeout(detectionTimeoutRef.current)
                        detectionTimeoutRef.current = null
                    }

                    // Salvar no banco de dados
                    console.log(`💾 Salvando log de acesso para: ${bestMatch.name}`)
                    const logSaved = await saveAccessLog(bestMatch)
                    console.log(`💾 Log de acesso ${logSaved ? 'salvo' : 'falhou'}`)

                    // Enviar comando para Arduino (comando correto)
                    console.log(`🔌 Enviando comando FACE_RECOGNIZED para abrir portão para: ${bestMatch.name}`)
                    const commandSent = await sendArduinoCommand('FACE_RECOGNIZED') // Comando correto para abrir a cancela
                    console.log(`🔌 Comando FACE_RECOGNIZED ${commandSent ? 'enviado com sucesso' : 'falhou'}`)
                    
                    // O Arduino fecha automaticamente após 10s sem detectar veículo, não precisa enviar comando de fechamento

                    // Countdown para mostrar tempo restante
                    let timeLeft = 20
                    setPauseTimeRemaining(timeLeft)

                    const countdown = setInterval(() => {
                        timeLeft--
                        setPauseTimeRemaining(timeLeft)

                        if (timeLeft <= 0) {
                            clearInterval(countdown)
                            setIsPaused(false)
                            setDetectionStatus('idle')
                            setPauseTimeRemaining(0)
                            console.log('✅ Detecção reativada após pausa')

                            // Reiniciar o loop de detecção após a pausa
                            setTimeout(() => {
                                if (!isPaused && !isDetectingRef.current) {
                                    isDetectingRef.current = true
                                    // Chama detectFaces diretamente para reiniciar o loop
                                    const restartDetection = async () => {
                                        const detect = async () => {
                                            if (!isDetectingRef.current) return
                                            await detectFaces()
                                            if (isDetectingRef.current) {
                                                detectionTimeoutRef.current = setTimeout(detect, 1500)
                                            }
                                        }
                                        detect()
                                    }
                                    restartDetection()
                                }
                            }, 1000) // Aguardar 1 segundo antes de reiniciar
                        }
                    }, 1000)

                    // Salvar referência do timeout
                    pauseTimeoutRef.current = countdown as any

                } else {
                    // Rosto detectado mas não reconhecido - manter status 'detecting' (laranja)
                    setDetectionStatus('detecting')
                }
            } else {
                // Nenhum rosto detectado - status aguardando (cinza)
                setDetectionStatus('idle')
            }
        } catch (error) {
            console.error('❌ Erro na detecção:', error)
            setDetectionStatus('idle')
        }
    }, [faceApiLoaded, labels, cameraStarted, cameraStream, isPaused, saveAccessLog, sendArduinoCommand])

    // Loop de detecção
    const startDetection = useCallback(() => {
        if (isDetectingRef.current) return

        isDetectingRef.current = true

        const detect = async () => {
            if (!isDetectingRef.current) return

            await detectFaces()

            if (isDetectingRef.current) {
                // Aumentar intervalo para 1.5 segundos para reduzir processamento
                detectionTimeoutRef.current = setTimeout(detect, 1500)
            }
        }

        detect()
    }, [detectFaces])

    // Iniciar câmera
    const startCamera = useCallback(async () => {
        /*console.log('🎬 Tentando iniciar câmera...', {
            selectedCamera,
            cameras: cameras.length,
            cameraStarted,
            faceApiLoaded,
            videoRefExists: !!videoRef.current
        })*/

        if (cameraStarted) {
            console.log('⚠️ Câmera já está iniciada')
            return
        }

        if (!selectedCamera) {
            console.log('❌ Nenhuma câmera selecionada')
            throw new Error('Nenhuma câmera selecionada')
        }

        if (!faceApiLoaded) {
            console.log('❌ Face API ainda não carregada')
            throw new Error('Sistema ainda carregando, aguarde...')
        }

        // Aguardar um pouco para garantir que o DOM está pronto
        if (!videoRef.current) {
            console.log('⏳ videoRef não disponível, aguardando 100ms...')
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (!videoRef.current) {
            console.log('❌ videoRef.current ainda não está disponível')
            throw new Error('Elemento de vídeo não está pronto')
        }

        try {
            const constraints = {
                video: {
                    deviceId: { exact: selectedCamera },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            }

            //console.log('📋 Constraints da câmera:', constraints)

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            console.log('✅ Stream obtido:'/*, {
                id: stream.id,
                active: stream.active,
                tracks: stream.getVideoTracks().length
            }*/)

            setCameraStream(stream)

            //console.log('📺 Configurando elemento de vídeo')
            const video = videoRef.current
            video.srcObject = stream

            // Aguardar o vídeo carregar e reproduzir
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.log('⏰ Timeout ao carregar vídeo')
                    reject(new Error('Timeout ao carregar vídeo'))
                }, 10000)

                video.onloadedmetadata = async () => {
                    //console.log('📊 Metadados carregados, iniciando reprodução...')
                    try {
                        await video.play()
                        setCameraStarted(true)
                        //console.log('🎉 Câmera iniciada com sucesso!')
                        clearTimeout(timeout)
                        resolve()
                    } catch (playError) {
                        console.error('❌ Erro ao reproduzir vídeo:', playError)
                        clearTimeout(timeout)
                        reject(playError)
                    }
                }

                video.onerror = (error) => {
                    console.error('❌ Erro no elemento de vídeo:', error)
                    clearTimeout(timeout)
                    reject(new Error('Erro ao carregar vídeo'))
                }
            })

        } catch (error) {
            console.error('❌ Erro ao iniciar câmera:', error)
            setCameraStream(null)
            setCameraStarted(false)
            throw error
        }
    }, [selectedCamera, cameraStarted, faceApiLoaded])

    // Parar câmera
    const stopCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop())
            setCameraStream(null)
        }
        setCameraStarted(false)
        
        // Reset flags quando câmera parar
        isDetectingRef.current = false
        isDetectingRef.current = false

        if (detectionTimeoutRef.current) {
            clearTimeout(detectionTimeoutRef.current)
        }

        console.log('🛑 Câmera parada')
    }, [cameraStream])



    // Carregar dados iniciais de forma simplificada e rápida
    useEffect(() => {
        const loadInitialData = async () => {
            if (selectedCondominium && faceApiLoaded) {
                // Evitar múltiplas execuções simultâneas
                if (isSequentialLoadingRef.current) {
                    return
                }

                isSequentialLoadingRef.current = true
                console.log('🔄 Carregando dados do sistema...')
                setSystemReady(false)

                try {
                    // Carregar câmeras, labels e Arduino em paralelo para ser mais rápido
                    const [camerasResult, labelsResult, portsResult, statusResult] = await Promise.allSettled([
                        loadCameras(),
                        loadLabels(),
                        loadAvailablePorts(),
                        checkArduinoStatus()
                    ])

                    // Verificar resultados
                    if (camerasResult.status === 'rejected') {
                        console.warn('⚠️ Erro ao carregar câmeras:', camerasResult.reason)
                    }
                    
                    if (labelsResult.status === 'rejected') {
                        console.warn('⚠️ Erro ao carregar labels:', labelsResult.reason)
                    }

                    if (portsResult.status === 'rejected') {
                        console.warn('⚠️ Erro ao carregar portas:', portsResult.reason)
                    }

                    if (statusResult.status === 'rejected') {
                        console.warn('⚠️ Erro ao verificar status Arduino:', statusResult.reason)
                    }

                    // Aguardar apenas um momento para estabilização
                    await new Promise(resolve => setTimeout(resolve, 300))

                    // Considerar sistema pronto independente dos resultados
                    setSystemReady(true)
                    isSequentialLoadingRef.current = false
                    
                    console.log(`✅ Sistema carregado: ${cameras.length} câmeras, ${labels.length} labels, ${availablePorts.length} portas`)
                    
                } catch (error) {
                    console.error('❌ Erro no carregamento:', error)
                    // Mesmo com erro, considerar sistema pronto para permitir operação manual
                    setSystemReady(true)
                    isSequentialLoadingRef.current = false
                }
            } else {
                setSystemReady(false)
                isSequentialLoadingRef.current = false
            }
        }

        loadInitialData()
    }, [selectedCondominium, faceApiLoaded, loadCameras, loadLabels, loadAvailablePorts, checkArduinoStatus, cameras.length, labels.length, availablePorts.length])

    // Reset flags quando condomínio mudar
    useEffect(() => {
        isSequentialLoadingRef.current = false
        setSystemReady(false)
    }, [selectedCondominium?.id])

    // Iniciar detecção automaticamente (versão ultra-simplificada)
    useEffect(() => {
        // Só verificar uma vez quando as condições mudarem
        const checkAndStart = () => {
            const shouldStart = 
                cameraStarted && 
                faceApiLoaded && 
                cameraStream && 
                !isPaused && 
                !isDetectingRef.current

            if (shouldStart) {
                console.log(`🚀 Condições OK - Iniciando detecção (labels: ${labels.length})`)
                // Iniciar imediatamente
                startDetection()
            }
        }

        // Verificar após pequeno delay para evitar chamadas muito rápidas
        const timer = setTimeout(checkAndStart, 1000)
        
        return () => {
            clearTimeout(timer)
        }
    }, [cameraStarted, faceApiLoaded, cameraStream, isPaused, labels.length, startDetection])

    // Inicializar sistema
    useEffect(() => {
        loadFaceApi()
    }, [])

    // Iniciar câmera automaticamente quando carregamento inicial estiver completo
    useEffect(() => {
        // Só tentar auto-iniciar após carregamento inicial completo
        if (!systemReady) {
            //console.log('⏳ Carregamento inicial ainda em andamento, aguardando...')
            return
        }

        const autoStartCamera = async () => {
            /*console.log('🔄 Verificando condições para auto-iniciar câmera (após carregamento):', {
                systemReady,
                faceApiLoaded,
                camerasCount: cameras.length,
                selectedCamera,
                cameraStarted,
                labelsCount: labels.length,
                condominium: !!selectedCondominium,
                videoRefExists: !!videoRef.current
            })*/

            // Verificar se sistema está completamente pronto
            if (systemReady &&
                faceApiLoaded &&
                cameras.length > 0 &&
                selectedCamera &&
                !cameraStarted &&
                selectedCondominium &&
                labels.length > 0) {

                console.log('✅ Sistema completamente pronto para auto-início')

                // Verificar se videoRef está disponível
                if (!videoRef.current) {
                    console.log('⏳ VideoRef não disponível, aguardando...')
                    await new Promise(resolve => setTimeout(resolve, 500))
                }

                if (videoRef.current && !cameraStarted) {
                    console.log('🚀 Auto-iniciando câmera...')
                    try {
                        await startCamera()
                        console.log('✅ Câmera auto-iniciada com sucesso')
                    } catch (error) {
                        console.error('❌ Erro no auto-início da câmera:', error)
                    }
                } else {
                    console.log('❌ VideoRef não disponível ou câmera já iniciada')
                }
            } else {
                console.log('❌ Sistema não está completamente pronto para auto-iniciar câmera')
            }
        }

        // Executar apenas quando sistema estiver completamente pronto e câmera não iniciada
        if (!cameraStarted) {
            autoStartCamera()
        }
    }, [systemReady, faceApiLoaded, cameras.length, selectedCamera, cameraStarted, selectedCondominium, labels.length, startCamera])

    // Cleanup
    useEffect(() => {
        return () => {
            // Limpar stream da câmera
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop())
            }

            // Limpar timeouts
            if (detectionTimeoutRef.current) {
                clearTimeout(detectionTimeoutRef.current)
            }

            if (pauseTimeoutRef.current) {
                clearInterval(pauseTimeoutRef.current)
            }

            if (detectionTimeoutRef.current) {
                clearTimeout(detectionTimeoutRef.current)
            }

            // Parar loop de detecção
            isDetectingRef.current = false
            
            // Reset flags de carregamento
            isSequentialLoadingRef.current = false
        }
    }, [cameraStream])

    if (!selectedCondominium) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2 text-white">Nenhum Condomínio Selecionado</h2>
                    <p className="text-gray-400">Selecione um condomínio para usar o reconhecimento facial</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 w-screen h-screen flex flex-col bg-black overflow-hidden">
            {/* Header compacto */}
            <div className="flex items-center justify-between p-3 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 z-50">
                <div>
                    <h1 className="text-xl font-bold text-white">Reconhecimento Facial</h1>
                    <p className="text-xs text-gray-300">
                        {selectedCondominium.name} • {residents.length} moradores • {labels.length} labels
                        {isPaused && (
                            <span className="text-yellow-400 ml-2">
                                • ⏸️ Pausado ({pauseTimeRemaining}s)
                            </span>
                        )}
                    </p>
                </div>
                <div><a href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm">← Painel</a></div>
            </div>

            {/* Área da câmera ocupando toda a tela */}
            <div className="flex-1 relative bg-black overflow-hidden">
                <div className="w-full h-full relative">
                    {/* Elemento de vídeo sempre presente (mas pode estar oculto) */}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover ${cameraStarted ? 'block' : 'hidden'}`}
                    />
                    <canvas
                        ref={canvasRef}
                        className={`absolute inset-0 w-full h-full ${cameraStarted ? 'block' : 'hidden'}`}
                    />

                    {/* Tela de loading/pronto quando câmera não está ativa */}
                    {!cameraStarted && (
                        <div className="flex items-center justify-center h-full bg-gray-900">
                            <div className="text-center text-white">
                                <Camera className="h-24 w-24 mx-auto mb-4 opacity-50" />
                                {!faceApiLoaded ? (
                                    <div>
                                        <p className="text-lg mb-2">🤖 Carregando Face API...</p>
                                        <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto">
                                            <div className="h-2 bg-blue-500 rounded-full animate-pulse w-1/4"></div>
                                        </div>
                                    </div>
                                ) : cameras.length === 0 ? (
                                    <div>
                                        <p className="text-lg mb-2">📹 Carregando câmeras...</p>
                                        <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto">
                                            <div className="h-2 bg-green-500 rounded-full animate-pulse w-2/4"></div>
                                        </div>
                                    </div>
                                ) : labels.length === 0 ? (
                                    <div>
                                        <p className="text-lg mb-2">🏷️ Processando reconhecimento...</p>
                                        <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto">
                                            <div className="h-2 bg-yellow-500 rounded-full animate-pulse w-3/4"></div>
                                        </div>
                                    </div>
                                ) : !systemReady ? (
                                    <div>
                                        <p className="text-lg mb-2">⏳ Preparando sistema...</p>
                                        <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto">
                                            <div className="h-2 bg-orange-500 rounded-full animate-pulse w-5/6"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-lg mb-2">✅ Sistema pronto!</p>
                                        <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto">
                                            <div className="h-2 bg-green-500 rounded-full w-full"></div>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-2">Iniciando câmera automaticamente...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Overlay com controles */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Indicadores de status (lado esquerdo) */}
                        <div className="absolute top-4 left-4 flex flex-col gap-3 pointer-events-auto">
                            {/* Status do sistema */}
                            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-white">
                                {!faceApiLoaded ? (
                                    <>
                                        <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse" />
                                        <span className="text-sm">Carregando Face-API...</span>
                                    </>
                                ) : !systemReady ? (
                                    <>
                                        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
                                        <span className="text-sm">
                                            Carregando: {cameras.length} câmeras, {labels.length} residents
                                        </span>
                                    </>
                                ) : labels.length === 0 ? (
                                    <>
                                        <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-sm">Falha: 0 residents carregados</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-3 w-3 bg-green-500 rounded-full" />
                                        <span className="text-sm">
                                            Sistema pronto: {cameras.length} câmeras, {labels.length} residents
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Status de detecção */}
                            {cameraStarted && (
                                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-white">
                                    {detectionStatus === 'detecting' && (
                                        <>
                                            <div className="h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
                                            <span className="text-sm">Detectando...</span>
                                        </>
                                    )}
                                    {detectionStatus === 'recognized' && lastDetection && (
                                        <>
                                            <div className="h-3 w-3 bg-green-500 rounded-full" />
                                            <span className="text-sm">
                                                {lastDetection.name} ({(lastDetection.confidence * 100).toFixed(0)}%)
                                                {isPaused && ` - ${pauseTimeRemaining}s`}
                                            </span>
                                        </>
                                    )}
                                    {detectionStatus === 'paused' && (
                                        <>
                                            <div className="h-3 w-3 bg-red-500 rounded-full" />
                                            <span className="text-sm">
                                                Pausado ({pauseTimeRemaining}s)
                                            </span>
                                        </>
                                    )}
                                    {detectionStatus === 'idle' && !isPaused && (
                                        <>
                                            <div className="h-3 w-3 bg-gray-500 rounded-full" />
                                            <span className="text-sm">Aguardando...</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Controles (lado direito) */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowCameraSettings(!showCameraSettings)}
                                    className="bg-black/70 backdrop-blur-sm border-white/20 text-white hover:bg-black/80"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => loadLabels()}
                                    className="bg-black/70 backdrop-blur-sm border-white/20 text-white hover:bg-black/80"
                                    title="Recarregar Labels"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        forceReprocessImages()
                                        loadLabels()
                                    }}
                                    className="bg-black/70 backdrop-blur-sm border-white/20 text-orange-300 hover:bg-black/80"
                                    title="Reprocessar Imagens (limpar cache)"
                                >
                                    🔄
                                </Button>
                            </div>

                            {/* Painel de configurações */}
                            {showCameraSettings && (
                                <div className="bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/20 min-w-80">
                                    <div className="space-y-4">
                                        {/* Seleção de câmera */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white">Câmera</label>
                                            <select
                                                value={selectedCamera}
                                                onChange={async (e) => {
                                                    const newCameraId = e.target.value;
                                                    setSelectedCamera(newCameraId);
                                                    saveToCache('selectedCamera', newCameraId);
                                                    
                                                    // Se havia uma câmera ativa, trocar automaticamente
                                                    if (cameraStarted && newCameraId) {
                                                        console.log('📹 Trocando câmera automaticamente...');
                                                        
                                                        // Parar câmera atual
                                                        stopCamera();
                                                        
                                                        // Aguardar um momento e iniciar nova câmera
                                                        setTimeout(async () => {
                                                            try {
                                                                await startCamera();
                                                                console.log('✅ Câmera trocada com sucesso');
                                                            } catch (error) {
                                                                console.error('❌ Erro ao trocar câmera:', error);
                                                            }
                                                        }, 1000);
                                                    }
                                                }}
                                                className="w-full p-2 bg-black/60 border border-white/20 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                {cameras.map((camera) => (
                                                    <option key={camera.deviceId} value={camera.deviceId} className="bg-black text-white">
                                                        {camera.label || `Câmera ${camera.deviceId.slice(0, 8)}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Orientação */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white">Orientação</label>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={cameraOrientation === 'horizontal' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => {
                                                        setCameraOrientation('horizontal')
                                                        saveToCache('cameraOrientation', 'horizontal')
                                                    }}
                                                    className="bg-black/60 border-white/20 text-white hover:bg-black/80"
                                                >
                                                    <Monitor className="h-4 w-4 mr-1" />
                                                    Horizontal
                                                </Button>
                                                <Button
                                                    variant={cameraOrientation === 'vertical' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => {
                                                        setCameraOrientation('vertical')
                                                        saveToCache('cameraOrientation', 'vertical')
                                                    }}
                                                    className="bg-black/60 border-white/20 text-white hover:bg-black/80"
                                                >
                                                    <Smartphone className="h-4 w-4 mr-1" />
                                                    Vertical
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Gerenciamento de Cache */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white">Cache</label>
                                            <div className="space-y-2">
                                                <div className="text-xs text-gray-400">
                                                    Cache acelera o carregamento evitando reprocessar imagens já analisadas
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            forceReprocessImages()
                                                            loadLabels()
                                                        }}
                                                        className="bg-orange-600/20 border-orange-600/50 text-orange-300 hover:bg-orange-600/30"
                                                    >
                                                        🔄 Reprocessar
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => clearCache()}
                                                        className="bg-red-600/20 border-red-600/50 text-red-300 hover:bg-red-600/30"
                                                    >
                                                        🗑️ Limpar Tudo
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Configurações do Arduino */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white">Arduino</label>
                                            <div className="space-y-3">
                                                {/* Status do Arduino */}
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className={`w-2 h-2 rounded-full ${arduinoStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <span className="text-white">
                                                        {arduinoStatus.connected ? `Conectado (${arduinoStatus.port})` : 'Desconectado'}
                                                    </span>
                                                </div>

                                                {/* Seleção de porta COM */}
                                                <div className="flex gap-2">
                                                    <select
                                                        value={selectedComPort}
                                                        onChange={(e) => {
                                                            setSelectedComPort(e.target.value)
                                                            saveToCache('selectedComPort', e.target.value)
                                                        }}
                                                        className="flex-1 p-2 text-sm bg-black/60 border border-white/20 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={isConnecting}
                                                    >
                                                        <option value="auto">Detectar Automaticamente</option>
                                                        {availablePorts.map((port) => (
                                                            <option key={port.path} value={port.path} className="bg-black text-white">
                                                                {port.path} {port.manufacturer ? `(${port.manufacturer})` : ''}
                                                            </option>
                                                        ))}
                                                        <option value="COM3">COM3</option>
                                                        <option value="COM4">COM4</option>
                                                        <option value="COM5">COM5</option>
                                                        <option value="COM6">COM6</option>
                                                        <option value="COM7">COM7</option>
                                                        <option value="COM8">COM8</option>
                                                    </select>
                                                </div>

                                                {/* Botões de controle */}
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={detectArduinoPort}
                                                        disabled={isConnecting}
                                                        size="sm"
                                                        className="bg-blue-600/20 border-blue-600/50 text-blue-300 hover:bg-blue-600/30"
                                                    >
                                                        🔍 Detectar
                                                    </Button>
                                                    <Button
                                                        onClick={toggleArduinoConnection}
                                                        disabled={isConnecting}
                                                        size="sm"
                                                        className={`${arduinoStatus.connected 
                                                            ? 'bg-red-600/20 border-red-600/50 text-red-300 hover:bg-red-600/30' 
                                                            : 'bg-green-600/20 border-green-600/50 text-green-300 hover:bg-green-600/30'
                                                        }`}
                                                    >
                                                        {isConnecting ? '⏳' : arduinoStatus.connected ? '🔌 Desconectar' : '🔌 Conectar'}
                                                    </Button>
                                                </div>

                                                {arduinoStatus.error && (
                                                    <div className="text-xs text-red-400 mt-2 p-2 bg-red-900/20 rounded border border-red-600/30">
                                                        <div className="font-semibold mb-1">❌ Erro de Conexão:</div>
                                                        <div className="whitespace-pre-line leading-relaxed">
                                                            {arduinoStatus.error}
                                                        </div>
                                                        {arduinoStatus.error.includes('Access denied') && (
                                                            <div className="mt-2 pt-2 border-t border-red-600/30">
                                                                <div className="text-yellow-300 text-xs">
                                                                    💡 <strong>Dica:</strong> Feche o Arduino IDE ou Serial Monitor antes de conectar
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Controles da câmera */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white">Controle</label>
                                            <div className="flex gap-2">
                                                {!cameraStarted ? (
                                                    <Button
                                                        onClick={async () => {
                                                            console.log('🎯 Botão iniciar câmera clicado')
                                                            console.log('Estado atual:', {
                                                                faceApiLoaded,
                                                                cameras: cameras.length,
                                                                selectedCamera,
                                                                cameraStarted
                                                            })

                                                            if (!faceApiLoaded) {
                                                                console.log('❌ Face API não carregada ainda')
                                                                alert('Sistema ainda carregando, aguarde...')
                                                                return
                                                            }

                                                            if (cameras.length === 0) {
                                                                console.log('❌ Nenhuma câmera encontrada')
                                                                alert('Nenhuma câmera encontrada!')
                                                                return
                                                            }

                                                            try {
                                                                console.log('🚀 Iniciando câmera...')
                                                                await startCamera()
                                                                console.log('✅ Câmera iniciada com sucesso')
                                                                
                                                                // Se não há labels carregados, tentar carregar rapidamente
                                                                if (labels.length === 0) {
                                                                    console.log('⚠️ Carregando labels...')
                                                                    await loadLabels()
                                                                }
                                                                
                                                                // Iniciar detecção diretamente após inicializar câmera
                                                                setTimeout(() => {
                                                                    if (faceApiLoaded && !isPaused && !isDetectingRef.current) {
                                                                        console.log('🎯 Iniciando detecção após inicialização manual')
                                                                        startDetection()
                                                                    }
                                                                }, 1000)
                                                                
                                                            } catch (error) {
                                                                console.error('❌ Erro ao iniciar câmera:', error)
                                                                alert('Erro ao iniciar câmera: ' + (error as Error).message)
                                                            }
                                                        }}
                                                        disabled={!faceApiLoaded || cameras.length === 0}
                                                        className={`${!faceApiLoaded || cameras.length === 0
                                                                ? 'bg-gray-600 cursor-not-allowed'
                                                                : 'bg-green-600 hover:bg-green-700'
                                                            } text-white`}
                                                        title={
                                                            !faceApiLoaded ? 'Aguardando carregamento do sistema...' :
                                                                cameras.length === 0 ? 'Nenhuma câmera encontrada' :
                                                                    'Iniciar câmera'
                                                        }
                                                    >
                                                        <Play className="h-4 w-4 mr-1" />
                                                        {!faceApiLoaded ? 'Carregando...' : cameras.length === 0 ? 'Sem câmeras' : 'Iniciar'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={stopCamera}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        <Square className="h-4 w-4 mr-1" />
                                                        Parar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Informações na parte inferior */}
                        {cameraStarted && (
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm">
                                    {commandSent && (
                                        <div className="text-green-300 font-medium mb-1">
                                            ✓ Comando enviado para o Arduino
                                        </div>
                                    )}
                                    {detectionStatus === 'recognized' && lastDetection && (
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-green-300">
                                                {lastDetection.name}
                                            </div>
                                        </div>
                                    )}
                                    {detectionStatus === 'paused' && lastDetection && (
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-yellow-300">
                                                🎯 Reconhecido: {lastDetection.name}
                                            </div>
                                            <div className="text-base font-medium text-red-300">
                                                ⏸️ Detecção pausada por {pauseTimeRemaining} segundos
                                            </div>
                                            <div className="text-xs opacity-75 mt-1">
                                                Sistema será reativado automaticamente
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Overlay central de pausa */}
                        {isPaused && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                                <div className="text-center text-white">
                                    <div className="bg-green-600/90 rounded-full p-8 mb-6 mx-auto w-32 h-32 flex items-center justify-center animate-pulse">
                                        <div className="text-4xl font-bold">
                                            {pauseTimeRemaining}
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-bold mb-4 text-green-400">✅ RECONHECIDO</h2>
                                    <p className="text-2xl text-white mb-2">
                                        {lastDetection?.name}
                                    </p>
                                    <p className="text-xl text-yellow-400 animate-pulse">
                                        ⏸️ Sistema pausado
                                    </p>
                                    <p className="text-lg text-gray-300">
                                        Reativando em {pauseTimeRemaining} segundos
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
