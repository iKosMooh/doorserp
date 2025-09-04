"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import { useCondominium } from "@/contexts/CondominiumContext"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { 
  User, 
  Camera, 
  Upload, 
  X, 
  Check, 
  AlertCircle,
  Phone,
  Mail,
  Building,
  FileText,
  Calendar,
  Plus
} from "lucide-react"

interface Unit {
  id: string
  block: string
  number: string
  isOccupied: boolean
}

interface CreateResidentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
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
}

export function CreateResidentModal({ isOpen, onClose, onSuccess }: CreateResidentModalProps) {
  const { selectedCondominium } = useCondominium()
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
    faceRecognitionEnabled: false
  })

  // Face recognition
  const [faceImages, setFaceImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
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
    if (!selectedCondominium?.id) return

    try {
      setLoadingUnits(true)
      const response = await fetch(`/api/units?condominiumId=${selectedCondominium.id}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar unidades')
      }
      
      const result = await response.json()
      if (result.success) {
        setUnits(result.data)
      }
    } catch {
      setError('Erro ao carregar unidades')
    } finally {
      setLoadingUnits(false)
    }
  }, [selectedCondominium?.id])

  // Initialize
  useEffect(() => {
    if (isOpen && selectedCondominium?.id) {
      loadUnits()
    }
  }, [isOpen, selectedCondominium?.id, loadUnits])

  // Camera cleanup
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [cameraStream, imagePreviewUrls])

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleVehiclePlateChange = (index: number, value: string) => {
    const newPlates = [...formData.vehiclePlates]
    newPlates[index] = value
    setFormData(prev => ({ ...prev, vehiclePlates: newPlates }))
  }

  const addVehiclePlate = () => {
    if (formData.vehiclePlates.length < 3) {
      setFormData(prev => ({ ...prev, vehiclePlates: [...prev.vehiclePlates, ''] }))
    }
  }

  const removeVehiclePlate = (index: number) => {
    if (formData.vehiclePlates.length > 1) {
      const newPlates = formData.vehiclePlates.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, vehiclePlates: newPlates }))
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    if (faceImages.length + files.length > 15) {
      setError('Máximo de 15 imagens permitidas')
      return
    }

    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
    )

    if (validFiles.length !== files.length) {
      setError('Apenas imagens até 5MB são permitidas')
      return
    }

    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
    
    setFaceImages(prev => [...prev, ...validFiles])
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
    setError(null)
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index])
    setFaceImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
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
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido')
      return false
    }

    if (formData.documentType === 'CPF' && formData.document.replace(/\D/g, '').length !== 11) {
      setError('CPF deve ter 11 dígitos')
      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (!formData.unitId) {
      setError('Selecione uma unidade')
      return false
    }
    return true
  }

  const nextStep = () => {
    setError(null)
    
    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    
    setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!selectedCondominium?.id) {
        throw new Error('Nenhum condomínio selecionado')
      }

      const submitData = new FormData()
      
      submitData.append('condominiumId', selectedCondominium.id)
      submitData.append('name', formData.name)
      submitData.append('email', formData.email)
      submitData.append('phone', formData.phone)
      submitData.append('document', formData.document)
      submitData.append('documentType', formData.documentType)
      submitData.append('birthDate', formData.birthDate)
      submitData.append('unitId', formData.unitId)
      submitData.append('relationshipType', formData.relationshipType)
      submitData.append('emergencyContact', formData.emergencyContact)
      submitData.append('vehiclePlates', formData.vehiclePlates.filter(p => p.trim()).join(','))

      faceImages.forEach((file, index) => {
        submitData.append(`faceImage_${index}`, file)
      })

      const response = await fetch('/api/residents', {
        method: 'POST',
        body: submitData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar morador')
      }

      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
      
      onSuccess()
      onClose()
      
      // Reset form
      setCurrentStep(1)
      setFormData({
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
        faceRecognitionEnabled: false
      })
      setFaceImages([])
      setImagePreviewUrls([])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="w-5 h-5" />
        Dados Pessoais
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Nome Completo *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome completo do morador"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <div className="relative">
            <Mail className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Telefone *</label>
          <div className="relative">
            <Phone className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Documento</label>
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
          <label className="block text-sm font-medium mb-1">Número do Documento *</label>
          <div className="relative">
            <FileText className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.document}
              onChange={(e) => handleInputChange('document', e.target.value)}
              className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contato de Emergência</label>
          <div className="relative">
            <Phone className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={formData.emergencyContact}
              onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
              className="w-full pl-8 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Building className="w-5 h-5" />
        Informações da Unidade
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Unidade *</label>
          {loadingUnits ? (
            <div className="p-2 text-gray-500">Carregando unidades...</div>
          ) : (
            <select
              value={formData.unitId}
              onChange={(e) => handleInputChange('unitId', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma unidade</option>
              {units.filter(unit => !unit.isOccupied).map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.block} - Apt {unit.number}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Tipo de Relacionamento</label>
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

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Placas de Veículos</label>
          {formData.vehiclePlates.map((plate, index) => (
            <div key={index} className="flex gap-2 mb-2">
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
              size="sm"
              onClick={addVehiclePlate}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Veículo
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
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
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="faceRecognition" className="text-sm font-medium">
            Habilitar reconhecimento facial
          </label>
        </div>

        {formData.faceRecognitionEnabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Imagens para Treinamento (máximo 15)
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Adicione múltiplas fotos do rosto do morador para melhorar a precisão do reconhecimento.
                Use fotos com boa iluminação e diferentes ângulos.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={faceImages.length >= 15}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Arquivo ({faceImages.length}/15)
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={openCamera}
                  disabled={faceImages.length >= 15}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Usar Câmera
                </Button>
              </div>
            </div>

            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={url}
                      alt={`Face ${index + 1}`}
                      width={64}
                      height={64}
                      className="w-full h-16 object-cover rounded border"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

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

  if (!isOpen) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Cadastrar Novo Morador">
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
                  {loading ? 'Cadastrando...' : 'Cadastrar Morador'}
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
