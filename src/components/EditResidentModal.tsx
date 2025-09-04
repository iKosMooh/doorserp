"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { 
  User, 
  Camera, 
  Upload, 
  X, 
  Check, 
  AlertCircle,
  Building,
  Plus
} from "lucide-react"

interface Unit {
  id: string
  block: string
  number: string
  isOccupied: boolean
}

interface Resident {
  id: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    document: string | null
    documentType: string
    birthDate: string | null
    faceRecognitionEnabled: boolean
    faceRecognitionFolder: string | null
  }
  unit: {
    id: string
    block: string
    number: string
  }
  relationshipType: string
  emergencyContact: string | null
  vehiclePlates: string[]
  isActive: boolean
}

interface EditResidentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  resident: Resident | null
  condominiumId: string
}

interface FormData {
  name: string
  email: string
  phone: string
  document: string
  documentType: 'CPF' | 'RG' | 'CNH' | 'PASSPORT'
  birthDate: string
  unitId: string
  relationshipType: 'OWNER' | 'TENANT' | 'FAMILY_MEMBER' | 'AUTHORIZED'
  emergencyContact: string
  vehiclePlates: string[]
  faceRecognitionEnabled: boolean
  isActive: boolean
}

export function EditResidentModal({ isOpen, onClose, onSuccess, resident, condominiumId }: EditResidentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [units, setUnits] = useState<Unit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    document: '',
    documentType: 'CPF',
    birthDate: '',
    unitId: '',
    relationshipType: 'OWNER',
    emergencyContact: '',
    vehiclePlates: [''],
    faceRecognitionEnabled: false,
    isActive: true
  })

  // Face recognition images
  const [faceImages, setFaceImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [existingImageFiles, setExistingImageFiles] = useState<File[]>([])
  const [loadingExistingImages, setLoadingExistingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Camera
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [captureFlash, setCaptureFlash] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isStartingCameraRef = useRef(false)

  // Load units
  const loadUnits = useCallback(async () => {
    if (!condominiumId) return

    try {
      setLoadingUnits(true)
      const response = await fetch(`/api/units?condominiumId=${condominiumId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar unidades')
      }
      
      const result = await response.json()
      if (result.success) {
        setUnits(result.data)
      }
    } catch (err) {
      console.error('Erro ao carregar unidades:', err)
      setError('Erro ao carregar unidades')
    } finally {
      setLoadingUnits(false)
    }
  }, [condominiumId])

  // Load data when resident changes
  useEffect(() => {
    if (resident && isOpen) {
      console.log('👤 Carregando dados completos do morador:', JSON.stringify(resident, null, 2))
      console.log('🔍 Detalhes específicos:', {
        name: resident.user.name,
        faceRecognitionEnabled: resident.user.faceRecognitionEnabled,
        faceRecognitionFolder: resident.user.faceRecognitionFolder,
        hasFaceRecognitionFolder: !!resident.user.faceRecognitionFolder,
        faceRecognitionFolderType: typeof resident.user.faceRecognitionFolder
      })
      
      setFormData({
        name: resident.user.name,
        email: resident.user.email,
        phone: resident.user.phone || '',
        document: resident.user.document || '',
        documentType: (resident.user.documentType as FormData['documentType']) || 'CPF',
        birthDate: resident.user.birthDate ? new Date(resident.user.birthDate).toISOString().split('T')[0] : '',
        unitId: resident.unit.id,
        relationshipType: resident.relationshipType as FormData['relationshipType'],
        emergencyContact: resident.emergencyContact || '',
        vehiclePlates: resident.vehiclePlates.length > 0 ? resident.vehiclePlates : [''],
        faceRecognitionEnabled: resident.user.faceRecognitionEnabled,
        isActive: resident.isActive
      })
      
      // Load existing face images
      if (resident.user.faceRecognitionFolder) {
        console.log('🔄 Carregando imagens existentes para:', resident.user.faceRecognitionFolder)
        loadExistingImages(resident.user.faceRecognitionFolder)
      } else {
        console.log('ℹ️ Nenhuma pasta de reconhecimento facial encontrada para este morador')
        console.log('⚠️ Dados do campo faceRecognitionFolder:', {
          value: resident.user.faceRecognitionFolder,
          type: typeof resident.user.faceRecognitionFolder,
          isNull: resident.user.faceRecognitionFolder === null,
          isUndefined: resident.user.faceRecognitionFolder === undefined,
          isEmpty: resident.user.faceRecognitionFolder === ''
        })
      }
      
      loadUnits()
    }
  }, [resident, isOpen, loadUnits])

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('🧹 Limpando estados do modal')
      // Reset image states
      setFaceImages([])
      setImagePreviewUrls([])
      setExistingImageFiles([])
      setLoadingExistingImages(false)
      setCurrentStep(1)
      setError(null)
    }
  }, [isOpen])

  // Load existing face images
  const loadExistingImages = async (folderName: string) => {
    try {
      console.log('📁 Iniciando carregamento de imagens existentes para:', folderName)
      setLoadingExistingImages(true)
      
      const apiUrl = `/api/face-recognition/images?folder=${folderName}`
      console.log('🌐 URL da API:', apiUrl)
      
      const response = await fetch(apiUrl)
      console.log('📡 Status da resposta:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log('📥 Resposta completa da API:', JSON.stringify(result, null, 2))
        
        if (result.success) {
          console.log('✅ API retornou sucesso')
          
          if (result.images && Array.isArray(result.images) && result.images.length > 0) {
            console.log(`🖼️ Encontradas ${result.images.length} imagens existentes:`)
            result.images.forEach((img: { name: string; url: string }, index: number) => {
              console.log(`  ${index + 1}. Nome: ${img.name}, URL: ${img.url}`)
            })
            
            // Convert URLs to File objects and add to face images
            const existingFiles: File[] = []
            const existingPreviewUrls: string[] = []
            let successCount = 0
            let errorCount = 0
            
            for (const [index, imageData] of result.images.entries()) {
              try {
                console.log(`⬇️ [${index + 1}/${result.images.length}] Baixando: ${imageData.url}`)
                
                // Fetch the image data
                const imageResponse = await fetch(imageData.url)
                console.log(`📡 Status da imagem ${index + 1}:`, imageResponse.status, imageResponse.statusText)
                
                if (imageResponse.ok) {
                  const blob = await imageResponse.blob()
                  console.log(`💾 Blob criado para ${imageData.name}:`, {
                    size: blob.size,
                    type: blob.type
                  })
                  
                  // Create File object with original name or generate one
                  const fileName = imageData.name || `existing_${Date.now()}_${existingFiles.length}.jpg`
                  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
                  
                  existingFiles.push(file)
                  existingPreviewUrls.push(imageData.url)
                  successCount++
                  
                  console.log(`✅ [${index + 1}] Imagem processada: ${fileName}`, {
                    fileSize: file.size,
                    fileType: file.type,
                    fileName: file.name
                  })
                } else {
                  errorCount++
                  console.error(`❌ [${index + 1}] Erro HTTP ao baixar imagem: ${imageData.url}`, {
                    status: imageResponse.status,
                    statusText: imageResponse.statusText
                  })
                }
              } catch (fetchError) {
                errorCount++
                console.error(`❌ [${index + 1}] Erro ao processar imagem:`, imageData.url, fetchError)
              }
            }
            
            console.log(`📊 Resumo do processamento:`, {
              total: result.images.length,
              sucessos: successCount,
              erros: errorCount,
              arquivosFinais: existingFiles.length,
              urlsFinais: existingPreviewUrls.length
            })
            
            if (existingFiles.length > 0) {
              console.log(`🎯 Atualizando estados com ${existingFiles.length} imagens`)
              
              // Add existing images to the face images state
              setFaceImages(existingFiles)
              setImagePreviewUrls(existingPreviewUrls)
              setExistingImageFiles(existingFiles)
              
              console.log(`✅ Estados atualizados com sucesso!`)
              
              // Verificar se os estados foram atualizados
              setTimeout(() => {
                console.log('🔍 Verificando estados após atualização:', {
                  faceImagesLength: existingFiles.length,
                  imagePreviewUrlsLength: existingPreviewUrls.length,
                  existingImageFilesLength: existingFiles.length
                })
              }, 100)
            } else {
              console.log('⚠️ Nenhuma imagem foi processada com sucesso')
            }
          } else {
            console.log('ℹ️ API retornou sucesso mas sem imagens:', {
              hasImages: !!result.images,
              isArray: Array.isArray(result.images),
              length: result.images?.length || 0
            })
          }
        } else {
          console.log('❌ API retornou falha:', result.error || 'Erro desconhecido')
        }
      } else {
        const errorText = await response.text()
        console.log(`⚠️ Erro na resposta da API:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
      }
    } catch (err) {
      console.error('❌ Erro geral ao carregar imagens existentes:', err)
    } finally {
      setLoadingExistingImages(false)
      console.log('🏁 Finalizado carregamento de imagens existentes')
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleVehiclePlateChange = (index: number, value: string) => {
    const newPlates = [...formData.vehiclePlates]
    newPlates[index] = value
    setFormData(prev => ({
      ...prev,
      vehiclePlates: newPlates
    }))
  }

  const addVehiclePlate = () => {
    if (formData.vehiclePlates.length < 3) {
      setFormData(prev => ({
        ...prev,
        vehiclePlates: [...prev.vehiclePlates, '']
      }))
    }
  }

  const removeVehiclePlate = (index: number) => {
    if (formData.vehiclePlates.length > 1) {
      const newPlates = formData.vehiclePlates.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        vehiclePlates: newPlates
      }))
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    if (faceImages.length + files.length > 15) {
      setError('Máximo de 15 imagens permitidas')
      return
    }

    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
      return isImage && isValidSize
    })

    if (validFiles.length !== files.length) {
      setError('Apenas imagens até 5MB são permitidas')
      return
    }

    // Create preview URLs for new images
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
    
    // Add new images to existing arrays
    setFaceImages(prev => [...prev, ...validFiles])
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
    setError(null)
  }

  const removeImage = (index: number) => {
    const isExistingImage = index < existingImageFiles.length
    
    if (isExistingImage) {
      // Removing an existing image
      setExistingImageFiles(prev => prev.filter((_, i) => i !== index))
    }
    
    // Always remove from main arrays and revoke URL if it's a blob URL
    setFaceImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => {
      const url = prev[index]
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  // Camera functions
  const getCameras = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
      tempStream.getTracks().forEach(track => track.stop())
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      setCameras(videoDevices)
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId)
      }
    } catch {
      setError('Erro ao acessar câmeras')
    }
  }

  const startCamera = useCallback(async () => {
    if (isStartingCameraRef.current) return
    
    try {
      isStartingCameraRef.current = true
      
      // Stop any existing stream first
      setCameraStream(prevStream => {
        if (prevStream) {
          prevStream.getTracks().forEach(track => track.stop())
        }
        return null
      })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      })

      setCameraStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Ensure video plays and is ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(error => {
              console.error('Erro ao reproduzir vídeo:', error)
              setError('Erro ao iniciar visualização da câmera')
            })
          }
        }
        
        // Handle video errors
        videoRef.current.onerror = (error) => {
          console.error('Erro no elemento de vídeo:', error)
          setError('Erro na transmissão da câmera')
        }
        
        await videoRef.current.play()
      }
    } catch (error) {
      console.error('Erro ao iniciar câmera:', error)
      setError('Erro ao iniciar câmera. Verifique as permissões.')
    } finally {
      isStartingCameraRef.current = false
    }
  }, [selectedCamera])

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return

    // Verify video is actually playing and has dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused) {
      setError('Câmera não está pronta. Aguarde um momento e tente novamente.')
      return
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw the current video frame to canvas
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
      
      // Show capture flash effect
      setCaptureFlash(true)
      setTimeout(() => setCaptureFlash(false), 200)
      
      // Convert canvas to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
          const url = URL.createObjectURL(blob)
          
          // Add new captured image to existing arrays
          setFaceImages(prev => [...prev, file])
          setImagePreviewUrls(prev => [...prev, url])
          
          // Clear any previous errors
          setError(null)
          
          console.log('📸 Foto capturada com sucesso! Recarregando câmera...')
          
          // Reload camera after capture
          setTimeout(() => {
            if (!isStartingCameraRef.current && showCameraModal) {
              startCamera()
            }
          }, 300) // Small delay to ensure flash effect completes
          
        } else {
          setError('Erro ao processar a imagem capturada')
        }
      }, 'image/jpeg', 0.9)
      
    } catch (error) {
      console.error('Erro ao capturar foto:', error)
      setError('Erro ao capturar foto. Tente novamente.')
    }
  }

  const openCamera = async () => {
    await getCameras()
    setShowCameraModal(true)
  }

  const closeCamera = () => {
    stopCamera()
    setShowCameraModal(false)
  }

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [cameraStream, imagePreviewUrls])

  // Start camera when modal opens or camera changes
  useEffect(() => {
    if (showCameraModal && selectedCamera && !isStartingCameraRef.current) {
      startCamera()
    }
  }, [showCameraModal, selectedCamera, startCamera])

  // Monitor camera stream health
  useEffect(() => {
    if (!showCameraModal || !cameraStream || !videoRef.current) return

    const video = videoRef.current

    const checkStreamHealth = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused) {
        console.log('🔄 Stream parece estar inativo, tentando reativar...')
        if (cameraStream && cameraStream.active) {
          video.play().catch(error => {
            console.error('Erro ao reativar vídeo:', error)
            // Se falhar, tentar reiniciar a câmera
            if (!isStartingCameraRef.current) {
              startCamera()
            }
          })
        }
      }
    }

    // Check every 2 seconds if camera is still working
    const healthCheckInterval = setInterval(checkStreamHealth, 2000)

    return () => {
      clearInterval(healthCheckInterval)
    }
  }, [showCameraModal, cameraStream, startCamera])

  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.document) {
      setError('Preencha todos os campos obrigatórios')
      return false
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido')
      return false
    }
    
    setError(null)
    return true
  }

  const validateStep2 = () => {
    if (!formData.unitId) {
      setError('Selecione uma unidade')
      return false
    }
    
    setError(null)
    return true
  }

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    if (!resident) return

    try {
      setLoading(true)
      setError(null)

      // Prepare form data for submission
      const formDataToSend = new FormData()
      
      // Add text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'vehiclePlates') {
          formDataToSend.append(key, JSON.stringify(value.filter((plate: string) => plate.trim())))
        } else {
          formDataToSend.append(key, String(value))
        }
      })

      // Add face images
      faceImages.forEach((file, index) => {
        formDataToSend.append(`faceImage_${index}`, file)
      })

      const response = await fetch(`/api/residents/${resident.id}`, {
        method: 'PUT',
        body: formDataToSend
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar morador')
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao atualizar morador:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Render functions (similar to CreateResidentModal but adapted for editing)
  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="w-5 h-5" />
        Dados Pessoais
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome completo do morador"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="email@exemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Telefone *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo de Documento *
          </label>
          <select
            value={formData.documentType}
            onChange={(e) => handleInputChange('documentType', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="CPF">CPF</option>
            <option value="RG">RG</option>
            <option value="CNH">CNH</option>
            <option value="PASSPORT">Passaporte</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Número do Documento *
          </label>
          <input
            type="text"
            value={formData.document}
            onChange={(e) => handleInputChange('document', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Número do documento"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Data de Nascimento
          </label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleInputChange('birthDate', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Contato de Emergência
          </label>
          <input
            type="tel"
            value={formData.emergencyContact}
            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Telefone de emergência"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="text-sm font-medium">Morador ativo</span>
          </label>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Building className="w-5 h-5" />
        Unidade e Relacionamento
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Unidade *
          </label>
          {loadingUnits ? (
            <div className="p-2 border border-gray-300 rounded-md">
              Carregando unidades...
            </div>
          ) : (
            <select
              value={formData.unitId}
              onChange={(e) => handleInputChange('unitId', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma unidade</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.block}/{unit.number}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo de Relacionamento *
          </label>
          <select
            value={formData.relationshipType}
            onChange={(e) => handleInputChange('relationshipType', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="OWNER">Proprietário</option>
            <option value="TENANT">Inquilino</option>
            <option value="FAMILY_MEMBER">Familiar</option>
            <option value="AUTHORIZED">Autorizado</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Placas de Veículos
        </label>
        {formData.vehiclePlates.map((plate, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={plate}
              onChange={(e) => handleVehiclePlateChange(index, e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ABC-1234"
            />
            {formData.vehiclePlates.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeVehiclePlate(index)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        
        {formData.vehiclePlates.length < 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={addVehiclePlate}
            className="mt-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Veículo
          </Button>
        )}
      </div>
    </div>
  )

  const renderStep3 = () => {
    console.log('🎨 Renderizando Step 3 - Dados atuais:', {
      faceImagesLength: faceImages.length,
      imagePreviewUrlsLength: imagePreviewUrls.length,
      existingImageFilesLength: existingImageFiles.length,
      loadingExistingImages,
      faceRecognitionEnabled: formData.faceRecognitionEnabled
    })

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Reconhecimento Facial
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="faceRecognition"
              checked={formData.faceRecognitionEnabled}
              onChange={(e) => handleInputChange('faceRecognitionEnabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <label htmlFor="faceRecognition" className="text-sm font-medium">
              Habilitar reconhecimento facial
            </label>
          </div>

          {formData.faceRecognitionEnabled && (
            <div className="space-y-4">
              {/* Loading existing images indicator */}
              {loadingExistingImages && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Carregando imagens existentes...
                  </p>
                </div>
              )}

              {/* Existing images loaded indicator */}
              {existingImageFiles.length > 0 && !loadingExistingImages && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {existingImageFiles.length} imagem(ns) existente(s) carregada(s) com sucesso
                  </p>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    {existingImageFiles.length > 0 
                      ? 'Imagens existentes carregadas. Adicione mais fotos se desejar'
                      : 'Capture ou envie fotos do rosto para reconhecimento facial'
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {faceImages.length > 0 
                      ? `${faceImages.length} foto(s) total | ${existingImageFiles.length} existente(s) + ${faceImages.length - existingImageFiles.length} nova(s)`
                      : 'Recomendado: 5-15 fotos em diferentes ângulos e condições de luz'
                    }
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={faceImages.length >= 15 || loadingExistingImages}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Fotos
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openCamera}
                    disabled={faceImages.length >= 15 || loadingExistingImages}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Usar Câmera
                  </Button>
                </div>
              </div>

              {faceImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Imagens ({faceImages.length})
                    {existingImageFiles.length > 0 && (
                      <span className="text-xs text-green-600 ml-1">
                        • {existingImageFiles.length} existente(s)
                      </span>
                    )}
                    {faceImages.length > existingImageFiles.length && (
                      <span className="text-xs text-blue-600 ml-1">
                        • {faceImages.length - existingImageFiles.length} nova(s)
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-md bg-gray-50">
                    {imagePreviewUrls.map((url, index) => {
                      const isExisting = index < existingImageFiles.length
                      console.log(`🖼️ Renderizando imagem ${index + 1}: ${url} (${isExisting ? 'existente' : 'nova'})`)
                      return (
                        <div key={index} className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Face ${index + 1}`}
                            className={`w-full h-16 object-cover rounded border-2 ${
                              isExisting ? 'border-green-400' : 'border-blue-400'
                            }`}
                            onError={(e) => {
                              console.log('❌ Erro ao carregar imagem na UI:', url)
                              e.currentTarget.style.display = 'none'
                            }}
                            onLoad={() => {
                              console.log('✅ Imagem carregada na UI:', url)
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className={`absolute bottom-0 left-0 right-0 bg-opacity-80 text-white text-xs text-center py-1 rounded-b ${
                            isExisting ? 'bg-green-600' : 'bg-blue-600'
                          }`}>
                            {isExisting ? 'Existente' : 'Nova'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= step 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-600'
          }`}>
            {currentStep > step ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < 3 && (
            <div className={`w-12 h-0.5 ${
              currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  if (!isOpen || !resident) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Editar Morador: ${resident.user.name}`}>
        <div className="p-6 max-w-2xl mx-auto">
          {renderStepIndicator()}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="min-h-96">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? onClose : prevStep}
              disabled={loading}
            >
              {currentStep === 1 ? 'Cancelar' : 'Voltar'}
            </Button>

            <div className="flex space-x-2">
              {currentStep < 3 ? (
                <Button onClick={nextStep} disabled={loading}>
                  Próximo
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Camera Modal */}
      {showCameraModal && (
        <Modal isOpen={showCameraModal} onClose={closeCamera} title="Capturar Foto">
          <div className="p-6 space-y-4">
            {/* Camera selection */}
            {cameras.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Selecionar Câmera
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Câmera ${camera.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video preview */}
            <div className="relative rounded-lg overflow-hidden bg-gray-200" style={{ minHeight: '320px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-80 object-cover"
                style={{ 
                  display: cameraStream ? 'block' : 'none'
                }}
              />
              
              {/* Flash effect for photo capture */}
              {captureFlash && (
                <div className="absolute inset-0 bg-white opacity-80 transition-opacity duration-200" />
              )}
              
              {/* Loading indicator */}
              {!cameraStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gray-700 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Carregando câmera...</p>
                  </div>
                </div>
              )}
              
              {/* Guide overlay */}
              {cameraStream && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-blue-500 rounded-full w-64 h-64 opacity-50"></div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Imagens: {faceImages.length}/15
              </p>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCamera}
                >
                  Fechar
                </Button>
                
                <Button
                  type="button"
                  onClick={capturePhoto}
                  disabled={faceImages.length >= 15 || !cameraStream}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capturar
                </Button>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </Modal>
      )}
    </>
  )
}
