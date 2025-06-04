// Clearpoint AV Quoting Tool - Main JS
// Assumes DOM matches the provided HTML structure and IDs/classes
// Uses Firebase for auth/data, supports branded UI and all described features

// ------------- FIREBASE CONFIG -------------
// TODO: Fill in your Firebase config here!
const firebaseConfig = {
    apiKey: "AIzaSyCZ1hlNQ6TbyJsBgFplVBmiqBRTbgJreZM", // PASTE YOUR ACTUAL API KEY HERE
    authDomain: "clearpoint-quoting-tool.firebaseapp.com", // PASTE YOUR ACTUAL AUTH DOMAIN HERE
    projectId: "clearpoint-quoting-tool", // PASTE YOUR ACTUAL PROJECT ID HERE
    storageBucket: "clearpoint-quoting-tool.firebasestorage.app", // PASTE YOUR ACTUAL STORAGE BUCKET HERE
    messagingSenderId: "551915292541", // PASTE YOUR ACTUAL MESSAGING SENDER ID HERE
    appId: "1:551915292541:web:eae34446f251a9223fae14" // PASTE YOUR ACTUAL APP ID HERE
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ------------- GLOBALS -------------
// Only use window.quoteItems and window.laborSections for all quote/labor logic!
window.quoteItems = window.quoteItems || [];
window.laborSections = window.laborSections || [];

let currentUser = null;
let products = [];
let filteredProducts = [];
let selectedProduct = null;
// Remove local quoteItems and laborSections
// let quoteItems = [];
// let laborSections = [];
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

// --- Labor Section Config ---
const laborConfig = [
  { id: "sde", label: "System Design & Engineering", showSubs: false, defaultRate: 150 },
  { id: "programming", label: "Programming", showSubs: false, defaultRate: 150 },
  { id: "prewire", label: "Pre-wire", showSubs: true, defaultRate: 100 },
  { id: "installation", label: "Installation", showSubs: true, defaultRate: 100 }
];

// ------------- AUTH: LOGIN/LOGOUT -------------
function showLogin() {
  document.getElementById("mainAppContent").style.display = "none";
  document.getElementById("loginView").style.display = "block";
}

function showApp() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("mainAppContent").style.display = "block";
  document.getElementById("logoutButton").style.display = "block";

  [
    "project-info",
    "item-selector",
    "item-preview",
    "quote-display",
    "labor-section",
    "grand-totals-section",
    "quote-actions-final"
  ].forEach(id => {
    var el = document.getElementById(id);
    if (el) el.style.display = "";
  });
  // SOW section hidden by default
  var sow = document.getElementById("sow-editor-section");
  if (sow) sow.style.display = "none";
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    showApp();
    loadInitialData();
    updateFooterYear();
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
  //await loadTemplates(); // Uncomment if implemented
  //await loadSavedQuotes?.(); // Optional chaining in case not implemented yet
  renderLaborSections();
  renderSidebar();
  updateGrandTotals();
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

      if (brand !== "[No Brand]") {
        display += brand;
      }

      if (name) {
        display += display ? " – " + name : name;
      }

      if (!display.trim()) display = "[No Product Data]";

      return `<option value="${i}" title="${p.description || ''}">${display}</option>`;
    }).join("");
  dropdown.disabled = filteredProducts.length === 0;
}

// Search filter
document.getElementById("productSearchInput").oninput = filterProducts;
document.getElementById("brandFilterDropdown").onchange = filterProducts;

function filterProducts() {
  const search = document.getElementById("productSearchInput").value.toLowerCase();
  const brand = document.getElementById("brandFilterDropdown").value;
  const brandLC = brand ? brand.toLowerCase() : "";
  filteredProducts = products.filter(p =>
    (!brandLC || ((p.brand || "").toLowerCase() === brandLC)) &&
    ((p.name || "").toLowerCase().includes(search) ||
     (p.productNumber || "").toLowerCase().includes(search) ||
     (p.brand || "").toLowerCase().includes(search))
  );
  updateProductDropdown();
}

