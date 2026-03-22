




// App state
let currentPage = 'home';
let currentStory = null;
let savedWords = JSON.parse(localStorage.getItem('savedWords')) || [];
let fontSize = 1.2; // rem
let lineHeight = 1.8;
let stories = []; // Will be loaded from external file
let showUserStories = localStorage.getItem('showUserStories') !== 'false'; // Default: true
// Store current word for saving
let currentWordData = null;

// Dictionary fallback
let dictionary = window.dictionary || {};

// DOM elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const levelBtns = document.querySelectorAll('.level-btn');
const storiesGrid = document.getElementById('storiesGrid');
const storyText = document.getElementById('storyText');
const dictionaryPopup = document.getElementById('dictionaryPopup');
const backToStories = document.getElementById('backToStories');
const fontSmaller = document.getElementById('fontSmaller');
const fontNormal = document.getElementById('fontNormal');
const fontLarger = document.getElementById('fontLarger');
const lineSpacingBtn = document.getElementById('lineSpacing');
const listenBtn = document.getElementById('listenBtn');
const saveWordBtn = document.getElementById('saveWordBtn');
const closePopup = document.getElementById('closePopup');

// Function to scroll to top of page
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Initialize the app
function init() {
    console.log('App initialization started...');
    // Auto lazy load ALL images
    // document.querySelectorAll('img').forEach(img => img.setAttribute('loading', 'lazy'));
    // Wait for stories to be loaded from external file
    if (typeof window.storiesData !== 'undefined') {
        stories = window.storiesData.stories || window.storiesData;
        console.log('Loaded stories from external file:', stories.length);
    } else {
        // Fallback if external file fails
        stories = [
            {
                id: 1,
                title: "The Mysterious Island",
                level: "beginner",
                cover: "🏝️",
                coverType: "emoji",
                wordCount: 350,
                content: ["This is a sample story. Click on words like village or journey to see the dictionary."]
            }
        ];
        console.log('Using fallback stories');
    }

    // Load user stories from localStorage
    try {
        const storedUserStories = JSON.parse(localStorage.getItem('userStories')) || [];
        userStories = storedUserStories;

        // Add user stories to main stories array
        userStories.forEach(userStory => {
            if (!stories.some(s => s.id === userStory.id)) {
                stories.push(userStory);
            }
        });
        console.log('Loaded user stories:', userStories.length);
    } catch (error) {
        console.error('Error loading user stories:', error);
        userStories = [];
    }

    // STEP 1: Apply saved theme FIRST
    console.log('Step 1: Applying theme...');
    applyTheme();

    // STEP 2: Apply saved primary color immediately
    console.log('Step 2: Applying saved primary color:', selectedColor);
    if (selectedColor) {
        applyPrimaryColor(selectedColor);
    }

    // STEP 3: Apply saved secondary color immediately
    console.log('Step 2.5: Applying saved secondary color:', selectedSecondaryColor);
    if (selectedSecondaryColor) {
        applySecondaryColor(selectedSecondaryColor);
    }

  
   
    // Check for daily bonus (disabled)
    // checkDailyBonus();
    // STEP 4: Initialize color selectors
    console.log('Step 3: Initializing color selectors...');
    setTimeout(() => {
        initColorSelector();
        initSecondaryColorSelector(); // Add this line
    }, 50);

 



    // STEP 7: Set up event listeners
    console.log('Step 6: Setting up event listeners...');
    setupEventListeners();



    // STEP 9: Verify everything is set up correctly
    console.log('Step 8: Final verification...');
    setTimeout(() => {
        verifyColorSetup();
    }, 200);

    console.log('App initialization complete!');
}

