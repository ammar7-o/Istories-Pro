// App state
let savedWords = JSON.parse(localStorage.getItem('savedWords')) || [];
let theme = localStorage.getItem('theme') || 'light';
let fontSize = 1.2; // rem
let lineHeight = 1.8;
let isAudioPlaying = false;
let fontFamily = localStorage.getItem('fontFamily') || 'sans-serif'; // Add this line
let currentStory = null;
let currentWordData = null;
let dictionary = {};
let userDictionariesCache = {};
// Add this constant near the top with other constants
const MAX_PAGES = 10; // Maximum number of pages to convert from PDF
// Global variables for paragraph translation
// Add these with your other DOM elements
const pageSelectionModal = document.getElementById('pageSelectionModal');
const closePageModal = document.getElementById('closePageModal');
const cancelPageSelect = document.getElementById('cancelPageSelect');
const confirmPageSelect = document.getElementById('confirmPageSelect');
const totalPagesSpan = document.getElementById('totalPagesSpan');
const pageCheckboxes = document.getElementById('pageCheckboxes');
const selectAllPages = document.getElementById('selectAllPages');
const selectedCountSpan = document.getElementById('selectedCountSpan');
let paragraphTranslationEnabled = false;
let translationSettings = {
    autoDetectLanguage: true,
    targetLanguage: 'ar',
    showBothLanguages: false,
    translationProvider: 'google' // 'google' or 'deepl' or 'libretranslate'
};

// DOM elements
const storyTitle = document.getElementById('storyTitle');
const storyText = document.getElementById('storyText');
const dictionaryPopup = document.getElementById('dictionaryPopup');
const themeToggle = document.getElementById('themeToggle');
const fontSmaller = document.getElementById('fontSmaller');
const fontNormal = document.getElementById('fontNormal');
const fontLarger = document.getElementById('fontLarger');
const lineSpacingBtn = document.getElementById('lineSpacing');
const listenBtn = document.getElementById('listenBtn');
const saveWordBtn = document.getElementById('saveWordBtn');
const closePopup = document.getElementById('closePopup');
const modalOverlay = document.getElementById('modalOverlay');
const popupWord = document.getElementById('popupWord');
const popupTranslation = document.getElementById('popupTranslation');
const readingProgressBar = document.getElementById('readingProgressBar');
const backToHome = document.getElementById('backToHome');
const exportVocabularyBtn = document.getElementById('exportVocabulary');
const navTabs = document.querySelectorAll('.nav-tab');
const pages = document.querySelectorAll('.page');
const googleSearchBtn = document.getElementById('googleSearchBtn');
const listenWordBtn = document.getElementById('listenWordBtn');
const removebtn = document.getElementById("removebtn");
const sound = document.getElementById("sound");
const lvl = document.getElementById("lvl");
const lvlcefr = document.getElementById("lvlcefr");
const fontFamilySelect = document.getElementById('fontFamily'); // Add this line
const googleTranslateBtn = document.getElementById('googleTranslateBtn');

// ----------------------------------------------------
// 📚 وظائف القواميس والتوحيد
// ----------------------------------------------------
// Add these after your file upload variables
const STORAGE_KEY = 'currentUploadedStory';

// Save uploaded story to localStorage
function saveUploadedStoryToStorage(storyData, dictionaryData) {
    try {
        const storageData = {
            story: storyData,
            dictionary: dictionaryData,
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        console.log('Story saved to localStorage');
    } catch (error) {
        console.error('Error saving story to localStorage:', error);
    }
}

// Load uploaded story from localStorage
function loadUploadedStoryFromStorage() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            // Check if saved data is less than 24 hours old (optional)
            const age = Date.now() - parsed.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (age < maxAge) {
                return parsed;
            } else {
                // Clear old data
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    } catch (error) {
        console.error('Error loading story from localStorage:', error);
    }
    return null;
}

// Clear uploaded story from localStorage
function clearUploadedStory() {
    localStorage.removeItem(STORAGE_KEY);
}
// File upload variables
let storyFileInput = document.getElementById('storyFileInput');
let browseStoryBtn = document.getElementById('browseStoryBtn');
let selectedFileName = document.getElementById('selectedFileName');

// Set up file upload listeners
if (browseStoryBtn) {
    browseStoryBtn.addEventListener('click', () => {
        storyFileInput.click();
    });
}

// Update the file input listener to use the new handler
if (storyFileInput) {
    // Remove existing listener to avoid duplicates
    storyFileInput.removeEventListener('change', handleFileSelect);
    storyFileInput.addEventListener('change', handleFileSelect);
}

// Navigation menu elements
const toggleNav = document.getElementById("toggle-nav");
const more = document.getElementById("more");
// Navigation menu state
let isMenuOpen = false;

// =============== NAVIGATION MENU FUNCTIONS ===============
function setupNavToggle() {
    if (!toggleNav || !more) return;

    console.log('Setting up navigation menu toggle...');

    // Toggle menu
    toggleNav.addEventListener("click", function (e) {
        e.stopPropagation();
        isMenuOpen = !isMenuOpen;
        more.classList.toggle("open");
        console.log('Menu toggled, isOpen:', isMenuOpen);
    });

    // Close menu when clicking anywhere
    document.addEventListener("click", function () {
        if (isMenuOpen) {
            more.classList.remove("open");
            isMenuOpen = false;
            console.log('Menu closed by clicking outside');
        }
    });

    // Prevent closing when clicking inside the menu
    more.addEventListener("click", function (e) {
        e.stopPropagation();
    });

    // Close menu on Escape key
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && isMenuOpen) {
            more.classList.remove("open");
            isMenuOpen = false;
            console.log('Menu closed by Escape key');
        }
    });

    // Close menu when clicking on any <a> inside the menu
    const links = more.querySelectorAll("a");
    links.forEach(link => {
        link.addEventListener("click", function () {
            more.classList.remove("open");
            isMenuOpen = false;
            console.log('Menu closed by clicking link');
        });
    });

    console.log('Navigation menu toggle setup complete');
}

// Handle file selection
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Update selected file name
    if (selectedFileName) {
        selectedFileName.textContent = file.name;
    }

    const extension = file.name.split('.').pop().toLowerCase();

    try {
        let storyData = null;

        // Clear story container
        storyText.innerHTML = '';
        storyTitle.textContent = file.name;

        // Hide level indicators initially
        if (lvl) lvl.style.display = 'none';
        if (lvlcefr) lvlcefr.style.display = 'none';
        if (sound) sound.style.display = 'none';

        switch (extension) {
            case 'json':
                // SHOW level elements for JSON files
                showLevelElements();

                // Your existing JSON handling code
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const jsonData = JSON.parse(e.target.result);

                        if (!jsonData.title || !jsonData.content || !Array.isArray(jsonData.content)) {
                            showNotification('Invalid JSON format. Need title and content array.', 'error');
                            return;
                        }

                        const uploadedStory = {
                            id: 'uploaded-' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            title: jsonData.title,
                            author: jsonData.author || 'Uploaded',
                            level: jsonData.level || 'beginner',
                            levelcefr: jsonData.levelcefr || 'A1',
                            sound: jsonData.sound || '',
                            content: jsonData.content,
                            dictionaries: jsonData.dictionaries || [],
                            isUserStory: true,
                            isUploaded: true,
                            uploadDate: new Date().toISOString(),
                            cover: jsonData.cover || '📤',
                            coverType: jsonData.coverType || 'emoji',
                            wordCount: jsonData.content.join(' ').split(/\s+/).length
                        };

                        let dictionaryData = {};

                        if (jsonData.translations) {
                            const customDictionary = {};

                            Object.entries(jsonData.translations).forEach(([word, data]) => {
                                if (typeof data === 'string') {
                                    customDictionary[word] = {
                                        translation: data,
                                        pos: "unknown",
                                        definition: `From story: ${uploadedStory.title}`,
                                        example: "Word from uploaded story",
                                        source: 'user_story'
                                    };
                                } else if (data && typeof data === 'object') {
                                    customDictionary[word] = {
                                        translation: data.translation || "No translation",
                                        pos: data.pos || "unknown",
                                        definition: data.definition || `From story: ${uploadedStory.title}`,
                                        example: data.example || "Word from uploaded story",
                                        source: 'user_story'
                                    };
                                }
                            });

                            // Save to storage (with fallback)
                            if (typeof saveDictionaryForStory === 'function') {
                                await saveDictionaryForStory(uploadedStory.id, customDictionary);
                            }
                            
                            // Also update cache
                            userDictionariesCache[uploadedStory.id] = customDictionary;

                            // Save to localStorage as backup
                            try {
                                const existingDicts = JSON.parse(localStorage.getItem('userDictionaries') || '{}');
                                existingDicts[uploadedStory.id] = customDictionary;
                                localStorage.setItem('userDictionaries', JSON.stringify(existingDicts));
                            } catch (e) {
                                console.warn('Failed to save to localStorage:', e);
                            }

                            for (const [word, data] of Object.entries(customDictionary)) {
                                const standardKey = getStandardKey(word);
                                dictionary[standardKey] = data;
                                dictionaryData[standardKey] = data;
                            }

                            showNotification(`Loaded ${Object.keys(customDictionary).length} word translations!`, 'success');
                        } else {
                            if (uploadedStory.dictionaries && uploadedStory.dictionaries.length > 0) {
                                await loadDictionary(uploadedStory.dictionaries);
                                dictionaryData = { ...dictionary };
                            }
                        }

                        // Save story to storage (with fallback)
                        if (typeof addStoryToStorage === 'function') {
                            await addStoryToStorage(uploadedStory);
                        }
                        
                        // Also save to localStorage for backward compatibility
                        try {
                            const existingStories = JSON.parse(localStorage.getItem('userStories') || '[]');
                            existingStories.push(uploadedStory);
                            localStorage.setItem('userStories', JSON.stringify(existingStories));
                        } catch (e) {
                            console.warn('Failed to save stories to localStorage:', e);
                        }

                        saveUploadedStoryToStorage(uploadedStory, dictionaryData);
                        displayStory(uploadedStory);
                        showNotification(`Story "${uploadedStory.title}" loaded!`, 'success');

                    } catch (parseError) {
                        console.error('Parse error:', parseError);
                        showNotification('Invalid JSON file: ' + parseError.message, 'error');
                    }
                };
                reader.readAsText(file);
                return;
            case 'pdf':
                showNotification('Analyzing PDF...', 'info');

                // First, check the page count
                if (typeof pdfjsLib === 'undefined') {
                    await loadPdfJsLibrary();
                }

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const totalPages = pdf.numPages;

                // Store PDF data for later use
                window.currentPdfFile = file;
                window.currentPdfData = pdf;
                window.currentTotalPages = totalPages;

                // Show page selection modal
                showPageSelectionModal(totalPages);
                break;


            case 'js':
                const jsReader = new FileReader();
                jsReader.onload = async (e) => {
                    try {
                        const code = e.target.result;
                        const backup = window.storiesData ? JSON.parse(JSON.stringify(window.storiesData)) : null;
                        const fn = new Function(code);
                        fn();

                        if (!window.storiesData || !Array.isArray(window.storiesData.stories) || window.storiesData.stories.length === 0) {
                            window.storiesData = backup;
                            showNotification('No stories found in this JS file.', 'error');
                            return;
                        }

                        const stories = window.storiesData.stories;
                        window.storiesData = backup;

                        if (stories.length === 1) {
                            loadStoryFromJS(stories[0]);
                        } else {
                            showStoryPickerModal(stories);
                        }
                    } catch (err) {
                        console.error('JS file error:', err);
                        showNotification('Error reading JS file: ' + err.message, 'error');
                    }
                };
                jsReader.readAsText(file);
                return;

            default:
                showNotification('Unsupported file format. Please upload JSON or PDF.', 'error');
                break;
        }

        // Clear any file error
        const fileError = document.getElementById('fileError');
        if (fileError) {
            fileError.style.display = 'none';
        }

    } catch (error) {
        console.error('File error:', error);
        showNotification('Error reading file: ' + error.message, 'error');
    }
}

