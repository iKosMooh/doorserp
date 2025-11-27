'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CameraIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/components/ui/toast';
import { formatCPFInput, formatPhoneInput } from '@/lib/utils';

interface Unit {
  id: string;
  block: string;
  number: string;
  floor?: string;
}

interface Resident {
  id: string;
  user: {
    id: string;
    name: string;
  };
  unit: {
    block: string;
    number: string;
  };
}

interface CreateGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident?: Resident; // For backward compatibility
  unit?: Unit; // New prop for unit-based creation
  residents?: Resident[]; // Residents in the unit
}

export default function CreateGuestModal({ isOpen, onClose, resident, unit, residents = [] }: CreateGuestModalProps) {
  const { showToast } = useToast()
  // Determine the unit and available residents
  const currentUnit = unit || resident?.unit;
  const availableResidents = residents.length > 0 ? residents : (resident ? [resident] : []);
  const defaultResidentId = resident?.id || (availableResidents.length > 0 ? availableResidents[0].id : '');

  const [formData, setFormData] = useState({
    name: '',
    document: '',
    phone: '',
    validFrom: '',
    validUntil: '',
    maxEntries: 10,
    observations: '',
    invitedBy: defaultResidentId
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para reconhecimento facial
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Configurar datas padrão quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const maxDate = new Date(now);
      maxDate.setDate(now.getDate() + 2); // Máximo 2 dias

      setFormData(prev => ({
        ...prev,
        validFrom: formatDateTimeLocal(now),
        validUntil: formatDateTimeLocal(maxDate)
      }));

      // Detectar se é mobile e enumerar câmeras
      detectDeviceAndCameras();
    }
  }, [isOpen]);

  // Detectar tipo de dispositivo e câmeras disponíveis
  const detectDeviceAndCameras = async () => {
    // Detectar se é mobile
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(isMobileDevice);
    console.log('📱 Dispositivo:', isMobileDevice ? 'Mobile' : 'Desktop');

    try {
      // Verificar se getUserMedia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso à câmera');
      }

      console.log('🔍 Solicitando permissão para câmera...');
      // Solicitar permissão para câmera
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('✅ Permissão concedida');
      
      // Parar stream temporário
      tempStream.getTracks().forEach(track => track.stop());
      
      // Enumerar dispositivos de mídia
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log(`📹 Câmeras encontradas: ${videoDevices.length}`, videoDevices);
      setAvailableCameras(videoDevices);
      
      // Selecionar câmera padrão (frontal para mobile, primeira disponível para desktop)
      if (videoDevices.length > 0) {
        const defaultCamera = isMobileDevice 
          ? videoDevices.find(device => device.label.toLowerCase().includes('front')) || videoDevices[0]
          : videoDevices[0];
        
        console.log('🎯 Câmera padrão selecionada:', defaultCamera.label || defaultCamera.deviceId);
        setSelectedCameraId(defaultCamera.deviceId);
      } else {
        setError('Nenhuma câmera encontrada no dispositivo');
      }
    } catch (error) {
      console.error('❌ Erro ao detectar câmeras:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`Erro ao acessar câmeras: ${errorMessage}. Verifique as permissões no navegador.`);
    }
  };

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Função para iniciar a câmera
  const startCamera = async () => {
    try {
      console.log('🎥 Iniciando câmera...', { selectedCameraId, isMobile });
      
      // Parar stream anterior se existir
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: isMobile ? 'user' : undefined,
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined
        }
      };

      console.log('📹 Constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Stream obtido:', mediaStream);
      console.log('📊 Stream info:', {
        active: mediaStream.active,
        tracks: mediaStream.getTracks().length,
        videoTracks: mediaStream.getVideoTracks().map(t => ({ 
          id: t.id, 
          label: t.label, 
          enabled: t.enabled, 
          readyState: t.readyState 
        }))
      });
      
      // Definir stream e mostrar câmera (useEffect vai aplicar ao vídeo)
      setStream(mediaStream);
      setShowCamera(true);
      
    } catch (error) {
      console.error('❌ Erro ao acessar câmera:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`Erro ao acessar câmera: ${errorMessage}. Verifique as permissões.`);
    }
  };

  // Função para trocar câmera
  const switchCamera = async (deviceId: string) => {
    console.log('🔄 Trocando câmera para:', deviceId);
    setSelectedCameraId(deviceId);
    
    if (showCamera && stream) {
      // Parar câmera atual
      stream.getTracks().forEach(track => {
        console.log('⏹️ Parando track:', track.label);
        track.stop();
      });
      
      // Iniciar nova câmera
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: isMobile ? 'user' : undefined,
            deviceId: { exact: deviceId }
          }
        };

        console.log('📹 Novas constraints:', constraints);
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Nova câmera obtida');
        console.log('📊 Novo stream info:', {
          active: mediaStream.active,
          tracks: mediaStream.getTracks().length,
          videoTracks: mediaStream.getVideoTracks().map(t => ({ 
            id: t.id, 
            label: t.label, 
            enabled: t.enabled, 
            readyState: t.readyState 
          }))
        });
        
        // Atualizar stream (useEffect vai aplicar ao vídeo)
        setStream(mediaStream);
        
      } catch (error) {
        console.error('❌ Erro ao trocar câmera:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(`Erro ao trocar câmera: ${errorMessage}`);
      }
    }
  };

  // Função para parar a câmera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Função para capturar foto
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        if (faceImages.length < 2) {
          setFaceImages(prev => [...prev, imageData]);
          
          if (faceImages.length >= 1) {
            stopCamera();
          }
        }
      }
    }
  };

  // Função para remover foto
  const removePhoto = (index: number) => {
    setFaceImages(prev => prev.filter((_, i) => i !== index));
  };

  // Limpar stream quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setFaceImages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Garantir que o stream seja aplicado ao vídeo quando disponível
  useEffect(() => {
    const applyStreamToVideo = async () => {
      if (stream && videoRef.current && showCamera) {
        console.log('🎥 [useEffect] Aplicando stream ao elemento video');
        
        try {
          // Definir srcObject
          videoRef.current.srcObject = stream;
          
          // Aguardar um momento para o vídeo processar
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Forçar play
          if (videoRef.current.paused) {
            console.log('📺 [useEffect] Vídeo pausado, tentando reproduzir...');
            try {
              await videoRef.current.play();
              console.log('✅ [useEffect] Vídeo reproduzindo após aplicar stream');
            } catch (playError) {
              console.error('❌ [useEffect] Erro ao reproduzir após aplicar stream:', playError);
              
              // Tentar novamente após delay
              setTimeout(async () => {
                if (videoRef.current) {
                  try {
                    await videoRef.current.play();
                    console.log('✅ [useEffect] Vídeo reproduzindo na segunda tentativa');
                  } catch (retryError) {
                    console.error('❌ [useEffect] Falha na segunda tentativa:', retryError);
                  }
                }
              }, 200);
            }
          } else {
            console.log('✅ [useEffect] Vídeo já está reproduzindo');
          }
        } catch (error) {
          console.error('❌ [useEffect] Erro ao aplicar stream:', error);
        }
      }
    };
    
    applyStreamToVideo();
  }, [stream, showCamera]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'maxEntries') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }

    if (!formData.validFrom || !formData.validUntil) {
      setError('Período de validade é obrigatório');
      return false;
    }

    const validFrom = new Date(formData.validFrom);
    const validUntil = new Date(formData.validUntil);
    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + 2);

    if (validFrom < now) {
      setError('Data de início não pode ser no passado');
      return false;
    }

    if (validUntil <= validFrom) {
      setError('Data de fim deve ser posterior à data de início');
      return false;
    }

    if (validUntil > maxDate) {
      setError('Período máximo de acesso é de 2 dias');
      return false;
    }

    if (formData.maxEntries < 1 || formData.maxEntries > 50) {
      setError('Número de entradas deve estar entre 1 e 50');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          residentId: formData.invitedBy,
          faceImages: faceImages // Incluir as fotos capturadas
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar convidado');
      }

      if (data.success) {
        showToast(`Convidado criado com sucesso! Código de acesso: ${data.guest.accessCode}`, 'success', 8000)
        onClose();
      } else {
        setError(data.message || 'Erro desconhecido');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao criar convidado', 'error')
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setFaceImages([]);
    setFormData({
      name: '',
      document: '',
      phone: '',
      validFrom: '',
      validUntil: '',
      maxEntries: 10,
      observations: '',
      invitedBy: defaultResidentId
    });
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo Convidado">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações da Unidade/Morador */}
        <Card className="p-4 bg-blue-50">
          <div className="text-sm text-blue-800">
            <div className="font-medium">Convidado para:</div>
            {currentUnit && (
              <div>Unidade: {currentUnit.block}{currentUnit.number}</div>
            )}
            {availableResidents.length > 1 ? (
              <div>
                <label className="block text-sm font-medium text-blue-800 mt-2 mb-1">
                  Convidado por:
                </label>
                <select
                  value={formData.invitedBy}
                  onChange={(e) => setFormData(prev => ({ ...prev, invitedBy: e.target.value }))}
                  className="w-full p-2 border border-blue-300 rounded-md text-blue-900"
                  required
                >
                  {availableResidents.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.user.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : availableResidents.length === 1 ? (
              <div>{availableResidents[0].user.name}</div>
            ) : (
              <div className="text-red-600">Nenhum morador disponível</div>
            )}
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="Nome completo do convidado"
            />
          </div>

          {/* Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF/RG
            </label>
            <input
              type="text"
              name="document"
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: formatCPFInput(e.target.value) })}
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })}
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          {/* Data de Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Válido a partir de *
            </label>
            <input
              type="datetime-local"
              name="validFrom"
              value={formData.validFrom}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
            />
          </div>

          {/* Data de Fim */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Válido até *
            </label>
            <input
              type="datetime-local"
              name="validUntil"
              value={formData.validUntil}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
            />
          </div>

          {/* Máximo de Entradas */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número máximo de entradas
            </label>
            <select
              name="maxEntries"
              value={formData.maxEntries}
              onChange={handleInputChange}
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-base sm:text-sm"
            >
              {[1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 50].map(num => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'entrada' : 'entradas'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Limite de entradas durante o período de validade
            </p>
          </div>

          {/* Observações */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
              placeholder="Informações adicionais sobre o convidado..."
            />
          </div>

          {/* Reconhecimento Facial */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <EyeIcon className="w-4 h-4 inline mr-1" />
              Reconhecimento Facial (Opcional)
            </label>
            
            <div className="space-y-4">
              {/* Fotos capturadas */}
              {faceImages.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {faceImages.map((image, index) => (
                    <div key={index} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Foto {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Seleção de Câmera - Sempre visível quando há múltiplas câmeras */}
              {availableCameras.length > 1 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    📹 Selecionar Câmera {isMobile ? '(Detectado: Mobile)' : '(Detectado: Desktop)'}
                  </label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => switchCamera(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    disabled={!showCamera && faceImages.length === 0}
                  >
                    {availableCameras.map((camera, index) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Câmera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    {showCamera ? '✅ Câmera ativa - você pode trocar a qualquer momento' : '⏸️ Abra a câmera para começar a captura'}
                  </p>
                </div>
              )}

              {/* Informação quando há apenas uma câmera */}
              {availableCameras.length === 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-700">
                    📹 <strong>1 câmera</strong> detectada: {availableCameras[0].label || 'Câmera padrão'}
                  </p>
                </div>
              )}

              {/* Câmera com Preview */}
              {showCamera && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-md min-h-[360px] flex items-center justify-center overflow-hidden">
                    {/* Indicador de carregamento */}
                    {!stream && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                          <p>Carregando câmera...</p>
                        </div>
                      </div>
                    )}
                    
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`rounded-md border-2 border-blue-300 shadow-lg max-w-full h-auto ${!stream ? 'opacity-0' : 'opacity-100'}`}
                      style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}
                      onLoadedMetadata={(e) => {
                        console.log('📺 onLoadedMetadata disparado');
                        const videoElement = e.currentTarget;
                        videoElement.play().catch(err => {
                          console.error('❌ Erro no onLoadedMetadata play:', err);
                        });
                      }}
                      onCanPlay={(e) => {
                        console.log('🎬 onCanPlay disparado');
                        const videoElement = e.currentTarget;
                        videoElement.play().catch(err => {
                          console.error('❌ Erro no onCanPlay play:', err);
                        });
                      }}
                      onPlay={() => {
                        console.log('▶️ Vídeo está reproduzindo');
                      }}
                      onError={(e) => {
                        console.error('❌ Erro no elemento video:', e);
                      }}
                    />
                    
                    {/* Overlay com instruções */}
                    {stream && (
                      <>
                        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          Preview da Câmera
                        </div>
                        
                        {/* Indicador de fotos capturadas */}
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          {faceImages.length}/2 fotos
                        </div>
                      </>
                    )}
                  </div>

                  {/* Seletor de câmera durante preview */}
                  {availableCameras.length > 1 && (
                    <div className="flex items-center justify-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Trocar câmera:</label>
                      <select
                        value={selectedCameraId}
                        onChange={(e) => switchCamera(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {availableCameras.map((camera, index) => (
                          <option key={camera.deviceId} value={camera.deviceId}>
                            {camera.label || `Câmera ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-center space-x-3">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      disabled={faceImages.length >= 2}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CameraIcon className="w-4 h-4 mr-2" />
                      Capturar Foto
                    </Button>
                    <Button
                      type="button"
                      onClick={stopCamera}
                      variant="outline"
                    >
                      Parar Câmera
                    </Button>
                  </div>
                </div>
              )}

              {/* Botões de controle */}
              {!showCamera && faceImages.length < 2 && (
                <Button
                  type="button"
                  onClick={startCamera}
                  disabled={availableCameras.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  <CameraIcon className="w-4 h-4 mr-2" />
                  {faceImages.length === 0 ? 'Iniciar Câmera para Reconhecimento' : 'Adicionar Segunda Foto'}
                </Button>
              )}

              <div className="text-xs text-gray-500 space-y-1">
                {faceImages.length === 0 && (
                  <p>📷 Você pode adicionar até 2 fotos para habilitar o reconhecimento facial do convidado.</p>
                )}
                {faceImages.length === 1 && (
                  <p>📷 Você pode adicionar mais 1 foto para melhorar o reconhecimento.</p>
                )}
                {faceImages.length === 2 && (
                  <p>✅ Reconhecimento facial configurado com 2 fotos.</p>
                )}
                {availableCameras.length === 0 && (
                  <p>⚠️ Nenhuma câmera detectada. Verifique as permissões.</p>
                )}
                {availableCameras.length > 1 && (
                  <p>📱 {availableCameras.length} câmeras disponíveis{isMobile ? ' (mobile detectado)' : ' (desktop detectado)'}.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Aviso sobre o período */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="text-yellow-800 text-sm">
            <div className="font-medium mb-1">⚠️ Importante:</div>
            <ul className="text-xs space-y-1">
              <li>• Período máximo de acesso: 2 dias</li>
              <li>• O código de acesso será gerado automaticamente</li>
              <li>• O convidado deve apresentar documento de identificação</li>
              <li>• Todas as entradas serão registradas no sistema</li>
            </ul>
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            disabled={loading}
            className="min-h-[44px] w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto order-1 sm:order-2"
          >
            {loading ? 'Criando...' : 'Criar Convidado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
