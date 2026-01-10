/**
 * NoteManager - Handles note loading and read status tracking
 */

export interface Note {
    id: string;
    title: string;
    file: string;
}

export class NoteManager {
    static STORAGE_KEY = "HitWar_read_notes";
    static notes: Note[] = [];
    static loaded = false;

    /**
     * Load notes configuration from notes.json
     */
    static async loadNotes(): Promise<Note[]> {
        try {
            let response = await fetch("/NOTE/notes.json");
            let data = await response.json();
            this.notes = data.notes || [];
            this.loaded = true;
            return this.notes;
        } catch (error) {
            console.error("Failed to load notes:", error);
            this.notes = [];
            this.loaded = true;
            return [];
        }
    }

    /**
     * Load note content from markdown file
     */
    static async loadNoteContent(filename: string): Promise<string> {
        try {
            let response = await fetch(`NOTE/${filename}`);
            let content = await response.text();
            return content.trim();
        } catch (error) {
            console.error("Failed to load note content:", error);
            return "加载公告内容失败";
        }
    }

    /**
     * Get read note IDs from localStorage
     */
    static getReadNotes(): Set<string> {
        try {
            let data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return new Set(JSON.parse(data));
            }
        } catch (error) {
            console.error("Failed to load read notes:", error);
        }
        return new Set();
    }

    /**
     * Mark a note as read
     */
    static markAsRead(noteId: string): void {
        let readNotes = this.getReadNotes();
        readNotes.add(noteId);
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...readNotes]));
        } catch (error) {
            console.error("Failed to save read notes:", error);
        }
    }

    /**
     * Mark all notes as read
     */
    static markAllAsRead(): void {
        let allIds = this.notes.map(note => note.id);
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allIds));
        } catch (error) {
            console.error("Failed to save read notes:", error);
        }
    }

    /**
     * Mark a note as unread
     */
    static markAsUnread(noteId: string): void {
        let readNotes = this.getReadNotes();
        readNotes.delete(noteId);
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...readNotes]));
        } catch (error) {
            console.error("Failed to save read notes:", error);
        }
    }

    /**
     * Mark all notes as unread
     */
    static markAllAsUnread(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
        } catch (error) {
            console.error("Failed to save read notes:", error);
        }
    }

    /**
     * Check if a note is read
     */
    static isRead(noteId: string): boolean {
        return this.getReadNotes().has(noteId);
    }

    /**
     * Get unread notes
     */
    static getUnreadNotes(): Note[] {
        let readNotes = this.getReadNotes();
        return this.notes.filter(note => !readNotes.has(note.id));
    }

    /**
     * Check if there are unread notes
     */
    static hasUnreadNotes(): boolean {
        return this.getUnreadNotes().length > 0;
    }
}