// Helper function to show level elements
function showLevelElements() {
    if (lvl) {
        lvl.style.display = '';
        lvl.style.visibility = 'visible';
    }
    if (lvlcefr) {
        lvlcefr.style.display = '';
        lvlcefr.style.visibility = 'visible';
    }
    if (sound) {
        sound.style.display = '';
        sound.style.visibility = 'visible';
    }
}

// Update the function signature
async function convertPdfToStory(file, totalPages) {
    try {
        showNotification('Loading PDF...', 'info');

        // Load PDF.js library if not already loaded
        if (typeof pdfjsLib === 'undefined') {
            await loadPdfJsLibrary();
        }

        // Read PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const numPages = Math.min(pdf.numPages, MAX_PAGES);

        let allParagraphs = [];
        let markedWords = [];
        let fullText = '';

        // Show progress for each page
        for (let i = 1; i <= numPages; i++) {
            showNotification(`Converting page ${i}/${numPages}...`, 'info');

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Extract and clean text
            let pageText = '';
            let lastY = null;

            for (const item of textContent.items) {
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                    pageText += '\n';
                }
                pageText += item.str;
                lastY = item.transform[5];
            }

            // Clean text
            const cleanedText = cleanPdfText(pageText);
            fullText += ' ' + cleanedText;

            // Mark potential vocabulary words
            const words = cleanedText.match(/\b[A-Za-z]{5,}\b/g) || [];
            markedWords.push(...words.slice(0, 10));
        }

        // Remove duplicate marked words
        markedWords = [...new Set(markedWords)].slice(0, 30);

        // Split into real paragraphs
        allParagraphs = splitIntoRealParagraphs(fullText);

        // Generate story title from filename
        const storyTitle = file.name
            .replace('.pdf', '')
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        // Create story object
        const story = {
            id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: storyTitle,
            level: detectDifficultyLevel(fullText),
            levelcefr: detectCefrLevel(fullText),
            cover: '',
            coverType: 'image',
            content: allParagraphs.map(p => markImportantWords(p, markedWords.slice(0, 5))),
            author: 'PDF Import',
            wordCount: fullText.split(/\s+/).length,
            exportedDate: new Date().toISOString(),
            exportedFrom: 'PDF Converter',
            version: '1.0',
            isUserStory: true,
            source: 'pdf',
            pageInfo: {
                total: totalPages,
                converted: Math.min(totalPages, MAX_PAGES),
                limit: MAX_PAGES
            }
        };

        return story;

    } catch (error) {
        console.error('PDF conversion error:', error);
        showNotification('Error converting PDF: ' + error.message, 'error');
        return null;
    }
}

// Helper function to split text into real paragraphs
function splitIntoRealParagraphs(text) {
    if (!text || text.trim().length === 0) return [];

    // Step 1: Clean the text - remove extra spaces and newlines
    let cleanText = text
        .replace(/\n+/g, ' ')  // Replace newlines with spaces
        .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
        .trim();

    // Step 2: Split into sentences using punctuation marks
    // This regex splits on . ! ? followed by space and capital letter
    const sentences = cleanText.split(/(?<=[.!?])\s+(?=[A-Z])/);

    // Step 3: Group sentences into paragraphs (2-4 sentences per paragraph)
    const paragraphs = [];
    let currentParagraph = [];

    for (let i = 0; i < sentences.length; i++) {
        currentParagraph.push(sentences[i]);

        // Create a new paragraph every 2-4 sentences
        if (currentParagraph.length >= 3 || i === sentences.length - 1) {
            const paragraphText = currentParagraph.join(' ').trim();
            if (paragraphText.length > 20) { // Minimum paragraph length
                paragraphs.push(paragraphText);
            }
            currentParagraph = [];
        }
    }

    // Step 4: If no paragraphs were created (maybe no punctuation), split by length
    if (paragraphs.length === 0) {
        const words = cleanText.split(' ');
        let tempParagraph = [];

        for (let i = 0; i < words.length; i++) {
            tempParagraph.push(words[i]);

            // Create paragraph every 50-70 words
            if (tempParagraph.length >= 50 || i === words.length - 1) {
                const paragraphText = tempParagraph.join(' ');
                if (paragraphText.length > 20) {
                    paragraphs.push(paragraphText);
                }
                tempParagraph = [];
            }
        }
    }

    // Step 5: Final cleanup - remove empty paragraphs
    return paragraphs.filter(p => p && p.trim().length > 0);
}

// Optional: Simpler version if you prefer
function splitIntoSimpleParagraphs(text) {
    if (!text || text.trim().length === 0) return [];

    // Clean text
    let cleanText = text
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Split into paragraphs of max 300 characters
    const maxLength = 300;
    const paragraphs = [];

    for (let i = 0; i < cleanText.length; i += maxLength) {
        let end = Math.min(i + maxLength, cleanText.length);

        // Try to cut at the end of a sentence
        if (end < cleanText.length) {
            const lastPeriod = cleanText.lastIndexOf('.', end);
            const lastExclamation = cleanText.lastIndexOf('!', end);
            const lastQuestion = cleanText.lastIndexOf('?', end);

            const lastPunctuation = Math.max(lastPeriod, lastExclamation, lastQuestion);

            if (lastPunctuation > i + 100) {
                end = lastPunctuation + 1;
            }
        }

        const paragraph = cleanText.substring(i, end).trim();
        if (paragraph.length > 20) {
            paragraphs.push(paragraph);
        }
    }

    return paragraphs;
}
// Helper function to load PDF.js library
function loadPdfJsLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.onload = () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Helper function to clean PDF text
function cleanPdfText(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/-\n/g, '')
        .replace(/([.?!])\s*(?=[A-Z])/g, '$1\n\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n\n');
}

// Helper function to mark important words
function markImportantWords(paragraph, words) {
    let markedText = paragraph;
    words.forEach(word => {
        if (word.length > 3) {
            const regex = new RegExp(`\\b(${word})\\b`, 'gi');
            markedText = markedText.replace(regex, '<span class=\'mark\'>$1</span>');
        }
    });
    return markedText;
}

// Helper function to detect difficulty level
function detectDifficultyLevel(text) {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

    if (avgWordLength < 5) return 'beginner';
    if (avgWordLength < 6) return 'intermediate';
    return 'advanced';
}

// Helper function to detect CEFR level
function detectCefrLevel(text) {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

    if (avgWordLength < 4.5) return 'A1';
    if (avgWordLength < 5) return 'A2';
    if (avgWordLength < 5.5) return 'B1';
    if (avgWordLength < 6) return 'B2';
    if (avgWordLength < 6.5) return 'C1';
    return 'C2';
}
// Get story ID from URL
function getStoryIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const isUserStory = urlParams.get('userStory') === 'true';

    return {
        id: id || '1',
        isUserStory: isUserStory
    };
}

/**
 * 🚨 تعديل: هذه الدالة الآن لا تقوم بتوحيد الفاصلة العلوية، بل تعيد الكلمة كما هي.
 */
function normalizeApostrophe(word) {
    // ترك الفاصلة العلوية كما هي (مثل ' و ’)
    return word;
}

