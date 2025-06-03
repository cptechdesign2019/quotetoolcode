// 0. Firebase Initialization
// -----------------------------------------------------------------------------
// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyCZ1hlNQ6TbyJsBgFplVBmiqBRTbgJreZM", // PASTE YOUR ACTUAL API KEY HERE
    authDomain: "clearpoint-quoting-tool.firebaseapp.com", // PASTE YOUR ACTUAL AUTH DOMAIN HERE
    projectId: "clearpoint-quoting-tool", // PASTE YOUR ACTUAL PROJECT ID HERE
    storageBucket: "clearpoint-quoting-tool.firebasestorage.app", // PASTE YOUR ACTUAL STORAGE BUCKET HERE
    messagingSenderId: "551915292541", // PASTE YOUR ACTUAL MESSAGING SENDER ID HERE
    appId: "1:551915292541:web:eae34446f251a9223fae14" // PASTE YOUR ACTUAL APP ID HERE
};

// Initialize Firebase
let fbApp;
let fbAuth;
let db; // Variable for Firestore database instance

try {
    if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function' &&
        typeof firebase.auth === 'function' && typeof firebase.firestore === 'function') {
        fbApp = firebase.initializeApp(firebaseConfig);
        fbAuth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase App, Auth, and Firestore Initialized Successfully.");
    } else {
        console.error("Firebase SDKs (App, Auth, or Firestore) not found. Ensure they are loaded before script.js.");
        throw new Error("Firebase SDKs not loaded correctly.");
    }
} catch (e) {
    console.error("Error initializing Firebase services: ", e);
    const body = document.querySelector('body');
    if (body) {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'CRITICAL: Firebase Services Init Failed. App cannot load. Check console.';
        errorDiv.style.color = 'red';
        errorDiv.style.backgroundColor = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '0';
        errorDiv.style.left = '0';
        errorDiv.style.width = '100%';
        errorDiv.style.zIndex = '9999';
        body.insertBefore(errorDiv, body.firstChild);
    }
}
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded - Script Starting - Version 2025-05-26_SOW_PDF_AI_Button_Fix");

    // --- Authentication Related DOM Elements ---
    const loginView = document.getElementById('loginView');
    const mainAppContent = document.getElementById('mainAppContent');
    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const loginError = document.getElementById('loginError');

    // 1. DOM Element Constants
    const projectInfoInput = document.getElementById('projectNameNumber');
    const currentYearSpan = document.getElementById('currentYear');
    const navigateToQuoteBuilderBtn = document.getElementById('navigateToQuoteBuilderBtn');
    const navigateToSowBtn = document.getElementById('navigateToSowBtn');
    const quoteBuilderView = document.getElementById('quoteBuilderView');
    const sowView = document.getElementById('sowView');
    const productSearchInput = document.getElementById('productSearchInput');
    const brandFilterDropdown = document.getElementById('brandFilterDropdown');
    const productDropdown = document.getElementById('productDropdown');
    const previewArea = document.getElementById('previewArea');
    const addToQuoteBtn = document.getElementById('addToQuoteBtn');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    const dataLoadStatus = document.getElementById('dataLoadStatus');
    const addSuccessNotificationEl = document.getElementById('addSuccessNotification');
    const quoteItemsTbody = document.getElementById('quoteItemsTbody');
    const emptyQuoteMsg = document.getElementById('emptyQuoteMsg');
    const quoteItemsTableEl = document.getElementById('quoteItemsTable');
    const summaryCostTotalEl = document.getElementById('summaryCostTotal');
    const summarySellTotalEl = document.getElementById('summarySellTotal');
    const summaryProfitAmountEl = document.getElementById('summaryProfitAmount');
    const summaryGPMEl = document.getElementById('summaryGPM');
    const laborItemsContainer = document.getElementById('laborItemsContainer');
    const laborSummaryManHoursEl = document.getElementById('laborSummaryManHours');
    const laborSummaryCostTotalEl = document.getElementById('laborSummaryCostTotal');
    const laborSummarySellTotalEl = document.getElementById('laborSummarySellTotal');
    const laborSummaryProfitAmountEl = document.getElementById('laborSummaryProfitAmount');
    const laborSummaryGPMEl = document.getElementById('laborSummaryGPM');
    const discountPercentInput = document.getElementById('discountPercent');
    const shippingPercentInput = document.getElementById('shippingPercent');
    const salesTaxPercentInput = document.getElementById('salesTaxPercent');
    const grandEquipmentClientTotalEl = document.getElementById('grandEquipmentClientTotal');
    const grandLaborClientTotalEl = document.getElementById('grandLaborClientTotal');
    const grandCombinedSubtotalEl = document.getElementById('grandCombinedSubtotal');
    const grandDiscountAmountEl = document.getElementById('grandDiscountAmount');
    const grandSubtotalAfterDiscountEl = document.getElementById('grandSubtotalAfterDiscount');
    const grandShippingAmountEl = document.getElementById('grandShippingAmount');
    const grandSalesTaxAmountEl = document.getElementById('grandSalesTaxAmount');
    const finalGrandTotalEl = document.getElementById('finalGrandTotal');
    const grandEquipmentCompanyCostEl = document.getElementById('grandEquipmentCompanyCost');
    const grandLaborCompanyCostEl = document.getElementById('grandLaborCompanyCost');
    const grandOverallCompanyCostEl = document.getElementById('grandOverallCompanyCost');
    const grandOverallProfitAmountEl = document.getElementById('grandOverallProfitAmount');
    const grandOverallGPMEl = document.getElementById('grandOverallGPM');
    const printQuoteBtn = document.getElementById('printQuoteBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const downloadSowPdfBtn = document.getElementById('downloadSowPdfBtn');
    const viewSpecSheetsBtn = document.getElementById('viewSpecSheetsBtn');
    const specSheetModal = document.getElementById('specSheetModal');
    const specSheetLinksContainer = document.getElementById('specSheetLinksContainer');
    const modalCloseButton = document.querySelector('#specSheetModal .modal-close-button');
    const sowProjectInfoDisplaySpan = document.getElementById('sowProjectNameNumber');
    const sowFullOutputTextEl = document.getElementById('sowFullOutputText');
    const sowAiPromptTextEl = document.getElementById('sowAiPromptText');
    const draftFullSowWithAiBtnEl = document.getElementById('draftFullSowWithAiBtn');
    const sowMicBtnEl = document.getElementById('sowMicBtn');
    const saveQuoteBtn = document.getElementById('saveQuoteBtn');
    const loadQuoteSidebar = document.getElementById('loadQuoteSidebar');
    const toggleLoadQuoteSidebarBtn = document.getElementById('toggleLoadQuoteSidebarBtn');
    const closeLoadQuoteSidebarBtn = document.getElementById('closeLoadQuoteSidebarBtn');
    const savedQuotesListEl = document.getElementById('savedQuotesList');
    const newQuoteBtn = document.getElementById('newQuoteBtn');
    const quoteStatusSelector = document.getElementById('quoteStatusSelector');
    const updateStatusBtn = document.getElementById('updateStatusBtn');

    // 2. State Variable Declarations
    const CSV_FILENAME = "2025 Price List with Spec & Image URLs.csv";
    const CSV_URL = `./${CSV_FILENAME}`;
    const HOURS_PER_DAY = 8;
    const PLACEHOLDER_IMAGE_URL = "placeholderlogoimage.png";
    let notificationTimeoutId = null;
    let currentView = 'quoteBuilderView';
    let uiInitialized = false;
    let currentSpeechRecognitionInstance = null;
    let draggedItem = null;
    let draggedItemIndex = -1;
    let currentLoadedQuoteId = null;
    

    let allProducts = [];
    let fuseInstance = null;
    let displayedProducts = [];
    let currentSelectedProductForPreview = null;
    let equipmentQuoteItems = [];

    const technicians = [
        { id: 'unassigned', name: '-- Select Tech --', rate: 0 },
        { id: 'todd', name: 'Todd - Specialist', rate: 42.50 },
        { id: 'austin', name: 'Austin - Lead Tech', rate: 40.63 },
        { id: 'john', name: 'John - Technician', rate: 37.50 },
        { id: 'joe', name: 'Joe - Technician', rate: 31.25 }
    ];

    const subcontractors = [
        { id: 'none', name: '-- Select Subcontractor --', dailyRate: 0 },
        { id: 'kandel', name: 'Kandel Services', dailyRate: 500 },
        { id: 'smarthome_lead', name: 'SmartHome and More (Lead - Dan)', dailyRate: 450 },
        { id: 'smarthome_tech', name: 'SmartHome and More (Technician)', dailyRate: 250 }
    ];

    let laborDetails = [
        { id: 'sde', name: 'System Design & Engineering', clientRatePerHour: 150, isClientRateEditable: false, numTechs: 1, numDays: 0.5, assignedTechSlots: [{ techId: 'todd' }], allowSubcontractors: false, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
        { id: 'programming', name: 'Programming', clientRatePerHour: 150, isClientRateEditable: false, numTechs: 1, numDays: 0, assignedTechSlots: [{ techId: 'todd' }], allowSubcontractors: false, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
        { id: 'prewire', name: 'Pre-wire', clientRatePerHour: 100, isClientRateEditable: true, numTechs: 0, numDays: 0, assignedTechSlots: [], allowSubcontractors: true, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
        { id: 'installation', name: 'Installation', clientRatePerHour: 100, isClientRateEditable: true, numTechs: 3, numDays: 1, assignedTechSlots: [{ techId: 'austin' }, { techId: 'john' }, { techId: 'joe' }], allowSubcontractors: true, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 }
    ];

    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100%';
    loadingOverlay.style.height = '100%';
    loadingOverlay.style.backgroundColor = 'rgba(0,0,0,0.65)';
    loadingOverlay.style.zIndex = '2000';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.color = 'white';
    loadingOverlay.style.fontSize = '1.6em';
    loadingOverlay.style.textAlign = 'center';
    loadingOverlay.innerHTML = '<p>Processing, please wait...</p>';
    document.body.appendChild(loadingOverlay);
    loadingOverlay.style.display = 'none';

    // --- Authentication Functions ---
    function showLoginView() {
        console.log("Showing Login View");
        if (loginView) loginView.style.display = 'block';
        if (mainAppContent) mainAppContent.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';
        const headerH1 = document.querySelector('header h1');
        if (headerH1) {
            headerH1.style.textAlign = 'center';
        }
    }

    function showAppView() {
        console.log("Showing App View");
        if (loginView) loginView.style.display = 'none';
        if (mainAppContent) mainAppContent.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'inline-block';
        const headerH1 = document.querySelector('header h1');
        if (headerH1) {
            headerH1.style.textAlign = '';
        }

        if (!uiInitialized) {
            initializeAppUIAndListeners();
        } else {
            console.log("App UI already initialized. Refreshing view states if necessary.");
            if (typeof showView === "function" && typeof currentView !== "undefined") {
                 showView(currentView);
            }
        }
    }

    function handleLogin() {
        if (!loginEmailInput || !loginPasswordInput || !loginError || !fbAuth) {
            console.error("Login form elements or fbAuth not found for handleLogin.");
            if(loginError) loginError.textContent = "Login system error. Try refreshing.";
            return;
        }
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        loginError.textContent = '';

        if (!email || !password) {
            loginError.textContent = 'Please enter both email and password.';
            return;
        }
        console.log(`Attempting login for: ${email}`);
        fbAuth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('User logged in:', userCredential.user.email);
            })
            .catch((error) => {
                console.error('Login error:', error);
                if (loginError) {
                    loginError.textContent = `Login Failed: ${error.message} (Code: ${error.code})`;
                }
            });
    }

    function handleLogout() {
        if (!fbAuth) {
            console.error("fbAuth not found for handleLogout.");
            return;
        }
        fbAuth.signOut().then(() => {
            console.log('User logged out');
            uiInitialized = false;
        }).catch((error) => {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        });
    }

    // Add event listeners for login and logout buttons
    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    // --- END Authentication Functions ---

    // --- Sidebar Functions ---
    function openLoadQuoteSidebar() {
        // alert("--- DEBUG: openLoadQuoteSidebar CALLED VIA BUTTON CLICK! ---"); // Commented out
        console.log("--- DEBUG: openLoadQuoteSidebar function IS DEFINED and CALLED ---");
        if (loadQuoteSidebar) {
            loadQuoteSidebar.classList.add('open');
            console.log("Load Quote Sidebar Opened - class 'open' added.");
            fetchAndDisplaySavedQuotes();
        } else {
            console.error("loadQuoteSidebar element not found in openLoadQuoteSidebar");
        }
    }

    function closeLoadQuoteSidebar() {
        // alert("--- DEBUG: closeLoadQuoteSidebar CALLED VIA BUTTON CLICK! ---"); // Commented out
        console.log("--- DEBUG: closeLoadQuoteSidebar function IS DEFINED and CALLED ---");
        if (loadQuoteSidebar) {
            loadQuoteSidebar.classList.remove('open');
            console.log("Load Quote Sidebar Closed");
        } else {
            console.error("loadQuoteSidebar element not found in closeLoadQuoteSidebar");
        }
    }
    // --- END Sidebar Functions ---

    // --- Firestore Delete Quote Function ---
    async function handleDeleteQuote(quoteId, quoteName) {
        console.log(`Attempting to delete quote ID: ${quoteId}, Name: ${quoteName}`);

        if (!window.confirm(`Are you sure you want to delete the quote: "${quoteName}"? This action cannot be undone.`)) {
            return;
        }
        if (!db) {
            console.error("Firestore 'db' instance is not available for deleting quote.");
            alert("Error: Database not available. Cannot delete quote.");
            return;
        }
        if (!fbAuth.currentUser) {
            console.error("No user logged in. Cannot delete quote.");
            alert("Error: You must be logged in to delete a quote.");
            return;
        }
        showLoadingOverlay("Deleting quote...");
        try {
            const quoteRef = db.collection("quotes").doc(quoteId);
            const quoteDoc = await quoteRef.get();
            if (quoteDoc.exists && quoteDoc.data().userId === fbAuth.currentUser.uid) {
                await quoteRef.delete();
                console.log(`Quote with ID: ${quoteId} successfully deleted.`);
                alert(`Quote "${quoteName}" deleted successfully.`);
                fetchAndDisplaySavedQuotes();
                if (currentLoadedQuoteId === quoteId) {
                    console.log("Currently loaded quote was deleted. Resetting form.");
                    if(refreshDataBtn) refreshDataBtn.click();
                    currentLoadedQuoteId = null;
                }
            } else {
                console.error("Error deleting quote: Quote not found or user mismatch.");
                alert("Error: Could not delete quote. It might have already been deleted or you do not have permission.");
            }
        } catch (error) {
            console.error("Error deleting quote from Firestore: ", error);
            alert("An error occurred while deleting the quote. Please try again.");
        } finally {
            hideLoadingOverlay();
        }
    }
    // --- END Firestore Delete Quote Function ---

    // --- Fetch and Display Saved Quotes Function ---
    async function fetchAndDisplaySavedQuotes() {
        if (!fbAuth.currentUser) {
            console.log("No user logged in, cannot fetch quotes.");
            if (savedQuotesListEl) savedQuotesListEl.innerHTML = '<p>Please log in to see saved quotes.</p>';
            return;
        }
        if (!db) {
            console.error("Firestore 'db' instance is not available for fetching quotes.");
            if (savedQuotesListEl) savedQuotesListEl.innerHTML = '<p>Error: Database not available.</p>';
            return;
        }

        const userId = fbAuth.currentUser.uid;
        console.log(`Workspaceing quotes for user: ${userId}`);
        if (savedQuotesListEl) savedQuotesListEl.innerHTML = '<p>Loading saved quotes...</p>';

        try {
            const querySnapshot = await db.collection("quotes")
                                          .where("userId", "==", userId)
                                          .orderBy("updatedAt", "desc")
                                          .get();

            if (savedQuotesListEl) savedQuotesListEl.innerHTML = '';

            if (querySnapshot.empty) {
                console.log("No saved quotes found for this user.");
                if (savedQuotesListEl) savedQuotesListEl.innerHTML = '<p>No saved quotes found.</p>';
                return;
            }

            querySnapshot.forEach(doc => {
                const quote = doc.data();
                const quoteId = doc.id;
                const quoteDiv = document.createElement('div');
                quoteDiv.classList.add('quote-item-entry');
                quoteDiv.dataset.quoteId = quoteId;

                const quoteName = quote.quoteName || quote.projectNameNumber || "Untitled Quote";
                const updatedDate = (quote.updatedAt && typeof quote.updatedAt.toDate === 'function')
                                    ? quote.updatedAt.toDate().toLocaleDateString()
                                    : 'N/A';
                const status = quote.status || 'N/A';

                const quoteInfoSpan = document.createElement('span');
                quoteInfoSpan.classList.add('quote-info');
                quoteInfoSpan.innerHTML = `
                    <strong>${quoteName}</strong>
                    <small>Last updated: ${updatedDate}</small>
                    <small style="font-style: italic; color: var(--clearpoint-primary-blue);">Status: ${status}</small>
                `;

                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-quote-btn');
                deleteButton.title = `Delete quote: ${quoteName}`;
                deleteButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/>
                        <path d="M0 0h24v24H0z" fill="none"/>
                    </svg>
                `;
                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    handleDeleteQuote(quoteId, quoteName);
                });

                quoteDiv.appendChild(quoteInfoSpan);
                quoteDiv.appendChild(deleteButton);

                quoteDiv.addEventListener('click', () => {
                    loadSelectedQuote(quoteId, quote);
                });

                if (savedQuotesListEl) savedQuotesListEl.appendChild(quoteDiv);
            });
            console.log(`Displayed ${querySnapshot.size} quotes.`);

        } catch (error) {
            console.error("Error fetching saved quotes: ", error);
            if (savedQuotesListEl) savedQuotesListEl.innerHTML = '<p>Error loading quotes. Please try again.</p>';
        }
    }
    // --- END fetchAndDisplaySavedQuotes Function ---

    // --- Firestore Load Selected Quote Function ---
    async function loadSelectedQuote(quoteId, quoteData) {
        console.log(`Loading quote with ID: ${quoteId}`, quoteData);
        showLoadingOverlay("Loading quote...");

        try {
            currentLoadedQuoteId = quoteId;

            if (projectInfoInput && typeof quoteData.projectNameNumber !== 'undefined') {
                projectInfoInput.value = quoteData.projectNameNumber;
            }

            equipmentQuoteItems = [];
            if (quoteData.equipmentItems && Array.isArray(quoteData.equipmentItems)) {
                quoteData.equipmentItems.forEach(savedItem => {
                    equipmentQuoteItems.push({
                        quoteItemId: `qitem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        masterId: savedItem.masterId,
                        productName: savedItem.productName,
                        productNumber: savedItem.productNumber,
                        brand: savedItem.brand,
                        description: savedItem.description,
                        imageURL: savedItem.imageURL,
                        specSheetURL: savedItem.specSheetURL,
                        costPrice: savedItem.costPrice,
                        msrp: savedItem.msrp,
                        sellPrice: savedItem.sellPrice,
                        quantity: savedItem.quantity,
                        markupPercentage: savedItem.markupPercentage
                    });
                });
            }
            renderEquipmentQuote();

            if (quoteData.laborDetails && Array.isArray(quoteData.laborDetails)) {
                laborDetails.forEach(appLaborCategory => {
                    const savedLaborCategory = quoteData.laborDetails.find(slc => slc.id === appLaborCategory.id);
                    if (savedLaborCategory) {
                        appLaborCategory.numTechs = savedLaborCategory.numTechs || 0;
                        appLaborCategory.numDays = savedLaborCategory.numDays || 0;
                        if (appLaborCategory.isClientRateEditable && typeof savedLaborCategory.clientRatePerHour !== 'undefined') {
                            appLaborCategory.clientRatePerHour = savedLaborCategory.clientRatePerHour;
                        }
                        appLaborCategory.assignedTechSlots = savedLaborCategory.assignedTechSlots || [];
                        appLaborCategory.numSubcontractors = savedLaborCategory.numSubcontractors || 0;
                        appLaborCategory.assignedSubcontractors = savedLaborCategory.assignedSubcontractors || [];
                    }
                });
            }
            renderLaborSection();

            if (discountPercentInput && typeof quoteData.discountPercent !== 'undefined') {
                discountPercentInput.value = quoteData.discountPercent;
            }
            if (shippingPercentInput && typeof quoteData.shippingPercent !== 'undefined') {
                shippingPercentInput.value = quoteData.shippingPercent;
            }
            if (salesTaxPercentInput && typeof quoteData.salesTaxPercent !== 'undefined') {
                salesTaxPercentInput.value = quoteData.salesTaxPercent;
            }

            if (quoteStatusSelector && typeof quoteData.status !== 'undefined') {
                quoteStatusSelector.value = quoteData.status;
            } else if (quoteStatusSelector) {
                quoteStatusSelector.value = "Draft";
                console.warn(`Status not found in loaded quote data for ${quoteId}, defaulting dropdown to Draft.`);
            }

            calculateAndRenderGrandTotals();
            closeLoadQuoteSidebar();
            showView('quoteBuilderView');
            alert(`Quote "${quoteData.quoteName || 'Untitled Quote'}" loaded successfully!`);

        } catch (error) {
            console.error("Error loading selected quote: ", error);
            alert("There was an error loading the quote. Please check the console.");
        } finally {
            hideLoadingOverlay();
        }
    }
    // --- END Load Selected Quote Function ---

    // --- Firestore Update Quote Status Function ---
    async function handleUpdateQuoteStatus() {
        console.log("Update Status button clicked.");
        if (!currentLoadedQuoteId) {
            alert("Please load a quote first before updating its status.");
            return;
        }
        if (!fbAuth.currentUser) {
            alert("You must be logged in to update a quote status.");
            return;
        }
        if (!db) {
            alert("Database connection is not available.");
            return;
        }
        if (!quoteStatusSelector || !quoteStatusSelector.value) {
            alert("Could not determine the new status from the dropdown.");
            console.error("quoteStatusSelector or its value is missing.");
            return;
        }

        const newStatus = quoteStatusSelector.value;
        const quoteRef = db.collection("quotes").doc(currentLoadedQuoteId);

        showLoadingOverlay("Updating status...");

        try {
            await quoteRef.update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert(`Quote status updated to "${newStatus}" successfully!`);
            console.log(`Quote ${currentLoadedQuoteId} status updated to ${newStatus}`);
            fetchAndDisplaySavedQuotes();
        } catch (error) {
            console.error("Error updating quote status: ", error);
            alert("Failed to update quote status. Please check the console.");
        } finally {
            hideLoadingOverlay();
        }
    }
    // --- END Update Quote Status Function ---

    // --- Firestore Save Quote Function (Handles New/Update) ---
    async function handleSaveQuote() {
        console.log("Save Quote button clicked. Stage 1: Entry");
        showLoadingOverlay("Saving quote...");

        if (!fbAuth.currentUser) {
            alert("You must be logged in to save a quote.");
            console.error("Save attempt without logged-in user.");
            hideLoadingOverlay();
            return;
        }
        console.log("Save Quote Stage 2: User checked.");

        if (!db) {
            alert("Database connection is not available. Please try again later.");
            console.error("Firestore 'db' instance is not available for saving.");
            hideLoadingOverlay();
            return;
        }
        console.log("Save Quote Stage 3: DB checked.");

        let projectName = "";
        if (projectInfoInput && typeof projectInfoInput.value === 'string') {
            projectName = projectInfoInput.value.trim();
        }
        console.log("Save Quote Stage 4: Project name processed as:", projectName);

        const dateForName = new Date();
        let quoteNameFromInput = projectName || `Quote - ${dateForName.toLocaleDateString()} ${dateForName.toLocaleTimeString()}`;
        console.log("Save Quote Stage 5: quoteNameFromInput is:", quoteNameFromInput);

        const equipmentToSave = equipmentQuoteItems.map(item => ({
            masterId: item.masterId, productName: item.productName, productNumber: item.productNumber, brand: item.brand, description: item.description, imageURL: item.imageURL, specSheetURL: item.specSheetURL, costPrice: item.costPrice, msrp: item.msrp, sellPrice: item.sellPrice, quantity: item.quantity, markupPercentage: item.markupPercentage
        }));
        console.log("Save Quote Stage 6: Equipment mapped.");

        const laborToSave = laborDetails.map(detail => ({
            id: detail.id, name: detail.name, clientRatePerHour: detail.clientRatePerHour, isClientRateEditable: detail.isClientRateEditable, numTechs: detail.numTechs, numDays: detail.numDays, assignedTechSlots: detail.assignedTechSlots.map(slot => ({ techId: slot.techId })), allowSubcontractors: detail.allowSubcontractors, numSubcontractors: detail.numSubcontractors, assignedSubcontractors: detail.assignedSubcontractors.map(sub => ({ subcontractorId: sub.subcontractorId, dailyRate: sub.dailyRate })), totalManHours: detail.totalManHours, totalClientCost: detail.totalClientCost, totalCompanyCost: detail.totalCompanyCost
        }));
        console.log("Save Quote Stage 7: Labor mapped.");

        const discount = (discountPercentInput && typeof discountPercentInput.value !== 'undefined') ? parseFloat(discountPercentInput.value) || 0 : 0;
        const shipping = (shippingPercentInput && typeof shippingPercentInput.value !== 'undefined') ? parseFloat(shippingPercentInput.value) || 0 : 0;
        const tax = (salesTaxPercentInput && typeof salesTaxPercentInput.value !== 'undefined') ? parseFloat(salesTaxPercentInput.value) || 0 : 0;
        console.log("Save Quote Stage 8: Adjustments parsed.");

        const finalClientTotal = finalGrandTotalEl ? parseFormattedCurrency(finalGrandTotalEl.textContent) : 0;
        const overallCompanyCost = grandOverallCompanyCostEl ? parseFormattedCurrency(grandOverallCompanyCostEl.textContent) : 0;
        const overallProfitAmount = grandOverallProfitAmountEl ? parseFormattedCurrency(grandOverallProfitAmountEl.textContent) : 0;
        console.log("Save Quote Stage 9: Summary totals parsed.");

        const currentStatusFromDropdown = quoteStatusSelector ? quoteStatusSelector.value : "Draft";

        const quoteData = {
            userId: fbAuth.currentUser.uid,
            userEmail: fbAuth.currentUser.email,
            quoteName: quoteNameFromInput,
            projectNameNumber: projectName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            discountPercent: discount,
            shippingPercent: shipping,
            salesTaxPercent: tax,
            equipmentItems: equipmentToSave,
            laborDetails: laborToSave,
            summaryTotals: { finalClientTotal: finalClientTotal, overallCompanyCost: overallCompanyCost, overallProfitAmount: overallProfitAmount },
            status: currentStatusFromDropdown // Use status from dropdown
        };

        console.log("Save Quote Stage 10: Quote data object assembled:", quoteData);
        console.log("Current loaded quote ID for save/update check:", currentLoadedQuoteId);

        try {
            if (currentLoadedQuoteId) {
                console.log(`Attempting to UPDATE quote with ID: ${currentLoadedQuoteId}`);
                await db.collection("quotes").doc(currentLoadedQuoteId).set(quoteData, { merge: true });
                console.log("Quote updated successfully with ID: ", currentLoadedQuoteId);
                alert(`Quote "${quoteNameFromInput}" updated successfully!`);
            } else {
                console.log("Attempting to SAVE NEW quote.");
                quoteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                // quoteData.status is already set from currentStatusFromDropdown, or defaults to "Draft" if new.
                // If it's truly a new quote (no currentLoadedQuoteId), explicitly set to Draft.
                if (!currentLoadedQuoteId) quoteData.status = "Draft";

                const docRef = await db.collection("quotes").add(quoteData);
                console.log("New quote saved successfully with ID: ", docRef.id);
                alert(`Quote "${quoteNameFromInput}" saved successfully!`);
                currentLoadedQuoteId = docRef.id;
                if(quoteStatusSelector) quoteStatusSelector.value = quoteData.status; // Reflect current status
            }
            fetchAndDisplaySavedQuotes();
        } catch (error) {
            console.error("Error saving/updating quote to Firestore: ", error);
            alert("Error saving quote. Please check the console and try again.");
        } finally {
            hideLoadingOverlay();
        }
    }
    // --- END Firestore Save Quote Function ---

