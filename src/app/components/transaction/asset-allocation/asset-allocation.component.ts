/*
 **************************************************************************************
 * Program Name  : AssetAllocationComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 14, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Asset Allocation module.
 *
 * Description   : This component manages Asset Allocation operations including:
 *                 - Allocate assets to employees
 *                 - Fetch all asset allocation records based on Login ID
 *                 - Add single/multiple asset allocation entries
 *                 - Update existing allocation records
 *                 - Delete single/multiple allocation records
 *                 - Employee & Asset auto-fetch integration
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (Excel, CSV, TXT, DOCX, PDF)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling (multi-record support)
 *   - Validation using NgForm
 *   - Asset & Employee dropdown auto-fill logic
 *   - Date validation and formatting (DD-MM-YYYY)
 *   - File parsing using XLSX, Mammoth, pdfjs
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *   - Status-based styling (Active / Inactive)
 *
 * Endpoints Used:
 *   - GET    /asset-allocation/getAllAssetAllocationsByLoginId/{prefix}/{year}/{code}
 *   - POST   /asset-allocation/saveAll
 *   - PUT    /asset-allocation/update/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /asset-allocation/delete-multiple-assetAllocation
 *   - POST   /asset-allocation/import
 *
 * Called From   : Asset Allocation UI (Frontend)
 * Calls To      : CommonService (HTTP APIs)
 *
 * Dependencies  :
 *   - Angular Forms (NgForm)
 *   - XLSX (Excel handling)
 *   - jsPDF & jspdf-autotable (PDF generation)
 *   - Mammoth (DOCX parsing)
 *   - pdfjs-dist (PDF parsing)
 *   - FileSaver (File download)
 *   - ng-angular-popup (Toast messages)
 *
 **************************************************************************************
 */
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import * as pdfjsLib from 'pdfjs-dist';
import { NgToastService } from 'ng-angular-popup';
import { Router } from '@angular/router';

import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth/auth-service';
import { CommonService } from '../../../services/common/common-service';
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export interface TableRow {

  /* ========= PRIMARY ========= */
  allocationId: string;
  allocationNumber: string;

  /* ========= EMPLOYEE ========= */
  employeeId: string;
  departmentId: string;
  location?: string;

  /* ========= ASSET ========= */
  assetId: string;

  /* ========= DATES ========= */
  allocationDate?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;

  /* ========= CONDITION ========= */
  conditionAtIssue?: string;
  conditionAtReturn?: string;

  /* ========= BUSINESS ========= */
  purpose?: string;
  approvalBy?: string;
  approvalDate?: string;

  /* ========= REMARKS ========= */
  remarks?: string;

  /* ========= AUDIT ========= */
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;

  /* ========= STATUS ========= */
  allocationStatus: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-asset-allocation',
  standalone: false,
  templateUrl: './asset-allocation.component.html',
  styleUrl: './asset-allocation.component.css',
})
export class AssetAllocationComponent implements OnInit {
  // session variable
  selectedRow: TableRow | null = null;
  showViewModal: boolean = false;
  activeForm: number = 0;
  departments: any[] = [];
  designations: any[] = [];
  token: string | null = null;
  userName: any | null = null;
  headCompanyName: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
  loginId: any | null = null;
  employees: any[] = [];
  assetTypes: any[] = [];
  activeTab = 'details';
  today = new Date();
  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;
  loading: any = false;
  assetAllocations: TableRow[] = [];
  tableData: TableRow[] = [];
  filteredData: TableRow[] = [];
  form: any = {};
  assetMakes: any[] = [];
  constructor(
    private router: Router,
    private toast: NgToastService,
    private authService: AuthService,
    private commonService: CommonService,
  ) {
    this.filteredData = [...this.tableData];
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.userName = this.authService.getUsername();
    this.headCompanyName = this.authService.getEmployeeName();
    this.userRoles = this.authService.getUserRoles();
    this.date = this.authService.getCurrentDate();
    this.loginId = this.authService.getEmployeeId();

    if (!this.token) {
      this.router.navigate(['/login-page']);
      return;
    }

    const today = new Date();
    this.currentDate = this.today.toISOString().split('T')[0];
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.currentDate = `${yyyy}-${mm}-${dd}`;

    // 🗓 Initialize form & data
    this.initializeForm();

    this.loadAssets(); // 🔥 actual assets

    this.loadAssetMakes(); // 🔥 missing
    this.loadDepartments(); // 🔥 missing
    this.loadEmployees();

    this.loadAssetAllocations();
    this.filteredData = [...this.tableData];
  }
  loadAssets() {
    if (!this.loginId) return;

    this.commonService.fetchAssetByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        this.assetTypes = res || []; // ✅ correct
        console.log('Assets:', this.assetTypes);
      },
      error: (err) => {
        console.error('Asset load error', err);
      },
    });
  }
  onAssetChange(i: number) {
    const asset = this.assetTypes.find(
      (a: any) => a.assetId === this.forms[i].assetallocationAssetId,
    );

    if (asset) {
      this.forms[i].assetallocationAssetName = asset.assetName;
      this.forms[i].assetallocationAssetType = asset.assetType;
    }
  }
   loadDepartments(): void {
    this.commonService.fetchAllDepartments().subscribe({
      next: (res: any) => {
        console.log('Department API Response:', res);
        this.departments = res;
      },
      error: (err) => {
        console.error('Department API Error:', err);
      },
    });
  }

loadEmployees(): void {
  this.commonService.fetchAllEmployee()
    .subscribe({
      next: (res: any[]) => {
        console.log('Employee API Response:', res);

        this.employees = res;   // ✅ CORRECT
      },
      error: (err) => {
        console.error('Employee API Error:', err);
      }
    });
}
  loadAssetTypes(): void {
    if (!this.loginId) {
      console.error('Company ID missing!');
      return;
    }

    this.commonService.fetchAllAssetTypeByCompany(this.loginId).subscribe({
      next: (res: any[]) => {
        this.assetTypes = res || [];
      },

      error: (err) => {
        console.error('Asset Type API Error:', err);
        this.assetTypes = [];
      },
    });
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }
private initializeForm(): void {
  this.forms = [
    {
      /* ===== UI Binding ===== */
      allocationNumber: '',
      allocationDate: this.currentDate || '',

      employeeId: '',
      departmentId: '',
      location: '',

      assetId: '',

      expectedReturnDate: '',
      actualReturnDate: '',

      conditionAtIssue: '',
      conditionAtReturn: '',

      purpose: '',
      approvalBy: '',
      approvalDate: '',

      remarks: '',

      allocationStatus: 'Active',

      createdBy: this.userName || '',
      createdDate: this.currentDate || '',

      updatedBy: '',
      updatedDate: '',

      /* ===== Backend Object ===== */
      newRecord: {
        allocationId: '0',
        allocationNumber: '',

        employeeId: '',
        departmentId: '',
        location: '',

        assetId: '',

        allocationDate: this.currentDate || '',
        expectedReturnDate: '',
        actualReturnDate: '',

        conditionAtIssue: '',
        conditionAtReturn: '',

        purpose: '',

        approvalBy: '',
        approvalDate: '',

        remarks: '',

        createdBy: this.userName || '',
        createdDate: this.currentDate || '',

        updatedBy: '',
        updatedDate: '',

        allocationStatus: 'Active',
      },
    },
  ];
}
  loadAssetMakes(): void {
    if (!this.loginId) return;

    this.commonService.fetchAllAssetMakeByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        this.assetMakes = res || []; // ✅ correct
        console.log('Asset Makes:', this.assetMakes);
      },
      error: (err) => {
        console.error('Asset Make error:', err);
        this.assetMakes = [];
      },
    });
  }

  loadassetTypes(): void {
    if (!this.loginId) {
      console.error('Company ID missing!');
      return;
    }

    this.commonService.fetchAllAssetTypeByCompany(this.loginId).subscribe({
      next: (res: any[]) => {
        this.assetTypes = res || [];
      },

      error: (err) => {
        console.error('Asset Type API Error:', err);
        this.assetTypes = [];
      },
    });
  }
  //  loadAssetAllocations(): void {
  //    if (!this.loginId) return;
  //
  //    this.commonService
  //      .fetchAllAssetAllocationsByCompany(this.loginId)
  //      .subscribe({
  //        next: (res: any[]) => {
  //          this.assetAllocations = res || [];
  //
  //          // 🔥 IMPORTANT FIX
  //          this.tableData = this.assetAllocations;
  //          this.filteredData = [...this.tableData];
  //        },
  //
  //        error: (err) => {
  //          console.error('Asset Allocation API Error:', err);
  //          this.assetAllocations = [];
  //        },
  //      });
  //  }