// دالة لإزالة علامات التشكيل
function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * المفتاح القياسي للبحث (Standard Lookup Key):
 * يحول إلى أحرف صغيرة ويحافظ على الفاصلة (سواء ' أو ’) والتشكيل.
 * مثال: L’océan -> l’océan
 */
function getStandardKey(word) {
    let key = word.toLowerCase();
    // تم إزالة استدعاء normalizeApostrophe لترك الفاصلة الأصلية
    return key.trim();
}
// Show page selection modal
function showPageSelectionModal(totalPages) {
    if (!pageSelectionModal) return;

    // Update total pages display
    if (totalPagesSpan) {
        totalPagesSpan.textContent = totalPages;
    }

    // Generate page checkboxes
    generatePageCheckboxes(totalPages);

    // Show modal
    pageSelectionModal.style.display = 'flex';
}

// Generate page checkboxes
function generatePageCheckboxes(totalPages) {
    if (!pageCheckboxes) return;

    pageCheckboxes.innerHTML = '';

    // Set the maximum pages to 200
    const MAX_PAGES_LIMIT = 200;

    // Show up to 200 pages (or less if the PDF has fewer pages)
    const pagesToShow = Math.min(totalPages, MAX_PAGES_LIMIT);

    for (let i = 1; i <= pagesToShow; i++) {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'page-checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `page_${i}`;
        checkbox.value = i;
        checkbox.className = 'page-checkbox';

        // Auto-select first 5 pages
        if (i <= Math.min(5, pagesToShow)) {
            checkbox.checked = true;
        }

        const label = document.createElement('label');
        label.htmlFor = `page_${i}`;
        label.textContent = `Page ${i}`;

        checkboxItem.appendChild(checkbox);
        checkboxItem.appendChild(label);
        pageCheckboxes.appendChild(checkboxItem);

        // Add change event to update selected count
        checkbox.addEventListener('change', updateSelectedPageCount);
    }

    // Add a message if the PDF has more than 200 pages
    if (totalPages > MAX_PAGES_LIMIT) {
        const limitMsg = document.createElement('div');
        limitMsg.className = 'more-pages-msg';
        limitMsg.innerHTML = `<i class="fas fa-info-circle"></i> PDF has ${totalPages} pages. Showing first ${MAX_PAGES_LIMIT} pages (maximum limit).`;
        pageCheckboxes.appendChild(limitMsg);
    }

    // Update selected count
    updateSelectedPageCount();

    // Setup select all checkbox
    if (selectAllPages) {
        selectAllPages.checked = false;
        // Remove existing listener to avoid duplicates
        selectAllPages.removeEventListener('change', toggleSelectAllPages);
        selectAllPages.addEventListener('change', toggleSelectAllPages);
    }
}
// Update selected page count
function updateSelectedPageCount() {
    const checkboxes = document.querySelectorAll('.page-checkbox:checked');
    if (selectedCountSpan) {
        selectedCountSpan.textContent = checkboxes.length;
    }

    // Highlight if more than MAX_PAGES
    if (checkboxes.length > MAX_PAGES) {
        selectedCountSpan.style.color = '#ef4444';
    } else {
        selectedCountSpan.style.color = '';
    }
}

// Toggle select all pages
function toggleSelectAllPages(e) {
    const checkboxes = document.querySelectorAll('.page-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
    });
    updateSelectedPageCount();
}

// Confirm page selection and start conversion
async function confirmPageSelection() {
    const selectedPages = [];
    const checkboxes = document.querySelectorAll('.page-checkbox:checked');

    checkboxes.forEach(checkbox => {
        selectedPages.push(parseInt(checkbox.value));
    });

    if (selectedPages.length === 0) {
        showNotification('Please select at least one page to convert.', 'warning');
        return;
    }

    if (selectedPages.length > MAX_PAGES) {
        showNotification(`Maximum ${MAX_PAGES} pages allowed. Please select fewer pages.`, 'error');
        return;
    }

    // Hide modal
    if (pageSelectionModal) {
        pageSelectionModal.style.display = 'none';
    }

    // IMPORTANT: DO NOT show level elements for PDF
    // Remove this line: showLevelElements();

    // Show conversion notification
    showNotification(`Converting ${selectedPages.length} selected page(s)...`, 'info');

    // Convert selected pages
    const pdfStory = await convertSelectedPdfPages(
        window.currentPdfFile,
        window.currentPdfData,
        selectedPages,
        window.currentTotalPages
    );

    if (pdfStory) {
        // Set empty level values for PDF
        pdfStory.level = '';
        pdfStory.levelcefr = '';
        
        // Add metadata for uploaded stories
        pdfStory.isUserStory = true;
        pdfStory.isUploaded = true;
        pdfStory.uploadDate = new Date().toISOString();
        pdfStory.cover = '📄';
        pdfStory.coverType = 'emoji';

        console.log('PDF Story created with empty levels'); // Debug log

        // Save to localforage (with fallback)
        if (typeof addStoryToStorage === 'function') {
            await addStoryToStorage(pdfStory);
        }
        
        // Also save to localStorage as backup
        try {
            const existingStories = JSON.parse(localStorage.getItem('userStories') || '[]');
            existingStories.push(pdfStory);
            localStorage.setItem('userStories', JSON.stringify(existingStories));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }

        displayStory(pdfStory);
        saveUploadedStoryToStorage(pdfStory, {});

        // Show success message with page info
        showNotification(`✅ PDF converted successfully! (${selectedPages.length} pages)`, 'success');
    }
}

// Convert selected PDF pages 
async function convertSelectedPdfPages(file, pdf, selectedPages, totalPages) {
    try {
        let allParagraphs = [];
        let markedWords = [];
        let fullText = '';

        // Sort pages in ascending order
        selectedPages.sort((a, b) => a - b);

        for (let i = 0; i < selectedPages.length; i++) {
            const pageNum = selectedPages[i];
            showNotification(`Converting page ${pageNum}...`, 'info');

            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Extract and clean text
            let pageText = '';
            let lastY = null;

            for (const item of textContent.items) {
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                    pageText += '\n';
                }
                pageText += item.str;
                lastY = item.transform[5];
            }

            // Clean text
            const cleanedText = cleanPdfText(pageText);
            fullText += ' ' + cleanedText;

            // Mark potential vocabulary words
            const words = cleanedText.match(/\b[A-Za-z]{5,}\b/g) || [];
            markedWords.push(...words.slice(0, 10));
        }

        // Remove duplicate marked words
        markedWords = [...new Set(markedWords)].slice(0, 30);

        // ⭐⭐⭐ استخدم دالة تقسيم الفقرات الجديدة
        allParagraphs = splitIntoRealParagraphs(fullText);

        // Generate story title from filename
        const storyTitle = file.name
            .replace('.pdf', '')
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        // Create story object with EMPTY levels for PDF
        const story = {
            id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: storyTitle,
            level: '', // Empty for PDF
            levelcefr: '', // Empty for PDF
            cover: '',
            coverType: 'image',
            content: allParagraphs.map(p => markImportantWords(p, markedWords.slice(0, 5))),
            author: 'PDF Import',
            wordCount: fullText.split(/\s+/).length,
            exportedDate: new Date().toISOString(),
            exportedFrom: 'PDF Converter',
            version: '1.0',
            isUserStory: true,
            source: 'pdf',
            pageInfo: {
                total: totalPages,
                converted: selectedPages.length,
                selected: selectedPages,
                limit: MAX_PAGES
            }
        };

        return story;

    } catch (error) {
        console.error('PDF conversion error:', error);
        showNotification('Error converting PDF: ' + error.message, 'error');
        return null;
    }
}
/**
 * المفتاح الموحد للبحث (Normalized Lookup Key):
 * يحول إلى أحرف صغيرة، يحافظ على الفاصلة، ويزيل التشكيل.
 * مثال: L’océan -> l’ocean
 */
function getNormalizedKey(word) {
    let key = getStandardKey(word); // l’océan
    key = removeAccents(key);       // l’ocean
    return key.trim();
}

/**
 * المفتاح الموحد الأقصى (Aggressive Key): 
 * يحول إلى أحرف صغيرة، يحافظ على الفاصلة، يزيل التشكيل والواصلات.
 */
function getAggressiveKey(word) {
    let key = word.toLowerCase();
    key = removeAccents(key);
    key = key.replace(/-/g, '');
    // ترك الفاصلة العلوية
    return key.trim();
}

// Get user stories from storage (async)
async function getUserStories() {
    try {
        if (typeof getUserStoriesFromStorage === 'function') {
            const userStories = await getUserStoriesFromStorage();
            return userStories;
        } else {
            // Fallback to localStorage
            return JSON.parse(localStorage.getItem('userStories') || '[]');
        }
    } catch (error) {
        console.error('Error loading user stories:', error);
        return [];
    }
}

/**
 * Load dictionaries from JSON file(s).
 * يتضمن تنظيف مفاتيح القاموس من الفراغات الزائدة أثناء التحميل.
 */
async function loadDictionary(dictionaryPaths) {
    if (!Array.isArray(dictionaryPaths)) {
        dictionaryPaths = dictionaryPaths ? [dictionaryPaths] : [];
    }

    dictionary = {};

    if (dictionaryPaths.length === 0) {
        console.log('No dictionary paths provided.');
        return;
    }

    try {
        const loadPromises = dictionaryPaths.map(async (path) => {
            if (!path) return {};

            try {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`Failed to load dictionary: ${response.status} from ${path}`);
                }
                const dictContent = await response.json();

                console.log(`Loaded ${Object.keys(dictContent).length} words from: ${path}`);
                return dictContent;

            } catch (error) {
                console.error(`Error loading dictionary from ${path}:`, error);
                return {};
            }
        });

        const allDictionaries = await Promise.all(loadPromises);

        // دمج جميع القواميس وتجريد المفاتيح من الفراغات الزائدة
        dictionary = allDictionaries.reduce((mergedDict, currentDict) => {
            const trimmedDict = {};
            for (const key in currentDict) {
                if (currentDict.hasOwnProperty(key)) {
                    // إزالة الفراغات من المفتاح أثناء التحميل
                    const trimmedKey = key.trim();
                    trimmedDict[trimmedKey] = currentDict[key];
                }
            }
            return { ...mergedDict, ...trimmedDict };
        }, {});

        console.log(`Final merged dictionary size: ${Object.keys(dictionary).length} words.`);

    } catch (error) {
        console.error('Error during dictionary loading process:', error);
    }

    if (Object.keys(dictionary).length === 0) {
        console.warn('No dictionaries loaded, using empty dictionary');
        dictionary = {};
    }
}







