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
async function saveQuote() {
  try {
    const projectNameNumber = document.getElementById("projectNameNumber").value.trim();
    const quoteStatus = document.getElementById("quoteStatusSelector").value;
    const discountPercent = parseFloat(document.getElementById("discountPercent").value) || 0;
    const shippingPercent = parseFloat(document.getElementById("shippingPercent").value) || 0;
    const salesTaxPercent = parseFloat(document.getElementById("salesTaxPercent").value) || 0;
    const sowText = document.getElementById("sowFullOutputText").value;
    const quoteData = {
      projectNameNumber,
      quoteStatus,
      discountPercent,
      shippingPercent,
      salesTaxPercent,
      sowText,
      quoteItems: JSON.parse(JSON.stringify(window.quoteItems)),
      laborSections: JSON.parse(JSON.stringify(window.laborSections)),
      lastEditedBy: currentUser ? currentUser.email : 'unknown',
      lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    let quoteId = activeQuoteId;
    let isNew = false;
    if (!quoteId) {
      const docRef = await db.collection("quotes").add(quoteData);
      quoteId = docRef.id;
      activeQuoteId = quoteId;
      isNew = true;
    } else {
      await db.collection("quotes").doc(quoteId).set(quoteData, { merge: true });
    }
    await loadQuotesAndTemplates();
    renderSidebar();
    showNotification(isNew ? "Quote saved successfully!" : "Quote updated successfully!", "success");
  } catch (e) {
    showNotification("Failed to save quote: " + (e.message || e), "error");
    console.error("Save quote error:", e);
  }
}
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
    
    // Header Section Box
    doc.setFillColor(240, 245, 250); // Very light blue background
    doc.rect(15, 15, 180, 55, 'F');
    doc.setDrawColor(22, 41, 68); // #162944
    doc.setLineWidth(0.5);
    doc.rect(15, 15, 180, 55, 'S');
    
    // Company Logo
    try {
      const logoImg = await loadImageAsBase64('cpheaderlogo.png');
      doc.addImage(logoImg, 'PNG', 20, 20, 35, 18);
    } catch (e) {
      console.log("Logo loading failed, continuing without logo");
    }
    
    // Project Name (prominent)
    doc.setTextColor(22, 41, 68); // #162944
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("PROJECT:", 20, 45);
    doc.setFont("times", "normal");
    doc.text(projectName, 50, 45);
    
    // Company Information (smaller, right side)
    doc.setFontSize(9);
    doc.setFont("times", "bold");
    doc.text("Clearpoint Technology + Design", 125, 25);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.text("285 Old County Line Road, STE B", 125, 30);
    doc.text("Westerville, OH 43081", 125, 34);
    doc.text("740-936-7767", 125, 38);
    
    // Customer Information (if available)
    if (window.activeCustomerForQuote) {
      const customer = window.activeCustomerForQuote;
      doc.setFontSize(10);
      doc.setFont("times", "bold");
      doc.text("CLIENT:", 125, 48);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      const customerName = customer.type === "commercial" && customer.companyName 
        ? `${customer.companyName}`
        : `${customer.firstName} ${customer.lastName}`;
      doc.text(customerName, 125, 53);
      
      if (customer.type === "commercial" && customer.companyName) {
        doc.text(`${customer.firstName} ${customer.lastName}`, 125, 57);
      }
      
      if (customer.email && yPosition < 65) {
        doc.text(customer.email, 125, 61);
      }
      if (customer.phone && yPosition < 65) {
        doc.text(customer.phone, 125, 65);
      }
    }
    
    yPosition = 85;
    
    // Equipment Table
    if (window.quoteItems && window.quoteItems.length > 0) {
      doc.setTextColor(22, 41, 68);
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.text("EQUIPMENT", 20, yPosition);
      yPosition += 8;
      
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
          if (item.imageURL || item.imageUrl) {
            imageData = await loadImageAsBase64(item.imageURL || item.imageUrl);
          }
        } catch (e) {
          console.log(`Failed to load image for item ${i}`);
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
          halign: 'left',
          valign: 'middle'
        },
        headStyles: { 
          fillColor: [22, 41, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' }, // Image column
          1: { cellWidth: 35 }, // Product name
          2: { cellWidth: 45 }, // Description
          3: { cellWidth: 15, halign: 'center', valign: 'middle' }, // Qty
          4: { cellWidth: 25, halign: 'center', valign: 'middle' }, // Price
          5: { cellWidth: 25, halign: 'center', valign: 'middle' }  // Total
        },
        didDrawCell: function (data) {
          // Add images to the first column
          if (data.column.index === 0 && data.section === 'body') {
            const item = equipmentTableData[data.row.index];
            if (item && item.image) {
              try {
                const cellX = data.cell.x + 2;
                const cellY = data.cell.y + 2;
                const imgSize = Math.min(data.cell.height - 4, 16);
                doc.addImage(item.image, 'PNG', cellX, cellY, imgSize, imgSize);
              } catch (e) {
                console.log('Error adding image to PDF:', e);
              }
            }
          }
        }
      });
      
      // Equipment total
      const finalY = doc.lastAutoTable.finalY + 5;
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text("Equipment Total:", 140, finalY);
      doc.text(`$${equipmentTotal.toFixed(2)}`, 170, finalY);
      
      yPosition = finalY + 15;
    }
    
    // Labor Section
    if (laborSections && laborSections.some(section => section.clientCost > 0)) {
      doc.setTextColor(22, 41, 68);
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.text("LABOR", 20, yPosition);
      yPosition += 8;
      
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
          fontSize: 9,
          font: 'times',
          textColor: [22, 41, 68],
          valign: 'middle'
        },
        headStyles: { 
          fillColor: [22, 41, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 40, halign: 'center', valign: 'middle' }
        }
      });
      
      // Labor total
      const finalY = doc.lastAutoTable.finalY + 5;
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text("Labor Total:", 140, finalY);
      doc.text(`$${laborTotal.toFixed(2)}`, 170, finalY);
      
      yPosition = finalY + 15;
    }
    
    // Grand Totals Section
    doc.setTextColor(22, 41, 68);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("QUOTE SUMMARY", 20, yPosition);
    yPosition += 8;
    
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
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'center', valign: 'middle', fontStyle: 'bold' }
      }
    });
    
    // Final Total (prominent)
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFillColor(22, 41, 68);
    doc.rect(20, finalY - 5, 160, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL QUOTE AMOUNT:", 25, finalY + 2);
    doc.text(`$${finalTotal.toFixed(2)}`, 150, finalY + 2);
    
    yPosition = finalY + 25;
    
    // Validity Notice
    doc.setTextColor(22, 41, 68);
    doc.setFontSize(9);
    doc.setFont("times", "italic");
    doc.text("This quote is valid for 30 days unless specified in writing otherwise.", 20, yPosition);
    
    // Save the PDF
    doc.save(filename);
    
  } catch (error) {
    console.error("PDF generation error:", error);
    alert("Error generating PDF. Please try again.");
  }
};

