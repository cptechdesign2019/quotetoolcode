// Update your existing resetCustomerModal function with this version
function resetCustomerModal() {
  // Show step 1, hide others
  document.getElementById("customerStep1").style.display = "";
  document.getElementById("customerStep2").style.display = "none";
  document.getElementById("addCustomerForm").style.display = "none";
  document.getElementById("customerStep3").style.display = "none";
  
  // Clear search
  document.getElementById("customerSearchInput").value = "";
  document.getElementById("customerSearchResults").innerHTML = "";
  
  // Clear form fields
  document.getElementById("customerFirstName").value = "";
  document.getElementById("customerLastName").value = "";
  document.getElementById("customerCompanyName").value = "";
  document.getElementById("customerEmail").value = "";
  document.getElementById("customerPhone").value = "";
  document.getElementById("customerBillingAddress").value = "";
  document.getElementById("projectNameInput").value = "";
  
  // Hide company name group by default
  document.getElementById("companyNameGroup").style.display = "none";
  
  // Reset global variables
  window.selectedCustomerAccount = null;
  window.newCustomerType = null;
  window.selectedProjectName = "";
  
  console.log("Customer modal reset");
}