// Add this function to load user translations
// Update the loadUserTranslations function
async function loadUserTranslations(storyId) {
    try {
        // Check cache first, then fallback to localforage
        let userDictionaries = {};
        if (Object.keys(userDictionariesCache).length > 0) {
            userDictionaries = userDictionariesCache;
        } else if (typeof getAllDictionaries === 'function') {
            userDictionaries = await getAllDictionaries();
        } else {
            // Fallback to localStorage
            userDictionaries = JSON.parse(localStorage.getItem('userDictionaries') || '{}');
        }

        // Check if this story has custom translations
        const customDictionary = userDictionaries[storyId];

        if (customDictionary) {
            console.log(`Loading ${Object.keys(customDictionary).length} custom translations for story ${storyId}`);

            let loadedCount = 0;

            // Merge custom translations into main dictionary
            for (const [word, data] of Object.entries(customDictionary)) {
                const standardKey = getStandardKey(word);
                const normalizedKey = getNormalizedKey(word);

                if (typeof data === 'string') {
                    // If data is just a string translation
                    dictionary[standardKey] = {
                        translation: data,
                        pos: "unknown",
                        definition: `Custom translation from user story`,
                        example: `From "${currentStory?.title || 'user story'}"`,
                        source: 'user_story'
                    };
                    loadedCount++;
                } else if (data && typeof data === 'object') {
                    // If data is an object with translation properties
                    dictionary[standardKey] = {
                        translation: data.translation || "No translation",
                        pos: data.pos || "unknown",
                        definition: data.definition || `Custom translation from user story`,
                        example: data.example || `From "${currentStory?.title || 'user story'}"`,
                        source: 'user_story'
                    };
                    loadedCount++;
                }
            }

            console.log(`Successfully loaded ${loadedCount} custom translations for story ${storyId}`);
            return loadedCount > 0;
        }
    } catch (error) {
        console.error('Error loading user translations:', error);
    }
    return false;
}

