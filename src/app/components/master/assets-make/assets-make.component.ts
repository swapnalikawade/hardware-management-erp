/*
 **************************************************************************************
 * Program Name  : AssetsMakeComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 11, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Asset Make (Vendor/Manufacturer) Management.
 *
 * Description   : This component manages Asset Make master data including:
 *                 - Fetch all asset make records by Login ID
 *                 - Add single/multiple asset make records
 *                 - Update existing asset make details
 *                 - Delete single/multiple records
 *                 - Vendor support information management
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (CSV, Excel, TXT, DOCX, PDF)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling (multi-record entry)
 *   - Validation using NgForm
 *   - Asset Type integration (dropdown auto-fetch)
 *   - Vendor details (Email, Phone, Website)
 *   - Replacement policy tracking
 *   - Date validation and formatting (DD-MM-YYYY)
 *   - File parsing using XLSX, Mammoth, pdfjs
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *
 * Endpoints Used:
 *   - GET    /asset-make/getAllAssetMakeByLoginId/{prefix}/{year}/{code}
 *   - POST   /asset-make/saveAll
 *   - PUT    /asset-make/update/{prefix}/{year}/{code}
 *   - POST   /asset-make/delete-multiple-assetMake
 *   - POST   /asset-make/import
 *
 * Called From   : Asset Make UI (Frontend)
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
  'node_modules/pdfjs-dist/build/pdf.worker.min.js';

export interface TableRow {

  assetMakeId: string;
  assetMakeCode: string;
  assetMakeName: string;

  countryOfOrigin: string;
  supportContact: string;

  createdBy: string;
  createdDate: string;   // LocalDate → string
  updatedDate: string;

  status: 'Active' | 'Inactive';
}
@Component({
  selector: 'app-assets-make',
  standalone: false,
  templateUrl: './assets-make.component.html',
  styleUrls: ['./assets-make.component.css'],
})
export class AssetsMakeComponent implements OnInit {
  // session variable
  activeForm: number = 0;
  departments: any[] = [];
  designations: any[] = [];
  token: string | null = null;
  userName: any | null = null;
  headCompanyName: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
  headCompanyId: any | null = null;
  showViewModal: boolean = false;
  selectedRow: TableRow | null = null;
  activeTab = 'details';
  today = new Date();
  form: any = {};
  loginId: any | null = null;

  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;
  assetTypes: any[] = [];
  loading: any = false;
  //pagination
  // Pagination Variables
  itemsPerPage: number = 5; // default 5
  currentPage: number = 1;
  tableData: TableRow[] = [];
  filteredData: TableRow[] = [];

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
    this.loadAssetTypes();
    this.loadAssetMake();
    this.filteredData = [...this.tableData];
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }
 private initializeForm(): void {
  this.forms = [
    {
      assetMakeId: '',
      assetMakeCode: '',
      assetMakeName: '',

      countryOfOrigin: '',
      supportContact: '',

      createdBy: this.loginId || '',
      createdDate: this.currentDate || '',
      updatedDate: '',

      status: 'Active',

      // 🔥 BACKEND OBJECT
      newRecord: {
        assetMakeId: '0',
        assetMakeCode: '',
        assetMakeName: '',

        countryOfOrigin: '',
        supportContact: '',

        createdBy: this.loginId || '',
        createdDate: this.currentDate || '',
        updatedDate: '',

        status: 'Active',
      },
    },
  ];
}
  loadAssetTypes(): void {
    this.commonService.fetchAssetTypeByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        console.log('API RESPONSE 👉', res); // 👈 MUST CHECK
        this.assetTypes = res || [];
      },
      error: (err) => {
        console.error('API ERROR ❌', err);
      },
    });
  }
  loadAssetMake(): void {
    if (!this.loginId) {
      console.error('Login ID missing!');
      return;
    }

    this.commonService.fetchAllAssetMakeByLoginId(this.loginId).subscribe({
      next: (res: any[]) => {
        console.log('Asset Make Response:', res);

        this.tableData = (res || []).map((item) => ({
          ...item,
          assetMakePhoneNumber: Number(item.assetMakePhoneNumber || 0),
          assetMakeStatus: item.assetMakeStatus || 'Active',
          assetMakecreatedBy: item.assetMakecreatedBy || item.loginId,
        }));
        this.filteredData = [...this.tableData];
      },

      error: (err) => {
        console.error('Asset Make API Error:', err);

        this.tableData = [];
        this.filteredData = [];
      },
    });
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

    // 🔥 Collect assetMakeIds
    const ids: string[] = this.selectedRows.map((row) => row.assetMakeId);

    this.commonService.deleteMultipleAssetMake(ids).subscribe({
      next: () => {
        // remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.assetMakeId),
        );
        this.filteredData = [...this.tableData];
        this.currentPage = 1;
        //this.cdr.detectChanges();
        //
        this.selectedRows = [];
        this.currentPage = 1;

        this.loadAssetMake(); // reload list

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
  calculateAge(dob: string, index: number) {
    if (!dob) return;

    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    this.forms[index].newRecord.age = age;
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

  // Company Name
  wsData.push([this.headCompanyName || 'Company Name']);

  // Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  wsData.push([]);

  // Header (UPDATED ✅)
  wsData.push([
    'Asset Make ID',
    'Asset Make Code',
    'Asset Make Name',
    'Country Of Origin',
    'Support Contact',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ]);

  // Rows (UPDATED ✅)
  this.tableData.forEach((row) => {
    wsData.push([
      row.assetMakeId,
      row.assetMakeCode,
      row.assetMakeName,
      row.countryOfOrigin,
      row.supportContact,
      row.createdDate,
      row.updatedDate,
      row.createdBy,
      row.status,
    ]);
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset Make');

  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Asset_Make_Report.xlsx');
}
exportDoc() {
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  let content = `
<html>
<head>

<style>
body { font-family: Arial, sans-serif; }

h2 {
  text-align:center;
  font-size:26px;
  color:#00468c;
  font-weight:bold;
  text-decoration:underline;
}

.header-info {
  display:flex;
  justify-content:space-between;
  font-size:16px;
  font-weight:bold;
  margin:5px 0 10px 0;
}

table {
  width:100%;
  border-collapse:collapse;
}

th {
  background:#0066cc;
  color:white;
  padding:8px;
  border:1px solid #000;
}

td {
  padding:8px;
  border:1px solid #000;
  text-align:center;
}

.status-active { color:green; font-weight:bold; }
.status-inactive { color:red; font-weight:bold; }
</style>

</head>

<body>

<h2>Asset Make Records</h2>

<div class="header-info">
  <div>${this.headCompanyName}</div>
  <div>${formattedDate}</div>
</div>

<table>

<tr>
<th>ID</th>
<th>Code</th>
<th>Name</th>
<th>Country</th>
<th>Support Contact</th>
<th>Created Date</th>
<th>Created By</th>
<th>Status</th>
</tr>
`;

  this.tableData.forEach((row) => {
    const statusClass =
      row.status === 'Active' ? 'status-active' : 'status-inactive';

    const statusIcon = row.status === 'Active' ? '✔️' : '❌';

    content += `
<tr>
<td>${row.assetMakeId}</td>
<td>${row.assetMakeCode}</td>
<td>${row.assetMakeName}</td>
<td>${row.countryOfOrigin}</td>
<td>${row.supportContact}</td>
<td>${row.createdDate}</td>
<td>${row.createdBy}</td>
<td class="${statusClass}">
  ${statusIcon} ${row.status}
</td>
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

  saveAs(blob, 'Asset_Make_Report.doc');
}

 exportPDF() {
  const doc = new jsPDF('p', 'pt', 'a4');

  // TITLE
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Asset Make Records', titleX, 60, { align: 'center' });

  const titleWidth = doc.getTextWidth('Asset Make Records');
  doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

  // Company + Date
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);

  const company = this.headCompanyName || 'Company Name';
  const dateStr = new Date().toLocaleDateString();

  doc.text(company, 40, 100);
  doc.text(dateStr, pageWidth - 40, 100, { align: 'right' });

  // TABLE
  autoTable(doc, {
    startY: 120,

    head: [[
      'ID',
      'Code',
      'Name',
      'Country',
      'Support Contact',
      'Created Date',
      'Created By',
      'Status'
    ]],

    body: this.tableData.map((row) => [
      row.assetMakeId,
      row.assetMakeCode,
      row.assetMakeName,
      row.countryOfOrigin,
      row.supportContact,
      row.createdDate,
      row.createdBy,
      row.status
    ]),

    theme: 'grid',

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: [255, 255, 255],
      halign: 'center',
      fontSize: 11,
    },

    bodyStyles: {
      fontSize: 10,
      halign: 'center',
      textColor: [0, 0, 0],
    },

    styles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      valign: 'middle',
    },
  });

  doc.save('Asset_Make_Report.pdf');
}
  // User-selected items per page
  onChangeItemsPerPage(event: any) {
    this.itemsPerPage = Number(event.target.value);
    this.currentPage = 1; // reset to first page
  }

  // Return paginated data for table
  get paginatedData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
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

  openDetails(row: any) {
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

  assetMakeId: '0',
  assetMakeCode: '',
  assetMakeName: '',

  countryOfOrigin: '',
  supportContact: '',

  createdBy: this.loginId || '',
  createdDate: this.currentDate || '',
  updatedDate: '',

  status: 'Active'
};

  isEditMode: boolean = false;
  editIndex: number | null = null;

 onEdit(row: TableRow, index: number) {
  this.activeTab = 'newRecord';
  this.isEditMode = true;
  this.editIndex = index;

  this.forms = [
    {
      newRecord: {
        assetMakeId: row.assetMakeId,

        assetMakeCode: row.assetMakeCode,
        assetMakeName: row.assetMakeName,

        assetMakeCountryOfOrigin: row.countryOfOrigin,
        assetMakeSupportContact: row.supportContact,

        assetMakecreatedBy: row.createdBy,
        assetMakeCreatedDate: row.createdDate,
        assetMakeUpdatedDate: row.updatedDate,

        assetMakeStatus: row.status,
      },
    },
  ];
}

saveAllRecords(form?: NgForm) {

  // ---------------- VALIDATION ----------------
  const invalid = this.forms.some(
    (f) =>
      !f.newRecord.assetMakeCode?.trim() ||
      !f.newRecord.assetMakeName?.trim() ||
      !f.newRecord.countryOfOrigin?.trim() ||
      !f.newRecord.supportContact?.trim() ||
      !f.newRecord.status?.trim()
  );

  if (invalid) {
    this.showErrors = true;
    this.toast.warning('Please fill all required fields!', 'error', 4000);
    return;
  }

  // ---------------- DATE ----------------
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayDate = `${yyyy}-${mm}-${dd}`;

  // ---------------- EDIT MODE ----------------
  if (this.isEditMode && this.editIndex !== null) {

    const formData = this.forms[0].newRecord;

    const payload = {
      assetMakeCode: formData.assetMakeCode,
      assetMakeName: formData.assetMakeName,
      countryOfOrigin: formData.countryOfOrigin,
      supportContact: formData.supportContact,

    status: formData.status || 'Active',

      updatedDate: todayDate,
      createdBy: this.loginId
    };

    const assetMakeId = this.tableData[this.editIndex].assetMakeId;

    this.commonService.updateAssetMake(assetMakeId, payload).subscribe({
      next: () => {
        this.toast.success('Record Updated Successfully!', 'success', 4000);
        this.resetAfterSave();
        this.loadAssetMake();
      },
      error: () => {
        this.toast.danger('Update failed. Service unavailable!', 'error', 4000);
      }
    });

    return;
  }

  // ---------------- ADD MODE ----------------
  const payload = this.forms.map((f) => ({
    assetMakeCode: f.newRecord.assetMakeCode,
    assetMakeName: f.newRecord.assetMakeName,
    countryOfOrigin: f.newRecord.countryOfOrigin,
    supportContact: f.newRecord.supportContact,

    status: 'Active',

    createdDate: todayDate,
    updatedDate: todayDate,
    createdBy: this.loginId
  }));

  this.commonService.submitAssetMake(payload).subscribe({
    next: (res) => {
      if (res?.dublicateMessages?.length) {
        res.dublicateMessages.forEach((msg: string) =>
          this.toast.warning(msg, 'warning', 4000)
        );
      }

      this.toast.success('Record Added Successfully!', 'success', 4000);
      this.resetAfterSave();
      this.loadAssetMake();
    },
    error: () => {
      this.toast.danger('Save failed. Service down!', 'error', 4000);
    }
  });
}
resetAfterSave() {
  this.forms = [
    {
      newRecord: {
        assetMakeId: '',

        assetMakeCode: '',
        assetMakeName: '',

        countryOfOrigin: '',
        supportContact: '',

        createdDate: this.currentDate,
        updatedDate: '',

        createdBy: this.loginId,

        status: 'Active',
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

  this.forms.push({
    newRecord: {
      assetMakeId: '',

      assetMakeCode: '',
      assetMakeName: '',

      countryOfOrigin: '',
      supportContact: '',

      createdDate: currentDate,
      updatedDate: '',

      createdBy: this.loginId,

      status: 'Active',
    }
  });
}
 cancelRecord(form?: NgForm, index?: number) {

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const currentDate = `${yyyy}-${mm}-${dd}`;

  if (index !== undefined && this.forms[index]) {
    this.forms[index] = {
      newRecord: {
        assetMakeId: '',

        assetMakeCode: '',
        assetMakeName: '',

        countryOfOrigin: '',
        supportContact: '',

        createdDate: currentDate,
        updatedDate: '',

        createdBy: this.loginId,

        status: 'Active',
      },
    };
  }

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

  filterByDate() {
    if (!this.startDate || !this.endDate) {
      this.filteredData = [...this.tableData];
      return;
    }

    const start = this.convertToDate(this.startDate);
    const end = this.convertToDate(this.endDate);

    this.filteredData = this.tableData.filter((item: TableRow) => {
      const itemDate = this.convertToDate(item.createdDate);
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
        item.assetMakecreatedDate,
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

    this.commonService.uploadAssetMakeExcel(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;

        this.loadAssetMake(); // reload table

        this.toast.success(
          'Imported ' + (Array.isArray(res) ? res.length : 'records'),
          'success',
          4000,
        );
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
  //          assetMakestatus: values[headers.indexOf('   assetMakestatus')] || 'Active',
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

    json.forEach((obj: any) => {

      const row: TableRow = {
        assetMakeId: obj['Asset Make ID'] || '',

        assetMakeCode: obj['Asset Make Code'] || '',
        assetMakeName: obj['Asset Make Name'] || '',

        countryOfOrigin: obj['Country Of Origin'] || '',
        supportContact: obj['Support Contact'] || '',

        createdBy: obj['Created By'] || this.loginId,
        createdDate: obj['Created Date'] || this.currentDate,
        updatedDate: obj['Updated Date'] || '',

        status: obj['Status'] === 'Inactive' ? 'Inactive' : 'Active',
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

    // Remove header line (updated)
    text = text
      .replace(
        /Asset\s+Make\s+ID\s+Code\s+Name\s+Country\s+Support\s+Contact\s+Created\s+By\s+Status/i,
        ''
      )
      .trim();

    // Split rows (based on status)
    const rawRows = text
      .split(/Active|Inactive/)
      .map((r) => r.trim())
      .filter((r) => r !== '');

    for (let r of rawRows) {
      const parts = r.split(/\s+/);

      if (parts.length < 5) {
        console.warn('Invalid row:', r);
        continue;
      }

      const [
        assetMakeId,
        assetMakeCode,
        assetMakeName,
        countryOfOrigin,
        supportContact,
      ] = parts;

      const row: TableRow = {
        assetMakeId: assetMakeId || '',

        assetMakeCode: assetMakeCode || '',
        assetMakeName: assetMakeName || '',

        countryOfOrigin: countryOfOrigin || '',
        supportContact: supportContact || '',

        createdBy: this.loginId,
        createdDate: this.currentDate,
        updatedDate: '',

        status: 'Active',
      };

      this.tableData.push(row);
    }

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

  rows.forEach((row, i) => {
    if (i === 0) return; // skip header

    const cells = Array.from(row.querySelectorAll('td')).map(
      (c) => c.textContent?.trim() || ''
    );

    // 최소 required cells check
    if (cells.length < 5) {
      console.warn('Invalid row:', cells);
      return;
    }

    const newRecord: TableRow = {
      assetMakeId: cells[0] || '',

      assetMakeCode: cells[1] || '',
      assetMakeName: cells[2] || '',

      countryOfOrigin: cells[3] || '',
      supportContact: cells[4] || '',

      createdBy: cells[5] || this.loginId,
      createdDate: cells[6] || this.currentDate,
      updatedDate: cells[7] || '',

      status: (cells[8] as 'Active' | 'Inactive') || 'Active',
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

  // Normalize text
  fullText = fullText.replace(/\s+/g, ' ').trim();

  // Remove header (updated)
  fullText = fullText.replace(
    /Asset\s+Make\s+ID\s+Code\s+Name\s+Country\s+Support\s+Contact\s+Created\s+By\s+Status/i,
    ''
  );

  console.log('CLEANED:', fullText);

  // ✅ New Regex (simple structure)
  const rowRegex =
    /(\w+)\s+(\w+)\s+([\w\s]+?)\s+(\w+)\s+(\d{10})\s+(\w+)\s+(Active|Inactive)/g;

  let match;

  while ((match = rowRegex.exec(fullText)) !== null) {

    const row: TableRow = {
      assetMakeId: match[1] || '',

      assetMakeCode: match[2] || '',
      assetMakeName: match[3]?.trim() || '',

      countryOfOrigin: match[4] || '',
      supportContact: match[5] || '',

      createdBy: match[6] || this.loginId,
      createdDate: this.currentDate,
      updatedDate: '',

      status: match[7] as 'Active' | 'Inactive',
    };

    this.tableData.push(row);
  }

  this.filteredData = [...this.tableData];

  this.toast.success('PDF imported successfully!', 'success', 4000);

  console.log('FINAL ROWS:', this.tableData);
}
  //Download Sample CSV
downloadSampleCSV() {
  if (!this.tableData.length) {
    this.toast.danger('No data to download!', 'error', 4000);
    return;
  }

  // ✅ Updated headers
  const headers = [
    'Asset Make ID',
    'Asset Make Code',
    'Asset Make Name',
    'Country Of Origin',
    'Support Contact',
    'Created By',
    'Created Date',
    'Updated Date',
    'Status',
  ];

  const csvRows = [headers.join(',')];

  // ✅ Table data export
  this.tableData.forEach((row) => {
    const rowData = [
      row.assetMakeId,
      row.assetMakeCode,
      row.assetMakeName,
      row.countryOfOrigin,
      row.supportContact,
      row.createdBy,
      row.createdDate,
      row.updatedDate,
      row.status,
    ];

    csvRows.push(rowData.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'asset_make_data.csv';
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
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const csvRows: string[] = [];

  // Row 1 → Company Name
  csvRows.push(this.headCompanyName || 'Company Name');

  // Row 2 → Date
  csvRows.push(`Date:,${formattedDate}`);

  // Empty row
  csvRows.push('');

  // ✅ Updated Header
  const headers = [
    'Asset Make ID',
    'Asset Make Code',
    'Asset Make Name',
    'Country Of Origin',
    'Support Contact',
    'Created By',
    'Created Date',
    'Updated Date',
    'Status',
  ];

  csvRows.push(headers.join(','));

  // ✅ Data rows
  data.forEach((row) => {
    const rowData = [
      `"${row.assetMakeId}"`,
      `"${row.assetMakeCode}"`,
      `"${row.assetMakeName}"`,
      `"${row.countryOfOrigin}"`,
      `"${row.supportContact}"`,
      `"${row.createdBy}"`,
      `"${row.createdDate}"`,
      `"${row.updatedDate}"`,
      `"${row.status}"`,
    ];

    csvRows.push(rowData.join(','));
  });

  const csvData = csvRows.join('\n');

  const blob = new Blob([csvData], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Filtered_Asset_Make_Report.csv');
}
exportFilteredExcel(data: TableRow[]) {

  const wsData: any[] = [];

  // Company Name
  wsData.push([this.headCompanyName || 'Company Name']);

  // Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  wsData.push(['Date:', formattedDate]);

  wsData.push([]);

  // ✅ Updated Header
  wsData.push([
    'Asset Make ID',
    'Asset Make Code',
    'Asset Make Name',
    'Country Of Origin',
    'Support Contact',
    'Created By',
    'Created Date',
    'Updated Date',
    'Status',
  ]);

  // ✅ Data rows
  data.forEach((row) => {
    wsData.push([
      row.assetMakeId,
      row.assetMakeCode,
      row.assetMakeName,
      row.countryOfOrigin,
      row.supportContact,
      row.createdBy,
      row.createdDate,
      row.updatedDate,
      row.status,
    ]);
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Asset Make');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Filtered_Asset_Make_Report.xlsx');
}

exportFilteredPDF(data: TableRow[]) {
  const doc = new jsPDF('l', 'pt', 'a4');

  // Title
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Asset Make Records', titleX, 60, { align: 'center' });

  const titleWidth = doc.getTextWidth('Asset Make Records');
  doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

  // Company Name + Date
  doc.setFontSize(14);

  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  doc.text(this.headCompanyName || 'Company Name', 40, 100);
  doc.text(dateStr, pageWidth - 40, 100, { align: 'right' });

  // ✅ Updated Table
  autoTable(doc, {
    startY: 120,

    head: [[
      'Asset Make ID',
      'Asset Make Code',
      'Asset Make Name',
      'Country',
      'Support Contact',
      'Created By',
      'Created Date',
      'Updated Date',
      'Status'
    ]],

    body: data.map((row) => [
      row.assetMakeId,
      row.assetMakeCode,
      row.assetMakeName,
      row.countryOfOrigin,
      row.supportContact,
      row.createdBy,
      row.createdDate,
      row.updatedDate,
      row.status,
    ]),

    theme: 'grid',

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: [255, 255, 255],
      halign: 'center',
      fontSize: 10,
    },

    bodyStyles: {
      halign: 'center',
      textColor: [0, 0, 0],
      fontSize: 9,
    },

    styles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      valign: 'middle',
    },
  });

  doc.save('Filtered_Asset_Make_Report.pdf');
}
}
