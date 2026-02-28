// User-specific data management
class UserDataManager {
    constructor() {
        this.currentUser = null;
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    // Text management
    getTexts() {
        if (!this.currentUser) return [];
        return window.db.getUserTexts(this.currentUser.id);
    }

    saveText(text) {
        if (!this.currentUser) return;

        const texts = this.getTexts();
        text.id = Date.now().toString();
        text.userId = this.currentUser.id;
        text.createdAt = new Date().toISOString();
        texts.push(text);

        window.db.saveUserTexts(this.currentUser.id, texts);
    }

    deleteText(textId) {
        if (!this.currentUser) return;

        const texts = this.getTexts();
        const filtered = texts.filter(t => t.id !== textId);

        window.db.saveUserTexts(this.currentUser.id, filtered);
    }

    // Progress tracking
    getProgress() {
        if (!this.currentUser) return { flashcards: 0, texts: 0 };

        return {
            flashcards: this.getFlashcards().length,
            texts: this.getTexts().length,
            lastActivity: new Date().toISOString()
        };
    }
}

// Global user data manager
window.userDataManager = new UserDataManager();