// Product dropdown change
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
  document.getElementById("item-preview-specsheet").href = p.specSheetURL || "#";
  document.getElementById("item-preview-img").src = p.imageURL || "placeholderlogoimage.png";
}

// ------------- QUOTE LOGIC -------------
document.getElementById("addToQuoteBtn").onclick = function() {
  if (!selectedProduct) return;

  // Calculate sellPrice and markup
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

  // Add to quote
  window.quoteItems.push({
    ...selectedProduct,
    markup: parseFloat(markup.toFixed(2)),
    sellPrice: parseFloat(sellPrice.toFixed(2)),
    qty: 1
  });

  renderQuoteTable();
  updateQuoteSummary();
  updateGrandTotals();

  // Clear preview & reset dropdown
  selectedProduct = null;
  document.getElementById("productDropdown").value = "";
  updateItemPreview();
  document.getElementById("addToQuoteBtn").disabled = true;

  // Success notification
  document.getElementById("addSuccessNotification").innerText = "Item added to quote!";
  setTimeout(() => document.getElementById("addSuccessNotification").innerText = "", 1800);
};

// Renders the quote table with editable fields for Markup %, Sell Price, and Qty
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
        <img src="${item.imageURL || 'placeholderlogoimage.png'}" 
             alt="${item.productName || ''}">
      </td>
      <td class="col-product-name">${item.productName || ""}</td>
      <td class="col-product-number">${item.productNumber || ""}</td>
      <td class="col-description">${item.description || ""}</td>
      <td class="col-cost-price">${typeof item.costPrice === "number" ? `$${item.costPrice.toFixed(2)}` : ""}</td>
      <td class="col-markup">
        <input type="number" min="0" max="1000" step="0.01" value="${item.markup ?? 0}" 
          style="width:60px;" 
          onchange="updateQuoteItem(${idx}, 'markup', this.value)">
      </td>
      <td class="col-msrp">${typeof item.msrp === "number" ? `$${item.msrp.toFixed(2)}` : ""}</td>
      <td class="col-sell-price">
        <input type="number" min="0" step="0.01" value="${item.sellPrice ?? 0}" 
          style="width:90px;" 
          onchange="updateQuoteItem(${idx}, 'sellPrice', this.value)">
      </td>
      <td class="col-qty">
        <input type="number" min="1" step="1" value="${item.qty ?? 1}" 
          style="width:50px;" 
          onchange="updateQuoteItem(${idx}, 'qty', this.value)">
      </td>
      <td class="col-line-total">${typeof item.sellPrice === "number" && item.qty ? `$${(item.sellPrice * item.qty).toFixed(2)}` : ""}</td>
      <td class="col-actions">
        <button class="action-button" onclick="removeQuoteItem(${idx})">Remove</button>
      </td>
    </tr>
  `).join("");

  // Initialize or update SortableJS for drag-and-drop row reordering
  if (!window.quoteTableSortable) {
    window.quoteTableSortable = Sortable.create(tbody, {
      animation: 150,
      handle: '.drag-handle',
      onEnd: function (evt) {
        // Get the new order of indexes
        const newOrder = Array.from(tbody.children).map(row => parseInt(row.dataset.idx, 10));
        // Reorder window.quoteItems array
        window.quoteItems = newOrder.map(i => window.quoteItems[i]);
        renderQuoteTable(); // re-render table to update indices and event handlers
        updateQuoteSummary();
        updateGrandTotals();
      }
    });
  } else {
    window.quoteTableSortable.option("disabled", false);
  }
}

// Updates an individual quote item, recalculates dependent fields, and refreshes summary
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

// Removes an item from the quote and refreshes table and summary
function removeQuoteItem(idx) {
  window.quoteItems.splice(idx, 1);
  renderQuoteTable();
  updateQuoteSummary();
  updateGrandTotals();
}

// Updates the equipment quote summary (cost, sell, profit, margin)
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

  // Equipment Quote Summary section
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

  // Remove grand total/overall DOM updates from here!
  // These fields are now only updated in updateGrandTotals()
}

function addQuoteTableListeners() {
  const tbody = document.getElementById("quoteItemsTbody");
  if (!tbody) return;

  // Remove previous listeners (optional: depends on your re-render logic)
  tbody.removeEventListener("change", quoteTableChangeHandler);
  tbody.removeEventListener("click", quoteTableClickHandler);

  // Delegate 'change' events for markup, sellPrice, qty fields
  tbody.addEventListener("change", quoteTableChangeHandler);

  // Delegate 'click' events for remove buttons
  tbody.addEventListener("click", quoteTableClickHandler);
}

function quoteTableChangeHandler(e) {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const idx = tr.rowIndex - 1; // Adjust if you have a header row

  if (e.target.matches("input[type='number'][data-field]")) {
    updateQuoteItem(idx, e.target.getAttribute("data-field"), e.target.value);
  }
}

function quoteTableClickHandler(e) {
  if (e.target.matches(".action-button")) {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const idx = tr.rowIndex - 1;
    removeQuoteItem(idx);
  }
}

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
    // Defensive: ensure all arrays exist
    section.techAssignments = Array.isArray(section.techAssignments) ? section.techAssignments : [];
    section.subAssignments = Array.isArray(section.subAssignments) ? section.subAssignments : [];
    // Sync tech assignments to numTechs
    while (section.techAssignments.length < section.numTechs) section.techAssignments.push(techList[0]);
    while (section.techAssignments.length > section.numTechs) section.techAssignments.pop();
    // Sync sub assignments to numSubs (default to first sub option)
    while (section.subAssignments.length < section.numSubs) section.subAssignments.push(subOptions[0].value);
    while (section.subAssignments.length > section.numSubs) section.subAssignments.pop();
    // Defensive: ensure days fields always exist and are number
    section.numTechDays = Number(section.numTechDays) || 0;
    section.numSubDays = Number(section.numSubDays) || 0;

    // Tech selectors
    const techSelectors = section.techAssignments.map(
      (tech, tIdx) => `
        <select class="form-select" onchange="setTechAssignment(${idx}, ${tIdx}, this.value)">
          ${techList.map(
            t => `<option value="${t}" ${t === tech ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      `
    ).join("");

    // Subcontractor selectors (dropdown with rates)
    const subSelectors = section.subAssignments.map(
      (sub, sIdx) => `
        <select class="form-select" onchange="setSubAssignment(${idx}, ${sIdx}, this.value)">
          ${subOptions.map(
            opt => `<option value="${opt.value}" ${opt.value === sub ? "selected" : ""}>${opt.label}</option>`
          ).join("")}
        </select>
      `
    ).join("");

    // For prewire and installation, Client Rate is on same row as Days Per Tech
    const isPrewireOrInstall = section.id === "prewire" || section.id === "installation";

    // Use grid layout for better spacing
    let cardContent = `
      <div class="labor-card-flexrows">
        <div class="labor-col">
          <label>Internal Technicians</label>
          <input type="number" min="0" max="10" value="${section.numTechs}" step="1"
            class="form-control" onchange="setNumTechs(${idx}, this.value)">
          <div class="tech-selectors">${techSelectors}</div>
        </div>
        <div class="labor-col">
          <label>Days Per Tech</label>
          <input type="number" min="0" step="1" value="${section.numTechDays}"
            class="form-control" onchange="setNumTechDays(${idx}, this.value)">
        </div>
        ${isPrewireOrInstall ?
          `<div class="labor-col">
            <label>Client Rate (per Man-Hour)</label>
            <input type="number" min="0" step="0.01" value="${section.clientRate}" class="form-control"
              onchange="setClientRate(${idx}, this.value)">
          </div>` : ''
        }
        ${section.showSubs ? `
          <div class="labor-col">
            <label>Subcontractors</label>
            <input type="number" min="0" max="10" value="${section.numSubs}" step="1"
              class="form-control" onchange="setNumSubs(${idx}, this.value)">
            <div class="sub-selectors">${subSelectors}</div>
          </div>
          <div class="labor-col">
            <label>Days (Subs)</label>
            <input type="number" min="0" step="1" value="${section.numSubDays}"
              class="form-control" onchange="setNumSubDays(${idx}, this.value)">
          </div>
        ` : ''}
        <div class="labor-card-summary" style="grid-column: 1 / -1;">
          <p>Total Man-Hours: <strong id="labor-manhrs-${idx}">${(section.manHours||0).toFixed(1)}</strong></p>
          <p>Total Client Cost: <strong id="labor-clientcost-${idx}">$${(section.clientCost||0).toFixed(2)}</strong></p>
          <p>Total Company Cost: <strong id="labor-companycost-${idx}">$${(section.companyCost||0).toFixed(2)}</strong></p>
          <p>Gross Profit Margin: <strong id="labor-gpm-${idx}">${(section.gpm||0).toFixed(1)}%</strong></p>
        </div>
      </div>
    `;

    // Build the card layout
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

// ------------- FOOTER YEAR -------------
function updateFooterYear() {
  document.getElementById("currentYear").innerText = (new Date()).getFullYear();
}

// ------------- SIDEBAR, TEMPLATES, SAVED QUOTES -------------
function renderSidebar() {
  // TODO: Render templates and saved quotes in sidebar
  // Example:
  // document.getElementById("templateList").innerHTML = templates.map(...).join("");
  // document.getElementById("savedQuotesList").innerHTML = savedQuotes.map(...).join("");
}

// Show/hide sidebar
document.getElementById("loadQuoteBarBtn").onclick = function() {
  document.getElementById("loadQuoteSidebar").style.display = "block";
};

document.getElementById("closeLoadQuoteSidebarBtn").onclick = function() {
  document.getElementById("loadQuoteSidebar").style.display = "none";
};

// ------------- ACTION BUTTONS -------------
document.getElementById("saveQuoteBtn").onclick = saveQuote;
document.getElementById("saveQuoteBarBtn").onclick = saveQuote;
function saveQuote() {
  // TODO: Save to Firestore
  alert("Quote saved! (implement Firestore logic)");
}

document.getElementById("printQuoteBtn").onclick = function() {
  window.print();
};

document.getElementById("downloadPdfBtn").onclick = function() {
  // TODO: Use jsPDF to export quote PDF
  alert("Download PDF coming soon!");
};

// ------------- SOW LOGIC -------------
document.getElementById("sowAiPromptText").oninput = function() {
  // Optionally, enable AI drafting button
};
document.getElementById("draftFullSowWithAiBtn").onclick = function() {
  // TODO: Integrate with AI for SOW generation
  document.getElementById("sowFullOutputText").value = "AI-generated SOW goes here. (Integrate your AI.)";
};

// ------------- NAVIGATION TABS -------------
function showMainSections() {
  document.getElementById("sow-editor-section").style.display = "none";
  document.getElementById("project-info").style.display = "";
  document.getElementById("item-selector").style.display = "";
  document.getElementById("item-preview").style.display = "";
  document.getElementById("quote-display").style.display = "";
  document.getElementById("labor-section").style.display = "";
  document.getElementById("grand-totals-section").style.display = "";
  document.getElementById("quote-actions-final").style.display = "";
}

function showSowSection() {
  document.getElementById("sow-editor-section").style.display = "";
  document.getElementById("project-info").style.display = "none";
  document.getElementById("item-selector").style.display = "none";
  document.getElementById("item-preview").style.display = "none";
  document.getElementById("quote-display").style.display = "none";
  document.getElementById("labor-section").style.display = "none";
  document.getElementById("grand-totals-section").style.display = "none";
  document.getElementById("quote-actions-final").style.display = "none";
}

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

// ------------- INIT ON LOAD -------------
window.onload = function() {
  updateFooterYear();
};
