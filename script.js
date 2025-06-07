// Clearpoint AV Quoting Tool - Main JS
// Full script: includes tab logic, AI SOW/task list, mic, overlays, TinyMCE, editable table, quote/labor logic, and all previous features

// ------------- FIREBASE CONFIG -------------
const firebaseConfig = {
    apiKey: "AIzaSyCZ1hlNQ6TbyJsBgFplVBmiqBRTbgJreZM",
    authDomain: "clearpoint-quoting-tool.firebaseapp.com",
    projectId: "clearpoint-quoting-tool",
    storageBucket: "clearpoint-quoting-tool.firebasestorage.app",
    messagingSenderId: "551915292541",
    appId: "1:551915292541:web:eae34446f251a9223fae14"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ------------- GOOGLE MAPS API LOADER ------------- 
function loadGoogleMapsAPI() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      console.log("Google Maps API already loaded");
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log("Google Maps script already exists, waiting for load...");
      // Wait for existing script to load
      const checkLoaded = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        reject(new Error('Timeout waiting for Google Maps API to load'));
      }, 10000);
      return;
    }

    console.log("Loading Google Maps API...");
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDZOJCVFdUqMDwPfTz8-2F-YEOeP_l_IBY&libraries=places&loading=async';
    script.async = true;
    script.defer = true;
    
    // Set up a polling mechanism instead of relying on onload
    script.onload = () => {
      console.log("Google Maps script loaded, checking for API availability...");
      
      // Poll for Google Maps API availability
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const checkAPI = setInterval(() => {
        attempts++;
        console.log(`Checking Google Maps API availability (attempt ${attempts})`);
        
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
          console.log("Google Maps API is now available!");
          clearInterval(checkAPI);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkAPI);
          reject(new Error('Google Maps API failed to initialize after loading'));
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error("Failed to load Google Maps script:", error);
      reject(new Error('Failed to load Google Maps API script'));
    };
    
    document.head.appendChild(script);
  });
}

// Updated initAutocomplete function with better error handling
async function initAutocomplete() {
  console.log("initAutocomplete called");
  
  try {
    // Load Google Maps API with timeout
    console.log("Attempting to load Google Maps API...");
    await loadGoogleMapsAPI();
    console.log("Google Maps API loaded successfully");
    
    // Wait a bit more for API to be fully ready
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Initialize autocomplete for billing address in customer form
    const billingAddressInput = document.getElementById("customerBillingAddress");
    
    if (billingAddressInput) {
      console.log("Initializing autocomplete for customer billing address");
      try {
        const billingAddressAutocomplete = new google.maps.places.Autocomplete(billingAddressInput, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'address_components', 'geometry']
        });
        
        billingAddressAutocomplete.addListener('place_changed', function() {
          const place = billingAddressAutocomplete.getPlace();
          console.log("Place selected:", place.formatted_address);
          if (place.formatted_address) {
            billingAddressInput.value = place.formatted_address;
          }
        });
        
        console.log("Customer billing address autocomplete initialized successfully");
      } catch (error) {
        console.error("Error initializing customer billing address autocomplete:", error);
      }
    } else {
      console.log("Customer billing address input not found - form may not be visible yet");
    }
    
    // Initialize for project address if it exists
    const projectAddressInput = document.getElementById("customerProjectAddress");
    
    if (projectAddressInput) {
      console.log("Initializing autocomplete for customer project address");
      try {
        const projectAddressAutocomplete = new google.maps.places.Autocomplete(projectAddressInput, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'address_components', 'geometry']
        });
        
        projectAddressAutocomplete.addListener('place_changed', function() {
          const place = projectAddressAutocomplete.getPlace();
          console.log("Project place selected:", place.formatted_address);
          if (place.formatted_address) {
            projectAddressInput.value = place.formatted_address;
          }
        });
        
        console.log("Customer project address autocomplete initialized successfully");
      } catch (error) {
        console.error("Error initializing customer project address autocomplete:", error);
      }
    }
    
  } catch (error) {
    console.error("Failed to load Google Maps API:", error);
    console.log("Address autocomplete will not be available");
    // Don't throw error - let the app continue without autocomplete
  }
}

// ------------- GLOBALS -------------
window.quoteItems = window.quoteItems || [];
window.laborSections = window.laborSections || [];
window.taskList = window.taskList || [];

let isCustomersTabLoggedIn = false;

let currentUser = null;
// --- Listen for login state changes ---
firebase.auth().onAuthStateChanged(user => {
  isCustomersTabLoggedIn = !!user;
});

let products = [];
let filteredProducts = [];
let selectedProduct = null;
let templates = [];
let savedQuotes = [];
let activeQuoteId = null;
let activeTemplateId = null;

// Global variable to store the selected customer for the current quote
window.selectedQuoteCustomer = null;

// Load customers into the dropdown
async function loadCustomerDropdown() {
  try {
    console.log("Loading customer dropdown...");
    
    const snapshot = await db.collection("customerAccounts").orderBy("created", "desc").get();
    const dropdown = document.getElementById("customerAccountSelector");
    
    if (dropdown) {
      // Clear existing options except the default
      dropdown.innerHTML = '<option value="">Select a customer account...</option>';
      
      snapshot.forEach(doc => {
        const customer = { id: doc.id, ...doc.data() };
        console.log("Adding customer to dropdown:", customer);
        
        const option = document.createElement("option");
        option.value = customer.id;
        option.textContent = `${customer.firstName} ${customer.lastName}${customer.companyName ? ` (${customer.companyName})` : ''}`;
        dropdown.appendChild(option);
      });
      
      console.log(`Loaded ${snapshot.size} customers to dropdown`);
    }
  } catch (error) {
    console.error("Error loading customer dropdown:", error);
  }
}

// Handle customer selection
function handleCustomerSelection() {
  const dropdown = document.getElementById("customerAccountSelector");
  const selectedOption = dropdown.options[dropdown.selectedIndex];
  
  if (!selectedOption.value) {
    // No customer selected
    window.selectedQuoteCustomer = null;
    document.getElementById("selectedCustomerInfo").style.display = "none";
    return;
  }
  
  try {
    const customerData = JSON.parse(selectedOption.getAttribute('data-customer'));
    window.selectedQuoteCustomer = customerData;
    
    // Update the display
    updateSelectedCustomerDisplay(customerData);
    
    // Show the customer info section
    document.getElementById("selectedCustomerInfo").style.display = "block";
    
  } catch (error) {
    console.error("Error parsing customer data:", error);
    window.selectedQuoteCustomer = null;
    document.getElementById("selectedCustomerInfo").style.display = "none";
  }
}

// Update the customer info display
function updateSelectedCustomerDisplay(customer) {
  document.getElementById("displayCustomerName").textContent = 
    `${customer.firstName} ${customer.lastName}`;
  
  document.getElementById("displayCustomerEmail").textContent = 
    customer.email || "Not provided";
  
  document.getElementById("displayCustomerPhone").textContent = 
    customer.phone || "Not provided";
  
  document.getElementById("displayCustomerCompany").textContent = 
    customer.companyName || "N/A";
  
  document.getElementById("displayCustomerAddress").textContent = 
    customer.billingAddress || "Not provided";
}

const techList = [
  "Todd - Specialist",
  "Austin - Lead Tech",
  "John - Technician",
  "Joe - Technician"
];
const laborConfig = [
  { id: "sde", label: "System Design & Engineering", showSubs: false, defaultRate: 150 },
  { id: "programming", label: "Programming", showSubs: false, defaultRate: 150 },
  { id: "prewire", label: "Pre-wire", showSubs: true, defaultRate: 100 },
  { id: "installation", label: "Installation", showSubs: true, defaultRate: 100 }
];

// ----------- TAB NAVIGATION WITH CUSTOMER LOGIN SECURITY -----------

const mainTabs = [
  { btn: "tabQuoteBuilderBtn", page: "tabQuoteBuilderPage" },
  { btn: "tabProductLibraryBtn", page: "productLibrarySection" },
  { btn: "tabCustomersBtn", page: "customers-page" },
  { btn: "tabScopeOfWorkBtn", page: "tabScopeOfWorkPage" },
  { btn: "tabTaskListBtn", page: "tabTaskListPage" }
];

// Add click handlers for all main navigation tabs
mainTabs.forEach(({ btn, page }) => {
  document.getElementById(btn).addEventListener("click", () => {
    // Special security for Customers tab
    if (btn === "tabCustomersBtn") {
      // Always show login modal when tab is clicked
      document.getElementById("customersLoginEmail").value = "";
      document.getElementById("customersLoginPassword").value = "";
      document.getElementById("customersLoginError").style.display = "none";
      document.getElementById("customersLoginModal").style.display = "flex";
      // Hide customers page if it's visible
      document.getElementById("customers-page").style.display = "none";
      // Deactivate tab
      document.getElementById("tabCustomersBtn").classList.remove("active");
      return; // Do not show the customers page until login
    }
    // Show the requested main section, hide others
    mainTabs.forEach(({ btn: b, page: p }) => {
      document.getElementById(b).classList.toggle("active", b === btn);
      document.getElementById(p).style.display = (p === page ? "" : "none");
    });
    // Optional: load data for this tab
    if (page === "customers-page" && typeof loadCustomers === "function") loadCustomers();
    if (page === "productLibrarySection" && typeof loadProducts === "function") loadProducts();
  });
});


// ---- PRODUCT LIBRARY TAB LOGIC ----
document.getElementById("tabProductLibraryBtn").addEventListener("click", () => {
  // Remove active class from all tab buttons
  document.querySelectorAll(".main-tab-btn").forEach(btn => btn.classList.remove("active"));
  // Hide all main-tab-page sections
  document.querySelectorAll(".main-tab-page").forEach(page => page.style.display = "none");
  // Hide the login view if showing
  if (document.getElementById("loginView")) document.getElementById("loginView").style.display = "none";
  // Show Product Library section
  document.getElementById("productLibrarySection").style.display = "";
  // Make tab active
  document.getElementById("tabProductLibraryBtn").classList.add("active");
  // Optionally, clear product table until brand is chosen
  document.querySelector("#productLibraryTable tbody").innerHTML = '';
  // Load brand options (implement next)
  loadBrandFilterOptions();
});

// ------------- AUTH: LOGIN/LOGOUT -------------
function showLogin() {
  document.getElementById("mainAppContent").style.display = "none";
  document.getElementById("loginView").style.display = "block";

  // Hide elements that should only be visible when logged in
  document.getElementById("logoutButton").style.display = "none";
  document.getElementById("floatingActionBar").style.display = "none";
  document.getElementById("mainTabNav").style.display = "none"; // Ensure this line is present and correct
}

function showApp() {
  // Hide the login view
  document.getElementById("loginView").style.display = "none";

  // Show the main application content
  document.getElementById("mainAppContent").style.display = "block";

  // Show elements that should be visible only when logged in,
  // using setProperty to ensure they override CSS if '!important' was used for hiding.
  document.getElementById("logoutButton").style.setProperty("display", "block", "important");
  document.getElementById("floatingActionBar").style.setProperty("display", "flex", "important");
  document.getElementById("mainTabNav").style.setProperty("display", "flex", "important");
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    showApp();
    loadInitialData();
    updateFooterYear();
    setTimeout(() => {
      if (window.tinymce && tinymce.get("sowFullOutputText")) tinymce.get("sowFullOutputText");
    }, 500);
  } else {
    showLogin();
  }
});
document.getElementById("loginButton").onclick = async function() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    document.getElementById("loginError").innerText = "";
  } catch (e) {
    document.getElementById("loginError").innerText = e.message || "Login failed.";
  }
};
document.getElementById("logoutButton").onclick = function() {
  auth.signOut();
};

// ------------- INITIAL DATA LOAD -------------
async function loadInitialData() {
  await loadProducts();
  await loadQuotesAndTemplates();
  await loadCustomerDropdown();
  renderLaborSections();
  renderSidebar();
  updateGrandTotals();
  initTinyMCE();
  renderTaskListTable();
}

// ------------- PRODUCTS: LOAD & SEARCH -------------
async function loadProducts() {
  try {
    const snapshot = await db.collection('products').get();
    products = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        costPrice: (typeof d.costPrice === "number" ? d.costPrice : (typeof d.cost === "number" ? d.cost : 0)),
        msrp: d.msrp,
        map: d.map
      };
    });
    filteredProducts = products.slice();
    updateBrandFilter();
    updateProductDropdown();
    document.getElementById("dataLoadStatus").innerText = `Loaded ${products.length} products.`;
  } catch (err) {
    document.getElementById("dataLoadStatus").innerText = "Error loading product data!";
    console.error("Error loading products from Firestore:", err);
  }
}
function updateBrandFilter() {
  const brandsSet = new Set(products.map(p => (p.brand || "").trim()).filter(b => b));
  const brands = Array.from(brandsSet).sort((a, b) => a.localeCompare(b));
  const brandDropdown = document.getElementById("brandFilterDropdown");
  brandDropdown.innerHTML = `<option value="">All Brands</option>` + brands.map(b => `<option>${b}</option>`).join("");
}
function updateProductDropdown() {
  const dropdown = document.getElementById("productDropdown");
  dropdown.innerHTML = `<option value="">-- Select a Product --</option>` +
    filteredProducts.map((p, i) => {
      let brand = p.brand && p.brand.trim() ? p.brand.trim() : "[No Brand]";
      let name = p.productName && p.productName.trim() && p.productName.trim().toLowerCase() !== "n/a" ? p.productName.trim() : "";
      let display = "";
      if (brand !== "[No Brand]") display += brand;
      if (name) display += display ? " – " + name : name;
      if (!display.trim()) display = "[No Product Data]";
      return `<option value="${i}" title="${p.description || ''}">${display}</option>`;
    }).join("");
  dropdown.disabled = filteredProducts.length === 0;
}
document.getElementById("productSearchInput").oninput = filterProducts;
document.getElementById("brandFilterDropdown").onchange = filterProducts;
function filterProducts() {
  const search = document.getElementById("productSearchInput").value.toLowerCase();
  const brand = document.getElementById("brandFilterDropdown").value;
  const brandLC = brand ? brand.toLowerCase() : "";
  filteredProducts = products.filter(p =>
    (!brandLC || ((p.brand || "").toLowerCase() === brandLC)) &&
    ((p.productName || "").toLowerCase().includes(search) ||
     (p.productNumber || "").toLowerCase().includes(search) ||
     (p.brand || "").toLowerCase().includes(search))
  );
  updateProductDropdown();
}
document.getElementById("productDropdown").onchange = function() {
  const idx = this.value;
  selectedProduct = idx ? filteredProducts[idx] : null;
  updateItemPreview();
  document.getElementById("addToQuoteBtn").disabled = !selectedProduct;
};
function updateItemPreview() {
  const p = selectedProduct;
  if (!p) {
    document.getElementById("item-preview-name").innerText = "";
    document.getElementById("item-preview-number").innerText = "";
    document.getElementById("item-preview-brand").innerText = "";
    document.getElementById("item-preview-category").innerText = "";
    document.getElementById("item-preview-type").innerText = "";
    document.getElementById("item-preview-desc").innerText = "";
    document.getElementById("item-preview-msrp").innerText = "";
    document.getElementById("item-preview-map").innerText = "";
    document.getElementById("item-preview-cost").innerText = "";
    document.getElementById("item-preview-specsheet").href = "#";
    document.getElementById("item-preview-specsheet").style.display = "none";
    document.getElementById("item-preview-img").src = "placeholderlogoimage.png";
    return;
  }
  
  document.getElementById("item-preview-name").innerText = p.productName || "";
  document.getElementById("item-preview-number").innerText = p.productNumber || "";
  document.getElementById("item-preview-brand").innerText = p.brand || "";
  document.getElementById("item-preview-category").innerText = p.category || "";
  document.getElementById("item-preview-type").innerText = p.type || "";
  document.getElementById("item-preview-desc").innerText = p.description || "";
  document.getElementById("item-preview-msrp").innerText = (typeof p.msrp === "number" ? `$${p.msrp.toFixed(2)}` : "");
  document.getElementById("item-preview-map").innerText = (typeof p.map === "number" ? `$${p.map.toFixed(2)}` : "");
  document.getElementById("item-preview-cost").innerText = (typeof p.costPrice === "number" ? `$${p.costPrice.toFixed(2)}` : "");
  
  // Handle spec sheet link
  const specSheetLink = document.getElementById("item-preview-specsheet");
  if (p.specSheetURL && p.specSheetURL.trim() && p.specSheetURL.trim() !== "#") {
    specSheetLink.href = p.specSheetURL.trim();
    specSheetLink.style.display = "inline";
  } else if (p.specSheetUrl && p.specSheetUrl.trim() && p.specSheetUrl.trim() !== "#") {
    // Check for alternative field name
    specSheetLink.href = p.specSheetUrl.trim();
    specSheetLink.style.display = "inline";
  } else {
    specSheetLink.href = "#";
    specSheetLink.style.display = "none";
  }
  
  // Handle image
  const imgElement = document.getElementById("item-preview-img");
  if (p.imageURL && p.imageURL.trim()) {
    imgElement.src = p.imageURL.trim();
    imgElement.onerror = function() {
      // If image fails to load, show placeholder
      this.src = "placeholderlogoimage.png";
    };
  } else if (p.imageUrl && p.imageUrl.trim()) {
    // Check for alternative field name
    imgElement.src = p.imageUrl.trim();
    imgElement.onerror = function() {
      this.src = "placeholderlogoimage.png";
    };
  } else {
    imgElement.src = "placeholderlogoimage.png";
  }
}

