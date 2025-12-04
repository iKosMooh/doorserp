"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
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
    Pause,
    RefreshCw
} from "lucide-react"
import jsQR from 'jsqr'

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
    guestData?: {
        validFrom: string
        validUntil?: string
        currentEntries: number
        maxEntries: number
        invitedBy?: string
    }
}

interface DetectionResult {
    name: string
    confidence: number
    type: 'RESIDENT' | 'EMPLOYEE' | 'GUEST'
    unit?: string
    id?: string
    isUnauthorized?: boolean
    status?: 'APPROVED' | 'DENIED'
    reason?: string
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
    const router = useRouter()
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
    const [selectedComPort, setSelectedComPort] = useState<string>('auto') // Auto-detectar por padrão
    const [isConnecting, setIsConnecting] = useState(false)
    const [arduinoStatus, setArduinoStatus] = useState<{connected: boolean, port?: string, error?: string}>({connected: false})    // Estados da câmera
    const [cameraStarted, setCameraStarted] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [detectionStatus, setDetectionStatus] = useState<'idle' | 'detecting' | 'recognized' | 'paused' | 'unauthorized' | 'processing'>('idle')
    const [lastDetection, setLastDetection] = useState<DetectionResult | null>(null)
    const [commandSent, setCommandSent] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [pauseTimeRemaining, setPauseTimeRemaining] = useState(0)
    const [isManuallyPaused, setIsManuallyPaused] = useState(false) // Estado para pausa manual
    const [unauthorizedMessage, setUnauthorizedMessage] = useState<string>('')
    const [lastUnknownFaceTime, setLastUnknownFaceTime] = useState<number>(0)
    const [isProcessingAccess, setIsProcessingAccess] = useState(false) // Novo estado para loading

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDetectingRef = useRef(false)
    const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastRecognitionRef = useRef<{ name: string; timestamp: number } | null>(null)
    const isSequentialLoadingRef = useRef(false)
    const isManuallyPausedRef = useRef(false) // Ref adicional para controle mais rigoroso

    // Estados para QR Code
    const [qrScanEnabled] = useState(true) // QR Code sempre ativo junto com facial
    const qrScanIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastQrCodeRef = useRef<{ code: string; timestamp: number } | null>(null)

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
            
