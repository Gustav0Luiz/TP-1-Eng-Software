'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import Link from "next/link";

import {
  PlusCircle,
  FileText,
  FileArchive,
  CheckCircle,
  XCircle,
  Users,
  CalendarDays,
  BookOpen,
  Book,
  MapPin,
  Edit,
  Trash2,
  Download
} from 'lucide-react';
import React from 'react';

// ==========================================================
// CONFIGURAÇÃO
// ==========================================================
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ----------------------------------------------------------
// EventCard (estético + acessível)
// ----------------------------------------------------------
const EventCard: React.FC<{
  name: string;
  description?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ name, description, onEdit, onDelete }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-amber-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500/90 via-amber-400 to-amber-600/90" />
      <div className="flex flex-col items-center text-center">
        {/* TÍTULO CLICÁVEL */}
        <Link
          href={`/${encodeURIComponent(name)}`}
          className="text-lg font-bold tracking-tight text-amber-900 hover:text-amber-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 rounded-sm"
          aria-label={`Abrir página pública do evento ${name}`}
        >
          {name}
        </Link>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">
          {description?.trim() || 'Sem descrição.'}
        </p>

        <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-amber-200 to-transparent" />

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 cursor-pointer"
            aria-label="Editar evento"
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>

          <button
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 cursor-pointer"
            aria-label="Excluir evento"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};



// ----------------------------------------------------------
// EditionCard (visual ciano, centralizado, ocupa a célula inteira)
// ----------------------------------------------------------
const EditionCard: React.FC<{
  title: string; // nome do evento
  year: number;
  local?: string | null;
  description?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ title, year, local, description, onEdit, onDelete }) => {
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm transition hover:shadow-md flex flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500/90 via-cyan-400 to-cyan-600/90" />
      <div className="flex-1 flex flex-col items-center text-center">
        {/* TÍTULO + ANO CLICÁVEIS */}
        <Link
          href={`/${encodeURIComponent(title)}/${year}`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 rounded-sm"
          aria-label={`Abrir edição ${year} do evento ${title}`}
        >
          <h3 className="text-base font-bold tracking-tight text-cyan-900 hover:text-cyan-950">
            {title}
          </h3>
          <p className="mt-1 text-sm font-medium text-cyan-800">{year}</p>
        </Link>

        <p className="mt-1 flex items-center justify-center gap-2 text-xs text-gray-600">
          <MapPin className="h-3.5 w-3.5 text-cyan-500" />
          {local?.trim() || 'Local não definido'}
        </p>

        {description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        )}

        <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />

        <div className="mt-auto pt-4 grid grid-cols-2 gap-2 w-full">
          <button
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 hover:text-cyan-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 cursor-pointer"
            aria-label="Editar edição"
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 hover:text-cyan-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 cursor-pointer"
            aria-label="Excluir edição"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};