loadAssetAllocations(): void {
  if (!this.loginId) return;

  this.commonService
    .fetchAllAssetAllocationsByCompany(this.loginId)
    .subscribe({
      next: (res: any[]) => {
        console.log('API Response:', res);

        // ✅ DIRECT ARRAY
        this.tableData = Array.isArray(res) ? res : [];

        // ✅ COPY FOR FILTER
        this.filteredData = [...this.tableData];
      },

      error: (err) => {
        console.error('API Error', err);

        this.tableData = [];
        this.filteredData = [];
      },
    });
}
  onEmployeeChange(i: number) {
    const emp = this.employees.find(
      (e: any) => e.employeeId === this.forms[i].assetallocationAllocateTo,
    );

    if (emp) {
      this.forms[i].assetallocationEmployeeName = emp.employeeName;

      // 🔥 FIX (IMPORTANT)
    }
  }
  tabs = [
    { key: 'details', label: 'Details', icon: 'bi bi-building' },
    { key: 'newRecord', label: 'New Record', icon: 'bi bi-plus-circle' },
    {
      key: 'bulkImport',
      label: 'Bulk Import',
      icon: 'bi bi-file-arrow-down',
    },
    {
      key: 'bulkExport',
      label: 'Bulk Export',
      icon: 'bi bi-file-earmark-arrow-up',
    },
    { key: 'help', label: 'Help', icon: 'bi bi-question-circle' },
  ];

  applyFilter(event: any) {
    this.searchText = event.target.value.toLowerCase().trim();

    // Filter = tableData
    this.filteredData = this.tableData.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(this.searchText),
    );

    this.currentPage = 1; // pagination reset
  }

  selectedRows: any[] = []; // stores selected rows

  // Toggle single row selection
  toggleRowSelection(row: any, event: any) {
    if (event.target.checked) {
      this.selectedRows.push(row);
    } else {
      this.selectedRows = this.selectedRows.filter((r) => r !== row);
    }
  }

  // Delete all selected rows
  // Delete all selected rows
 deleteSelectedRows(): void {
  if (!this.selectedRows.length) {
    this.toast.danger('No records selected to delete!', '', 4000);
    return;
  }

  const confirmed = confirm(
    `Are you sure you want to delete ${this.selectedRows.length} record(s)?`,
  );

  if (!confirmed) return;

  // ✅ Correct ID mapping
  const ids: string[] = this.selectedRows.map(
    (row) => row.allocationId
  );

  this.commonService.deleteMultipleAssetAllocation(ids).subscribe({
    next: () => {

      // ✅ Remove deleted rows from table
      this.tableData = this.tableData.filter(
        (row) => !ids.includes(row.allocationId)
      );

      this.filteredData = [...this.tableData];
      this.selectedRows = [];
      this.currentPage = 1;

      // reload list
      this.loadAssetAllocations();

      this.toast.success(
        'Selected records deleted successfully!',
        'SUCCESS',
        4000,
      );
    },

    error: () => {
      this.toast.danger('Failed to delete records!', 'ERROR', 4000);
    },
  });
}

  // Toggle select all rows
  toggleAll(event: any) {
    if (event.target.checked) {
      this.selectedRows = [...this.tableData];
    } else {
      this.selectedRows = [];
    }
  }
  sortTable(column: string, order: 'asc' | 'desc') {
    this.filteredData.sort((a: any, b: any) => {
      let valA = a[column];
      let valB = b[column];

      // Lowercase only for strings
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      // -----------------------------
      // ✅ DATE VALIDATION + PARSING
      // -----------------------------
      const dateA = new Date(a[column]);
      const dateB = new Date(b[column]);

      const isDateA = !isNaN(dateA.getTime());
      const isDateB = !isNaN(dateB.getTime());

      if (isDateA && isDateB) {
        if (order === 'asc') {
          return dateA.getTime() - dateB.getTime();
        } else {
          return dateB.getTime() - dateA.getTime();
        }
      }

      if (order === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
  }

 exportExcel() {
  const wsData: any[] = [];

  // ⭐ Row 1 → Company Name
  wsData.push([this.headCompanyName || 'Company Name']);

  // ⭐ Row 2 → Date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB'); // DD/MM/YYYY
  wsData.push(['Date:', formattedDate]);

  // Empty Row
  wsData.push([]);

  // ⭐ Header (UPDATED as per entity)
  wsData.push([
    'Allocation ID',
    'Allocation Number',
    'Allocation Date',
    'Employee ID',
    'Department ID',
    'Location',
    'Asset ID',
    'Expected Return Date',
    'Actual Return Date',
    'Condition At Issue',
    'Condition At Return',
    'Purpose',
    'Approval By',
    'Approval Date',
    'Remarks',
    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date',
    'Status',
  ]);

  // ⭐ Rows (Correct Mapping)
  this.tableData.forEach((row) => {
    wsData.push([
      row.allocationId || '',
      row.allocationNumber || '',
      row.allocationDate || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',
      row.assetId || '',
      row.expectedReturnDate || '',
      row.actualReturnDate || '',
      row.conditionAtIssue || '',
      row.conditionAtReturn || '',
      row.purpose || '',
      row.approvalBy || '',
      row.approvalDate || '',
      row.remarks || '',
      row.createdBy || '',
      row.createdDate || '',
      row.updatedBy || '',
      row.updatedDate || '',
      row.allocationStatus || '',
    ]);
  });

  // Create worksheet
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // Auto column width
  const colWidths = wsData[3].map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;

  // Create workbook
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset Allocation');

  // Export
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Asset_Allocation_Report.xlsx');
}
 exportDoc() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB'); // DD/MM/YYYY

  let content = `
<html>
<head>

<style>
body{
  font-family: Arial, sans-serif;
}

h2{
  text-align:center;
  font-size:26px;
  color:#00468c;
  margin-bottom:2px;
  font-weight:bold;
  text-decoration:underline;
}

.header-info{
  display:flex;
  justify-content:space-between;
  font-size:16px;
  font-weight:bold;
  margin:5px 0 10px 0;
  width:100%;
}

table{
  width:100%;
  border-collapse:collapse;
  margin-top:5px;
}

th{
  background:#0066cc;
  color:white;
  padding:8px;
  font-size:14px;
  border:1px solid #000;
  text-align:center;
}

td{
  background:#ffffff;
  padding:8px;
  border:1px solid #000;
  font-size:14px;
  text-align:center;
}

.status-active{
  color:green;
  font-weight:bold;
}

.status-inactive{
  color:red;
  font-weight:bold;
}
</style>

</head>

<body>

<h2>Asset Allocation Records</h2>

<div class="header-info">
  <div>${this.headCompanyName || 'Company Name'}</div>
  <div>${formattedDate}</div>
</div>

<table>

<tr>
<th>Allocation ID</th>
<th>Allocation Number</th>
<th>Allocation Date</th>
<th>Employee ID</th>
<th>Department ID</th>
<th>Location</th>
<th>Asset ID</th>
<th>Expected Return Date</th>
<th>Actual Return Date</th>
<th>Condition Issue</th>
<th>Condition Return</th>
<th>Purpose</th>
<th>Approval By</th>
<th>Status</th>
<th>Created By</th>
</tr>
`;

  this.tableData.forEach((row) => {
    const statusClass =
      row.allocationStatus === 'Active'
        ? 'status-active'
        : 'status-inactive';

    const statusIcon =
      row.allocationStatus === 'Active' ? '✔️' : '❌';

    content += `
<tr>

<td>${row.allocationId || ''}</td>
<td>${row.allocationNumber || ''}</td>
<td>${row.allocationDate || ''}</td>

<td>${row.employeeId || ''}</td>
<td>${row.departmentId || ''}</td>
<td>${row.location || ''}</td>

<td>${row.assetId || ''}</td>

<td>${row.expectedReturnDate || '-'}</td>
<td>${row.actualReturnDate || '-'}</td>

<td>${row.conditionAtIssue || ''}</td>
<td>${row.conditionAtReturn || ''}</td>

<td>${row.purpose || ''}</td>
<td>${row.approvalBy || ''}</td>

<td class="${statusClass}">
  ${statusIcon} ${row.allocationStatus || ''}
</td>

<td>${row.createdBy || ''}</td>

</tr>
`;
  });

  content += `
</table>

</body>
</html>
`;

  const blob = new Blob(['\ufeff', content], {
    type: 'application/msword',
  });

  saveAs(blob, 'Asset_Allocation_Report.doc');
}

  exportPDF() {
  const doc = new jsPDF('l', 'pt', 'a4'); // landscape

  // ⭐ TITLE
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Asset Allocation Records', titleX, 50, { align: 'center' });

  // Underline
  const titleWidth = doc.getTextWidth('Asset Allocation Records');
  doc.line(titleX - titleWidth / 2, 55, titleX + titleWidth / 2, 55);

  // ⭐ Company + Date
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  const company = this.headCompanyName || 'Company Name';
  const dateStr = new Date().toLocaleDateString('en-GB');

  doc.text(company, 40, 80);
  doc.text(dateStr, pageWidth - 40, 80, { align: 'right' });

  // ⭐ TABLE
  autoTable(doc, {
    startY: 100,

    head: [
      [
        'Alloc ID',
        'Number',
        'Date',
        'Employee ID',
        'Dept ID',
        'Location',
        'Asset ID',
        'Expected Return',
        'Actual Return',
        'Cond Issue',
        'Cond Return',
        'Purpose',
        'Approval By',
        'Status',
        'Created By',
      ],
    ],

    body: this.tableData.map((row) => [
      row.allocationId || '',
      row.allocationNumber || '',
      row.allocationDate || '',

      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',

      row.expectedReturnDate || '-',
      row.actualReturnDate || '-',

      row.conditionAtIssue || '',
      row.conditionAtReturn || '',

      row.purpose || '',
      row.approvalBy || '',

      row.allocationStatus || '',
      row.createdBy || '',
    ]),

    theme: 'grid',

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: [255, 255, 255],
      halign: 'center',
      fontSize: 10,
    },

    bodyStyles: {
      fontSize: 9,
      halign: 'center',
      textColor: [0, 0, 0],
    },

    styles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      valign: 'middle',
    },

    // 🔥 Status Color
    didParseCell: function (data: any) {
      if (data.column.index === 13) { // Status column index updated
        if (data.cell.raw === 'Active') {
          data.cell.styles.textColor = [0, 128, 0];
        } else {
          data.cell.styles.textColor = [255, 0, 0];
        }
      }
    },
  });

  doc.save('Asset_Allocation_Report.pdf');
}
  //pagination
  // Pagination Variables
  itemsPerPage: number = 5; // default 5
  currentPage: number = 1;

  // User-selected items per page
  onChangeItemsPerPage(event: any) {
    this.itemsPerPage = Number(event.target.value);
    this.currentPage = 1; // reset to first page
  }

  // Return paginated data for table
  get paginatedData(): TableRow[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    return this.filteredData.slice(start, end);
  }

  // Calculate total pages
  get totalPages() {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  // Page change function
  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  selectedRecord: any = null;
  showModal: boolean = false;

  openDetails(row: TableRow) {
    this.selectedRow = row;
    this.showViewModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedRecord = null;
  }
  //toster

  toastMessage: string = '';
  toastType: string = '';

  //New record
  // New record
newRecord: TableRow = {

  /* ========= PRIMARY ========= */
  allocationId: '0',
  allocationNumber: '',

  /* ========= EMPLOYEE ========= */
  employeeId: '',
  departmentId: '',
  location: '',

  /* ========= ASSET ========= */
  assetId: '',

  /* ========= DATES ========= */
  allocationDate: this.currentDate || '',
  expectedReturnDate: '',
  actualReturnDate: '',

  /* ========= CONDITION ========= */
  conditionAtIssue: '',
  conditionAtReturn: '',

  /* ========= BUSINESS ========= */
  purpose: '',
  approvalBy: '',
  approvalDate: '',

  /* ========= REMARKS ========= */
  remarks: '',

  /* ========= AUDIT ========= */
  createdBy: this.userName || '',
  createdDate: this.currentDate || '',
  updatedBy: '',
  updatedDate: '',

  /* ========= STATUS ========= */
  allocationStatus: 'Active',
};
  isEditMode: boolean = false;
  editIndex: number | null = null;
onEdit(row: TableRow, index: number) {
  this.activeTab = 'newRecord';
  this.isEditMode = true;
  this.editIndex = index;

  this.forms = [
    {
      /* ========= PRIMARY ========= */
      allocationId: row.allocationId || '0',
      allocationNumber: row.allocationNumber || '',

      /* ========= EMPLOYEE ========= */
      employeeId: row.employeeId || '',
      departmentId: row.departmentId || '',
      location: row.location || '',

      /* ========= ASSET ========= */
      assetId: row.assetId || '',

      /* ========= DATES ========= */
      allocationDate: row.allocationDate || '',
      expectedReturnDate: row.expectedReturnDate || '',
      actualReturnDate: row.actualReturnDate || '',

      /* ========= CONDITION ========= */
      conditionAtIssue: row.conditionAtIssue || '',
      conditionAtReturn: row.conditionAtReturn || '',

      /* ========= BUSINESS ========= */
      purpose: row.purpose || '',
      approvalBy: row.approvalBy || '',
      approvalDate: row.approvalDate || '',

      /* ========= REMARKS ========= */
      remarks: row.remarks || '',

      /* ========= STATUS ========= */
      allocationStatus: row.allocationStatus || 'Active',

      /* ========= AUDIT ========= */
      createdBy: row.createdBy || this.userName || '',
      createdDate: row.createdDate || '',
      updatedBy: this.userName || '',
      updatedDate: this.currentDate || '',

      /* ========= Backend Object ========= */
      newRecord: {
        allocationId: row.allocationId || '0',
        allocationNumber: row.allocationNumber || '',

        employeeId: row.employeeId || '',
        departmentId: row.departmentId || '',
        location: row.location || '',

        assetId: row.assetId || '',

        allocationDate: row.allocationDate || '',
        expectedReturnDate: row.expectedReturnDate || '',
        actualReturnDate: row.actualReturnDate || '',

        conditionAtIssue: row.conditionAtIssue || '',
        conditionAtReturn: row.conditionAtReturn || '',

        purpose: row.purpose || '',

        approvalBy: row.approvalBy || '',
        approvalDate: row.approvalDate || '',

        remarks: row.remarks || '',

        createdBy: row.createdBy || this.userName || '',
        createdDate: row.createdDate || '',

        updatedBy: this.userName || '',
        updatedDate: this.currentDate || '',

        allocationStatus: row.allocationStatus || 'Active',
      },
    },
  ];
}
saveAllRecords(form?: NgForm) {

  // 🔥 Auto sync
  this.forms.forEach((f, i) => {
    this.onAssetChange(i);
    this.onEmployeeChange(i);
  });

  // ---------------- VALIDATION ----------------
  const invalid = this.forms.some(
    (f) =>
      !f.allocationNumber?.trim() ||
      !f.assetId?.trim() ||
      !f.employeeId?.trim() ||
      !f.departmentId?.trim() ||
      !f.allocationDate?.trim()
  );

  if (invalid) {
    this.showErrors = true;
    this.toast.warning('Please fill all required fields!', 'error', 4000);
    return;
  }

  // ---------------- EDIT MODE (UPDATE) ----------------
// ---------------- EDIT MODE (UPDATE) ----------------
if (this.isEditMode && this.editIndex !== null) {

  const f = this.forms[0];

  // 🔥 FIX LOGIN ID FORMAT (MOST IMPORTANT)
  const formattedLoginId = this.commonService.formatLoginId(this.loginId);

  console.log("ALLOCATION ID:", this.tableData[this.editIndex].allocationId);
  console.log("LOGIN ID:", formattedLoginId);

  const payload = {
    allocationNumber: f.allocationNumber,
    allocationDate: f.allocationDate,

    employeeId: f.employeeId,
    departmentId: f.departmentId,
    location: f.location,

    assetId: f.assetId,

    expectedReturnDate: f.expectedReturnDate,
    actualReturnDate: f.actualReturnDate,

    conditionAtIssue: f.conditionAtIssue,
    conditionAtReturn: f.conditionAtReturn,

    purpose: f.purpose,
    approvalBy: f.approvalBy,
    approvalDate: f.approvalDate,

    remarks: f.remarks,

    allocationStatus: f.allocationStatus,

    createdBy: f.createdBy,
    createdDate: f.createdDate,

    // 🔥 IMPORTANT
    updatedBy: formattedLoginId,
    updatedDate: new Date().toISOString().split('T')[0],
  };

  const allocationId = this.tableData[this.editIndex].allocationId;

  this.commonService
    .updateAssetAllocation(allocationId, formattedLoginId, payload)
    .subscribe({
      next: () => {
        this.toast.success('Record Updated Successfully!', 'success', 4000);
        this.resetAfterSave();
        this.loadAssetAllocations();
      },
      error: (err) => {
        console.error("UPDATE ERROR:", err);
        this.toast.danger(
          'Update failed. Service unavailable!',
          'error',
          4000,
        );
      },
    });

  return;
}

  // ---------------- ADD MODE (SAVE) ----------------
  const payload = this.forms.map((f) => ({
    allocationNumber: f.allocationNumber,
    allocationDate: f.allocationDate,

    employeeId: f.employeeId,
    departmentId: f.departmentId,
    location: f.location,

    assetId: f.assetId,

    expectedReturnDate: f.expectedReturnDate,
    actualReturnDate: f.actualReturnDate,

    conditionAtIssue: f.conditionAtIssue,
    conditionAtReturn: f.conditionAtReturn,

    purpose: f.purpose,

    approvalBy: f.approvalBy,
    approvalDate: f.approvalDate,

    remarks: f.remarks,

    allocationStatus: f.allocationStatus,

    createdBy: f.createdBy || this.userName,
    createdDate:
      f.createdDate || new Date().toISOString().split('T')[0],
  }));

  this.commonService.submitAssetAllocation(payload).subscribe({
    next: (res) => {

      if (res?.dublicateMessages?.length) {
        res.dublicateMessages.forEach((msg: string) =>
          this.toast.warning(msg, 'warning', 4000),
        );
      }

      this.toast.success('Record Added Successfully!', 'success', 4000);

      this.resetAfterSave();
      this.loadAssetAllocations();
    },

    error: () => {
      this.toast.danger(
        'Save failed. Asset Allocation service down!',
        'error',
        4000,
      );
    },
  });
}
 resetAfterSave() {
  this.forms = [
    {
      /* ========= PRIMARY ========= */
      allocationId: '0',
      allocationNumber: '',

      /* ========= EMPLOYEE ========= */
      employeeId: '',
      departmentId: '',
      location: '',

      /* ========= ASSET ========= */
      assetId: '',

      /* ========= DATES ========= */
      allocationDate: this.currentDate || '',
      expectedReturnDate: '',
      actualReturnDate: '',

      /* ========= CONDITION ========= */
      conditionAtIssue: '',
      conditionAtReturn: '',

      /* ========= BUSINESS ========= */
      purpose: '',
      approvalBy: '',
      approvalDate: '',

      /* ========= REMARKS ========= */
      remarks: '',

      /* ========= STATUS ========= */
      allocationStatus: 'Active',

      /* ========= AUDIT ========= */
      createdBy: this.userName || '',
      createdDate: this.currentDate || '',
      updatedBy: '',
      updatedDate: '',

      /* ========= Backend Object ========= */
      newRecord: {
        allocationId: '0',
        allocationNumber: '',

        employeeId: '',
        departmentId: '',
        location: '',

        assetId: '',

        allocationDate: this.currentDate || '',
        expectedReturnDate: '',
        actualReturnDate: '',

        conditionAtIssue: '',
        conditionAtReturn: '',

        purpose: '',

        approvalBy: '',
        approvalDate: '',

        remarks: '',

        createdBy: this.userName || '',
        createdDate: this.currentDate || '',

        updatedBy: '',
        updatedDate: '',

        allocationStatus: 'Active',
      },
    },
  ];

  this.isEditMode = false;
  this.editIndex = null;
  this.activeTab = 'details';
  this.showErrors = false;
}
  forms: any[] = [{ newRecord: {} }];
  showErrors = false; // optional: to show validation on submit
addForm() {
  if (this.isEditMode) {
    return;
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const currentDate = `${yyyy}-${mm}-${dd}`;

  const emptyRecord = {
    /* ========= PRIMARY ========= */
    allocationId: '0',
    allocationNumber: '',

    /* ========= EMPLOYEE ========= */
    employeeId: '',
    departmentId: '',
    location: '',

    /* ========= ASSET ========= */
    assetId: '',

    /* ========= DATES ========= */
    allocationDate: currentDate,
    expectedReturnDate: '',
    actualReturnDate: '',

    /* ========= CONDITION ========= */
    conditionAtIssue: '',
    conditionAtReturn: '',

    /* ========= BUSINESS ========= */
    purpose: '',
    approvalBy: '',
    approvalDate: '',

    /* ========= REMARKS ========= */
    remarks: '',

    /* ========= STATUS ========= */
    allocationStatus: 'Active',

    /* ========= AUDIT ========= */
    createdBy: this.userName || '',
    createdDate: currentDate,
    updatedBy: '',
    updatedDate: '',
  };

  this.forms.push({
    ...emptyRecord,
    newRecord: { ...emptyRecord },
  });
}
cancelRecord(form?: NgForm, index?: number) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const currentDate = `${yyyy}-${mm}-${dd}`;

  const emptyRecord = {
    /* ========= PRIMARY ========= */
    allocationId: '0',
    allocationNumber: '',

    /* ========= EMPLOYEE ========= */
    employeeId: '',
    departmentId: '',
    location: '',

    /* ========= ASSET ========= */
    assetId: '',

    /* ========= DATES ========= */
    allocationDate: currentDate,
    expectedReturnDate: '',
    actualReturnDate: '',

    /* ========= CONDITION ========= */
    conditionAtIssue: '',
    conditionAtReturn: '',

    /* ========= BUSINESS ========= */
    purpose: '',
    approvalBy: '',
    approvalDate: '',

    /* ========= REMARKS ========= */
    remarks: '',

    /* ========= STATUS ========= */
    allocationStatus: 'Active',

    /* ========= AUDIT ========= */
    createdBy: this.userName || '',
    createdDate: currentDate,
    updatedBy: '',
    updatedDate: '',
  };

  // Reset specific row
  if (index !== undefined && this.forms[index]) {
    this.forms[index] = {
      ...emptyRecord,
      newRecord: { ...emptyRecord },
    };
  }

  // Reset Angular form
  if (form) {
    form.resetForm();
  }

  this.isEditMode = false;
  this.editIndex = null;
  this.showErrors = false;
}
  removeForm(index: number) {
    this.forms.splice(index, 1);
  }

  //  resetFilters() {
  //    this.startDate = '';
  //    this.endDate = '';
  //    this.fileType = 'csv';
  //    this.startDateError = '';
  //    this.endDateError = '';
  //
  //    // Clear the textboxes in UI
  //    const startInput: any = document.getElementById('startDate');
  //    const endInput: any = document.getElementById('endDate');
  //
  //    if (startInput) startInput.value = '';
  //    if (endInput) endInput.value = '';
  //  }

  //bulk export date format
  //bulk export
  // ---------------- Component Variables ----------------
  startDate: any = '';
  endDate: any = '';

  fileType: string = 'csv';
  // startDateError: string = '';
  // endDateError: string = '';

  // ---------------- Reset Filters ----------------
  resetFilters() {
    this.startDate = '';
    this.endDate = '';
    this.fileType = 'csv';
    this.startDateError = '';
    this.endDateError = '';

    const startInput: any = document.getElementById('startDate');
    const endInput: any = document.getElementById('endDate');

    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
  }

  // ---------------- Date Parser ----------------
  parseDDMMYYYY(dateStr: string): Date | null {
    if (!dateStr || !dateStr.includes('-')) return null;

    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }

  // ---------------- Bulk Export ----------------
  convertDate(d: string): string | null {
    if (!d) return null;
    const [day, month, year] = d.split('-');
    return `${year}-${month}-${day}`;
  }

  getFile() {
    // Validate dates
    if (this.startDateError || this.endDateError) {
      this.toast.danger(
        'Please fix date errors before exporting!',
        'error',
        4000,
      );
      return;
    }

    // Filter data
    this.filterByDate();

    if (this.filteredData.length === 0) {
      this.toast.warning(
        'No records found for selected date range.',
        'warning',
        4000,
      );
      return;
    }

    switch (this.fileType) {
      case 'csv':
        this.exportFilteredCSV(this.filteredData);
        break;
      case 'xlsx':
        this.exportFilteredExcel(this.filteredData);
        break;
      case 'pdf':
        this.exportFilteredPDF(this.filteredData);
        break;
      default:
        this.toast.danger('Invalid file type selected!', 'error');
    }
  }

  // ---------------- CSV Export ----------------

  // ---------------- Excel Export ----------------

  // ---------------- PDF Export ----------------

  startDateError: string = '';
  endDateError: string = '';
  parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // yyyy-MM-dd
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      return new Date(dateStr);
    }

    // dd-MM-yyyy
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }

    return null;
  }
 filterByDate() {
  if (!this.startDate || !this.endDate) {
    this.filteredData = [...this.tableData];
    return;
  }

  const start = this.parseDate(this.startDate);
  const end = this.parseDate(this.endDate);

  // ✅ NULL SAFETY CHECK
  if (!start || !end) {
    this.filteredData = [...this.tableData];
    return;
  }

  this.filteredData = this.tableData.filter((item: TableRow) => {
    if (!item.allocationDate) return false;

    const itemDate = this.parseDate(item.allocationDate);
    if (!itemDate) return false;

    return itemDate >= start && itemDate <= end;
  });
}
  convertToDate(dateStr: string): Date {
    if (!dateStr) return new Date(0); // fallback

    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(0);

    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1; // JS month 0-based
    const year = Number(parts[2]);

    return new Date(year, month, day);
  }

  formatDate(event: any, type: 'start' | 'end') {
    let value = event.target.value.replace(/\D/g, ''); // only digits
    if (value.length > 8) value = value.substring(0, 8);

    let formatted = value;

    if (value.length > 2) formatted = value.slice(0, 2) + '-' + value.slice(2);
    if (value.length > 4)
      formatted =
        value.slice(0, 2) + '-' + value.slice(2, 4) + '-' + value.slice(4);

    event.target.value = formatted;

    // Cleasar previous error for the correct field
    if (type === 'start') {
      this.startDateError = '';
    } else {
      this.endDateError = '';
    }

    // Validate only if 8 digits entered
    if (value.length === 8) {
      const day = parseInt(value.slice(0, 2), 10);
      const month = parseInt(value.slice(2, 4), 10);
      const year = parseInt(value.slice(4, 8), 10);

      let errorMsg = '';

      if (day < 1 || day > 31) errorMsg = 'Day must be between 1 and 31.';
      else if (month < 1 || month > 12)
        errorMsg = 'Month must be between 1 and 12.';
      else if (year < 2000)
        errorMsg = 'Year must be greater than or equal to 2000.';
      else {
        const date = new Date(year, month - 1, day);
        if (
          date.getDate() !== day ||
          date.getMonth() + 1 !== month ||
          date.getFullYear() !== year
        ) {
          errorMsg = 'Invalid date.';
        }
      }
      if (type === 'start') this.startDateError = errorMsg;
      else this.endDateError = errorMsg;
    }
  }

  editForm(index: number) {
    this.isEditMode = true;
    this.forms[index].isEdit = true;
  }
  //bulk import

  // ---------------- File Selection ----------------
  // onFileSelected(event: any) {
  //   this.selectedFile = event.target.files[0];
  // }

  onFileSelected(event: any) {
    const f = event.target.files && event.target.files[0];
    if (f) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
        this.toast.warning('Please select an excel file (.xlsx or .xls)');
        event.target.value = null;
        return;
      }
      this.selectedFile = f;
    }
  }

  isDateInRange(recordDate: string, start: string, end: string): boolean {
    const [sd, sm, sy] = start.split('-').map(Number);
    const [ed, em, ey] = end.split('-').map(Number);
    const [rd, rm, ry] = recordDate.split('-').map(Number);

    const startDate = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);
    const recDate = new Date(ry, rm - 1, rd);

    // आजचा दिनांक check करण्यासाठी: <=  >=
    return recDate >= startDate && recDate <= endDate;
  }
  filterRecords() {
    this.filteredData = this.tableData.filter((item: any) =>
      this.isDateInRange(
        item.assetTypecreatedDate,
        this.startDate,
        this.endDate,
      ),
    );
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.toast.warning('Select a file first!', 'warning', 4000);
      return;
    }

    this.loading = true;

    this.commonService.uploadAssetAllocationExcel(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;

        // Reload Allocation Table
        this.loadAssetAllocations();

        this.toast.success('File imported successfully!', 'success', 4000);
      },

      error: (err) => {
        this.loading = false;

        console.error(err);

        this.toast.danger('Import Failed', 'error', 4000);
      },
    });
  }

  // ---------------- Upload File ----------------
  // uploadFile() {
  //   if (!this.selectedFile) {
  //     this.toast.warning('Please select a file first!', 'warning', 4000); // yellow/orange color for warning
  //     return;
  //   }

  //   const fileName = this.selectedFile.name.toLowerCase();

  //   if (fileName.endsWith('.csv')) {
  //     const reader = new FileReader();
  //     reader.onload = () => this.parseCSV(reader.result as string);
  //     reader.readAsText(this.selectedFile);
  //   } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
  //     this.readExcel(this.selectedFile);
  //   } else if (fileName.endsWith('.txt')) {
  //     this.readTXT(this.selectedFile);
  //   } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
  //     this.readDOCX(this.selectedFile);
  //   } else if (fileName.endsWith('.pdf')) {
  //     this.readPDF(this.selectedFile);
  //   } else {
  //     this.toast.danger('Unsupported file type!', 'error', 4000); // red color for error
  //   }
  // }

  // // ---------------- CSV Parsing ----------------
  // parseCSV(csv: string) {
  //   const lines = csv
  //     .split('\n')
  //     .map((l) => l.trim())
  //     .filter((l) => l);
  //   if (lines.length <= 1) {
  //     this.toast.warning('CSV has no data!', 'warning', 4000); // yellow/orange for warning

  //     return;
  //   }

  //   const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  //   const results: TableRow[] = [];

  //   for (let i = 1; i < lines.length; i++) {
  //     const values = lines[i].split(',');
  //     const row: TableRow = {
  //       departmentId: values[headers.indexOf('id')] || '',
  //       departmentName: values[headers.indexOf('department name')] || '',
  //       headCompanyName: values[headers.indexOf('company name')] || '',
  //       departmentPhone: values[headers.indexOf('phone number')] || '',
  //       departmentCreateDate: values[headers.indexOf('date')] || '',
  //       departmentCurrentEmployee: values[headers.indexOf('employee')] || '0',
  //        assetTypestatus: values[headers.indexOf(' assetTypestatus')] || 'Active',
  //     };
  //     results.push(row);
  //   }

  //   this.tableData = [...this.tableData, ...results];
  //   this.filteredData = [...this.tableData];
  //   this.toast.success('CSV imported successfully!', 'success', 4000); // green color for success
  // }

  // ---------------- Excel Parsing ----------------