// ----------------------------------------------------
// 🎨 وظيفة إضافة شارة الترجمة المخصصة
// ----------------------------------------------------
function addTranslationBadge() {
    const badge = document.createElement('div');
    badge.className = 'translation-badge';
    badge.innerHTML = `
            <i class="fas fa-user-edit"></i> Custom Translations Available
        `;
    badge.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideIn 0.3s ease;
        `;

    document.body.appendChild(badge);

    // Remove after 5 seconds
    setTimeout(() => {
        if (badge.parentNode) {
            badge.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (badge.parentNode) {
                    document.body.removeChild(badge);
                }
            }, 300);
        }
    }, 5000);
}


// ----------------------------------------------------
// 🧭 وظائف حفظ واستعادة موقع القراءة
// ----------------------------------------------------
function saveReadingPosition() {
    if (currentStory && window.scrollY > 0) {
        const positionData = {
            id: currentStory.id,
            scrollPosition: window.scrollY,
            isUserStory: currentStory.isUserStory || false
        };
        localStorage.setItem('readingPosition', JSON.stringify(positionData));
    }
}

function restoreReadingPosition() {
    const savedPosition = JSON.parse(localStorage.getItem('readingPosition'));
    const storyInfo = getStoryIdFromUrl();

    if (savedPosition &&
        savedPosition.id == storyInfo.id &&
        savedPosition.isUserStory === storyInfo.isUserStory) {

        const checkContentLoaded = () => {
            if (document.readyState === 'complete' && storyText.innerHTML && !storyText.innerHTML.includes('loading')) {
                window.scrollTo(0, savedPosition.scrollPosition);
                console.log(`Restored scroll position for story ${storyInfo.id} to ${savedPosition.scrollPosition}px.`);
            } else {
                setTimeout(checkContentLoaded, 100);
            }
        };
        checkContentLoaded();
    }
}

// ----------------------------------------------------
// 📝 وظائف عرض القصة والقائمة الاحتياطية
// ----------------------------------------------------


function displayStory(story) {
    storyTitle.textContent = story.title;
    currentStory = story; // Make sure currentStory is set

    if (story.author && story.author.trim() !== "") {
        const badge = document.createElement('span');
        badge.className = 'user-story-badge';
        badge.innerHTML = `<i class="fas fa-user"></i> ${story.author}`;
        badge.style.cssText = `
                display: inline-block;
                margin-left: 10px;
                background: var(--primary);
                color: white;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
            `;
        storyTitle.appendChild(badge);
    }

    // التحكم في الصوت حسب وجود src أو لا
    if (sound) {
        if (story.sound && story.sound.trim() !== "") {
            sound.src = story.sound;
            sound.style.display = "block";
        } else {
            sound.removeAttribute("src");
            sound.style.display = "none";
        }
    }

    // Display difficulty level
    if (lvl && story.level) {
        const level = story.level.toLowerCase();
        lvl.textContent = level.charAt(0).toUpperCase() + level.slice(1);
        lvl.classList.remove('beginner', 'intermediate', 'advanced');

        if (level === 'beginner') {
            lvl.classList.add('beginner');
        } else if (level === 'intermediate') {
            lvl.classList.add('intermediate');
        } else if (level === 'advanced') {
            lvl.classList.add('advanced');
        }
    }

    // Display CEFR level
    if (lvlcefr && story.levelcefr && story.levelcefr.trim() !== "") {
        lvlcefr.classList.remove('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
        lvlcefr.textContent = story.levelcefr.toUpperCase();
        const cefrLevel = story.levelcefr.toUpperCase();
        lvlcefr.classList.add(cefrLevel);
    } else if (lvlcefr) {
        lvlcefr.style.display = 'none';
    }

    storyText.innerHTML = '';

    story.content.forEach(paragraph => {
        const p = document.createElement('div');
        p.className = 'paragraph';
        p.innerHTML = makeWordsClickable(paragraph, { debug: false });
        storyText.appendChild(p);
    });

    setupWordInteractions();
    updateReadingProgress();

    // ADD THIS LINE - Add translation buttons if enabled
    if (localStorage.getItem('paragraphTranslationEnabled') === 'true') {
        setTimeout(() => {
            if (typeof window.addTranslationButtons === 'function') {
                window.addTranslationButtons();
            }
        }, 500);
    }

}
/**
 * Function makeWordsClickable(htmlString, options = {})
 * تستخدم المفتاح الأساسي للبحث (الذي يحافظ على الفاصلة العلوية الأصلية والتشكيل)
 */
function makeWordsClickable(htmlString, options = {}) {
    if (typeof dictionary === 'undefined') {
        console.error("Error: The 'dictionary' object is not defined. Cannot proceed.");
        return htmlString;
    }

    const debug = !!options.debug;
    // regex لكلمة فرنسية/انجليزية مع دعم apostrophes والواصلات.
    const wordPattern = /[A-Za-zÀ-ÖØ-öø-ÿ0-9’']+(?:[’'\-][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)*/g;

    const container = document.createElement('div');
    container.innerHTML = htmlString;

    const skipTags = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA']);


    /**
     * دالة للتحقق مما إذا كانت الكلمة لديها ترجمة في القاموس.
     */
    // Update the hasTranslation function inside makeWordsClickable
    function hasTranslation(word) {

        // 1. المفتاح القياسي (يحافظ على الفاصلة الأصلية والتشكيل)
        const standardKey = getStandardKey(word);

        // 2. المفتاح الموحد (يحافظ على الفاصلة الأصلية ويزيل التشكيل)
        const normalizedKey = getNormalizedKey(word);

        if (debug) console.log(`--- Checking: ${word} (Standard Key: ${standardKey}, Normalized Key: ${normalizedKey}) ---`);

        // --- أ. البحث بالمفتاح القياسي (الأولوية الأولى: l'océan) ---
        if (dictionary[standardKey]) {
            if (debug) console.log(`SUCCESS: Found match with STANDARD KEY: ${standardKey}`);
            return true;
        }

        // --- ب. البحث بالمفتاح الموحد (الأولوية الثانية: l'ocean) ---
        if (standardKey !== normalizedKey && dictionary[normalizedKey]) {
            if (debug) console.log(`SUCCESS: Found match with NORMALIZED KEY: ${normalizedKey}`);
            return true;
        }

        // --- ج. البحث في القواميس المخصصة ---
        const storyInfo = getStoryIdFromUrl();
        const customDictionary = userDictionariesCache[storyInfo.id];

        if (customDictionary) {
            // البحث في القاموس المخصص بالمفتاح القياسي
            for (const [customWord, customData] of Object.entries(customDictionary)) {
                if (getStandardKey(customWord) === standardKey) {
                    if (debug) console.log(`SUCCESS: Found match in CUSTOM DICTIONARY with STANDARD KEY: ${standardKey}`);
                    return true;
                }
            }

            // البحث في القاموس المخصص بالمفتاح الموحد
            for (const [customWord, customData] of Object.entries(customDictionary)) {
                if (getNormalizedKey(customWord) === normalizedKey) {
                    if (debug) console.log(`SUCCESS: Found match in CUSTOM DICTIONARY with NORMALIZED KEY: ${normalizedKey}`);
                    return true;
                }
            }
        }

        // --- ت. معالجة صيغة الجمع/المفرد ---

        const aggressiveKey = getAggressiveKey(word);

        // الكلمة بدون 'es'
        if (aggressiveKey.endsWith('es') && aggressiveKey.length > 2) {
            const singularAggressive = aggressiveKey.slice(0, -2);
            if (dictionary[singularAggressive]) {
                if (debug) console.log(`SUCCESS: Found singular match (aggressive - es): ${singularAggressive}`);
                return true;
            }
        }
        // الكلمة بدون 's'
        if (aggressiveKey.endsWith('s') && aggressiveKey.length > 1) {
            const singularAggressive = aggressiveKey.slice(0, -1);
            if (dictionary[singularAggressive]) {
                if (debug) console.log(`SUCCESS: Found singular match (aggressive - s): ${singularAggressive}`);
                return true;
            }
        }

        if (debug) console.log(`FAILURE: No translation found for ${word}`);
        return false;
    }

    // دالة المعالجة الرئيسية (تستخدم Pre-order Traversal)
    function traverseAndWrap(node) {
        if (skipTags.has(node.nodeName)) {
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;

            const wrappedText = text.replace(wordPattern, (match) => {

                // جرد الكلمة المجلوبة من القصة مباشرة
                const trimmedMatch = match.trim();

                // نستخدم الكلمة المجرّدة (trimmedMatch) في البحث
                const translationFound = hasTranslation(trimmedMatch);

                const className = translationFound ? 'word clickable-word' : 'word no-translation';

                // تخزين المفتاح القياسي للكلمة المجرّدة (يحافظ على الفاصلة الأصلية)
                const keyToSave = getStandardKey(trimmedMatch);

                const safeMatch = keyToSave
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');

                // نستخدم match الأصلية (غير المجرّدة) في النص للعرض
                return `<span class="${className}" data-word="${safeMatch}">${match}</span>`;
            });

            if (wrappedText !== text) {
                const fragment = document.createDocumentFragment();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = wrappedText;

                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }

                node.parentNode.replaceChild(fragment, node);
            }
        } else {
            let child = node.firstChild;
            while (child) {
                const nextChild = child.nextSibling;
                traverseAndWrap(child);
                child = nextChild;
            }
        }
    }

    traverseAndWrap(container);
    return container.innerHTML;
}

// ----------------------------------------------------------------------------------

// Setup word click interactions
function setupWordInteractions() {
    document.querySelectorAll('.word').forEach(word => {
        const dataWord = word.dataset.word;

        // Check if this word is already saved and apply the saved class
        if (savedWords.some(w => w.word === dataWord)) {
            word.classList.add('saved');
            word.classList.remove('no-translation');
        }

        word.addEventListener('click', (e) => {
            e.stopPropagation();
            showDictionary(dataWord, word);
        });
    });
}

// Validate word data
function validateWordData(wordData) {
    if (!wordData || typeof wordData !== 'object') return false;
    return wordData.word && wordData.translation;
}

// Show dictionary popup
async function showDictionary(word, element, isTextSelection = false) {
    if (!word) return;

    // First, check if we have user translations for this story
    const storyInfo = getStoryIdFromUrl();
    
    // Get dictionaries with fallback
    let userDictionaries = {};
    if (typeof getAllDictionaries === 'function') {
        userDictionaries = await getAllDictionaries();
    } else {
        userDictionaries = JSON.parse(localStorage.getItem('userDictionaries') || '{}');
    }
    
    const customDictionary = userDictionaries[storyInfo.id];

    let wordData = null;
    let originalWordText = '';
    let wordElement = null;

    // Handle different input types
    if (isTextSelection) {
        // Called from text selection
        originalWordText = word;
        wordElement = document.createElement('span');
        wordElement.textContent = originalWordText;
        wordElement.className = 'word';

        // Try to find the clicked word element in the DOM
        const clickedElements = document.querySelectorAll('.word');
        clickedElements.forEach(el => {
            if (el.textContent.trim() === originalWordText.trim()) {
                wordElement = el;
            }
        });
    } else {
        // Called from word click
        originalWordText = element.innerText;
        wordElement = element;
    }

    // Check custom dictionary first (if it exists)
    if (customDictionary) {
        // Try to find the word in custom dictionary
        const customKeys = Object.keys(customDictionary);

        // Try exact match first
        for (const key of customKeys) {
            if (getStandardKey(key) === getStandardKey(word)) {
                const customData = customDictionary[key];
                wordData = {
                    translation: typeof customData === 'string' ? customData : (customData.translation || "No translation"),
                    pos: (typeof customData === 'object' && customData.pos) || "unknown",
                    definition: (typeof customData === 'object' && customData.definition) || `Custom translation from user story`,
                    example: (typeof customData === 'object' && customData.example) || `From "${currentStory?.title || 'user story'}"`,
                    source: 'user_story'
                };
                break;
            }
        }

        // If not found in custom dictionary, try normalized key
        if (!wordData) {
            const normalizedWord = getNormalizedKey(word);
            for (const key of customKeys) {
                if (getNormalizedKey(key) === normalizedWord) {
                    const customData = customDictionary[key];
                    wordData = {
                        translation: typeof customData === 'string' ? customData : (customData.translation || "No translation"),
                        pos: (typeof customData === 'object' && customData.pos) || "unknown",
                        definition: (typeof customData === 'object' && customData.definition) || `Custom translation from user story`,
                        example: (typeof customData === 'object' && customData.example) || `From "${currentStory?.title || 'user story'}"`,
                        source: 'user_story'
                    };
                    break;
                }
            }
        }
    }

    // If not found in custom dictionary, check main dictionary
    if (!wordData) {
        wordData = dictionary[word] || dictionary[getNormalizedKey(word)];
    }

    popupWord.textContent = originalWordText;

    if (listenWordBtn) {
        listenWordBtn.style.display = 'speechSynthesis' in window ? 'inline-block' : 'none';
    }

    if (wordData) {
        popupTranslation.textContent = wordData.translation;


        const isSaved = savedWords.some(w => w.word === word || w.originalWord === originalWordText);
        saveWordBtn.innerHTML = isSaved
            ? '<i class="fas fa-check"></i> Already Saved'
            : '<i class="fas fa-bookmark"></i> Save Word';
        saveWordBtn.disabled = isSaved;
        saveWordBtn.classList.toggle('disabled', isSaved);
        saveWordBtn.classList.remove('no-translation-btn');
    } else {
        popupTranslation.textContent = "لا توجد ترجمة متاحة";

        saveWordBtn.innerHTML = '<i class="fas fa-bookmark"></i> Save Word (No Translation)';
        saveWordBtn.disabled = false;
        saveWordBtn.classList.add('no-translation-btn');
    }

    if (!validateWordData({ word: word, translation: wordData?.translation || "No translation" })) {
        console.warn('Invalid word data for:', word);
    }

    currentWordData = {
        word: word,
        element: wordElement,
        hasTranslation: !!wordData,
        wordData: wordData,
        isCustomTranslation: wordData?.source === 'user_story'
    };

    // Position the popup based on selection or click
    let rect;
    if (isTextSelection) {
        // Get selection position
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            rect = selection.getRangeAt(0).getBoundingClientRect();
        } else {
            // Fallback to cursor position
            rect = { bottom: window.innerHeight / 2, left: window.innerWidth / 2 };
        }
    } else {
        // Get clicked element position
        rect = wordElement.getBoundingClientRect();
    }

    dictionaryPopup.style.top = `${rect.bottom + window.scrollY + 10}px`;
    dictionaryPopup.style.left = `${Math.max(10, rect.left + window.scrollX - 150)}px`;
    dictionaryPopup.style.display = 'block';

    // Highlight the word element
    if (wordElement && wordElement.classList) {
        wordElement.classList.add('selected');
        setTimeout(() => {
            if (wordElement.classList) {
                wordElement.classList.remove('selected');
            }
        }, 1000);
    }
}

// Hide dictionary popup
function hideDictionary() {
    dictionaryPopup.style.display = 'none';
    currentWordData = null;
}



// ----------------------------------------------------
// 📖 وظائف المفردات والإحصائيات
// ----------------------------------------------------

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    const colors = {
        success: 'rgb(13, 167, 116)',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };

    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add a flag to prevent multiple saves
let isSavingWord = false;

// Modified saveCurrentWord function to auto-translate using Google Translate
async function saveCurrentWord() {
    // Prevent multiple simultaneous saves
    if (isSavingWord) {
        console.log('Save already in progress');
        return;
    }

    if (!currentWordData) {
        showNotification('No word selected', 'error');
        return;
    }

    try {
        isSavingWord = true;

        const { word, element, hasTranslation, wordData, isCustomTranslation } = currentWordData;
        const originalWord = element.innerText.trim();

        // Check if word already exists
        if (savedWords.some(w => w.word === word || w.originalWord === originalWord)) {
            showNotification('Word already saved!', 'info');
            return;
        }

        const storyTitle = currentStory ? currentStory.title : 'Unknown Story';
        const isUserStory = currentStory ? currentStory.isUserStory : false;

        // Create new word object
        const newWord = {
            word: word,
            originalWord: originalWord,
            status: 'saved',
            added: new Date().toISOString(),
            nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            story: storyTitle,
            hasTranslation: hasTranslation,
            fromUserStory: isUserStory || false,
            isCustomTranslation: isCustomTranslation || false
        };

        // If word has translation in dictionary, use it
        if (hasTranslation && wordData) {
            newWord.translation = wordData.translation;
            newWord.definition = wordData.definition || "Check back later for definition";
            newWord.example = wordData.example || "Check back later for example";
            newWord.pos = wordData.pos || "unknown";

            // Save and show notification
            saveWordToStorage(newWord, element);

        } else {
            // Word has no translation - try to auto-translate using Google Translate
            showNotification(`Translating "${originalWord}"...`, 'info');

            // Disable save button while translating
            if (saveWordBtn) {
                saveWordBtn.disabled = true;
                saveWordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
            }

            try {
                // Get the saved translation language from settings
                const targetLanguage = getCurrentTranslationLanguage ? getCurrentTranslationLanguage() : 'ar';

                // Use Google Translate API
                const googleTranslation = await translateWordWithGoogle(originalWord, targetLanguage);

                if (googleTranslation) {
                    // Update word with Google translation
                    newWord.translation = googleTranslation;
                    newWord.definition = `Auto-translated using Google Translate (to ${getLanguageName ? getLanguageName(targetLanguage) : 'Arabic'})`;
                    newWord.example = `Word from "${storyTitle}"`;
                    newWord.pos = "auto_translated";
                    newWord.autoTranslated = true;
                    newWord.translationSource = 'google_translate';
                    newWord.targetLanguage = targetLanguage;

                    // Save and show notification
                    saveWordToStorage(newWord, element);

                } else {
                    // Google translation failed
                    newWord.translation = "Translation unavailable";
                    newWord.definition = "Could not auto-translate this word";
                    newWord.example = "Word from story";
                    newWord.pos = "unknown";

                    // Save anyway (without translation)
                    saveWordToStorage(newWord, element);
                    showNotification(`"${originalWord}" saved (no translation available)`, 'warning');
                }

            } catch (error) {
                console.error('Auto-translation error:', error);

                // Save word without translation
                newWord.translation = "Translation failed";
                newWord.definition = "Auto-translation failed. Try manual translation.";
                newWord.example = "Word from story";
                newWord.pos = "unknown";
                newWord.translationError = error.message;

                saveWordToStorage(newWord, element);
                showNotification(`"${originalWord}" saved (translation failed)`, 'error');

            } finally {
                // Re-enable save button
                if (saveWordBtn) {
                    saveWordBtn.disabled = false;
                    const isSaved = savedWords.some(w => w.word === word || w.originalWord === originalWord);
                    saveWordBtn.innerHTML = isSaved ?
                        '<i class="fas fa-check"></i> Already Saved' :
                        '<i class="fas fa-bookmark"></i> Save Word';
                    saveWordBtn.disabled = isSaved;
                }
            }
        }

    } finally {
        isSavingWord = false;
    }
}

// Helper function to save word to storage
function saveWordToStorage(wordObject, element) {
    savedWords.push(wordObject);
    localStorage.setItem('savedWords', JSON.stringify(savedWords));

    hideDictionary();

    if (element) {
        element.classList.add('saved');
        element.classList.remove('no-translation');
    }

    // Update UI if needed
    if (document.querySelector('.nav-tab.active[data-page="vocabulary"]')) {
        renderVocabulary();
        updateVocabularyStats();
    }
}

// Function to translate word using Google Translate API
async function translateWordWithGoogle(word, targetLang = 'ar') {
    try {
        // Google Translate API endpoint
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Parse the response (Google returns nested arrays)
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        } else {
            throw new Error('Invalid translation response');
        }

    } catch (error) {
        console.error('Google Translate error:', error);
        return null;
    }
}

function translateOnGoogle() {
    if (!currentWordData || !currentWordData.element) return;

    const wordToTranslate = currentWordData.element.innerText.trim();

    // Get the saved translation language from localStorage
    const savedLanguage = localStorage.getItem('defaultTranslateLanguage') || 'ar';

    // Use the saved language instead of hardcoded 'ar'
    const translateUrl = `https://translate.google.com/?sl=auto&tl=${savedLanguage}&text=${encodeURIComponent(wordToTranslate)}&op=translate`;

    window.open(translateUrl, '_blank');
}




