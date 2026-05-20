import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  createNote: (title?: string) => void;
  updateNote: (id: string, content: string, title?: string) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      activeNoteId: null,

      createNote: (title = 'Untitled Note') => {
        const newNote: Note = {
          id: uuidv4(),
          title,
          content: '# ' + title + '\n\n',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          notes: [newNote, ...state.notes],
          activeNoteId: newNote.id,
        }));
      },

      updateNote: (id, content, title) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === id) {
              return {
                ...note,
                content,
                title: title !== undefined ? title : note.title,
                updatedAt: Date.now(),
              };
            }
            return note;
          }),
        }));
      },

      deleteNote: (id) => {
        set((state) => {
          const newNotes = state.notes.filter((n) => n.id !== id);
          return {
            notes: newNotes,
            activeNoteId: state.activeNoteId === id ? (newNotes.length > 0 ? newNotes[0].id : null) : state.activeNoteId,
          };
        });
      },

      setActiveNote: (id) => {
        set({ activeNoteId: id });
      },
    }),
    {
      name: 'devsuite-notes-storage',
    }
  )
);
