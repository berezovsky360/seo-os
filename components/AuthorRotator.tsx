import React, { useState } from 'react';
import { THEMES, THEME_KEYS } from '../constants';
import { UserRole, PersonaDB } from '../types';
import { Shuffle, User, Settings, CheckCircle2, ChevronLeft, Download, Bell, Trash2, Loader2 } from 'lucide-react';
import { usePersonas, useCreatePersona, useUpdatePersona, useDeletePersona } from '@/hooks/usePersonas';
import PersonaEditorModal from './PersonaEditorModal';
import { useToast } from '@/lib/contexts/ToastContext';

interface AuthorRotatorProps {
    userRole: UserRole;
    onBack?: () => void;
}

const PageHeader = ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div className="flex justify-between items-center px-4 sm:px-8 py-5 bg-[#F5F6F8] z-10 sticky top-0">
        <div className="flex items-center gap-3 sm:gap-4">
            {onBack && (
                <>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <ChevronLeft size={14} />
                        Back
                    </button>
                    <div className="h-4 w-px bg-gray-300"></div>
                </>
            )}
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
                <Download size={16} />
                <span>Export</span>
            </button>
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#F5F6F8]"></span>
            </button>
             <div className="w-9 h-9 rounded-full bg-gray-200 p-[2px] shadow-sm overflow-hidden">
                 <img src="https://picsum.photos/100/100?random=101" alt="User" className="w-full h-full rounded-full object-cover" />
             </div>
        </div>
    </div>
);

const AuthorRotator: React.FC<AuthorRotatorProps> = ({ userRole, onBack }) => {
    const [hoveredAuthor, setHoveredAuthor] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingPersona, setEditingPersona] = useState<PersonaDB | null>(null);

    const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';
    const toast = useToast();

    // Real data from Supabase
    const { data: personas = [], isLoading } = usePersonas();
    const createPersona = useCreatePersona();
    const updatePersona = useUpdatePersona();
    const deletePersona = useDeletePersona();

    const activePersona = personas.find(p => p.is_default) || personas.find(p => p.active) || personas[0];

    const handleOpenCreate = () => {
        setEditingPersona(null);
        setEditorOpen(true);
    };

    const handleOpenEdit = (persona: PersonaDB) => {
        setEditingPersona(persona);
        setEditorOpen(true);
    };

    const handleSave = async (data: {
        name: string;
        role: string;
        avatar_url: string;
        system_prompt: string;
        writing_style: string;
        is_default: boolean;
    }) => {
        try {
            if (editingPersona) {
                await updatePersona.mutateAsync({ personaId: editingPersona.id, ...data });
                toast.success('Persona updated');
            } else {
                await createPersona.mutateAsync(data);
                toast.success('Persona created');
            }
            setEditorOpen(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save persona');
        }
    };

    const handleDelete = async (personaId: string, name: string) => {
        if (!window.confirm(`Delete persona "${name}"? This will also remove all uploaded documents.`)) return;
        try {
            await deletePersona.mutateAsync(personaId);
            toast.success('Persona deleted');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete persona');
        }
    };

    const handleSetActive = async (persona: PersonaDB) => {
        try {
            await updatePersona.mutateAsync({ personaId: persona.id, is_default: true });
            toast.success(`${persona.name} set as default`);
        } catch (err) {
            toast.error('Failed to update');
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#F5F6F8] relative font-sans">
            <PageHeader title="Personas" onBack={onBack} />

            <div className="flex-1 overflow-y-auto px-8 pb-32">
                <div className="mb-6 flex items-center justify-between">
                     <p className="text-sm text-gray-500 font-medium">Manage AI identities, tones, and writing styles for automated content generation.</p>
                     {activePersona && (
                         <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                            <Shuffle size={14} className="text-indigo-600" />
                            <span>Default: <span className="font-semibold text-gray-900">{activePersona.name}</span></span>
                        </div>
                     )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {personas.map((author, index) => {
                             const themeKey = THEME_KEYS[index % THEME_KEYS.length];
                             const themeStyle = THEMES[themeKey];
                             const isLight = themeKey === 'cotton-candy';
                             const textColor = isLight ? 'text-gray-900' : 'text-white';
                             const subTextColor = isLight ? 'text-gray-600' : 'text-white/70';

                            return (
                                <div
                                    key={author.id}
                                    className="group relative bg-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 flex flex-col overflow-hidden border border-gray-100 h-[320px] cursor-pointer"
                                    onMouseEnter={() => setHoveredAuthor(author.id)}
                                    onMouseLeave={() => setHoveredAuthor(null)}
                                >
                                    {/* 3D Header */}
                                    <div
                                        className="relative h-[160px] p-6 flex flex-col justify-between transition-transform duration-700 group-hover:scale-[1.02]"
                                        style={themeStyle}
                                    >
                                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>

                                        <div className="relative z-10 flex justify-between items-start">
                                             <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isLight ? 'border-gray-200' : 'border-white/20'} shadow-lg flex items-center justify-center bg-white/20`}>
                                                {author.avatar_url ? (
                                                    <img src={author.avatar_url} alt={author.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={20} className={isLight ? 'text-gray-400' : 'text-white/60'} />
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                 {canEdit && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(author); }}
                                                            className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors hover:text-white"
                                                            title="Edit"
                                                        >
                                                            <Settings size={14} className={isLight ? 'text-gray-700' : 'text-white'}/>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(author.id, author.name); }}
                                                            className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-rose-500/80 transition-colors hover:text-white"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} className={isLight ? 'text-gray-700' : 'text-white'}/>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative z-10">
                                            <h3 className={`text-lg font-bold ${textColor} tracking-tight`}>{author.name}</h3>
                                            <p className={`text-xs font-medium ${subTextColor}`}>{author.role}</p>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 p-6 bg-white flex flex-col relative">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Tone</div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                author.writing_style === 'formal' ? 'bg-blue-100 text-blue-600' :
                                                author.writing_style === 'casual' ? 'bg-green-100 text-green-600' :
                                                author.writing_style === 'technical' ? 'bg-purple-100 text-purple-600' :
                                                author.writing_style === 'creative' ? 'bg-orange-100 text-orange-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {author.writing_style}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                                            {author.system_prompt || 'No system prompt configured'}
                                        </p>

                                        {/* Action Overlay */}
                                        {!author.is_default ? (
                                             <div className={`absolute inset-0 bg-white/90 backdrop-blur-[2px] flex items-center justify-center p-6 transition-opacity duration-300 ${hoveredAuthor === author.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                                 {canEdit && (
                                                    <button
                                                        onClick={() => handleSetActive(author)}
                                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:scale-105"
                                                    >
                                                        Set as Default
                                                    </button>
                                                 )}
                                             </div>
                                        ) : (
                                            <div className="absolute bottom-6 right-6">
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold shadow-sm border border-emerald-200">
                                                    <CheckCircle2 size={12} />
                                                    Default
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add New Placeholder */}
                        {canEdit && (
                            <div
                                onClick={handleOpenCreate}
                                className="group rounded-[2rem] border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-white transition-all duration-300 cursor-pointer flex flex-col items-center justify-center h-[320px]"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <User size={32} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <span className="font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">Create Persona</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <PersonaEditorModal
                isOpen={editorOpen}
                onClose={() => setEditorOpen(false)}
                persona={editingPersona}
                onSave={handleSave}
                isSaving={createPersona.isPending || updatePersona.isPending}
            />
        </div>
    );
};

export default AuthorRotator;
