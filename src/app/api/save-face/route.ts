import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LABELS_DIR = path.join(process.cwd(), 'public', 'assets', 'lib', 'face-api', 'labels');

// Garantir que o diretório labels existe
if (!fs.existsSync(LABELS_DIR)) {
  fs.mkdirSync(LABELS_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personName = searchParams.get('person');
    
    // Se foi passado um nome de pessoa, retornar as fotos dela
    if (personName) {
      const personDir = path.join(LABELS_DIR, personName);
      
      if (!fs.existsSync(personDir)) {
        return NextResponse.json({ success: false, error: 'Pessoa não encontrada' });
      }
      
      try {
        const files = fs.readdirSync(personDir)
          .filter(file => file.toLowerCase().endsWith('.jpg'))
          .sort(); // Ordenar para garantir ordem consistente
        
        return NextResponse.json({ 
          success: true, 
          person: personName,
          photos: files 
        });
      } catch (error) {
        console.error(`Erro ao listar fotos de ${personName}:`, error);
        return NextResponse.json({ success: false, error: 'Erro ao listar fotos' });
      }
    }
    
    // Caso contrário, retornar lista de pessoas
    const directories = fs.readdirSync(LABELS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    return NextResponse.json({ 
      success: true, 
      persons: directories 
    });
  } catch (error) {
    console.error('Erro ao listar diretórios:', error);
    return NextResponse.json({ success: false, persons: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { personName, imageData, photoNumber } = await request.json();
    
    if (!personName || !imageData) {
      return NextResponse.json({ error: 'Nome da pessoa e dados da imagem são obrigatórios' }, { status: 400 });
    }

    // Criar diretório da pessoa se não existir
    const personDir = path.join(LABELS_DIR, personName);
    if (!fs.existsSync(personDir)) {
      fs.mkdirSync(personDir, { recursive: true });
    }

    // Remover o prefixo data:image/jpeg;base64, da string
    const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, '');
    
    // Salvar a imagem
    const fileName = `${photoNumber}.jpg`;
    const filePath = path.join(personDir, fileName);
    
    fs.writeFileSync(filePath, base64Data, 'base64');
    
    return NextResponse.json({ success: true, message: 'Imagem salva com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar imagem:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { personName } = await request.json();
    
    if (!personName) {
      return NextResponse.json({ error: 'Nome da pessoa é obrigatório' }, { status: 400 });
    }

    const personDir = path.join(LABELS_DIR, personName);
    
    // Verificar se o diretório existe
    if (!fs.existsSync(personDir)) {
      return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 });
    }

    // Função recursiva para deletar diretório e todos os arquivos
    const deleteDirectory = (dirPath: string) => {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        
        files.forEach((file) => {
          const filePath = path.join(dirPath, file);
          const stat = fs.lstatSync(filePath);
          
          if (stat.isDirectory()) {
            deleteDirectory(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        });
        
        fs.rmdirSync(dirPath);
      }
    };

    deleteDirectory(personDir);
    
    return NextResponse.json({ 
      success: true, 
      message: `Pessoa "${personName}" e todas as suas fotos foram removidas com sucesso` 
    });
  } catch (error) {
    console.error('Erro ao deletar pessoa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