// Save word to vocabulary
function saveWord(word, translation, story = '', hasTranslation = true) {
    // Check if word already exists
    const existingIndex = savedWords.findIndex(w =>
        w.word.toLowerCase() === word.toLowerCase() ||
        w.originalWord?.toLowerCase() === word.toLowerCase()
    );

    if (existingIndex === -1) {
        // Add new word at the BEGINNING of the array (newest first)
        savedWords.unshift({
            word: word,
            originalWord: word,
            translation: translation,
            story: story,
            hasTranslation: hasTranslation,
            added: new Date().toISOString(),
            addedDate: new Date().toISOString(),
            status: 'saved'
        });
    } else {
        // Update existing word
        savedWords[existingIndex] = {
            ...savedWords[existingIndex],
            translation: translation || savedWords[existingIndex].translation,
            story: story || savedWords[existingIndex].story,
            hasTranslation: hasTranslation
        };
    }

    localStorage.setItem('savedWords', JSON.stringify(savedWords));
    renderVocabulary();
    updateStats();

    showNotification('Word saved to vocabulary!', 'success');
}

function updateVocabularyStats() {
    const totalWords = document.getElementById('totalWords');
    const masteredWords = document.getElementById('masteredWords');
    const practiceDue = document.getElementById('practiceDue');
    const readingStreak = document.getElementById('readingStreak');

    if (totalWords) totalWords.textContent = savedWords.length;
    if (masteredWords) masteredWords.textContent = savedWords.filter(w => w.status === 'mastered' || w.status === 'known').length;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dueCount = savedWords.filter(w => new Date(w.added || w.date) > threeDaysAgo).length;
    if (practiceDue) practiceDue.textContent = dueCount;

    const streak = Math.min(30, savedWords.length);
    if (readingStreak) readingStreak.textContent = streak;
}

// copy button
const copyBtn = document.getElementById("copy");
if (copyBtn) {
    copyBtn.addEventListener("click", copyStoryFast);
}
// print buutons button
const PrintBtn = document.querySelectorAll(".print");

PrintBtn.forEach(btn => {
    btn.addEventListener("click", printPage);
});

function printPage() {
    const upload = document.querySelector('.file-upload-section')?.closest('.container');
    if (upload) upload.style.display = 'none';

    // Set document title to story name (this becomes the print filename)
    const originalTitle = document.title;
    const storyName = document.getElementById('storyTitle')?.innerText?.trim() || 'Story';
    document.title = storyName;

    window.print();

    if (upload) upload.style.display = '';
    document.title = originalTitle;
}
function copyStoryFast() {
    try {
        // 1) نحاول جمع النص المعروض فعلاً داخل العنصر storyText
        // هذا يأخذ فقط النص المرئي (بدون الوسوم HTML)
        let text = "";

        if (storyText) {
            // أفضل: نأخذ كل فقرة مرئية (.paragraph) إن وُجدت لأنها تحافظ على الفقرات
            const paras = storyText.querySelectorAll ? storyText.querySelectorAll('.paragraph') : null;

            if (paras && paras.length) {
                text = Array.from(paras).map(p => p.innerText.trim()).filter(Boolean).join('\n\n');
            } else {
                // fallback: نستخدم innerText الكامل من storyText
                text = (storyText.innerText || storyText.textContent || "").trim();
            }
        }

        // 2) إذا النص فارغ، ننبّه المستخدم
        if (!text) {
            showNotification('No story to copy', 'error');
            return;
        }

        // 3) نسخ باستخدام navigator.clipboard (أفضل)، مع fallback للمتصفحات القديمة
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                flashCopyUI();
                showNotification('Story copied!', 'success');
            }).catch(err => {
                // إذا فشل، نجرّب fallback
                fallbackCopyText(text);
            });
        } else {
            fallbackCopyText(text);
        }

    } catch (err) {
        console.error('copyStoryFast error:', err);
        showNotification('Copy failed', 'error');
    }
}

function fallbackCopyText(text) {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        // ensure offscreen and not focusable
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.setAttribute('aria-hidden', 'true');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (ok) {
            flashCopyUI();
            showNotification('Story copied!', 'success');
        } else {
            throw new Error('execCommand returned false');
        }
    } catch (e) {
        console.error('fallbackCopyText failed', e);
        showNotification('Copy failed', 'error');
    }
}

// تلميح بصري للزر بعد النسخ
function flashCopyUI() {
    const btn = document.getElementById('copy');
    if (!btn) return;
    const originalHTML = btn.innerHTML;
    const originalTitle = btn.title;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.title = 'Copied!';
    btn.style.color = 'rgb(13, 167, 116)';
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.title = originalTitle;
        btn.style.color = '';
    }, 1400);
}










// ----------------------------------------------------
// 🎨 وظائف التخصيص
// ----------------------------------------------------

function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    localStorage.setItem('theme', theme);
}

function applyTheme() {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';

        // In dark mode, we need to re-apply colors with !important
        if (window.selectedColor) {
            applyPrimaryColor(window.selectedColor);
        }
        if (window.selectedSecondaryColor) {
            applySecondaryColor(window.selectedSecondaryColor);
        }
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';

        // In light mode, also re-apply colors
        if (window.selectedColor) {
            applyPrimaryColor(window.selectedColor);
        }
        if (window.selectedSecondaryColor) {
            applySecondaryColor(window.selectedSecondaryColor);
        }
    }

    console.log('Theme applied:', theme, 'Colors:', window.selectedColor, window.selectedSecondaryColor);
}
// function adjustFontSize(change) {
//     fontSize += change;
//     fontSize = Math.max(1, Math.min(2, fontSize));
//     storyText.style.fontSize = `${fontSize}rem`;

//     fontSmaller.classList.toggle('active', fontSize < 1.2);
//     fontNormal.classList.toggle('active', fontSize === 1.2);
//     fontLarger.classList.toggle('active', fontSize > 1.2);
// }

// function resetFontSize() {
//     fontSize = 1.2;
//     storyText.style.fontSize = `${fontSize}rem`;

//     fontSmaller.classList.remove('active');
//     fontNormal.classList.add('active');
//     fontLarger.classList.remove('active');
// }

// function toggleLineSpacing() {
//     lineHeight = lineHeight === 1.8 ? 2.2 : 1.8;
//     storyText.style.lineHeight = lineHeight;
//     lineSpacingBtn.classList.toggle('active', lineHeight === 2.2);
// }

