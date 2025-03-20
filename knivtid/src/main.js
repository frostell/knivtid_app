// src/main.js

// 1. Imports
import $ from "jquery";
import "datatables.net";
import * as XLSX from "xlsx";

// Use vanilla JS approach to avoid jQuery/DataTables initialization errors
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");
  
  // Get the file input element
  const fileInput = document.getElementById("excelFile");
  
  if (fileInput) {
    // Add event listener to the file input that triggers when a file is selected
    fileInput.addEventListener("change", handleLoadExcel);
    console.log("File input change handler added");
  }
});

function handleLoadExcel() {
  console.log("File selected");
  
  const fileInput = document.getElementById("excelFile");
  
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    console.log("No file selected");
    return;
  }

  const file = fileInput.files[0];
  console.log("Processing file:", file.name);
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      console.log("File loaded into memory");
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: "array"});
      console.log("XLSX parsed successfully");
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays
      let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log("Data rows:", jsonData.length);
      
      // Skip first 3 rows, equivalent to data[4:nrow(data), c(1, 5, 6, 20)]
      jsonData = jsonData.slice(3).map(row => [
        row[0] || "",  // Column 1 (index 0) - Opkort
        row[4] || "",  // Column 5 (index 4) - Namn
        row[5] || "",  // Column 6 (index 5) - Personnummer
        row[19] || "" // Column 20 (index 19) - Tider
      ]);
      
      // Filter out rows with missing first column (equivalent to !is.na(data[, 1]))
      jsonData = jsonData.filter(row => row[0] !== "");
      
      // Add header row - matches the R column names
      jsonData.unshift(["Opkort", "Namn", "Personnummer", "Tider"]);
      
      // Process each row to extract times and calculate duration
      const processedData = [];
      processedData.push(["Namn", "Personnummer", "Datum", "Opkort", "Knivtid (min)"]);
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Extract start time using regex
        const startMatch = row[3].match(/Knivtid start - (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
        const startStr = startMatch ? startMatch[1] : null;
        
        // Extract end time using regex
        const endMatch = row[3].match(/Knivtid slut - (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
        const endStr = endMatch ? endMatch[1] : null;
        
        if (startStr && endStr) {
          // Parse dates
          const startTime = new Date(startStr);
          const endTime = new Date(endStr);
          
          // Calculate duration in milliseconds
          const durationMs = endTime - startTime;
          
          // Convert to total minutes only
          const totalMinutes = Math.floor(durationMs / (1000 * 60));
          

          const operationDate = startTime.toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' });

          // Format duration as just minutes
          const operationTime = totalMinutes;
          
          // Add to processed data with reordered columns
          processedData.push([
            row[1],           // Namn
            row[2],           // Personnummer
            operationDate,    // Operationsdatum
            row[0],           // Opkort
            operationTime     // Operationstid
          ]);
        }
      }
      
      // Display with DataTables
      displayWithDataTables(processedData);
      
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error: " + error.message);
    }
  };
  
  reader.readAsArrayBuffer(file);
}

function displayWithDataTables(data) {
  if (!data || data.length === 0) {
    alert("No data found in the Excel file.");
    return;
  }
  
  // Find or create results container
  let resultsContainer = document.getElementById("resultsContainer");
  if (!resultsContainer) {
    resultsContainer = document.createElement("div");
    resultsContainer.id = "resultsContainer";
    resultsContainer.style.marginTop = "20px";
    document.body.appendChild(resultsContainer);
  }
  
  // Clear only the results container
  resultsContainer.innerHTML = '';
  
  // Create a table element
  const table = document.createElement('table');
  table.id = 'dataTable';
  table.className = 'display';
  table.style.width = '100%';
  resultsContainer.appendChild(table);
  
  try {
    // Initialize DataTable with data
    $('#dataTable').DataTable({
      data: data.slice(1), // Skip header row
      columns: data[0].map(header => ({ title: header })),
      pageLength: 10,      // Show 10 entries per page
      dom: 'ifrtp',       // Default layout: length, filter, table, info, pagination
      searching: true,     // Enable search
      ordering: true,      // Enable sorting
      info: true,          // Show info (Showing x to y of z entries)
      language: {
        search: "Sök:",
        paginate: {
          first: "Första",
          last: "Sista",
          next: "Nästa",
          previous: "Föregående"
        },
        info: "Visar _START_ till _END_ av _TOTAL_ poster",
        lengthMenu: "Visa _MENU_ poster per sida",
        infoEmpty: "Visar 0 till 0 av 0 poster",
        infoFiltered: "(filtrerat från _MAX_ totala poster)"
      }
    });
    
    console.log("DataTable initialized successfully");
  } catch (error) {
    console.error("DataTable error:", error);
    // Fallback to basic table if DataTables fails
    resultsContainer.innerHTML = '<p>Error initializing DataTable. Displaying basic table.</p>';
    resultsContainer.appendChild(createBasicTable(data));
  }
}


// Fallback function if DataTables fails
function createBasicTable(data) {
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  
  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  data[0].forEach(cell => {
    const th = document.createElement('th');
    th.textContent = cell;
    th.style.padding = '8px';
    th.style.borderBottom = '1px solid #ddd';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create body
  const tbody = document.createElement('tbody');
  for (let i = 1; i < data.length; i++) {
    const tr = document.createElement('tr');
    data[i].forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      td.style.padding = '8px';
      td.style.borderBottom = '1px solid #ddd';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  
  return table;
}