// ------------- QUOTE LOGIC -------------
document.getElementById("addToQuoteBtn").onclick = function() {
  if (!selectedProduct) return;
  let sellPrice = typeof selectedProduct.msrp === "number"
    ? selectedProduct.msrp
    : (typeof selectedProduct.map === "number"
      ? selectedProduct.map
      : (typeof selectedProduct.costPrice === "number"
        ? selectedProduct.costPrice * 1.35
        : 0));
  let markup = 0;
  if (typeof selectedProduct.costPrice === "number" && selectedProduct.costPrice > 0) {
    markup = ((sellPrice - selectedProduct.costPrice) / selectedProduct.costPrice) * 100;
  }
  window.quoteItems.push({
    ...selectedProduct,
    markup: parseFloat(markup.toFixed(2)),
    sellPrice: parseFloat(sellPrice.toFixed(2)),
    qty: 1
  });
  renderQuoteTable();
  updateQuoteSummary();
  updateGrandTotals();
  selectedProduct = null;
  document.getElementById("productDropdown").value = "";
  updateItemPreview();
  document.getElementById("addToQuoteBtn").disabled = true;
  document.getElementById("addSuccessNotification").innerText = "Item added to quote!";
  setTimeout(() => document.getElementById("addSuccessNotification").innerText = "", 1800);
};
function renderQuoteTable() {
  const tbody = document.getElementById("quoteItemsTbody");
  if (!tbody) return;
  if (window.quoteItems.length === 0) {
    document.getElementById("emptyQuoteMsg").style.display = "";
    tbody.innerHTML = "";
    return;
  } else {
    document.getElementById("emptyQuoteMsg").style.display = "none";
  }
tbody.innerHTML = window.quoteItems.map((item, idx) => `
  <tr data-idx="${idx}">
    <td class="col-drag"><span class="drag-handle" style="cursor: grab;">☰</span></td>
    <td class="col-image">
      <img src="${item.imageURL || item.imageUrl || 'placeholderlogoimage.png'}" 
           alt="${item.productName || ''}"
           onerror="this.src='placeholderlogoimage.png'">
    </td>
    <td class="col-product-name">${item.productName || ""}</td>
    <td class="col-product-number">${item.productNumber || ""}</td>
    <td class="col-description">${item.description || ""}</td>
    <td class="col-cost-price">${typeof item.costPrice === "number" ? `$${item.costPrice.toFixed(2)}` : ""}</td>
    <td class="col-markup">
      <span class="input-symbol-wrapper">
        <input 
          type="number" 
          min="0" 
          max="1000" 
          step="0.01" 
          value="${item.markup ?? 0}" 
          class="table-input-small"
          onchange="updateQuoteItem(${idx}, 'markup', this.value)">
        <span class="input-symbol input-symbol-right">%</span>
      </span>
    </td>
    <td class="col-msrp">${typeof item.msrp === "number" ? `$${item.msrp.toFixed(2)}` : ""}</td>
    <td class="col-sell-price">
      <span class="input-symbol-wrapper">
        <span class="input-symbol">$</span>
        <input 
          type="number" 
          min="0" 
          step="0.01" 
          value="${item.sellPrice ?? 0}" 
          class="table-input-small"
          onchange="updateQuoteItem(${idx}, 'sellPrice', this.value)">
      </span>
    </td>
    <td class="col-qty">
      <input 
        type="number" 
        min="1" 
        step="1" 
        value="${item.qty ?? 1}"
        class="table-input-qty"
        style="text-align:center;"
        onchange="updateQuoteItem(${idx}, 'qty', this.value)">
    </td>
    <td class="col-line-total">${typeof item.sellPrice === "number" && item.qty ? `$${(item.sellPrice * item.qty).toFixed(2)}` : ""}</td>
    <td class="col-actions">
      <button class="action-button" onclick="removeQuoteItem(${idx})">Remove</button>
    </td>
  </tr>
`).join("");
  if (!window.quoteTableSortable) {
    window.quoteTableSortable = Sortable.create(tbody, {
      animation: 150,
      handle: '.drag-handle',
      onEnd: function (evt) {
        const newOrder = Array.from(tbody.children).map(row => parseInt(row.dataset.idx, 10));
        window.quoteItems = newOrder.map(i => window.quoteItems[i]);
        renderQuoteTable();
        updateQuoteSummary();
        updateGrandTotals();
      }
    });
  } else {
    window.quoteTableSortable.option("disabled", false);
  }
}

function updateQuoteItem(idx, field, value) {
  if (!window.quoteItems[idx]) return;
  if (field === "markup") {
    window.quoteItems[idx].markup = parseFloat(value);
    if (typeof window.quoteItems[idx].costPrice === "number") {
      window.quoteItems[idx].sellPrice = parseFloat(
        (window.quoteItems[idx].costPrice * (1 + window.quoteItems[idx].markup / 100)).toFixed(2)
      );
    }
  } else if (field === "sellPrice") {
    window.quoteItems[idx].sellPrice = parseFloat(value);
    if (typeof window.quoteItems[idx].costPrice === "number" && window.quoteItems[idx].costPrice > 0) {
      window.quoteItems[idx].markup = parseFloat(
        (((window.quoteItems[idx].sellPrice - window.quoteItems[idx].costPrice) / window.quoteItems[idx].costPrice) * 100).toFixed(2)
      );
    }
  } else if (field === "qty") {
    window.quoteItems[idx].qty = parseInt(value, 10);
  }
  renderQuoteTable();
  updateQuoteSummary();
  updateGrandTotals();
}
function removeQuoteItem(idx) {
  window.quoteItems.splice(idx, 1);
  renderQuoteTable();
  updateQuoteSummary();
  updateGrandTotals();
}
function updateQuoteSummary() {
  let totalCost = 0;
  let totalSell = 0;
  window.quoteItems.forEach(item => {
    const qty = parseInt(item.qty, 10) || 1;
    const cost = typeof item.costPrice === "number" ? item.costPrice : 0;
    const sell = typeof item.sellPrice === "number" ? item.sellPrice : 0;
    totalCost += qty * cost;
    totalSell += qty * sell;
  });
  const profit = totalSell - totalCost;
  const grossProfitMargin = totalSell > 0 ? (profit / totalSell) * 100 : 0;
  if (document.getElementById("summaryCostTotal")) {
    document.getElementById("summaryCostTotal").innerText = `$${totalCost.toFixed(2)}`;
  }
  if (document.getElementById("summarySellTotal")) {
    document.getElementById("summarySellTotal").innerText = `$${totalSell.toFixed(2)}`;
  }
  if (document.getElementById("summaryProfitAmount")) {
    document.getElementById("summaryProfitAmount").innerText = `$${profit.toFixed(2)}`;
  }
  if (document.getElementById("summaryGPM")) {
    document.getElementById("summaryGPM").innerText = `${grossProfitMargin.toFixed(2)}%`;
  }
}