// ----------------------------------------------------
// 🔊 وظائف الصوت
// ----------------------------------------------------
// Download current story as JSON
function downloadCurrentStory() {
    if (!currentStory) {
        showNotification('No story loaded to download', 'warning');
        return;
    }

    try {
        // Create a clean copy of the story for export
        const storyForExport = {
            id: currentStory.id || 'story_' + Date.now(),
            title: currentStory.title || 'Untitled Story',
            level: currentStory.level || 'intermediate',
            levelcefr: currentStory.levelcefr || 'B1',
            cover: currentStory.cover || '',
            coverType: currentStory.coverType || 'image',
            content: currentStory.content || [],
            author: currentStory.author || 'Unknown',
            wordCount: currentStory.wordCount || countWords(currentStory.content),
            exportedDate: new Date().toISOString(),
            exportedFrom: 'IStories',
            version: '1.0',
            source: currentStory.source || 'uploaded'
        };

        // Add sound if exists
        if (currentStory.sound) {
            storyForExport.sound = currentStory.sound;
        }

        // Add dictionaries if exists
        if (currentStory.dictionaries && currentStory.dictionaries.length > 0) {
            storyForExport.dictionaries = currentStory.dictionaries;
        }

        // Add translations if they exist in dictionary for this story
        if (Object.keys(dictionary).length > 0) {
            // Get translations for words in this story
            const storyWords = extractStoryWords(currentStory.content);
            const translations = {};

            storyWords.forEach(word => {
                const standardKey = getStandardKey(word);
                if (dictionary[standardKey]) {
                    translations[word] = {
                        translation: dictionary[standardKey].translation || '',
                        pos: dictionary[standardKey].pos || 'unknown',
                        definition: dictionary[standardKey].definition || '',
                        example: dictionary[standardKey].example || ''
                    };
                }
            });

            if (Object.keys(translations).length > 0) {
                storyForExport.translations = translations;
            }
        }

        // Convert to JSON string with pretty formatting
        const jsonString = JSON.stringify(storyForExport, null, 2);

        // Create filename from story title
        const filename = `${storyForExport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.json`;

        // Create download link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        URL.revokeObjectURL(url);

        showNotification(`Story downloaded as ${filename}`, 'success');

    } catch (error) {
        console.error('Error downloading story:', error);
        showNotification('Error downloading story: ' + error.message, 'error');
    }
}
function toggleAudio() {
    if (!currentStory) return;

    if (isAudioPlaying) {
        stopAudio();
        listenBtn.classList.remove('active');
    } else {
        startAudio();
        listenBtn.classList.add('active');
    }
}

function startAudio() {
    if ('speechSynthesis' in window && currentStory) {
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = currentStory.content.join(' ');
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        speechSynthesis.speak(utterance);
        isAudioPlaying = true;

        utterance.onend = () => {
            isAudioPlaying = false;
            listenBtn.classList.remove('active');
        };

        utterance.onerror = () => {
            isAudioPlaying = false;
            listenBtn.classList.remove('active');
            showNotification('Error playing audio.', 'error');
        };
    } else {
        showNotification('Text-to-speech is not supported in your browser.', 'error');
    }
}

function stopAudio() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        isAudioPlaying = false;
    }
}

function listenToWord() {
    if (!currentWordData || !currentWordData.element) return;

    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }

    const wordToSpeak = currentWordData.element.innerText.trim();
    const utterance = new SpeechSynthesisUtterance(wordToSpeak);

    utterance.rate = 0.8;

    speechSynthesis.speak(utterance);
}

// ----------------------------------------------------
// 🌐 وظائف البحث
// ----------------------------------------------------

function searchOnGoogle() {
    if (!currentWordData || !currentWordData.element) return;

    const wordToSearch = currentWordData.element.innerText.trim();
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(wordToSearch)}+meaning`;

    window.open(googleSearchUrl, '_blank');
    hideDictionary();
}

// ----------------------------------------------------
// 📊 وظائف التقدم
// ----------------------------------------------------

function updateReadingProgress() {
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        if (readingProgressBar) {
            readingProgressBar.style.width = scrolled + '%';
        }
    });
}

// ----------------------------------------------------
// 🔄 وظائف التنقل
// ----------------------------------------------------

function switchPage(page) {
    pages.forEach(p => p.classList.remove('active'));
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) pageElement.classList.add('active');

    navTabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.nav-tab[data-page="${page}"]`).classList.add('active');

    if (page === 'vocabulary') {
        renderVocabulary();
        updateVocabularyStats();
    }
}


// ----------------------------------------------------
// 🛠️ وظائف التنظيف والإدارة
// ----------------------------------------------------

function cleanup() {
    window.removeEventListener('scroll', saveReadingPosition);
    window.removeEventListener('beforeunload', saveReadingPosition);

    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }

    document.removeEventListener('click', hideDictionary);
}