/**
 * Fetch all products from Firestore and populate `allProducts`.
 * Then re‐build brand filters, product dropdown, etc.
 */

function initializeFuse(products) {
  // Make sure Fuse.js is loaded via <script src="https://cdn.jsdelivr.net/npm/fuse.js@6"></script> 
  const options = {
    keys: [
      { name: 'productName', weight: 0.7 },
      { name: 'brand',        weight: 0.2 },
      { name: 'category',     weight: 0.1 }
    ],
    threshold: 0.4,
    distance: 100,
    includeScore: true
  };

  fuseInstance = new Fuse(products, options);
  console.log("Fuse.js initialized with", products.length, "products.");
}



async function fetchProductsFromFirestore() {
  if (!db) {
    console.error("Firestore not initialized");
    dataLoadStatus.textContent = "Error: Firestore not available.";
    return;
  }

  try {
    dataLoadStatus.textContent = "Loading products…";
    const snapshot = await db.collection("products").get();
    allProducts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        productName: data.productName || "",
        productNumber: data.productNumber || "",
        brand: data.brand || "",
        category: data.category || "",
        type: data.type || "",
        costPrice: data.costPrice != null ? data.costPrice : 0,
        msrp: data.msrp != null ? data.msrp : 0,
        map: data.map != null ? data.map : 0,
        description: data.description || "",
        specSheetURL: data.specSheetURL || "",
        imageURL: data.imageURL || ""
      };
    });

    // ← initializeFuse must exist by this point
    initializeFuse(allProducts);

    populateBrandFilterDropdown(allProducts);
    populateProductDropdown(allProducts);
    dataLoadStatus.textContent = `Product data loaded. ${allProducts.length} items found.`;
  } catch (err) {
    console.error("Error fetching products from Firestore:", err);
    dataLoadStatus.textContent = "Error loading products.";
  }
}

    // --- New Quote Function ---
    function startNewQuote() {
        console.log("Starting a new quote...");

        if (projectInfoInput) projectInfoInput.value = '';
        if (productSearchInput) productSearchInput.value = '';
        if (brandFilterDropdown) brandFilterDropdown.value = "";
        if (productDropdown) {
            productDropdown.innerHTML = '<option value="">-- Select a Product --</option>';
            productDropdown.disabled = true;
            productDropdown.value = "";
        }
        if (previewArea) previewArea.innerHTML = '<p>Select an item from the dropdown to see its details here.</p>';
        if (addToQuoteBtn) addToQuoteBtn.disabled = true;

        equipmentQuoteItems = [];

        laborDetails = [
            { id: 'sde', name: 'System Design & Engineering', clientRatePerHour: 150, isClientRateEditable: false, numTechs: 1, numDays: 0.5, assignedTechSlots: [{ techId: 'todd' }], allowSubcontractors: false, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
            { id: 'programming', name: 'Programming', clientRatePerHour: 150, isClientRateEditable: false, numTechs: 1, numDays: 0, assignedTechSlots: [{ techId: 'todd' }], allowSubcontractors: false, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
            { id: 'prewire', name: 'Pre-wire', clientRatePerHour: 100, isClientRateEditable: true, numTechs: 0, numDays: 0, assignedTechSlots: [], allowSubcontractors: true, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
            { id: 'installation', name: 'Installation', clientRatePerHour: 100, isClientRateEditable: true, numTechs: 3, numDays: 1, assignedTechSlots: [{ techId: 'austin' }, { techId: 'john' }, { techId: 'joe' }], allowSubcontractors: true, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 }
        ];
        renderLaborSection();

        if (discountPercentInput) discountPercentInput.value = "0";
        if (shippingPercentInput) shippingPercentInput.value = "5";
        if (salesTaxPercentInput) salesTaxPercentInput.value = "8";
        if (quoteStatusSelector) quoteStatusSelector.value = "Draft";

        initializeSowOutputArea();
        if (sowAiPromptTextEl) sowAiPromptTextEl.value = '';

        currentLoadedQuoteId = null;
        console.log("currentLoadedQuoteId has been reset for a new quote.");

        showView('quoteBuilderView');

        if (addSuccessNotificationEl) {
            addSuccessNotificationEl.classList.remove('visible');
            addSuccessNotificationEl.textContent = '';
        }
        alert("New quote started. All fields have been reset.");
    }
    // --- END New Quote Function ---

    // 3. ALL Function Definitions (Your original utility functions start here)
    function showLoadingOverlay(message = "Processing, please wait...") {
        if (loadingOverlay) {
            loadingOverlay.querySelector('p').textContent = message;
            loadingOverlay.style.display = 'flex';
        }
    }
    function hideLoadingOverlay() {
        setTimeout(() => {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }, 0);
    }

    function cleanPriceValue(priceStr) { if (priceStr == null) return null; if (typeof priceStr === 'number') return priceStr; if (typeof priceStr === 'string') { const cleanedString = String(priceStr).replace(/\$/g, '').replace(/,/g, '').trim(); const number = parseFloat(cleanedString); return isNaN(number) ? null : number; } return null; }
    function formatCurrency(amount) { if (amount == null || isNaN(Number(amount))) return '$0.00'; return `$${Number(amount).toFixed(2)}`; }
    function formatPercentage(value) { if (value == null || isNaN(Number(value))) return '0.00%'; return `${Number(value).toFixed(2)}%`; }
    function sanitizeForFilename(text) { if (!text) return ''; return String(text).replace(/[^a-z0-9_-\s]/gi, '').replace(/\s+/g, '_').substring(0, 50); }
    function parseFormattedCurrency(currencyString) { if (typeof currencyString !== 'string') return 0; return parseFloat(String(currencyString).replace(/\$/g, '').replace(/,/g, '')) || 0; }

    function triggerHighlight(element) {
        if (!element) return;
        element.classList.remove('highlight-update');
        void element.offsetWidth;
        element.classList.add('highlight-update');
        setTimeout(() => {
            if (element) element.classList.remove('highlight-update');
        }, 800);
    }

    function updateFinalActionButtonsState() {
        const hasEquipmentItems = equipmentQuoteItems.length > 0;
        let hasLaborItems = false;
        laborDetails.forEach(l => {
            if (((l.numTechs || 0) > 0 && (l.numDays || 0) > 0) || ((l.numSubcontractors || 0) > 0 && (l.numDays || 0) > 0)) {
                hasLaborItems = true;
            }
        });
        const canTakeAction = hasEquipmentItems || hasLaborItems;

        if(printQuoteBtn) printQuoteBtn.disabled = !canTakeAction;
        if(downloadPdfBtn) downloadPdfBtn.disabled = !canTakeAction;
        if(saveQuoteBtn) saveQuoteBtn.disabled = !canTakeAction;
        if(updateStatusBtn) updateStatusBtn.disabled = !currentLoadedQuoteId; // Only enable if a quote is loaded

        let sowHasContent = false;
        if (typeof tinymce !== 'undefined' && tinymce.get && tinymce.get('sowFullOutputText') && tinymce.get('sowFullOutputText').initialized) {
            const textContent = tinymce.get('sowFullOutputText').getContent({ format: 'text' });
            if (textContent.trim() !== "") {
                sowHasContent = true;
            }
        } else if (sowFullOutputTextEl) {
            if (sowFullOutputTextEl.value.trim() !== "" &&
                (!sowFullOutputTextEl.placeholder || sowFullOutputTextEl.value.trim() !== sowFullOutputTextEl.placeholder.trim())) {
                sowHasContent = true;
            }
        }
        if(downloadSowPdfBtn) downloadSowPdfBtn.disabled = !sowHasContent;

        // Corrected logic for AI Draft Button: Enable if sowAiPromptTextEl has content
        if (draftFullSowWithAiBtnEl) {
            if (sowAiPromptTextEl && sowAiPromptTextEl.value.trim() !== "") {
                draftFullSowWithAiBtnEl.disabled = false;
            } else {
                draftFullSowWithAiBtnEl.disabled = true;
            }
        }

        const hasSpecSheets = equipmentQuoteItems.some(item => item.specSheetURL && item.specSheetURL.trim() !== '');
        if(viewSpecSheetsBtn) viewSpecSheetsBtn.disabled = !hasSpecSheets;
    }

    function calculateAndRenderGrandTotals() {
        const equipClientTotal = parseFormattedCurrency(summarySellTotalEl ? summarySellTotalEl.textContent : '0');
        const equipCompanyCost = parseFormattedCurrency(summaryCostTotalEl ? summaryCostTotalEl.textContent : '0');
        const laborClientTotal = parseFormattedCurrency(laborSummarySellTotalEl ? laborSummarySellTotalEl.textContent : '0');
        const laborCompanyCost = parseFormattedCurrency(laborSummaryCostTotalEl ? laborSummaryCostTotalEl.textContent : '0');
        const combinedSubtotal = equipClientTotal + laborClientTotal;
        const discountPerc = (discountPercentInput && typeof discountPercentInput.value !== 'undefined') ? parseFloat(discountPercentInput.value) || 0 : 0;
        const shippingPerc = (shippingPercentInput && typeof shippingPercentInput.value !== 'undefined') ? parseFloat(shippingPercentInput.value) || 0 : 0;
        const salesTaxPerc = (salesTaxPercentInput && typeof salesTaxPercentInput.value !== 'undefined') ? parseFloat(salesTaxPercentInput.value) || 0 : 0;

        const discountAmount = combinedSubtotal * (discountPerc / 100);
        const subtotalAfterDiscount = combinedSubtotal - discountAmount;
        const shippingAmount = equipClientTotal * (shippingPerc / 100);
        const salesTaxAmount = subtotalAfterDiscount * (salesTaxPerc / 100);
        const finalClientTotal = subtotalAfterDiscount + shippingAmount + salesTaxAmount;
        const overallCompanyCost = equipCompanyCost + laborCompanyCost;
        const overallProfitAmount = subtotalAfterDiscount - overallCompanyCost;
        const overallGPM = subtotalAfterDiscount > 0 ? (overallProfitAmount / subtotalAfterDiscount) * 100 : 0;

        if(grandEquipmentClientTotalEl) grandEquipmentClientTotalEl.textContent = formatCurrency(equipClientTotal);
        if(grandLaborClientTotalEl) grandLaborClientTotalEl.textContent = formatCurrency(laborClientTotal);
        if(grandCombinedSubtotalEl) grandCombinedSubtotalEl.textContent = formatCurrency(combinedSubtotal);
        if(grandDiscountAmountEl) grandDiscountAmountEl.textContent = formatCurrency(discountAmount);
        if(grandSubtotalAfterDiscountEl) grandSubtotalAfterDiscountEl.textContent = formatCurrency(subtotalAfterDiscount);
        if(grandShippingAmountEl) grandShippingAmountEl.textContent = formatCurrency(shippingAmount);
        if(grandSalesTaxAmountEl) grandSalesTaxAmountEl.textContent = formatCurrency(salesTaxAmount);
        if(finalGrandTotalEl) finalGrandTotalEl.textContent = formatCurrency(finalClientTotal);
        if(grandEquipmentCompanyCostEl) grandEquipmentCompanyCostEl.textContent = formatCurrency(equipCompanyCost);
        if(grandLaborCompanyCostEl) grandLaborCompanyCostEl.textContent = formatCurrency(laborCompanyCost);
        if(grandOverallCompanyCostEl) grandOverallCompanyCostEl.textContent = formatCurrency(overallCompanyCost);
        if(grandOverallProfitAmountEl) grandOverallProfitAmountEl.textContent = formatCurrency(overallProfitAmount);
        if(grandOverallGPMEl) grandOverallGPMEl.textContent = formatPercentage(overallGPM);

        const elementsToHighlight = [
            grandEquipmentClientTotalEl, grandLaborClientTotalEl, grandCombinedSubtotalEl,
            grandDiscountAmountEl, grandSubtotalAfterDiscountEl, grandShippingAmountEl,
            grandSalesTaxAmountEl, finalGrandTotalEl, grandEquipmentCompanyCostEl,
            grandLaborCompanyCostEl, grandOverallCompanyCostEl, grandOverallProfitAmountEl,
            grandOverallGPMEl
        ];
        elementsToHighlight.forEach(el => { if(el) triggerHighlight(el); });

        updateFinalActionButtonsState();
    }

    // --- Drag and Drop Handler Functions for Quote Items ---
    function handleDragStart(e) {
        draggedItem = this;
        draggedItemIndex = parseInt(this.dataset.index, 10);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        setTimeout(() => {
            if (draggedItem) draggedItem.classList.add('dragging');
        }, 0);
    }

    function handleDragEnd(e) {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }
        Array.from(quoteItemsTbody.querySelectorAll('tr')).forEach(row => {
            row.classList.remove('drag-over-target');
        });
        draggedItem = null;
        draggedItemIndex = -1;
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetRow = e.target.closest('tr');
        if (targetRow && targetRow !== draggedItem && targetRow.parentElement === quoteItemsTbody) {
            Array.from(quoteItemsTbody.querySelectorAll('tr.drag-over-target')).forEach(r => {
                if (r !== targetRow) r.classList.remove('drag-over-target');
            });
            targetRow.classList.add('drag-over-target');
        }
    }

    function handleDragEnter(e) {
        e.preventDefault();
        const targetRow = e.target.closest('tr');
         if (targetRow && targetRow !== draggedItem && targetRow.parentElement === quoteItemsTbody) {
            targetRow.classList.add('drag-over-target');
        }
    }

    function handleDragLeave(e) {
        const targetRow = e.target.closest('tr');
        if (targetRow) {
            const relatedTargetIsChild = targetRow.contains(e.relatedTarget);
            if(!relatedTargetIsChild) {
                 targetRow.classList.remove('drag-over-target');
            }
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetRow = e.target.closest('tr');
        if (targetRow && draggedItem && targetRow !== draggedItem && targetRow.parentElement === quoteItemsTbody) {
            const targetIndex = parseInt(targetRow.dataset.index, 10);
            const itemToMove = equipmentQuoteItems.splice(draggedItemIndex, 1)[0];
            if (draggedItemIndex < targetIndex) {
                equipmentQuoteItems.splice(targetIndex, 0, itemToMove);
            } else {
                equipmentQuoteItems.splice(targetIndex, 0, itemToMove);
            }
            renderEquipmentQuote();
        }
        if (targetRow) targetRow.classList.remove('drag-over-target');
    }


    function renderEquipmentQuote() {
        console.log("FN_CALL: renderEquipmentQuote. Items count:", equipmentQuoteItems.length);
        if (!quoteItemsTbody || !emptyQuoteMsg || !quoteItemsTableEl || !document.getElementById('quote-summary') || !summaryCostTotalEl || !summarySellTotalEl || !summaryProfitAmountEl || !summaryGPMEl) { console.error("Equipment quote DOM elements missing."); return; }
        quoteItemsTbody.innerHTML = ''; let totalCompanyCost = 0; let totalClientPrice = 0; const quoteHasItems = equipmentQuoteItems.length > 0;
        emptyQuoteMsg.style.display = quoteHasItems ? 'none' : 'block'; quoteItemsTableEl.style.display = quoteHasItems ? '' : 'none'; document.getElementById('quote-summary').style.display = quoteHasItems ? 'block' : 'none';

        if (quoteHasItems) {
            equipmentQuoteItems.forEach((item, index) => {
                const row = quoteItemsTbody.insertRow();
                row.dataset.quoteItemId = item.quoteItemId;
                row.dataset.index = index;
                row.draggable = true;

                row.addEventListener('dragstart', handleDragStart);
                row.addEventListener('dragend', handleDragEnd);

                const itemCostPrice = item.costPrice != null ? item.costPrice : 0; let itemSellPrice = item.sellPrice != null ? item.sellPrice : 0; if (itemSellPrice < 0) itemSellPrice = 0;
                const itemQuantity = item.quantity != null ? item.quantity : 0; const lineItemCompanyCost = itemCostPrice * itemQuantity; const lineItemClientPrice = itemSellPrice * itemQuantity;
                totalCompanyCost += lineItemCompanyCost; totalClientPrice += lineItemClientPrice;

                const imageCell = row.insertCell(); imageCell.classList.add('col-image'); const displayImageUrl = (item.imageURL && item.imageURL.trim() !== '') ? item.imageURL : PLACEHOLDER_IMAGE_URL;
                imageCell.innerHTML = `<img src="${displayImageUrl}" alt="${item.productName ? item.productName.substring(0,10) : 'img'}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE_URL}';">`;
                row.insertCell().textContent = item.productName || 'N/A'; row.insertCell().textContent = item.productNumber || 'N/A';
                const descCell = row.insertCell(); descCell.textContent = item.description || 'N/A'; descCell.title = item.description || ''; row.insertCell().textContent = formatCurrency(itemCostPrice);
                const markupInput = document.createElement('input'); markupInput.type = 'number'; markupInput.className = 'editable-field'; markupInput.value = Number(item.markupPercentage).toFixed(2); markupInput.step = "0.01"; markupInput.onchange = (e) => updateEquipmentQuoteItem(item.quoteItemId, 'markupPercentage', e.target.value); row.insertCell().appendChild(markupInput);
                row.insertCell().textContent = formatCurrency(item.msrp);
                const sellPriceInput = document.createElement('input'); sellPriceInput.type = 'number'; sellPriceInput.className = 'editable-field'; sellPriceInput.value = Number(itemSellPrice).toFixed(2); sellPriceInput.step = "0.01"; sellPriceInput.min = "0"; sellPriceInput.onchange = (e) => updateEquipmentQuoteItem(item.quoteItemId, 'sellPrice', e.target.value); row.insertCell().appendChild(sellPriceInput);
                const qtyInput = document.createElement('input'); qtyInput.type = 'number'; qtyInput.className = 'editable-field qty-input'; qtyInput.value = itemQuantity; qtyInput.min = "0"; qtyInput.onchange = (e) => updateEquipmentQuoteItem(item.quoteItemId, 'quantity', e.target.value); row.insertCell().appendChild(qtyInput);

                const lineTotalCell = row.insertCell();
                lineTotalCell.textContent = formatCurrency(lineItemClientPrice);
                if (lineTotalCell) triggerHighlight(lineTotalCell);

                const removeButton = document.createElement('button'); removeButton.textContent = 'Remove'; removeButton.classList.add('action-button'); removeButton.onclick = () => removeEquipmentQuoteItem(item.quoteItemId); row.insertCell().appendChild(removeButton);
            });
        }
        summaryCostTotalEl.textContent = formatCurrency(totalCompanyCost);
        summarySellTotalEl.textContent = formatCurrency(totalClientPrice);
        const totalProfitAmount = totalClientPrice - totalCompanyCost;
        summaryProfitAmountEl.textContent = formatCurrency(totalProfitAmount);
        const overallGPM = totalClientPrice > 0 ? (totalProfitAmount / totalClientPrice) * 100 : 0;
        summaryGPMEl.textContent = formatPercentage(overallGPM);

        if (summaryCostTotalEl) triggerHighlight(summaryCostTotalEl);
        if (summarySellTotalEl) triggerHighlight(summarySellTotalEl);
        if (summaryProfitAmountEl) triggerHighlight(summaryProfitAmountEl);
        if (summaryGPMEl) triggerHighlight(summaryGPMEl);

        calculateAndRenderGrandTotals();
    }

    function calculateAndRenderLaborSummary() {
        let overallLaborCompanyCost = 0; let overallLaborClientPrice = 0; let overallLaborManHours = 0;
        laborDetails.forEach(lc => {
            overallLaborCompanyCost += lc.totalCompanyCost || 0;
            overallLaborClientPrice += lc.totalClientCost || 0;
            overallLaborManHours += lc.totalManHours || 0;
        });
        const laborProfitAmount = overallLaborClientPrice - overallLaborCompanyCost;
        const laborGPM = overallLaborClientPrice > 0 ? (laborProfitAmount / overallLaborClientPrice) * 100 : 0;

        if(laborSummaryManHoursEl) laborSummaryManHoursEl.textContent = overallLaborManHours.toFixed(1);
        if(laborSummaryCostTotalEl) laborSummaryCostTotalEl.textContent = formatCurrency(overallLaborCompanyCost);
        if(laborSummarySellTotalEl) laborSummarySellTotalEl.textContent = formatCurrency(overallLaborClientPrice);
        if(laborSummaryProfitAmountEl) laborSummaryProfitAmountEl.textContent = formatCurrency(laborProfitAmount);
        if(laborSummaryGPMEl) laborSummaryGPMEl.textContent = formatPercentage(laborGPM);

        if (laborSummaryManHoursEl) triggerHighlight(laborSummaryManHoursEl);
        if (laborSummaryCostTotalEl) triggerHighlight(laborSummaryCostTotalEl);
        if (laborSummarySellTotalEl) triggerHighlight(laborSummarySellTotalEl);
        if (laborSummaryProfitAmountEl) triggerHighlight(laborSummaryProfitAmountEl);
        if (laborSummaryGPMEl) triggerHighlight(laborSummaryGPMEl);

        calculateAndRenderGrandTotals();
    }

    function calculateLaborCategory(laborCategory) {
        const numDays = parseFloat(laborCategory.numDays) || 0;
        const numInternalTechs = parseInt(laborCategory.numTechs, 10) || 0;
        const numSubs = parseInt(laborCategory.numSubcontractors, 10) || 0;

        laborCategory.totalManHours = (numInternalTechs * numDays * HOURS_PER_DAY) + (numSubs * numDays * HOURS_PER_DAY);
        laborCategory.totalClientCost = laborCategory.totalManHours * (laborCategory.clientRatePerHour || 0);

        let companyCostForCategory = 0;
        if (numInternalTechs > 0 && numDays > 0) {
            laborCategory.assignedTechSlots.slice(0, numInternalTechs).forEach(slot => {
                 if (slot && slot.techId && slot.techId !== 'unassigned') {
                    const tech = technicians.find(t => t.id === slot.techId);
                    if (tech && tech.rate) {
                        companyCostForCategory += tech.rate * numDays * HOURS_PER_DAY;
                    }
                }
            });
        }
        if (numSubs > 0 && numDays > 0 && laborCategory.assignedSubcontractors) {
            laborCategory.assignedSubcontractors.slice(0, numSubs).forEach(subSlot => {
                if (subSlot && subSlot.subcontractorId && subSlot.subcontractorId !== 'none') {
                    if (subSlot.dailyRate) {
                         companyCostForCategory += subSlot.dailyRate * numDays;
                    } else {
                        const sub = subcontractors.find(s => s.id === subSlot.subcontractorId);
                        if (sub && sub.dailyRate) {
                            companyCostForCategory += sub.dailyRate * numDays;
                        }
                    }
                }
            });
        }
        laborCategory.totalCompanyCost = companyCostForCategory;

        const manHoursEl = document.getElementById(`manHours-${laborCategory.id}`);
        const clientCostEl = document.getElementById(`clientCost-${laborCategory.id}`);
        const companyCostEl = document.getElementById(`companyCost-${laborCategory.id}`);

        if(manHoursEl) { manHoursEl.textContent = laborCategory.totalManHours.toFixed(1); triggerHighlight(manHoursEl); }
        if(clientCostEl) { clientCostEl.textContent = formatCurrency(laborCategory.totalClientCost); triggerHighlight(clientCostEl); }
        if(companyCostEl) { companyCostEl.textContent = formatCurrency(laborCategory.totalCompanyCost); triggerHighlight(companyCostEl); }
    }

    function calculateAllLabor() {
        laborDetails.forEach(calculateLaborCategory);
        calculateAndRenderLaborSummary();
    }

    function renderTechAssignmentSlots(laborCategory) {
        const assignmentArea = document.getElementById(`tech-assignment-${laborCategory.id}`);
        if (!assignmentArea) { console.error(`Tech assignment area not found for ${laborCategory.id}`); return; }
        assignmentArea.innerHTML = '';
        if (laborCategory.numTechs > 0 && laborCategory.numDays > 0) {
            const heading = document.createElement('h5');
            heading.textContent = 'Assign Internal Technicians:';
            assignmentArea.appendChild(heading);
            for (let i = 0; i < laborCategory.numTechs; i++) {
                const slotDiv = document.createElement('div'); slotDiv.className = 'tech-slot';
                const label = document.createElement('label'); label.setAttribute('for', `tech-select-${laborCategory.id}-${i}`); label.textContent = `Tech ${i + 1}:`; slotDiv.appendChild(label);
                const select = document.createElement('select'); select.id = `tech-select-${laborCategory.id}-${i}`; select.dataset.laborId = laborCategory.id; select.dataset.slotIndex = i; select.className = 'labor-tech-select';
                if (!laborCategory.assignedTechSlots[i]) {
                    laborCategory.assignedTechSlots[i] = { techId: 'unassigned' };
                }
                technicians.forEach(tech => { const option = document.createElement('option'); option.value = tech.id; option.textContent = tech.name; if (laborCategory.assignedTechSlots[i].techId === tech.id) option.selected = true; select.appendChild(option); });
                select.removeEventListener('change', handleTechAssignmentChange);
                select.addEventListener('change', handleTechAssignmentChange);
                slotDiv.appendChild(select);
                assignmentArea.appendChild(slotDiv);
            }
        }
    }

    function renderSubcontractorAssignmentSlots(laborCategory) {
        const assignmentArea = document.getElementById(`subcontractor-assignment-${laborCategory.id}`);
        if (!assignmentArea) { console.error(`Subcontractor assignment area not found for ${laborCategory.id}`); return; }
        assignmentArea.innerHTML = '';
        if (laborCategory.numSubcontractors > 0 && laborCategory.numDays > 0) {
            const heading = document.createElement('h5');
            heading.textContent = 'Assign Subcontractors:';
            assignmentArea.appendChild(heading);
            for (let i = 0; i < laborCategory.numSubcontractors; i++) {
                const slotDiv = document.createElement('div'); slotDiv.className = 'subcontractor-slot';
                const label = document.createElement('label'); label.setAttribute('for', `sub-select-${laborCategory.id}-${i}`); label.textContent = `Sub ${i + 1}:`; slotDiv.appendChild(label);
                const select = document.createElement('select'); select.id = `sub-select-${laborCategory.id}-${i}`; select.dataset.laborId = laborCategory.id; select.dataset.slotIndex = i; select.className = 'labor-subcontractor-select';

                if (!laborCategory.assignedSubcontractors[i]) {
                    laborCategory.assignedSubcontractors[i] = { subcontractorId: 'none', dailyRate: 0 };
                }

                subcontractors.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = `${sub.name} (${formatCurrency(sub.dailyRate)}/day)`;
                    if (laborCategory.assignedSubcontractors[i].subcontractorId === sub.id) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
                select.removeEventListener('change', handleSubcontractorAssignmentChange);
                select.addEventListener('change', handleSubcontractorAssignmentChange);
                slotDiv.appendChild(select);
                assignmentArea.appendChild(slotDiv);
            }
        }
    }

    function handleLaborInputChange(event) {
        const laborId = event.target.dataset.laborId;
        const laborCategory = laborDetails.find(l => l.id === laborId);
        if (!laborCategory) return;

        const targetClassList = event.target.classList;
        let value;

        if (targetClassList.contains('labor-num-techs') || targetClassList.contains('labor-num-subcontractors')) {
            value = parseInt(event.target.value, 10);
            value = isNaN(value) || value < 0 ? 0 : Math.round(value);
        } else {
            value = parseFloat(event.target.value);
            value = isNaN(value) || value < 0 ? 0 : value;
        }

        if (targetClassList.contains('labor-num-techs')) {
            laborCategory.numTechs = value;
            const currentAssignments = (laborCategory.assignedTechSlots || []).slice(0, laborCategory.numTechs);
            while (currentAssignments.length < laborCategory.numTechs) {
                currentAssignments.push({ techId: 'unassigned' });
            }
            laborCategory.assignedTechSlots = currentAssignments;
            renderTechAssignmentSlots(laborCategory);
        } else if (targetClassList.contains('labor-num-subcontractors')) {
            laborCategory.numSubcontractors = value;
            const currentSubAssignments = (laborCategory.assignedSubcontractors || []).slice(0, laborCategory.numSubcontractors);
            while (currentSubAssignments.length < laborCategory.numSubcontractors) {
                currentSubAssignments.push({ subcontractorId: 'none', dailyRate: 0 });
            }
            laborCategory.assignedSubcontractors = currentSubAssignments;
            renderSubcontractorAssignmentSlots(laborCategory);
        } else if (targetClassList.contains('labor-num-days')) {
            laborCategory.numDays = value;
            renderTechAssignmentSlots(laborCategory);
            if(laborCategory.allowSubcontractors) renderSubcontractorAssignmentSlots(laborCategory);
        } else if (targetClassList.contains('labor-client-rate')) {
            laborCategory.clientRatePerHour = value;
        }

        calculateLaborCategory(laborCategory);
        calculateAndRenderLaborSummary();
    }

    function handleTechAssignmentChange(event) {
        const laborId = event.target.dataset.laborId;
        const slotIndex = parseInt(event.target.dataset.slotIndex, 10);
        const selectedTechId = event.target.value;
        const laborCategory = laborDetails.find(l => l.id === laborId);

        if (!laborCategory || !laborCategory.assignedTechSlots || slotIndex >= laborCategory.assignedTechSlots.length) {
            if (laborCategory && laborCategory.numTechs > (laborCategory.assignedTechSlots || []).length) {
                 while ((laborCategory.assignedTechSlots || []).length <= slotIndex) {
                    laborCategory.assignedTechSlots.push({ techId: 'unassigned' });
                 }
            } else {
                console.warn("Error in handleTechAssignmentChange: Invalid labor category or slot index", laborCategory, slotIndex);
                return;
            }
        }
        laborCategory.assignedTechSlots[slotIndex].techId = selectedTechId;

        calculateLaborCategory(laborCategory);
        calculateAndRenderLaborSummary();
    }

    function handleSubcontractorAssignmentChange(event) {
        const laborId = event.target.dataset.laborId;
        const slotIndex = parseInt(event.target.dataset.slotIndex, 10);
        const selectedSubId = event.target.value;
        const laborCategory = laborDetails.find(l => l.id === laborId);

        if (!laborCategory || !laborCategory.assignedSubcontractors || slotIndex >= laborCategory.assignedSubcontractors.length) {
             if (laborCategory && laborCategory.numSubcontractors > (laborCategory.assignedSubcontractors || []).length) {
                 while ((laborCategory.assignedSubcontractors || []).length <= slotIndex) {
                    laborCategory.assignedSubcontractors.push({ subcontractorId: 'none', dailyRate: 0 });
                 }
            } else {
                console.warn("Error in handleSubcontractorAssignmentChange: Invalid labor category or slot index", laborCategory, slotIndex);
                return;
            }
        }

        const selectedSubcontractor = subcontractors.find(s => s.id === selectedSubId);
        if (selectedSubcontractor) {
            laborCategory.assignedSubcontractors[slotIndex] = {
                subcontractorId: selectedSubId,
                dailyRate: selectedSubcontractor.dailyRate
            };
        } else {
            laborCategory.assignedSubcontractors[slotIndex] = { subcontractorId: 'none', dailyRate: 0 };
        }

        calculateLaborCategory(laborCategory);
        calculateAndRenderLaborSummary();
    }


    function renderLaborSection() {
        console.log("FN_CALL: renderLaborSection. Labor details:", JSON.stringify(laborDetails));
        if (!laborItemsContainer) { console.error("Labor items container not found."); return; }
        laborItemsContainer.innerHTML = '';
        laborDetails.forEach(laborCategory => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'labor-item';
            itemDiv.dataset.laborId = laborCategory.id;

            let clientRateInputHTML = laborCategory.isClientRateEditable ?
                `<input type="number" class="editable-field labor-client-rate" value="${Number(laborCategory.clientRatePerHour).toFixed(2)}" step="0.01" min="0" data-labor-id="${laborCategory.id}">` :
                `<span class="client-rate-display">${formatCurrency(laborCategory.clientRatePerHour)}/hr</span>`;

            let subcontractorNumInputHTML = '';
            if (laborCategory.allowSubcontractors) {
                subcontractorNumInputHTML = `
                    <div class="labor-input-group">
                        <label for="numSubcontractors-${laborCategory.id}">Number of Subcontractors:</label>
                        <input type="number" id="numSubcontractors-${laborCategory.id}" class="labor-num-subcontractors editable-field" value="${laborCategory.numSubcontractors || 0}" min="0" data-labor-id="${laborCategory.id}">
                    </div>`;
            }

            itemDiv.innerHTML = `
                <h4>${laborCategory.name}</h4>
                <div class="labor-inputs-grid">
                    <div class="labor-input-group">
                        <label for="numTechs-${laborCategory.id}">Internal Technicians:</label>
                        <input type="number" id="numTechs-${laborCategory.id}" class="labor-num-techs editable-field" value="${laborCategory.numTechs}" min="0" data-labor-id="${laborCategory.id}">
                    </div>
                    ${subcontractorNumInputHTML}
                    <div class="labor-input-group">
                        <label for="numDays-${laborCategory.id}">Number of Days (all personnel):</label>
                        <input type="number" id="numDays-${laborCategory.id}" class="labor-num-days editable-field" value="${laborCategory.numDays}" min="0" step="0.1" data-labor-id="${laborCategory.id}">
                    </div>
                    <div class="labor-input-group">
                        <label for="clientRate-${laborCategory.id}">Client Rate (per Man-Hour):</label>
                        ${clientRateInputHTML}
                    </div>
                </div>
                <div class="tech-assignment-area" id="tech-assignment-${laborCategory.id}"></div>
                ${laborCategory.allowSubcontractors ? `<div class="subcontractor-assignment-area" id="subcontractor-assignment-${laborCategory.id}"></div>` : ''}
                <div class="labor-item-summary">
                    <p>Total Man-Hours: <strong id="manHours-${laborCategory.id}">0.0</strong></p>
                    <p>Total Client Cost: <strong id="clientCost-${laborCategory.id}">${formatCurrency(0)}</strong></p>
                    <p>Total Company Cost: <strong id="companyCost-${laborCategory.id}">${formatCurrency(0)}</strong></p>
                </div>`;
            laborItemsContainer.appendChild(itemDiv);
            renderTechAssignmentSlots(laborCategory);
            if (laborCategory.allowSubcontractors) {
                renderSubcontractorAssignmentSlots(laborCategory);
            }
        });

        document.querySelectorAll('.labor-num-techs, .labor-num-days, .labor-client-rate, .labor-num-subcontractors').forEach(input => {
            if (input) {
                input.removeEventListener('change', handleLaborInputChange);
                input.addEventListener('change', handleLaborInputChange);
            }
        });
        calculateAllLabor();
    }

    function showView(viewIdToShow) {
        console.log("FN_CALL: showView - Attempting to switch to view:", viewIdToShow);
        const currentViewsArray = [quoteBuilderView, sowView];
        const currentNavButtonsArray = [navigateToQuoteBuilderBtn, navigateToSowBtn];

        currentViewsArray.forEach(view => { if (view) { view.style.display = 'none'; view.classList.remove('active-view'); } });
        currentNavButtonsArray.forEach(button => { if (button) button.classList.remove('active'); });

        const activeViewToShow = document.getElementById(viewIdToShow);
        if (activeViewToShow) {
            activeViewToShow.style.display = 'block';
            activeViewToShow.classList.add('active-view');
            console.log("Successfully switched to view:", viewIdToShow);
        } else { console.error("View to show (div with id='" + viewIdToShow + "') not found in DOM."); }

        if (downloadSowPdfBtn) { downloadSowPdfBtn.style.display = (viewIdToShow === 'sowView') ? 'inline-block' : 'none'; }

        if (viewIdToShow === 'quoteBuilderView') {
            if (navigateToQuoteBuilderBtn) navigateToQuoteBuilderBtn.classList.add('active');
        } else if (viewIdToShow === 'sowView') {
            if (navigateToSowBtn) navigateToSowBtn.classList.add('active');
            if (sowProjectInfoDisplaySpan && projectInfoInput) {
                sowProjectInfoDisplaySpan.textContent = projectInfoInput.value.trim() || 'Not Specified';
            }
        }
        currentView = viewIdToShow;
        updateFinalActionButtonsState();
    }

    function initializeSowOutputArea() {
        console.log("FN_CALL: initializeSowOutputArea - Clearing SOW output area.");
        if (typeof tinymce !== 'undefined' && tinymce.get && tinymce.get('sowFullOutputText') && tinymce.get('sowFullOutputText').initialized) {
            tinymce.get('sowFullOutputText').setContent('');
        } else if (sowFullOutputTextEl) {
            sowFullOutputTextEl.value = "";
            sowFullOutputTextEl.placeholder = "AI-generated SOW will appear here...";
        }
        updateFinalActionButtonsState();
    }

    
    function populateBrandFilterDropdown(products) {
  if (!brandFilterDropdown) return;
  const brands = Array.from(new Set(products.map(p => p.brand).filter(b => b))).sort();
  brandFilterDropdown.innerHTML = '<option value="">All Brands</option>';
  brands.forEach(brand => {
    const opt = document.createElement("option");
    opt.value = brand;
    opt.textContent = brand;
    brandFilterDropdown.appendChild(opt);
  });
}

 function filterProducts() {
  let filtered = allProducts.slice();

  // 1) Filter by brand if selectedBrand is non‐empty
  if (selectedBrand) {
    filtered = filtered.filter(p => p.brand === selectedBrand);
  }

  // 2) Filter by type if selectedType is non‐empty
  if (selectedType) {
    filtered = filtered.filter(p => p.type === selectedType);
  }

  // 3) Full‐text search via Fuse.js if productSearchTerm is non‐empty
  if (productSearchTerm && fuseInstance) {
    const results = fuseInstance.search(productSearchTerm);
    filtered = results.map(r => r.item);
  }

  return filtered;
}


    function handleProductSelectForPreview() {
        console.log("FN_CALL: handleProductSelectForPreview called.");
        if (!productDropdown || !previewArea) {
            console.error("handleProductSelectForPreview: productDropdown or previewArea is null.");
            return;
        }
        const selectedProductId = productDropdown.value;
        console.log("Selected Product ID:", selectedProductId);

        if (!selectedProductId) {
            previewArea.innerHTML = '<p>Select an item from the dropdown to see its details here.</p>';
            if(addToQuoteBtn) addToQuoteBtn.disabled = true;
            currentSelectedProductForPreview = null;
            return;
        }
        currentSelectedProductForPreview = allProducts.find(p => p.id === selectedProductId);
        console.log("Found product for preview:", currentSelectedProductForPreview);

        if (currentSelectedProductForPreview) {
            const imageUrl = currentSelectedProductForPreview.imageURL && currentSelectedProductForPreview.imageURL.trim() !== '' ? currentSelectedProductForPreview.imageURL : PLACEHOLDER_IMAGE_URL;
            previewArea.innerHTML = `<h3>${currentSelectedProductForPreview.productName}</h3> <img src="${imageUrl}" alt="${currentSelectedProductForPreview.productName}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE_URL}';"> <p><strong>P/N:</strong> ${currentSelectedProductForPreview.productNumber || 'N/A'}</p> <p><strong>Brand:</strong> ${currentSelectedProductForPreview.brand || 'N/A'}</p> <p><strong>Category:</strong> ${currentSelectedProductForPreview.category || 'N/A'}</p> <p><strong>Type:</strong> ${currentSelectedProductForPreview.type || 'N/A'}</p> <p><strong>Description:</strong> ${currentSelectedProductForPreview.description || 'N/A'}</p> <p><strong>Cost:</strong> ${formatCurrency(currentSelectedProductForPreview.costPrice)}</p> <p><strong>MSRP:</strong> ${formatCurrency(currentSelectedProductForPreview.msrp)}</p> <p><strong>MAP:</strong> ${formatCurrency(currentSelectedProductForPreview.map)}</p> ${currentSelectedProductForPreview.specSheetURL ? `<p><a href="${currentSelectedProductForPreview.specSheetURL}" target="_blank">View Spec Sheet</a></p>` : ''}`;
            if(addToQuoteBtn) addToQuoteBtn.disabled = false;
        } else {
            previewArea.innerHTML = '<p>Product details not found, or selection cleared.</p>';
            if(addToQuoteBtn) addToQuoteBtn.disabled = true;
            currentSelectedProductForPreview = null;
        }
    }

    function addProductToEquipmentQuote() {
        if (!currentSelectedProductForPreview) {
            alert("Please select a product from the dropdown first.");
            return;
        }

        const originalButtonText = addToQuoteBtn ? addToQuoteBtn.textContent : "Add to Quote";
        if (addToQuoteBtn) {
            addToQuoteBtn.disabled = true;
            addToQuoteBtn.textContent = "Adding...";
        }

        const productNameForNotification = currentSelectedProductForPreview.productName;
        let itemExisted = false;
        const imageToStore = currentSelectedProductForPreview.imageURL && currentSelectedProductForPreview.imageURL.trim() !== '' ? currentSelectedProductForPreview.imageURL : PLACEHOLDER_IMAGE_URL;
        const existingItemIndex = equipmentQuoteItems.findIndex(item => item.masterId === currentSelectedProductForPreview.id);

        if (existingItemIndex > -1) {
            equipmentQuoteItems[existingItemIndex].quantity = Math.max(0, (equipmentQuoteItems[existingItemIndex].quantity || 0) + 1); itemExisted = true;
        } else {
            const costPrice = currentSelectedProductForPreview.costPrice != null ? currentSelectedProductForPreview.costPrice : 0;
            const sellPrice = currentSelectedProductForPreview.msrp != null ? currentSelectedProductForPreview.msrp : costPrice;
            let markupPercentage = 0; if (costPrice > 0) markupPercentage = ((sellPrice - costPrice) / costPrice) * 100; else if (sellPrice > 0) markupPercentage = 100.00; else markupPercentage = 0;
            equipmentQuoteItems.push({
                quoteItemId: `qitem-${Date.now()}-${Math.random().toString(16).slice(2)}`, masterId: currentSelectedProductForPreview.id, productName: currentSelectedProductForPreview.productName,
                productNumber: currentSelectedProductForPreview.productNumber, brand: currentSelectedProductForPreview.brand, description: currentSelectedProductForPreview.description,
                imageURL: imageToStore, specSheetURL: currentSelectedProductForPreview.specSheetURL, costPrice: costPrice, msrp: currentSelectedProductForPreview.msrp != null ? currentSelectedProductForPreview.msrp : 0,
                sellPrice: sellPrice, quantity: 1, markupPercentage: markupPercentage,
            });
        }

        renderEquipmentQuote();

        if (addSuccessNotificationEl) {
            const message = itemExisted ? `${productNameForNotification} quantity updated.` : `${productNameForNotification} added to quote.`;
            addSuccessNotificationEl.textContent = message; addSuccessNotificationEl.classList.add('visible');
            if (notificationTimeoutId) clearTimeout(notificationTimeoutId);
            notificationTimeoutId = setTimeout(() => {
                addSuccessNotificationEl.classList.remove('visible');
                setTimeout(() => {
                    if (!addSuccessNotificationEl.classList.contains('visible')) addSuccessNotificationEl.textContent = '';
                }, 300);
            }, 3000);
        }

        if(productDropdown) productDropdown.value = "";
        handleProductSelectForPreview();

        if (addToQuoteBtn) {
            addToQuoteBtn.textContent = originalButtonText;
        }
    }

    function updateEquipmentQuoteItem(quoteItemId, fieldToUpdate, newValue) {
        const item = equipmentQuoteItems.find(i => i.quoteItemId === quoteItemId); if (!item) return;
        const parsedValue = parseFloat(newValue); const costPrice = item.costPrice != null ? item.costPrice : 0;
        if (fieldToUpdate === 'quantity') item.quantity = isNaN(parsedValue) || parsedValue < 0 ? 0 : Math.round(parsedValue);
        else if (fieldToUpdate === 'sellPrice') { item.sellPrice = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue; if (costPrice > 0) item.markupPercentage = ((item.sellPrice - costPrice) / costPrice) * 100; else if (item.sellPrice > 0) item.markupPercentage = 100.00; else item.markupPercentage = 0; }
        else if (fieldToUpdate === 'markupPercentage') { item.markupPercentage = isNaN(parsedValue) ? 0 : parsedValue; item.sellPrice = Math.max(0, costPrice * (1 + item.markupPercentage / 100)); }
        renderEquipmentQuote();
    }
    function removeEquipmentQuoteItem(quoteItemId) {
        equipmentQuoteItems = equipmentQuoteItems.filter(item => item.quoteItemId !== quoteItemId); renderEquipmentQuote();
    }

    function handlePrintQuote() {
        console.log("FN_CALL: handlePrintQuote");
        if (equipmentQuoteItems.length === 0 && !laborDetails.some(l => (l.numTechs || 0) > 0 && (l.numDays || 0) > 0)) {
            alert("Quote is empty. Add equipment or labor to print."); return;
        }
        calculateAndRenderGrandTotals(); window.print();
    }

    async function handleDownloadCustomerQuotePDF() {
        console.log("FN_CALL: handleDownloadCustomerQuotePDF");
        if (!downloadPdfBtn) { console.error("Download Quote PDF button not found."); return; }

        if (equipmentQuoteItems.length === 0 && !laborDetails.some(l => (l.totalClientCost || 0) > 0)) {
            alert("Quote is empty. Add equipment or labor to download PDF.");
            return;
        }

        showLoadingOverlay("Generating Customer Quote PDF...");
        if(downloadPdfBtn) downloadPdfBtn.disabled = true;

        try {
            calculateAndRenderGrandTotals();

            if (!window.jspdf || !window.jspdf.jsPDF) {
                alert("Error: PDF generation library (jsPDF) not loaded.");
                console.error("jsPDF library not found.");
                throw new Error("PDF library not loaded.");
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
            const autoTable = typeof doc.autoTable === 'function' ? doc.autoTable.bind(doc) :
                              (window.jspdf.plugin && typeof window.jspdf.plugin.autotable === 'function' ? window.jspdf.plugin.autotable.bind(doc) : null);

            if (!autoTable) {
                alert("Error: jsPDF-AutoTable plugin not loaded. Cannot generate table in PDF.");
                console.error("jsPDF-AutoTable not found.");
                throw new Error("jsPDF-AutoTable not loaded.");
            }

            const today = new Date();
            const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
            const projectInfo = projectInfoInput ? projectInfoInput.value.trim() : "N/A";
            let currentY = 15;
            const leftMargin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            const usableWidth = pageWidth - (2 * leftMargin);

            doc.setFontSize(18); doc.setFont("helvetica", 'bold');
            doc.text("Clearpoint Technology & Design - Quote", pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;
            doc.setFontSize(10); doc.setFont("helvetica", 'normal');
            doc.text(`Date: ${dateStr}`, leftMargin, currentY);
            if (projectInfo && projectInfo !== "N/A") {
                doc.text(`Project: ${projectInfo}`, pageWidth / 2, currentY, { align: 'center' });
            }
            currentY += 10;

            if (equipmentQuoteItems.length > 0) {
                if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.setFontSize(12); doc.setFont("helvetica", 'bold');
                doc.text("Equipment", leftMargin, currentY); currentY += 7;
                doc.setFontSize(9); doc.setFont("helvetica", 'normal');

                const headEqCustomer = [['Image', 'Product Name', 'Description', 'Qty', 'Unit Price', 'Line Total']];
                const bodyEqCustomer = equipmentQuoteItems.map(item => {
                    const imageUrlText = (item.imageURL && item.imageURL.trim() !== '' && item.imageURL !== PLACEHOLDER_IMAGE_URL) ? 'Image' : (item.imageURL === PLACEHOLDER_IMAGE_URL ? 'Logo' : 'N/A');
                    return [ imageUrlText, item.productName || 'N/A', item.description || 'N/A', item.quantity || 0, formatCurrency(item.sellPrice), formatCurrency((item.sellPrice || 0) * (item.quantity || 0)) ];
                });
                autoTable({ startY: currentY, head: headEqCustomer, body: bodyEqCustomer, theme: 'grid', headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold', font: 'helvetica' }, styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak', font: 'helvetica' },
                    columnStyles: { 0: { cellWidth: 15, halign: 'center', minCellHeight: 10 }, 1: { cellWidth: 45 }, 2: { cellWidth: usableWidth - 15 - 45 - 10 - 20 - 25 - 2 }, 3: { cellWidth: 10, halign: 'center' }, 4: { cellWidth: 20, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } },
                    didDrawPage: data => currentY = (typeof data.cursor.y === 'number' ? data.cursor.y +5 : currentY + 5)
                });
                currentY = doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 5 : currentY + 5;
            }

            const activeLaborItems = laborDetails.filter(l => (l.totalClientCost || 0) > 0);
            if (activeLaborItems.length > 0) {
                if (currentY > 250) { doc.addPage(); currentY = 20; }
                doc.setFontSize(12); doc.setFont("helvetica", 'bold');
                doc.text("Labor", leftMargin, currentY); currentY += 7;
                doc.setFontSize(9); doc.setFont("helvetica", 'normal');
                const headLbCustomer = [['Service Type', 'Client Cost']];
                const bodyLbCustomer = activeLaborItems.map(l => [l.name, formatCurrency(l.totalClientCost || 0)]);
                autoTable({ startY: currentY, head: headLbCustomer, body: bodyLbCustomer, theme: 'grid', headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold', font: 'helvetica' }, styles: { fontSize: 8, cellPadding: 1.5, font: 'helvetica' },
                    columnStyles: { 0: { cellWidth: usableWidth - 45 - 2 }, 1: { halign: 'right', cellWidth: 45 } },
                    didDrawPage: data => currentY = (typeof data.cursor.y === 'number' ? data.cursor.y + 5 : currentY + 5)
                });
                currentY = doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 5 : currentY + 5;
            }

            if (currentY > 240) { doc.addPage(); currentY = 20; }
            doc.setFontSize(12); doc.setFont("helvetica", 'bold'); doc.text("Financial Summary", leftMargin, currentY); currentY += 7;
            doc.setFontSize(10); doc.setFont("helvetica", 'normal');

            const summaryLinesCustomer = [
                ["Equipment Subtotal:", grandEquipmentClientTotalEl.textContent],
                ["Labor Subtotal:", grandLaborClientTotalEl.textContent],
                ["Combined Subtotal:", grandCombinedSubtotalEl.textContent]
            ];
            const currentDiscountAmount = parseFormattedCurrency(grandDiscountAmountEl.textContent);
            if (currentDiscountAmount > 0) {
                summaryLinesCustomer.push([`Discount (${discountPercentInput.value}%):`, `-${grandDiscountAmountEl.textContent}`]);
            }
            summaryLinesCustomer.push(["Subtotal After Discount:", grandSubtotalAfterDiscountEl.textContent]);
            const currentShippingAmount = parseFormattedCurrency(grandShippingAmountEl.textContent);
            if (currentShippingAmount > 0 || (shippingPercentInput && parseFloat(shippingPercentInput.value) !== 0)) {
                summaryLinesCustomer.push([`Shipping:`, `+${grandShippingAmountEl.textContent}`]);
            }
            if (parseFormattedCurrency(grandSalesTaxAmountEl.textContent) > 0 || (salesTaxPercentInput && parseFloat(salesTaxPercentInput.value) !== 0)) {
                summaryLinesCustomer.push([`Sales Tax (${salesTaxPercentInput.value}%):`, `+${grandSalesTaxAmountEl.textContent}`]);
            }
            summaryLinesCustomer.push(["FINAL CLIENT TOTAL:", finalGrandTotalEl.textContent]);
            autoTable({ startY: currentY, body: summaryLinesCustomer, theme: 'plain', styles: { fontSize: 9, font: 'helvetica' },
                columnStyles: { 0: { halign: 'right', fontStyle: 'bold', cellWidth: usableWidth - 45 - 2 }, 1: { halign: 'right', cellWidth: 45 } },
                tableWidth: usableWidth, margin: { left: leftMargin }
            });

            const filenameBase = "Clearpoint_Quote_Customer";
            const projectPart = sanitizeForFilename(projectInfo);
            const datePartForFile = `_${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}-${today.getFullYear()}`;
            doc.save(`${filenameBase}${projectPart ? '_' + projectPart : ''}${datePartForFile}.pdf`);
            console.log("Customer Quote PDF .save() called.");

        } catch (error) {
            console.error("Error during Customer Quote PDF generation:", error);
            alert("An error occurred while generating the Customer Quote PDF. Please check the console for details.");
        } finally {
            hideLoadingOverlay();
            if (downloadPdfBtn) {
                setTimeout(() => { downloadPdfBtn.disabled = false; }, 0);
            }
            console.log("Customer Quote PDF generation finished (success or failure).");
        }
    }

   async function handleDownloadSowPDF() {
        console.log("FN_CALL: handleDownloadSowPDF");
        if (!downloadSowPdfBtn) {
            console.error("Download SOW PDF button not found.");
            return;
        }

        let sowContentForPdf = "";
        let hasActualContent = false;

        // Get content from TinyMCE
        if (typeof tinymce !== 'undefined' && tinymce.get && tinymce.get('sowFullOutputText') && tinymce.get('sowFullOutputText').initialized) {
            sowContentForPdf = tinymce.get('sowFullOutputText').getContent({ format: 'html' }); // Ensure HTML format
            const textContent = tinymce.get('sowFullOutputText').getContent({ format: 'text' });
            if (textContent.trim() !== "") {
                hasActualContent = true;
            }
        } else if (sowFullOutputTextEl) { // Fallback if TinyMCE isn't ready
            sowContentForPdf = sowFullOutputTextEl.value.replace(/\n/g, '<br>');
            if (sowFullOutputTextEl.value.trim() !== "") hasActualContent = true;
        }

        if (!hasActualContent) {
            alert("Scope of Work is effectively empty. Please generate or add content to download.");
            return;
        }

        showLoadingOverlay("Generating SOW PDF...");
        if (downloadSowPdfBtn) downloadSowPdfBtn.disabled = true;

        let tempSowContainer; // Declare here to access in finally/catch for cleanup

        try {
            if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) {
                alert("Error: PDF generation library (jsPDF or html2canvas) not loaded.");
                throw new Error("PDF library not loaded.");
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'letter',
            });

            // PDF Styling constants
            const brandColor = '#003366';
            const textColor = '#333333'; 
            const headingFontSize = 16; // pt for PDF title
            const subHeadingFontSizePt = 11; // pt for H3 elements in PDF
            const bodyFontSizePt = 9;   // <<< Base font size in POINTS for the PDF content
            const sectionSpacing = 8; // mm
            const today = new Date();
            const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
            const projectInfoText = projectInfoInput ? projectInfoInput.value.trim() : "N/A";
            let currentY = 20; // mm
            const leftMargin = 15; // mm
            const rightMargin = 15; // mm
            const usableWidthMm = doc.internal.pageSize.getWidth() - leftMargin - rightMargin; // mm

            // Add PDF Header manually
            doc.setFont("helvetica", "bold");
            doc.setFontSize(headingFontSize);
            doc.setTextColor(brandColor);
            doc.text("Scope of Work", doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
            currentY += 8;
            doc.setLineWidth(0.5);
            doc.setDrawColor(brandColor);
            doc.line(leftMargin, currentY, doc.internal.pageSize.getWidth() - rightMargin, currentY);
            currentY += 8;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9); // pt for date/project info
            doc.setTextColor(textColor);
            doc.text(`Date: ${dateStr}`, leftMargin, currentY);
            if (projectInfoText && projectInfoText !== "N/A") {
                doc.text(`Project: ${projectInfoText}`, doc.internal.pageSize.getWidth() - rightMargin, currentY, { align: 'right' });
            }
            currentY += sectionSpacing * 1.5;

            // Prepare temporary container for HTML content
            tempSowContainer = document.createElement('div');
            tempSowContainer.id = 'tempSowForPdf';

            const pageWrapper = document.createElement('div');
            // Convert usableWidthMm to pixels for html2canvas (approx 3.78 px per mm, can be tuned)
            const usableWidthPx = Math.floor(usableWidthMm * 3.78); 
            pageWrapper.style.width = `${usableWidthPx}px`; 
            pageWrapper.style.padding = '5px'; // Small pixel padding for the wrapper
            pageWrapper.style.backgroundColor = '#ffffff';
            pageWrapper.style.fontFamily = 'Arial, Helvetica, sans-serif';
            pageWrapper.style.fontSize = `${bodyFontSizePt}px`; // Base font size in PIXELS for HTML rendering
            pageWrapper.style.color = textColor || '#000000';
            pageWrapper.style.lineHeight = '1.4';
            pageWrapper.innerHTML = sowContentForPdf; 
            tempSowContainer.appendChild(pageWrapper);

            // Style specific elements: Reset all inline styles first, then apply our own
            const allElementsInWrapper = pageWrapper.getElementsByTagName('*');
            for (let el of allElementsInWrapper) {
                el.style.cssText = ''; // Clear ALL existing inline styles
                el.style.fontFamily = 'Arial, Helvetica, sans-serif !important';
                el.style.color = `${textColor} !important`;
                el.style.backgroundColor = 'transparent !important';
                el.style.margin = '0'; 
                el.style.padding = '0';
                el.style.fontSize = `${bodyFontSizePt}px !important`; // Default to bodyFontSize in pixels
                el.style.lineHeight = '1.4 !important';
            }

            const tagsToStyle = ['p', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u'];
            tagsToStyle.forEach(tag => {
                Array.from(pageWrapper.getElementsByTagName(tag)).forEach(el => {
                    if (tag === 'p' || tag === 'ul' || tag === 'ol' || tag.startsWith('h')) {
                        el.style.marginBottom = '0.5em';
                    }
                    if (tag === 'li') el.style.marginBottom = '0.2em';

                    if (tag.startsWith('h')) {
                        el.style.fontWeight = 'bold !important';
                        el.style.marginTop = '0.75em';
                        if (tag === 'h1') el.style.fontSize = `${Math.round(pdfBodyBaseFontSizePx * 1.6)}px !important`; 
                        else if (tag === 'h2') el.style.fontSize = `${Math.round(pdfBodyBaseFontSizePx * 1.4)}px !important`;
                        else if (tag === 'h3') el.style.fontSize = `${pdfSubHeadingFontSizePx}px !important`;
                        else el.style.fontSize = `${Math.round(pdfBodyBaseFontSizePx * 1.1)}px !important`;
                    }
                    // p and li will take the forced bodyFontSizePt from the loop above
                    if (tag === 'strong') el.style.fontWeight = 'bold !important';
                    if (tag === 'em') el.style.fontStyle = 'italic !important';
                    if (tag === 'u') el.style.textDecoration = 'underline !important';
                    if (tag === 'ul' || tag === 'ol') {
                        el.style.listStylePosition = 'inside';
                        el.style.paddingLeft = '20px'; // Use px for HTML rendering consistency
                        el.style.marginLeft = '0';
                    }
                });
            });
            
            tempSowContainer.style.position = 'absolute';
            tempSowContainer.style.left = '-9999px'; 
            tempSowContainer.style.top = '-9999px';  
            tempSowContainer.style.zIndex = '1';     
            tempSowContainer.style.opacity = '1';    
            tempSowContainer.style.visibility = 'visible'; 
            tempSowContainer.style.width = `${usableWidthPx + 40}px`; // Ensure container is wide enough
            tempSowContainer.style.height = 'auto';
            tempSowContainer.style.backgroundColor = '#ffffff'; 

            document.body.appendChild(tempSowContainer);
            console.log("Temporary SOW container appended. PageWrapper width:", pageWrapper.style.width, "scrollWidth:", pageWrapper.scrollWidth, "offsetHeight:", pageWrapper.offsetHeight);
            console.log("Content being passed to jsPDF.html():", tempSowContainer.innerHTML.substring(0, 700) + "...");

            await new Promise(resolve => setTimeout(resolve, 500)); 

            await doc.html(tempSowContainer, {
                callback: function (processedDoc) { 
                    if (document.body.contains(tempSowContainer)) {
                        document.body.removeChild(tempSowContainer);
                        console.log("Temporary SOW container removed.");
                    }
                    const filenameBase = "Scope_of_Work";
                    const projectPart = sanitizeForFilename(projectInfoText);
                    const datePartForFile = `_${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}-${today.getFullYear()}`;
                    processedDoc.save(`${filenameBase}${projectPart ? '_' + projectPart : ''}${datePartForFile}.pdf`);
                    
                    hideLoadingOverlay();
                    if (downloadSowPdfBtn) setTimeout(() => { downloadSowPdfBtn.disabled = false; }, 0);
                    console.log("SOW PDF .save() called.");
                },
                x: leftMargin,
                y: currentY,
                width: usableWidthMm, 
                windowWidth: pageWrapper.offsetWidth, // Use offsetWidth of the inner pageWrapper for capture width
                autoPaging: 'slice',
                html2canvas: {
                    scale: 1,         // CRITICAL: Keep scale at 1.
                    logging: true,
                    useCORS: true,
                    scrollY: 0,       
                    windowHeight: pageWrapper.offsetHeight // Use offsetHeight of inner pageWrapper
                },
                margin: [0, 0, 15, 0] 
            });

        } catch (error) {
            console.error("Error during SOW PDF generation:", error);
            alert("An error occurred while generating the SOW PDF. Please check the console for details.");
            if (tempSowContainer && document.body.contains(tempSowContainer)) {
                document.body.removeChild(tempSowContainer);
                console.log("Temporary SOW container removed due to error.");
            }
            hideLoadingOverlay();
            if (downloadSowPdfBtn) setTimeout(() => { downloadSowPdfBtn.disabled = false; }, 0);
        }
    }

    // --- AI SOW Drafting Function ---
    async function handleAiDraftFullSow() {
        // alert("--- DEBUG: AI DRAFT FUNCTION CALLED ---"); // Commented out
        console.log("FN_CALL: handleAiDraftFullSow");
        if (!sowAiPromptTextEl || !draftFullSowWithAiBtnEl) {
            console.error("AI Prompt textarea or button not found.");
            return;
        }

        const userPrompt = sowAiPromptTextEl.value.trim();
        if (!userPrompt) {
            alert("Please enter a prompt or specific instructions for the AI to draft the SOW.");
            sowAiPromptTextEl.focus();
            return;
        }

        showLoadingOverlay("AI is drafting the full Scope of Work...");
        if(draftFullSowWithAiBtnEl) draftFullSowWithAiBtnEl.disabled = true;

        const projectName = projectInfoInput.value.trim() || "this project";

        let equipmentContext = "No specific equipment items listed in the quote yet.";
        if (equipmentQuoteItems.length > 0) {
            const maxItemsToDetail = 10;
            let itemsDetails = equipmentQuoteItems.slice(0, maxItemsToDetail)
                                 .map(item => `${item.quantity}x ${item.productName} (Brand: ${item.brand || 'N/A'})`)
                                 .join('; ');
            if (equipmentQuoteItems.length > maxItemsToDetail) {
                itemsDetails += `; and ${equipmentQuoteItems.length - maxItemsToDetail} more item(s).`;
            }
            equipmentContext = `The quote includes the following notable equipment: ${itemsDetails}.`;

            if (equipmentQuoteItems.length > 3) {
                const categories = [...new Set(equipmentQuoteItems.map(item => item.category).filter(cat => cat && cat.trim() !== ''))];
                if (categories.length > 0) {
                    equipmentContext += ` Key equipment categories include: ${categories.join(', ')}.`;
                }
            }
        }

        let laborContext = "No specific labor tasks detailed in the quote yet.";
        const activeLabor = laborDetails.filter(l => (l.numTechs || 0) > 0 && (l.numDays || 0) > 0 && (l.totalManHours || 0) > 0);
        if (activeLabor.length > 0) {
            laborContext = "Estimated labor details are as follows: " + activeLabor.map(l =>
                `${l.name} (configured for approximately ${l.numDays} day(s), resulting in ${l.totalManHours.toFixed(1)} total man-hours)`
            ).join('; ') + ".";
        }

        const fullPrompt = `
            You are an AI assistant helping to draft a comprehensive Scope of Work (SOW) for an Audio/Visual (AV) project.
            Project Name/Number: "${projectName}"
            Equipment Context: ${equipmentContext}
            Labor Context: ${laborContext}

            User's Specific Instructions/Focus for this SOW: "${userPrompt}"

            Please generate a full SOW document based on all the above information.
            The SOW should be professional, clear, and well-organized.
            Structure the output with the following distinct sections, using these exact headings followed by a colon:
            - Project Overview:
            - System Objectives & Operation:
            - Detailed Scope of Work: (Use bullet points or numbered lists for deliverables where appropriate)
            - Exclusions: (Start with "- Clearpoint will not install any high voltage cabling or equipment" and add other typical AV project exclusions. Use bullet points.)
            - Estimated Project Timeline:

            Ensure the content for each section is relevant to an AV project and incorporates the user's specific instructions.
            Provide detailed and practical information.
        `;

        console.log("Full AI Prompt for SOW:", fullPrompt);

        try {
            let chatHistory = [{ role: "user", parts: [{ text: fullPrompt }] }];
            const payload = { contents: chatHistory };
            const hardcodedApiKey = "AIzaSyBMxGOJY4g7rFK6wkU64GUWs2cDE-Gy66U";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${hardcodedApiKey}`;


            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`AI API Error Response Body: ${errorBody}`);
                throw new Error(`AI API request failed with status ${response.status}: ${errorBody}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {

                let generatedText = result.candidates[0].content.parts[0].text;
                console.log("Raw AI Response:", generatedText);

                if (typeof tinymce !== 'undefined' && tinymce.get && tinymce.get('sowFullOutputText') && tinymce.get('sowFullOutputText').initialized) {
                    let htmlContent = generatedText.trim();
                    htmlContent = htmlContent.replace(/^(Project Overview:.*)$/gm, '<h3>$1</h3>');
                    htmlContent = htmlContent.replace(/^(System Objectives & Operation:.*)$/gm, '<h3>$1</h3>');
                    htmlContent = htmlContent.replace(/^(Detailed Scope of Work:.*)$/gm, '<h3>$1</h3>');
                    htmlContent = htmlContent.replace(/^(Exclusions:.*)$/gm, '<h3>$1</h3>');
                    htmlContent = htmlContent.replace(/^(Estimated Project Timeline:.*)$/gm, '<h3>$1</h3>');
                    htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    htmlContent = htmlContent.replace(/__(.*?)__/g, '<strong>$1</strong>');
                    htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');

                    htmlContent = htmlContent.replace(/^\s*([*-+])\s+(.*)/gm, '<li>$2</li>');
                    htmlContent = htmlContent.replace(/(<li>.*?<\/li>\s*)+/g, (match) => `<ul>${match.replace(/\s*$/, '')}</ul>`);

                    const blocks = htmlContent.split(/\n\s*\n/);
                    htmlContent = blocks.map(block => {
                        if (block.startsWith('<h3>') || block.startsWith('<ul>')) {
                            return block;
                        }
                        return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
                    }).join('');
                    htmlContent = htmlContent.replace(/<p>\s*(<ul>.*?<\/ul>)\s*<\/p>/gs, '$1');
                    htmlContent = htmlContent.replace(/<p>\s*(<h3>.*?<\/h3>)\s*<\/p>/gs, '$1');

                    tinymce.get('sowFullOutputText').setContent(htmlContent);
                    alert("AI has drafted the Scope of Work. Please review the generated text below.");
                } else if (sowFullOutputTextEl) {
                    console.warn("TinyMCE instance not found or not initialized. Falling back to textarea for AI output.");
                    sowFullOutputTextEl.value = generatedText.trim();
                    alert("AI drafted the Scope of Work (TinyMCE not active/ready). Please review.");
                } else {
                    console.error("SOW Full Output Textarea (#sowFullOutputText) or TinyMCE instance not found.");
                    alert("AI drafted the SOW, but the output area is missing. Please check console.");
                }
                updateFinalActionButtonsState();

            } else {
                console.warn("AI response structure unexpected or content missing:", result);
                alert(`AI drafting for SOW returned no content. Please try again or draft manually.`);
            }
        } catch (error) {
            console.error(`Error during AI SOW drafting:`, error);
            alert(`An error occurred while drafting SOW with AI. Please check the console and try again. Error: ${error.message}`);
        } finally {
            hideLoadingOverlay();
            if(draftFullSowWithAiBtnEl) draftFullSowWithAiBtnEl.disabled = false;
        }
    }

    // --- Spec Sheet Modal Functions ---
    function displaySpecSheetLinks() {
        console.log("FN_CALL: displaySpecSheetLinks");
        if (!specSheetModal || !specSheetLinksContainer) {
            console.error("Spec sheet modal elements not found.");
            return;
        }

        specSheetLinksContainer.innerHTML = '';
        const itemsWithSpecSheets = equipmentQuoteItems.filter(item => item.specSheetURL && item.specSheetURL.trim() !== '');

        if (itemsWithSpecSheets.length > 0) {
            const ul = document.createElement('ul');
            itemsWithSpecSheets.forEach(item => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = item.specSheetURL;
                a.textContent = `${item.productName} - View Spec Sheet`;
                a.target = '_blank';
                li.appendChild(a);
                ul.appendChild(li);
            });
            specSheetLinksContainer.appendChild(ul);
        } else {
            specSheetLinksContainer.innerHTML = '<p>No spec sheets found for items in the current quote, or items may not have a valid URL.</p>';
        }
        if(specSheetModal) specSheetModal.style.display = 'block';
    }

    function closeSpecSheetModal() {
        console.log("FN_CALL: closeSpecSheetModal");
        if (specSheetModal) {
            specSheetModal.style.display = 'none';
        }
    }

    // --- TinyMCE Initialization ---
    function initializeTinyMCE() {
        if (typeof tinymce !== 'undefined' && tinymce.init) {
            tinymce.init({
                selector: '#sowFullOutputText',
                height: 450,
                plugins: [
                    'advlist', 'lists', 'autolink', 'link', 'wordcount', 'help'
                ],
                toolbar: 'undo redo | styles | bold italic underline | bullist numlist | alignleft aligncenter alignright alignjustify | outdent indent | help',
                menubar: false,
                statusbar: true,
                content_style: 'body { font-family: Montserrat, sans-serif; font-size: 14px; }',

                setup: function(editor) {
                    editor.on('keydown', function(e) {
                        if (e.key === 'Tab') {
                            e.preventDefault();
                            if (editor.queryCommandState('InsertOrderedList') || editor.queryCommandState('InsertUnorderedList')) {
                                if (e.shiftKey) {
                                    editor.execCommand('Outdent');
                                } else {
                                    editor.execCommand('Indent');
                                }
                            } else {
                                editor.execCommand('mceInsertContent', false, '\t');
                            }
                        }
                    });
                    editor.on('input change undo redo setcontent', () => {
                         updateFinalActionButtonsState();
                    });
                }
            });
            console.log("TinyMCE initialized for #sowFullOutputText");
        } else {
            console.error("TinyMCE is not loaded or tinymce.init is not a function. SOW editor will be a plain textarea.");
            if (sowFullOutputTextEl) {
                sowFullOutputTextEl.addEventListener('input', updateFinalActionButtonsState);
            }
        }
    }

    // --- SOW Microphone Input Function ---
    function handleSowMicInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Sorry, your browser doesn't support Speech Recognition. Try Chrome or Edge.");
            if (sowMicBtnEl) {
                sowMicBtnEl.disabled = true;
                sowMicBtnEl.title = "Speech recognition not supported by this browser.";
            }
            return;
        }

        if (currentSpeechRecognitionInstance && sowMicBtnEl.classList.contains('is-recording')) {
            currentSpeechRecognitionInstance.stop();
            console.log("Speech recognition explicitly stopped by user.");
            return;
        }

        if (sowMicBtnEl && sowMicBtnEl.disabled && !sowMicBtnEl.classList.contains('is-recording')) {
             console.log("Mic button is disabled; operation aborted or already in progress.");
             return;
        }
        if (currentSpeechRecognitionInstance){
            console.log("Cleaning up previous speech recognition instance before starting new.");
            currentSpeechRecognitionInstance.abort();
            currentSpeechRecognitionInstance = null;
        }

        const recognition = new SpeechRecognition();
        currentSpeechRecognitionInstance = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let final_transcript = sowAiPromptTextEl.value;
        if (final_transcript.length > 0 && !/\s$/.test(final_transcript)) {
            final_transcript += ' ';
        }

        recognition.onstart = () => {
            if (sowMicBtnEl) {
                sowMicBtnEl.classList.add('is-recording');
                sowMicBtnEl.title = "Recording... Click mic to stop.";
                sowMicBtnEl.disabled = false;
            }
            console.log("Speech recognition started (continuous mode).");
        };

        recognition.onresult = (event) => {
            let interim_transcript_segment = '';
            let new_final_segment = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    new_final_segment += event.results[i][0].transcript;
                } else {
                    interim_transcript_segment += event.results[i][0].transcript;
                }
            }

            if (new_final_segment) {
                if (final_transcript.trim().length > 0 && !/\s$/.test(final_transcript) &&
                    (new_final_segment.length > 0 && !/^\s/.test(new_final_segment))) {
                    final_transcript += ' ';
                }
                final_transcript += new_final_segment;
            }

            sowAiPromptTextEl.value = final_transcript + interim_transcript_segment;
            sowAiPromptTextEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            let errorMessage = "Speech recognition error: " + event.error;
            if (event.error === 'no-speech') {
                errorMessage = "No speech detected. Please ensure your microphone is working and try again.";
            } else if (event.error === 'audio-capture') {
                errorMessage = "Microphone problem. Ensure it's connected, not muted, and permission is granted.";
            } else if (event.error === 'not-allowed') {
                errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings for this site.";
            }
            alert(errorMessage);
            if (sowMicBtnEl) {
                sowMicBtnEl.classList.remove('is-recording');
                sowMicBtnEl.title = "Use Microphone for Prompt";
                sowMicBtnEl.disabled = false;
            }
            currentSpeechRecognitionInstance = null;
        };

        recognition.onend = () => {
            if (sowMicBtnEl) {
                sowMicBtnEl.classList.remove('is-recording');
                sowMicBtnEl.title = "Use Microphone for Prompt";
                sowMicBtnEl.disabled = false;
            }
            console.log("Speech recognition ended.");
            sowAiPromptTextEl.value = final_transcript.trim();
            sowAiPromptTextEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            currentSpeechRecognitionInstance = null;
        };

        try {
            recognition.start();
        } catch (e) {
            console.error("Could not start recognition:", e);
            alert("Could not start voice recognition. Ensure microphone permissions and try again.");
            if (sowMicBtnEl) {
                sowMicBtnEl.classList.remove('is-recording');
                sowMicBtnEl.title = "Use Microphone for Prompt";
                sowMicBtnEl.disabled = false;
            }
            currentSpeechRecognitionInstance = null;
        }
    }

    // 4. Main UI Initialization Function (Called by Auth State Change when user is logged in)
    function initializeAppUIAndListeners() {
        uiInitialized = true;
        console.log("FN_CALL: initializeAppUIAndListeners - Setting up UI and listeners for the main app.");
        console.log("--- DEBUG: Is openLoadQuoteSidebar defined here?", typeof openLoadQuoteSidebar);
        console.log("--- DEBUG: Is handleDownloadCustomerQuotePDF defined here?", typeof handleDownloadCustomerQuotePDF);
        console.log("--- DEBUG: Is handleDownloadSowPDF defined here?", typeof handleDownloadSowPDF);
        console.log("--- DEBUG: Is handleAiDraftFullSow defined here?", typeof handleAiDraftFullSow);


        if (toggleLoadQuoteSidebarBtn) {
            console.log("--- DEBUG: Adding listener for toggleLoadQuoteSidebarBtn --- Element:", toggleLoadQuoteSidebarBtn);
            toggleLoadQuoteSidebarBtn.addEventListener('click', openLoadQuoteSidebar);
        } else {
            console.error("--- DEBUG: toggleLoadQuoteSidebarBtn NOT FOUND in initializeAppUIAndListeners! ---");
        }

        if (closeLoadQuoteSidebarBtn) {
            console.log("--- DEBUG: Adding listener for closeLoadQuoteSidebarBtn --- Element:", closeLoadQuoteSidebarBtn);
            closeLoadQuoteSidebarBtn.addEventListener('click', closeLoadQuoteSidebar);
        } else {
            console.error("--- DEBUG: closeLoadQuoteSidebarBtn NOT FOUND in initializeAppUIAndListeners! ---");
        }

        if (newQuoteBtn) {
            newQuoteBtn.addEventListener('click', startNewQuote);
        } else {
            console.error("--- DEBUG: newQuoteBtn NOT FOUND in initializeAppUIAndListeners! ---");
        }

        if (updateStatusBtn) {
            updateStatusBtn.addEventListener('click', handleUpdateQuoteStatus);
        } else {
            console.error("--- DEBUG: updateStatusBtn NOT FOUND in initializeAppUIAndListeners! ---");
        }

        if (currentYearSpan) { currentYearSpan.textContent = new Date().getFullYear(); }

        
        renderLaborSection();
        initializeSowOutputArea();
        initializeTinyMCE();

        if (navigateToQuoteBuilderBtn) navigateToQuoteBuilderBtn.addEventListener('click', () => showView('quoteBuilderView'));
        if (navigateToSowBtn) navigateToSowBtn.addEventListener('click', () => showView('sowView'));

        if(productSearchInput) productSearchInput.addEventListener('input', filterProducts);
        if(brandFilterDropdown) brandFilterDropdown.addEventListener('change', filterProducts);
        if(productDropdown) productDropdown.addEventListener('change', handleProductSelectForPreview);
        if(addToQuoteBtn) addToQuoteBtn.addEventListener('click', addProductToEquipmentQuote);

        if(refreshDataBtn) {
            refreshDataBtn.addEventListener('click', () => {
                const originalText = refreshDataBtn.textContent;
                refreshDataBtn.textContent = "Refreshing...";
                refreshDataBtn.disabled = true;

                console.log("FN_CALL: Refresh button clicked - resetting quote and SOW.");
                equipmentQuoteItems = [];
                if(projectInfoInput) projectInfoInput.value = '';
                if(productSearchInput) productSearchInput.value = '';
                if(brandFilterDropdown) brandFilterDropdown.value = "";
                if(productDropdown) productDropdown.value = "";
                laborDetails = [
                    { id: 'sde', name: 'System Design & Engineering', clientRatePerHour: 150, isClientRateEditable: false, numTechs: 1, numDays: 0.5, assignedTechSlots: [{ techId: 'todd' }], allowSubcontractors: false, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
                    { id: 'programming', name: 'Programming', clientRatePerHour: 150, isClientRateEditable: false, numTechs: 1, numDays: 0, assignedTechSlots: [{ techId: 'todd' }], allowSubcontractors: false, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
                    { id: 'prewire', name: 'Pre-wire', clientRatePerHour: 100, isClientRateEditable: true, numTechs: 0, numDays: 0, assignedTechSlots: [], allowSubcontractors: true, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 },
                    { id: 'installation', name: 'Installation', clientRatePerHour: 100, isClientRateEditable: true, numTechs: 3, numDays: 1, assignedTechSlots: [{ techId: 'austin' }, { techId: 'john' }, { techId: 'joe' }], allowSubcontractors: true, numSubcontractors: 0, assignedSubcontractors: [], totalManHours: 0, totalClientCost: 0, totalCompanyCost: 0 }
                ];
                if(discountPercentInput) discountPercentInput.value = "0";
                if(shippingPercentInput) shippingPercentInput.value = "5";
                if(salesTaxPercentInput) salesTaxPercentInput.value = "8";
                if (quoteStatusSelector) quoteStatusSelector.value = "Draft";

                currentLoadedQuoteId = null;
                console.log("currentLoadedQuoteId has been reset by refresh button.");


                initializeSowOutputArea();
                if (sowAiPromptTextEl) sowAiPromptTextEl.value = '';

                fetchProductsFromFirestore();
                renderLaborSection();

                setTimeout(() => {
                    if (addSuccessNotificationEl) {
                        addSuccessNotificationEl.textContent = "Product list and quote reset successfully.";
                        addSuccessNotificationEl.classList.add('visible');
                        if (notificationTimeoutId) clearTimeout(notificationTimeoutId);
                        notificationTimeoutId = setTimeout(() => {
                            addSuccessNotificationEl.classList.remove('visible');
                            setTimeout(() => {
                                if (!addSuccessNotificationEl.classList.contains('visible')) addSuccessNotificationEl.textContent = '';
                            }, 300);
                        }, 3000);
                    }
                    if (refreshDataBtn) {
                        refreshDataBtn.textContent = originalText;
                        refreshDataBtn.disabled = false;
                    }
                }, 700);
            });
        }

        if(printQuoteBtn) printQuoteBtn.addEventListener('click', handlePrintQuote);
        if(downloadPdfBtn) {
            console.log("--- DEBUG: Attaching listener to downloadPdfBtn ---", downloadPdfBtn);
            downloadPdfBtn.addEventListener('click', handleDownloadCustomerQuotePDF);
        } else {
            console.error("--- DEBUG: downloadPdfBtn NOT FOUND ---");
        }
        if(downloadSowPdfBtn) {
            console.log("--- DEBUG: Attaching listener to downloadSowPdfBtn ---", downloadSowPdfBtn);
            downloadSowPdfBtn.addEventListener('click', handleDownloadSowPDF);
        } else {
            console.error("--- DEBUG: downloadSowPdfBtn NOT FOUND ---");
        }
        if(saveQuoteBtn) saveQuoteBtn.addEventListener('click', handleSaveQuote);


        if(viewSpecSheetsBtn) viewSpecSheetsBtn.addEventListener('click', displaySpecSheetLinks);
        if(modalCloseButton) modalCloseButton.addEventListener('click', closeSpecSheetModal);
        window.addEventListener('click', (event) => {
            if (specSheetModal && event.target === specSheetModal) closeSpecSheetModal();
        });

        if(discountPercentInput) discountPercentInput.addEventListener('input', calculateAndRenderGrandTotals);
        if(shippingPercentInput) shippingPercentInput.addEventListener('input', calculateAndRenderGrandTotals);
        if(salesTaxPercentInput) salesTaxPercentInput.addEventListener('input', calculateAndRenderGrandTotals);

        if (projectInfoInput) {
            projectInfoInput.addEventListener('input', updateFinalActionButtonsState);
        }
        if (sowAiPromptTextEl) { // Listener for AI Prompt input
            sowAiPromptTextEl.addEventListener('input', () => {
                console.log("--- DEBUG: AI Prompt Input Event. Value: '", sowAiPromptTextEl.value, "' ---");
                updateFinalActionButtonsState();
            });
        }
        if (draftFullSowWithAiBtnEl) { // Listener for AI Draft button
            console.log("--- DEBUG: Attaching listener to draftFullSowWithAiBtnEl ---", draftFullSowWithAiBtnEl);
            draftFullSowWithAiBtnEl.addEventListener('click', handleAiDraftFullSow);
        } else {
            console.error("--- DEBUG: draftFullSowWithAiBtnEl NOT FOUND ---");
        }
        if (sowMicBtnEl) {
            const SpeechRecognitionSupport = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognitionSupport) {
                sowMicBtnEl.disabled = true;
                sowMicBtnEl.title = "Speech recognition not supported by this browser.";
            } else {
                sowMicBtnEl.addEventListener('click', handleSowMicInput);
            }
        }
        if (quoteItemsTbody) {
            quoteItemsTbody.addEventListener('dragover', handleDragOver);
            quoteItemsTbody.addEventListener('dragenter', handleDragEnter);
            quoteItemsTbody.addEventListener('dragleave', handleDragLeave);
            quoteItemsTbody.addEventListener('drop', handleDrop);
        }

        showView('quoteBuilderView');
        updateFinalActionButtonsState();
        console.log("initializeAppUIAndListeners complete.");
    }

    // Firebase Auth State Listener (VERY IMPORTANT)
    if (fbAuth) {
        console.log("Setting up onAuthStateChanged listener (Full Script).");
        fbAuth.onAuthStateChanged(user => {
            if (user) {
                console.log("onAuthStateChanged: User IS signed in (Full Script). Email:", user.email);
                showAppView();
            } else {
                console.log("onAuthStateChanged: User IS NOT signed in (Full Script).");
                showLoginView();
            }
        });
    } else {
        console.error("Firebase Auth (fbAuth) is not initialized at Auth State Listener setup (Full Script). Login cannot function reliably.");
        showLoginView();
        if(loginError) loginError.textContent = "Auth service error. Refresh might help.";
    }

    console.log("Auth listeners set. Initial auth state check will occur (Full Script).");
});