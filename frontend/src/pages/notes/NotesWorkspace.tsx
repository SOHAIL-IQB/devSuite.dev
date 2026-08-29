import { useState, useRef, useEffect } from 'react';
import { useNotesStore } from '@/store/notesStore';
import type { Note } from '@/store/notesStore';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2, FileText, Search, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useThemeStore } from '@/store/themeStore';

export function NotesWorkspace() {
  const { notes, activeNoteId, createNote, updateNote, deleteNote, setActiveNote } = useNotesStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const filteredNotes = notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (activeNote && editorRef.current) {
      if (editorRef.current.getValue() !== activeNote.content) {
        editorRef.current.setValue(activeNote.content);
      }
    }
  }, [activeNoteId, activeNote]);

  const handleEditorWillMount = (monacoInstance: any) => {
    if (!monacoInstance) return;
    monacoInstance.editor.defineTheme('devworkspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#09090b',
        'editor.lineHighlightBackground': '#18181b',
        'editorLineNumber.foreground': '#52525b',
      },
    });
    monacoInstance.editor.defineTheme('devworkspace-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
      },
    });
  };

  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance;
  };

  const startRename = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(note.id);
    setEditTitle(note.title);
  };

  const saveRename = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (editingId && editTitle.trim()) {
      updateNote(editingId, notes.find((n) => n.id === editingId)?.content || '', editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="h-full flex bg-background">
      {/* SIDEBAR */}
      <div className="w-64 border-r bg-muted/10 flex flex-col shrink-0">
        <div className="p-4 border-b bg-background flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center">
              <FileText className="w-4 h-4 mr-2" /> My Notes
            </h2>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => createNote()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-muted-foreground" />
            <Input 
              placeholder="Search notes..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="h-7.5 pl-7 text-[13px] bg-muted/50 border-transparent focus-visible:ring-1"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground mt-8">No notes found.</div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setActiveNote(note.id)}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  activeNoteId === note.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'
                }`}
              >
                {editingId === note.id ? (
                  <form onSubmit={saveRename} className="flex-1 flex items-center mr-2">
                    <Input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveRename()}
                      className="h-6 text-[13px] px-1.5 py-0"
                    />
                  </form>
                ) : (
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-[13px] truncate">{note.title}</span>
                    <span className="text-[11px] text-muted-foreground opacity-70">
                      {format(note.updatedAt, 'MMM d, h:mm a')}
                    </span>
                  </div>
                )}

                {editingId !== note.id && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => startRename(note, e)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        {!activeNote ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a note or create a new one to start writing.</p>
            <Button className="mt-4" onClick={() => createNote()}>
              <Plus className="w-4 h-4 mr-2" /> Create Note
            </Button>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-none border-none">
            {/* EDITOR PANEL */}
            {!isPreviewExpanded && (
              <>
                <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col relative min-h-0 bg-background overflow-hidden">
                  <div className="h-10 border-b flex items-center px-4 bg-muted/5 shrink-0 justify-between">
                    <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Markdown Editor</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="absolute inset-0">
                      <Editor
                        language="markdown"
                        theme={isDark ? 'devworkspace-dark' : 'devworkspace-light'}
                        value={activeNote.content}
                        beforeMount={handleEditorWillMount}
                        onMount={handleEditorMount}
                        onChange={(val) => {
                          if (val !== undefined) {
                            updateNote(activeNote.id, val);
                          }
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          padding: { top: 16, bottom: 16 },
                          wordWrap: 'on',
                          lineNumbers: 'off',
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
              </>
            )}

            {/* PREVIEW PANEL */}
            <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-h-0 bg-background overflow-hidden">
              <div className="h-10 border-b flex items-center px-4 bg-muted/5 shrink-0 justify-between">
                <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}>
                  {isPreviewExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 relative">
                <article className={`prose ${isDark ? 'prose-invert' : ''} max-w-3xl mx-auto prose-sm md:prose-base`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeNote.content}
                  </ReactMarkdown>
                </article>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
