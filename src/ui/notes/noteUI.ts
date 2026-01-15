/**
 * NoteUI - Handles note display and user interactions
 */

import { NoteManager } from './noteManager';

export class NoteUI {
    static currentNoteIndex = 0;
    static isOpen = false;

    /**
     * Initialize note UI and check for unread notes
     */
    static async init(): Promise<void> {
        await NoteManager.loadNotes();
        this.initAfterLoad();
    }

    /**
     * Initialize UI after notes data is already loaded
     */
    static initAfterLoad(): void {
        this.bindEvents();

        // Auto show if there are unread notes
        if (NoteManager.hasUnreadNotes()) {
            this.showNoteList();
        }
        this.updateNoteBtnBadge();
    }

    /**
     * Bind UI events
     */
    static bindEvents(): void {
        // Note button click
        let noteBtn = document.getElementById("noteBtn");
        if (noteBtn) {
            noteBtn.addEventListener("click", () => {
                this.showNoteList();
            });
        }

        // Close button
        let closeBtn = document.getElementById("noteCloseBtn");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                this.hideNotePanel();
            });
        }

        // Back to list button
        let backBtn = document.getElementById("noteBackBtn");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                this.showNoteList();
            });
        }

        // Mark as read button
        let readBtn = document.getElementById("noteReadBtn");
        if (readBtn) {
            readBtn.addEventListener("click", () => {
                let note = NoteManager.notes[this.currentNoteIndex];
                if (note) {
                    NoteManager.markAsRead(note.id);
                    this.showNoteList();
                }
            });
        }

        // Ignore all button
        let ignoreAllBtn = document.getElementById("noteIgnoreAllBtn");
        if (ignoreAllBtn) {
            ignoreAllBtn.addEventListener("click", () => {
                NoteManager.markAllAsRead();
                this.hideNotePanel();
                this.updateNoteBtnBadge();
            });
        }

        // Mark all as unread button
        let unreadAllBtn = document.getElementById("noteUnreadAllBtn");
        if (unreadAllBtn) {
            unreadAllBtn.addEventListener("click", () => {
                NoteManager.markAllAsUnread();
                this.showNoteList();
                this.updateNoteBtnBadge();
            });
        }

        // Mark as unread button (in content view)
        let unreadBtn = document.getElementById("noteUnreadBtn");
        if (unreadBtn) {
            unreadBtn.addEventListener("click", () => {
                let note = NoteManager.notes[this.currentNoteIndex];
                if (note) {
                    NoteManager.markAsUnread(note.id);
                    this.showNoteList();
                    this.updateNoteBtnBadge();
                }
            });
        }

        // Previous note button
        let prevBtn = document.getElementById("notePrevBtn");
        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                if (this.currentNoteIndex > 0) {
                    this.showNoteContent(this.currentNoteIndex - 1);
                }
            });
        }

        // Next note button
        let nextBtn = document.getElementById("noteNextBtn");
        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                if (this.currentNoteIndex < NoteManager.notes.length - 1) {
                    this.showNoteContent(this.currentNoteIndex + 1);
                }
            });
        }

        // Click outside to close
        let notePanel = document.getElementById("notePanel");
        if (notePanel) {
            notePanel.addEventListener("click", (e) => {
                if (e.target === notePanel) {
                    this.hideNotePanel();
                }
            });
        }
    }

    /**
     * Show note list
     */
    static showNoteList(): void {
        let notePanel = document.getElementById("notePanel");
        let noteList = document.getElementById("noteList");
        let noteContent = document.getElementById("noteContent");
        let noteListContainer = document.getElementById("noteListContainer");

        if (!notePanel || !noteList || !noteContent || !noteListContainer) return;

        notePanel.style.display = "flex";
        noteList.style.display = "block";
        noteContent.style.display = "none";
        this.isOpen = true;

        // Render note list
        noteListContainer.innerHTML = "";
        NoteManager.notes.forEach((note, index) => {
            let isRead = NoteManager.isRead(note.id);
            let item = document.createElement("div");
            item.className = "noteListItem" + (isRead ? "" : " unread");
            item.innerHTML = `
                <span class="noteTitle">${note.title}</span>
                ${isRead ? "" : '<span class="unreadBadge">[未读]</span>'}
            `;
            item.addEventListener("click", () => {
                this.showNoteContent(index);
            });
            noteListContainer.appendChild(item);
        });

        // Show ignore all button only if there are unread notes
        let ignoreAllBtn = document.getElementById("noteIgnoreAllBtn");
        if (ignoreAllBtn) {
            ignoreAllBtn.style.display = NoteManager.hasUnreadNotes() ? "block" : "none";
        }
    }

    /**
     * Show note content
     */
    static async showNoteContent(index: number): Promise<void> {
        let noteList = document.getElementById("noteList");
        let noteContent = document.getElementById("noteContent");
        let noteContentBody = document.getElementById("noteContentBody");
        let noteContentTitle = document.getElementById("noteContentTitle");
        let prevBtn = document.getElementById("notePrevBtn") as HTMLButtonElement;
        let nextBtn = document.getElementById("noteNextBtn") as HTMLButtonElement;

        if (!noteList || !noteContent || !noteContentBody) return;

        this.currentNoteIndex = index;
        let note = NoteManager.notes[index];
        if (!note) return;

        noteList.style.display = "none";
        noteContent.style.display = "block";

        // Set title
        if (noteContentTitle) {
            noteContentTitle.textContent = note.title;
        }

        // Update navigation buttons state
        if (prevBtn) {
            prevBtn.disabled = index === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = index === NoteManager.notes.length - 1;
        }

        // Load and render content
        noteContentBody.innerHTML = "加载中...";
        let content = await NoteManager.loadNoteContent(note.file);
        noteContentBody.innerHTML = this.renderMarkdown(content);
    }

    /**
     * Simple markdown renderer
     */
    static renderMarkdown(markdown: string): string {
        let html = markdown
            // Escape HTML
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            // Links (must be before other formatting to avoid conflicts)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // Headers
            .replace(/^### (.+)$/gm, "<h3>$1</h3>")
            .replace(/^## (.+)$/gm, "<h2>$1</h2>")
            .replace(/^# (.+)$/gm, "<h1>$1</h1>")
            // Bold
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            // Italic
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            // Code
            .replace(/`(.+?)`/g, "<code>$1</code>")
            // Ordered list items (basic)
            .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
            // List items
            .replace(/^- (.+)$/gm, "<li>$1</li>")
            // Paragraphs
            .replace(/\n\n/g, "</p><p>")
            // Line breaks
            .replace(/\n/g, "<br>");

        // Wrap consecutive list items in ul (simple, but avoids spanning the whole document)
        html = html.replace(/((?:<li>.*?<\/li>(?:<br>)?)+)/gs, "<ul>$1</ul>");
        // Clean up list formatting artifacts
        html = html.replace(/<ul><br>/g, "<ul>");
        html = html.replace(/<br><\/ul>/g, "</ul>");
        html = html.replace(/<\/ul><br><ul>/g, "");

        return `<p>${html}</p>`;
    }

    /**
     * Hide note panel
     */
    static hideNotePanel(): void {
        let notePanel = document.getElementById("notePanel");
        if (notePanel) {
            notePanel.style.display = "none";
        }
        this.isOpen = false;
        this.updateNoteBtnBadge();
    }

    /**
     * Update note button badge
     */
    static updateNoteBtnBadge(): void {
        let badge = document.getElementById("noteBtnBadge");
        if (badge) {
            let unreadCount = NoteManager.getUnreadNotes().length;
            if (unreadCount > 0) {
                badge.textContent = unreadCount.toString();
                badge.style.display = "block";
            } else {
                badge.style.display = "none";
            }
        }
    }
}