// ----------------------------------------------------------
// ArticleCard (azul): título + evento-ano + botões
// ----------------------------------------------------------
const ArticleCard: React.FC<{
  title: string;
  eventWithYear: string; // "Evento - 2025"
  onDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ title, eventWithYear, onDetails, onEdit, onDelete }) => {
  return (
    <div
      className="
        group relative h-full overflow-hidden rounded-2xl border border-blue-200
        bg-white p-6 shadow-sm transition hover:shadow-md flex flex-col
      "
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/90 via-blue-400 to-blue-600/90"
      />

      <div className="flex-1 flex flex-col items-center text-center">
        <h3 className="text-base font-bold tracking-tight text-blue-900 line-clamp-2">
          {title}
        </h3>

        <p className="mt-1 text-xs text-gray-600">{eventWithYear}</p>

        <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

        {/* Ações: ver detalhes (linha inteira), depois editar/excluir 50/50 */}
        <div className="mt-auto w-full">
          <button
            onClick={onDetails}
            className="
              mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300
              bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800
              transition hover:bg-blue-100 hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40
              cursor-pointer
            "
          >
            Ver detalhes
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onEdit}
              className="
                inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300
                bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800
                transition hover:bg-blue-100 hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40
                cursor-pointer
              "
            >
              <Edit className="h-4 w-4" />
              Editar
            </button>

            <button
              onClick={onDelete}
              className="
                inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300
                bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800
                transition hover:bg-blue-100 hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40
                cursor-pointer
              "
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================================
// TIPAGEM DE ESTADOS E PROPS
// ==========================================================
type NewArticleState = {
  title: string;
  abstract: string;
  pdf: File | null;
  eventName: string;
  year: number | '';
  startPage: number | '';
  endPage: number | '';
  authorsCsv: string;
};

type BulkFiles = {
  bibtex: File | null;
  pdfs: File | null;
};

type UploadReport = {
  createdCount: number;
  skippedCount: number;
  created: Array<{ key: string; title: string; id: number }>;
  skipped: Array<{ key: string; reason: string }>;
} | null;

interface FileDropzoneProps {
  label: string;
  file: File | null;
  required: boolean;
  mimeType: string;
  setFile: (file: File | null) => void;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ArticleDisplay {
  id: number;
  title: string;
  abstract: string;
  event_name?: string;
  edition_year?: number;
  authors?: string[];
  start_page?: number | null;
  end_page?: number | null;
  created_at: string;
}

type NewEditionState = { eventName: string; year: number | ''; local: string; description: string; };
type NewEventState = { name: string; description: string; };

type FeedbackState = {
  show: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

interface EventItem {
  id: number; name: string; description: string; created_at: string; updated_at: string;
}
interface EditionItem {
  id: number; event_id: number; year: number; description: string; local: string; event_name: string;
}

// ==========================================================
// MODAL GENÉRICO DE CONFIRMAÇÃO DE EXCLUSÃO
// ==========================================================
type DeleteConfirmVariant = 'amber' | 'cyan' | 'blue' | 'red';

const variantMap: Record<DeleteConfirmVariant, { text: string; bg: string; hover: string; ring: string; outlineText: string; }>
  = {
  amber: {
    text: 'text-amber-700',
    bg: 'bg-amber-600',
    hover: 'hover:bg-amber-700',
    ring: 'focus:ring-amber-400',
    outlineText: 'text-amber-600'
  },
  cyan: {
    text: 'text-cyan-700',
    bg: 'bg-cyan-600',
    hover: 'hover:bg-cyan-700',
    ring: 'focus:ring-cyan-400',
    outlineText: 'text-cyan-600'
  },
  blue: {
    text: 'text-blue-700',
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    ring: 'focus:ring-blue-400',
    outlineText: 'text-blue-600'
  },
  red: {
    text: 'text-red-700',
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    ring: 'focus:ring-red-400',
    outlineText: 'text-red-600'
  }
};

interface DeleteConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  variant: DeleteConfirmVariant;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}
const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  open, title, message, variant, onCancel, onConfirm, confirmLabel = 'Excluir', cancelLabel = 'Cancelar'
}) => {
  if (!open) return null;
  const v = variantMap[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-50">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
        <h3 className={`text-xl font-bold ${v.text}`}>{title}</h3>
        <p className="text-gray-700 mt-3 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white ${v.bg} ${v.hover} focus:outline-none focus:ring-2 ${v.ring} cursor-pointer flex items-center gap-2`}
          >
            <Trash2 className="h-4 w-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================================
// COMPONENTES DE MODAL (Feedback, Dropzone, Detalhes/Edits)
// ==========================================================
interface FeedbackModalProps {
  feedback: FeedbackState;
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
}
const FeedbackModal: React.FC<FeedbackModalProps> = ({ feedback, setFeedback }) => {
  if (!feedback.show) return null;
  const Icon = feedback.type === 'success' ? CheckCircle : XCircle;
  const color = feedback.type === 'success' ? 'text-green-600' : 'text-red-600';
  const bgColor = feedback.type === 'success' ? 'bg-green-50' : 'bg-red-50';
  const handleClose = () => setFeedback(s => ({ ...s, show: false }));

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-50">
      <div className={`bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl ${bgColor}`}>
        <div className="flex items-center space-x-4">
          <Icon className={`h-8 w-8 ${color}`} />
          <div>
            <h3 className={`text-xl font-bold ${color}`}>{feedback.title}</h3>
            <p className="text-sm text-gray-700 mt-1">{feedback.message}</p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Dropzone
const FileDropzone: React.FC<FileDropzoneProps> = ({ label, file, required, mimeType, setFile, isDragging, setIsDragging }) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    const isZip = mimeType.includes('zip');
    const isBibtex = !isZip && droppedFile.name.toLowerCase().endsWith('.bib');

    if ((isZip && droppedFile.type === 'application/zip') || isBibtex || (!isZip && droppedFile.name.toLowerCase().endsWith('.bib'))) {
      setFile(droppedFile);
    } else {
      alert(`Arquivo não suportado. Esperado: ${isZip ? 'ZIP (.zip)' : 'BibTeX (.bib)'}.`);
    }
  }, [mimeType, setFile, setIsDragging]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
  }, [setIsDragging]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const icon = mimeType.includes('zip') ? <FileArchive className="h-6 w-6 text-gray-400" /> : <FileText className="h-6 w-6 text-gray-400" />;
  const inputId = `file-upload-${label.replace(/\s/g, '-')}`;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
      }`}
    >
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && '*'}
      </label>
      <input
        type="file"
        accept={mimeType.includes('zip') ? '.zip' : '.bib'}
        onChange={handleFileChange}
        required={required && !file}
        className="hidden cursor-pointer"
        id={inputId}
      />

      {!file ? (
        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center p-6 text-center cursor-pointer"
        >
          {icon}
          <p className="mt-1 text-sm text-gray-600">
            Arraste e solte ou <span className="text-blue-600 hover:text-blue-800 font-semibold">clique para selecionar</span>
          </p>
          <p className="text-xs text-gray-500">
            {mimeType.includes('zip') ? 'Arquivo ZIP com PDFs' : 'Arquivo BibTeX (.bib)'}
          </p>
        </label>
      ) : (
        <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md">
          <span className="text-sm truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="text-red-500 hover:text-red-700 text-sm ml-2 cursor-pointer"
          >
            Remover
          </button>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------
// EventDetailModal
// ----------------------------------------------------------
interface EventDetailModalProps {
  selectedEvent: EventItem | null;
  setSelectedEvent: React.Dispatch<React.SetStateAction<EventItem | null>>;
  token: string | null;
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  fetchEvents: () => void;
}
const EventDetailModal: React.FC<EventDetailModalProps> = ({ selectedEvent, setSelectedEvent, token, setFeedback, fetchEvents }) => {
  if (!selectedEvent) return null;

  const [editedEvent, setEditedEvent] = useState({
    name: selectedEvent.name,
    description: selectedEvent.description
  });

  useEffect(() => {
    if (selectedEvent) {
      setEditedEvent({ name: selectedEvent.name, description: selectedEvent.description });
    }
  }, [selectedEvent]);

  const handleClose = () => setSelectedEvent(null);

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const name = editedEvent.name.trim();
    const description = editedEvent.description ? editedEvent.description.trim() : null;

    try {
      const res = await fetch(`${BASE_URL}/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        setSelectedEvent(null);
        setFeedback({ show: true, type: 'success', title: 'Sucesso!', message: `Evento '${name}' atualizado!` });
        fetchEvents();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ show: true, type: 'error', title: 'Erro de Edição', message: err?.error?.message || `Falha ao atualizar evento.` });
      }
    } catch {
      setFeedback({ show: true, type: 'error', title: 'Erro de Conexão', message: 'Falha ao tentar editar evento. Verifique o servidor.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-40">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4 border-b pb-2 text-amber-700">Editar Evento: {selectedEvent.name}</h3>
        <form onSubmit={handleEditEvent}>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">ID: {selectedEvent.id}</p>
            <p className="text-sm text-gray-700">Criado em: {new Date(selectedEvent.created_at).toLocaleDateString()}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome *</label>
              <input
                name="name"
                type="text"
                value={editedEvent.name}
                onChange={(e) => setEditedEvent(s => ({ ...s, name: e.target.value }))}
                required
                className="w-full rounded-lg border px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                name="description"
                value={editedEvent.description || ''}
                onChange={(e) => setEditedEvent(s => ({ ...s, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border px-4 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer">Salvar Edição</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------------
// EditionDetailModal — agora com ANO
// ----------------------------------------------------------
interface EditionDetailModalProps {
  selectedEdition: EditionItem | null;
  setSelectedEdition: React.Dispatch<React.SetStateAction<EditionItem | null>>;
  token: string | null;
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  fetchEditions: () => void;
}
const EditionDetailModal: React.FC<EditionDetailModalProps> = ({ selectedEdition, setSelectedEdition, token, setFeedback, fetchEditions }) => {
  if (!selectedEdition) return null;

  const [editedEdition, setEditedEdition] = useState({
    local: selectedEdition.local || '',
    description: selectedEdition.description || '',
    year: selectedEdition.year
  });

  useEffect(() => {
    if (selectedEdition) {
      setEditedEdition({
        local: selectedEdition.local || '',
        description: selectedEdition.description || '',
        year: selectedEdition.year
      });
    }
  }, [selectedEdition]);

  const handleClose = () => setSelectedEdition(null);

  const handleEditEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEdition) return;

    const local = editedEdition.local.trim() || null;
    const description = editedEdition.description ? editedEdition.description.trim() : null;
    const year = Number(editedEdition.year);

    try {
      const res = await fetch(`${BASE_URL}/editions/${selectedEdition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ local, description, year }),
      });

      if (res.ok) {
        setSelectedEdition(null);
        setFeedback({ show: true, type: 'success', title: 'Sucesso!', message: `Edição ${year} atualizada!` });
        fetchEditions();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ show: true, type: 'error', title: 'Erro de Edição', message: err?.error?.message || `Falha ao atualizar edição.` });
      }
    } catch {
      setFeedback({ show: true, type: 'error', title: 'Erro de Conexão', message: 'Falha ao tentar editar edição. Verifique o servidor.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-40">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4 border-b pb-2 text-cyan-700">
          Editar Edição: {selectedEdition.event_name} - {selectedEdition.year}
        </h3>
        <form onSubmit={handleEditEdition}>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">ID: {selectedEdition.id}</p>
            <p className="text-sm text-gray-700">Evento Base: {selectedEdition.event_name} (ID: {selectedEdition.event_id})</p>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ano *</label>
              <input
                name="year"
                type="number"
                min={1900}
                value={editedEdition.year}
                onChange={(e) => setEditedEdition(s => ({ ...s, year: Number(e.target.value) }))}
                required
                className="w-full rounded-lg border px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Local</label>
              <input
                name="local"
                type="text"
                value={editedEdition.local || ''}
                onChange={(e) => setEditedEdition(s => ({ ...s, local: e.target.value }))}
                className="w-full rounded-lg border px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                name="description"
                value={editedEdition.description || ''}
                onChange={(e) => setEditedEdition(s => ({ ...s, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border px-4 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 cursor-pointer">Salvar Edição</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------------
// ArticleDetailModal (estilizado, informações explícitas)
// ----------------------------------------------------------
interface ArticleDetailModalProps {
  selectedArticle: ArticleDisplay | null;
  setSelectedArticle: React.Dispatch<React.SetStateAction<ArticleDisplay | null>>;
  BASE_URL: string;
}
const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  selectedArticle,
  setSelectedArticle,
  BASE_URL,
}) => {
  if (!selectedArticle) return null;
  const handleClose = () => setSelectedArticle(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-40">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl">
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-xl">
          <h3 className="text-2xl font-bold text-white leading-snug">
            Detalhes do Artigo
          </h3>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-6 space-y-6 text-gray-800 text-base leading-relaxed">
          <p>
            <span className="font-semibold text-blue-700">Nome do artigo:</span>{' '}
            {selectedArticle.title}
          </p>

          <p>
            <span className="font-semibold text-blue-700">Autores:</span>{' '}
            {selectedArticle.authors?.join(', ') || 'Não informado'}
          </p>

          <p>
            <span className="font-semibold text-blue-700">Evento:</span>{' '}
            {selectedArticle.event_name}
          </p>

          <p>
            <span className="font-semibold text-blue-700">Edição:</span>{' '}
            {selectedArticle.edition_year}
          </p>

          <p>
            <span className="font-semibold text-blue-700">Páginas:</span>{' '}
            {selectedArticle.start_page ?? '—'} –{' '}
            {selectedArticle.end_page ?? 'Fim'}
          </p>

          <div className="pt-4">
            <span className="font-semibold text-blue-700">Resumo:</span>
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {selectedArticle.abstract || 'Não disponível.'}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-5 border-t flex flex-wrap justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
          >
            Fechar
          </button>
          <a
            href={`${BASE_URL}/articles/${selectedArticle.id}/pdf`}
            download
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </a>
        </div>
      </div>
    </div>
  );
};


// ----------------------------------------------------------
// ArticleEditModal — editar (eventName+year e upload PDF)
// ----------------------------------------------------------
interface ArticleEditModalProps {
  article: ArticleDisplay | null;
  onClose: () => void;
  token: string | null;
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  refreshArticles: () => void;
}
const ArticleEditModal: React.FC<ArticleEditModalProps> = ({ article, onClose, token, setFeedback, refreshArticles }) => {
  const [form, setForm] = useState({
    title: article?.title || '',
    abstract: article?.abstract || '',
    eventName: article?.event_name || '',
    year: article?.edition_year ?? '',
    startPage: article?.start_page ?? '',
    endPage: article?.end_page ?? '',
    authorsCsv: (article?.authors || []).join(', ')
  });
  const [pdf, setPdf] = useState<File | null>(null);

  useEffect(() => {
    if (article) {
      setForm({
        title: article.title || '',
        abstract: article.abstract || '',
        eventName: article.event_name || '',
        year: article.edition_year ?? '',
        startPage: article.start_page ?? '',
        endPage: article.end_page ?? '',
        authorsCsv: (article.authors || []).join(', ')
      });
      setPdf(null);
    }
  }, [article]);

  if (!article) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('abstract', form.abstract ?? '');
      fd.append('eventName', form.eventName);
      if (form.year !== '') fd.append('year', String(form.year));
      if (form.startPage !== '') fd.append('startPage', String(form.startPage));
      if (form.endPage !== '') fd.append('endPage', String(form.endPage));
      if (form.authorsCsv.trim()) fd.append('authors', JSON.stringify(form.authorsCsv.split(/[,;]\s*/g).filter(Boolean)));
      if (pdf) fd.append('pdf', pdf);

      const res = await fetch(`${BASE_URL}/articles/${article.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      if (res.ok) {
        setFeedback({ show: true, type: 'success', title: 'Sucesso!', message: 'Artigo atualizado com sucesso.' });
        onClose();
        refreshArticles();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ show: true, type: 'error', title: 'Erro', message: err?.error?.message || 'Falha ao atualizar artigo.' });
      }
    } catch {
      setFeedback({ show: true, type: 'error', title: 'Erro de Conexão', message: 'Falha ao tentar atualizar o artigo.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-50">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl">
        <div className="px-6 py-5 border-b">
          <h3 className="text-2xl font-bold text-blue-700 leading-snug">Editar Artigo</h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Título *</label>
              <input
                type="text"
                className="w-full rounded-lg border px-4 py-2"
                value={form.title}
                onChange={(e) => setForm(s => ({ ...s, title: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Evento (ex: SBES) *</label>
              <input
                type="text"
                className="w-full rounded-lg border px-4 py-2"
                value={form.eventName}
                onChange={(e) => setForm(s => ({ ...s, eventName: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ano *</label>
              <input
                type="number"
                min={1900}
                className="w-full rounded-lg border px-4 py-2"
                value={form.year as number | ''}
                onChange={(e) => setForm(s => ({ ...s, year: e.target.value === '' ? '' : Number(e.target.value) }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">PDF (opcional)</label>
              <input
                type="file"
                accept="application/pdf"
                className="w-full text-sm border rounded-lg px-4 py-2"
                onChange={(e) => setPdf(e.target.files?.[0] || null)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Resumo (Abstract)</label>
              <textarea
                rows={4}
                className="w-full rounded-lg border px-4 py-2"
                value={form.abstract}
                onChange={(e) => setForm(s => ({ ...s, abstract: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Pág. Inicial</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border px-4 py-2"
                value={form.startPage as number | ''}
                onChange={(e) => setForm(s => ({ ...s, startPage: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Pág. Final</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border px-4 py-2"
                value={form.endPage as number | ''}
                onChange={(e) => setForm(s => ({ ...s, endPage: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Autores (separados por , ou ;)</label>
              <input
                type="text"
                className="w-full rounded-lg border px-4 py-2"
                value={form.authorsCsv}
                onChange={(e) => setForm(s => ({ ...s, authorsCsv: e.target.value }))}
                placeholder="Maria; João; Fulano"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================================
// COMPONENTE PRINCIPAL UserHome
// ==========================================================
export default function UserHome() {
  const router = useRouter();
  const params = useParams<{ nickname: string }>();
  const { user, loading, token } = useAuth();

  const [articles, setArticles] = useState<ArticleDisplay[]>([]);

  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditionModal, setShowEditionModal] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<EditionItem | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleDisplay | null>(null);

  const [articleToEdit, setArticleToEdit] = useState<ArticleDisplay | null>(null);

  const [deleteState, setDeleteState] = useState<{ open: boolean; type?: 'event' | 'edition' | 'article'; id?: number; name?: string; variant?: DeleteConfirmVariant; message?: string; }>(
    { open: false }
  );

  const [feedback, setFeedback] = useState<FeedbackState>({ show: false, type: 'success', title: '', message: '' });

  const [newEvent, setNewEvent] = useState<NewEventState>({ name: '', description: '' });
  const [newEdition, setNewEdition] = useState<NewEditionState>({ eventName: '', year: '', local: '', description: '' });

  const [isBulkUpload, setIsBulkUpload] = useState(false);
  const [uploadReport, setUploadReport] = useState<UploadReport>(null);

  const [isBibDragging, setIsBibDragging] = useState(false);
  const [isPdfsDragging, setIsPdfsDragging] = useState(false);

  const [bulkFiles, setBulkFiles] = useState<BulkFiles>({ bibtex: null, pdfs: null });

  const [newArticle, setNewArticle] = useState<NewArticleState>({
    title: '',
    abstract: '',
    pdf: null,
    eventName: '',
    year: '',
    startPage: '',
    endPage: '',
    authorsCsv: '',
  });

  const [events, setEvents] = useState<EventItem[]>([]);
  const [editions, setEditions] = useState<EditionItem[]>([]);

  // ==========================================================
  // FETCH
  // ==========================================================
  const fetchEvents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/events`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data ?? []);
      }
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    }
  }, [token]);

  const fetchEditions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/editions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEditions(data.data ?? []);
      }
    } catch (err) {
      console.error('Erro ao carregar edições:', err);
    }
  }, [token]);

  const fetchArticles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/articles/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles ?? []);
      }
    } catch (err) {
      console.error('Erro ao carregar artigos:', err);
    }
  }, [token]);

  // ==========================================================
  // EFFECT
  // ==========================================================
  useEffect(() => {
    if (loading) return;

    const urlNick = (params?.nickname ?? '').toString().toLowerCase();

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.nickname && user.nickname.toLowerCase() !== urlNick) {
      router.replace(`/user/${user.nickname.toLowerCase()}`);
      return;
    }

    fetchArticles();
    fetchEvents();
    fetchEditions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, params?.nickname, token]);

  const resetModal = () => {
    setShowArticleModal(false);
    setUploadReport(null);
    setIsBulkUpload(false);
    setBulkFiles({ bibtex: null, pdfs: null });
    setNewArticle({
      title: '', abstract: '', pdf: null, eventName: '', year: '', startPage: '', endPage: '', authorsCsv: '',
    });
  };

  // ==========================================================
  // CRIAÇÃO
  // ==========================================================
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newEvent.name.trim();
    if (!name) { setFeedback({ show: true, type: 'error', title: 'Erro de Validação', message: 'O nome do evento é obrigatório.' }); return; }

    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newEvent),
      });

      if (res.ok) {
        setShowEventModal(false);
        setNewEvent({ name: '', description: '' });
        setFeedback({ show: true, type: 'success', title: 'Sucesso!', message: `Evento '${name}' criado com sucesso!` });
        fetchEvents();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ show: true, type: 'error', title: 'Erro de API', message: err?.error?.message || `Erro ao criar evento: ${res.status}` });
      }
    } catch {
      setFeedback({ show: true, type: 'error', title: 'Erro de Conexão', message: 'Falha ao tentar criar evento. Verifique o servidor.' });
    }
  };

  const handleCreateEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newEdition.eventName.trim();
    const year = Number(newEdition.year);

    if (!name) { setFeedback({ show: true, type: 'error', title: 'Erro de Validação', message: 'O nome do Evento Base é obrigatório.' }); return; }
    if (!year || year < 1000) { setFeedback({ show: true, type: 'error', title: 'Erro de Validação', message: 'O ano é obrigatório e deve ser válido.' }); return; }

    try {
      const res = await fetch(`${BASE_URL}/editions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventName: name,
          year: year,
          local: newEdition.local,
          description: newEdition.description,
        }),
      });

      if (res.ok) {
        setShowEditionModal(false);
        setNewEdition({ eventName: '', year: '', local: '', description: '' });
        setFeedback({ show: true, type: 'success', title: 'Sucesso!', message: `Edição ${year} do evento '${name}' criada!` });
        fetchEditions();
      } else {
        const err = await res.json().catch(() => ({}));
        let message = err?.error?.message || `Erro ao criar edição: ${res.status}`;
        if (err?.error?.code === 'NOT_FOUND') { message = `Evento '${name}' não encontrado. Cadastre o evento base primeiro.` }
        if (err?.error?.code === 'DUPLICATE') { message = `Essa edição (${year}) já existe para o evento '${name}'.` }

        setFeedback({ show: true, type: 'error', title: 'Erro de API', message: message });
      }
    } catch {
      setFeedback({ show: true, type: 'error', title: 'Erro de Conexão', message: 'Falha ao tentar criar edição. Verifique o servidor.' });
    }
  };

  // Upload (bulk + single)
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFiles.bibtex || !bulkFiles.pdfs) { setFeedback({ show: true, type: 'error', title: 'Arquivos Ausentes', message: 'Selecione os arquivos BibTeX (.bib) e PDFs (.zip).' }); return; }
    const formData = new FormData();
    formData.append('bibtex', bulkFiles.bibtex);
    formData.append('pdfs', bulkFiles.pdfs);
    try {
      const res = await fetch(`${BASE_URL}/articles/bulk-bibtex`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData, });
      const report = await res.json();
      if (res.ok) {
        setUploadReport(report);
        if (report.createdCount > 0) {
          await fetchArticles();
          setFeedback({ show: true, type: 'success', title: 'Importação Concluída', message: `${report.createdCount} artigo(s) criado(s). ${report.skippedCount} pulado(s).` });
        } else {
          setFeedback({ show: true, type: 'error', title: 'Falha na Importação', message: `Nenhum artigo criado. ${report.skippedCount} pulado(s).` });
        }
      } else {
        setFeedback({ show: true, type: 'error', title: 'Erro de API', message: report?.error?.message || `Erro ao processar a importação em massa.` });
      }
    } catch {
      setFeedback({ show: true, type: 'error', title: 'Erro de Conexão', message: 'Falha ao tentar importar. Verifique o servidor.' });
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBulkUpload) { handleBulkUpload(e); return; }
    if (!newArticle.title.trim() || !newArticle.pdf || !newArticle.eventName.trim() || newArticle.year === '') { setFeedback({ show: true, type: 'error', title: 'Validação', message: 'Preencha Título, Evento, Ano e selecione o PDF.' }); return; }
    const formData = new FormData();
    formData.append('title', newArticle.title);
    formData.append('abstract', newArticle.abstract);
    formData.append('eventName', newArticle.eventName);
    formData.append('year', String(newArticle.year));
    if (newArticle.startPage !== '') { formData.append('startPage', String(newArticle.startPage)); }
    if (newArticle.endPage !== '') { formData.append('endPage', String(newArticle.endPage)); }
    if (newArticle.authorsCsv.trim()) { formData.append('authors', newArticle.authorsCsv.trim()); }
    formData.append('pdf', newArticle.pdf!);

    try {
      const res = await fetch(`${BASE_URL}/articles`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData, });
      if (res.ok) {
        resetModal();
        await fetchArticles();
        setFeedback({ show: true, type: 'success', title: 'Sucesso!', message: 'Artigo cadastrado com sucesso!' });
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ show: true, type: 'error', title: 'Erro de Cadastro', message: err?.error?.message || 'Erro ao criar artigo.' });
      }
    } catch {
      setFeedback({ show: true, type: 'error', title: 'Erro de Conexão', message: 'Falha ao tentar criar artigo. Verifique o servidor.' });
    }
  };

  // ==========================================================
  // EXCLUSÕES (modal genérico)
  // ==========================================================
  const askDelete = (type: 'event' | 'edition' | 'article', id: number, name: string) => {
    const mapVariant: Record<typeof type, DeleteConfirmVariant> = {
      event: 'amber',
      edition: 'cyan',
      article: 'blue'
    };
    const titles: Record<typeof type, string> = {
      event: 'Excluir Evento',
      edition: 'Excluir Edição',
      article: 'Excluir Artigo'
    };
    const msg =
      type === 'event'
        ? `Você tem certeza que deseja excluir o evento "${name}"? Isso pode excluir também suas edições e artigos.`
        : type === 'edition'
          ? `Você tem certeza que deseja excluir a edição "${name}"? Isso excluirá artigos vinculados.`
          : `Você tem certeza que deseja excluir o artigo "${name}"?`;
    setDeleteState({
      open: true, type, id, name, variant: mapVariant[type], message: msg
    });
  };

  const confirmDelete = async () => {
    if (!deleteState.open || !deleteState.type || !deleteState.id) return;
    const { type, id } = deleteState;
    try {
      const endpoint =
        type === 'event' ? `${BASE_URL}/events/${id}` :
          type === 'edition' ? `${BASE_URL}/editions/${id}` :
            `${BASE_URL}/articles/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setFeedback({ show: true, type: 'success', title: 'Excluído', message: 'Exclusão realizada com sucesso.' });
        setDeleteState({ open: false });
        if (type === 'event') { fetchEvents(); fetchEditions(); fetchArticles(); }
        else if (type === 'edition') { fetchEditions(); fetchArticles(); }
        else { fetchArticles(); }
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ show: true, type: 'error', title: 'Erro', message: err?.error?.message || 'Falha ao excluir.' });
      }
    } catch {
      setFeedback({ show: true, type: 'error', title: 'Erro de Conexão', message: 'Não foi possível excluir.' });
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  if (loading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-600">
        Carregando…
      </div>
    );
  }

  return (
    <>
      <Header />

      {/* Modais */}
      {selectedEvent && (
        <EventDetailModal
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
          token={token}
          setFeedback={setFeedback}
          fetchEvents={fetchEvents}
        />
      )}

      {selectedEdition && (
        <EditionDetailModal
          selectedEdition={selectedEdition}
          setSelectedEdition={setSelectedEdition}
          token={token}
          setFeedback={setFeedback}
          fetchEditions={fetchEditions}
        />
      )}

      {selectedArticle && (
        <ArticleDetailModal
          selectedArticle={selectedArticle}
          setSelectedArticle={setSelectedArticle}
          BASE_URL={BASE_URL}
        />
      )}

      {articleToEdit && (
        <ArticleEditModal
          article={articleToEdit}
          onClose={() => setArticleToEdit(null)}
          token={token}
          setFeedback={setFeedback}
          refreshArticles={fetchArticles}
        />
      )}

      <DeleteConfirmModal
        open={deleteState.open}
        title={
          deleteState.type === 'event' ? 'Excluir Evento' :
            deleteState.type === 'edition' ? 'Excluir Edição' : 'Excluir Artigo'
        }
        message={deleteState.message || ''}
        variant={deleteState.variant || 'red'}
        onCancel={() => setDeleteState({ open: false })}
        onConfirm={confirmDelete}
      />

      <FeedbackModal feedback={feedback} setFeedback={setFeedback} />

      <div className="min-h-screen max-w-4xl mx-auto px-4 py-10 flex flex-col">
        <h1 className="text-2xl font-bold text-blue-900">
          Olá, {user.first_name} {user.last_name} (@{user.nickname})
        </h1>
        <p className="mt-2 text-gray-600">Bem-vindo à sua área!</p>

        {/* AÇÕES */}
        <div className="mt-8 flex gap-3">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer text-sm w-1/3 justify-center"
            onClick={() => { setShowEventModal(true); setNewEvent({ name: '', description: '' }); }}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Criar Evento</span>
          </button>
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 cursor-pointer text-sm w-1/3 justify-center"
            onClick={() => { setShowEditionModal(true); setNewEdition({ eventName: '', year: '', local: '', description: '' }); }}
          >
            <Book className="h-4 w-4" />
            <span>Criar Edição</span>
          </button>
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm w-1/3 justify-center"
            onClick={() => { setShowArticleModal(true); setUploadReport(null); setIsBulkUpload(false); }}
          >
            <PlusCircle className="h-5 w-5" />
            <span>Adicionar Artigo</span>
          </button>
        </div>

        {/* EVENTOS */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-amber-800">
              Eventos Criados
            </h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              {events.length} {events.length === 1 ? 'evento' : 'eventos'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {events.length === 0 ? (
              <div className="col-span-full rounded-xl border border-amber-200 bg-amber-50/40 p-6 text-center text-amber-800">
                Nenhum evento criado ainda.
              </div>
            ) : (
              events.map((event) => (
                <EventCard
                  key={event.id}
                  name={event.name}
                  description={event.description}
                  onEdit={() => setSelectedEvent(event)}
                  onDelete={() => askDelete('event', event.id, event.name)}
                />
              ))
            )}
          </div>
        </div>

        {/* EDIÇÕES (grid com auto-rows-fr) */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-cyan-700">Edições Criadas</h2>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 ring-1 ring-inset ring-cyan-200">
              {editions.length} {editions.length === 1 ? 'edição' : 'edições'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 auto-rows-fr">
            {editions.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 p-6 border border-cyan-200 rounded-xl">
                Nenhuma edição criada ainda.
              </div>
            ) : (
              editions.map((edition) => (
                <EditionCard
                  key={edition.id}
                  title={edition.event_name}
                  year={edition.year}
                  local={edition.local}
                  description={edition.description}
                  onEdit={() => setSelectedEdition(edition)}
                  onDelete={() => askDelete('edition', edition.id, `${edition.event_name} - ${edition.year}`)}
                />
              ))
            )}
          </div>
        </div>

        {/* ARTIGOS (grid com auto-rows-fr) */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-blue-900">Meus Artigos</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              {articles.length} {articles.length === 1 ? 'artigo' : 'artigos'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 auto-rows-fr">
            {articles.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 p-6 border border-blue-200 rounded-xl">
                Você ainda não tem artigos.
              </div>
            ) : (
              [...articles]
                .sort((a, b) => (b.edition_year ?? 0) - (a.edition_year ?? 0)) // <-- ordena por ano (desc)
                .map((article) => (
                  <ArticleCard
                    key={article.id}
                    title={article.title}
                    eventWithYear={`${article.event_name} - ${article.edition_year}`}
                    onDetails={() => setSelectedArticle(article)}
                    onEdit={() => setArticleToEdit(article)}
                    onDelete={() => askDelete('article', article.id, article.title)}
                  />
                ))
            )}
          </div>
        </div>


        {/* MODAIS: CRIAÇÃO */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-40">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm">
              <h3 className="text-xl font-semibold mb-4">Cadastrar Novo Evento</h3>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label htmlFor="event_name" className="block text-sm font-medium text-gray-700">Nome do Evento *</label>
                  <input
                    id="event_name"
                    type="text"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent(s => ({ ...s, name: e.target.value }))}
                    required
                    className="w-full rounded-lg border px-4 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="event_description" className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
                  <textarea
                    id="event_description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(s => ({ ...s, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border px-4 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowEventModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer">
                    Criar Evento
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditionModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-40">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm">
              <h3 className="text-xl font-semibold mb-4">Cadastrar Nova Edição</h3>
              <form onSubmit={handleCreateEdition} className="space-y-4">
                <div>
                  <label htmlFor="edition_event_name" className="block text-sm font-medium text-gray-700">Nome do Evento Base (Ex: SBES) *</label>
                  <input
                    id="edition_event_name"
                    type="text"
                    value={newEdition.eventName}
                    onChange={(e) => setNewEdition(s => ({ ...s, eventName: e.target.value }))}
                    required
                    className="w-full rounded-lg border px-4 py-2"
                    placeholder="Ex: SBES"
                  />
                </div>
                <div>
                  <label htmlFor="edition_year" className="block text-sm font-medium text-gray-700">Ano da Edição *</label>
                  <input
                    id="edition_year"
                    type="number"
                    value={newEdition.year}
                    onChange={(e) => setNewEdition(s => ({ ...s, year: e.target.value === '' ? '' : Number(e.target.value) }))}
                    required
                    className="w-full rounded-lg border px-4 py-2"
                    placeholder="Ex: 2025"
                    min={1900}
                  />
                </div>
                <div>
                  <label htmlFor="edition_local" className="block text-sm font-medium text-gray-700">Local (Ex: Curitiba/PR)</label>
                  <input
                    id="edition_local"
                    type="text"
                    value={newEdition.local}
                    onChange={(e) => setNewEdition(s => ({ ...s, local: e.target.value }))}
                    className="w-full rounded-lg border px-4 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="edition_description" className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
                  <textarea
                    id="edition_description"
                    value={newEdition.description}
                    onChange={(e) => setNewEdition(s => ({ ...s, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border px-4 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowEditionModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 cursor-pointer">
                    Criar Edição
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showArticleModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-40">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold">
                {isBulkUpload ? 'Importar Artigos em Massa' : 'Cadastrar Novo Artigo'}
              </h3>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setIsBulkUpload(false); setUploadReport(null); }}
                  className={`px-4 py-2 rounded-lg ${!isBulkUpload ? 'bg-blue-600 text-white cursor-pointer' : 'bg-gray-200 text-gray-700 cursor-pointer'}`}
                >
                  Cadastro Manual
                </button>
                <button
                  onClick={() => { setIsBulkUpload(true); setUploadReport(null); }}
                  className={`px-4 py-2 rounded-lg ${isBulkUpload ? 'bg-blue-600 text-white cursor-pointer' : 'bg-gray-200 text-gray-700 cursor-pointer'}`}
                >
                  Importar BibTeX
                </button>
              </div>

              {uploadReport && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-bold text-lg mb-2">Relatório de Importação:</h4>
                  <p className="flex items-center text-green-700 font-semibold">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {uploadReport.createdCount} Artigo(s) Criado(s) com Sucesso.
                  </p>
                  <p className={`flex items-center font-semibold ${uploadReport.skippedCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                    <XCircle className="h-5 w-5 mr-2" />
                    {uploadReport.skippedCount} Artigo(s) Pulado(s).
                  </p>

                  {uploadReport.skippedCount > 0 && (
                    <div className="mt-3 p-3 bg-white border rounded-md max-h-40 overflow-y-auto text-sm">
                      <h5 className="font-semibold text-red-700 mb-1">Detalhes dos Pulados:</h5>
                      {uploadReport.skipped.map((s, index) => (
                        <p key={index} className="text-gray-700">
                          <strong>{s.key}:</strong> {s.reason}
                        </p>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setUploadReport(null)} className="mt-4 text-blue-600 hover:text-blue-800 text-sm cursor-pointer">
                    Continuar
                  </button>
                </div>
              )}

              <form onSubmit={handleCreateArticle} className="space-y-4 mt-4" style={{ display: uploadReport ? 'none' : 'block' }}>
                {!isBulkUpload ? (
                  <>
                    <div className="flex flex-wrap -mx-2">
                      <div className="w-full md:w-1/2 px-2 space-y-4">
                        <div className="w-full">
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título *</label>
                          <input id="title" type="text" value={newArticle.title} onChange={(e) => setNewArticle((s) => ({ ...s, title: e.target.value }))} required className="w-full rounded-lg border px-4 py-2" />
                        </div>
                        <div className="w-full">
                          <label htmlFor="eventName" className="block text-sm font-medium text-gray-700">Nome do Evento (Ex: SBES) *</label>
                          <input id="eventName" type="text" value={newArticle.eventName} onChange={(e) => setNewArticle((s) => ({ ...s, eventName: e.target.value }))} required className="w-full rounded-lg border px-4 py-2" />
                        </div>
                        <div className="w-full">
                          <label htmlFor="year" className="block text-sm font-medium text-gray-700">Ano da Edição *</label>
                          <input id="year" type="number" value={newArticle.year} onChange={(e) => setNewArticle((s) => ({ ...s, year: e.target.value === '' ? '' : Number(e.target.value) }))} required className="w-full rounded-lg border px-4 py-2" placeholder="Ex.: 2024" min={1900} />
                        </div>
                        <div className="w-full">
                          <label htmlFor="pdf" className="block text-sm font-medium text-gray-700">PDF *</label>
                          <input id="pdf" type="file" accept="application/pdf" onChange={(e) => setNewArticle((s) => ({ ...s, pdf: e.target.files && e.target.files[0] ? e.target.files[0] : null }))} required={!newArticle.pdf} className="w-full text-sm border rounded-lg px-4 py-2" />
                        </div>
                      </div>

                      <div className="w-full md:w-1/2 px-2 space-y-4 mt-4 md:mt-0">
                        <div className="w-full">
                          <label htmlFor="abstract" className="block text-sm font-medium text-gray-700">Resumo (Abstract)</label>
                          <textarea id="abstract" value={newArticle.abstract} onChange={(e) => setNewArticle((s) => ({ ...s, abstract: e.target.value }))} rows={4} className="w-full rounded-lg border px-4 py-2" />
                        </div>
                        <div className="w-full">
                          <label htmlFor="authors" className="block text-sm font-medium text-gray-700">Autores (opcional, separados por ; ou ,)</label>
                          <input id="authors" type="text" value={newArticle.authorsCsv} onChange={(e) => setNewArticle((s) => ({ ...s, authorsCsv: e.target.value }))} placeholder="Maria; João; Fulano" className="w-full rounded-lg border px-4 py-2" />
                        </div>
                        <div className="flex gap-4 w-full">
                          <div className="flex-1">
                            <label htmlFor="startPage" className="block text-sm font-medium text-gray-700">Pág. Inicial</label>
                            <input id="startPage" type="number" value={newArticle.startPage} onChange={(e) => setNewArticle((s) => ({ ...s, startPage: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full rounded-lg border px-4 py-2" min={1} />
                          </div>
                          <div className="flex-1">
                            <label htmlFor="endPage" className="block text-sm font-medium text-gray-700">Pág. Final</label>
                            <input id="endPage" type="number" value={newArticle.endPage} onChange={(e) => setNewArticle((s) => ({ ...s, endPage: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full rounded-lg border px-4 py-2" min={1} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700">
                        Selecione o arquivo BibTeX (.bib) e o arquivo ZIP contendo os PDFs nomeados pelas chaves de citação (ex: <code>sbes-paper1.pdf</code>).
                      </p>

                      <FileDropzone
                        label="Arquivo BibTeX (.bib)"
                        file={bulkFiles.bibtex}
                        required={true}
                        mimeType="text/plain"
                        setFile={(file) => setBulkFiles((s) => ({ ...s, bibtex: file }))}
                        isDragging={isBibDragging}
                        setIsDragging={setIsBibDragging}
                      />
                      <FileDropzone
                        label="Arquivo ZIP com PDFs"
                        file={bulkFiles.pdfs}
                        required={true}
                        mimeType="application/zip"
                        setFile={(file) => setBulkFiles((s) => ({ ...s, pdfs: file }))}
                        isDragging={isPdfsDragging}
                        setIsDragging={setIsPdfsDragging}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                  <button type="button" onClick={resetModal} className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                    {isBulkUpload ? 'Importar Artigos' : 'Cadastrar Artigo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      <Footer />
    </>
  );
}
