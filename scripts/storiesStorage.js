// storiesStorage.js - LocalForage wrapper for stories and dictionaries
// Initialize localforage instances (with fallback)
let storiesStore = null;
let dictionariesStore = null;
let usingLocalStorage = false;

// Initialize storage
async function initStorageInstances() {
    // Check if localforage is available
    if (typeof localforage !== 'undefined') {
        try {
            storiesStore = localforage.createInstance({
                name: 'istories',
                storeName: 'user_stories'
            });

            dictionariesStore = localforage.createInstance({
                name: 'istories',
                storeName: 'user_dictionaries'
            });
            
            console.log('LocalForage initialized successfully');
            return true;
        } catch (error) {
            console.warn('LocalForage failed, using localStorage fallback:', error);
        }
    }
    
    // Fallback to localStorage
    storiesStore = null;
    dictionariesStore = null;
    usingLocalStorage = true;
    console.log('Using localStorage fallback for storage');
    return false;
}

// ============ USER STORIES FUNCTIONS ============

// Get all user stories
async function getUserStoriesFromStorage() {
    try {
        if (storiesStore && !usingLocalStorage) {
            const stories = await storiesStore.getItem('stories');
            return stories || [];
        } else {
            // Fallback to localStorage
            const stories = localStorage.getItem('userStories');
            return stories ? JSON.parse(stories) : [];
        }
    } catch (error) {
        console.error('Error getting user stories:', error);
        return [];
    }
}

// Save all user stories
async function saveUserStoriesToStorage(stories) {
    try {
        if (storiesStore && !usingLocalStorage) {
            await storiesStore.setItem('stories', stories);
        }
        // Always save to localStorage as backup
        localStorage.setItem('userStories', JSON.stringify(stories));
        console.log('Stories saved:', stories.length);
        return true;
    } catch (error) {
        console.error('Error saving stories:', error);
        // Fallback to localStorage only
        localStorage.setItem('userStories', JSON.stringify(stories));
        return false;
    }
}