readExcel(file: File) {
  const reader = new FileReader();

  reader.onload = () => {
    const workbook = XLSX.read(reader.result, { type: 'binary' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Clear existing data
    this.tableData = [];

    json.forEach((obj: any) => {

      // 🔥 Date formatter
      const formatDate = (val: any) => {
        if (!val) return '';
        if (typeof val === 'number') {
          const date = XLSX.SSF.parse_date_code(val);
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        return val.toString().trim();
      };

      const row: TableRow = {
        /* ========= PRIMARY ========= */
        allocationId: obj['Allocation ID']?.toString().trim() || '',
        allocationNumber: obj['Allocation Number']?.toString().trim() || '',

        /* ========= EMPLOYEE ========= */
        employeeId: obj['Employee ID']?.toString().trim() || '',
        departmentId: obj['Department ID']?.toString().trim() || '',
        location: obj['Location']?.toString().trim() || '',

        /* ========= ASSET ========= */
        assetId: obj['Asset ID']?.toString().trim() || '',

        /* ========= DATES ========= */
        allocationDate: formatDate(obj['Allocation Date']),
        expectedReturnDate: formatDate(obj['Expected Return Date']),
        actualReturnDate: formatDate(obj['Actual Return Date']),

        /* ========= CONDITION ========= */
        conditionAtIssue: obj['Condition At Issue']?.toString().trim() || '',
        conditionAtReturn: obj['Condition At Return']?.toString().trim() || '',

        /* ========= BUSINESS ========= */
        purpose: obj['Purpose']?.toString().trim() || '',
        approvalBy: obj['Approval By']?.toString().trim() || '',
        approvalDate: formatDate(obj['Approval Date']),

        /* ========= REMARKS ========= */
        remarks: obj['Remarks']?.toString().trim() || '',

        /* ========= STATUS ========= */
        allocationStatus:
          obj['Status'] === 'Inactive' ? 'Inactive' : 'Active',

        /* ========= AUDIT ========= */
        createdBy: this.userName || '',
        createdDate: '',
        updatedBy: '',
        updatedDate: '',
      };

      this.tableData.push(row);
    });

    this.filteredData = [...this.tableData];

    this.toast.success('Excel imported successfully!', 'success', 4000);
  };

  reader.readAsBinaryString(file);
}
  // ---------------- TXT Parsing ----------------

readTXT(file: File) {
  const reader = new FileReader();

  reader.onload = () => {
    let text = reader.result as string;

    // 🔥 Remove header
    text = text.replace(/Allocation.*Status/i, '').trim();

    // 🔥 Split rows
    const rows = text
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r !== '');

    // Clear existing data
    this.tableData = [];

    rows.forEach((r) => {
      const parts = r.split(/\s+/).map((p) => p.trim());

      // ⚠️ Updated minimum columns based on new structure
      if (parts.length < 15) {
        console.warn('Invalid row skipped:', r);
        return;
      }

      const row: TableRow = {
        /* ========= PRIMARY ========= */
        allocationId: parts[0] || '',
        allocationNumber: parts[1] || '',

        /* ========= DATES ========= */
        allocationDate: parts[2] || '',

        /* ========= EMPLOYEE ========= */
        employeeId: parts[3] || '',
        departmentId: parts[4] || '',
        location: parts[5] || '',

        /* ========= ASSET ========= */
        assetId: parts[6] || '',

        /* ========= RETURN ========= */
        expectedReturnDate: parts[7] || '',
        actualReturnDate: parts[8] || '',

        /* ========= CONDITION ========= */
        conditionAtIssue: parts[9] || '',
        conditionAtReturn: parts[10] || '',

        /* ========= BUSINESS ========= */
        purpose: parts[11] || '',
        approvalBy: parts[12] || '',

        /* ========= STATUS ========= */
        allocationStatus:
          parts[13] === 'Inactive' ? 'Inactive' : 'Active',

        /* ========= AUDIT ========= */
        createdBy: this.userName || '',
        createdDate: '',
        updatedBy: '',
        updatedDate: '',
      };

      this.tableData.push(row);
    });

    this.filteredData = [...this.tableData];

    this.toast.success('TXT imported successfully!', 'success', 4000);
  };

  reader.readAsText(file);
}
  // ---------------- DOCX Parsing ----------------
async readDOCX(file: File) {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml({ arrayBuffer });

  const doc = new DOMParser().parseFromString(result.value, 'text/html');

  const table = doc.querySelector('table');

  if (!table) {
    this.toast.danger('No table found in DOCX!', 'error', 4000);
    return;
  }

  const rows = table.querySelectorAll('tr');

  // Clear existing data
  this.tableData = [];

  rows.forEach((row, i) => {
    if (i === 0) return; // skip header

    const cells = Array.from(row.querySelectorAll('td')).map(
      (c) => c.textContent?.trim() || '',
    );

    // 🔥 Updated validation (new structure)
    if (cells.length < 15) {
      console.warn('Invalid row skipped:', cells);
      return;
    }

    const newRecord: TableRow = {
      /* ========= PRIMARY ========= */
      allocationId: cells[0] || '',
      allocationNumber: cells[1] || '',

      /* ========= DATES ========= */
      allocationDate: cells[2] || '',

      /* ========= EMPLOYEE ========= */
      employeeId: cells[3] || '',
      departmentId: cells[4] || '',
      location: cells[5] || '',

      /* ========= ASSET ========= */
      assetId: cells[6] || '',

      /* ========= RETURN ========= */
      expectedReturnDate: cells[7] || '',
      actualReturnDate: cells[8] || '',

      /* ========= CONDITION ========= */
      conditionAtIssue: cells[9] || '',
      conditionAtReturn: cells[10] || '',

      /* ========= BUSINESS ========= */
      purpose: cells[11] || '',
      approvalBy: cells[12] || '',
      approvalDate: cells[13] || '',

      /* ========= STATUS ========= */
      allocationStatus:
        cells[14] === 'Inactive' ? 'Inactive' : 'Active',

      /* ========= AUDIT ========= */
      createdBy: this.userName || '',
      createdDate: '',
      updatedBy: '',
      updatedDate: '',
    };

    this.tableData.push(newRecord);
  });

  this.filteredData = [...this.tableData];

  this.toast.success('DOCX table imported successfully!', 'success', 4000);
}

  // ---------------- PDF Parsing ----------------
  extract(text: string, regex: RegExp) {
    const m = text.match(regex);
    return m ? m[1].trim() : '';
  }
async readPDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    fullText += content.items.map((item: any) => item.str).join(' ') + ' ';
  }

  console.log('RAW:', fullText);

  // 🔥 Fix corrupted status text
  fullText = fullText.replace(/A[cç][^\s]*ve/gi, 'Active');
  fullText = fullText.replace(/In[cç][^\s]*ve/gi, 'Inactive');

  // 🔥 Remove header
  fullText = fullText.replace(/Allocation\s+ID[\s\S]*?Status/i, '');

  // 🔥 Clean spaces
  fullText = fullText.replace(/\s+/g, ' ').trim();

  console.log('CLEANED:', fullText);

  // 🔥 Clear old data
  this.tableData = [];

  /**
   * ✅ NEW STRUCTURE REGEX (15 fields)
   * Order:
   * ID | Number | Date | EmpId | DeptId | Location | AssetId |
   * ExpReturn | ActReturn | CondIssue | CondReturn |
   * Purpose | ApprovalBy | ApprovalDate | Status
   */
  const rowRegex =
    /(\S+)\s+(\S+)\s+([\d-]+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\d-]*)\s+([\d-]*)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\d-]*)\s+(Active|Inactive)/g;

  let match;
  let count = 0;

  while ((match = rowRegex.exec(fullText)) !== null) {
    const row: TableRow = {
      /* ========= PRIMARY ========= */
      allocationId: match[1] || '',
      allocationNumber: match[2] || '',

      /* ========= DATES ========= */
      allocationDate: match[3] || '',

      /* ========= EMPLOYEE ========= */
      employeeId: match[4] || '',
      departmentId: match[5] || '',
      location: match[6] || '',

      /* ========= ASSET ========= */
      assetId: match[7] || '',

      /* ========= RETURN ========= */
      expectedReturnDate: match[8] || '',
      actualReturnDate: match[9] || '',

      /* ========= CONDITION ========= */
      conditionAtIssue: match[10] || '',
      conditionAtReturn: match[11] || '',

      /* ========= BUSINESS ========= */
      purpose: match[12] || '',
      approvalBy: match[13] || '',
      approvalDate: match[14] || '',

      /* ========= STATUS ========= */
      allocationStatus:
        match[15] === 'Inactive' ? 'Inactive' : 'Active',

      /* ========= AUDIT ========= */
      createdBy: this.userName || '',
      createdDate: '',
      updatedBy: '',
      updatedDate: '',
    };

    this.tableData.push(row);
    count++;
  }

  this.filteredData = [...this.tableData];

  if (count === 0) {
    this.toast.warning('No valid records found in PDF!', 'warning', 4000);
  } else {
    this.toast.success('PDF imported successfully!', 'success', 4000);
  }

  console.log('FINAL ROWS:', this.tableData);
}
  // ---------------- Download Sample CSV ----------------