// ------------- LABOR SECTION -------------
function renderLaborSections() {
  window.laborSections = window.laborSections || [];

  const techRates = {
    "Todd - Specialist": 55.67,
    "Austin - Lead Tech": 52.81,
    "John - Technician": 48.75,
    "Joe - Technician": 40.63
  };
  const techList = Object.keys(techRates);

  // Subcontractor options and their daily rates
  const subOptions = [
    { label: "Kandel Services ($500 Per Day)", value: "kandel", rate: 500 },
    { label: "SmartHome and More (Dan - $450 Per Day)", value: "sham-dan", rate: 450 },
    { label: "SmartHome and More (Tech - $250 Per Day)", value: "sham-tech", rate: 250 }
  ];

  // Always initialize laborSections if empty
  if (window.laborSections.length === 0) {
    window.laborSections = [
      {
        ...laborConfig[0],
        numTechs: 1,
        numTechDays: 0.5,
        numSubs: 0,
        numSubDays: 0,
        clientRate: 150,
        techAssignments: ["Todd - Specialist"],
        subAssignments: [],
        manHours: 0,
        clientCost: 0,
        companyCost: 0,
        gpm: 0
      },
      {
        ...laborConfig[1],
        numTechs: 0,
        numTechDays: 0,
        numSubs: 0,
        numSubDays: 0,
        clientRate: 150,
        techAssignments: [],
        subAssignments: [],
        manHours: 0,
        clientCost: 0,
        companyCost: 0,
        gpm: 0
      },
      {
        ...laborConfig[2],
        numTechs: 0,
        numTechDays: 0,
        numSubs: 0,
        numSubDays: 0,
        clientRate: 100,
        techAssignments: [],
        subAssignments: [],
        manHours: 0,
        clientCost: 0,
        companyCost: 0,
        gpm: 0
      },
      {
        ...laborConfig[3],
        numTechs: 3,
        numTechDays: 1,
        numSubs: 0,
        numSubDays: 0,
        clientRate: 100,
        techAssignments: [
          "Austin - Lead Tech",
          "John - Technician",
          "Joe - Technician"
        ],
        subAssignments: [],
        manHours: 0,
        clientCost: 0,
        companyCost: 0,
        gpm: 0
      }
    ];
  }

  const laborSections = window.laborSections;
  const container = document.getElementById("laborItemsContainer");
  container.innerHTML = "";

  laborSections.forEach((section, idx) => {
    section.techAssignments = Array.isArray(section.techAssignments) ? section.techAssignments : [];
    section.subAssignments = Array.isArray(section.subAssignments) ? section.subAssignments : [];
    while (section.techAssignments.length < section.numTechs) section.techAssignments.push(techList[0]);
    while (section.techAssignments.length > section.numTechs) section.techAssignments.pop();
    while (section.subAssignments.length < section.numSubs) section.subAssignments.push(subOptions[0].value);
    while (section.subAssignments.length > section.numSubs) section.subAssignments.pop();
    section.numTechDays = Number(section.numTechDays) || 0;
    section.numSubDays = Number(section.numSubDays) || 0;

    const techSelectors = section.techAssignments.map(
      (tech, tIdx) => `
        <select class="labor-select-full" onchange="setTechAssignment(${idx}, ${tIdx}, this.value)">
          ${techList.map(
            t => `<option value="${t}" ${t === tech ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      `
    ).join("");

    const subSelectors = section.subAssignments.map(
      (sub, sIdx) => `
        <select class="labor-select-full" onchange="setSubAssignment(${idx}, ${sIdx}, this.value)">
          ${subOptions.map(
            opt => `<option value="${opt.value}" ${opt.value === sub ? "selected" : ""}>${opt.label}</option>`
          ).join("")}
        </select>
      `
    ).join("");

    const isPrewireOrInstall = section.id === "prewire" || section.id === "installation";

    let cardContent = '';

    if (isPrewireOrInstall) {
      // Use consistent layout for prewire/installation sections with subcontractors
      cardContent = `
        <div class="labor-card-content-wrapper">
          <div class="labor-card-main-content">
            <div class="labor-card-grid">
              <div class="labor-col internal-tech-col">
                <label>Internal Technicians</label>
                <input type="number" min="0" max="10" value="${section.numTechs}" step="1" class="labor-input-small" onchange="setNumTechs(${idx}, this.value)">
                <div class="tech-selectors">${techSelectors}</div>
              </div>
              <div class="labor-col days-tech-col">
                <label>Days Per Tech</label>
                <input type="number" min="0" step="1" value="${section.numTechDays}" class="labor-input-small" onchange="setNumTechDays(${idx}, this.value)">
              </div>
              <div class="labor-col rate-col">
                <label>Client Rate (per Man-Hour)</label>
                <input type="number" min="0" step="0.01" value="${section.clientRate}" class="labor-input-small" onchange="setClientRate(${idx}, this.value)">
              </div>
              <div class="subcontractor-group">
                <div class="labor-col subs-col">
                  <label>Subcontractors</label>
                  <input type="number" min="0" max="10" value="${section.numSubs}" step="1" class="labor-input-small" onchange="setNumSubs(${idx}, this.value)">
                  <div class="sub-selectors">${subSelectors}</div>
                </div>
                <div class="labor-col days-sub-col">
                  <label>Days (Subs)</label>
                  <input type="number" min="0" step="1" value="${section.numSubDays}" class="labor-input-small" onchange="setNumSubDays(${idx}, this.value)">
                </div>
              </div>
            </div>
          </div>
          <div class="labor-card-summary-container">
            <div class="labor-card-summary">
              <table class="summary-table-small">
                <tbody>
                  <tr><td>Total Man-Hours:</td><td id="labor-manhrs-${idx}">${(section.manHours||0).toFixed(1)}</td></tr>
                  <tr><td>Total Client Cost:</td><td id="labor-clientcost-${idx}">$${(section.clientCost||0).toFixed(2)}</td></tr>
                  <tr><td>Total Company Cost:</td><td id="labor-companycost-${idx}">$${(section.companyCost||0).toFixed(2)}</td></tr>
                  <tr><td>Gross Profit Margin:</td><td id="labor-gpm-${idx}">${(section.gpm||0).toFixed(1)}%</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } else {
      // Use consistent layout for non-subcontractor sections
      cardContent = `
        <div class="labor-card-content-wrapper">
          <div class="labor-card-main-content">
            <div class="labor-card-flexrows">
              <div class="labor-col">
                <label>Internal Technicians</label>
                <input type="number" min="0" max="10" value="${section.numTechs}" step="1"
                  class="labor-input-small" onchange="setNumTechs(${idx}, this.value)">
                <div class="tech-selectors">${techSelectors}</div>
              </div>
              <div class="labor-col">
                <label>Days Per Tech</label>
                <input type="number" min="0" step="1" value="${section.numTechDays}" class="labor-input-small" onchange="setNumTechDays(${idx}, this.value)">
              </div>
              <div class="labor-col">
                <label>Client Rate (per Man-Hour)</label>
                <input type="number" min="0" step="0.01" value="${section.clientRate}" class="labor-input-small" onchange="setClientRate(${idx}, this.value)">
              </div>
            </div>
          </div>
          <div class="labor-card-summary-container">
            <div class="labor-card-summary">
              <table class="summary-table-small">
                <tbody>
                  <tr><td>Total Man-Hours:</td><td id="labor-manhrs-${idx}">${(section.manHours||0).toFixed(1)}</td></tr>
                  <tr><td>Total Client Cost:</td><td id="labor-clientcost-${idx}">$${(section.clientCost||0).toFixed(2)}</td></tr>
                  <tr><td>Total Company Cost:</td><td id="labor-companycost-${idx}">$${(section.companyCost||0).toFixed(2)}</td></tr>
                  <tr><td>Gross Profit Margin:</td><td id="labor-gpm-${idx}">${(section.gpm||0).toFixed(1)}%</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    const card = document.createElement("div");
    card.className = "labor-card";
    card.innerHTML = `
      <div class="labor-card-header">${section.label}</div>
      ${cardContent}
    `;
    container.appendChild(card);
  });

  updateLaborSummary();
}

// --- Labor Section Event Helpers ---
function setNumTechs(idx, value) {
  const laborSections = window.laborSections;
  if (!laborSections || !laborSections[idx]) return;
  const n = Math.max(0, parseInt(value, 10) || 0);
  laborSections[idx].numTechs = n;
  while (laborSections[idx].techAssignments.length < n) laborSections[idx].techAssignments.push("Todd - Specialist");
  while (laborSections[idx].techAssignments.length > n) laborSections[idx].techAssignments.pop();
  renderLaborSections();
  updateGrandTotals();
}
function setNumTechDays(idx, value) {
  const laborSections = window.laborSections;
  if (!laborSections || !laborSections[idx]) return;
  const v = Math.max(0, typeof value === "number" ? value : parseFloat(value) || 0);
  laborSections[idx].numTechDays = v;
  renderLaborSections();
  updateGrandTotals();
}
function setNumSubs(idx, value) {
  const laborSections = window.laborSections;
  if (!laborSections || !laborSections[idx]) return;
  const subOptions = [
    { label: "Kandel Services ($500 Per Day)", value: "kandel", rate: 500 },
    { label: "SmartHome and More (Dan - $450 Per Day)", value: "sham-dan", rate: 450 },
    { label: "SmartHome and More (Tech - $250 Per Day)", value: "sham-tech", rate: 250 }
  ];
  const n = Math.max(0, parseInt(value, 10) || 0);
  laborSections[idx].numSubs = n;
  if (!Array.isArray(laborSections[idx].subAssignments)) laborSections[idx].subAssignments = [];
  while (laborSections[idx].subAssignments.length < n) laborSections[idx].subAssignments.push(subOptions[0].value);
  while (laborSections[idx].subAssignments.length > n) laborSections[idx].subAssignments.pop();
  renderLaborSections();
  updateGrandTotals();
}
function setNumSubDays(idx, value) {
  const laborSections = window.laborSections;
  if (!laborSections || !laborSections[idx]) return;
  const v = Math.max(0, typeof value === "number" ? value : parseFloat(value) || 0);
  laborSections[idx].numSubDays = v;
  renderLaborSections();
  updateGrandTotals();
}
function setClientRate(idx, value) {
  const laborSections = window.laborSections;
  if (!laborSections || !laborSections[idx]) return;
  const v = Math.max(0, parseFloat(value) || 0);
  laborSections[idx].clientRate = v;
  renderLaborSections();
  updateGrandTotals();
}
function setTechAssignment(idx, tIdx, techName) {
  const laborSections = window.laborSections;
  if (!laborSections || !laborSections[idx] || !Array.isArray(laborSections[idx].techAssignments)) return;
  laborSections[idx].techAssignments[tIdx] = techName;
  updateLaborSummary();
}
function setSubAssignment(idx, sIdx, subValue) {
  const laborSections = window.laborSections;
  if (!laborSections || !laborSections[idx] || !Array.isArray(laborSections[idx].subAssignments)) return;
  laborSections[idx].subAssignments[sIdx] = subValue;
  updateLaborSummary();
}

function updateLaborSummary() {
  const techRates = {
    "Todd - Specialist": 55.67,
    "Austin - Lead Tech": 52.81,
    "John - Technician": 48.75,
    "Joe - Technician": 40.63
  };
  // Subcontractor options and their daily rates
  const subOptions = {
    "kandel": 500,
    "sham-dan": 450,
    "sham-tech": 250
  };
  const SUB_MARKUP = 0.3; // 30%
  const laborSections = window.laborSections;
  let totalManHours = 0, totalClientCost = 0, totalCompanyCost = 0;
  laborSections.forEach((section, idx) => {
    // Internal Techs
    const techManHours = (section.techAssignments?.length || 0) * 8 * (parseFloat(section.numTechDays) || 0);
    const techClientCost = techManHours * (parseFloat(section.clientRate) || 0);
    let techCompanyCost = 0;
    for (const tech of (section.techAssignments || [])) {
      if (techRates[tech]) {
        techCompanyCost += techRates[tech] * (parseFloat(section.numTechDays) || 0) * 8;
      }
    }
    // Subcontractors: calculate company cost and client cost w/ markup
    let subCompanyCost = 0;
    let subClientCost = 0;
    for (const sub of (section.subAssignments || [])) {
      const rate = subOptions[sub] || 0;
      const thisSubCompany = rate * (parseFloat(section.numSubDays) || 0);
      subCompanyCost += thisSubCompany;
      subClientCost += thisSubCompany * (1 + SUB_MARKUP);
    }
    // Only techs count toward man-hours
    const manHours = techManHours;
    const clientCost = techClientCost + subClientCost;
    const companyCost = techCompanyCost + subCompanyCost;
    const profit = clientCost - companyCost;
    const gpm = clientCost ? 100 * profit / clientCost : 0;
    section.manHours = manHours;
    section.clientCost = clientCost;
    section.companyCost = companyCost;
    section.gpm = gpm;
    if (document.getElementById(`labor-manhrs-${idx}`)) document.getElementById(`labor-manhrs-${idx}`).innerText = manHours.toFixed(1);
    if (document.getElementById(`labor-clientcost-${idx}`)) document.getElementById(`labor-clientcost-${idx}`).innerText = `$${clientCost.toFixed(2)}`;
    if (document.getElementById(`labor-companycost-${idx}`)) document.getElementById(`labor-companycost-${idx}`).innerText = `$${companyCost.toFixed(2)}`;
    if (document.getElementById(`labor-gpm-${idx}`)) document.getElementById(`labor-gpm-${idx}`).innerText = `${gpm.toFixed(1)}%`;
    totalManHours += manHours;
    totalClientCost += clientCost;
    totalCompanyCost += companyCost;
  });
  if (document.getElementById("laborSummaryManHours")) document.getElementById("laborSummaryManHours").innerText = totalManHours.toFixed(1);
  if (document.getElementById("laborSummaryCostTotal")) document.getElementById("laborSummaryCostTotal").innerText = `$${totalCompanyCost.toFixed(2)}`;
  if (document.getElementById("laborSummarySellTotal")) document.getElementById("laborSummarySellTotal").innerText = `$${totalClientCost.toFixed(2)}`;
  const profit = totalClientCost - totalCompanyCost;
  const gpm = totalClientCost ? 100 * profit / totalClientCost : 0;
  if (document.getElementById("laborSummaryProfitAmount")) document.getElementById("laborSummaryProfitAmount").innerText = `$${profit.toFixed(2)}`;
  if (document.getElementById("laborSummaryGPM")) document.getElementById("laborSummaryGPM").innerText = `${gpm.toFixed(2)}%`;
}

function updateGrandTotals() {
  // Equipment
  const eqCost = (window.quoteItems || []).reduce((sum, i) => sum + ((i.costPrice || 0) * (i.qty || 1)), 0);
  const eqClient = (window.quoteItems || []).reduce((sum, i) => sum + ((i.sellPrice || 0) * (i.qty || 1)), 0);
  //console.log('updateGrandTotals called', eqClient);
  // Labor
  const laborSections = window.laborSections || [];
  const laborCompanyCost = laborSections.reduce((sum, s) => sum + (s.companyCost || 0), 0);
  const laborClient = laborSections.reduce((sum, s) => sum + (s.clientCost || 0), 0);

  // Adjustments
  const discountPct = parseFloat(document.getElementById("discountPercent")?.value) || 0;
  const shippingPct = parseFloat(document.getElementById("shippingPercent")?.value) || 0;
  const salesTaxPct = parseFloat(document.getElementById("salesTaxPercent")?.value) || 0;

  // Math
  const combinedSubtotal = eqClient + laborClient;
  const discountAmount = combinedSubtotal * discountPct / 100;
  const subtotalAfterDiscount = combinedSubtotal - discountAmount;
  const shippingAmount = eqClient * shippingPct / 100;
  const salesTaxAmount = subtotalAfterDiscount * salesTaxPct / 100;
  const finalTotal = subtotalAfterDiscount + shippingAmount + salesTaxAmount;

  // Company cost and profit
  const grandCompanyCost = eqCost + laborCompanyCost;
  const overallProfit = finalTotal - grandCompanyCost;
  const gpm = finalTotal ? 100 * overallProfit / finalTotal : 0;

  // DOM updates (defensive for missing DOM elements)
  const setVal = (id, val) => { const e = document.getElementById(id); if(e) e.innerText = val; };
  setVal("grandEquipmentClientTotal", `$${eqClient.toFixed(2)}`);
  setVal("grandLaborClientTotal", `$${laborClient.toFixed(2)}`);
  setVal("grandCombinedSubtotal", `$${combinedSubtotal.toFixed(2)}`);
  setVal("grandDiscountAmount", `-$${discountAmount.toFixed(2)}`);
  setVal("grandSubtotalAfterDiscount", `$${subtotalAfterDiscount.toFixed(2)}`);
  setVal("grandShippingAmount", `$${shippingAmount.toFixed(2)}`);
  setVal("grandSalesTaxAmount", `$${salesTaxAmount.toFixed(2)}`);
  setVal("finalGrandTotal", `$${finalTotal.toFixed(2)}`);
  setVal("grandEquipmentCompanyCost", `$${eqCost.toFixed(2)}`);
  setVal("grandLaborCompanyCost", `$${laborCompanyCost.toFixed(2)}`);
  setVal("grandOverallCompanyCost", `$${grandCompanyCost.toFixed(2)}`);
  setVal("grandOverallProfitAmount", `$${overallProfit.toFixed(2)}`);
  setVal("grandOverallGPM", `${gpm.toFixed(2)}%`);
}

// Listen for adjustment changes
["discountPercent", "shippingPercent", "salesTaxPercent"].forEach(id => {
  document.getElementById(id).onchange = updateGrandTotals;
});

// ------------- QUOTES & TEMPLATES LOAD/SIDEBAR -------------
async function loadQuotesAndTemplates() {
  const quotesSnap = await db.collection("quotes").orderBy("lastEditedAt", "desc").get();
  savedQuotes = quotesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const templatesSnap = await db.collection("templates").orderBy("lastEditedAt", "desc").get();
  templates = templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
function renderSidebar() {
  const savedQuotesList = document.getElementById("savedQuotesList");
  savedQuotesList.innerHTML = "";
  savedQuotes.forEach(q => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "quote-sidebar-row";
    const mainBtn = document.createElement("button");
    mainBtn.textContent = q.projectNameNumber || "(No Project Name)";
    mainBtn.className = "sidebar-load-btn";
    mainBtn.style.background = "none";
    mainBtn.style.border = "none";
    mainBtn.style.padding = "0";
    mainBtn.style.color = "#003366";
    mainBtn.style.fontWeight = "600";
    mainBtn.style.fontSize = "1.04em";
    mainBtn.style.cursor = "pointer";
    mainBtn.onclick = () => loadQuoteById(q.id);
    row.appendChild(mainBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "sidebar-delete-btn";
    delBtn.title = "Delete";
    delBtn.innerHTML = "&#10005;";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm("Delete this saved quote? This can't be undone.")) {
        db.collection("quotes").doc(q.id).delete().then(() => {
          savedQuotes = savedQuotes.filter(qq => qq.id !== q.id);
          renderSidebar();
          showNotification("Quote deleted.", "success");
        }).catch(err => {
          showNotification("Failed to delete quote.", "error");
        });
      }
    };
    row.appendChild(delBtn);
    li.appendChild(row);
    const meta = document.createElement("div");
    meta.className = "quote-sidebar-meta";
    let status = q.quoteStatus || "Draft";
    let who = q.lastEditedBy || "";
    let when = q.lastEditedAt && q.lastEditedAt.toDate ? q.lastEditedAt.toDate() : null;
    let whenStr = when ? when.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    meta.innerHTML = `<div>Status: <b>${status}</b></div><div>Last edited by: <b>${who}</b></div>${whenStr ? `<div>${whenStr}</div>` : ""}`;
    li.appendChild(meta);
    savedQuotesList.appendChild(li);
  });
  const templateList = document.getElementById("templateList");
  templateList.innerHTML = "";
  templates.forEach(t => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "quote-sidebar-row";
    const mainBtn = document.createElement("button");
    mainBtn.textContent = t.templateName || "(No Template Name)";
    mainBtn.className = "sidebar-load-btn";
    mainBtn.style.background = "none";
    mainBtn.style.border = "none";
    mainBtn.style.padding = "0";
    mainBtn.style.color = "#003366";
    mainBtn.style.fontWeight = "600";
    mainBtn.style.fontSize = "1.04em";
    mainBtn.style.cursor = "pointer";
    mainBtn.onclick = () => loadTemplateById(t.id);
    row.appendChild(mainBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "sidebar-delete-btn";
    delBtn.title = "Delete";
    delBtn.innerHTML = "&#10005;";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm("Delete this template? This can't be undone.")) {
        db.collection("templates").doc(t.id).delete().then(() => {
          templates = templates.filter(tt => tt.id !== t.id);
          renderSidebar();
          showNotification("Template deleted.", "success");
        }).catch(err => {
          showNotification("Failed to delete template.", "error");
        });
      }
    };
    row.appendChild(delBtn);
    li.appendChild(row);
    const meta = document.createElement("div");
    meta.className = "quote-sidebar-meta";
    let who = t.lastEditedBy || "";
    let when = t.lastEditedAt && t.lastEditedAt.toDate ? t.lastEditedAt.toDate() : null;
    let whenStr = when ? when.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    meta.innerHTML = `<div>Last edited by: <b>${who}</b></div>${whenStr ? `<div>${whenStr}</div>` : ""}`;
    li.appendChild(meta);
    templateList.appendChild(li);
  });
}
document.getElementById("loadQuoteBarBtn").onclick = function() {
  loadQuotesAndTemplates().then(renderSidebar);
  document.getElementById("loadQuoteSidebar").style.display = "block";
};
document.getElementById("closeLoadQuoteSidebarBtn").onclick = function() {
  document.getElementById("loadQuoteSidebar").style.display = "none";
};
// Update the loadQuoteById function to restore customer selection
async function loadQuoteById(id) {
  try {
    const doc = await db.collection("quotes").doc(id).get();
    if (!doc.exists) throw new Error("Quote not found");
    
    const q = doc.data();
    
    document.getElementById("projectNameNumber").value = q.projectNameNumber || "";
    document.getElementById("quoteStatusSelector").value = q.quoteStatus || "Draft";
    document.getElementById("discountPercent").value = q.discountPercent || 0;
    document.getElementById("shippingPercent").value = q.shippingPercent || 0;
    document.getElementById("salesTaxPercent").value = q.salesTaxPercent || 0;
    document.getElementById("sowFullOutputText").value = q.sowText || "";
    
    // Restore customer selection
    if (q.customerId && q.customerInfo) {
      document.getElementById("customerAccountSelector").value = q.customerId;
      // **Set the selected customer with the new data and ID**
window.selectedQuoteCustomer = {
  id: docRef.id,
  ...customerData
};

// Update the customer selector dropdown
await loadCustomerDropdown();
document.getElementById("customerAccountSelector").value = docRef.id;
updateSelectedCustomerDisplay(window.selectedQuoteCustomer);

      document.getElementById("selectedCustomerInfo").style.display = "block";
    } else {
      document.getElementById("customerAccountSelector").value = "";
      window.selectedQuoteCustomer = null;
      document.getElementById("selectedCustomerInfo").style.display = "none";
    }
    
    window.quoteItems = Array.isArray(q.quoteItems) ? q.quoteItems : [];
    window.laborSections = Array.isArray(q.laborSections) ? q.laborSections : [];
    
    activeQuoteId = id;
    activeTemplateId = null;
    
    renderQuoteTable();
    renderLaborSections();
    updateQuoteSummary();
    updateGrandTotals();
    
    document.getElementById("loadQuoteSidebar").style.display = "none";
    showNotification("Quote loaded.", "success");
  } catch (e) {
    showNotification("Failed to load quote.", "error");
  }
}

async function loadTemplateById(id) {
  try {
    const doc = await db.collection("templates").doc(id).get();
    if (!doc.exists) throw new Error("Template not found");
    const t = doc.data();
    document.getElementById("projectNameNumber").value = t.templateName || "";
    document.getElementById("quoteStatusSelector").value = "Draft";
    document.getElementById("discountPercent").value = t.discountPercent || 0;
    document.getElementById("shippingPercent").value = t.shippingPercent || 0;
    document.getElementById("salesTaxPercent").value = t.salesTaxPercent || 0;
    document.getElementById("sowFullOutputText").value = t.sowText || "";
    window.quoteItems = Array.isArray(t.quoteItems) ? t.quoteItems : [];
    window.laborSections = Array.isArray(t.laborSections) ? t.laborSections : [];
    activeQuoteId = null;
    activeTemplateId = id;
    renderQuoteTable();
    renderLaborSections();
    updateQuoteSummary();
    updateGrandTotals();
    document.getElementById("loadQuoteSidebar").style.display = "none";
    showNotification("Template loaded.", "success");
  } catch (e) {
    showNotification("Failed to load template.", "error");
  }
}
document.getElementById("saveQuoteBtn").onclick = saveQuote;
document.getElementById("saveQuoteBarBtn").onclick = saveQuote;
// Update the saveQuote function to include customer information





// ------------- CLEAN QUOTE SAVE/LOAD SYSTEM -------------

// ------------- CALCULATION FUNCTIONS -------------
function calculateSubtotal() {
  try {
    let subtotal = 0;
    
    if (window.quoteItems && Array.isArray(window.quoteItems)) {
      subtotal += window.quoteItems.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return sum + (price * quantity);
      }, 0);
    }
    
    if (window.laborSections && Array.isArray(window.laborSections)) {
      subtotal += window.laborSections.reduce((sum, section) => {
        const rate = parseFloat(section.rate) || 0;
        const hours = parseFloat(section.hours) || 0;
        return sum + (rate * hours);
      }, 0);
    }
    
    return subtotal;
  } catch (error) {
    console.error("Error calculating subtotal:", error);
    return 0;
  }
}

function calculateTax() {
  try {
    const subtotal = calculateSubtotal();
    const taxRate = 0.08; // 8% tax rate
    return subtotal * taxRate;
  } catch (error) {
    console.error("Error calculating tax:", error);
    return 0;
  }
}

function calculateTotal() {
  try {
    return calculateSubtotal() + calculateTax();
  } catch (error) {
    console.error("Error calculating total:", error);
    return 0;
  }
}

function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return "$0.00";
  }
}

function updateQuoteTotals() {
  try {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const total = calculateTotal();
    
    const subtotalElement = document.getElementById("quoteSubtotal");
    if (subtotalElement) {
      subtotalElement.textContent = formatCurrency(subtotal);
    }
    
    const taxElement = document.getElementById("quoteTax");
    if (taxElement) {
      taxElement.textContent = formatCurrency(tax);
    }
    
    const totalElement = document.getElementById("quoteTotal");
    if (totalElement) {
      totalElement.textContent = formatCurrency(total);
    }
  } catch (error) {
    console.error("Error updating quote totals in UI:", error);
  }
}

// ------------- SAVE QUOTE FUNCTION -------------
async function saveQuote() {
  try {
    console.log("Starting quote save process...");
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showNotification("Please log in to save quotes", "error");
      return;
    }
    
    const projectName = document.getElementById("projectNameNumber").value.trim();
    if (!projectName) {
      showNotification("Please enter a project name", "error");
      return;
    }
    
    const quoteData = {
      projectName: projectName,
      customerId: window.selectedQuoteCustomer ? window.selectedQuoteCustomer.id : null,
      customerData: window.selectedQuoteCustomer || null,
      quoteItems: window.quoteItems || [],
      laborSections: window.laborSections || [],
      quoteNumber: document.getElementById("quoteNumber") ? document.getElementById("quoteNumber").value : null,
      quoteDate: document.getElementById("quoteDate") ? document.getElementById("quoteDate").value : new Date().toISOString().split('T')[0],
      validUntil: document.getElementById("validUntil") ? document.getElementById("validUntil").value : null,
      sowContent: window.tinymceInstances && window.tinymceInstances.sowAiPromptText ? 
                  window.tinymceInstances.sowAiPromptText.getContent() : "",
      taskList: window.taskList || [],
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total: calculateTotal(),
      userId: currentUser.uid,
      createdBy: currentUser.email,
      lastModified: firebase.firestore.FieldValue.serverTimestamp(),
      lastModifiedBy: currentUser.email,
      status: "draft"
    };
    
    const isUpdating = window.currentQuoteId && window.currentQuoteId.trim() !== "";
    
    if (isUpdating) {
      console.log("Updating existing quote:", window.currentQuoteId);
      await db.collection("quotes").doc(window.currentQuoteId).update(quoteData);
      showNotification(`Quote "${projectName}" updated successfully!`, "success");
      return window.currentQuoteId;
    } else {
      console.log("Creating new quote");
      quoteData.created = firebase.firestore.FieldValue.serverTimestamp();
      
      const docRef = await db.collection("quotes").add(quoteData);
      window.currentQuoteId = docRef.id;
      console.log("New quote created with ID:", docRef.id);
      
      showNotification(`Quote "${projectName}" saved successfully!`, "success");
      updateQuoteTotals();
      
      return docRef.id;
    }
    
  } catch (error) {
    console.error("Error saving quote:", error);
    showNotification("Error saving quote: " + error.message, "error");
  }
}

// ------------- NEW QUOTE FUNCTION -------------
function newQuote() {
  try {
    console.log("Creating new quote...");
    
    window.currentQuoteId = null;
    window.quoteItems = [];
    window.laborSections = [];
    window.taskList = [];
    window.selectedQuoteCustomer = null;
    
    const projectNameField = document.getElementById("projectNameNumber");
    if (projectNameField) projectNameField.value = "";
    
    const customerDropdown = document.getElementById("customerAccountSelector");
    if (customerDropdown) customerDropdown.value = "";
    
    const quoteNumberField = document.getElementById("quoteNumber");
    if (quoteNumberField) quoteNumberField.value = "";
    
    const quoteDateField = document.getElementById("quoteDate");
    if (quoteDateField) quoteDateField.value = new Date().toISOString().split('T')[0];
    
    const validUntilField = document.getElementById("validUntil");
    if (validUntilField) validUntilField.value = "";
    
    if (window.tinymceInstances && window.tinymceInstances.sowAiPromptText) {
      window.tinymceInstances.sowAiPromptText.setContent("");
    }
    
    if (typeof refreshQuoteItemsTable === 'function') refreshQuoteItemsTable();
    if (typeof refreshLaborTable === 'function') refreshLaborTable();
    if (typeof refreshTaskList === 'function') refreshTaskList();
    
    updateQuoteTotals();
    showNotification("New quote created", "success");
    
  } catch (error) {
    console.error("Error creating new quote:", error);
    showNotification("Error creating new quote", "error");
  }
}

// ------------- ADD THIS DEBUGGING CODE TO CATCH WHAT'S CLEARING THE QUOTES -------------
function watchForQuoteListChanges() {
  const quotesListElement = document.getElementById("savedQuotesList");
  if (!quotesListElement) return;
  
  // Create a MutationObserver to watch for changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        console.log("🔍 MUTATION DETECTED: savedQuotesList content changed!");
        console.log("📝 New content:", quotesListElement.innerHTML);
        console.log("📝 Number of children:", quotesListElement.children.length);
        
        // Get the stack trace to see what function caused this
        console.trace("📍 STACK TRACE - What cleared the quotes:");
      }
    });
  });
  
  // Start observing
  observer.observe(quotesListElement, {
    childList: true,
    subtree: true
  });
  
  console.log("👁️ Now watching savedQuotesList for changes...");
  
  // Stop watching after 10 seconds
  setTimeout(() => {
    observer.disconnect();
    console.log("👁️ Stopped watching savedQuotesList");
  }, 10000);
}

// ------------- UPDATED LOAD QUOTES LIST WITH WATCHER -------------
async function loadQuotesList() {
  try {
    console.log("=== LOADING QUOTES LIST ===");
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("❌ No user logged in");
      showNotification("Please log in to view quotes", "error");
      return;
    }
    
    console.log("✅ Current user email:", currentUser.email);
    console.log("✅ Current user UID:", currentUser.uid);
    
    // Show the sidebar
    const sidebar = document.getElementById("loadQuoteSidebar");
    if (sidebar) {
      sidebar.style.display = "block";
      console.log("✅ Sidebar opened");
    }
    
    // Check if the quotes list element exists
    const quotesListElement = document.getElementById("savedQuotesList");
    if (!quotesListElement) {
      console.error("❌ savedQuotesList element not found in DOM");
      return;
    }
    
    // Start watching for changes
    watchForQuoteListChanges();
    
    console.log("✅ About to show loading message");
    
    // Add loading message
    quotesListElement.innerHTML = `
      <li style="padding: 16px; text-align: center; color: #666;">
        Loading quotes...
      </li>
    `;
    
    console.log("✅ Loading message displayed");
    
    // Get user's quotes
    console.log("🔍 Querying database for quotes...");
    const snapshot = await db.collection("quotes")
      .where("userId", "==", currentUser.uid)
      .get();
    
    console.log(`📊 Found ${snapshot.size} quotes for user`);
    
    // Convert to array and sort by last modified
    const quotes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      quotes.push({
        id: doc.id,
        ...data,
        sortTimestamp: data.lastModified ? data.lastModified.toMillis() : 
                      (data.created ? data.created.toMillis() : 0)
      });
    });
    
    quotes.sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    
    console.log("🎨 About to display quotes...");
    console.log("📝 Quotes to display:", quotes.map(q => ({ id: q.id, name: q.projectName })));
    
    // Display the quotes with the enhanced function
    displayQuotesList(quotes);
    
    console.log("✅ displayQuotesList completed");
    
  } catch (error) {
    console.error("❌ Error loading quotes:", error);
    showNotification("Error loading quotes: " + error.message, "error");
  }
}

// ------------- ENHANCED DEBUG DISPLAY FUNCTION -------------
function displayQuotesList(quotes) {
  try {
    console.log("🎨 Starting displayQuotesList with", quotes.length, "quotes");
    
    const quotesListElement = document.getElementById("savedQuotesList");
    if (!quotesListElement) {
      console.error("❌ savedQuotesList element not found in displayQuotesList");
      return;
    }
    
    console.log("✅ quotesListElement found, clearing existing content");
    quotesListElement.innerHTML = "";
    
    if (quotes.length === 0) {
      console.log("📝 No quotes to display, showing empty message");
      const noQuotesItem = document.createElement("li");
      noQuotesItem.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #666; font-style: italic;">
          No saved quotes found.<br>Create and save your first quote!
        </div>`;
      quotesListElement.appendChild(noQuotesItem);
      console.log("✅ Empty message added");
      return;
    }
    
    console.log("🎨 Creating quote items...");
    
    quotes.forEach((quote, index) => {
      console.log(`📝 Creating quote item ${index + 1}:`, quote.projectName);
      
      const listItem = document.createElement("li");
      listItem.style.cssText = `
        margin: 0 0 12px 0;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      `;
      
      // Determine last modified info
      let lastModified = 'Unknown';
      let lastModifiedBy = 'Unknown';
      if (quote.lastModified) {
        lastModified = new Date(quote.lastModified.toDate()).toLocaleDateString();
      } else if (quote.created) {
        lastModified = new Date(quote.created.toDate()).toLocaleDateString();
      }
      
      if (quote.lastModifiedBy) {
        lastModifiedBy = quote.lastModifiedBy;
      } else if (quote.updatedBy) {
        lastModifiedBy = quote.updatedBy;
      } else if (quote.createdBy) {
        lastModifiedBy = quote.createdBy;
      }
      
      // Get quote status with color coding
      const status = quote.status || 'draft';
      const statusColors = {
        'draft': { bg: '#f8f9fa', text: '#6c757d', border: '#dee2e6' },
        'sent': { bg: '#e3f2fd', text: '#1976d2', border: '#bbdefb' },
        'accepted': { bg: '#e8f5e8', text: '#2e7d32', border: '#c8e6c8' },
        'changes': { bg: '#fff3cd', text: '#856404', border: '#ffeaa7' },
        'archived': { bg: '#f5f5f5', text: '#495057', border: '#d6d8db' }
      };
      
      const statusColor = statusColors[status.toLowerCase()] || statusColors['draft'];
      
      listItem.innerHTML = `
        <!-- Main clickable area -->
        <div id="quoteMain_${quote.id}" style="
          padding: 14px 16px;
          cursor: pointer;
          background: transparent;
          transition: background-color 0.2s ease;
        ">
          <!-- Project name -->
          <div style="font-weight: 600; color: #003366; margin-bottom: 6px; font-size: 1.05em;">
            ${quote.projectName || 'Untitled Quote'}
          </div>
          
          <!-- Customer info -->
          <div style="font-size: 0.9em; color: #666; margin-bottom: 6px;">
            ${quote.customerData ? `${quote.customerData.firstName} ${quote.customerData.lastName}` : 'No customer assigned'}
          </div>
          
          <!-- Status badge -->
          <div style="margin-bottom: 8px;">
            <span style="
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 0.75em;
              font-weight: 600;
              text-transform: uppercase;
              background: ${statusColor.bg};
              color: ${statusColor.text};
              border: 1px solid ${statusColor.border};
            ">
              ${status}
            </span>
          </div>
          
          <!-- Total and date row -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.9em; color: #0059b3; font-weight: 600;">
              ${formatCurrency(quote.total || 0)}
            </span>
            <span style="font-size: 0.8em; color: #888;">
              ${lastModified}
            </span>
          </div>
          
          <!-- Last updated by -->
          <div style="font-size: 0.8em; color: #999; margin-bottom: 8px;">
            Updated by: ${lastModifiedBy}
          </div>
        </div>
        
        <!-- Action buttons bar -->
        <div style="
          display: flex;
          border-top: 1px solid #e9ecef;
          background: #f1f3f5;
        ">
          <button id="loadBtn_${quote.id}" style="
            flex: 1;
            padding: 10px;
            background: none;
            border: none;
            color: #0059b3;
            font-weight: 600;
            font-size: 0.9em;
            cursor: pointer;
            transition: background-color 0.2s ease;
            border-right: 1px solid #e9ecef;
          " title="Load this quote">
            📄 Load
          </button>
          <button id="deleteBtn_${quote.id}" style="
            flex: 1;
            padding: 10px;
            background: none;
            border: none;
            color: #dc3545;
            font-weight: 600;
            font-size: 0.9em;
            cursor: pointer;
            transition: background-color 0.2s ease;
          " title="Delete this quote">
            🗑️ Delete
          </button>
        </div>
      `;
      
      quotesListElement.appendChild(listItem);
      console.log(`✅ Added quote item ${index + 1} to DOM`);
      
      // Add event listeners - but delay them slightly
      setTimeout(() => {
        // Main area click to load quote
        const mainArea = document.getElementById(`quoteMain_${quote.id}`);
        if (mainArea) {
          mainArea.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f0f7ff';
          });
          
          mainArea.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent';
          });
          
          mainArea.addEventListener('click', function() {
            console.log("Quote main area clicked:", quote.id);
            loadQuoteFromList(quote.id);
          });
        }
        
        // Load button
        const loadBtn = document.getElementById(`loadBtn_${quote.id}`);
        if (loadBtn) {
          loadBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#e3f2fd';
          });
          
          loadBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent';
          });
          
          loadBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log("Load button clicked:", quote.id);
            loadQuoteFromList(quote.id);
          });
        }
        
        // Delete button
        const deleteBtn = document.getElementById(`deleteBtn_${quote.id}`);
        if (deleteBtn) {
          deleteBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#ffeaea';
          });
          
          deleteBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent';
          });
          
          deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log("Delete button clicked:", quote.id);
            deleteQuoteFromSidebar(quote.id, quote.projectName);
          });
        }
      }, 100); // Small delay to ensure DOM is ready
    });
    
    console.log(`🎉 Successfully displayed ${quotes.length} quotes with enhanced features`);
    
    // Double-check after a moment
    setTimeout(() => {
      const finalCheck = document.getElementById("savedQuotesList");
      if (finalCheck && finalCheck.children.length > 0) {
        console.log("✅ FINAL CHECK: Quotes still visible after displayQuotesList completed");
      } else {
        console.log("❌ FINAL CHECK: Quotes disappeared after displayQuotesList!");
        console.log("Final innerHTML:", finalCheck ? finalCheck.innerHTML : 'Element not found');
      }
    }, 500);
    
  } catch (error) {
    console.error("❌ Error in displayQuotesList:", error);
  }
}