// Add a single story
async function addStoryToStorage(story) {
    try {
        const stories = await getUserStoriesFromStorage();
        
        // Check for duplicate
        const exists = stories.some(s => 
            s.title === story.title && 
            JSON.stringify(s.content) === JSON.stringify(story.content)
        );
        
        if (exists) {
            return { success: false, reason: 'duplicate' };
        }
        
        // Generate unique ID if not present
        if (!story.id) {
            story.id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        stories.push(story);
        await saveUserStoriesToStorage(stories);
        
        return { success: true, story };
    } catch (error) {
        console.error('Error adding story:', error);
        return { success: false, reason: 'error', error };
    }
}

// Update a story
async function updateStoryInStorage(storyId, updatedStory) {
    try {
        const stories = await getUserStoriesFromStorage();
        const index = stories.findIndex(s => s.id === storyId);
        
        if (index === -1) {
            return { success: false, reason: 'not_found' };
        }
        
        stories[index] = { ...stories[index], ...updatedStory };
        await saveUserStoriesToStorage(stories);
        
        return { success: true, story: stories[index] };
    } catch (error) {
        console.error('Error updating story:', error);
        return { success: false, reason: 'error', error };
    }
}

// Delete a story
async function deleteStoryFromStorage(storyId) {
    try {
        const stories = await getUserStoriesFromStorage();
        const filteredStories = stories.filter(s => s.id !== storyId);
        
        await saveUserStoriesToStorage(filteredStories);
        await deleteDictionaryForStory(storyId);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting story:', error);
        return { success: false, reason: 'error', error };
    }
}

// Get a single story by ID
async function getStoryById(storyId) {
    try {
        const stories = await getUserStoriesFromStorage();
        return stories.find(s => s.id === storyId) || null;
    } catch (error) {
        console.error('Error getting story by ID:', error);
        return null;
    }
}

// ============ USER DICTIONARIES FUNCTIONS ============

// Get all dictionaries
async function getAllDictionaries() {
    try {
        if (dictionariesStore && !usingLocalStorage) {
            const dictionaries = await dictionariesStore.getItem('dictionaries');
            return dictionaries || {};
        } else {
            const dictionaries = localStorage.getItem('userDictionaries');
            return dictionaries ? JSON.parse(dictionaries) : {};
        }
    } catch (error) {
        console.error('Error getting dictionaries:', error);
        return {};
    }
}

// Save all dictionaries
async function saveAllDictionaries(dictionaries) {
    try {
        if (dictionariesStore && !usingLocalStorage) {
            await dictionariesStore.setItem('dictionaries', dictionaries);
        }
        localStorage.setItem('userDictionaries', JSON.stringify(dictionaries));
        return true;
    } catch (error) {
        console.error('Error saving dictionaries:', error);
        localStorage.setItem('userDictionaries', JSON.stringify(dictionaries));
        return false;
    }
}

// Get dictionary for a specific story
async function getDictionaryForStory(storyId) {
    try {
        const dictionaries = await getAllDictionaries();
        return dictionaries[storyId] || {};
    } catch (error) {
        console.error('Error getting dictionary for story:', error);
        return {};
    }
}

// Save dictionary for a specific story
async function saveDictionaryForStory(storyId, dictionary) {
    try {
        const dictionaries = await getAllDictionaries();
        dictionaries[storyId] = dictionary;
        await saveAllDictionaries(dictionaries);
        return true;
    } catch (error) {
        console.error('Error saving dictionary for story:', error);
        return false;
    }
}

// Delete dictionary for a story
async function deleteDictionaryForStory(storyId) {
    try {
        const dictionaries = await getAllDictionaries();
        delete dictionaries[storyId];
        await saveAllDictionaries(dictionaries);
        return true;
    } catch (error) {
        console.error('Error deleting dictionary:', error);
        return false;
    }
}

// ============ MIGRATION FUNCTIONS ============

// Migrate from localStorage to localforage
async function migrateFromLocalStorage() {
    try {
        const localStorageStories = localStorage.getItem('userStories');
        if (localStorageStories) {
            const stories = JSON.parse(localStorageStories);
            await saveUserStoriesToStorage(stories);
            console.log('Migrated', stories.length, 'stories from localStorage');
        }
        
        const localStorageDictionaries = localStorage.getItem('userDictionaries');
        if (localStorageDictionaries) {
            const dictionaries = JSON.parse(localStorageDictionaries);
            await saveAllDictionaries(dictionaries);
            console.log('Migrated dictionaries from localStorage');
        }
        
        return true;
    } catch (error) {
        console.error('Migration error:', error);
        return false;
    }
}

// ============ LEGACY SUPPORT ============

// Keep localStorage in sync
async function syncToLocalStorage() {
    try {
        const stories = await getUserStoriesFromStorage();
        const dictionaries = await getAllDictionaries();
        
        localStorage.setItem('userStories', JSON.stringify(stories));
        localStorage.setItem('userDictionaries', JSON.stringify(dictionaries));
        
        console.log('Synced to localStorage');
    } catch (error) {
        console.error('Error syncing to localStorage:', error);
    }
}

// Call sync on any changes
async function saveStoryWithSync(story, translations) {
    const result = await addStoryToStorage(story);
    if (result.success && translations) {
        await saveDictionaryForStory(story.id, translations);
    }
    await syncToLocalStorage();
    return result;
}

async function deleteStoryWithSync(storyId) {
    const result = await deleteStoryFromStorage(storyId);
    await syncToLocalStorage();
    return result;
}

// Initialize storage - migrate if needed
async function initStorage() {
    try {
        // Initialize storage instances
        await initStorageInstances();
        
        // Check if we have data
        const stories = await getUserStoriesFromStorage();
        
        // If no stories, try to migrate from localStorage
        if (stories.length === 0) {
            await migrateFromLocalStorage();
        }
        
        console.log('Storage initialized');
    } catch (error) {
        console.error('Storage initialization error:', error);
    }
}

// Auto-initialize when script loads
initStorage();
