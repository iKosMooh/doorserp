import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Função para verificar token e obter usuário
async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        residents: {
          include: {
            unit: true,
            condominium: true
          }
        }
      }
    });
    
    return user;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: guestId } = await params;

    // Buscar convidado
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        invitedByResident: {
          include: {
            user: {
              select: {
                name: true
              }
            },
            unit: {
              select: {
                block: true,
                number: true
              }
            },
            condominium: true
          }
        }
      }
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, message: 'Convidado não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const canView = user.isAdmin || user.isSuperAdmin || 
      user.residents.some(resident => 
        resident.condominium.id === guest.invitedByResident.condominium.id
      );

    if (!canView) {
      return NextResponse.json(
        { success: false, message: 'Sem permissão para visualizar este convidado' },
        { status: 403 }
      );
    }

    // ============ VALIDAÇÕES DE STATUS ============
    const now = new Date();
    const validFromDate = new Date(guest.validFrom);
    const validUntilDate = guest.validUntil ? new Date(guest.validUntil) : null;
    
    // Verificar se já está na data de início
    const isValidDate = validFromDate <= now;
    
    // Verificar se está expirado
    const isExpired = validUntilDate ? validUntilDate < now : false;
    
    // Verificar se ainda tem entradas disponíveis
    const hasEntriesAvailable = guest.currentEntries < guest.maxEntries;
    
    // Convidado está autorizado se: está ativo, dentro do período válido, e tem entradas disponíveis
    const isAuthorized = guest.isActive && isValidDate && !isExpired && hasEntriesAvailable;
    
    // Determinar razão de negação (se houver)
    let denialReason = '';
    if (!guest.isActive) {
      denialReason = 'Convite desativado pelo morador';
    } else if (!isValidDate) {
      denialReason = `Convite ainda não válido (válido a partir de ${validFromDate.toLocaleString('pt-BR')})`;
    } else if (isExpired) {
      denialReason = `Convite expirado em ${validUntilDate?.toLocaleString('pt-BR')}`;
    } else if (!hasEntriesAvailable) {
      denialReason = `Número máximo de entradas atingido (${guest.currentEntries}/${guest.maxEntries})`;
    }

    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        name: guest.name,
        accessCode: guest.accessCode,
        document: guest.document,
        phone: guest.phone,
        validFrom: guest.validFrom,
        validUntil: guest.validUntil,
        maxEntries: guest.maxEntries,
        currentEntries: guest.currentEntries,
        observations: guest.notes,
        isActive: guest.isActive,
        faceRecognitionEnabled: guest.faceRecognitionEnabled,
        faceRecognitionFolder: guest.faceRecognitionFolder,
        invitedBy: guest.invitedByResident.user.name,
        unit: `${guest.invitedByResident.unit.block}${guest.invitedByResident.unit.number}`,
        // ========== DADOS DE VALIDAÇÃO ==========
        isAuthorized,
        isValidDate,
        isExpired,
        hasEntriesAvailable,
        denialReason
      }
    });

  } catch (error) {
    console.error('Erro ao buscar convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: guestId } = await params;
    
    // Parse FormData
    const formData = await request.formData();
    
    // Extract fields
    const name = formData.get('name') as string;
    const document = formData.get('document') as string;
    const phone = formData.get('phone') as string;
    const validFrom = formData.get('validFrom') as string;
    const validUntil = formData.get('validUntil') as string;
    const maxEntries = formData.get('maxEntries') as string;
    const observations = formData.get('observations') as string;
    const isActive = formData.get('isActive') === 'true';
    const faceRecognitionEnabled = formData.get('faceRecognitionEnabled') === 'true';

    // Verificar se o convidado existe
    const existingGuest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        invitedByResident: {
          include: {
            unit: true,
            condominium: true,
            user: true
          }
        }
      }
    });

    if (!existingGuest) {
      return NextResponse.json(
        { success: false, message: 'Convidado não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const canEdit = user.isAdmin || user.isSuperAdmin || 
      user.residents.some(resident => 
        resident.condominium.id === existingGuest.invitedByResident.condominium.id
      );

    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: 'Sem permissão para editar este convidado' },
        { status: 403 }
      );
    }

    // Validar dados
    if (!name || !validFrom || !validUntil) {
      return NextResponse.json(
        { success: false, message: 'Nome e datas de validade são obrigatórios' },
        { status: 400 }
      );
    }

    const startDate = new Date(validFrom);
    const endDate = new Date(validUntil);

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, message: 'Data de início deve ser anterior à data de fim' },
        { status: 400 }
      );
    }

    if (parseInt(maxEntries) < 1) {
      return NextResponse.json(
        { success: false, message: 'Número máximo de entradas deve ser pelo menos 1' },
        { status: 400 }
      );
    }

    // Process face images if face recognition is enabled
    let faceRecognitionFolder = existingGuest.faceRecognitionFolder;
    
    if (faceRecognitionEnabled) {
      const faceImages: File[] = [];
      
      // Collect all face images from FormData
      for (let i = 0; i < 20; i++) {
        const file = formData.get(`faceImage_${i}`) as File | null;
        if (file) {
          faceImages.push(file);
        }
      }

      // Only process images if new ones were uploaded
      if (faceImages.length > 0) {
        const fs = await import('fs').then(m => m.promises);
        const path = await import('path');
        
        // Create unique folder name for this guest's photos
        const folderName = `guest_${existingGuest.accessCode}_${Date.now()}`;
        const folderPath = path.join(process.cwd(), 'public', 'face-data', folderName);
        
        try {
          // Create directory if it doesn't exist
          await fs.mkdir(folderPath, { recursive: true });
          
          // Save all images
          for (let i = 0; i < faceImages.length; i++) {
            const file = faceImages[i];
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = `image_${i + 1}.jpg`;
            await fs.writeFile(path.join(folderPath, fileName), buffer);
          }
          
          // Delete old folder if it exists
          if (existingGuest.faceRecognitionFolder) {
            const oldFolderPath = path.join(process.cwd(), 'public', 'face-data', existingGuest.faceRecognitionFolder);
            try {
              await fs.rm(oldFolderPath, { recursive: true, force: true });
            } catch (err) {
              console.error('Erro ao deletar pasta antiga:', err);
            }
          }
          
          faceRecognitionFolder = folderName;
          console.log(`📸 ${faceImages.length} fotos salvas para convidado ${existingGuest.name} na pasta ${folderName}`);
        } catch (error) {
          console.error('Erro ao salvar imagens:', error);
          return NextResponse.json(
            { success: false, message: 'Erro ao salvar fotos' },
            { status: 500 }
          );
        }
      }
    } else {
      // If face recognition is disabled, delete the folder if it exists
      if (existingGuest.faceRecognitionFolder) {
        try {
          const fs = await import('fs').then(m => m.promises);
          const path = await import('path');
          const oldFolderPath = path.join(process.cwd(), 'public', 'face-data', existingGuest.faceRecognitionFolder);
          await fs.rm(oldFolderPath, { recursive: true, force: true });
          console.log(`🗑️ Pasta de fotos deletada para convidado ${existingGuest.name}`);
        } catch (err) {
          console.error('Erro ao deletar pasta:', err);
        }
        faceRecognitionFolder = null;
      }
    }

    // Atualizar convidado
    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        name: name.trim(),
        document: document?.trim() || null,
        phone: phone?.trim() || null,
        validFrom: startDate,
        validUntil: endDate,
        maxEntries: parseInt(maxEntries),
        notes: observations?.trim() || null,
        isActive: Boolean(isActive),
        faceRecognitionEnabled: Boolean(faceRecognitionEnabled),
        faceRecognitionFolder: faceRecognitionFolder,
        updatedAt: new Date()
      },
      include: {
        invitedByResident: {
          include: {
            user: {
              select: {
                name: true
              }
            },
            unit: {
              select: {
                block: true,
                number: true
              }
            }
          }
        }
      }
    });

    // Log da atualização
    console.log(`🔄 Convidado atualizado: ${updatedGuest.name} (${updatedGuest.accessCode}) por ${user.name}`);

    return NextResponse.json({
      success: true,
      message: 'Convidado atualizado com sucesso',
      guest: {
        id: updatedGuest.id,
        name: updatedGuest.name,
        accessCode: updatedGuest.accessCode,
        document: updatedGuest.document,
        phone: updatedGuest.phone,
        validFrom: updatedGuest.validFrom,
        validUntil: updatedGuest.validUntil,
        maxEntries: updatedGuest.maxEntries,
        currentEntries: updatedGuest.currentEntries,
        observations: updatedGuest.notes,
        isActive: updatedGuest.isActive,
        faceRecognitionEnabled: updatedGuest.faceRecognitionEnabled,
        faceRecognitionFolder: updatedGuest.faceRecognitionFolder,
        invitedBy: updatedGuest.invitedByResident.user.name,
        unit: `${updatedGuest.invitedByResident.unit.block}${updatedGuest.invitedByResident.unit.number}`
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: guestId } = await params;

    // Verificar se o convidado existe
    const existingGuest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        invitedByResident: {
          include: {
            condominium: true
          }
        }
      }
    });

    if (!existingGuest) {
      return NextResponse.json(
        { success: false, message: 'Convidado não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const canDelete = user.isAdmin || user.isSuperAdmin || 
      user.residents.some(resident => 
        resident.condominium.id === existingGuest.invitedByResident.condominium.id
      );

    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: 'Sem permissão para excluir este convidado' },
        { status: 403 }
      );
    }

    // Excluir convidado
    await prisma.guest.delete({
      where: { id: guestId }
    });

    console.log(`🗑️ Convidado excluído: ${existingGuest.name} (${existingGuest.accessCode}) por ${user.name}`);

    return NextResponse.json({
      success: true,
      message: 'Convidado excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir convidado:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}