// ------------- DELETE QUOTE FROM SIDEBAR ------------- 

async function deleteQuoteFromSidebar(quoteId, projectName) {
  try {
    console.log("Attempting to delete quote:", quoteId, projectName);
    
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to delete the quote "${projectName}"?\n\nThis action cannot be undone.`);
    
    if (!confirmed) {
      console.log("Delete cancelled by user");
      return;
    }
    
    console.log("Delete confirmed, proceeding...");
    
    // Show loading notification
    showNotification("Deleting quote...", "info");
    
    // Delete from Firestore
    await db.collection("quotes").doc(quoteId).delete();
    
    console.log("Quote deleted successfully from database");
    showNotification(`Quote "${projectName}" deleted successfully`, "success");
    
    // If this was the currently loaded quote, clear it
    if (window.currentQuoteId === quoteId) {
      console.log("Deleted quote was currently loaded, creating new quote");
      newQuote();
    }
    
    // Refresh the quotes list
    loadQuotesList();
    
  } catch (error) {
    console.error("Error deleting quote:", error);
    showNotification("Error deleting quote: " + error.message, "error");
  }
}


// ------------- ENHANCED LOAD QUOTE FROM LIST -------------
async function loadQuoteFromList(quoteId) {
  try {
    console.log("Loading quote from list:", quoteId);
    
    // Show loading notification
    showNotification("Loading quote...", "info");
    
    // Close the sidebar
    const sidebar = document.getElementById("loadQuoteSidebar");
    if (sidebar) {
      sidebar.style.display = "none";
    }
    
    // Load the quote
    await loadQuote(quoteId);
    
  } catch (error) {
    console.error("Error loading quote from list:", error);
    showNotification("Error loading quote", "error");
  }
}

// ------------- UPDATE STATUS FUNCTION (if needed) -------------

async function updateQuoteStatus(quoteId, newStatus) {
  try {
    console.log("Updating quote status:", quoteId, "to", newStatus);
    
    await db.collection("quotes").doc(quoteId).update({
      status: newStatus,
      lastModified: firebase.firestore.FieldValue.serverTimestamp(),
      lastModifiedBy: auth.currentUser.email
    });
    
    showNotification("Quote status updated", "success");
    
    // Refresh the quotes list if sidebar is open
    const sidebar = document.getElementById("loadQuoteSidebar");
    if (sidebar && sidebar.style.display !== "none") {
      loadQuotesList();
    }
    
  } catch (error) {
    console.error("Error updating quote status:", error);
    showNotification("Error updating status", "error");
  }
}


// ------------- LOAD QUOTE FUNCTION -------------
async function loadQuote(quoteId) {
  try {
    console.log("Loading quote:", quoteId);
    
    if (!quoteId) {
      showNotification("Invalid quote ID", "error");
      return;
    }
    
    showNotification("Loading quote...", "info");
    
    const quoteDoc = await db.collection("quotes").doc(quoteId).get();
    
    if (!quoteDoc.exists) {
      showNotification("Quote not found", "error");
      return;
    }
    
    const quoteData = quoteDoc.data();
    console.log("Quote data loaded:", quoteData);
    
    // Set current quote ID for future updates
    window.currentQuoteId = quoteId;
    
    // Load basic quote information
    if (quoteData.projectName) {
      const projectNameField = document.getElementById("projectNameNumber");
      if (projectNameField) projectNameField.value = quoteData.projectName;
    }
    
    if (quoteData.quoteNumber) {
      const quoteNumberField = document.getElementById("quoteNumber");
      if (quoteNumberField) quoteNumberField.value = quoteData.quoteNumber;
    }
    
    if (quoteData.quoteDate) {
      const quoteDateField = document.getElementById("quoteDate");
      if (quoteDateField) quoteDateField.value = quoteData.quoteDate;
    }
    
    if (quoteData.validUntil) {
      const validUntilField = document.getElementById("validUntil");
      if (validUntilField) validUntilField.value = quoteData.validUntil;
    }
    
    // Load customer
    if (quoteData.customerId) {
      try {
        await loadCustomerDropdown();
        const customerDropdown = document.getElementById("customerAccountSelector");
        if (customerDropdown) {
          customerDropdown.value = quoteData.customerId;
          window.selectedQuoteCustomer = quoteData.customerData;
          if (typeof handleCustomerSelection === 'function') {
            handleCustomerSelection();
          }
        }
      } catch (customerError) {
        console.warn("Could not load customer:", customerError);
        if (quoteData.customerData) {
          window.selectedQuoteCustomer = quoteData.customerData;
        }
      }
    }
    
    // Load quote items and labor
    if (quoteData.quoteItems) {
      window.quoteItems = quoteData.quoteItems;
      if (typeof refreshQuoteItemsTable === 'function') refreshQuoteItemsTable();
    }
    
    if (quoteData.laborSections) {
      window.laborSections = quoteData.laborSections;
      if (typeof refreshLaborTable === 'function') refreshLaborTable();
    }
    
    // Load SOW content
    if (quoteData.sowContent && window.tinymceInstances && window.tinymceInstances.sowAiPromptText) {
      window.tinymceInstances.sowAiPromptText.setContent(quoteData.sowContent);
    }
    
    // Load task list
    if (quoteData.taskList) {
      window.taskList = quoteData.taskList;
      if (typeof refreshTaskList === 'function') refreshTaskList();
    }
    
    // Update totals
    updateQuoteTotals();
    
    showNotification("Quote loaded successfully", "success");
    
    return quoteData;
    
  } catch (error) {
    console.error("Error loading quote:", error);
    showNotification("Error loading quote: " + error.message, "error");
  }
}

// ------------- CUSTOMER DROPDOWN LOADER -------------
async function loadCustomerDropdown() {
  try {
    const snapshot = await db.collection("customerAccounts")
      .orderBy("created", "desc")
      .get();
    
    const dropdown = document.getElementById("customerAccountSelector");
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Select a customer account...</option>';
    
    snapshot.forEach(doc => {
      const customer = { id: doc.id, ...doc.data() };
      const option = document.createElement("option");
      option.value = customer.id;
      option.textContent = `${customer.firstName} ${customer.lastName}${customer.companyName ? ` (${customer.companyName})` : ''}`;
      dropdown.appendChild(option);
    });
    
  } catch (error) {
    console.error("Error loading customer dropdown:", error);
  }
}

// ------------- CLOSE SIDEBAR BUTTON -------------
document.addEventListener('DOMContentLoaded', function() {
  const closeBtn = document.getElementById("closeLoadQuoteSidebarBtn");
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      const sidebar = document.getElementById("loadQuoteSidebar");
      if (sidebar) {
        sidebar.style.display = "none";
      }
    });
  }
});


// ------------- ADD THIS TO CONNECT YOUR LOAD QUOTE BUTTON -------------


document.addEventListener('DOMContentLoaded', function() {
  // Connect the Load Quote button
  const loadQuoteBarBtn = document.getElementById("loadQuoteBarBtn");
  if (loadQuoteBarBtn) {
    loadQuoteBarBtn.addEventListener('click', function() {
      console.log("Load Quote button clicked!");
      loadQuotesList();
    });
  }
  
  // Connect the Save Quote button (both of them)
  const saveQuoteBtn = document.getElementById("saveQuoteBtn");
  if (saveQuoteBtn) {
    saveQuoteBtn.addEventListener('click', function() {
      console.log("Save Quote button clicked!");
      saveQuote();
    });
  }
  
  const saveQuoteBarBtn = document.getElementById("saveQuoteBarBtn");
  if (saveQuoteBarBtn) {
    saveQuoteBarBtn.addEventListener('click', function() {
      console.log("Save Quote bar button clicked!");
      saveQuote();
    });
  }
  
  // Connect the New Quote button
  const newQuoteBarBtn = document.getElementById("newQuoteBarBtn");
  if (newQuoteBarBtn) {
    newQuoteBarBtn.addEventListener('click', function() {
      console.log("New Quote button clicked!");
      newQuote();
    });
  }
  
  // Connect the close sidebar button
  const closeBtn = document.getElementById("closeLoadQuoteSidebarBtn");
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      const sidebar = document.getElementById("loadQuoteSidebar");
      if (sidebar) {
        sidebar.style.display = "none";
      }
    });
  }
});





document.getElementById("saveAsTemplateBarBtn").onclick = saveAsTemplatePrompt;
async function saveAsTemplatePrompt() {
  const templateName = prompt("Enter a name for this template:");
  if (!templateName) return;
  try {
    const discountPercent = parseFloat(document.getElementById("discountPercent").value) || 0;
    const shippingPercent = parseFloat(document.getElementById("shippingPercent").value) || 0;
    const salesTaxPercent = parseFloat(document.getElementById("salesTaxPercent").value) || 0;
    const sowText = document.getElementById("sowFullOutputText").value;
    const templateData = {
      templateName,
      discountPercent,
      shippingPercent,
      salesTaxPercent,
      sowText,
      quoteItems: JSON.parse(JSON.stringify(window.quoteItems)),
      laborSections: JSON.parse(JSON.stringify(window.laborSections)),
      lastEditedBy: currentUser ? currentUser.email : 'unknown',
      lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection("templates").add(templateData);
    await loadQuotesAndTemplates();
    renderSidebar();
    showNotification(`Template "${templateName}" saved successfully!`, "success");
  } catch (e) {
    showNotification("Failed to save template: " + (e.message || e), "error");
  }
}
document.getElementById("newQuoteBarBtn").onclick = function() {
  if (
    window.quoteItems.length > 0 ||
    (window.laborSections && window.laborSections.some(s => s.numTechs > 0 || s.numSubs > 0))
  ) {
    if (!confirm("Are you sure you want to start a new quote? All unsaved changes will be lost.")) return;
  }
  document.getElementById("projectNameNumber").value = "";
  document.getElementById("quoteStatusSelector").value = "Draft";
  document.getElementById("discountPercent").value = 0;
  document.getElementById("shippingPercent").value = 5;
  document.getElementById("salesTaxPercent").value = 8;
  document.getElementById("sowFullOutputText").value = "";
  window.quoteItems = [];
  window.laborSections = [];
  activeQuoteId = null;
  activeTemplateId = null;
  renderQuoteTable();
  renderLaborSections();
  updateQuoteSummary();
  updateGrandTotals();
  showNotification("Ready for a new quote!", "success");

  // Now open the customer modal (add this line):
  document.getElementById("customerAccountModal").style.display = "block";
  // If you have a function to reset the modal fields, call it here too:
  if (typeof resetCustomerModal === "function") resetCustomerModal();
};
function showNotification(msg, type="success") {
  let notif = document.getElementById("globalNotification");
  if (!notif) {
    notif = document.createElement("div");
    notif.id = "globalNotification";
    notif.style.position = "fixed";
    notif.style.top = "24px";
    notif.style.right = "24px";
    notif.style.background = (type === "success" ? "#28a745" : "#dc3545");
    notif.style.color = "#fff";
    notif.style.padding = "15px 28px";
    notif.style.borderRadius = "8px";
    notif.style.fontWeight = "600";
    notif.style.fontSize = "1.08rem";
    notif.style.zIndex = "9999";
    notif.style.boxShadow = "0 2px 12px #0002";
    document.body.appendChild(notif);
  }
  notif.innerText = msg;
  notif.style.display = "block";
  notif.style.background = (type === "success" ? "#28a745" : "#dc3545");
  setTimeout(() => { notif.style.display = "none"; }, 2300);
}
document.getElementById("printQuoteBtn").onclick = function() {
  window.print();
};
document.getElementById("downloadPdfBtn").onclick = async function() {
  try {
    // Get current data
    const projectName = document.getElementById("projectNameNumber").value.trim() || "Untitled Project";
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-');
    
    // Create filename
    const filename = `CP - ${projectName} - ${currentDate}.pdf`;
    
    // Calculate totals
    const equipmentTotal = (window.quoteItems || []).reduce((sum, item) => 
      sum + ((item.sellPrice || 0) * (item.qty || 1)), 0
    );
    
    const laborSections = window.laborSections || [];
    const laborTotal = laborSections.reduce((sum, section) => sum + (section.clientCost || 0), 0);
    
    const discountPct = parseFloat(document.getElementById("discountPercent")?.value) || 0;
    const shippingPct = parseFloat(document.getElementById("shippingPercent")?.value) || 0;
    const salesTaxPct = parseFloat(document.getElementById("salesTaxPercent")?.value) || 0;
    
    const combinedSubtotal = equipmentTotal + laborTotal;
    const discountAmount = combinedSubtotal * discountPct / 100;
    const subtotalAfterDiscount = combinedSubtotal - discountAmount;
    const shippingAmount = equipmentTotal * shippingPct / 100;
    const salesTaxAmount = subtotalAfterDiscount * salesTaxPct / 100;
    const finalTotal = subtotalAfterDiscount + shippingAmount + salesTaxAmount;

    // Create PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPosition = 25;
    
    // Company Name - Centered at top
    doc.setTextColor(22, 41, 68); // #162944
    doc.setFontSize(24);
    doc.setFont("times", "bold");
    const companyName = "CLEARPOINT TECHNOLOGY + DESIGN";
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(companyName);
    const centerX = (pageWidth - textWidth) / 2;
    doc.text(companyName, centerX, yPosition);
    
    yPosition += 25; // More space after company name
    
    // Company Information (right side) - More space from top
    doc.setFontSize(9);
    doc.setFont("times", "normal");
    doc.text("285 Old County Line Road, STE B", 140, yPosition);
    doc.text("Westerville, OH 43081", 140, yPosition + 5);
    doc.text("740-936-7767", 140, yPosition + 10);
    
    // Customer Information (if available) - left side at same level as company info
    if (window.selectedQuoteCustomer) {
      const customer = window.selectedQuoteCustomer;
      doc.setFontSize(10);
      doc.setFont("times", "bold");
      doc.text("CLIENT:", 20, yPosition);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      const customerName = customer.type === "commercial" && customer.companyName 
        ? `${customer.companyName}`
        : `${customer.firstName} ${customer.lastName}`;
      doc.text(customerName, 20, yPosition + 7);
      
      if (customer.type === "commercial" && customer.companyName) {
        doc.text(`${customer.firstName} ${customer.lastName}`, 20, yPosition + 13);
      }
      
      if (customer.email) {
        doc.text(customer.email, 20, yPosition + 19);
      }
      if (customer.phone) {
        doc.text(customer.phone, 20, yPosition + 25);
      }
      yPosition += 40;
    } else {
      yPosition += 25;
    }
    
    yPosition += 20; // Space before project name
    
    // Project Name (moved down to just above EQUIPMENT section)
    doc.setFontSize(12);
    doc.setFont("times", "bold");
    doc.text("PROJECT:", 20, yPosition);
    doc.setFont("times", "normal");
    doc.text(projectName, 60, yPosition);
    
    yPosition += 15; // Small space before EQUIPMENT
    
    // Equipment Table
    if (window.quoteItems && window.quoteItems.length > 0) {
      doc.setTextColor(22, 41, 68);
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text("EQUIPMENT", 20, yPosition);
      yPosition += 10;
      
      // Prepare table data with images
      const equipmentTableData = [];
      
      // Process items and load images
      for (let i = 0; i < window.quoteItems.length; i++) {
        const item = window.quoteItems[i];
        const productName = (item.productName || '').substring(0, 30);
        const description = (item.description || '').substring(0, 35);
        const qty = item.qty || 1;
        const price = `$${(item.sellPrice || 0).toFixed(2)}`;
        const lineTotal = `$${((item.sellPrice || 0) * qty).toFixed(2)}`;
        
        let imageData = null;
        try {
          const imageUrl = item.imageURL || item.imageUrl;
          if (imageUrl && imageUrl.trim() && imageUrl !== 'placeholderlogoimage.png') {
            // Create a proper image load promise
            imageData = await new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = function() {
                try {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = 60; // Fixed width for consistency
                  canvas.height = 60; // Fixed height for consistency
                  
                  // Calculate aspect ratio and draw centered
                  const aspectRatio = img.width / img.height;
                  let drawWidth = 60;
                  let drawHeight = 60;
                  let offsetX = 0;
                  let offsetY = 0;
                  
                  if (aspectRatio > 1) {
                    drawHeight = 60 / aspectRatio;
                    offsetY = (60 - drawHeight) / 2;
                  } else {
                    drawWidth = 60 * aspectRatio;
                    offsetX = (60 - drawWidth) / 2;
                  }
                  
                  // Fill with white background
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, 60, 60);
                  
                  // Draw image
                  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                  
                  const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                  resolve(dataURL);
                } catch (e) {
                  resolve(null);
                }
              };
              img.onerror = () => resolve(null);
              
              // Handle different URL formats
              if (imageUrl.startsWith('http')) {
                img.src = imageUrl;
              } else {
                img.src = `./${imageUrl}`;
              }
            });
          }
        } catch (e) {
          console.log(`Failed to load image for item ${i}:`, e);
          imageData = null;
        }
        
        equipmentTableData.push({
          image: imageData,
          productName,
          description,
          qty: qty.toString(),
          price,
          lineTotal
        });
      }
      
      // Create custom table with images
      doc.autoTable({
        head: [['Image', 'Product Name', 'Description', 'Qty', 'Price', 'Total']],
        body: equipmentTableData.map(item => [
          '', // Placeholder for image
          item.productName,
          item.description,
          item.qty,
          item.price,
          item.lineTotal
        ]),
        startY: yPosition,
        margin: { left: 20, right: 20 },
        styles: { 
          fontSize: 9,
          font: 'times',
          textColor: [22, 41, 68],
          halign: 'center', // Center all text in equipment table
          valign: 'middle',
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [22, 41, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center', // Center all headers in equipment table
          valign: 'middle',
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' }, // Image column
          1: { cellWidth: 40, halign: 'center' }, // Product name - centered
          2: { cellWidth: 45, halign: 'center' }, // Description - centered
          3: { cellWidth: 15, halign: 'center', valign: 'middle' }, // Qty
          4: { cellWidth: 25, halign: 'center', valign: 'middle' }, // Price - centered
          5: { cellWidth: 25, halign: 'center', valign: 'middle' }  // Total - centered
        },
        didDrawCell: function (data) {
          // Add images to the first column
          if (data.column.index === 0 && data.section === 'body') {
            const item = equipmentTableData[data.row.index];
            if (item && item.image) {
              try {
                const cellX = data.cell.x + 1;
                const cellY = data.cell.y + 1;
                const imgSize = Math.min(data.cell.height - 2, 20);
                doc.addImage(item.image, 'JPEG', cellX, cellY, imgSize, imgSize);
              } catch (e) {
                console.log('Error adding image to PDF:', e);
              }
            }
          }
        }
      });
      
      // Equipment total - formatted like labor total
      const equipmentTableRightEdge = 190; // Same as labor table
      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text("Equipment Total:", equipmentTableRightEdge - 50, finalY);
      doc.text(`$${equipmentTotal.toFixed(2)}`, equipmentTableRightEdge - 5, finalY, { align: 'right' });
      
      yPosition = finalY + 20;
    }
    
    // Labor Section
    if (laborSections && laborSections.some(section => section.clientCost > 0)) {
      doc.setTextColor(22, 41, 68);
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text("LABOR", 20, yPosition);
      yPosition += 10;
      
      const laborTableData = [];
      
      laborSections.forEach(section => {
        if (section.clientCost > 0) {
          laborTableData.push([section.label, `$${section.clientCost.toFixed(2)}`]);
        }
      });
      
      doc.autoTable({
        head: [['Service', 'Cost']],
        body: laborTableData,
        startY: yPosition,
        margin: { left: 20, right: 20 },
        styles: { 
          fontSize: 10,
          font: 'times',
          textColor: [22, 41, 68],
          valign: 'middle',
          cellPadding: 4
        },
        headStyles: { 
          fillColor: [22, 41, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          valign: 'middle',
          fontSize: 11
        },
        columnStyles: {
          0: { cellWidth: 130, halign: 'left' }, // Service column - left aligned
          1: { cellWidth: 40, halign: 'center', valign: 'middle' } // Cost column - centered both horizontally and vertically
        }
      });
      
      // Labor total - aligned with right edge of labor table (190 = 20 margin + 170 table width)
      const laborTableRightEdge = 190;
      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text("Labor Total:", laborTableRightEdge - 50, finalY);
      doc.text(`$${laborTotal.toFixed(2)}`, laborTableRightEdge - 5, finalY, { align: 'right' });
      
      yPosition = finalY + 20;
    }
    
    // Check if we need a new page for quote summary
    const pageHeight = doc.internal.pageSize.getHeight();
    const remainingSpace = pageHeight - yPosition;
    const summaryHeight = 80; // Estimated height needed for summary section
    
    if (remainingSpace < summaryHeight) {
      doc.addPage();
      yPosition = 25;
    }
    
    // Grand Totals Section
    doc.setTextColor(22, 41, 68);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("QUOTE SUMMARY", 20, yPosition);
    yPosition += 10;
    
    const totalsData = [];
    totalsData.push(['Equipment Subtotal', `$${equipmentTotal.toFixed(2)}`]);
    totalsData.push(['Labor Subtotal', `$${laborTotal.toFixed(2)}`]);
    totalsData.push(['Combined Subtotal', `$${combinedSubtotal.toFixed(2)}`]);
    
    // Only show discount if there is one
    if (discountPct > 0) {
      totalsData.push([`Discount (${discountPct}%)`, `-$${discountAmount.toFixed(2)}`]);
      totalsData.push(['Subtotal After Discount', `$${subtotalAfterDiscount.toFixed(2)}`]);
    }
    
    if (shippingAmount > 0) {
      totalsData.push([`Shipping (${shippingPct}%)`, `$${shippingAmount.toFixed(2)}`]);
    }
    
    if (salesTaxAmount > 0) {
      totalsData.push([`Sales Tax (${salesTaxPct}%)`, `$${salesTaxAmount.toFixed(2)}`]);
    }
    
    doc.autoTable({
      body: totalsData,
      startY: yPosition,
      margin: { left: 20, right: 20 },
      styles: { 
        fontSize: 10,
        font: 'times',
        textColor: [22, 41, 68],
        valign: 'middle',
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 130, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'right', valign: 'middle', fontStyle: 'bold' }
      }
    });
    
    // Final Total (prominent)
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(22, 41, 68);
    doc.rect(20, finalY - 8, 170, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("TOTAL QUOTE AMOUNT:", 25, finalY);
    doc.text(`$${finalTotal.toFixed(2)}`, 185, finalY, { align: 'right' });
    
    yPosition = finalY + 30;
    
    // Validity Notice
    doc.setTextColor(22, 41, 68);
    doc.setFontSize(9);
    doc.setFont("times", "italic");
    doc.text("This quote is valid for 30 days unless specified in writing otherwise.", 20, yPosition);
    
    yPosition += 20;
    
    // Customer Signature and Date Lines
    doc.setTextColor(22, 41, 68);
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    
    // Signature line
    doc.text("Customer Signature:", 20, yPosition);
    doc.line(65, yPosition, 130, yPosition); // Draw signature line
    
    // Date line
    doc.text("Date:", 140, yPosition);
    doc.line(155, yPosition, 190, yPosition); // Draw date line
    
    // Save the PDF
    doc.save(filename);
    
  } catch (error) {
    console.error("PDF generation error:", error);
    alert("Error generating PDF. Please try again.");
  }
};

// Helper function to load image as base64
function loadImageAsBase64(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ------------- SCOPE OF WORK (AI PAGE) -------------

function initTinyMCE() {
  if (window.tinymce) {
    tinymce.init({
      selector: "#sowFullOutputText",
      menubar: true,
      plugins: "lists link table autoresize code image charmap preview searchreplace advlist anchor insertdatetime media",
      toolbar: "undo redo | styles | bold italic underline | alignleft aligncenter alignright alignjustify | fontselect fontsizeselect formatselect | forecolor backcolor | cut copy | bullist numlist outdent indent | link table | code preview",
      min_height: 300,
      max_height: 800,
      branding: false,
      setup: function (editor) {
        editor.on("init", () => {
          editor.setContent(document.getElementById("sowFullOutputText").value);
        });
        editor.on("change", () => {
          document.getElementById("sowFullOutputText").value = editor.getContent();
        });
      }
    });
  }
}
// --- Modern mic icon and recording logic ---
function injectMicIcon(button, isListening = false) {
  // Material Design modern mic SVG, dynamically colored
  button.innerHTML = `
    <svg class="mic-svg" viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill="none"/>
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"
            fill="${isListening ? '#fff' : '#0059b3'}"/>
      <path d="M19 13c0 3.31-2.69 6-6 6s-6-2.69-6-6h2a4 4 0 0 0 8 0h2z"
            fill="${isListening ? '#fff' : '#0059b3'}"/>
      <rect x="11" y="19" width="2" height="3" rx="1"
            fill="${isListening ? '#fff' : '#0059b3'}"/>
    </svg>
  `;
}

function setupGenerateButtonState(textareaId, buttonId) {
  const textarea = document.getElementById(textareaId);
  const button = document.getElementById(buttonId);
  if (!textarea || !button) return;
  // Initial state
  button.disabled = !textarea.value.trim();

  textarea.addEventListener('input', () => {
    button.disabled = !textarea.value.trim();
  });
}

function setupMicButton(btnId, textareaId, generateBtnId) {
  const btn = document.getElementById(btnId); // Mic button
  const genBtn = document.getElementById(generateBtnId); // Generate button
  if (!btn || !genBtn) return;

  let recognition = null;
  let listening = false;
  injectMicIcon(btn, false);

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    btn.style.display = "none";
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = "";

  btn.onclick = function () {
    if (listening) return;
    btn.classList.add("listening");
    injectMicIcon(btn, true);
    listening = true;
    finalTranscript = document.getElementById(textareaId).value;
    recognition.start();
  };

  recognition.onresult = function (event) {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      let transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += (finalTranscript && !finalTranscript.endsWith(' ') ? ' ' : '') + transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    const ta = document.getElementById(textareaId);
    if (ta) {
      ta.value = finalTranscript + interimTranscript;
      // ---- ADD THIS SECTION ----
      // Manually dispatch an 'input' event to trigger the button state update
      const inputEvent = new Event('input', {
        bubbles: true,
        cancelable: true,
      });
      ta.dispatchEvent(inputEvent);
      // ---- END OF ADDED SECTION ----
    }
  };

  recognition.onerror = function () {
    btn.classList.remove("listening");
    injectMicIcon(btn, false);
    listening = false;
  };

  recognition.onend = function () {
    if (listening) recognition.start();
  };

  genBtn.onclick = function () {
    if (listening) {
      recognition.stop();
      btn.classList.remove("listening");
      injectMicIcon(btn, false);
      listening = false;
    }
    if (btnId === "sowMicBtn") sowAiGenerate();
    if (btnId === "taskListMicBtn") taskListAiGenerate();
  };
}

function showAiOverlay(msg) {
  const overlay = document.getElementById("aiOverlay");
  const msgDiv = document.getElementById("aiOverlayMsg");
  msgDiv.innerText = msg;
  overlay.style.display = "flex";
}

function hideAiOverlay() {
  document.getElementById("aiOverlay").style.display = "none";
}

async function sowAiGenerate() {
  showAiOverlay("AI is generating your Scope of Work...");
  const prompt = document.getElementById("sowAiPromptText").value || "";
  const quoteJson = JSON.stringify(window.quoteItems || []);
  const laborJson = JSON.stringify(window.laborSections || []);
  setTimeout(() => {
    let text = `<h3>Scope of Work</h3>
      <ul>
        <li>Provide and install AV equipment as listed in the proposal.</li>
        <li>Perform all labor related to system design, programming, prewire, and installation.</li>
        <li>Ensure all equipment is tested and system is fully operational.</li>
        <li>Provide client training and project documentation.</li>
      </ul>
      <p><b>Prompt:</b> ${prompt ? prompt : "(none)"}.</p>
      <p><i>(Auto-generated based on equipment and labor in quote.)</i></p>
    `;
    if (window.tinymce && tinymce.get("sowFullOutputText")) tinymce.get("sowFullOutputText").setContent(text);
    document.getElementById("sowFullOutputText").value = text;
    hideAiOverlay();
  }, 2100);
}
document.getElementById("downloadSowPdfBtn").onclick = function() {
  const doc = new jspdf.jsPDF();
  let htmlContent = (window.tinymce && tinymce.get("sowFullOutputText")) ? tinymce.get("sowFullOutputText").getContent() : document.getElementById("sowFullOutputText").value;
  doc.html(htmlContent, {
    callback: function (d) { d.save("Scope-of-Work.pdf"); },
    margin: [15, 15, 15, 15],
    autoPaging: 'text',
    html2canvas: { scale: 0.7 }
  });
};

// ----- TASK LIST (AI PAGE) -----
function renderTaskListTable() {
  const tbody = document.getElementById("taskListTableBody");
  tbody.innerHTML = "";
  (window.taskList || []).forEach((row, idx) => {
    const tr = document.createElement("tr");
    let tdCat = document.createElement("td");
    tdCat.innerHTML = `<input type="text" value="${row.category || ""}" onchange="window.taskList[${idx}].category=this.value">`;
    tr.appendChild(tdCat);
    let tdDesc = document.createElement("td");
    tdDesc.innerHTML = `<input type="text" value="${row.description || ""}" onchange="window.taskList[${idx}].description=this.value">`;
    tr.appendChild(tdDesc);
    let tdTime = document.createElement("td");
    tdTime.innerHTML = `<input type="text" value="${row.estimatedTime || ""}" onchange="window.taskList[${idx}].estimatedTime=this.value">`;
    tr.appendChild(tdTime);
    let tdRemove = document.createElement("td");
    tdRemove.innerHTML = `<button class="remove-task-btn" onclick="removeTaskRow(${idx})">✕</button>`;
    tr.appendChild(tdRemove);
    tbody.appendChild(tr);
  });
}
function removeTaskRow(idx) {
  window.taskList.splice(idx, 1);
  renderTaskListTable();
}
document.getElementById("addTaskRowBtn").onclick = function() {
  window.taskList.push({ category: "", description: "", estimatedTime: "" });
  renderTaskListTable();
};
async function taskListAiGenerate() {
  showAiOverlay("AI is generating your Task List...");
  const prompt = document.getElementById("taskListAiPromptText").value || "";
  const quoteJson = JSON.stringify(window.quoteItems || []);
  const laborJson = JSON.stringify(window.laborSections || []);
  setTimeout(() => {
    window.taskList = [
      { category: "Pre Project Prep", description: "Review plans and equipment list with project manager.", estimatedTime: "2 hrs" },
      { category: "Cable Pulls", description: "Pull all required cabling as per system design.", estimatedTime: "6 hrs" },
      { category: "Rack Building", description: "Assemble and wire all AV racks.", estimatedTime: "5 hrs" },
      { category: "Installation", description: "Install displays, speakers, and all listed equipment.", estimatedTime: "8 hrs" },
      { category: "Programming", description: "Program system controllers and test system functionality.", estimatedTime: "4 hrs" },
      { category: "Client Training", description: "Train client on use of new AV system.", estimatedTime: "1 hr" }
    ];
    renderTaskListTable();
    hideAiOverlay();
  }, 1800);
}
document.getElementById("downloadTaskListPdfBtn").onclick = function() {
  const doc = new jspdf.jsPDF();
  doc.setFontSize(14);
  doc.text("Project Task List", 14, 18);
  doc.setFontSize(10);
  doc.autoTable({
    head: [["Category", "Task Description", "Estimated Time"]],
    body: (window.taskList || []).map(row => [row.category, row.description, row.estimatedTime]),
    startY: 26,
    margin: { left: 10, right: 10 }
  });
  doc.save("Task-List.pdf");
};


// ------------- SPEC SHEET MODAL -------------
document.getElementById("viewSpecSheetsBtn").onclick = function() {
  document.getElementById("specSheetModal").style.display = "block";
  // TODO: Populate specSheetLinksContainer from window.quoteItems
};
document.querySelectorAll(".modal-close-button").forEach(btn => {
  btn.onclick = function() {
    btn.closest('.modal').style.display = "none";
  };
});

// ------------- FOOTER YEAR -------------
function updateFooterYear() {
  if (document.getElementById("currentYear"))
    document.getElementById("currentYear").innerText = (new Date()).getFullYear();
}

// Show/Hide Add Product Modal
document.getElementById("addProductBarBtn").onclick = function() {
  document.getElementById("addProductModal").style.display = "flex";
  document.getElementById("addProductStatus").style.display = "none";
  document.getElementById("addProductForm").reset();
};
document.getElementById("closeAddProductModalBtn").onclick = function() {
  document.getElementById("addProductModal").style.display = "none";
};

// Add Product Form Submission
document.getElementById("addProductForm").onsubmit = async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  // Collect all fields
  Array.from(form.elements).forEach(input => {
    if (input.name) {
      if (["msrp","map","costPrice"].includes(input.name)) {
        data[input.name] = input.value ? parseFloat(input.value) : null;
      } else {
        data[input.name] = input.value;
      }
    }
  });
  // Defensive: required fields
  if (!data.productName || !data.productNumber || !data.brand || !data.costPrice) {
    showAddProductStatus("Required fields missing.", false);
    return;
  }
  try {
    await db.collection("products").add(data);
    showAddProductStatus("Product added successfully!", true);
    // Optionally reload products for dropdowns, etc.
    await loadProducts();
    setTimeout(() => {
      document.getElementById("addProductModal").style.display = "none";
    }, 900);
  } catch (err) {
    showAddProductStatus("Failed to add product: " + err.message, false);
  }
};
function showAddProductStatus(msg, success) {
  const el = document.getElementById("addProductStatus");
  el.innerText = msg;
  el.style.display = "block";
  el.style.color = success ? "#28a745" : "#dc3545";
}

// --- PRODUCT LIBRARY: Brand Filter and Product Table Population ---

// Load unique brands into the product library brand filter
async function loadBrandFilterOptions() {
  const brandSelect = document.getElementById('brandFilter');
  if (!brandSelect) return;
  brandSelect.innerHTML = '<option value="">Select a brand</option>';
  try {
    const snapshot = await db.collection('products').get();
    // Get unique, sorted brands
    const brands = Array.from(new Set(snapshot.docs.map(doc => (doc.data().brand || "").trim()).filter(Boolean))).sort();
    for (let brand of brands) {
      let opt = document.createElement('option');
      opt.value = brand;
      opt.textContent = brand;
      brandSelect.appendChild(opt);
    }
  } catch (err) {
    brandSelect.innerHTML = '<option value="">Error loading brands</option>';
    console.error("Error loading brands:", err);
  }
}

// When brand is selected, load and display products for that brand, alphabetically
document.getElementById('brandFilter').onchange = async function() {
  const brand = this.value;
  const tbody = document.querySelector('#productLibraryTable tbody');
  tbody.innerHTML = '';
  if (!brand) return;
  try {
    const snapshot = await db.collection('products').where('brand', '==', brand).get();
    // Alphabetical order by productName
    const rows = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No products found for this brand.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(prod => `
  <tr>
    <td>${prod.brand || ''}</td>
    <td>${prod.productName || ''}</td>
    <td>${prod.productNumber || ''}</td>
    <td>${typeof prod.costPrice === "number" ? `$${prod.costPrice.toFixed(2)}` : ''}</td>
    <td>${typeof prod.map === "number" ? `$${prod.map.toFixed(2)}` : ''}</td>
    <td>${typeof prod.msrp === "number" ? `$${prod.msrp.toFixed(2)}` : ''}</td>
    <td><button class="editProductBtn" data-id="${prod.id}">Edit</button></td>
    <td><button class="deleteProductBtn" data-id="${prod.id}" title="Delete"><span class="delete-x-icon">&times;</span></button></td>
  </tr>
`).join('');
    attachProductTableEventHandlers();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="color:red;">Error loading products.</td></tr>`;
    console.error("Error loading products for brand:", err);
  }
};