// Add this verification function
function verifyColorSetup() {
    const root = document.documentElement;
    const currentPrimary = getComputedStyle(root).getPropertyValue('--primary').trim();
    const currentPrimaryDark = getComputedStyle(root).getPropertyValue('--primary-dark').trim();

    console.log('=== COLOR VERIFICATION ===');
    console.log('Selected color in localStorage:', localStorage.getItem('selectedColor'));
    console.log('Selected color variable:', selectedColor);
    console.log('CSS --primary:', currentPrimary);
    console.log('CSS --primary-dark:', currentPrimaryDark);
    console.log('Theme:', localStorage.getItem('theme'));

    // Check if colors match
    if (selectedColor && selectedColor.toLowerCase() === currentPrimary.toLowerCase()) {
        console.log('✅ Colors match correctly!');
    } else {
        console.log('⚠️ Colors might not match:', { selectedColor, currentPrimary });
    }

    // Add visual indicator for debugging (remove in production)
    const debugIndicator = document.createElement('div');
    debugIndicator.id = 'color-debug-indicator';
    debugIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: var(--primary);
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 9999;
        opacity: 0.8;
        display: none; /* Change to 'block' to see it */
    `;
    debugIndicator.innerHTML = `Primary: ${currentPrimary}`;
    document.body.appendChild(debugIndicator);
}

// Also update your initColorSelector function to prevent multiple calls:
let colorSelectorInitialized = false;



// Set up all event listeners
function setupEventListeners() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(link.dataset.page);
            // Scroll to top when switching pages
            scrollToTop();
        });
    });

    levelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            levelBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderStories(btn.dataset.level);
        });
    });

    themeToggle.addEventListener('click', toggleTheme);

    document.getElementById("randomStory").addEventListener('click', () => {
        if (stories.length > 0) {
            // Generate a random index from 0 to stories.length - 1
            var randomIndex = Math.floor(Math.random() * stories.length);

            // Get the random story using the random index
            var randomStory = stories[randomIndex];

            // Open the random story
            openStoryInNewPage(randomStory.id);
        }
    });
}

// Touch handling for mobile
let touchTimer;
let touchTarget;

function handleTouchStart(e) {
    if (e.target.classList.contains('word')) {
        touchTarget = e.target;
        touchTimer = setTimeout(() => {
            showSentenceTranslation(e.target);
        }, 500);
    }
}

function handleTouchEnd() {
    clearTimeout(touchTimer);
}

// Page navigation
function switchPage(page) {
    currentPage = page;
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    navLinks.forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });


}
function Refresh() {
    window.location.reload()
}
// Open story in a new page WITH story title
function openStoryInNewPage(storyId) {
    // Find the story in all available sources
    let story = stories.find(s => s.id == storyId);

    // If not found in main stories, check user stories
    if (!story) {
        const userStories = JSON.parse(localStorage.getItem('userStories')) || [];
        story = userStories.find(s => s.id == storyId);

        if (story && !stories.some(s => s.id == storyId)) {
            stories.push(story); // Add to stories array for this session
        }
    }

    if (story) {
        // Add to reading history
        if (typeof addToReadingHistory === 'function') {
            addToReadingHistory(story);
        }

        // Prepare story data for reader page
        const storyData = {
            id: story.id,
            title: story.title,
            level: story.level,
            content: story.content,
            isUserStory: story.isUserStory || false,
            cover: story.cover,
            coverType: story.coverType,
            sound: story.sound || null,
            dictionaries: story.dictionaries || [],
            translations: story.isUserStory ? (story.translations || {}) : null
        };

        // Store in localStorage for reader page
        localStorage.setItem('currentReadingStory', JSON.stringify(storyData));

        // Redirect to reader page
        const storyPage = 'reader/index.html?id=' + storyId +
            (story.isUserStory ? '&userStory=true' : '');
        window.location.href = storyPage;
    } else {
        showNotification('Story not found!');
    }
}




// settings
const settingsButton = document.getElementById("settings-button");
const settingsPage = document.getElementById("settings-page");
const closeSettings = document.getElementById("close-settings");
const settingsOverlay = document.getElementById("settings-overlay");

settingsButton.addEventListener("click", function () {
    settingsPage.classList.toggle("open");
    settingsOverlay.classList.add("active");
});

closeSettings.addEventListener("click", function () {
    settingsPage.classList.remove("open");
    settingsOverlay.classList.remove("active");
});
// Close settings on Escape key
document.addEventListener("keydown", function (e) {
    if (e.key === 'Escape' && settingsPage.classList.contains("open")) {
        settingsPage.classList.remove("open");
        settingsOverlay.classList.remove("active");
    }
});
settingsOverlay.addEventListener("click", function () {
    settingsPage.classList.remove("open");
    settingsOverlay.classList.remove("active");
});




// Show temporary notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--secondary);
        color: white;
        padding: 12px 20px;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        z-index: 1000;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations
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
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);