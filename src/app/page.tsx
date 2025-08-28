'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [personName, setPersonName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [personList, setPersonList] = useState<string[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const labelsRef = useRef<unknown[]>([]);
  const [labels, setLabels] = useState<unknown[]>([]);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasHighConfidenceMatch, setHasHighConfidenceMatch] = useState(false);
  const [isPausedAfterMatch, setIsPausedAfterMatch] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Funções para cache local
  const saveLabelDescriptorsToCache = (labelDescriptors: unknown[]) => {
    try {
      const cacheData = {
        timestamp: Date.now(),
        labels: labelDescriptors.map((label: unknown) => {
          const l = label as { label: string; descriptors: Float32Array[] };
          return {
            label: l.label,
            descriptors: l.descriptors.map(desc => Array.from(desc)) // Converter Float32Array para Array normal
          };
        })
      };
      localStorage.setItem('faceapi_labels_cache', JSON.stringify(cacheData));
      console.log('💾 Labels salvos no cache local');
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  };

  const loadLabelDescriptorsFromCache = async () => {
    try {
      const cached = localStorage.getItem('faceapi_labels_cache');
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      
      // Verificar se o cache não está muito antigo (24 horas)
      const isExpired = Date.now() - cacheData.timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        localStorage.removeItem('faceapi_labels_cache');
        console.log('🗑️ Cache expirado, removido');
        return null;
      }

      // @ts-expect-error - faceapi is loaded dynamically
      const faceapi = window.faceapi;
      if (!faceapi) return null;

      const labelDescriptors = cacheData.labels.map((cached: { label: string; descriptors: number[][] }) => {
        const descriptors = cached.descriptors.map(desc => new Float32Array(desc));
        return new faceapi.LabeledFaceDescriptors(cached.label, descriptors);
      });

      console.log('⚡ Labels carregados do cache:', labelDescriptors.length, 'pessoas');
      return labelDescriptors;
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
      localStorage.removeItem('faceapi_labels_cache');
      return null;
    }
  };

  const clearLabelsCache = () => {
    localStorage.removeItem('faceapi_labels_cache');
    console.log('🗑️ Cache de labels limpo');
  };

  useEffect(() => {
    // Carregar face-api.js apenas uma vez
    if (faceApiLoaded) return;
    
    // Verificar se o script já foi carregado
    const existingScript = document.querySelector('script[src="/assets/lib/face-api/face-api.min.js"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = '/assets/lib/face-api/face-api.min.js';
    script.onload = async () => {
      // @ts-expect-error - faceapi is loaded dynamically
      const faceapi = window.faceapi;
      
      try {
        // Suprimir warnings do console
        const originalWarn = console.warn;
        const originalLog = console.log;
        console.warn = () => {};
        console.log = (msg: unknown) => {
          if (typeof msg === 'string' && (
            msg.includes('backend was already registered') ||
            msg.includes('Platform browser has already been set')
          )) {
            return;
          }
          originalLog(msg);
        };

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/assets/lib/face-api/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/assets/lib/face-api/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/assets/lib/face-api/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/assets/lib/face-api/models'),
          faceapi.nets.ageGenderNet.loadFromUri('/assets/lib/face-api/models'),
          faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/lib/face-api/models'),
          faceapi.nets.mtcnn.loadFromUri('/assets/lib/face-api/models')
        ]);
        
        // Restaurar console
        console.warn = originalWarn;
        console.log = originalLog;
        
        console.log('✅ Todos os modelos carregados com sucesso');
        setFaceApiLoaded(true);
        loadCameras();
        updatePersonList();
        
        // Carregar labels imediatamente após modelos estarem prontos
        setTimeout(async () => {
          await loadLabels();
        }, 500); // Reduzir delay para carregamento mais rápido
      } catch (error) {
        console.error('Erro ao carregar modelos:', error);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      // Limpar timeout se existir
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
    } catch (error) {
      console.error('Erro ao carregar câmeras:', error);
    }
  };

  const startVideo = async () => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCurrentStream(stream);
      
      // Garantir que os labels estejam carregados quando a câmera iniciar
      if (labelsRef.current.length === 0) {
        setTimeout(async () => {
          await loadLabels();
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao iniciar câmera:', error);
    }
  };

  const capturePhoto = async () => {
    if (!personName.trim()) {
      alert('Por favor, insira o nome da pessoa');
      return;
    }

    if (!videoRef.current || !captureCanvasRef.current || !faceApiLoaded) {
      alert('Sistema ainda carregando. Por favor, aguarde.');
      return;
    }

    if (capturedPhotos.length >= 5) {
      alert('Máximo de 5 fotos por pessoa atingido.');
      return;
    }

    setIsCapturing(true);

    try {
      // @ts-expect-error - faceapi is loaded dynamically
      const faceapi = window.faceapi;
      
      // Verificar se os modelos estão realmente carregados
      if (!faceapi.nets.tinyFaceDetector.isLoaded || 
          !faceapi.nets.faceLandmark68Net.isLoaded || 
          !faceapi.nets.faceRecognitionNet.isLoaded) {
        alert('Modelos ainda carregando. Por favor, aguarde um momento.');
        setIsCapturing(false);
        return;
      }
      
      const canvas = captureCanvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        alert('Nenhum rosto detectado. Por favor, tente novamente.');
        setIsCapturing(false);
        return;
      }

      const imageData = canvas.toDataURL('image/jpeg');
      const photoNumber = capturedPhotos.length + 1;
      
      // Salvar a foto no servidor
      const response = await fetch('/api/save-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personName: personName.trim(),
          imageData,
          photoNumber
        })
      });

      if (response.ok) {
        // Adicionar a foto à lista local
        setCapturedPhotos(prev => [...prev, imageData]);
        
        setStatusMessage(`Foto ${photoNumber}/5 capturada com sucesso!`);
        setTimeout(() => setStatusMessage(''), 3000);
        
        // Se capturou 5 fotos, finalizar cadastro
        if (photoNumber === 5) {
          setPersonName('');
          setCapturedPhotos([]);
          updatePersonList();
          
          // Limpar cache pois temos nova pessoa
          clearLabelsCache();
          
          // Recarregar labels imediatamente após cadastro
          setTimeout(async () => {
            await loadLabels();
          }, 1000);
          
          setStatusMessage('Pessoa cadastrada com sucesso! 5 fotos salvas.');
          setTimeout(() => setStatusMessage(''), 5000);
        }
      } else {
        throw new Error('Erro ao salvar imagem no servidor');
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      alert('Erro ao capturar foto. Por favor, tente novamente.');
    } finally {
      setIsCapturing(false);
    }
  };

  const cancelCapture = async () => {
    // Se há fotos capturadas, apagar a pessoa do servidor
    if (capturedPhotos.length > 0 && personName.trim()) {
      try {
        const response = await fetch('/api/save-face', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personName: personName.trim()
          })
        });

        if (response.ok) {
          setStatusMessage(`Cadastro cancelado. Pessoa "${personName.trim()}" e suas ${capturedPhotos.length} foto(s) foram removidas.`);
          
          // Atualizar lista de pessoas
          updatePersonList();
          
          // Limpar cache e recarregar labels
          clearLabelsCache();
          setTimeout(async () => {
            await loadLabels();
          }, 500);
        } else {
          setStatusMessage('Cadastro cancelado, mas houve erro ao remover arquivos do servidor.');
        }
      } catch (error) {
        console.error('Erro ao cancelar cadastro:', error);
        setStatusMessage('Cadastro cancelado, mas houve erro ao remover arquivos do servidor.');
      }
    } else {
      setStatusMessage('Cadastro cancelado.');
    }

    // Limpar estados locais
    setPersonName('');
    setCapturedPhotos([]);
    
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const updatePersonList = async () => {
    try {
      const response = await fetch('/api/save-face');
      const data = await response.json();
      const directories = data.success ? data.persons : [];
      setPersonList(directories);
    } catch (error) {
      console.error('Erro ao atualizar lista de pessoas:', error);
      setPersonList([]);
    }
  };

  const loadLabels = async () => {
    if (!faceApiLoaded) return;
    
    try {
      // @ts-expect-error - faceapi is loaded dynamically
      const faceapi = window.faceapi;
      
      // Tentar carregar do cache primeiro
      const cachedLabels = await loadLabelDescriptorsFromCache();
      if (cachedLabels && cachedLabels.length > 0) {
        console.log('⚡ Usando labels do cache');
        setLabels(cachedLabels);
        labelsRef.current = cachedLabels;
        return cachedLabels;
      }

      console.log('🔄 Cache não disponível, carregando labels do servidor...');
      
      // Buscar lista de pessoas
      const response = await fetch('/api/save-face');
      const data = await response.json();
      
      if (!data.success || !data.persons || data.persons.length === 0) {
        console.log('📝 Nenhuma pessoa cadastrada');
        setLabels([]);
        labelsRef.current = [];
        return [];
      }
      
      const newLabels = [];
      
      for (const pessoa of data.persons) {
        try {
          // Buscar fotos específicas desta pessoa
          const photosResponse = await fetch(`/api/save-face?person=${encodeURIComponent(pessoa)}`);
          const photosData = await photosResponse.json();
          
          if (!photosData.success || !photosData.photos || photosData.photos.length === 0) {
            console.log(`📂 ${pessoa}: Nenhuma foto encontrada`);
            continue;
          }
          
          console.log(`📂 ${pessoa}: Encontradas ${photosData.photos.length} foto(s) - ${photosData.photos.join(', ')}`);
          
          const descriptors = [];
          
          // Carregar apenas as fotos que realmente existem
          for (const photoName of photosData.photos) {
            try {
              const imgPath = `/assets/lib/face-api/labels/${pessoa}/${photoName}`;
              const img = await faceapi.fetchImage(imgPath);
              
              const detection = await faceapi
                .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();
              
              if (detection && detection.descriptor) {
                descriptors.push(detection.descriptor);
                console.log(`📷 ${pessoa} - ${photoName}: Descriptor extraído com sucesso`);
              } else {
                console.log(`📷 ${pessoa} - ${photoName}: Nenhum rosto detectado na imagem`);
              }
            } catch (error) {
              console.log(`📷 ${pessoa} - ${photoName}: Erro ao carregar foto`, error);
            }
          }
          
          // Se encontrou pelo menos uma foto válida, adicionar aos labels
          if (descriptors.length > 0) {
            const labeledDescriptor = new faceapi.LabeledFaceDescriptors(pessoa, descriptors);
            newLabels.push(labeledDescriptor);
            console.log(`✅ ${pessoa}: ${descriptors.length} de ${photosData.photos.length} foto(s) processada(s) com sucesso`);
          } else {
            console.log(`❌ ${pessoa}: Nenhuma foto válida processada`);
          }
        } catch (error) {
          console.log(`❌ Erro ao processar fotos de ${pessoa}:`, error);
        }
      }
      
      console.log(`📋 Labels carregados: ${newLabels.length} pessoa(s) com dados válidos`);
      
      // Salvar no cache para próxima vez
      if (newLabels.length > 0) {
        saveLabelDescriptorsToCache(newLabels);
      }
      
      setLabels(newLabels);
      labelsRef.current = newLabels;
      return newLabels;
    } catch (error) {
      console.error('❌ Erro ao carregar labels:', error);
      setLabels([]);
      labelsRef.current = [];
      return [];
    }
  };

  const onVideoPlay = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded) return;

    // @ts-expect-error - faceapi is loaded dynamically
    const faceapi = window.faceapi;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Aguardar o vídeo estar pronto e configurar o canvas
    const setupCanvas = () => {
      if (!video.videoWidth || !video.videoHeight) {
        setTimeout(setupCanvas, 100);
        return;
      }

      const canvasSize = {
        width: video.videoWidth,
        height: video.videoHeight
      };
      
      // Sempre configurar o canvas para permitir detecção
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      faceapi.matchDimensions(canvas, canvasSize);

      // Iniciar detecção após configurar o canvas
      setTimeout(() => detectFaces(canvasSize), 1000);
    };

    const detectFaces = async (canvasSize: { width: number; height: number }) => {
      if (!video.videoWidth || !faceApiLoaded) return;
      
      // Se está pausado após um match, aguardar
      if (isPausedAfterMatch) {
        setTimeout(() => detectFaces(canvasSize), 1000);
        return;
      }
      
      // Aguardar um pouco mais se os labels ainda não estiverem prontos
      if (labelsRef.current.length === 0) {
        setTimeout(() => detectFaces(canvasSize), 1000);
        return;
      }
      
      try {
        // Verificar se os modelos estão carregados antes de detectar
        if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
          setTimeout(() => detectFaces(canvasSize), 500);
          return;
        }

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, canvasSize);
        
        // Atualizar indicador de análise baseado na presença de rostos
        // Bolinha laranja aparece sempre que há rostos detectados
        if (resizedDetections.length > 0) {
          setIsAnalyzing(true);
          console.log(`🟠 Bolinha laranja ativada - ${resizedDetections.length} rosto(s) detectado(s)`);
        } else {
          setIsAnalyzing(false);
          setHasHighConfidenceMatch(false);
          console.log('⚫ Nenhum rosto detectado - bolinhas desativadas');
        }
        
        // Usar os labels do ref para garantir sincronização
        const currentLabels = labelsRef.current;
        
        // Só criar o FaceMatcher se houver labels carregados
        let results: { label: string; distance: number }[] = [];
        let highConfidenceFound = false;
        
        if (currentLabels.length > 0) {
          try {
            // Verificação mais rigorosa dos labels
            const validLabels: { label?: string; descriptors?: Float32Array[] }[] = [];
            for (const label of currentLabels) {
              const l = label as { label?: string; descriptors?: Float32Array[] };
              // Verificar se é um LabeledFaceDescriptors válido
              if (l && l.label && l.descriptors && Array.isArray(l.descriptors) && l.descriptors.length > 0) {
                // Verificar se todos os descriptors são Float32Array válidos
                const validDescriptors = l.descriptors.filter((desc: unknown) => 
                  desc && (desc instanceof Float32Array || (Array.isArray(desc) && (desc as number[]).length === 128))
                );
                
                if (validDescriptors.length > 0) {
                  validLabels.push(l);
                }
              }
            }
            
            if (validLabels.length > 0) {
              // Aguardar para garantir que o FaceAPI está pronto
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Calcular threshold baseado na quantidade de descriptors disponíveis
              // Mais fotos = threshold mais baixo (mais preciso)
              const avgDescriptors = validLabels.reduce((sum, label) => {
                const l = label as { descriptors?: Float32Array[] };
                return sum + (l.descriptors?.length || 0);
              }, 0) / validLabels.length;
              
              // Threshold dinâmico: mais fotos = reconhecimento mais preciso
              const dynamicThreshold = Math.max(0.3, 0.6 - (avgDescriptors - 1) * 0.05);
              //console.log(`🎯 Usando threshold dinâmico: ${dynamicThreshold.toFixed(2)} (baseado em ${avgDescriptors.toFixed(1)} fotos por pessoa em média)`);
              
              const faceMatcher = new faceapi.FaceMatcher(validLabels, dynamicThreshold);
              results = resizedDetections.map((d: unknown) => {
                try {
                  const match = faceMatcher.findBestMatch((d as { descriptor: unknown }).descriptor);
                  const confidence = Math.round((1 - match.distance) * 100);
                  
                  // Verificar se há match com alta confiança
                  if (match.label !== 'unknown' && confidence >= 65) {
                    highConfidenceFound = true;
                  }
                  
                  // Log detalhado quando encontrar um match válido
                  if (match.label !== 'unknown') {
                    /*const matchedLabel = validLabels.find(label => {
                      const l = label as { label?: string };
                      return l.label === match.label;
                    }) as { label?: string; descriptors?: Float32Array[] };*/
                    
                    console.log(`✅ Pessoa reconhecida: ${match.label} | Confiança: ${confidence}% | Distância: ${match.distance.toFixed(3)}`);
                  }
                  return match;
                } catch {
                  return { label: 'unknown', distance: 1 };
                }
              });
            } else {
              results = resizedDetections.map(() => ({ label: 'unknown', distance: 1 }));
            }
          } catch (matcherError) {
            console.error('❌ Erro ao criar FaceMatcher:', matcherError);
            // Aguardar e tentar novamente na próxima detecção
            results = resizedDetections.map(() => ({ label: 'unknown', distance: 1 }));
          }
        } else {
          // Se não há labels, usar resultados padrão
          results = resizedDetections.map(() => ({ label: 'unknown', distance: 1 }));
        }

        // Se encontrou match com alta confiança, pausar por 10 segundos
        if (highConfidenceFound && !isPausedAfterMatch) {
          console.log('🎯 Match com alta confiança detectado! Pausando reconhecimento por 10 segundos...');
          
          setIsPausedAfterMatch(true);
          setHasHighConfidenceMatch(true);
          setIsAnalyzing(false);
          
          // Limpar timeout anterior se existir
          if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
          }
          
          // Configurar timeout para retomar após 10 segundos
          pauseTimeoutRef.current = setTimeout(() => {
            console.log('⏰ Retomando reconhecimento facial...');
            setIsPausedAfterMatch(false);
            setHasHighConfidenceMatch(false);
            pauseTimeoutRef.current = null;
            
            // Forçar uma nova detecção imediata após retomar
            setTimeout(() => detectFaces(canvasSize), 100);
          }, 10000); // 10 segundos
          
          // Não continuar com a detecção normal, apenas limpar canvas
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          
          // Retornar early para não processar mais nada
          return;
        }

        // Atualizar indicadores apenas se não estiver pausado
        if (!isPausedAfterMatch) {
          setHasHighConfidenceMatch(highConfidenceFound);
        }

        // Limpar canvas sempre
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Desenhar elementos visuais APENAS se o checkbox estiver marcado
        if (showLandmarks) {
          // Desenhar as caixas de detecção (contorno do rosto)
          faceapi.draw.drawDetections(canvas, resizedDetections);
          
          // Desenhar landmarks (pontos faciais)
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          // Desenhar informações sobre as faces detectadas
          resizedDetections.forEach((detection: unknown, i: number) => {
            const det = detection as {
              detection: { box: { bottomRight: unknown } };
              age: number;
              gender: string;
              genderProbability: number;
            };
            const box = det.detection.box;
            const { age, gender, genderProbability } = det;
            const { label, distance } = results[i];
            
            const confidence = Math.round((1 - distance) * 100);
            const texto = [
              `${label} (${confidence}%)`,
              `${Math.round(age)} anos`,
              `${gender === 'male' ? 'Masculino' : 'Feminino'} (${Math.round(genderProbability * 100)}%)`
            ];

            new faceapi.draw.DrawTextField(
              texto,
              box.bottomRight
            ).draw(canvas);
          });
        }
      } catch (error) {
        console.error('Erro na detecção facial:', error);
        // Não resetar isAnalyzing aqui - manter bolinha laranja se rostos foram detectados
        setHasHighConfidenceMatch(false);
      }
      
      setTimeout(() => detectFaces(canvasSize), 300);
    };

    // Iniciar a configuração do canvas
    setupCanvas();
  };

  return (
    <div className="container">
      <h1>Sistema de Reconhecimento Facial</h1>
      
      {!faceApiLoaded && (
        <div className="status-message" style={{ color: 'blue' }}>
          Carregando modelos de IA... Por favor, aguarde.
        </div>
      )}
      
      {faceApiLoaded && (
        <div className="status-message" style={{ color: labels.length > 0 ? 'green' : 'orange' }}>
          {labels.length > 0 ? (
            <div>
              <div>✅ Sistema ativo! {labels.length} pessoa(s) cadastrada(s) para reconhecimento.</div>
              <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
                Total de fotos de treinamento: {
                  labels.reduce((total: number, label) => {
                    const l = label as { descriptors?: Float32Array[] };
                    return total + (l.descriptors?.length || 0);
                  }, 0)
                } foto(s)
              </div>
            </div>
          ) : (
            '⚠️ Sistema pronto, mas nenhuma pessoa cadastrada ainda.'
          )}
        </div>
      )}
      
      <div className="camera-controls">
        <select 
          value={selectedCamera} 
          onChange={(e) => setSelectedCamera(e.target.value)}
          disabled={!faceApiLoaded}
        >
          <option value="">Selecione uma câmera...</option>
          {cameras.map((camera, index) => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Câmera ${index + 1}`}
            </option>
          ))}
        </select>
        <button onClick={startVideo} disabled={!faceApiLoaded}>
          Iniciar Câmera
        </button>
        <button onClick={loadLabels} disabled={!faceApiLoaded}>
          Recarregar Labels
        </button>
        <button onClick={clearLabelsCache} disabled={!faceApiLoaded}>
          Limpar Cache
        </button>
      </div>
      
      <div className="video-container">
        <div className="video-wrapper">
          <video 
            ref={videoRef}
            autoPlay 
            width="720" 
            height="560" 
            muted
            onPlay={onVideoPlay}
          />
          <canvas ref={canvasRef} />
          
          {/* Indicadores de status */}
          <div className="status-indicators">
            {isAnalyzing && (
              <div className="indicator orange" title="Analisando rosto"></div>
            )}
            {hasHighConfidenceMatch && (
              <div className="indicator green" title="Pessoa reconhecida com alta confiança (65%+)"></div>
            )}
          </div>
        </div>
        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
        
        <div className="capture-controls">
          <input 
            type="text" 
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Nome da pessoa"
            disabled={!faceApiLoaded || isCapturing}
          />
          <button 
            onClick={capturePhoto} 
            disabled={!faceApiLoaded || isCapturing || !personName.trim() || capturedPhotos.length >= 5}
          >
            {isCapturing ? 'Capturando...' : `Capturar Foto ${capturedPhotos.length + 1}/5`}
          </button>
          {capturedPhotos.length > 0 && (
            <button 
              onClick={cancelCapture} 
              disabled={isCapturing}
              style={{ backgroundColor: '#dc3545' }}
              title={`Cancelar cadastro e apagar ${capturedPhotos.length} foto(s) de "${personName}"`}
            >
              Cancelar e Apagar ({capturedPhotos.length} foto{capturedPhotos.length > 1 ? 's' : ''})
            </button>
          )}
        </div>

        {capturedPhotos.length > 0 && (
          <div className="photo-progress">
            <p>Fotos capturadas: {capturedPhotos.length}/5</p>
            <div className="photo-thumbnails">
              {capturedPhotos.map((photo, index) => (
                <Image
                  key={index}
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="photo-thumbnail"
                  width={80}
                  height={80}
                  style={{ objectFit: 'cover' }}
                />
              ))}
            </div>
            {capturedPhotos.length < 5 && (
              <p style={{ color: '#007bff', fontSize: '14px' }}>
                Continue capturando fotos para melhor precisão do reconhecimento
              </p>
            )}
          </div>
        )}
        
        <div className="display-controls">
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={showLandmarks}
              onChange={(e) => setShowLandmarks(e.target.checked)}
            />
            <span className="checkbox-text">Mostrar informações de reconhecimento</span>
          </label>
        </div>
      </div>

      {statusMessage && (
        <div className="status-message" style={{ color: 'green' }}>
          {statusMessage}
        </div>
      )}

      <div className="person-list">
        <h3>Pessoas Cadastradas:</h3>
        <ul>
          {personList.map((person, index) => {
            // Encontrar quantas fotos essa pessoa tem nos labels
            const personLabel = labels.find(label => {
              const l = label as { label?: string };
              return l.label === person;
            }) as { descriptors?: Float32Array[] } | undefined;
            
            const photoCount = personLabel?.descriptors?.length || 0;
            
            return (
              <li key={index}>
                {person} 
                {photoCount > 0 && (
                  <span style={{ 
                    color: '#007bff', 
                    fontSize: '12px', 
                    marginLeft: '10px',
                    backgroundColor: '#e7f3ff',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {photoCount} foto(s)
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