// ----------------------------------------------------
// 🎯 إعداد Event Listeners
// ----------------------------------------------------
function setupEventListeners() {
    // Remove existing listeners first to prevent duplicates
    if (saveWordBtn) {
        saveWordBtn.replaceWith(saveWordBtn.cloneNode(true));
        // Get fresh reference
        const freshSaveBtn = document.getElementById('saveWordBtn');

        freshSaveBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Call the save function
            await saveCurrentWord();


        });
    }
    // Close dictionary when clicking outside
    document.addEventListener('click', (e) => {
        const dictionaryPopup = document.getElementById('dictionaryPopup');
        const modalOverlay = document.getElementById('modalOverlay');

        // If dictionary is visible and click is outside of it
        if (dictionaryPopup && dictionaryPopup.style.display === 'block') {
            // Check if click is on the dictionary popup itself or its children
            const isClickInsidePopup = dictionaryPopup.contains(e.target);
            // Check if click is on the modal overlay
            const isClickOnOverlay = modalOverlay && modalOverlay.contains(e.target);

            if (!isClickInsidePopup && !isClickOnOverlay) {
                hideDictionary();
            }
        }
    });
    // Other event listeners...
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (fontSmaller) fontSmaller.addEventListener('click', () => adjustFontSize(-0.1));
    if (fontNormal) fontNormal.addEventListener('click', resetFontSize);
    if (fontLarger) fontLarger.addEventListener('click', () => adjustFontSize(0.1));
    if (lineSpacingBtn) lineSpacingBtn.addEventListener('click', toggleLineSpacing);
    if (listenBtn) listenBtn.addEventListener('click', toggleAudio);

    // Font family listener
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', function () {
            changeFontFamily(this.value);
        });
    }

    if (closePopup) closePopup.addEventListener('click', hideDictionary);
    if (modalOverlay) modalOverlay.addEventListener('click', hideDictionary);
    if (backToHome) backToHome.addEventListener('click', () => window.location.href = '../index.html');
    if (exportVocabularyBtn) exportVocabularyBtn.addEventListener('click', exportVocabulary);
    if (googleSearchBtn) googleSearchBtn.addEventListener('click', searchOnGoogle);
    if (listenWordBtn) listenWordBtn.addEventListener('click', listenToWord);
    if (googleTranslateBtn) googleTranslateBtn.addEventListener('click', translateOnGoogle);

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchPage(tab.dataset.page);
        });
    });
    // Add these to your setupEventListeners function
    if (closePageModal) {
        closePageModal.addEventListener('click', () => {
            pageSelectionModal.style.display = 'none';
        });
    }
    const downloadStoryBtn = document.querySelector('.download-story');
    if (downloadStoryBtn) {
        downloadStoryBtn.addEventListener('click', downloadCurrentStory);
    }
    if (cancelPageSelect) {
        cancelPageSelect.addEventListener('click', () => {
            pageSelectionModal.style.display = 'none';
        });
    }

    if (confirmPageSelect) {
        confirmPageSelect.addEventListener('click', confirmPageSelection);
    }

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === pageSelectionModal) {
            pageSelectionModal.style.display = 'none';
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideDictionary();
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
            }
        }
    });

    window.addEventListener('scroll', saveReadingPosition);
    window.addEventListener('beforeunload', saveReadingPosition);

    window.addEventListener('beforeunload', () => {
        if (isAudioPlaying && 'speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    });

    window.addEventListener('beforeunload', cleanup);


}
// ----------------------------------------------------
// 🎨 إضافة CSS animations
// ----------------------------------------------------

const style = document.createElement('style');
style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .word.saved {
            animation: fadeIn 0.3s ease;
        }
        .no-translation-btn {
            opacity: 0.7;
        }
        .no-translation-btn:hover {
            opacity: 1;
        }
        button.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .loading {
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .user-story-badge {
            display: inline-block;
            background: var(--primary);
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-left: 10px;
            vertical-align: middle;
        }
        .user-story-badge i {
            margin-right: 5px;
        }
        .user-story-badge-small {
            display: inline-block;
            background: var(--primary);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.7rem;
            margin-left: 8px;
            vertical-align: middle;
        }
        .word.from-user-story {
            border-left: 3px solid var(--primary);
        }
        .translation-badge {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideIn 0.3s ease;
        }
    `;
document.head.appendChild(style);

// ----------------------------------------------------
// 🚀 دالة التهيئة (Initialization)
// ----------------------------------------------------
// Function to apply saved font family
function applyFontFamily() {
    if (storyText && fontFamily) {
        storyText.style.fontFamily = fontFamily;
    }

    // Set the select value
    if (fontFamilySelect) {
        fontFamilySelect.value = fontFamily;
    }
}
// Function to apply custom JavaScript
function applyCustomJS() {
    const savedJS = localStorage.getItem('customJS') || '';
    if (savedJS.trim()) {
        try {
            // Remove existing custom JS script if any
            const existingScript = document.getElementById('custom-js-script');
            if (existingScript) {
                existingScript.remove();
            }

            // Create and execute new script
            const script = document.createElement('script');
            script.id = 'custom-js-script';
            script.textContent = savedJS;
            document.head.appendChild(script);

            console.log('Custom JavaScript applied successfully');
        } catch (error) {
            console.error('Error applying custom JavaScript:', error);
            showNotification('Error in custom JavaScript: ' + error.message, 'error');
        }
    }
}

async function init() {
    try {
        // STEP 0: Initialize storage and migrate if needed
        console.log('Step 0: Initializing storage...');
        if (typeof initStorage === 'function') {
            await initStorage();
        }

        // Preload user dictionaries for fast access
        console.log('Step 0.5: Preloading user dictionaries...');
        if (typeof getAllDictionaries === 'function') {
            userDictionariesCache = await getAllDictionaries();
        } else {
            // Fallback to localStorage
            userDictionariesCache = JSON.parse(localStorage.getItem('userDictionaries') || '{}');
        }

        // Set global color variables
        window.selectedColor = localStorage.getItem('selectedColor') || '#4f46e5';
        window.selectedSecondaryColor = localStorage.getItem('selectedSecondaryColor') || '#10b981';

        // STEP 1: Apply saved theme FIRST
        console.log('Step 1: Applying theme...');
        applyTheme();

        // STEP 2: Apply saved colors immediately
        console.log('Step 2: Applying saved colors...');
        if (window.selectedColor) {
            applyPrimaryColor(window.selectedColor);
        }
        if (window.selectedSecondaryColor) {
            applySecondaryColor(window.selectedSecondaryColor);
        }
        setupNavToggle();
        loadFontSettings();

        // STEP 3: Initialize color selectors
        console.log('Step 3: Initializing color selectors...');
        setTimeout(() => {
            if (window.initColorSelector && window.initSecondaryColorSelector) {
                initColorSelector();
                initSecondaryColorSelector();
            }
        }, 100);

        // STEP 4: Setup event listeners
        console.log('Step 4: Setting up event listeners...');
        setupEventListeners();

        // Apply saved font family
        applyFontFamily();

        // STEP 5: Check for userStory URL parameter (from stories-maker)
        const urlParams = new URLSearchParams(window.location.search);
        const isUserStory = urlParams.get('userStory') === 'true';
        const storyId = urlParams.get('id');

        if (isUserStory && storyId) {
            // Load story from localStorage (set by stories-maker)
            const currentReadingStory = localStorage.getItem('currentReadingStory');
            
            if (currentReadingStory) {
                try {
                    const storyData = JSON.parse(currentReadingStory);
                    
                    // Load dictionary if exists
                    if (storyData.translations) {
                        Object.entries(storyData.translations).forEach(([word, data]) => {
                            const standardKey = getStandardKey(word);
                            dictionary[standardKey] = {
                                translation: typeof data === 'string' ? data : (data.translation || "No translation"),
                                pos: (typeof data === 'object' && data.pos) || "unknown",
                                definition: (typeof data === 'object' && data.definition) || `From story: ${storyData.title}`,
                                example: (typeof data === 'object' && data.example) || "Word from user story",
                                source: 'user_story'
                            };
                        });
                    }
                    
                    // Clear the URL parameters
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Display the story
                    displayStory(storyData);
                    
                    if (selectedFileName) {
                        selectedFileName.textContent = storyData.title;
                    }
                    
                    showNotification(`Reading: "${storyData.title}"`, 'success');
                    
                } catch (error) {
                    console.error('Error loading story from URL:', error);
                    showNotification('Error loading story', 'error');
                }
            } else {
                showNotification('Story not found', 'error');
            }
        } else {
            // STEP 5: Check for saved uploaded story
            const savedStory = loadUploadedStoryFromStorage();

            if (savedStory && savedStory.story && savedStory.dictionary) {
                // Load the saved story
                dictionary = savedStory.dictionary;
                displayStory(savedStory.story);
                showNotification('Restored previous story', 'info');

                // Update file name display
                if (selectedFileName) {
                    selectedFileName.textContent = savedStory.story.title + ' (restored)';
                }
            } else {
                // Show welcome message if no saved story
                storyTitle.textContent = 'Welcome!';
                storyText.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-upload" style="font-size: 48px; color: var(--primary); margin-bottom: 20px;"></i><h3>Upload a Story to Begin Reading</h3><p>Click the "Browse Files" button above to select a JSON story file.</p></div>';

                // Load empty dictionary
                dictionary = {};
            }
        }

        // Update stats
        updateVocabularyStats();

        // Auto lazy load images
        document.querySelectorAll('img').forEach(img => img.setAttribute('loading', 'lazy'));

        // FINAL STEP: Apply custom CSS
        console.log('Final Step: Applying custom CSS...');
        const savedCSS = localStorage.getItem('customCSS') || '';
        if (savedCSS.trim()) {
            applyCustomCSS(savedCSS);
        }

    } catch (error) {
        console.error('Error during initialization:', error);
        showNotification('Failed to initialize application', 'error');
    }
}
document.addEventListener('DOMContentLoaded', init);

// ============================================================
// 📚 JS Story Picker
// ============================================================

function loadStoryFromJS(story) {
    const normalized = {
        id: story.id || ('js-' + Date.now()),
        title: story.title || 'Untitled',
        level: story.level || '',
        levelcefr: story.levelcefr || '',
        author: story.author || '',
        sound: story.sound || '',
        cover: story.cover || '',
        coverType: story.coverType || '',
        content: Array.isArray(story.content) ? story.content : [],
        dictionaries: Array.isArray(story.dictionaries) ? story.dictionaries : [],
        wordCount: story.wordCount || 0,
        isUserStory: false
    };

    showLevelElements();
    saveUploadedStoryToStorage(normalized, {});

    if (typeof loadDictionary === 'function' && normalized.dictionaries.length > 0) {
        loadDictionary(normalized.dictionaries).then(() => displayStory(normalized)).catch(() => displayStory(normalized));
    } else {
        displayStory(normalized);
    }

    if (selectedFileName) selectedFileName.textContent = normalized.title;
    showNotification('Now reading: "' + normalized.title + '"', 'success');
}

function showStoryPickerModal(stories) {
    const existing = document.getElementById('jsStoryPickerModal');
    if (existing) existing.remove();


    const modal = document.createElement('div');
    modal.id = 'jsStoryPickerModal';
    modal.innerHTML = `
        <div id="jsPickerOverlay" style="
            position:fixed;inset:0;background:rgba(0,0,0,.5);
            backdrop-filter:blur(4px);z-index:9000;"></div>
        <div id="jsPickerBox">
            <div id="jsPickerHeader">
                <h3>
                    <i class="fas fa-book-open" style="color:var(--primary)"></i>
                    Select a Story
                    <span style="font-weight:400;opacity:.55;font-size:.85rem;">(${stories.length})</span>
                </h3>
                <button id="jsPickerCloseBtn" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="jsPickerSearchWrap">
                <div id="jsPickerSearchInner">
                    <i class="fas fa-search"></i>
                    <input id="jsPickerSearch" type="text" placeholder="Search stories..." autocomplete="off">
                </div>
            </div>
            <div id="jsPickerGrid"></div>
        </div>
    `;
    document.body.appendChild(modal);

    renderPickerCards(stories, stories);

    document.getElementById('jsPickerSearch').addEventListener('input', function () {
        const q = this.value.toLowerCase().trim();
        const filtered = q
            ? stories.filter(s =>
                (s.title || '').toLowerCase().includes(q) ||
                (s.author || '').toLowerCase().includes(q) ||
                (s.level || '').toLowerCase().includes(q))
            : stories;
        renderPickerCards(stories, filtered);
    });

    function closeModal() { modal.remove(); }
    document.getElementById('jsPickerCloseBtn').addEventListener('click', closeModal);
    document.getElementById('jsPickerOverlay').addEventListener('click', closeModal);
    document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onEsc); }
    });
}

function renderPickerCards(allStories, filtered) {
    const grid = document.getElementById('jsPickerGrid');
    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="js-picker-empty">
            <i class="fas fa-search"></i>No stories found</div>`;
        return;
    }

    const levelColors = {
        beginner: { bg: '#d1fae5', color: '#065f46' },
        intermediate: { bg: '#fef3c7', color: '#92400e' },
        advanced: { bg: '#fee2e2', color: '#991b1b' }
    };

    grid.innerHTML = filtered.map(story => {
        const level = (story.level || '').toLowerCase();
        const lc = levelColors[level] || { bg: 'var(--bg-secondary,#f3f4f6)', color: 'var(--text-light,#6b7280)' };
        const realIdx = allStories.indexOf(story);

        const coverHtml = (story.coverType === 'image' && story.cover)
            ? `<img src="${story.cover}" alt="" onerror="this.parentElement.innerHTML='<i class=\'fas fa-book-open\'></i>'">`
            : `<i class="fas fa-book-open"></i>`;

        return `<div class="js-picker-card" data-idx="${realIdx}">
            <div class="js-picker-cover">${coverHtml}</div>
            <div class="js-picker-body">
                <div class="js-picker-title">${story.title || 'Untitled'}</div>
                <div class="js-picker-meta">
                    ${level ? `<span class="js-picker-badge" style="background:${lc.bg};color:${lc.color};">${level}</span>` : ''}
                    ${story.levelcefr ? `<span class="js-picker-badge" style="background:var(--bg-secondary,#f3f4f6);color:var(--text-light,#6b7280);">${story.levelcefr}</span>` : ''}
                    ${story.wordCount ? `<span style="font-size:.65rem;color:var(--text-light,#9ca3af);display:flex;align-items:center;gap:2px;">
                        <i class="fas fa-align-left" style="font-size:.58rem;"></i>${story.wordCount}w</span>` : ''}
                </div>
                ${story.author ? `<div class="js-picker-author"><i class="fas fa-user"></i>${story.author}</div>` : ''}
            </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.js-picker-card').forEach(card => {
        card.addEventListener('click', function () {
            const idx = parseInt(this.dataset.idx);
            document.getElementById('jsStoryPickerModal').remove();
            loadStoryFromJS(allStories[idx]);
        });
    });
}