// Attach edit/delete button event handlers for the loaded table
function attachProductTableEventHandlers() {
  // Edit button
  document.querySelectorAll('.editProductBtn').forEach(btn => {
    btn.onclick = async function() {
      const prodId = this.getAttribute('data-id');
      const doc = await db.collection('products').doc(prodId).get();
      if (doc.exists) openEditProductModal(prodId, doc.data());
    };
  });
  // Delete button
  document.querySelectorAll('.deleteProductBtn').forEach(btn => {
    btn.onclick = async function() {
      const prodId = this.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this product?')) {
        await db.collection('products').doc(prodId).delete();
        // Refresh table
        document.getElementById('brandFilter').onchange();
      }
    };
  });
}

// Open the Add Product modal for editing (prefill form)
function openEditProductModal(prodId, data) {
  const modal = document.getElementById("addProductModal");
  const form = document.getElementById("addProductForm");
  modal.style.display = "flex";
  // Prefill all fields
  form.productName.value = data.productName || '';
  form.productNumber.value = data.productNumber || '';
  form.brand.value = data.brand || '';
  form.category.value = data.category || '';
  form.type.value = data.type || '';
  form.msrp.value = (typeof data.msrp === "number") ? data.msrp : '';
  form.map.value = (typeof data.map === "number") ? data.map : '';
  form.costPrice.value = (typeof data.costPrice === "number") ? data.costPrice : '';
  form.imageURL.value = data.imageURL || '';
  form.specSheetURL.value = data.specSheetURL || '';
  form.description.value = data.description || '';
  // Store the id for editing (hidden input or data attribute)
  form.setAttribute('data-edit-id', prodId);
  document.getElementById("addProductStatus").style.display = "none";
}