// Updated helper function to load image as base64
function loadImageAsBase64(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

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
      plugins: "lists link table autoresize code image charmap preview searchreplace advlist anchor insertdatetime media", // <--- no paste!
      toolbar: "undo redo | styles | bold italic underline | alignleft aligncenter alignright alignjustify | fontselect fontsizeselect formatselect | forecolor backcolor | cut copy | bullist numlist outdent indent | link image media table | blockquote subscript superscript | removeformat | preview code",
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
 };

// --- Customer Account Modal Logic (matching new modal HTML & companyNameGroup logic) ---

// Globals for customer workflow
window.selectedCustomerAccount = null;
window.newCustomerType = null;
window.selectedProjectName = "";


// Utility: Reset all modal steps/fields
function resetCustomerModal() {
  document.getElementById("customerStep1").style.display = "";
  document.getElementById("customerStep2").style.display = "none";
  document.getElementById("addCustomerForm").style.display = "none";
  document.getElementById("customerStep3").style.display = "none";
  document.getElementById("customerSearchInput").value = "";
  document.getElementById("customerSearchResults").innerHTML = "";

  document.getElementById("customerFirstName").value = "";
  document.getElementById("customerLastName").value = "";
  document.getElementById("customerCompanyName").value = "";
  document.getElementById("customerEmail").value = "";
  document.getElementById("customerPhone").value = "";
  document.getElementById("customerBillingAddress").value = "";
  document.getElementById("customerProjectAddress").value = "";
  document.getElementById("companyNameGroup").style.display = "none"; // Hide by default

  window.selectedCustomerAccount = null;
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
      window.selectedCustomerAccount = c;
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
}

// --- Step 2: Save new customer form ---
document.getElementById("addCustomerForm").onsubmit = async function(e) {
  e.preventDefault();
  // Gather info
  const firstName = document.getElementById("customerFirstName").value.trim();
  const lastName = document.getElementById("customerLastName").value.trim();
  const companyName = document.getElementById("customerCompanyName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const billingAddress = document.getElementById("customerBillingAddress").value.trim();
  const projectAddress = document.getElementById("customerProjectAddress").value.trim();
  const type = window.newCustomerType;

  // Keywords for search (for future improvements)
  let keywords = [
    firstName.toLowerCase(),
    lastName.toLowerCase(),
    ...(companyName ? [companyName.toLowerCase()] : [])
  ];

  // Save to Firestore
  const docRef = await db.collection("customerAccounts").add({
    firstName, lastName, companyName, email, phone, billingAddress, addresses: [projectAddress],
    type,
    created: firebase.firestore.FieldValue.serverTimestamp(),
    searchKeywords: keywords
  });
  // Set as selected customer for this quote
  window.selectedCustomerAccount = {
    id: docRef.id, firstName, lastName, companyName, email, phone, billingAddress, addresses: [projectAddress], type
  };
  // Move to project name step
  document.getElementById("addCustomerForm").style.display = "none";
  document.getElementById("customerStep3").style.display = "";
  document.getElementById("projectNameInput").focus();
};

// --- Step 3: Enter project name and create quote ---
document.getElementById("createQuoteBtn").onclick = function() {
  const projectName = document.getElementById("projectNameInput").value.trim();
  if (!window.selectedCustomerAccount || !projectName) {
    alert("Please select a customer and enter a project name.");
    return;
  }
  window.selectedProjectName = projectName;
  // Set project name in quote builder UI
  document.getElementById("projectNameNumber").value = projectName;
  // Optionally, store active customer/project for this quote for later use
  window.activeCustomerForQuote = window.selectedCustomerAccount;
  window.activeProjectName = projectName;
  // Close modal
  closeCustomerModal();
};

// When modal is closed, optional: reset
document.getElementById("customerAccountModal").addEventListener("click", function(e) {
  if (e.target === this) closeCustomerModal();
});

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
