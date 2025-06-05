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

let currentUser = null;
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

// ----------- TAB NAVIGATION -----------

const mainTabs = [
  { btn: "tabQuoteBuilderBtn", page: "tabQuoteBuilderPage" },
  { btn: "tabScopeOfWorkBtn", page: "tabScopeOfWorkPage" },
  { btn: "tabTaskListBtn", page: "tabTaskListPage" }
];
mainTabs.forEach(({ btn, page }) => {
  document.getElementById(btn).addEventListener("click", () => {
    // Deactivate the Product Library tab and hide its section
    document.getElementById("tabProductLibraryBtn").classList.remove("active");
    document.getElementById("productLibrarySection").style.display = "none";

    // Handle active state and visibility for the other main tabs and pages
    mainTabs.forEach(({ btn: b, page: p }) => {
      document.getElementById(b).classList.toggle("active", b === btn);
      document.getElementById(p).style.display = (p === page ? "" : "none");
    });

    // Special handling for TinyMCE if the Scope of Work tab is selected
    if (page === "tabScopeOfWorkPage") {
      setTimeout(() => {
        if (window.tinymce && tinymce.get("sowFullOutputText")) tinymce.get("sowFullOutputText"); // Ensure editor is properly initialized/focused
      }, 200);
    }
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
document.getElementById("downloadPdfBtn").onclick = function() {
  alert("Download PDF coming soon!");
};

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