// Handle Add/Edit Product form submission
const origAddProductFormHandler = document.getElementById("addProductForm").onsubmit;
document.getElementById("addProductForm").onsubmit = async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  Array.from(form.elements).forEach(input => {
    if (input.name) {
      if (["msrp","map","costPrice"].includes(input.name)) {
        data[input.name] = input.value ? parseFloat(input.value) : null;
      } else {
        data[input.name] = input.value;
      }
    }
  });
  if (!data.productName || !data.productNumber || !data.brand || !data.costPrice) {
    showAddProductStatus("Required fields missing.", false);
    return;
  }
  const editId = form.getAttribute('data-edit-id');
  try {
    if (editId) {
      await db.collection("products").doc(editId).update(data);
      showAddProductStatus("Product updated successfully!", true);
      form.removeAttribute('data-edit-id');
    } else {
      await db.collection("products").add(data);
      showAddProductStatus("Product added successfully!", true);
    }
    // Refresh product list if in Product Library
    if (document.getElementById('productLibrarySection').style.display !== "none") {
      document.getElementById('brandFilter').onchange();
    }
    await loadProducts(); // For other dropdowns
    setTimeout(() => {
      document.getElementById("addProductModal").style.display = "none";
    }, 900);
  } catch (err) {
    showAddProductStatus("Failed to save product: " + err.message, false);
  }
};

