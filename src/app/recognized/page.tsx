"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, User, Clock, Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RecognizedPerson {
  name: string
  type: "RESIDENT" | "EMPLOYEE" | "GUEST"
  unitNumber?: string
  building?: string
  position?: string
  confidence: number
}

export default function RecognizedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [person, setPerson] = useState<RecognizedPerson | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Obter dados da pessoa reconhecida dos parâmetros da URL
    const name = searchParams.get('name')
    const type = searchParams.get('type') as "RESIDENT" | "EMPLOYEE" | "GUEST"
    const unitNumber = searchParams.get('unitNumber')
    const building = searchParams.get('building')
    const position = searchParams.get('position')
    const confidence = parseFloat(searchParams.get('confidence') || '0')

    if (name && type) {
      setPerson({
        name,
        type,
        unitNumber: unitNumber || undefined,
        building: building || undefined,
        position: position || undefined,
        confidence
      })

      // Salvar o log de acesso no banco de dados
      saveAccessLog({
        personName: name,
        accessType: type,
        unitNumber: unitNumber || undefined,
        building: building || undefined,
        confidence
      })
    }

    setLoading(false)
  }, [searchParams])

  useEffect(() => {
    // Countdown para voltar à página de reconhecimento
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Redirecionar após o countdown
      router.push('/face-recognition')
    }
  }, [countdown, router])

  const saveAccessLog = async (data: {
    personName: string
    accessType: string
    unitNumber?: string
    building?: string
    confidence: number
  }) => {
    try {
      const response = await fetch('/api/access-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personName: data.personName,
          accessType: data.accessType,
          unitNumber: data.unitNumber,
          building: data.building,
          status: 'APPROVED',
          method: 'FACIAL_RECOGNITION',
          confidence: data.confidence,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        console.error('Erro ao salvar log de acesso:', await response.text())
      } else {
        console.log('Log de acesso salvo com sucesso')
      }
    } catch (error) {
      console.error('Erro ao salvar log de acesso:', error)
    }
  }

  const getPersonTypeLabel = (type: string) => {
    switch (type) {
      case 'RESIDENT': return 'Morador'
      case 'EMPLOYEE': return 'Funcionário'
      case 'GUEST': return 'Convidado'
      default: return type
    }
  }

  const getPersonTypeColor = (type: string) => {
    switch (type) {
      case 'RESIDENT': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'EMPLOYEE': return 'bg-green-100 text-green-800 border-green-200'
      case 'GUEST': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleBackNow = () => {
    router.push('/face-recognition')
  }

  if (loading || !person) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-green-600">Acesso Autorizado</h1>
          <p className="text-muted-foreground mt-2">
            Pessoa reconhecida com sucesso
          </p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CheckCircle className="h-24 w-24 text-green-600" />
                <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-75"></div>
              </div>
            </div>
            <CardTitle className="text-2xl text-green-800">
              Bem-vindo(a), {person.name}!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tipo:</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getPersonTypeColor(person.type)}`}>
                  {getPersonTypeLabel(person.type)}
                </span>
              </div>

              {person.unitNumber && person.building && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Unidade:</span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">
                    {person.building}-{person.unitNumber}
                  </span>
                </div>
              )}

              {person.position && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Cargo:</span>
                  </div>
                  <span className="text-lg font-semibold">
                    {person.position}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Horário:</span>
                </div>
                <span className="text-lg font-semibold">
                  {new Date().toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Confiança do reconhecimento:</div>
                  <div className="text-lg font-semibold text-green-600">
                    {(person.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Status:</div>
                  <div className="text-lg font-semibold text-green-600">APROVADO</div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600 font-medium">
                  Retornando para o reconhecimento facial em:
                </div>
                <div className="text-3xl font-bold text-blue-600 mt-2">
                  {countdown}s
                </div>
              </div>

              <Button 
                onClick={handleBackNow}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