downloadSampleCSV() {
  if (!this.tableData.length) {
    this.toast.danger('No data to download!', 'error', 4000);
    return;
  }

  // 🔥 Helper to escape CSV values
  const escapeCSV = (value: any) => {
    if (value == null) return '';
    const str = value.toString();
    return `"${str.replace(/"/g, '""')}"`;
  };

  // ✅ Updated headers (NEW ENTITY)
  const headers = [
    'Allocation ID',
    'Allocation Number',
    'Allocation Date',

    'Employee ID',
    'Department ID',
    'Location',

    'Asset ID',

    'Expected Return Date',
    'Actual Return Date',

    'Condition At Issue',
    'Condition At Return',

    'Purpose',
    'Approval By',
    'Approval Date',

    'Remarks',
    'Status',

    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date',
  ];

  const csvRows = [headers.map(escapeCSV).join(',')];

  // ✅ Data rows
  this.tableData.forEach((row: TableRow) => {
    const rowData = [
      row.allocationId,
      row.allocationNumber,
      row.allocationDate,

      row.employeeId,
      row.departmentId,
      row.location,

      row.assetId,

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtIssue,
      row.conditionAtReturn,

      row.purpose,
      row.approvalBy,
      row.approvalDate,

      row.remarks,
      row.allocationStatus,

      row.createdBy,
      row.createdDate,
      row.updatedBy,
      row.updatedDate,
    ];

    csvRows.push(rowData.map(escapeCSV).join(','));
  });

  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'asset_allocation_data.csv';
  a.click();

  URL.revokeObjectURL(a.href);
}
  //bulk export buttons function

  // Reset all filters

  //startDate: string = '';
  //endDate: string = '';
  //fileType: string = 'csv';
  // Get File (export logic)
 exportFilteredCSV(data: TableRow[]) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB'); // DD/MM/YYYY

  const csvRows: string[] = [];

  // 🔥 CSV escape helper
  const escapeCSV = (value: any) => {
    if (value == null) return '';
    const str = value.toString();
    return `"${str.replace(/"/g, '""')}"`;
  };

  // ⭐ Row 1 → Company Name
  csvRows.push(escapeCSV(this.headCompanyName || 'Company Name'));

  // ⭐ Row 2 → Date
  csvRows.push(`${escapeCSV('Date:')},${escapeCSV(formattedDate)}`);

  // Empty row
  csvRows.push('');

  // ✅ Updated Headers
  const headers = [
    'Allocation ID',
    'Allocation Number',
    'Allocation Date',

    'Employee ID',
    'Department ID',
    'Location',

    'Asset ID',

    'Expected Return Date',
    'Actual Return Date',

    'Condition At Issue',
    'Condition At Return',

    'Purpose',
    'Approval By',
    'Approval Date',

    'Remarks',

    'Status',

    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date',
  ];

  csvRows.push(headers.map(escapeCSV).join(','));

  // ✅ Data rows
  data.forEach((row) => {
    const rowData = [
      row.allocationId || '',
      row.allocationNumber || '',
      row.allocationDate || '',

      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtIssue || '',
      row.conditionAtReturn || '',

      row.purpose || '',
      row.approvalBy || '',
      row.approvalDate || '',

      row.remarks || '',

      row.allocationStatus || '',

      row.createdBy || '',
      row.createdDate || '',
      row.updatedBy || '',
      row.updatedDate || '',
    ];

    csvRows.push(rowData.map(escapeCSV).join(','));
  });

  const csvData = csvRows.join('\n');

  const blob = new Blob([csvData], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Filtered_Asset_Allocation_Report.csv');
}
exportFilteredExcel(data: TableRow[]) {
  const wsData: any[] = [];

  // ⭐ Company Name
  wsData.push([this.headCompanyName || 'Company Name']);

  // ⭐ Date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB'); // DD/MM/YYYY
  wsData.push(['Date:', formattedDate]);

  // Empty row
  wsData.push([]);

  // ✅ Updated Headers
  const headers = [
    'Allocation ID',
    'Allocation Number',
    'Allocation Date',

    'Employee ID',
    'Department ID',
    'Location',

    'Asset ID',

    'Expected Return Date',
    'Actual Return Date',

    'Condition At Issue',
    'Condition At Return',

    'Purpose',
    'Approval By',
    'Approval Date',

    'Remarks',

    'Status',

    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date',
  ];

  wsData.push(headers);

  // ✅ Data rows
  data.forEach((row) => {
    wsData.push([
      row.allocationId || '',
      row.allocationNumber || '',
      row.allocationDate || '',

      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtIssue || '',
      row.conditionAtReturn || '',

      row.purpose || '',
      row.approvalBy || '',
      row.approvalDate || '',

      row.remarks || '',

      row.allocationStatus || '',

      row.createdBy || '',
      row.createdDate || '',
      row.updatedBy || '',
      row.updatedDate || '',
    ]);
  });

  // ⭐ Create worksheet
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // 🔥 Auto column width
  const colWidths = headers.map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;

  // ⭐ Create workbook
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Filtered Asset Allocation',
  );

  // ⭐ Export
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Filtered_Asset_Allocation_Report.xlsx');
}
 exportFilteredPDF(data: TableRow[]) {
  const doc = new jsPDF('l', 'pt', 'a4'); // Landscape

  // ⭐ Title
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Asset Allocation Records', titleX, 50, { align: 'center' });

  const titleWidth = doc.getTextWidth('Asset Allocation Records');
  doc.line(titleX - titleWidth / 2, 55, titleX + titleWidth / 2, 55);

  // ⭐ Company + Date
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB');

  doc.text(this.headCompanyName || 'Company Name', 40, 80);
  doc.text(dateStr, pageWidth - 40, 80, { align: 'right' });

  // ⭐ Table
  autoTable(doc, {
    startY: 100,

    head: [
      [
        'Alloc ID',
        'Number',
        'Date',

        'Employee ID',
        'Dept ID',
        'Location',

        'Asset ID',

        'Expected Return',
        'Actual Return',

        'Cond Issue',
        'Cond Return',

        'Purpose',
        'Approval By',
        'Approval Date',

        'Remarks',
        'Status',

        'Created By',
      ],
    ],

    body: data.map((row) => [
      row.allocationId || '',
      row.allocationNumber || '',
      row.allocationDate || '',

      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtIssue || '',
      row.conditionAtReturn || '',

      row.purpose || '',
      row.approvalBy || '',
      row.approvalDate || '',

      row.remarks || '',
      row.allocationStatus || '',

      row.createdBy || '',
    ]),

    theme: 'grid',

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: [255, 255, 255],
      halign: 'center',
      fontSize: 9,
    },

    bodyStyles: {
      halign: 'center',
      textColor: [0, 0, 0],
      fontSize: 8,
    },

    styles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      valign: 'middle',
    },

    // 🔥 Status color (UPDATED INDEX)
    didParseCell: function (data: any) {
      if (data.column.index === 15) { // ✅ new index
        if (data.cell.raw === 'Active') {
          data.cell.styles.textColor = [0, 128, 0];
        } else if (data.cell.raw === 'Inactive') {
          data.cell.styles.textColor = [255, 0, 0];
        }
      }
    },
  });

  doc.save('Filtered_Asset_Allocation_Report.pdf');
}
}