// --- Import Products CSV Button Logic ---
document.getElementById("importProductsCsvBtn").onclick = function () {
  document.getElementById("importProductsCsvInput").click();
};
// The actual import logic will be added in the next step!

function parsePrice(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
}

document.getElementById("importProductsCsvInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const progressEl = document.getElementById("importProgress");
  progressEl.textContent = "Starting import...";

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async function (results) {
      const productsData = results.data;
      let added = 0, updated = 0, failed = 0;
      let done = 0;
      const total = productsData.length;

      for (const row of productsData) {
        const productId = row["Product ID"]?.trim();
        if (!productId) { failed++; done++; progressEl.textContent = `Imported ${done}/${total}`; continue; }

        // Mapped and price-parsed fields
        const data = {
          productId: row["Product ID"]?.trim() || "",
          brand: row["Brand"]?.trim() || "",
          productName: row["Product Name"]?.trim() || "",
          productNumber: row["Product Number"]?.trim() || "",
          description: row["Description"]?.trim() || "",
          costPrice: parsePrice(row["Dealer"]),
          msrp: parsePrice(row["MSRP"]),
          map: parsePrice(row["MAP"]),
          primaryDistributor: row["Primary Distributor"]?.trim() || "",
          secondaryDistributor: row["Secondary Distributor"]?.trim() || "",
          tertiaryDistributor: row["Tertiary Distributor"]?.trim() || "",
          specSheetUrl: row["Spec Sheet URL"]?.trim() || "",
          imageUrl: row["Image URL"]?.trim() || ""
        };

        try {
          const snap = await db.collection("products")
            .where("productId", "==", productId)
            .get();

          if (!snap.empty) {
            await db.collection("products").doc(snap.docs[0].id).set(data, { merge: true });
            updated++;
          } else {
            await db.collection("products").add(data);
            added++;
          }
        } catch (err) {
          console.error("Failed to import product:", data, err);
          failed++;
        }
        done++;
        progressEl.textContent = `Imported ${done}/${total}`;
      }

      progressEl.textContent = `Done! Added: ${added}, Updated: ${updated}, Failed: ${failed}`;
      setTimeout(() => { progressEl.textContent = ""; }, 4000);

      if (typeof loadProducts === "function") loadProducts();
    },
    error: function (err) {
      alert("Error parsing CSV: " + err.message);
      progressEl.textContent = "";
    }
  });

  e.target.value = "";
});

// ------------- INIT ON LOAD -------------
window.onload = function() {
  updateFooterYear();
  initTinyMCE();
  injectMicIcon(document.getElementById("sowMicBtn"), false);
  injectMicIcon(document.getElementById("taskListMicBtn"), false);
  setupMicButton("sowMicBtn", "sowAiPromptText", "draftFullSowWithAiBtn");
  setupMicButton("taskListMicBtn", "taskListAiPromptText", "generateTaskListBtn");
  setupGenerateButtonState("sowAiPromptText", "draftFullSowWithAiBtn");
  setupGenerateButtonState("taskListAiPromptText", "generateTaskListBtn");
  
  // Add event listeners for customer dropdown
  const customerSelector = document.getElementById("customerAccountSelector");
  const refreshBtn = document.getElementById("refreshCustomersBtn");
  
  if (customerSelector) {
    customerSelector.addEventListener("change", handleCustomerSelection);
  }
  
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadCustomerDropdown();
      showNotification("Customer list refreshed!", "success");
    });
  }

  // Initialize Google Maps autocomplete (don't await - let it load in background)
  initAutocomplete().catch(error => {
    console.log("Autocomplete initialization failed, continuing without it:", error);
  });
};

// --- Customer Account Modal Logic (matching new modal HTML & companyNameGroup logic) ---

// Globals for customer workflow

window.selectedQuoteCustomer = null;  // This should be initialized to null
window.newCustomerType = null;
window.selectedProjectName = "";


// Utility: Reset all modal steps/fields
function resetCustomerModal() {
  // Reset display states
  const customerStep1 = document.getElementById("customerStep1");
  const customerStep2 = document.getElementById("customerStep2");
  const addCustomerForm = document.getElementById("addCustomerForm");
  const customerStep3 = document.getElementById("customerStep3");
  const customerSearchInput = document.getElementById("customerSearchInput");
  const customerSearchResults = document.getElementById("customerSearchResults");

  if (customerStep1) customerStep1.style.display = "";
  if (customerStep2) customerStep2.style.display = "none";
  if (addCustomerForm) addCustomerForm.style.display = "none";
  if (customerStep3) customerStep3.style.display = "none";
  if (customerSearchInput) customerSearchInput.value = "";
  if (customerSearchResults) customerSearchResults.innerHTML = "";

  // Reset form fields - with null checks
  const customerFirstName = document.getElementById("customerFirstName");
  const customerLastName = document.getElementById("customerLastName");
  const customerCompanyName = document.getElementById("customerCompanyName");
  const customerEmail = document.getElementById("customerEmail");
  const customerPhone = document.getElementById("customerPhone");
  const customerBillingAddress = document.getElementById("customerBillingAddress");
  const customerProjectAddress = document.getElementById("customerProjectAddress");
  const companyNameGroup = document.getElementById("companyNameGroup");

  if (customerFirstName) customerFirstName.value = "";
  if (customerLastName) customerLastName.value = "";
  if (customerCompanyName) customerCompanyName.value = "";
  if (customerEmail) customerEmail.value = "";
  if (customerPhone) customerPhone.value = "";
  if (customerBillingAddress) customerBillingAddress.value = "";
  if (customerProjectAddress) customerProjectAddress.value = "";
  if (companyNameGroup) companyNameGroup.style.display = "none"; // Hide by default

  // Reset global variables
  window.selectedQuoteCustomer = null;
  window.newCustomerType = null;
  window.selectedProjectName = "";
}

// Always show login modal when Customers tab is clicked
document.getElementById("tabCustomersBtn").onclick = function() {
  document.getElementById("customersLoginEmail").value = "";
  document.getElementById("customersLoginPassword").value = "";
  document.getElementById("customersLoginError").style.display = "none";
  document.getElementById("customersLoginModal").style.display = "block";
};

// On login success, show the customer modal
document.getElementById("customersModalLoginBtn").onclick = async function() {
  const email = document.getElementById("customersLoginEmail").value.trim();
  const password = document.getElementById("customersLoginPassword").value;
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    document.getElementById("customersLoginModal").style.display = "none";
    resetCustomerModal();
    document.getElementById("customerAccountModal").style.display = "block";
  } catch (e) {
    document.getElementById("customersLoginError").textContent = e.message || "Login failed.";
    document.getElementById("customersLoginError").style.display = "block";
  }
};

// Hide modal
function closeCustomerModal() {
  document.getElementById("customerAccountModal").style.display = "none";
}

// --- Step 1: Search existing customers ---
document.getElementById("customerSearchInput").oninput = async function() {
  const searchVal = this.value.trim().toLowerCase();
  const resultsList = document.getElementById("customerSearchResults");
  resultsList.innerHTML = "";
  if (!searchVal) return;

  // Flexible search: match beginning of name/company or full text
  const snap = await db.collection("customerAccounts")
    .orderBy("firstName")
    .limit(20)
    .get();

  let matches = [];
  snap.forEach(doc => {
    const c = doc.data();
    const company = (c.companyName || "").toLowerCase();
    const first = (c.firstName || "").toLowerCase();
    const last = (c.lastName || "").toLowerCase();
    if (
      company.includes(searchVal) ||
      (first + " " + last).includes(searchVal) ||
      first.includes(searchVal) ||
      last.includes(searchVal)
    ) {
      matches.push({ id: doc.id, ...c });
    }
  });

  matches.slice(0, 10).forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.type === "commercial" && c.companyName
      ? `${c.companyName} (${c.firstName} ${c.lastName})`
      : `${c.firstName} ${c.lastName}`;
    li.onclick = function() {
      Array.from(resultsList.children).forEach(x => x.classList.remove("selected"));
      li.classList.add("selected");
      window.selectedQuoteCustomer = c;
      // Move to project name step
      document.getElementById("customerStep1").style.display = "none";
      document.getElementById("customerStep3").style.display = "";
      document.getElementById("projectNameInput").focus();
    };
    resultsList.appendChild(li);
  });
};
// --- Step 1: Add new customer ---
document.getElementById("addNewCustomerBtn").onclick = function() {
  document.getElementById("customerStep1").style.display = "none";
  document.getElementById("customerStep2").style.display = "";
};

// --- Step 2: Choose customer type ---
document.getElementById("chooseResidentialBtn").onclick = function() {
  window.newCustomerType = "residential";
  showCustomerForm();
};
document.getElementById("chooseCommercialBtn").onclick = function() {
  window.newCustomerType = "commercial";
  showCustomerForm();
};

function showCustomerForm() {
  document.getElementById("customerStep2").style.display = "none";
  document.getElementById("addCustomerForm").style.display = "";
  
  // Show/hide company name for commercial only
  if (window.newCustomerType === "commercial") {
    document.getElementById("companyNameGroup").style.display = "";
    document.getElementById("customerCompanyName").required = true;
  } else {
    document.getElementById("companyNameGroup").style.display = "none";
    document.getElementById("customerCompanyName").required = false;
  }
  
  // Initialize autocomplete when form becomes visible
  setTimeout(() => {
    initAutocomplete();
  }, 100);
}