            if (data.ports && data.ports.length > 0) {
                setAvailablePorts(data.ports)
                console.log(`🔌 ${data.ports.length} portas COM encontradas:`, data.ports.map((p: {path: string}) => p.path))
            } else {
                setAvailablePorts([])
                console.warn('⚠️ Nenhuma porta COM detectada. Conecte o Arduino via USB.')
            }
        } catch (error) {
            console.error('❌ Erro ao carregar portas:', error)
            setAvailablePorts([])
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

    // Carregar pessoas autorizadas (moradores, funcionários e convidados)
    const loadAuthorizedPersons = useCallback(async (): Promise<CachedResident[]> => {
        console.log('🔍 loadAuthorizedPersons chamado com selectedCondominium:', selectedCondominium)
        
        if (!selectedCondominium) {
            console.log('❌ Nenhum condomínio selecionado')
            return []
        }

        console.log('🔍 Verificando cache...')
        const cached = getFromCache('authorizedPersons')
        console.log('🔍 Cache raw:', cached)
        console.log('🔍 Cache length:', cached?.length)
        console.log('🔍 Cache type:', typeof cached)
        
        if (cached && cached.length > 0) {
            console.log(`📋 Usando dados do cache: ${cached.length} pessoas`)
            setResidents(cached)
            return cached
        } else if (cached !== null) {
            console.log('⚠️ Cache encontrado mas vazio ou inválido, removendo cache')
            clearCache('authorizedPersons')
        }

        console.log('🔄 Cache não encontrado ou inválido, buscando dados das APIs...')

        try {
            const authorizedPersons: CachedResident[] = []

            console.log(`🔍 Carregando pessoas autorizadas para: ${selectedCondominium.name} (ID: ${selectedCondominium.id})`)

            // 1. Carregar moradores
            try {
                console.log(`📡 Buscando moradores da API...`)
                const residentsResponse = await fetch(`/api/residents?condominiumId=${selectedCondominium.id}`)
                
                // Verificar erro de autenticação PRIMEIRO
                if (residentsResponse.status === 401) {
                    console.log('⚠️ Sessão expirada - redirecionando para login...')
                    alert('Sessão expirada. Você será redirecionado para o login.')
                    router.push('/login')
                    return []
                }
                
                if (!residentsResponse.ok) {
                    throw new Error(`HTTP ${residentsResponse.status}: ${residentsResponse.statusText}`)
                }
                
                const residentsData = await residentsResponse.json()
                
                console.log(`� Resposta da API residents:`, residentsData)
                
                if (residentsData.success && Array.isArray(residentsData.data)) {
                    console.log(`✅ ${residentsData.data.length} moradores retornados da API`)
                    
                    const residents = residentsData.data
                        .filter((r: ResidentData) => {
                            const hasRecognition = r.user?.faceRecognitionEnabled && r.user?.faceRecognitionFolder
                            if (!hasRecognition) {
                                console.log(`⚠️ Morador ${r.user?.name} não tem reconhecimento facial: enabled=${r.user?.faceRecognitionEnabled}, folder=${r.user?.faceRecognitionFolder}`)
                            }
                            return hasRecognition
                        })
                        .map((r: ResidentData) => ({
                            id: r.id,
                            name: r.user.name,
                            unit: r.unit.number,
                            faceRecognitionFolder: r.user.faceRecognitionFolder,
                            type: 'RESIDENT' as const
                        }))
                    
                    authorizedPersons.push(...residents)
                    console.log(`👥 ${residents.length} moradores com reconhecimento facial carregados`)
                } else {
                    console.log(`❌ Resposta inválida da API de moradores:`, residentsData)
                }
            } catch (residentsError) {
                console.error('❌ Erro ao carregar moradores:', residentsError)
            }

            // 2. Carregar funcionários
            try {
                console.log(`📡 Buscando funcionários da API...`)
                const employeesResponse = await fetch(`/api/employees?condominiumId=${selectedCondominium.id}`)
                
                // Verificar erro de autenticação
                if (employeesResponse.status === 401) {
                    console.log('⚠️ Sessão expirada - redirecionando para login...')
                    alert('Sessão expirada. Você será redirecionado para o login.')
                    router.push('/login')
                    return []
                }
                
                if (!employeesResponse.ok) {
                    throw new Error(`HTTP ${employeesResponse.status}: ${employeesResponse.statusText}`)
                }
                
                const employeesData = await employeesResponse.json()
                
                console.log(`📡 Resposta da API employees:`, employeesData)
                
                if (Array.isArray(employeesData)) {
                    console.log(`✅ ${employeesData.length} funcionários retornados da API`)
                    
                    const employees = employeesData
                        .filter((e: any) => {
                            // Verificar se tem dados de usuário com reconhecimento facial
                            const hasRecognition = e.user?.faceRecognitionEnabled && e.user?.faceRecognitionFolder && (e.isActive !== false)
                            if (!hasRecognition) {
                                console.log(`⚠️ Funcionário ${e.user?.name || e.name} não disponível: enabled=${e.user?.faceRecognitionEnabled}, folder=${e.user?.faceRecognitionFolder}, active=${e.isActive}`)
                            }
                            return hasRecognition
                        })
                        .map((e: any) => ({
                            id: e.id,
                            name: e.user?.name || e.name,
                            unit: e.position || 'Funcionário',
                            faceRecognitionFolder: e.user.faceRecognitionFolder,
                            type: 'EMPLOYEE' as const
                        }))
                    
                    authorizedPersons.push(...employees)
                    console.log(`👷 ${employees.length} funcionários com reconhecimento facial carregados`)
                } else if (employeesData.success && Array.isArray(employeesData.employees)) {
                    console.log(`✅ ${employeesData.employees.length} funcionários retornados da API (formato success)`)
                    
                    const employees = employeesData.employees
                        .filter((e: any) => {
                            const hasRecognition = e.user?.faceRecognitionEnabled && e.user?.faceRecognitionFolder && e.isActive
                            if (!hasRecognition) {
                                console.log(`⚠️ Funcionário ${e.user?.name} não disponível: enabled=${e.user?.faceRecognitionEnabled}, folder=${e.user?.faceRecognitionFolder}, active=${e.isActive}`)
                            }
                            return hasRecognition
                        })
                        .map((e: any) => ({
                            id: e.id,
                            name: e.user.name,
                            unit: e.position || 'Funcionário',
                            faceRecognitionFolder: e.user.faceRecognitionFolder,
                            type: 'EMPLOYEE' as const
                        }))
                    
                    authorizedPersons.push(...employees)
                    console.log(`👷 ${employees.length} funcionários com reconhecimento facial carregados`)
                } else {
                    console.log(`❌ Falha ao carregar funcionários:`, employeesData)
                }
            } catch (employeesError) {
                console.error('❌ Erro ao carregar funcionários:', employeesError)
            }

            // 3. Carregar todos os convidados (incluindo expirados para reconhecimento)
            try {
                console.log(`📡 Buscando convidados da API...`)
                const guestsResponse = await fetch(`/api/guests?condominiumId=${selectedCondominium.id}&activeOnly=false`)
                
                // Verificar erro de autenticação
                if (guestsResponse.status === 401) {
                    console.log('⚠️ Sessão expirada - redirecionando para login...')
                    alert('Sessão expirada. Você será redirecionado para o login.')
                    router.push('/login')
                    return []
                }
                
                if (!guestsResponse.ok) {
                    throw new Error(`HTTP ${guestsResponse.status}: ${guestsResponse.statusText}`)
                }
                
                const guestsData = await guestsResponse.json()
                
                console.log(`📡 Resposta da API guests:`, guestsData)
                
                if (guestsData.success && Array.isArray(guestsData.guests)) {
                    console.log(`✅ ${guestsData.guests.length} convidados retornados da API`)
                    
                    // Carregar TODOS os convidados com reconhecimento facial (incluindo expirados)
                    // A verificação de validade será feita durante o reconhecimento
                    const allGuests = guestsData.guests
                        .filter((g: any) => {
                            console.log(`🔍 Avaliando convidado ${g.name}:`, {
                                faceRecognitionEnabled: g.faceRecognitionEnabled,
                                faceRecognitionFolder: g.faceRecognitionFolder,
                                isActive: g.isActive,
                                validFrom: g.validFrom,
                                validUntil: g.validUntil,
                                currentEntries: g.currentEntries,
                                maxEntries: g.maxEntries
                            })
                            
                            // Verificar se tem reconhecimento facial habilitado
                            if (!g.faceRecognitionEnabled || !g.faceRecognitionFolder) {
                                console.log(`⚠️ Convidado ${g.name} não tem reconhecimento facial: enabled=${g.faceRecognitionEnabled}, folder=${g.faceRecognitionFolder}`)
                                return false
                            }
                            
                            // Verificar se está ativo (manter apenas esta verificação)
                            if (!g.isActive) {
                                console.log(`⚠️ Convidado ${g.name} não está ativo`)
                                return false
                            }
                            
                            // NÃO filtrar por período de validade nem entradas aqui
                            // Isso será verificado durante o reconhecimento para dar mensagens específicas
                            
                            console.log(`✅ Convidado ${g.name} carregado para reconhecimento`)
                            return true
                        })
                        .map((g: any) => ({
                            id: g.id,
                            name: g.name,
                            unit: `Convidado de ${g.invitedByResident?.unit?.block || ''}${g.invitedByResident?.unit?.number || ''}`,
                            faceRecognitionFolder: g.faceRecognitionFolder,
                            type: 'GUEST' as const,
                            guestData: {
                                validFrom: g.validFrom,
                                validUntil: g.validUntil,
                                currentEntries: g.currentEntries,
                                maxEntries: g.maxEntries,
                                invitedBy: g.invitedByResident?.user?.name
                            }
                        }))
                    
                    authorizedPersons.push(...allGuests)
                    console.log(`🎫 ${allGuests.length} convidados carregados (incluindo expirados para reconhecimento)`)
                } else {
                    console.log(`❌ Resposta inválida da API de convidados:`, guestsData)
                }
            } catch (guestsError) {
                console.error('❌ Erro ao carregar convidados:', guestsError)
            }

            console.log(`📊 Resumo do carregamento:`)
            console.log(`   - Moradores: ${authorizedPersons.filter(p => p.type === 'RESIDENT').length}`)
            console.log(`   - Funcionários: ${authorizedPersons.filter(p => p.type === 'EMPLOYEE').length}`)
            console.log(`   - Convidados: ${authorizedPersons.filter(p => p.type === 'GUEST').length}`)

            setResidents(authorizedPersons)
            
            if (authorizedPersons.length > 0) {
                saveToCache('authorizedPersons', authorizedPersons)
                console.log(`💾 Dados salvos no cache`)
            }

            console.log(`✅ Total: ${authorizedPersons.length} pessoas autorizadas carregadas`)
            return authorizedPersons

        } catch (error) {
            console.error('❌ Erro crítico ao carregar pessoas autorizadas:', error)
            setResidents([])
            return []
        }
    }, [selectedCondominium, getFromCache, saveToCache, clearCache, router])

    // Carregar labels para reconhecimento com cache inteligente
    const loadLabels = useCallback(async () => {
        if (!faceApiLoaded || !selectedCondominium) return

        try {
            const faceapi = window.faceapi as any

            console.log('🏷️ Carregando labels para reconhecimento (moradores + funcionários + convidados)...')

            const authorizedPersonsData = await loadAuthorizedPersons()
            const newLabels: unknown[] = []
            const usersWithoutImages: string[] = []

            console.log(`👥 Processando ${authorizedPersonsData.length} pessoas autorizadas:`)
            console.log(`   - ${authorizedPersonsData.filter(p => p.type === 'RESIDENT').length} moradores`)
            console.log(`   - ${authorizedPersonsData.filter(p => p.type === 'EMPLOYEE').length} funcionários`)
            console.log(`   - ${authorizedPersonsData.filter(p => p.type === 'GUEST').length} convidados`)

            for (const person of authorizedPersonsData) {
                try {
                    console.log(`📂 Processando ${person.name} (${person.type}) - ${person.faceRecognitionFolder}`)

                    // Verificar se já temos os descritores em cache
                    const cacheKey = `descriptors_${person.faceRecognitionFolder}`
                    const cachedDescriptors = getFromCache(cacheKey, 24 * 60 * 60 * 1000) // Cache por 24 horas

                    let descriptors: Float32Array[] = []

                    if (cachedDescriptors && cachedDescriptors.length > 0) {
                        // Usar descritores do cache
                        console.log(`📋 Usando descritores em cache para ${person.name} (${cachedDescriptors.length} descritores)`)
                        descriptors = cachedDescriptors.map((desc: number[]) => new Float32Array(desc))
                    } else {
                        // Processar imagens e criar novos descritores
                        console.log(`🔄 Processando imagens para ${person.name}...`)

                        const response = await fetch(`/api/face-recognition/images?folder=${person.faceRecognitionFolder}`)
                        const data = await response.json()

                        if (data.success && data.images?.length > 0) {
                            console.log(`📸 ${data.images.length} imagens encontradas para ${person.name}`)
                            
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
                                            console.log(`✅ Face processada: ${imageData.name}`)
                                        } else {
                                            console.log(`⚠️ Nenhuma face detectada em: ${imageData.name}`)
                                        }

                                        // Limpar objeto URL para evitar vazamentos de memória
                                        URL.revokeObjectURL(img.src)
                                    }
                                } catch (error) {
                                    console.log(`⚠️ Erro ao processar imagem de ${person.name}:`, error)
                                }
                            }

                            // Salvar descritores no cache se conseguiu processar alguma imagem
                            if (descriptors.length > 0) {
                                const descriptorsArray = descriptors.map(desc => Array.from(desc))
                                saveToCache(cacheKey, descriptorsArray)
                                console.log(`💾 Descritores salvos em cache para ${person.name}`)
                            }
                        } else {
                            // Adicionar à lista de usuários sem imagens APENAS SE NÃO FOR CONVIDADO
                            // Convidados podem usar QR Code como alternativa, não é erro
                            if (person.type !== 'GUEST') {
                                usersWithoutImages.push(`${person.name} (${person.type === 'RESIDENT' ? 'Morador' : 'Funcionário'})`)
                                console.log(`⚠️ Nenhuma imagem válida encontrada para ${person.name}`)
                            } else {
                                console.log(`ℹ️ Convidado ${person.name} sem imagens - pode usar QR Code como alternativa`)
                            }
                        }
                    }

                    // Criar label se temos descritores
                    if (descriptors.length > 0) {
                        const labeledDescriptor = new (faceapi as any).LabeledFaceDescriptors(
                            `${person.name}|${person.type}|${person.unit}|${person.id}`,
                            descriptors
                        )
                        newLabels.push(labeledDescriptor)
                        console.log(`✅ Label criado para ${person.name} (${person.type}) com ${descriptors.length} descritores`)
                    } else {
                        console.log(`⚠️ Nenhum descritor válido encontrado para ${person.name}`)
                    }

                } catch (error) {
                    console.log(`❌ Erro ao processar ${person.name}:`, error)
                }
            }

            setLabels(newLabels)
            console.log(`🏷️ ${newLabels.length} labels carregados para reconhecimento:`)
            console.log(`   - ${newLabels.filter((label: any) => label.label.includes('|RESIDENT|')).length} moradores`)
            console.log(`   - ${newLabels.filter((label: any) => label.label.includes('|EMPLOYEE|')).length} funcionários`)
            console.log(`   - ${newLabels.filter((label: any) => label.label.includes('|GUEST|')).length} convidados`)

            // Exibir erro específico se houver usuários sem imagens
            if (usersWithoutImages.length > 0) {
                const errorMessage = `❌ ERRO: ${usersWithoutImages.length} usuário(s) sem imagens para reconhecimento facial:\n${usersWithoutImages.map(user => `   • ${user}`).join('\n')}\n\n📋 Para resolver:\n   1. Acesse a página de Reconhecimento Facial\n   2. Faça upload de pelo menos 3 fotos do rosto\n   3. Ou adicione fotos manualmente na pasta correspondente`
                
                console.error(errorMessage)
                
                // Também mostrar um alerta visual se não há nenhum label carregado
                if (newLabels.length === 0) {
                    alert(`SISTEMA DE RECONHECIMENTO FACIAL INATIVO\n\n${errorMessage}`)
                }
            }

        } catch (error) {
            console.error('❌ Erro ao carregar labels:', error)
        }
    }, [faceApiLoaded, selectedCondominium, loadAuthorizedPersons, getFromCache, saveToCache])

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
            console.log(`💾 Salvando log de acesso para: ${detection.name} (${detection.type})`)
            
            // VERIFICAÇÃO CRÍTICA DE SEGURANÇA: NUNCA salvar log para pessoa não identificada
            if (!detection.name || 
                detection.name === 'Pessoa não identificada' || 
                detection.name === 'Usuário Desconhecido' ||
                detection.name.includes('Desconhecido') || 
                detection.name.includes('unknown') ||
                detection.name.includes('não identificada') ||
                detection.name.trim() === '' ||
                detection.confidence <= 0.1) {
                console.warn('� BLOQUEADO: Tentativa de salvar log para pessoa não identificada - log não será criado')
                console.warn('� Detection data:', detection)
                return false // Retorna false sem criar log
            }
            
            // SEGUNDA VERIFICAÇÃO: Se não tem status definido
            if (!detection.status) {
                if (detection.confidence < 0.5 || !detection.name || detection.name === 'unknown') {
                    console.warn('⚠️ Status não definido para pessoa não reconhecida - definindo como DENIED')
                    detection.status = 'DENIED'
                    detection.reason = 'Reconhecimento insuficiente'
                } else {
                    console.log('✅ Status não definido para pessoa reconhecida válida - definindo como APPROVED')
                    detection.status = 'APPROVED'
                }
            }

            // Buscar dados completos da pessoa reconhecida
            const recognizedPerson = residents.find(r => r.name === detection.name)
            
            // Preparar payload com userId ou guestId para vincular corretamente
            const logPayload: any = {
                condominiumId: selectedCondominium.id,
                personName: detection.name.replace(' (NÃO AUTORIZADO)', ''), // Remove o sufixo se existir
                accessType: detection.type,
                unitNumber: detection.unit,
                building: 'A', // Você pode ajustar conforme necessário
                status: detection.status || 'DENIED', // MUDANÇA CRÍTICA: Se status não definido, é NEGADO por segurança
                method: 'FACIAL_RECOGNITION',
                confidence: detection.confidence,
                timestamp: new Date().toISOString(),
                guestData: recognizedPerson?.guestData || null,
                deniedReason: detection.reason || null
            }

            // Adicionar userId ou guestId se pessoa foi identificada
            if (recognizedPerson) {
                if (detection.type === 'GUEST' && recognizedPerson.guestData?.id) {
                    logPayload.guestId = recognizedPerson.guestData.id
                    console.log(`🎫 Vinculando log ao convidado ID: ${recognizedPerson.guestData.id}`)
                } else if ((detection.type === 'RESIDENT' || detection.type === 'EMPLOYEE') && recognizedPerson.id) {
                    logPayload.userId = recognizedPerson.id
                    console.log(`👤 Vinculando log ao usuário ID: ${recognizedPerson.id}`)
                }
            }
            
            const response = await fetch('/api/access-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(logPayload),
            })

            const data = await response.json()

            if (data.success) {
                console.log(`✅ Log de acesso salvo com sucesso:`, data.log)
                
                // Se for convidado AUTORIZADO, atualizar contador de entradas
                if (detection.type === 'GUEST' && recognizedPerson?.guestData && detection.status === 'APPROVED') {
                    console.log(`🎫 Atualizando contador de entradas para convidado autorizado ${detection.name}`)
                    try {
                        const entryResponse = await fetch(`/api/guests/${recognizedPerson.id}/entry`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'increment' })
                        })
                        
                        if (entryResponse.ok) {
                            const entryData = await entryResponse.json()
                            console.log(`✅ Contador de entradas atualizado para ${detection.name}:`, entryData.guest)
                        } else {
                            const errorData = await entryResponse.json()
                            console.error(`❌ Erro ao atualizar contador de entradas (${entryResponse.status}):`, errorData.message)
                        }
                    } catch (entryError) {
                        console.error(`❌ Erro ao atualizar contador de entradas:`, entryError)
                    }
                } else if (detection.type === 'GUEST' && detection.status === 'DENIED') {
                    console.log(`🚫 Convidado ${detection.name} foi negado (${detection.reason}) - não incrementando contador`)
                }
                
                return true
            } else {
                console.log(`❌ Erro ao salvar log de acesso: ${data.error}`)
                return false
            }
        } catch (error) {
            console.error('❌ Erro ao salvar log de acesso:', error)
            return false
        }
    }, [selectedCondominium, residents])

    // ==================== FUNÇÃO UNIFICADA DE VALIDAÇÃO ====================
    
    // Função unificada que processa tanto reconhecimento facial quanto QR Code
    const validateAndProcessAccess = useCallback(async (params: {
        personId: string
        personName?: string
        confidence: number
        method: 'FACIAL_RECOGNITION' | 'QR_CODE'
    }) => {
        const { personId, personName, confidence, method } = params
        
        if (!selectedCondominium) {
            console.log(`❌ [${method}] Nenhum condomínio selecionado`)
            return
        }

        console.log(`🔍 [${method}] ==================== VALIDAÇÃO DE ACESSO ====================`)
        console.log(`🔍 [${method}] Person ID: ${personId}, Name: ${personName || 'N/A'}, Confidence: ${confidence}`)

        // ⏸️ PAUSAR IMEDIATAMENTE PARA EVITAR CONFLITOS
        console.log(`⏸️ [${method}] PAUSANDO detecção para processar acesso...`)
        setIsPaused(true)
        setIsProcessingAccess(true)
        setDetectionStatus('processing')
        isDetectingRef.current = false

        try {
            // BUSCAR PESSOA DIRETAMENTE NAS APIS POR ID (não no cache)
            let displayName = personName || 'Desconhecido'
            let personType: 'RESIDENT' | 'EMPLOYEE' | 'GUEST' = 'RESIDENT'
            let personUnit = ''
            let isAuthorized = false
            let unauthorizedReason = ''
            let personFound = false
            
            console.log(`🔄 [${method}] Buscando pessoa por ID nas APIs do banco de dados...`)
            
            // 1. TENTAR BUSCAR COMO MORADOR
            console.log(`👤 [${method}] Verificando se é MORADOR...`)
            try {
                const response = await fetch(`/api/residents?condominiumId=${selectedCondominium.id}`)
                
                // Verificar erro de autenticação
                if (response.status === 401) {
                    throw new Error('Não autorizado: Faça login novamente')
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }
                
                const data = await response.json()

                if (data.success && Array.isArray(data.data)) {
                    const currentResident = data.data.find((r: any) => r.id === personId)

                    if (currentResident) {
                        personFound = true
                        personType = 'RESIDENT'
                        displayName = currentResident.user?.name || displayName
                        personUnit = currentResident.unit?.number || ''
                        
                        console.log(`✅ [${method}] MORADOR encontrado: ${displayName} - Unidade ${personUnit}`)

                        if (!currentResident.isActive) {
                            isAuthorized = false
                            unauthorizedReason = 'Não autorizado: Morador inativo, fale na portaria.'
                        } else if (method === 'FACIAL_RECOGNITION' && currentResident.user && currentResident.user.faceRecognitionEnabled === false) {
                            // Só verificar reconhecimento facial se o método for FACIAL_RECOGNITION
                            isAuthorized = false
                            unauthorizedReason = 'Não autorizado: Reconhecimento facial desabilitado, fale na portaria.'
                        } else {
                            isAuthorized = true
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ [${method}] Erro ao buscar morador:`, error)
            }
            
            // 2. SE NÃO ENCONTROU, TENTAR BUSCAR COMO FUNCIONÁRIO
            if (!personFound) {
                console.log(`👷 [${method}] Verificando se é FUNCIONÁRIO...`)
                try {
                    const response = await fetch(`/api/employees?condominiumId=${selectedCondominium.id}`)
                    
                    // Verificar erro de autenticação
                    if (response.status === 401) {
                        throw new Error('Não autorizado: Faça login novamente')
                    }
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                    }
                    
                    const data = await response.json()

                    const employees = Array.isArray(data) ? data : data.employees || []
                    const currentEmployee = employees.find((e: any) => e.id === personId)

                    if (currentEmployee) {
                        personFound = true
                        personType = 'EMPLOYEE'
                        displayName = currentEmployee.user?.name || currentEmployee.name || displayName
                        personUnit = currentEmployee.position || 'Funcionário'
                        
                        console.log(`✅ [${method}] FUNCIONÁRIO encontrado: ${displayName} - ${personUnit}`)

                        if (!currentEmployee.isActive) {
                            isAuthorized = false
                            unauthorizedReason = 'Não autorizado: Funcionário inativo, fale na portaria.'
                        } else if (method === 'FACIAL_RECOGNITION' && currentEmployee.user && currentEmployee.user.faceRecognitionEnabled === false) {
                            // Só verificar reconhecimento facial se o método for FACIAL_RECOGNITION
                            isAuthorized = false
                            unauthorizedReason = 'Não autorizado: Reconhecimento facial desabilitado, fale na portaria.'
                        } else {
                            isAuthorized = true
                        }
                    }
                } catch (error) {
                    console.error(`❌ [${method}] Erro ao buscar funcionário:`, error)
                }
            }
            
            // 3. SE NÃO ENCONTROU, TENTAR BUSCAR COMO CONVIDADO
            if (!personFound) {
                console.log(`🎫 [${method}] Verificando se é CONVIDADO...`)
                try {
                    const response = await fetch(`/api/guests/${personId}`)
                    
                    // IMPORTANTE: Verificar se a resposta foi bem-sucedida antes de processar
                    if (!response.ok) {
                        console.log(`⚠️ [${method}] Convidado não encontrado (HTTP ${response.status})`)
                        // Não definir personFound = true, continuar para "não encontrado"
                    } else {
                        const data = await response.json()
                        const currentGuest = data.guest

                        if (currentGuest && currentGuest.id === personId) {
                            personFound = true
                            personType = 'GUEST'
                            displayName = currentGuest.name || displayName
                            personUnit = `Convidado de ${currentGuest.invitedByResident?.unit?.block || ''}${currentGuest.invitedByResident?.unit?.number || ''}`
                            
                            console.log(`✅ [${method}] CONVIDADO encontrado: ${displayName} - ${personUnit}`)
                            console.log(`📊 [${method}] Status do convite:`, {
                                isActive: currentGuest.isActive,
                                isAuthorized: currentGuest.isAuthorized,
                                isExpired: currentGuest.isExpired,
                                hasEntriesAvailable: currentGuest.hasEntriesAvailable,
                                isValidDate: currentGuest.isValidDate,
                                currentEntries: currentGuest.currentEntries,
                                maxEntries: currentGuest.maxEntries,
                                validFrom: currentGuest.validFrom,
                                validUntil: currentGuest.validUntil
                            })

                            // Usar a validação da API que já verifica tudo
                            if (currentGuest.isAuthorized) {
                                isAuthorized = true
                                console.log(`✅ [${method}] Convite AUTORIZADO`)
                            } else {
                                isAuthorized = false
                                unauthorizedReason = currentGuest.denialReason || 'Não autorizado: Convite inativo/expirado/esgotado, fale com o morador ou na portaria.'
                                console.log(`❌ [${method}] Convite NEGADO: ${unauthorizedReason}`)
                            }
                        }
                    }
                } catch (error) {
                    console.error(`❌ [${method}] Erro ao buscar convidado:`, error)
                    // Em caso de erro, NÃO definir personFound = true
                }
            }
            
            // 4. SE NÃO ENCONTROU EM NENHUMA API
            if (!personFound) {
                console.log(`❌ [${method}] Pessoa não encontrada em nenhuma API (ID: ${personId})`)
                
                // Finalizar processamento
                setIsProcessingAccess(false)
                
                // NÃO definir lastDetection com nome - apenas usar a mensagem de erro
                setLastDetection(null)
                setDetectionStatus('unauthorized')
                setUnauthorizedMessage(`Não autorizado: ${method === 'QR_CODE' ? 'QR Code' : 'Pessoa'} não registrado no sistema.`)
                setIsPaused(true)
                
                // Countdown 3 segundos
                let timeLeft = 5
                setPauseTimeRemaining(timeLeft)
                const countdown = setInterval(() => {
                    timeLeft--
                    setPauseTimeRemaining(timeLeft)
                    if (timeLeft <= 0) {
                        clearInterval(countdown)
                        setIsPaused(false)
                        setDetectionStatus('idle')
                        setLastDetection(null)
                        setUnauthorizedMessage('')
                        setPauseTimeRemaining(0)
                        // Limpar último QR Code para permitir nova leitura
                        if (method === 'QR_CODE') {
                            lastQrCodeRef.current = null
                        }
                    }
                }, 1000)
                pauseTimeoutRef.current = countdown as any
                return
            }

            // PROCESSAR RESULTADO
            if (!isAuthorized) {
                // ACESSO NEGADO
                console.log(`❌ [${method}] ACESSO NEGADO: ${displayName}`)
                
                // Finalizar processamento
                setIsProcessingAccess(false)
                
                setLastDetection({
                    name: displayName,
                    confidence,
                    type: personType,
                    unit: personUnit,
                    id: personId,
                    isUnauthorized: true,
                    status: 'DENIED',
                    reason: unauthorizedReason
                })
                setDetectionStatus('unauthorized')
                setUnauthorizedMessage(unauthorizedReason)
                
                setIsPaused(true)
                isDetectingRef.current = false

                await saveAccessLog({
                    name: displayName,
                    confidence,
                    type: personType,
                    unit: personUnit,
                    id: personId,
                    status: 'DENIED',
                    reason: unauthorizedReason
                })

                // Enviar comando FACE_REJECTED para Arduino (2 bips curtos + 1 longo)
                console.log(`🔌 [${method}] Enviando comando FACE_REJECTED para: ${displayName}`)
                await sendArduinoCommand('FACE_REJECTED')

                // Countdown 3 segundos (tempo mínimo entre tentativas)
                let timeLeft = 3
                setPauseTimeRemaining(timeLeft)

                const countdown = setInterval(() => {
                    timeLeft--
                    setPauseTimeRemaining(timeLeft)

                    if (timeLeft <= 0) {
                        clearInterval(countdown)
                        setIsPaused(false)
                        setDetectionStatus('idle')
                        setLastDetection(null)
                        setUnauthorizedMessage('')
                        setPauseTimeRemaining(0)
                        isDetectingRef.current = false
                        // Limpar último QR Code para permitir nova leitura
                        if (method === 'QR_CODE') {
                            lastQrCodeRef.current = null
                        }
                    }
                }, 1000)

                pauseTimeoutRef.current = countdown as any
                
            } else {
                // ACESSO APROVADO
                console.log(`✅ [${method}] ACESSO APROVADO: ${displayName}`)
                
                // Finalizar processamento
                setIsProcessingAccess(false)
                
                const detection: DetectionResult = {
                    name: displayName,
                    confidence,
                    type: personType,
                    unit: personUnit,
                    id: personId,
                    status: 'APPROVED'
                }

                setLastDetection(detection)
                setDetectionStatus('recognized')

                setIsPaused(true)
                isDetectingRef.current = false

                await saveAccessLog(detection)

                // Enviar comando FACE_RECOGNIZED
                console.log(`🔌 [${method}] Enviando comando FACE_RECOGNIZED para: ${displayName}`)
                await sendArduinoCommand('FACE_RECOGNIZED')

                // Countdown 20 segundos
                let timeLeft = 20
                setPauseTimeRemaining(timeLeft)

                const countdown = setInterval(() => {
                    timeLeft--
                    setPauseTimeRemaining(timeLeft)

                    if (timeLeft <= 0) {
                        clearInterval(countdown)
                        setIsPaused(false)
                        setDetectionStatus('idle')
                        setLastDetection(null)
                        setPauseTimeRemaining(0)
                        setCommandSent(false)
                        isDetectingRef.current = false
                        // Limpar último QR Code para permitir nova leitura
                        if (method === 'QR_CODE') {
                            lastQrCodeRef.current = null
                        }
                    }
                }, 1000)

                pauseTimeoutRef.current = countdown as any
            }
            
        } catch (error) {
            console.error(`❌ [${method}] Erro ao validar acesso:`, error)
            
            // Limpar estado de processamento em caso de erro
            setIsProcessingAccess(false)
            setDetectionStatus('unauthorized')
            setUnauthorizedMessage(`Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
            
            // Pausa de 3 segundos antes de voltar
            let timeLeft = 5
            setPauseTimeRemaining(timeLeft)
            const countdown = setInterval(() => {
                timeLeft--
                setPauseTimeRemaining(timeLeft)
                if (timeLeft <= 0) {
                    clearInterval(countdown)
                    setIsPaused(false)
                    setDetectionStatus('idle')
                    setUnauthorizedMessage('')
                    setPauseTimeRemaining(0)
                }
            }, 1000)
            pauseTimeoutRef.current = countdown as any
        }
    }, [selectedCondominium, saveAccessLog, sendArduinoCommand])

    // ==================== FUNÇÕES AUXILIARES DE QR CODE ====================
    
    // Escanear QR Code do vídeo
    const scanQRCode = useCallback(() => {
        if (!videoRef.current || !cameraStarted || isPaused || isManuallyPaused) {
            return null
        }

        try {
            const video = videoRef.current
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d', { willReadFrequently: true })

            if (!context) return null

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            context.drawImage(video, 0, 0, canvas.width, canvas.height)

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            })

            if (code && code.data) {
                console.log('📷 [QR] QR Code detectado:', code.data)
                return code.data
            }

            return null
        } catch (error) {
            console.error('❌ [QR] Erro ao escanear QR Code:', error)
            return null
        }
    }, [cameraStarted, isPaused, isManuallyPaused])

    // Validar e processar QR Code (usa função unificada)
    const validateAndProcessQRCode = useCallback(async (qrData: string) => {
        try {
            // PROTEÇÃO ANTI-LOOP: Ignorar se for o mesmo QR Code nos últimos 5 segundos
            const now = Date.now()
            if (lastQrCodeRef.current && 
                lastQrCodeRef.current.code === qrData && 
                now - lastQrCodeRef.current.timestamp < 5000) {
                console.log('⏭️ [QR] QR Code já processado recentemente, ignorando')
                return
            }

            // Registrar este QR Code como processado
            lastQrCodeRef.current = { code: qrData, timestamp: now }
            
            // Extrair ID do QR code (formato esperado: id ou JSON com {id: "..."})
            let personId: string | null = null

            try {
                const parsed = JSON.parse(qrData)
                personId = parsed.id
                console.log('✅ [QR] QR Code formato JSON - ID extraído:', personId)
            } catch {
                personId = qrData.trim()
                console.log('✅ [QR] QR Code formato simples - ID:', personId)
            }

            if (!personId) {
                console.log('❌ [QR] QR Code inválido: ID não encontrado')
                return
            }

            // Chamar função unificada
            await validateAndProcessAccess({
                personId,
                personName: undefined, // Nome será buscado do cache na função unificada
                confidence: 1.0, // QR Code sempre tem confiança 100%
                method: 'QR_CODE'
            })
        } catch (error) {
            console.error('❌ [QR] Erro ao processar QR Code:', error)
        }
    }, [validateAndProcessAccess])

    // ==================== FIM DAS FUNÇÕES DE QR CODE ====================

    // Detecção facial
    const detectFaces = useCallback(async () => {
        // Verificação DUPLA de pausa: state e ref para máxima segurança
        if (isPaused || isManuallyPaused || isManuallyPausedRef.current) {
            console.log('⏸️ Detecção pausada', { 
                isPaused, 
                isManuallyPaused, 
                isManuallyPausedRef: isManuallyPausedRef.current 
            })
            return
        }

        // VERIFICAÇÃO CRÍTICA: Limpar qualquer estado residual de pessoa não identificada
        // antes de iniciar nova detecção para evitar salvar logs indesejados
        if (lastDetection && (
            !lastDetection.name || 
            lastDetection.name === 'Pessoa não identificada' ||
            lastDetection.name === 'Usuário Desconhecido' ||
            lastDetection.name.includes('Desconhecido') ||
            lastDetection.name.includes('não identificada')
        )) {
            console.log('🧹 Limpando estado residual de pessoa não identificada antes de nova detecção')
            setLastDetection(null)
            lastRecognitionRef.current = null
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
                        const [name, type, unit, id] = match.label.split('|')
                        // console.log(`✅ Match válido: ${name} (confiança: ${(confidence * 100).toFixed(1)}%)`)
                        // console.log(`🔍 Detalhes do split: name="${name}", type="${type}", unit="${unit}", id="${id}"`)
                        // console.log(`🔍 Verificação name !== 'unknown': ${name !== 'unknown'}`)
                        if (name !== 'unknown') {
                            bestMatch = { name, type: type as 'RESIDENT' | 'EMPLOYEE' | 'GUEST', unit, confidence, id }
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

                    console.log(`✅ Rosto reconhecido: ${bestMatch.type === 'RESIDENT' ? 'Morador' : bestMatch.type === 'EMPLOYEE' ? 'Funcionário' : 'Convidado'} - ${bestMatch.name} (${(bestMatch.confidence * 100).toFixed(1)}%)`)
                    console.log(`🔄 Verificando autorização em TEMPO REAL no banco de dados...`)

                    // VERIFICAÇÃO EM TEMPO REAL NO BANCO DE DADOS - Aplicada para TODOS os tipos
                    // Isso garante que dados atualizados (reativações, desativações, etc) sejam considerados
                    
                    if (bestMatch.type === 'RESIDENT' && selectedCondominium) {
                        // Verificar status atual do MORADOR no banco
                        console.log(`🔄 Verificando status do morador ${bestMatch.name} (ID: ${bestMatch.id})...`)
                        
                        try {
                            const residentResponse = await fetch(`/api/residents?condominiumId=${selectedCondominium.id}`)
                            if (residentResponse.ok) {
                                const residentsData = await residentResponse.json()
                                
                                if (residentsData.success && Array.isArray(residentsData.data)) {
                                    const currentResident = residentsData.data.find((r: ResidentData) => r.id === bestMatch.id)
                                    
                                    if (currentResident) {
                                        // Verificar se reconhecimento facial ainda está habilitado
                                        if (!currentResident.user?.faceRecognitionEnabled) {
                                            console.log(`❌ Morador ${bestMatch.name} teve reconhecimento facial DESABILITADO`)
                                            
                                            setLastDetection({ 
                                                ...bestMatch, 
                                                name: `${bestMatch.name} (NÃO AUTORIZADO)`,
                                                isUnauthorized: true,
                                                reason: 'Reconhecimento facial desabilitado'
                                            })
                                            setDetectionStatus('unauthorized')
                                            setUnauthorizedMessage('Não autorizado: Reconhecimento facial desabilitado, fale na portaria.')
                                            setIsPaused(true)
                                            isDetectingRef.current = false
                                            if (detectionTimeoutRef.current) {
                                                clearTimeout(detectionTimeoutRef.current)
                                                detectionTimeoutRef.current = null
                                            }
                                            
                                            await saveAccessLog({
                                                ...bestMatch,
                                                status: 'DENIED',
                                                reason: 'Reconhecimento facial desabilitado'
                                            })
                                            
                                            return // Parar aqui, não prosseguir com acesso
                                        }
                                        
                                        console.log(`✅ Morador ${bestMatch.name} verificado e AUTORIZADO em tempo real`)
                                    } else {
                                        console.warn(`⚠️ Morador ${bestMatch.name} não encontrado no banco - pode ter sido removido`)
                                        // Continuar com dados do cache por segurança
                                    }
                                } else {
                                    console.warn(`⚠️ Erro ao buscar dados atualizados do morador`)
                                }
                            }
                        } catch (error) {
                            console.error(`❌ Erro ao verificar status do morador:`, error)
                            // Em caso de erro, continuar com dados do cache
                        }
                    } else if (bestMatch.type === 'EMPLOYEE' && selectedCondominium) {
                        // Verificar status atual do FUNCIONÁRIO no banco
                        console.log(`🔄 Verificando status do funcionário ${bestMatch.name} (ID: ${bestMatch.id})...`)
                        
                        try {
                            const employeesResponse = await fetch(`/api/employees?condominiumId=${selectedCondominium.id}`)
                            if (employeesResponse.ok) {
                                const employeesData = await employeesResponse.json()
                                const employees = Array.isArray(employeesData) ? employeesData : (employeesData.employees || [])
                                
                                const currentEmployee = employees.find((e: any) => e.id === bestMatch.id)
                                
                                if (currentEmployee) {
                                    // Verificar se funcionário ainda está ativo e com reconhecimento habilitado
                                    if (!currentEmployee.isActive || (currentEmployee.isActive === false)) {
                                        console.log(`❌ Funcionário ${bestMatch.name} está INATIVO`)
                                        
                                        setLastDetection({ 
                                            ...bestMatch, 
                                            name: `${bestMatch.name} (NÃO AUTORIZADO)`,
                                            isUnauthorized: true,
                                            reason: 'Funcionário inativo'
                                        })
                                        setDetectionStatus('unauthorized')
                                        setUnauthorizedMessage('Não autorizado: Funcionário inativo, fale na portaria.')
                                        setIsPaused(true)
                                        isDetectingRef.current = false
                                        if (detectionTimeoutRef.current) {
                                            clearTimeout(detectionTimeoutRef.current)
                                            detectionTimeoutRef.current = null
                                        }
                                        
                                        await saveAccessLog({
                                            ...bestMatch,
                                            status: 'DENIED',
                                            reason: 'Funcionário inativo'
                                        })
                                        
                                        return // Parar aqui
                                    }
                                    
                                    if (!currentEmployee.user?.faceRecognitionEnabled) {
                                        console.log(`❌ Funcionário ${bestMatch.name} teve reconhecimento facial DESABILITADO`)
                                        
                                        setLastDetection({ 
                                            ...bestMatch, 
                                            name: `${bestMatch.name} (NÃO AUTORIZADO)`,
                                            isUnauthorized: true,
                                            reason: 'Reconhecimento facial desabilitado'
                                        })
                                        setDetectionStatus('unauthorized')
                                        setUnauthorizedMessage('Não autorizado: Reconhecimento facial desabilitado, fale na portaria.')
                                        setIsPaused(true)
                                        isDetectingRef.current = false
                                        if (detectionTimeoutRef.current) {
                                            clearTimeout(detectionTimeoutRef.current)
                                            detectionTimeoutRef.current = null
                                        }
                                        
                                        await saveAccessLog({
                                            ...bestMatch,
                                            status: 'DENIED',
                                            reason: 'Reconhecimento facial desabilitado'
                                        })
                                        
                                        return // Parar aqui
                                    }
                                    
                                    console.log(`✅ Funcionário ${bestMatch.name} verificado e AUTORIZADO em tempo real`)
                                } else {
                                    console.warn(`⚠️ Funcionário ${bestMatch.name} não encontrado no banco - pode ter sido removido`)
                                }
                            }
                        } catch (error) {
                            console.error(`❌ Erro ao verificar status do funcionário:`, error)
                            // Em caso de erro, continuar com dados do cache
                        }
                    } else if (bestMatch.type === 'GUEST') {
                        // VERIFICAÇÃO EXISTENTE PARA CONVIDADOS - já implementada
                        console.log(`🔄 Verificando status atual do convidado ${bestMatch.name} no banco de dados...`)
                        
                        try {
                            const guestResponse = await fetch(`/api/guests/${bestMatch.id}`)
                            if (guestResponse.ok) {
                                const guestData = await guestResponse.json()
                                console.log(`📡 Dados atualizados do convidado ${bestMatch.name}:`, guestData)
                                
                                if (guestData.success && guestData.guest) {
                                    const currentGuest = guestData.guest
                                    const currentTime = new Date()
                                    const validFrom = new Date(currentGuest.validFrom)
                                    const validUntil = currentGuest.validUntil ? new Date(currentGuest.validUntil) : null
                                    
                                    // Verificar se ainda está no período válido
                                    const isInValidPeriod = currentTime >= validFrom && (validUntil ? currentTime <= validUntil : true)
                                    
                                    // Verificar se ainda tem entradas disponíveis
                                    const hasEntriesAvailable = currentGuest.currentEntries < currentGuest.maxEntries
                                    
                                    console.log(`🔍 Verificações em tempo real para ${bestMatch.name}:`)
                                    console.log(`   - Período válido: ${isInValidPeriod ? '✅' : '❌'} (${validFrom.toLocaleDateString()} - ${validUntil ? validUntil.toLocaleDateString() : 'sem expiração'})`)
                                    console.log(`   - Entradas disponíveis: ${hasEntriesAvailable ? '✅' : '❌'} (${currentGuest.currentEntries}/${currentGuest.maxEntries})`)
                                    console.log(`   - Status ativo: ${currentGuest.isActive ? '✅' : '❌'}`)
                                    
                                    if (!currentGuest.isActive || !isInValidPeriod || !hasEntriesAvailable) {
                                        console.log(`❌ Convidado ${bestMatch.name} reconhecido mas NÃO AUTORIZADO`)
                                        
                                        // Definir mensagem específica baseada no motivo da negação
                                        let deniedReason = ''
                                        let unauthorizedMsg = ''
                                        
                                        if (!currentGuest.isActive) {
                                            deniedReason = 'Convite inativo'
                                            unauthorizedMsg = 'Não autorizado: Convite inativo, fale com o morador ou na portaria.'
                                        } else if (!isInValidPeriod) {
                                            deniedReason = 'Período expirado'
                                            unauthorizedMsg = 'Não autorizado: Convite expirado, fale com o morador ou na portaria.'
                                        } else if (!hasEntriesAvailable) {
                                            deniedReason = 'Limite de entradas esgotado'
                                            unauthorizedMsg = 'Não autorizado: Limite de entradas esgotado, fale com o morador ou na portaria.'
                                        }
                                        
                                        // Mostrar status de não autorizado
                                        console.log(`🚨 Definindo status unauthorized para convidado: ${bestMatch.name}`)
                                        console.log(`🚨 Mensagem: ${unauthorizedMsg}`)
                                        
                                        setLastDetection({ 
                                            ...bestMatch, 
                                            name: `${bestMatch.name} (NÃO AUTORIZADO)`,
                                            isUnauthorized: true,
                                            reason: deniedReason
                                        })
                                        setDetectionStatus('unauthorized')
                                        setUnauthorizedMessage(unauthorizedMsg)
                                        
                                        console.log(`🚨 Estado atualizado - detectionStatus: unauthorized, unauthorizedMessage: ${unauthorizedMsg}`)
                                        
                                        // Pausar detecção por 3 segundos (mesmo comportamento do autorizado)
                                        setIsPaused(true)
                                        
                                        // Parar o loop de detecção imediatamente
                                        isDetectingRef.current = false
                                        if (detectionTimeoutRef.current) {
                                            clearTimeout(detectionTimeoutRef.current)
                                            detectionTimeoutRef.current = null
                                        }
                                        
                                        // Salvar log como negado
                                        await saveAccessLog({
                                            ...bestMatch,
                                            status: 'DENIED',
                                            reason: deniedReason
                                        })
                                        
                                        // Countdown para mostrar tempo restante
                                        let timeLeft = 5
                                        setPauseTimeRemaining(timeLeft)

                                        const countdown = setInterval(() => {
                                            // Verificar se foi pausado manualmente - se sim, para o countdown
                                            if (isManuallyPaused || isManuallyPausedRef.current) {
                                                clearInterval(countdown)
                                                console.log('🛑 Countdown cancelado - sistema pausado manualmente')
                                                return
                                            }
                                            
                                            timeLeft--
                                            setPauseTimeRemaining(timeLeft)

                                            if (timeLeft <= 0) {
                                                clearInterval(countdown)
                                                // Só redefinir estados se não foi pausado manualmente
                                                if (!isManuallyPaused && !isManuallyPausedRef.current) {
                                                    setIsPaused(false)
                                                    setDetectionStatus('idle')
                                                    setPauseTimeRemaining(0)
                                                    setUnauthorizedMessage('')
                                                    setLastDetection(null)
                                                    console.log('✅ Detecção reativada após acesso negado')

                                                    // Reiniciar o loop de detecção após a pausa
                                                    setTimeout(() => {
                                                        if (!isDetectingRef.current && !isPaused && !isManuallyPaused && !isManuallyPausedRef.current) {
                                                            isDetectingRef.current = true
                                                            const detect = async () => {
                                                                if (!isDetectingRef.current || isPaused || isManuallyPaused || isManuallyPausedRef.current) return
                                                                await detectFaces()
                                                                if (isDetectingRef.current && !isPaused && !isManuallyPaused && !isManuallyPausedRef.current) {
                                                                    detectionTimeoutRef.current = setTimeout(detect, 1500)
                                                                }
                                                            }
                                                            detect()
                                                        }
                                                    }, 300)
                                                }
                                            }
                                        }, 1000)
                                        
                                        // Limpar cache para forçar recarga na próxima inicialização
                                        console.log('🧹 Limpando cache após acesso negado para garantir dados atualizados')
                                        clearCache('authorizedPersons')
                                        
                                        return // Sair da função se não autorizado
                                    }
                                    
                                    // Se chegou aqui, o convidado está autorizado
                                    console.log(`✅ Convidado ${bestMatch.name} AUTORIZADO com dados atualizados`)
                                }
                            } else {
                                console.log(`⚠️ Erro ao buscar dados atualizados do convidado ${bestMatch.name}, usando dados do cache`)
                            }
                        } catch (apiError) {
                            console.error(`❌ Erro na API ao verificar convidado ${bestMatch.name}:`, apiError)
                            console.log(`⚠️ Continuando com dados do cache para ${bestMatch.name}`)
                        }
                        
                        // FALLBACK: Se a verificação em tempo real falhou, usar dados do cache (comportamento antigo)
                        const recognizedGuest = residents.find(r => r.name === bestMatch.name)
                        if (recognizedGuest?.guestData) {
                            const currentTime = new Date()
                            const validFrom = new Date(recognizedGuest.guestData.validFrom)
                            const validUntil = recognizedGuest.guestData.validUntil ? new Date(recognizedGuest.guestData.validUntil) : null
                            
                            // Verificar se ainda está no período válido
                            const isInValidPeriod = currentTime >= validFrom && (validUntil ? currentTime <= validUntil : true)
                            
                            // Verificar se ainda tem entradas disponíveis
                            const hasEntriesAvailable = recognizedGuest.guestData.currentEntries < recognizedGuest.guestData.maxEntries
                            
                            if (!isInValidPeriod || !hasEntriesAvailable) {
                                console.log(`❌ Convidado ${bestMatch.name} reconhecido mas NÃO AUTORIZADO:`)
                                console.log(`   - Período válido: ${isInValidPeriod ? '✅' : '❌'} (${validFrom.toLocaleDateString()} - ${validUntil ? validUntil.toLocaleDateString() : 'sem expiração'})`)
                                console.log(`   - Entradas disponíveis: ${hasEntriesAvailable ? '✅' : '❌'} (${recognizedGuest.guestData.currentEntries}/${recognizedGuest.guestData.maxEntries})`)
                                
                                // Definir mensagem específica baseada no motivo da negação
                                let deniedReason = ''
                                let unauthorizedMsg = ''
                                
                                if (!isInValidPeriod) {
                                    deniedReason = 'Período expirado'
                                    unauthorizedMsg = 'Não autorizado: Convite expirado, fale com o morador ou na portaria.'
                                } else if (!hasEntriesAvailable) {
                                    deniedReason = 'Limite de entradas esgotado'
                                    unauthorizedMsg = 'Não autorizado: Limite de entradas esgotado, fale com o morador ou na portaria.'
                                }
                                
                                // Mostrar status de não autorizado
                                console.log(`🚨 Definindo status unauthorized para convidado: ${bestMatch.name}`)
                                console.log(`🚨 Mensagem: ${unauthorizedMsg}`)
                                
                                setLastDetection({ 
                                    ...bestMatch, 
                                    name: `${bestMatch.name} (NÃO AUTORIZADO)`,
                                    isUnauthorized: true,
                                    reason: deniedReason
                                })
                                setDetectionStatus('unauthorized')
                                setUnauthorizedMessage(unauthorizedMsg)
                                
                                console.log(`🚨 Estado atualizado - detectionStatus: unauthorized, unauthorizedMessage: ${unauthorizedMsg}`)
                                
                                // Pausar detecção por 3 segundos (mesmo comportamento do autorizado)
                                setIsPaused(true)
                                
                                // Parar o loop de detecção imediatamente
                                isDetectingRef.current = false
                                if (detectionTimeoutRef.current) {
                                    clearTimeout(detectionTimeoutRef.current)
                                    detectionTimeoutRef.current = null
                                }
                                
                                // Salvar log como negado
                                await saveAccessLog({
                                    ...bestMatch,
                                    status: 'DENIED',
                                    reason: deniedReason
                                })
                                
                                // Countdown para mostrar tempo restante
                                let timeLeft = 5
                                setPauseTimeRemaining(timeLeft)

                                const countdown = setInterval(() => {
                                    // Verificar se foi pausado manualmente - se sim, para o countdown
                                    if (isManuallyPaused || isManuallyPausedRef.current) {
                                        clearInterval(countdown)
                                        console.log('🛑 Countdown cancelado - sistema pausado manualmente')
                                        return
                                    }
                                    
                                    timeLeft--
                                    setPauseTimeRemaining(timeLeft)

                                    if (timeLeft <= 0) {
                                        clearInterval(countdown)
                                        // Só redefinir estados se não foi pausado manualmente
                                        if (!isManuallyPaused && !isManuallyPausedRef.current) {
                                            setIsPaused(false)
                                            setDetectionStatus('idle')
                                            setPauseTimeRemaining(0)
                                            setUnauthorizedMessage('')
                                            setLastDetection(null)
                                            console.log('✅ Detecção reativada após acesso negado de convidado')

                                            // Reiniciar o loop de detecção após a pausa
                                            setTimeout(() => {
                                                if (!isDetectingRef.current && !isPaused && !isManuallyPaused && !isManuallyPausedRef.current) {
                                                    isDetectingRef.current = true
                                                    const detect = async () => {
                                                        if (!isDetectingRef.current || isPaused || isManuallyPaused || isManuallyPausedRef.current) return
                                                        await detectFaces()
                                                        if (isDetectingRef.current && !isPaused && !isManuallyPaused && !isManuallyPausedRef.current) {
                                                            detectionTimeoutRef.current = setTimeout(detect, 1500)
                                                        }
                                                    }
                                                    detect()
                                                }
                                            }, 1000)
                                        } else {
                                            console.log('🛑 Sistema pausado manualmente - não reativando countdown')
                                        }
                                    }
                                }, 1000)

                                // Salvar referência do timeout
                                pauseTimeoutRef.current = countdown as any
                                
                                // Não abrir o portão
                                return
                            }
                        }
                    }

                    // Registrar novo reconhecimento autorizado
                    lastRecognitionRef.current = { name: bestMatch.name, timestamp: now }

                    setLastDetection(bestMatch)
                    setDetectionStatus('recognized')

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
                    const logSaved = await saveAccessLog({
                        ...bestMatch,
                        status: 'APPROVED'
                    })
                    console.log(`💾 Log de acesso ${logSaved ? 'salvo' : 'falhou'}`)

                    // VERIFICAÇÃO CRÍTICA DE SEGURANÇA: Só enviar comando de abertura se pessoa foi realmente reconhecida e autorizada
                    if (bestMatch && bestMatch.name && bestMatch.name !== 'unknown' && !bestMatch.name.includes('Desconhecido') && !bestMatch.name.includes('não identificada')) {
                        // Enviar comando para Arduino (comando correto)
                        console.log(`🔌 Enviando comando FACE_RECOGNIZED para abrir portão para: ${bestMatch.name}`)
                        const commandSent = await sendArduinoCommand('FACE_RECOGNIZED') // Comando correto para abrir a cancela
                        console.log(`🔌 Comando FACE_RECOGNIZED ${commandSent ? 'enviado com sucesso' : 'falhou'}`)
                    } else {
                        console.error('🚨 ERRO CRÍTICO DE SEGURANÇA: Tentativa de abrir portão sem reconhecimento válido!')
                        console.error('🚨 bestMatch:', bestMatch)
                    }
                    
                    // O Arduino fecha automaticamente após 10s sem detectar veículo, não precisa enviar comando de fechamento

                    // Countdown para mostrar tempo restante
                    let timeLeft = 20
                    setPauseTimeRemaining(timeLeft)

                    const countdown = setInterval(() => {
                        // Verificar se foi pausado manualmente - se sim, para o countdown
                        if (isManuallyPaused || isManuallyPausedRef.current) {
                            clearInterval(countdown)
                            console.log('🛑 Countdown cancelado - sistema pausado manualmente')
                            return
                        }
                        
                        timeLeft--
                        setPauseTimeRemaining(timeLeft)

                        if (timeLeft <= 0) {
                            clearInterval(countdown)
                            // Só redefinir estados se não foi pausado manualmente
                            if (!isManuallyPaused && !isManuallyPausedRef.current) {
                                setIsPaused(false)
                                setDetectionStatus('idle')
                                setPauseTimeRemaining(0)
                                setUnauthorizedMessage('') // Limpar mensagem quando pausa termina
                                console.log('✅ Detecção reativada após pausa')

                                // Reiniciar o loop de detecção após a pausa
                                setTimeout(() => {
                                    if (!isPaused && !isManuallyPaused && !isManuallyPausedRef.current && !isDetectingRef.current) {
                                        isDetectingRef.current = true
                                        // Chama detectFaces diretamente para reiniciar o loop
                                        const restartDetection = async () => {
                                            const detect = async () => {
                                                if (!isDetectingRef.current || isPaused || isManuallyPaused || isManuallyPausedRef.current) return
                                                await detectFaces()
                                                if (isDetectingRef.current && !isPaused && !isManuallyPaused && !isManuallyPausedRef.current) {
                                                    detectionTimeoutRef.current = setTimeout(detect, 1500)
                                                }
                                            }
                                            detect()
                                        }
                                        restartDetection()
                                    }
                                }, 1000) // Aguardar 1 segundo antes de reiniciar
                            } else {
                                console.log('🛑 Sistema pausado manualmente - não reativando countdown')
                            }
                        }
                    }, 1000)

                    // Salvar referência do timeout
                    pauseTimeoutRef.current = countdown as any

                } else {
                    // Rosto detectado mas NÃO reconhecido
                    // ⚠️ IMPORTANTE: NUNCA salvar log para pessoa não identificada!
                    // Este bloco apenas mostra feedback visual, sem criar registros no banco
                    const now = Date.now()
                    console.log(`🔍 Rosto detectado mas não reconhecido. Último aviso: ${lastUnknownFaceTime}, Agora: ${now}, Diferença: ${now - lastUnknownFaceTime}ms`)
                    
                    if (now - lastUnknownFaceTime > 5000) { // 5 segundos desde a última mensagem
                        console.log('❌ Rosto detectado mas não reconhecido - ACESSO NEGADO (sem criar log)')
                        setUnauthorizedMessage('Não autorizado: não cadastrado ou reconhecido')
                        setDetectionStatus('unauthorized')
                        setLastUnknownFaceTime(now)
                        
                        // Criar um lastDetection temporário APENAS PARA EXIBIÇÃO NA INTERFACE
                        // Este objeto NÃO será salvo no banco de dados
                        setLastDetection({
                            name: 'Pessoa não identificada',
                            confidence: 0,
                            type: 'GUEST',
                            unit: '',
                            isUnauthorized: true,
                            status: 'DENIED',
                            reason: 'Não cadastrado'
                        })
                        
                        // ⚠️ CRÍTICO: NÃO chamar saveAccessLog() aqui!
                        // Pessoas não identificadas não devem gerar logs no sistema
                        
                        // Enviar comando FACE_REJECTED para Arduino
                        console.log('🔌 Enviando comando FACE_REJECTED para pessoa não identificada')
                        await sendArduinoCommand('FACE_REJECTED')
                        
                        // Pausar detecção por 3 segundos
                        setIsPaused(true)
                        
                        // Parar o loop de detecção imediatamente
                        isDetectingRef.current = false
                        if (detectionTimeoutRef.current) {
                            clearTimeout(detectionTimeoutRef.current)
                            detectionTimeoutRef.current = null
                        }
                        
                        // Countdown para mostrar tempo restante
                        let timeLeft = 3
                        setPauseTimeRemaining(timeLeft)

                        const countdown = setInterval(() => {
                            // Verificar se foi pausado manualmente - se sim, para o countdown
                            if (isManuallyPaused || isManuallyPausedRef.current) {
                                clearInterval(countdown)
                                console.log('🛑 Countdown cancelado - sistema pausado manualmente')
                                return
                            }
                            
                            timeLeft--
                            setPauseTimeRemaining(timeLeft)

                            if (timeLeft <= 0) {
                                clearInterval(countdown)
                                // Só redefinir estados se não foi pausado manualmente
                                if (!isManuallyPaused && !isManuallyPausedRef.current) {
                                    setIsPaused(false)
                                    setDetectionStatus('idle')
                                    setPauseTimeRemaining(0)
                                    setUnauthorizedMessage('')
                                    setLastDetection(null)
                                    console.log('✅ Detecção reativada após acesso negado')

                                    // Reiniciar o loop de detecção após a pausa
                                    setTimeout(() => {
                                        if (!isDetectingRef.current && !isPaused && !isManuallyPaused && !isManuallyPausedRef.current) {
                                            isDetectingRef.current = true
                                            const detect = async () => {
                                                if (!isDetectingRef.current || isPaused || isManuallyPaused || isManuallyPausedRef.current) return
                                                await detectFaces()
                                                if (isDetectingRef.current && !isPaused && !isManuallyPaused && !isManuallyPausedRef.current) {
                                                    detectionTimeoutRef.current = setTimeout(detect, 1500)
                                                }
                                            }
                                            detect()
                                        }
                                    }, 1000)
                                } else {
                                    console.log('🛑 Sistema pausado manualmente - não reativando countdown')
                                }
                            }
                        }, 1000)                        // Salvar referência do timeout
                        pauseTimeoutRef.current = countdown as any
                    } else {
                        // Manter status 'detecting' (laranja) se ainda não passou o tempo
                        setDetectionStatus('detecting')
                    }
                }
            } else {
                // Nenhum rosto detectado - status aguardando (cinza)
                setDetectionStatus('idle')
                setUnauthorizedMessage('') // Limpar mensagem quando não há rosto detectado
            }
        } catch (error) {
            console.error('❌ Erro na detecção:', error)
            setDetectionStatus('idle')
        }
    }, [faceApiLoaded, labels, cameraStarted, cameraStream, isPaused, isManuallyPaused, saveAccessLog, sendArduinoCommand, residents, lastUnknownFaceTime, clearCache, lastDetection, selectedCondominium])

    // Loop de detecção
    const startDetection = useCallback(() => {
        if (isDetectingRef.current) return

        isDetectingRef.current = true

        const detect = async () => {
            // Verificar se ainda deve detectar (incluindo pausas)
            if (!isDetectingRef.current || isPaused || isManuallyPaused) {
                console.log('🛑 Parando loop de detecção:', { 
                    isDetecting: isDetectingRef.current, 
                    isPaused, 
                    isManuallyPaused 
                })
                isDetectingRef.current = false
                if (detectionTimeoutRef.current) {
                    clearTimeout(detectionTimeoutRef.current)
                    detectionTimeoutRef.current = null
                }
                return
            }

            await detectFaces()

            // Verificar novamente antes de agendar próxima detecção
            if (isDetectingRef.current && !isPaused && !isManuallyPaused) {
                // Aumentar intervalo para 1.5 segundos para reduzir processamento
                detectionTimeoutRef.current = setTimeout(detect, 1500)
            } else {
                console.log('🛑 Não agendando próxima detecção - sistema pausado')
                isDetectingRef.current = false
            }
        }

        detect()
    }, [detectFaces, isPaused, isManuallyPaused])

    // Parar detecção
    const stopDetection = useCallback(() => {
        console.log('🛑 Parando detecção completamente')
        isDetectingRef.current = false
        
        if (detectionTimeoutRef.current) {
            clearTimeout(detectionTimeoutRef.current)
            detectionTimeoutRef.current = null
        }
        
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current)
            pauseTimeoutRef.current = null
        }
        
        setDetectionStatus('idle')
    }, [])

    // Limpar todos os estados ao despausar
    const clearAllStates = useCallback(() => {
        console.log('🧹 Limpando todos os estados de detecção')
        
        // IMPORTANTE: Limpar lastDetection primeiro para evitar que estados residuais sejam salvos
        setLastDetection(null)
        lastRecognitionRef.current = null
        setLastUnknownFaceTime(0)
        
        // Limpar estados de detecção
        setUnauthorizedMessage('')
        setDetectionStatus('idle')
        
        // Limpar estados de pausa
        setIsPaused(false)
        setPauseTimeRemaining(0)
        setCommandSent(false)
        
        // Limpar timeouts - IMPORTANTE: fazer isso ANTES de resetar os outros estados
        // para evitar que timeouts antigos redefinam os estados limpos
        if (detectionTimeoutRef.current) {
            clearTimeout(detectionTimeoutRef.current)
            detectionTimeoutRef.current = null
        }
        
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current)
            pauseTimeoutRef.current = null
        }
        
        // Limpar todos os intervalos que podem estar rodando countdowns
        // Não temos refs para eles, mas eles vão verificar as condições e parar
        
        // Reset refs
        isDetectingRef.current = false
        lastRecognitionRef.current = null
        isManuallyPausedRef.current = false // Reset ref também
        
        console.log('✅ Estados limpos - sistema pronto para reiniciar')
    }, [])

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

                    // Se nenhuma pessoa foi carregada, limpar cache e tentar novamente
                    if (residents.length === 0 && labels.length === 0) {
                        console.log('🔄 Nenhuma pessoa carregada, limpando cache e tentando novamente...')
                        clearCache('authorizedPersons')
                        clearCache() // Limpar todo o cache
                        
                        // Tentar carregar novamente após limpar cache
                        setTimeout(async () => {
                            try {
                                await loadLabels()
                                console.log('🔄 Segundo carregamento concluído')
                            } catch (retryError) {
                                console.error('❌ Erro no segundo carregamento:', retryError)
                            }
                        }, 1000)
                    }

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
    }, [selectedCondominium, faceApiLoaded, loadCameras, loadLabels, loadAvailablePorts, checkArduinoStatus, cameras.length, labels.length, availablePorts.length, residents.length, clearCache])

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
                !isManuallyPaused && 
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
    }, [cameraStarted, faceApiLoaded, cameraStream, isPaused, isManuallyPaused, labels.length, startDetection])

    // Monitorar pausa manual e forçar parada quando necessário
    useEffect(() => {
        // Sincronizar ref com state
        isManuallyPausedRef.current = isManuallyPaused
        
        if (isManuallyPaused) {
            console.log('🛑 Pausa manual ativada - forçando parada completa')
            stopDetection()
        }
    }, [isManuallyPaused, stopDetection])

    // ==================== EFFECT DE QR CODE ====================
    // Escanear QR Code a cada 2 segundos (junto com reconhecimento facial)
    useEffect(() => {
        if (!cameraStarted || isPaused || isManuallyPaused || !qrScanEnabled) {
            return
        }

        console.log('📷 [QR] Iniciando scanner de QR Code (intervalo: 2s)')

        const qrScanInterval = setInterval(async () => {
            if (isPaused || isManuallyPaused) {
                return
            }

            const qrData = scanQRCode()
            if (qrData) {
                console.log('📷 [QR] QR Code detectado, validando...')
                await validateAndProcessQRCode(qrData)
            }
        }, 2000)

        qrScanIntervalRef.current = qrScanInterval

        return () => {
            console.log('📷 [QR] Parando scanner de QR Code')
            if (qrScanIntervalRef.current) {
                clearInterval(qrScanIntervalRef.current)
                qrScanIntervalRef.current = null
            }
        }
    }, [cameraStarted, isPaused, isManuallyPaused, qrScanEnabled, validateAndProcessQRCode, scanQRCode])
    // ==================== FIM DO EFFECT DE QR CODE ====================

    // Debug dos estados de detecção
    useEffect(() => {
        console.log('🎯 Estado de detecção mudou:', {
            detectionStatus,
            lastDetection: lastDetection?.name,
            unauthorizedMessage,
            hasLastDetection: !!lastDetection,
            hasUnauthorizedMessage: !!unauthorizedMessage,
            shouldShowUnauthorized: detectionStatus === 'unauthorized' && (lastDetection || unauthorizedMessage)
        })
    }, [detectionStatus, lastDetection, unauthorizedMessage])

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
                        {selectedCondominium.name} • {residents.length} pessoas autorizadas 
                        {residents.length > 0 && (
                            <>
                                {` (${residents.filter(r => r.type === 'RESIDENT').length} moradores, ${residents.filter(r => r.type === 'EMPLOYEE').length} funcionários, ${residents.filter(r => r.type === 'GUEST').length} convidados)`}
                            </>
                        )} • {labels.length} labels
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
                                        <p className="text-lg mb-2">🏷️ Processando pessoas autorizadas...</p>
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
                                            Carregando: {cameras.length} câmeras, {labels.length} pessoas
                                        </span>
                                    </>
                                ) : labels.length === 0 ? (
                                    <>
                                        <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-sm">Falha: 0 pessoas carregadas</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-3 w-3 bg-green-500 rounded-full" />
                                        <span className="text-sm">
                                            Sistema pronto: {cameras.length} câmeras, {labels.length} pessoas
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
                                    {detectionStatus === 'processing' && (
                                        <>
                                            <div className="h-3 w-3 bg-blue-500 rounded-full animate-spin" />
                                            <span className="text-sm">🔍 Processando acesso...</span>
                                        </>
                                    )}
                                    {detectionStatus === 'recognized' && lastDetection && (
                                        <>
                                            <div className="h-3 w-3 bg-green-500 rounded-full" />
                                            <div className="text-sm flex flex-col">
                                                <span className="font-bold text-green-300">AUTORIZADO</span>
                                                <span>{lastDetection.type === 'RESIDENT' ? 'Morador' : lastDetection.type === 'EMPLOYEE' ? 'Funcionário' : 'Convidado'}: {lastDetection.name}</span>
                                                {isPaused && <span className="text-yellow-300">{pauseTimeRemaining}s restantes</span>}
                                            </div>
                                        </>
                                    )}
                                    {detectionStatus === 'unauthorized' && (lastDetection || unauthorizedMessage) && (
                                        <>
                                            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                                            <div className="text-sm flex flex-col">
                                                <span className="font-bold text-red-300">NÃO AUTORIZADO</span>
                                                {lastDetection ? (
                                                    <span>{lastDetection.type === 'RESIDENT' ? 'Morador' : lastDetection.type === 'EMPLOYEE' ? 'Funcionário' : 'Convidado'}: {lastDetection.name}</span>
                                                ) : (
                                                    <span>{unauthorizedMessage}</span>
                                                )}
                                                {isPaused && <span className="text-red-300">{pauseTimeRemaining}s restantes</span>}
                                            </div>
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
                                    {detectionStatus === 'idle' && !isPaused && !isManuallyPaused && (
                                        <>
                                            <div className="h-3 w-3 bg-gray-500 rounded-full" />
                                            <span className="text-sm">Aguardando...</span>
                                        </>
                                    )}
                                    {isManuallyPaused && (
                                        <>
                                            <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse" />
                                            <div className="text-sm flex items-center gap-1">
                                                <Pause className="h-3 w-3" />
                                                <span>Pausado Manualmente</span>
                                            </div>
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
                                    variant={isManuallyPaused ? "default" : "secondary"}
                                    size="sm"
                                    onClick={() => {
                                        const newPausedState = !isManuallyPaused
                                        setIsManuallyPaused(newPausedState)
                                        // Atualizar ref IMEDIATAMENTE para máxima segurança
                                        isManuallyPausedRef.current = newPausedState
                                        
                                        if (newPausedState) {
                                            // Pausar o reconhecimento
                                            console.log('🛑 Reconhecimento pausado manualmente')
                                            stopDetection()
                                            setDetectionStatus('paused')
                                        } else {
                                            // Continuar o reconhecimento
                                            console.log('▶️ Reconhecimento retomado manualmente')
                                            // Limpar TODOS os estados antes de continuar
                                            clearAllStates()
                                            // Reiniciar detecção se as condições estiverem OK
                                            if (cameraStarted && faceApiLoaded && cameraStream) {
                                                startDetection()
                                            }
                                        }
                                    }}
                                    className={`${isManuallyPaused 
                                        ? 'bg-green-600/80 hover:bg-green-600 text-white border-green-500/50' 
                                        : 'bg-red-600/80 hover:bg-red-600 text-white border-red-500/50'
                                    } backdrop-blur-sm`}
                                    title={isManuallyPaused ? "Continuar Reconhecimento" : "Pausar Reconhecimento"}
                                >
                                    {isManuallyPaused ? <Play className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        console.log('🔄 Forçando recarregamento de pessoas autorizadas...')
                                        clearCache('authorizedPersons')
                                        loadLabels()
                                    }}
                                    className="bg-black/70 backdrop-blur-sm border-white/20 text-orange-300 hover:bg-black/80"
                                    title="Limpar cache e recarregar pessoas autorizadas"
                                >
                                    �
                                </Button>
                            </div>

                            {/* Indicador de QR Code Ativo */}
                            {qrScanEnabled && cameraStarted && !isPaused && !isManuallyPaused && (
                                <div className="bg-blue-600/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-400/50 pointer-events-none animate-pulse">
                                    <div className="flex items-center gap-2 text-white text-sm font-medium">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                                            <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
                                        </svg>
                                        <span>QR Code Ativo</span>
                                    </div>
                                </div>
                            )}

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
                                                        {availablePorts.length === 0 ? (
                                                            <option value="" disabled>Nenhuma porta detectada - Conecte o Arduino via USB</option>
                                                        ) : (
                                                            availablePorts.map((port) => (
                                                                <option key={port.path} value={port.path} className="bg-black text-white">
                                                                    {port.path} {port.manufacturer ? `(${port.manufacturer})` : ''}
                                                                </option>
                                                            ))
                                                        )}
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
                                                ✅ AUTORIZADO
                                            </div>
                                            <div className="text-base font-medium text-green-200 mt-1">
                                                {lastDetection.type === 'RESIDENT' ? 'Morador' : lastDetection.type === 'EMPLOYEE' ? 'Funcionário' : 'Convidado'}: {lastDetection.name}
                                            </div>
                                        </div>
                                    )}
                                    {detectionStatus === 'unauthorized' && (lastDetection || unauthorizedMessage) && (
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-red-300">
                                                ❌ ACESSO NEGADO
                                            </div>
                                            <div className="text-base font-medium text-red-200 mt-1">
                                                {lastDetection?.type === 'RESIDENT' ? 'Morador' : lastDetection?.type === 'EMPLOYEE' ? 'Funcionário' : 'Convidado'}: {lastDetection?.name?.replace(' (NÃO AUTORIZADO)', '') || 'Não identificado'}
                                            </div>
                                            {unauthorizedMessage && (
                                                <div className="text-sm text-red-400 mt-2 max-w-md mx-auto">
                                                    {unauthorizedMessage}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {detectionStatus === 'paused' && lastDetection && (
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-yellow-300">
                                                ✅ AUTORIZADO: {lastDetection.type === 'RESIDENT' ? 'Morador' : lastDetection.type === 'EMPLOYEE' ? 'Funcionário' : 'Convidado'} - {lastDetection.name}
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

                        {/* Overlay de processamento */}
                        {isProcessingAccess && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md z-50">
                                <div className="text-center text-white">
                                    <div className="bg-blue-600/90 rounded-full p-8 mb-6 mx-auto w-32 h-32 flex items-center justify-center">
                                        <div className="animate-spin text-6xl">
                                            ⚙️
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-bold mb-4 text-blue-400">🔍 PROCESSANDO</h2>
                                    <p className="text-2xl text-white mb-2">
                                        Verificando credenciais...
                                    </p>
                                    <p className="text-lg text-blue-300 animate-pulse">
                                        Aguarde um momento
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Overlay central de pausa */}
                        {isPaused && !isProcessingAccess && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                                <div className="text-center text-white">
                                    {unauthorizedMessage ? (
                                        <>
                                            <div className="bg-red-600/90 rounded-full p-8 mb-6 mx-auto w-32 h-32 flex items-center justify-center animate-pulse">
                                                <div className="text-5xl font-bold text-white">
                                                    ✕
                                                </div>
                                            </div>
                                            <h2 className="text-4xl font-bold mb-4 text-red-400">❌ ACESSO NEGADO</h2>
                                            <p className="text-2xl text-white mb-2">
                                                {unauthorizedMessage}
                                            </p>
                                            <p className="text-xl text-yellow-400 animate-pulse">
                                                ⏸️ Sistema pausado
                                            </p>
                                            <p className="text-lg text-gray-300">
                                                Reativando em {pauseTimeRemaining} segundos
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-green-600/90 rounded-full p-8 mb-6 mx-auto w-32 h-32 flex items-center justify-center animate-pulse">
                                                <div className="text-4xl font-bold">
                                                    {pauseTimeRemaining}
                                                </div>
                                            </div>
                                            <h2 className="text-4xl font-bold mb-4 text-green-400">✅ ACESSO AUTORIZADO</h2>
                                            <p className="text-2xl text-white mb-2">
                                                {lastDetection?.name}
                                            </p>
                                            <p className="text-xl text-yellow-400 animate-pulse">
                                                ⏸️ Sistema pausado
                                            </p>
                                            <p className="text-lg text-gray-300">
                                                Reativando em {pauseTimeRemaining} segundos
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}