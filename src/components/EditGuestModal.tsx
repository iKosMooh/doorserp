"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { AlertCircle, Calendar, User, FileText, Camera, Upload, X } from "lucide-react"
import { formatCPFInput, formatPhoneInput } from "@/lib/utils"

interface Guest {
  id: string
  name: string
  document?: string
  phone?: string
  validFrom: string
  validUntil: string
  accessCode: string
  currentEntries: number
  maxEntries: number
  isActive: boolean
  observations?: string
  faceRecognitionEnabled?: boolean
}

interface EditGuestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  guest: Guest | null
}

interface FormData {
  name: string
  document: string
  phone: string
  validFrom: string
  validUntil: string
  maxEntries: number
  observations: string
  isActive: boolean
  faceRecognitionEnabled: boolean
}

export function EditGuestModal({ isOpen, onClose, onSuccess, guest }: EditGuestModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Face recognition
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
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    document: '',
    phone: '',
    validFrom: '',
    validUntil: '',
    maxEntries: 10,
    observations: '',
    isActive: true,
    faceRecognitionEnabled: false
  })

  // Load guest data when modal opens
  useEffect(() => {
    if (guest && isOpen) {
      // Fetch complete guest data from API
      const fetchGuestData = async () => {
        try {
          const response = await fetch(`/api/guests/${guest.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.guest) {
              const guestData = data.guest
              setFormData({
                name: guestData.name,
                document: guestData.document || '',
                phone: guestData.phone || '',
                validFrom: new Date(guestData.validFrom).toISOString().slice(0, 16),
                validUntil: new Date(guestData.validUntil).toISOString().slice(0, 16),
                maxEntries: guestData.maxEntries,
                observations: guestData.observations || '',
                isActive: guestData.isActive,
                faceRecognitionEnabled: guestData.faceRecognitionEnabled || false
              })
              
              // Load existing face images if available
              if (guestData.faceRecognitionFolder) {
                loadExistingImages(guestData.faceRecognitionFolder)
              }
            }
          }
        } catch (err) {
          console.error('Erro ao buscar dados do convidado:', err)
        }
      }
      
      fetchGuestData()
      setError(null)
    }
  }, [guest, isOpen])

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFaceImages([])
      setImagePreviewUrls([])
      setExistingImageFiles([])
      setLoadingExistingImages(false)
      setError(null)
    }
  }, [isOpen])

  // Camera cleanup
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
      imagePreviewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [cameraStream, imagePreviewUrls])

  // Load existing face images
  const loadExistingImages = async (folderName: string) => {
    try {
      setLoadingExistingImages(true)
      const response = await fetch(`/api/face-recognition/images?folder=${folderName}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.images && result.images.length > 0) {
          const existingFiles: File[] = []
          const existingPreviewUrls: string[] = []
          
          for (const imageData of result.images) {
            try {
              const imageResponse = await fetch(imageData.url)
              if (imageResponse.ok) {
                const blob = await imageResponse.blob()
                const fileName = imageData.name || `existing_${Date.now()}_${existingFiles.length}.jpg`
                const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
                
                existingFiles.push(file)
                existingPreviewUrls.push(imageData.url)
              }
            } catch (fetchError) {
              console.error('Erro ao processar imagem:', imageData.url, fetchError)
            }
          }
          
          if (existingFiles.length > 0) {
            setFaceImages(existingFiles)
            setImagePreviewUrls(existingPreviewUrls)
            setExistingImageFiles(existingFiles)
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar imagens existentes:', err)
    } finally {
      setLoadingExistingImages(false)
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
    const isExistingImage = index < existingImageFiles.length
    
    if (isExistingImage) {
      setExistingImageFiles(prev => prev.filter((_, i) => i !== index))
    }
    
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
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(error => {
              console.error('Erro ao reproduzir vídeo:', error)
              setError('Erro ao iniciar visualização da câmera')
            })
          }
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

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused) {
      setError('Câmera não está pronta. Aguarde um momento e tente novamente.')
      return
    }

    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
      
      setCaptureFlash(true)
      setTimeout(() => setCaptureFlash(false), 200)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
          const url = URL.createObjectURL(blob)
          
          setFaceImages(prev => [...prev, file])
          setImagePreviewUrls(prev => [...prev, url])
          setError(null)
          
          setTimeout(() => {
            if (!isStartingCameraRef.current && showCameraModal) {
              startCamera()
            }
          }, 300)
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

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório')
      return false
    }

    if (!formData.validFrom || !formData.validUntil) {
      setError('Datas de validade são obrigatórias')
      return false
    }

    const validFrom = new Date(formData.validFrom)
    const validUntil = new Date(formData.validUntil)

    if (validFrom >= validUntil) {
      setError('Data de início deve ser anterior à data de fim')
      return false
    }

    if (formData.maxEntries < 1) {
      setError('Número máximo de entradas deve ser pelo menos 1')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!guest) return
    
    if (!validateForm()) return

    // Validação de fotos se reconhecimento facial estiver habilitado
    if (formData.faceRecognitionEnabled && faceImages.length < 1) {
      setError('Adicione pelo menos 1 foto para ativar o reconhecimento facial')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const formDataToSend = new FormData()
      
      // Add basic fields
      formDataToSend.append('name', formData.name)
      formDataToSend.append('document', formData.document)
      formDataToSend.append('phone', formData.phone)
      formDataToSend.append('validFrom', new Date(formData.validFrom).toISOString())
      formDataToSend.append('validUntil', new Date(formData.validUntil).toISOString())
      formDataToSend.append('maxEntries', formData.maxEntries.toString())
      formDataToSend.append('observations', formData.observations)
      formDataToSend.append('isActive', String(formData.isActive))
      formDataToSend.append('faceRecognitionEnabled', String(formData.faceRecognitionEnabled))

      // Add face images if face recognition is enabled
      if (formData.faceRecognitionEnabled && faceImages.length > 0) {
        faceImages.forEach((file, index) => {
          formDataToSend.append(`faceImage_${index}`, file)
        })
      }

      const response = await fetch(`/api/guests/${guest.id}`, {
        method: 'PUT',
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar convidado')
      }

      if (data.success) {
        // Limpar cache do localStorage para forçar refresh
        localStorage.removeItem('authorizedPersons')
        onSuccess()
        onClose()
      } else {
        throw new Error(data.message || 'Erro desconhecido')
      }
    } catch (err) {
      console.error('Erro ao atualizar convidado:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  if (!isOpen || !guest) return null

  const isExpired = new Date(guest.validUntil) < new Date()
  const isExhausted = guest.currentEntries >= guest.maxEntries

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Editar Convidado: ${guest.name}`}>
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Status do Convidado */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-black mb-3">Status Atual</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Código:</span>
              <div className="font-mono font-medium text-black">{guest.accessCode}</div>
            </div>
            <div>
              <span className="text-gray-600">Entradas:</span>
              <div className="font-medium text-black">{guest.currentEntries}/{guest.maxEntries}</div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className={`font-medium ${
                formData.isActive && !isExpired && !isExhausted 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formData.isActive && !isExpired && !isExhausted ? 'Ativo' : 'Inativo/Expirado'}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Reconhecimento:</span>
              <div className={`font-medium ${formData.faceRecognitionEnabled ? 'text-blue-600' : 'text-gray-600'}`}>
                {formData.faceRecognitionEnabled ? 'Ativo' : 'Inativo'}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Dados Pessoais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black flex items-center gap-2">
            <User className="w-5 h-5" />
            Dados Pessoais
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 sm:py-2 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
                placeholder="Nome do convidado"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Documento
              </label>
              <input
                type="text"
                value={formData.document}
                onChange={(e) => handleInputChange('document', formatCPFInput(e.target.value))}
                className="w-full px-4 py-3 sm:py-2 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', formatPhoneInput(e.target.value))}
                className="w-full px-4 py-3 sm:py-2 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Máximo de Entradas *
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={formData.maxEntries}
                onChange={(e) => handleInputChange('maxEntries', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 sm:py-2 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* Período de Validade */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período de Validade
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Data/Hora de Início *
              </label>
              <input
                type="datetime-local"
                value={formData.validFrom}
                onChange={(e) => handleInputChange('validFrom', e.target.value)}
                className="w-full px-4 py-3 sm:py-2 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Data/Hora de Fim *
              </label>
              <input
                type="datetime-local"
                value={formData.validUntil}
                onChange={(e) => handleInputChange('validUntil', e.target.value)}
                className="w-full px-4 py-3 sm:py-2 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Configurações
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-black">
                Convidado ativo
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="faceRecognition"
                checked={formData.faceRecognitionEnabled}
                onChange={(e) => handleInputChange('faceRecognitionEnabled', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="faceRecognition" className="text-sm font-medium text-black">
                Habilitar reconhecimento facial
              </label>
            </div>
          </div>

          {/* Face Recognition Photo Upload Section */}
          {formData.faceRecognitionEnabled && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-semibold text-black">
                  Fotos para Reconhecimento Facial
                </h4>
              </div>
              
              <p className="text-xs text-black mb-4">
                Adicione fotos do convidado para ativar o reconhecimento facial. 
                É necessária pelo menos 1 foto. Máximo: 15 fotos.
              </p>

              {loadingExistingImages && (
                <div className="text-center py-4 text-black">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm">Carregando fotos existentes...</p>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />

              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={faceImages.length >= 15 || loadingExistingImages}
                  className="flex items-center justify-center gap-2 min-h-[44px] px-6"
                >
                  <Upload className="w-4 h-4" />
                  Enviar Foto
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={openCamera}
                  disabled={faceImages.length >= 15 || loadingExistingImages}
                  className="flex items-center justify-center gap-2 min-h-[44px] px-6"
                >
                  <Camera className="w-4 h-4" />
                  Usar Câmera
                </Button>
              </div>

              {faceImages.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-black mb-2">
                    {faceImages.length} foto{faceImages.length !== 1 ? 's' : ''} adicionada{faceImages.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square group">
                        <Image
                          src={url}
                          alt={`Foto ${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover foto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Observações
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 sm:py-2 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
              placeholder="Observações adicionais sobre o convidado..."
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="min-h-[44px] w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="min-h-[44px] w-full sm:w-auto order-1 sm:order-2"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-black">Capturar Foto</h3>
              <button
                onClick={closeCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Seletor de Câmera - Sempre visível quando há múltiplas câmeras */}
            {cameras.length > 1 && (
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium text-black">
                  📹 Selecionar Câmera
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full px-4 py-2 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {cameras.map((camera, index) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Câmera ${index + 1}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  ✅ Câmera ativa - você pode trocar a qualquer momento
                </p>
              </div>
            )}

            {/* Informação quando há apenas uma câmera */}
            {cameras.length === 1 && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-700">
                  📹 <strong>1 câmera</strong> detectada: {cameras[0].label || 'Câmera padrão'}
                </p>
              </div>
            )}

            <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
              {captureFlash && (
                <div className="absolute inset-0 bg-white z-10 animate-ping" />
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraStream || faceImages.length >= 15}
                className="flex-1 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Camera className="w-5 h-5" />
                Capturar Foto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeCamera}
                className="min-h-[44px]"
              >
                Fechar
              </Button>
            </div>

            {faceImages.length >= 15 && (
              <p className="text-sm text-amber-600 mt-2 text-center">
                Limite de 15 fotos atingido
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}