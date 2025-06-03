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
let currentUser = null;
let products = [];
let filteredProducts = [];
let selectedProduct = null;
let quoteItems = [];
let laborSections = []; // Will be populated below
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

  // Ensure all main quote builder sections are visible
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

  // If you want the SOW section visible by default as well, uncomment this:
  // var sow = document.getElementById("sow-editor-section");
  // if (sow) sow.style.display = "";

  // Or if you want the SOW section hidden by default, uncomment this:
  // var sow = document.getElementById("sow-editor-section");
  // if (sow) sow.style.display = "none";
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
  //await loadTemplates(); // Commented out: Fixes ReferenceError!
  //await loadSavedQuotes?.(); // Optional chaining in case not implemented yet
  renderLaborSections();
  renderSidebar();
  updateGrandTotals();
}

// ------------- PRODUCTS: LOAD & SEARCH -------------
async function loadProducts() {
  try {
    const snapshot = await db.collection('products').get();
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
  const brands = Array.from(new Set(products.map(p => p.brand))).sort();
  const brandDropdown = document.getElementById("brandFilterDropdown");
  brandDropdown.innerHTML = `<option value="">All Brands</option>` + brands.map(b => `<option>${b}</option>`).join("");
}

function updateProductDropdown() {
  const dropdown = document.getElementById("productDropdown");
  dropdown.innerHTML = `<option value="">-- Select a Product --</option>` +
    filteredProducts.map((p, i) =>
      `<option value="${i}">${p.name || "[No Name]"} (${p.brand || "[No Brand]"} - ${p.productNumber || "[No #]"})</option>`
    ).join("");
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
  document.getElementById("item-preview-name").innerText = p.name || "";
  document.getElementById("item-preview-number").innerText = p.productNumber || "";
  document.getElementById("item-preview-brand").innerText = p.brand || "";
  document.getElementById("item-preview-category").innerText = p.category || "";
  document.getElementById("item-preview-type").innerText = p.type || "";
  document.getElementById("item-preview-desc").innerText = p.description || "";
  document.getElementById("item-preview-msrp").innerText = p.msrp ? `$${p.msrp.toFixed(2)}` : "";
  document.getElementById("item-preview-map").innerText = p.map ? `$${p.map.toFixed(2)}` : "";
  document.getElementById("item-preview-cost").innerText = p.cost ? `$${p.cost.toFixed(2)}` : "";
  document.getElementById("item-preview-specsheet").href = p.specSheetUrl || "#";
  document.getElementById("item-preview-img").src = p.imageUrl || "placeholderlogoimage.png";
}

// ------------- QUOTE LOGIC -------------
document.getElementById("addToQuoteBtn").onclick = function() {
  if (!selectedProduct) return;
  // Default: markup 35%, qty 1
  quoteItems.push({
    ...selectedProduct,
    markup: 35,
    sellPrice: selectedProduct.msrp || selectedProduct.map || selectedProduct.cost * 1.35 || 0,
    qty: 1
  });
  renderQuoteTable();
  updateGrandTotals();
  document.getElementById("addSuccessNotification").innerText = "Item added to quote!";
  setTimeout(() => document.getElementById("addSuccessNotification").innerText = "", 1800);
};

function renderQuoteTable() {
  const tbody = document.getElementById("quoteItemsTbody");
  if (!quoteItems.length) {
    tbody.innerHTML = "";
    document.getElementById("emptyQuoteMsg").style.display = "";
    return;
  }
  document.getElementById("emptyQuoteMsg").style.display = "none";
  tbody.innerHTML = quoteItems.map((item, idx) => `
    <tr data-idx="${idx}">
      <td class="col-image"><img src="${item.imageUrl || 'placeholderlogoimage.png'}" style="max-width:40px;max-height:40px;border-radius:3px;"></td>
      <td class="col-product-name">${item.name}</td>
      <td class="col-product-number">${item.productNumber}</td>
      <td class="col-description">${item.description}</td>
      <td class="col-cost-price">$${item.cost ? item.cost.toFixed(2) : "0.00"}</td>
      <td class="col-markup"><input type="number" min="0" value="${item.markup}" class="editable-field" style="width:60px"></td>
      <td class="col-msrp">$${item.msrp ? item.msrp.toFixed(2) : "0.00"}</td>
      <td class="col-sell-price"><input type="number" min="0" value="${item.sellPrice}" class="editable-field" style="width:80px"></td>
      <td class="col-qty"><input type="number" min="1" value="${item.qty}" class="qty-input" style="width:50px"></td>
      <td class="col-line-total">$${(item.sellPrice * item.qty).toFixed(2)}</td>
      <td class="col-actions"><button class="action-button" title="Remove">✕</button></td>
    </tr>
  `).join("");
  addQuoteTableListeners();
  updateQuoteSummary();
}

function addQuoteTableListeners() {
  const tbody = document.getElementById("quoteItemsTbody");
  Array.from(tbody.querySelectorAll("tr")).forEach((tr, idx) => {
    // Remove
    tr.querySelector(".action-button").onclick = function() {
      quoteItems.splice(idx, 1);
      renderQuoteTable();
      updateGrandTotals();
    };
    // Markup
    tr.querySelector('.col-markup input').onchange = function() {
      let markup = parseFloat(this.value) || 0;
      quoteItems[idx].markup = markup;
      quoteItems[idx].sellPrice = +(quoteItems[idx].cost * (1 + markup / 100)).toFixed(2);
      renderQuoteTable();
      updateGrandTotals();
    };
    // Sell Price
    tr.querySelector('.col-sell-price input').onchange = function() {
      let sellPrice = parseFloat(this.value) || 0;
      quoteItems[idx].sellPrice = sellPrice;
      quoteItems[idx].markup = +(100 * ((sellPrice / quoteItems[idx].cost) - 1)).toFixed(2);
      renderQuoteTable();
      updateGrandTotals();
    };
    // Qty
    tr.querySelector('.col-qty input').onchange = function() {
      let qty = parseInt(this.value) || 1;
      quoteItems[idx].qty = qty;
      renderQuoteTable();
      updateGrandTotals();
    };
    // Drag and Drop (basic)
    tr.draggable = true;
    tr.ondragstart = e => { e.dataTransfer.setData("text/plain", idx); };
    tr.ondragover = e => { e.preventDefault(); tr.style.background="#e6f0ff"; };
    tr.ondragleave = e => { tr.style.background=""; };
    tr.ondrop = e => {
      e.preventDefault();
      const from = +e.dataTransfer.getData("text/plain");
      const to = idx;
      if (from !== to) {
        const [moved] = quoteItems.splice(from, 1);
        quoteItems.splice(to, 0, moved);
        renderQuoteTable();
      }
    };
    tr.ondragend = e => { tr.style.background=""; };
  });
}

function updateQuoteSummary() {
  const totalCost = quoteItems.reduce((sum, i) => sum + (i.cost * i.qty), 0);
  const totalSell = quoteItems.reduce((sum, i) => sum + (i.sellPrice * i.qty), 0);
  const profit = totalSell - totalCost;
  const gpm = totalSell ? 100 * profit / totalSell : 0;
  document.getElementById("summaryCostTotal").innerText = `$${totalCost.toFixed(2)}`;
  document.getElementById("summarySellTotal").innerText = `$${totalSell.toFixed(2)}`;
  document.getElementById("summaryProfitAmount").innerText = `$${profit.toFixed(2)}`;
  document.getElementById("summaryGPM").innerText = `${gpm.toFixed(2)}%`;
}

// ------------- LABOR SECTION -------------
function renderLaborSections() {
  const container = document.getElementById("laborItemsContainer");
  container.innerHTML = "";
  laborSections = laborConfig.map(cfg => ({
    ...cfg,
    numTechs: 0,
    numSubs: 0,
    numDays: 0,
    clientRate: cfg.defaultRate,
    techAssignments: [],
    manHours: 0,
    clientCost: 0,
    companyCost: 0,
    gpm: 0
  }));

  laborSections.forEach((section, idx) => {
    const card = document.createElement("div");
    card.className = "labor-card";
    card.innerHTML = `
      <div class="labor-card-header">${section.label}</div>
      <div class="labor-inputs-grid">
        <div class="labor-input-group">
          <label>Internal Technicians:</label>
          <input type="number" min="0" value="${section.numTechs}" data-labor="${idx}" data-field="numTechs">
        </div>
        ${section.showSubs ? `
        <div class="labor-input-group">
          <label>Number of Subcontractors:</label>
          <input type="number" min="0" value="${section.numSubs}" data-labor="${idx}" data-field="numSubs">
        </div>
        ` : ""}
        <div class="labor-input-group">
          <label>Number of Days:</label>
          <input type="number" min="0" step="0.1" value="${section.numDays}" data-labor="${idx}" data-field="numDays">
        </div>
        <div class="labor-input-group">
          <label>Client Rate (per Man-Hour):</label>
          <input type="number" min="0" step="0.01" value="${section.clientRate}" data-labor="${idx}" data-field="clientRate">
        </div>
      </div>
      <div class="tech-assignment-area">
        ${Array(section.numTechs).fill(0).map((_, n) => `
          <div class="tech-slot">
            <label>Tech ${n+1}:</label>
            <select data-labor="${idx}" data-tech="${n}">
              ${techList.map(t => `<option>${t}</option>`).join("")}
            </select>
          </div>
        `).join("")}
      </div>
      ${section.showSubs ? `
      <div class="subcontractor-assignment-area">
        ${Array(section.numSubs).fill(0).map((_, n) => `
          <div class="subcontractor-slot">
            <label>Subcontractor ${n+1}:</label>
            <input type="text" placeholder="Name" data-labor="${idx}" data-sub="${n}">
          </div>
        `).join("")}
      </div>
      ` : ""}
      <div class="labor-card-summary">
        <p>Total Man-Hours: <strong id="labor-manhrs-${idx}">${section.manHours.toFixed(1)}</strong></p>
        <p>Total Client Cost: <strong id="labor-clientcost-${idx}">$${section.clientCost.toFixed(2)}</strong></p>
        <p>Total Company Cost: <strong id="labor-companycost-${idx}">$${section.companyCost.toFixed(2)}</strong></p>
        <p>Gross Profit Margin: <strong id="labor-gpm-${idx}">${section.gpm.toFixed(1)}%</strong></p>
      </div>
    `;
    container.appendChild(card);
  });

  // Add listeners for all inputs in labor cards
  Array.from(container.querySelectorAll('input[type="number"]')).forEach(input => {
    input.onchange = function() {
      const idx = +input.dataset.labor;
      const field = input.dataset.field;
      laborSections[idx][field] = parseFloat(this.value) || 0;
      renderLaborSections();
      updateGrandTotals();
    };
  });
  // No-op: assignments/subs are for display only, not used in math here
  updateLaborSummary();
}

function updateLaborSummary() {
  let totalManHours = 0, totalClientCost = 0, totalCompanyCost = 0;
  laborSections.forEach((section, idx) => {
    const manHours = (section.numTechs + (section.numSubs || 0)) * 8 * section.numDays;
    const clientCost = manHours * section.clientRate;
    const companyCost = manHours * (section.clientRate * 0.375); // Example: company cost = 37.5% of client rate
    const gpm = clientCost ? 100 * (clientCost - companyCost) / clientCost : 0;
    section.manHours = manHours;
    section.clientCost = clientCost;
    section.companyCost = companyCost;
    section.gpm = gpm;
    document.getElementById(`labor-manhrs-${idx}`).innerText = manHours.toFixed(1);
    document.getElementById(`labor-clientcost-${idx}`).innerText = `$${clientCost.toFixed(2)}`;
    document.getElementById(`labor-companycost-${idx}`).innerText = `$${companyCost.toFixed(2)}`;
    document.getElementById(`labor-gpm-${idx}`).innerText = `${gpm.toFixed(1)}%`;
    totalManHours += manHours;
    totalClientCost += clientCost;
    totalCompanyCost += companyCost;
  });
  document.getElementById("laborSummaryManHours").innerText = totalManHours.toFixed(1);
  document.getElementById("laborSummaryCostTotal").innerText = `$${totalCompanyCost.toFixed(2)}`;
  document.getElementById("laborSummarySellTotal").innerText = `$${totalClientCost.toFixed(2)}`;
  const profit = totalClientCost - totalCompanyCost;
  const gpm = totalClientCost ? 100 * profit / totalClientCost : 0;
  document.getElementById("laborSummaryProfitAmount").innerText = `$${profit.toFixed(2)}`;
  document.getElementById("laborSummaryGPM").innerText = `${gpm.toFixed(2)}%`;
}

// ------------- GRAND TOTALS -------------
function updateGrandTotals() {
  // Equipment
  const eqCost = quoteItems.reduce((sum, i) => sum + (i.cost * i.qty), 0);
  const eqClient = quoteItems.reduce((sum, i) => sum + (i.sellPrice * i.qty), 0);
  // Labor
  const laborCompanyCost = laborSections.reduce((sum, s) => sum + s.companyCost, 0);
  const laborClient = laborSections.reduce((sum, s) => sum + s.clientCost, 0);

  // Adjustments
  const discountPct = parseFloat(document.getElementById("discountPercent").value) || 0;
  const shippingPct = parseFloat(document.getElementById("shippingPercent").value) || 0;
  const salesTaxPct = parseFloat(document.getElementById("salesTaxPercent").value) || 0;

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

  // DOM
  document.getElementById("grandEquipmentClientTotal").innerText = `$${eqClient.toFixed(2)}`;
  document.getElementById("grandLaborClientTotal").innerText = `$${laborClient.toFixed(2)}`;
  document.getElementById("grandCombinedSubtotal").innerText = `$${combinedSubtotal.toFixed(2)}`;
  document.getElementById("grandDiscountAmount").innerText = `-$${discountAmount.toFixed(2)}`;
  document.getElementById("grandSubtotalAfterDiscount").innerText = `$${subtotalAfterDiscount.toFixed(2)}`;
  document.getElementById("grandShippingAmount").innerText = `$${shippingAmount.toFixed(2)}`;
  document.getElementById("grandSalesTaxAmount").innerText = `$${salesTaxAmount.toFixed(2)}`;
  document.getElementById("finalGrandTotal").innerText = `$${finalTotal.toFixed(2)}`;
  document.getElementById("grandEquipmentCompanyCost").innerText = `$${eqCost.toFixed(2)}`;
  document.getElementById("grandLaborCompanyCost").innerText = `$${laborCompanyCost.toFixed(2)}`;
  document.getElementById("grandOverallCompanyCost").innerText = `$${grandCompanyCost.toFixed(2)}`;
  document.getElementById("grandOverallProfitAmount").innerText = `$${overallProfit.toFixed(2)}`;
  document.getElementById("grandOverallGPM").innerText = `${gpm.toFixed(2)}%`;
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
// Removed reference to "toggleLoadQuoteSidebarBtn" to fix error

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
  document.getElementById("sow-editor-section").style.display = "none"; {
  document.getElementById("project-info").style.display = "";
  document.getElementById("item-selector").style.display = "";
  document.getElementById("item-preview").style.display = "";
  document.getElementById("quote-display").style.display = "";
  document.getElementById("labor-section").style.display = "";
  document.getElementById("grand-totals-section").style.display = "";
  document.getElementById("quote-actions-final").style.display = "";
};

  document.getElementById("sow-editor-section").style.display = ""; {
  document.getElementById("project-info").style.display = "none";
  document.getElementById("item-selector").style.display = "none";
  document.getElementById("item-preview").style.display = "none";
  document.getElementById("quote-display").style.display = "none";
  document.getElementById("labor-section").style.display = "none";
  document.getElementById("grand-totals-section").style.display = "none";
  document.getElementById("quote-actions-final").style.display = "none";
};

// ------------- SPEC SHEET MODAL -------------
document.getElementById("viewSpecSheetsBtn").onclick = function() {
  document.getElementById("specSheetModal").style.display = "block";
  // TODO: Populate specSheetLinksContainer from quoteItems
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