// --- Step 2: Save new customer form ---
document.getElementById("addCustomerForm").onsubmit = async function(e) {
  e.preventDefault();
  
  try {
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Saving...";
    submitBtn.disabled = true;
    
    // Gather customer info
    const firstName = document.getElementById("customerFirstName").value.trim();
    const lastName = document.getElementById("customerLastName").value.trim();
    const companyName = document.getElementById("customerCompanyName").value.trim();
    const email = document.getElementById("customerEmail").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const billingAddress = document.getElementById("customerBillingAddress").value.trim();
    const type = window.newCustomerType;

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      throw new Error("Please fill in all required fields");
    }

    if (type === "commercial" && !companyName) {
      throw new Error("Company name is required for commercial customers");
    }

    // Keywords for search functionality
    let keywords = [
      firstName.toLowerCase(),
      lastName.toLowerCase(),
      email.toLowerCase(),
      ...(companyName ? [companyName.toLowerCase()] : [])
    ];

    // Customer data object
    const customerData = {
      firstName,
      lastName,
      companyName: companyName || "",
      email,
      phone,
      billingAddress: billingAddress || "",
      type,
      created: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: currentUser ? currentUser.email : 'unknown',
      searchKeywords: keywords
    };

    // Save to Firestore
    const docRef = await db.collection("customerAccounts").add(customerData);
    
    // **FIXED: Set the selected customer with the correct variable name**
    window.selectedQuoteCustomer = {
      id: docRef.id,
      ...customerData
    };
    
    // Show success message
    if (typeof showNotification === 'function') {
      showNotification("Customer account saved successfully!", "success");
    }
    
    // Move to project name step
    document.getElementById("addCustomerForm").style.display = "none";
    document.getElementById("customerStep3").style.display = "";
    document.getElementById("projectNameInput").focus();
    
    // Reset button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
  } catch (error) {
    console.error("Error saving customer:", error);
    alert("Error saving customer: " + error.message);
    
    // Reset button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = "Save Customer Account";
    submitBtn.disabled = false;
  }
};

// --- Step 3: Enter project name and create quote ---
document.getElementById("createQuoteBtn").onclick = function() {
  console.log("Create Quote button clicked!");
  
  const projectName = document.getElementById("projectNameInput").value.trim();
  console.log("Project name:", projectName);
  console.log("Selected customer:", window.selectedQuoteCustomer);
  
  // Validation
  if (!window.selectedQuoteCustomer) {
    console.error("No customer selected");
    alert("Error: No customer selected. Please go back and select a customer.");
    return;
  }
  
  if (!projectName) {
    console.error("No project name entered");
    alert("Please enter a project name.");
    document.getElementById("projectNameInput").focus();
    return;
  }
  
  console.log("Validation passed, creating quote...");
  
  try {
    // **IMPORTANT: Store customer data before modal reset**
    const selectedCustomer = { ...window.selectedQuoteCustomer };
    
    // Store the project name
    window.selectedProjectName = projectName;
    
    // Set the project name in the main quote builder
    const projectNameField = document.getElementById("projectNameNumber");
    if (projectNameField) {
      projectNameField.value = projectName;
      console.log("Set project name field to:", projectName);
    } else {
      console.warn("Project name field not found");
    }
    
    // Set customer in the quote builder dropdown if it exists
    const customerDropdown = document.getElementById("customerAccountSelector");
    if (customerDropdown && selectedCustomer) {
      // Make sure the customer dropdown is populated first
      const optionExists = Array.from(customerDropdown.options).some(option => option.value === selectedCustomer.id);
      
      if (optionExists) {
        customerDropdown.value = selectedCustomer.id;
        console.log("Set customer dropdown to:", selectedCustomer.id);
        
        // Set the global variable and trigger selection
        window.selectedQuoteCustomer = selectedCustomer;
        if (typeof handleCustomerSelection === 'function') {
          handleCustomerSelection();
          console.log("Triggered customer selection handler");
        }
      } else {
        console.warn("Customer option not found in dropdown, reloading customer list...");
        // Reload customer dropdown and then set selection
        loadCustomerDropdown().then(() => {
          if (selectedCustomer && selectedCustomer.id) {
            customerDropdown.value = selectedCustomer.id;
            window.selectedQuoteCustomer = selectedCustomer;
            if (typeof handleCustomerSelection === 'function') {
              handleCustomerSelection();
            }
            console.log("Customer dropdown reloaded and selection set");
          }
        }).catch(err => {
          console.error("Error reloading customer dropdown:", err);
        });
      }
    } else {
      console.warn("Customer dropdown not found or no selected customer");
    }
    
    // Switch to the Quote Builder tab
    const quoteBuilderBtn = document.getElementById("tabQuoteBuilderBtn");
    const quoteBuilderPage = document.getElementById("tabQuoteBuilderPage");
    
    if (quoteBuilderBtn && quoteBuilderPage) {
      // Deactivate all tabs
      document.querySelectorAll(".main-tab-btn").forEach(btn => btn.classList.remove("active"));
      document.querySelectorAll(".main-tab-page").forEach(page => page.style.display = "none");
      
      // Activate Quote Builder tab
      quoteBuilderBtn.classList.add("active");
      quoteBuilderPage.style.display = "";
      
      console.log("Switched to Quote Builder tab");
    }
    
    // Close the modal
    const modal = document.getElementById("customerAccountModal");
    if (modal) {
      modal.style.display = "none";
      console.log("Closed modal");
    }
    
    // Reset the modal for next time (this clears window.selectedQuoteCustomer)
    if (typeof resetCustomerModal === 'function') {
      resetCustomerModal();
      console.log("Reset modal");
    }
    
    // **IMPORTANT: Restore the customer selection after modal reset**
    window.selectedQuoteCustomer = selectedCustomer;
    
    // Show success notification
    if (typeof showNotification === 'function') {
      showNotification(`New quote created for ${projectName}!`, "success");
      console.log("Showed notification");
    }
    
    console.log("Quote creation completed successfully!");
    
  } catch (error) {
    console.error("Error creating quote:", error);
    console.error("Error stack:", error.stack);
    alert("Error creating quote: " + (error.message || "Unknown error"));
  }
};

// ----------- LOAD AND RENDER CUSTOMERS TABLE -----------

function loadCustomers() {
  const tbody = document.querySelector("#customersTable tbody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

  firebase.firestore().collection("customerAccounts").get()
    .then(snapshot => {
      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="7">No customers found.</td></tr>';
        return;
      }
      tbody.innerHTML = "";
      snapshot.forEach(doc => {
        const c = doc.data();
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${c.firstName || ""}</td>
          <td>${c.lastName || ""}</td>
          <td>${c.companyName || ""}</td>
          <td>${c.email || ""}</td>
          <td>${c.phone || ""}</td>
          <td>${c.billingAddress || ""}</td>
          <td>
            <button class="edit-customer-btn" data-id="${doc.id}">Edit</button>
            <button class="delete-customer-btn" data-id="${doc.id}">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch(err => {
      tbody.innerHTML = `<tr><td colspan="7" style="color:#c33;">Error loading customers: ${err.message}</td></tr>`;
    });
}

// ----------- EDIT CUSTOMER MODAL LOGIC -----------

// Store the currently editing customer ID
let currentEditingCustomerId = null;

// Delegate click event for edit buttons in the customers table
document.querySelector("#customersTable tbody").addEventListener("click", function(e) {
  const btn = e.target.closest(".edit-customer-btn");
  if (!btn) return;
  const customerId = btn.getAttribute("data-id");
  currentEditingCustomerId = customerId;
  // Get customer data from Firestore
  firebase.firestore().collection("customerAccounts").doc(customerId).get()
    .then(doc => {
      if (!doc.exists) return;
      const c = doc.data();
      document.getElementById("editCustomerFirstName").value = c.firstName || "";
      document.getElementById("editCustomerLastName").value = c.lastName || "";
      document.getElementById("editCustomerCompanyName").value = c.companyName || "";
      document.getElementById("editCustomerEmail").value = c.email || "";
      document.getElementById("editCustomerPhone").value = c.phone || "";
      document.getElementById("editCustomerBillingAddress").value = c.billingAddress || "";
      document.getElementById("editCustomerError").style.display = "none";
      document.getElementById("editCustomerModal").style.display = "flex";
    });
});

// Handle Save in Edit Customer modal
document.getElementById("editCustomerForm").onsubmit = function(e) {
  e.preventDefault();
  if (!currentEditingCustomerId) return;
  const updated = {
    firstName: document.getElementById("editCustomerFirstName").value.trim(),
    lastName: document.getElementById("editCustomerLastName").value.trim(),
    companyName: document.getElementById("editCustomerCompanyName").value.trim(),
    email: document.getElementById("editCustomerEmail").value.trim(),
    phone: document.getElementById("editCustomerPhone").value.trim(),
    billingAddress: document.getElementById("editCustomerBillingAddress").value.trim()
  };
  firebase.firestore().collection("customerAccounts").doc(currentEditingCustomerId)
    .update(updated)
    .then(() => {
      document.getElementById("editCustomerModal").style.display = "none";
      currentEditingCustomerId = null;
      loadCustomers();
    })
    .catch(err => {
      document.getElementById("editCustomerError").textContent = err.message;
      document.getElementById("editCustomerError").style.display = "block";
    });
};

// Handle Cancel/Close in Edit Customer modal
document.getElementById("cancelEditCustomerBtn").onclick =
document.getElementById("closeEditCustomerModalBtn").onclick = function() {
  document.getElementById("editCustomerModal").style.display = "none";
  currentEditingCustomerId = null;
};

// ----------- DELETE CUSTOMER LOGIC -----------

let customerToDeleteId = null;

// Delegate click event for delete buttons in the customers table
document.querySelector("#customersTable tbody").addEventListener("click", function(e) {
  const btn = e.target.closest(".delete-customer-btn");
  if (!btn) return;
  customerToDeleteId = btn.getAttribute("data-id");
  document.getElementById("deleteCustomerModal").style.display = "block";
});

// Confirm deletion
document.getElementById("confirmDeleteCustomerBtn").onclick = function() {
  if (customerToDeleteId) {
    firebase.firestore().collection("customerAccounts").doc(customerToDeleteId).delete()
      .then(() => {
        document.getElementById("deleteCustomerModal").style.display = "none";
        customerToDeleteId = null;
        loadCustomers();
      })
      .catch(err => {
        alert("Error deleting customer: " + err.message);
      });
  }
};

// Cancel/close deletion modal
document.getElementById("cancelDeleteCustomerBtn").onclick =
document.getElementById("closeDeleteCustomerModalBtn").onclick = function() {
  document.getElementById("deleteCustomerModal").style.display = "none";
  customerToDeleteId = null;
 };

// --- Customers Tab: Always force login, then show customers table/info ---

// Customers tab click: always show login modal
document.getElementById("tabCustomersBtn").onclick = function() {
  document.getElementById("customersLoginEmail").value = "";
  document.getElementById("customersLoginPassword").value = "";
  document.getElementById("customersLoginError").style.display = "none";
  document.getElementById("customersLoginModal").style.display = "block";
};

// Cancel button on login modal
document.getElementById("customersModalCancelBtn").onclick = function() {
  document.getElementById("customersLoginModal").style.display = "none";
};

document.getElementById("customersModalLoginBtn").onclick = async function() {
  const email = document.getElementById("customersLoginEmail").value.trim();
  const password = document.getElementById("customersLoginPassword").value;
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    document.getElementById("customersLoginModal").style.display = "none";
    // Show customers page and activate tab
    document.getElementById("customers-page").style.display = "";
    document.getElementById("tabCustomersBtn").classList.add("active");
    // Hide all other main pages/tabs
    ["tabQuoteBuilderPage","productLibrarySection","tabScopeOfWorkPage","tabTaskListPage"].forEach(id => {
      if (id !== "customers-page") document.getElementById(id).style.display = "none";
    });
    ["tabQuoteBuilderBtn","tabProductLibraryBtn","tabScopeOfWorkBtn","tabTaskListBtn"].forEach(id => {
      if (id !== "tabCustomersBtn") document.getElementById(id).classList.remove("active");
    });
    if (typeof loadCustomers === "function") loadCustomers();
  } catch (e) {
    document.getElementById("customersLoginError").textContent = e.message || "Login failed.";
    document.getElementById("customersLoginError").style.display = "block";
  }
};

// Address Autocomplete Functionality
let billingAddressAutocomplete = null;

// Updated initAutocomplete function
async function initAutocomplete() {
  console.log("initAutocomplete called");
  
  try {
    // Load Google Maps API if not already loaded
    await loadGoogleMapsAPI();
    console.log("Google Maps API loaded successfully");
    
    // Initialize autocomplete for billing address in customer form
    const billingAddressInput = document.getElementById("customerBillingAddress");
    
    if (billingAddressInput) {
      console.log("Initializing autocomplete for customer billing address");
      try {
        const billingAddressAutocomplete = new google.maps.places.Autocomplete(billingAddressInput, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'address_components', 'geometry']
        });
        
        billingAddressAutocomplete.addListener('place_changed', function() {
          const place = billingAddressAutocomplete.getPlace();
          console.log("Place selected:", place.formatted_address);
          if (place.formatted_address) {
            billingAddressInput.value = place.formatted_address;
          }
        });
        
        console.log("Customer billing address autocomplete initialized successfully");
      } catch (error) {
        console.error("Error initializing customer billing address autocomplete:", error);
      }
    }
    
    // Initialize for edit customer modal
    const editBillingAddressInput = document.getElementById("editCustomerBillingAddress");
    
    if (editBillingAddressInput) {
      console.log("Initializing autocomplete for edit customer billing address");
      try {
        const editBillingAutocomplete = new google.maps.places.Autocomplete(editBillingAddressInput, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'address_components', 'geometry']
        });
        
        editBillingAutocomplete.addListener('place_changed', function() {
          const place = editBillingAutocomplete.getPlace();
          if (place.formatted_address) {
            editBillingAddressInput.value = place.formatted_address;
          }
        });
        
        console.log("Edit customer billing address autocomplete initialized successfully");
      } catch (error) {
        console.error("Error initializing edit billing address autocomplete:", error);
      }
    }
    
  } catch (error) {
    console.error("Failed to load Google Maps API:", error);
  }
}

  console.log("Google Maps Places autocomplete initialized successfully");


// Make sure it's available globally
window.initAutocomplete = initAutocomplete;
// Add modal close handlers
document.getElementById("closeCustomerModalBtn").onclick = function() {
  document.getElementById("customerAccountModal").style.display = "none";
  resetCustomerModal();
};

// Close modal when clicking outside of it
document.getElementById("customerAccountModal").addEventListener("click", function(e) {
  if (e.target === this) {
    this.style.display = "none";
    resetCustomerModal();
  }
});

// Prevent modal from closing when clicking inside the modal content
document.querySelector("#customerAccountModal .modal-content").addEventListener("click", function(e) {
  e.stopPropagation();
});

// Load Customer Dropdown
async function loadCustomerDropdown() {
  const dropdown = document.getElementById("customerAccountSelector");
  if (!dropdown) return;
  
  try {
    dropdown.innerHTML = '<option value="">Loading customers...</option>';
    
    const snapshot = await db.collection("customerAccounts")
      .orderBy("firstName")
      .get();
    
    dropdown.innerHTML = '<option value="">-- Select Customer Account --</option>';
    
    snapshot.forEach(doc => {
      const customer = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      
      // Format display name
      let displayName = `${customer.firstName} ${customer.lastName}`;
      if (customer.type === "commercial" && customer.companyName) {
        displayName = `${customer.companyName} (${customer.firstName} ${customer.lastName})`;
      }
      
      option.textContent = displayName;
      option.dataset.customerData = JSON.stringify({
        id: doc.id,
        ...customer
      });
      
      dropdown.appendChild(option);
    });
    
  } catch (error) {
    console.error("Error loading customers:", error);
    dropdown.innerHTML = '<option value="">Error loading customers</option>';
  }
}

// Handle Customer Selection
function handleCustomerSelection() {
  const dropdown = document.getElementById("customerAccountSelector");
  const selectedOption = dropdown.options[dropdown.selectedIndex];
  const customerInfo = document.getElementById("selectedCustomerInfo");
  
  if (!selectedOption.value) {
    customerInfo.style.display = "none";
    window.selectedQuoteCustomer = null;
    return;
  }
  
  try {
    const customer = JSON.parse(selectedOption.dataset.customerData);
    window.selectedQuoteCustomer = customer;
    
    // Populate display fields
    document.getElementById("displayCustomerName").textContent = `${customer.firstName} ${customer.lastName}`;
    document.getElementById("displayCustomerEmail").textContent = customer.email || "";
    document.getElementById("displayCustomerPhone").textContent = customer.phone || "";
    document.getElementById("displayCustomerCompany").textContent = customer.companyName || "N/A";
    document.getElementById("displayCustomerAddress").textContent = customer.billingAddress || "N/A";
    
    customerInfo.style.display = "block";
    
  } catch (error) {
    console.error("Error parsing customer data:", error);
    customerInfo.style.display = "none";
  }
}

// Load customers when page loads (if user is authenticated)
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    loadCustomerDropdown();
  }
});
