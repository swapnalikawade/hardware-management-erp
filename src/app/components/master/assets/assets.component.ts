/*
 **************************************************************************************
 * Program Name  : AssetsComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 10, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Asset Master Management module.
 *
 * Description   : This component manages core Asset Master data and operations including:
 *                 - Fetch all assets based on Login ID
 *                 - Add single/multiple asset records
 *                 - Update existing asset records
 *                 - Delete single/multiple assets
 *                 - Asset lifecycle attributes (Warranty, AMC, Status)
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (CSV, Excel, TXT, DOCX, PDF)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling (multi-record entry)
 *   - Validation using NgForm
 *   - Asset Type & Model integration (dropdown auto-fetch)
 *   - Warranty & AMC tracking
 *   - Date validation and formatting (DD-MM-YYYY)
 *   - File parsing using XLSX, Mammoth, pdfjs
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *   - Duplicate prevention (Serial Number based)
 *
 * Endpoints Used:
 *   - GET    /asset/getAllAssetsByLoginId/{prefix}/{year}/{code}
 *   - POST   /asset/saveAll
 *   - PUT    /asset/update/{prefix}/{year}/{code}
 *   - POST   /asset/delete-multiple-assets
 *   - POST   /asset/import
 *
 * Called From   : Asset Management UI (Frontend)
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

  /* ========= CORE ========= */
  assetId: string;
  assetName: string;
  assetType: string;
  assetMake: string;
  assetModel: string;

  serialNumber: string;
  macAddress: string;
  ipAddress: string;

  purchaseOrderId: string;
  invoiceNumber: string;

  /* ========= WARRANTY ========= */
  warrantyApplicable: string;
  warrantyStartDate: string;   // LocalDate → string
  warrantyEndDate: string;

  /* ========= AMC ========= */
  amcApplicable: string;
  amcStartDate: string;
  amcEndDate: string;

  /* ========= META ========= */
  createdBy: string;
  createdDate: string;
  updatedDate: string;

  /* ========= STATUS ========= */
  status: 'Active' | 'Inactive';

  /* ========= UI PURPOSE ========= */
  isSelected?: boolean;
}
@Component({
  selector: 'app-assets',
  standalone: false,
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.css'],
})
export class AssetsComponent implements OnInit {
  // session variable
  activeForm: number = 0;
  departments: any[] = [];
  designations: any[] = [];
  token: string | null = null;
  userName: any | null = null;
  headCompanyName: any | null = null;
  userRoles: string | null = null;
  purchaseOrders: any[] = [];
  date: string | null = null;
  headCompanyId: any | null = null;
  showViewModal: boolean = false;
  selectedRow: TableRow | null = null;
  activeTab = 'details';
  today = new Date();
  form: any = {};
  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;
  assetTypes: any[] = [];
  assetMakes: any[] = [];
  assetModels: any[] = [];
  tableData: TableRow[] = [];
  filteredData: TableRow[] = [];
  loading: any = false;
  loginId: any | null = null;

  forms: any[] = [{ newRecord: {} }];
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
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    this.currentDate = `${yyyy}-${mm}-${dd}`;

    this.initializeForm();
 this.loadAssetMake();
  this.loadPurchaseOrders();
    this.loadAssetTypes();

    this.loadAssets();
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }
private initializeForm(): void {
  this.forms = [
    {
      /* ========= CORE ========= */
      assetId: '',
      assetName: '',
      assetType: '',
      assetMake: '',
      assetModel: '',

      serialNumber: '',
      macAddress: '',
      ipAddress: '',

      purchaseOrderId: '',
      invoiceNumber: '',

      /* ========= WARRANTY ========= */
      warrantyApplicable: '',
      warrantyStartDate: '',
      warrantyEndDate: '',

      /* ========= AMC ========= */
      amcApplicable: '',
      amcStartDate: '',
      amcEndDate: '',

      /* ========= META ========= */
      createdBy: this.loginId || '',   // ✅ loginId set केला
      createdDate: this.currentDate || '',
updatedDate:'',
      /* ========= STATUS ========= */
      status: 'Active',

      newRecord: {
        /* ========= CORE ========= */
        assetId: '0',
        assetName: '',
        assetType: '',
        assetMake: '',
        assetModel: '',

        serialNumber: '',
        macAddress: '',
        ipAddress: '',

        purchaseOrderId: '',
        invoiceNumber: '',

        /* ========= WARRANTY ========= */
        warrantyApplicable: '',
        warrantyStartDate: '',
        warrantyEndDate: '',

        /* ========= AMC ========= */
        amcApplicable: '',
        amcStartDate: '',
        amcEndDate: '',

        /* ========= META ========= */
        createdBy: this.loginId || '',   // ✅ same
        createdDate: this.currentDate || '',
        updatedDate: '',

        /* ========= STATUS ========= */
        status: 'Active',

        /* ========= UI PURPOSE ========= */
        isSelected: false
      },
    },
  ];
}
  loadAssetTypes() {
    this.commonService.fetchAssetTypeByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        this.assetTypes = res;
      },

      error: (err) => {
        console.error(err);
      },
    });
  }
loadAssets() {
  console.log("LOGIN ID:", this.loginId);

  // ✅ DIRECT SEND (NO CHANGE)
  this.commonService.fetchAssetByLoginId(this.loginId).subscribe({
    next: (res: any) => {
      console.log("DATA:", res);

      this.tableData = res || [];
      this.filteredData = [...this.tableData];
    },
    error: (err) => {
      console.error("ERROR:", err);
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
loadAssetMake(): void {
  this.commonService.fetchAllAssetMakeByLoginId(this.loginId).subscribe({
    next: (res: any[]) => {
      this.assetMakes = res || [];
    },
    error: () => {
      this.assetMakes = [];
      this.toast.danger('Asset Make load failed!', 'error', 4000);
    },
  });
}
loadPurchaseOrders(): void {
  this.commonService.getAllPurchaseOrderByLoginId(this.loginId).subscribe({
    next: (res: any[]) => {
      this.purchaseOrders = res || [];
    },
    error: () => {
      this.purchaseOrders = [];
      this.toast.danger('Purchase Order load failed!', 'error', 4000);
    },
  });
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

    // 🔥 Collect assetIds
    const ids: string[] = this.selectedRows.map((row) => row.assetId);

    this.commonService.deleteMultipleAssets(ids).subscribe({
      next: () => {
        // Remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.assetId),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];
        this.currentPage = 1;

        // Reload assets
        this.loadAssets();

        this.toast.success(
          'Selected assets deleted successfully!',
          'SUCCESS',
          4000,
        );
      },

      error: () => {
        this.toast.danger('Failed to delete assets!', 'ERROR', 4000);
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

  // ⭐ Row 1 → Company Name
  wsData.push([this.headCompanyName || 'Company Name']);

  // ⭐ Row 2 → Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  // Empty Row
  wsData.push([]);

  // ⭐ Header
  wsData.push([
    'Asset ID',
    'Asset Name',
    'Asset Type',
    'Asset Make',
    'Asset Model',
    'Serial Number',
    'MAC Address',
    'IP Address',
    'Purchase Order Id',
    'Invoice Number',
    'Warranty Applicable',
    'Warranty Start Date',
    'Warranty End Date',
    'AMC Applicable',
    'AMC Start Date',
    'AMC End Date',
    'Status',
    'Created Date',
    'Updated Date',
    'Created By',
  ]);

  // ⭐ Rows
  this.tableData.forEach((row) => {
    wsData.push([
      row.assetId,
      row.assetName,
      row.assetType,
      row.assetMake,
      row.assetModel,

      // ✅ FIXED
      row.serialNumber,
      row.macAddress,
      row.ipAddress,

      row.purchaseOrderId,
      row.invoiceNumber,

      row.warrantyApplicable,
      row.warrantyStartDate,
      row.warrantyEndDate,

      row.amcApplicable,
      row.amcStartDate,
      row.amcEndDate,

      row.status,

      row.createdDate,
      row.updatedDate,
      row.createdBy,
    ]);
  });

  // Create worksheet
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // Create workbook
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

  // Export
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Asset_Report.xlsx');
}

exportDoc() {
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  let content = `
  <html>
    <head>
      <style>

        body {
          font-family: Arial, sans-serif;
        }

        h2 {
          text-align: center;
          font-size: 26px;
          color: #00468c;
          margin-bottom: 2px;
          font-weight: bold;
          text-decoration: underline;
        }

        .header-info {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: bold;
          margin: 5px 0 10px 0;
          width: 100%;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
        }

        th {
          background: #0066cc;
          color: white;
          padding: 8px;
          font-size: 14px;
          border: 1px solid #000;
          text-align: center;
        }

        td {
          background: #ffffff;
          padding: 8px;
          border: 1px solid #000;
          font-size: 14px;
          text-align: center;
        }

        .status-active {
          color: green;
          font-weight: bold;
        }

        .status-inactive {
          color: red;
          font-weight: bold;
        }

      </style>
    </head>

    <body>

      <h2>Asset Records</h2>

      <div class="header-info">
        <div>${this.headCompanyName}</div>
        <div>${formattedDate}</div>
      </div>

      <table>

        <tr>
          <th>Asset ID</th>
          <th>Name</th>
          <th>Type</th>
          <th>Make</th>
          <th>Model</th>
          <th>Serial Number</th>
          <th>MAC Address</th>
          <th>IP Address</th>
          <th>Warranty</th>
          <th>AMC</th>
          <th>Status</th>
        </tr>
  `;

  this.tableData.forEach((row) => {
    const statusClass =
      row.status === 'Active' ? 'status-active' : 'status-inactive';

    const statusIcon = row.status === 'Active' ? '✔️' : '❌';

    content += `
      <tr>
        <td>${row.assetId}</td>
        <td>${row.assetName}</td>
        <td>${row.assetType}</td>
        <td>${row.assetMake}</td>
        <td>${row.assetModel}</td>

        <td>${row.serialNumber}</td>
        <td>${row.macAddress}</td>
        <td>${row.ipAddress}</td>

        <td>${row.warrantyApplicable}</td>
        <td>${row.amcApplicable}</td>

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

  saveAs(blob, 'Asset_Report.doc');
}
exportPDF() {
  const doc = new jsPDF('l', 'pt', 'a4'); // landscape

  // ⭐ TITLE
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Asset Records', titleX, 60, { align: 'center' });

  // underline
  const titleWidth = doc.getTextWidth('Asset Records');
  doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

  // ⭐ Company + Date
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);

  const company = this.headCompanyName || 'Company Name';
  const dateStr = new Date().toLocaleDateString();

  doc.text(company, 40, 100);
  doc.text(dateStr, pageWidth - 40, 100, { align: 'right' });

  // ⭐ TABLE
  autoTable(doc, {
    startY: 120,

    head: [
      [
        'Asset ID',
        'Name',
        'Type',
        'Make',
        'Model',
        'Serial No',
        'MAC Address',
        'IP Address',
        'Warranty',
        'AMC',
        'Status',
      ],
    ],

    body: this.tableData.map((row) => [
      row.assetId,
      row.assetName,
      row.assetType,
      row.assetMake,
      row.assetModel,

      // ✅ FIXED
      row.serialNumber,
      row.macAddress,
      row.ipAddress,

      row.warrantyApplicable,
      row.amcApplicable,
      row.status,
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

  doc.save('Asset_Report.pdf');
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
  // New record
 newRecord: TableRow = {
  /* ========= CORE ========= */
  assetId: '0',
  assetName: '',
  assetType: '',
  assetMake: '',
  assetModel: '',

  serialNumber: '',
  macAddress: '',
  ipAddress: '',

  purchaseOrderId: '',
  invoiceNumber: '',

  /* ========= WARRANTY ========= */
  warrantyApplicable: '',
  warrantyStartDate: '',
  warrantyEndDate: '',

  /* ========= AMC ========= */
  amcApplicable: '',
  amcStartDate: '',
  amcEndDate: '',

  /* ========= META ========= */
  createdBy: this.loginId || '',   // ✅ loginId set
  createdDate: '',
  updatedDate: '',

  /* ========= STATUS ========= */
  status: 'Active',

  /* ========= UI PURPOSE ========= */
  isSelected: false
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
        /* ========= CORE ========= */
        assetId: row.assetId,
        assetName: row.assetName,
        assetType: row.assetType,
        assetMake: row.assetMake,
        assetModel: row.assetModel,

        serialNumber: row.serialNumber,
        macAddress: row.macAddress,
        ipAddress: row.ipAddress,

        purchaseOrderId: row.purchaseOrderId,
        invoiceNumber: row.invoiceNumber,

        /* ========= WARRANTY ========= */
        warrantyApplicable: row.warrantyApplicable,
        warrantyStartDate: row.warrantyStartDate,
        warrantyEndDate: row.warrantyEndDate,

        /* ========= AMC ========= */
        amcApplicable: row.amcApplicable,
        amcStartDate: row.amcStartDate,
        amcEndDate: row.amcEndDate,

        /* ========= META ========= */
        createdBy: row.createdBy,
        createdDate: row.createdDate,
        updatedDate: this.currentDate,

        /* ========= STATUS ========= */
        status: row.status,

        /* ========= UI PURPOSE ========= */
        isSelected: row.isSelected || false
      },
    },
  ];
}
formatDate(event: Event, type: string) {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  if (type === 'start') {
    this.startDate = value;
  } else {
    this.endDate = value;
  }
}
formatDateValue(date: string) {
  if (!date) return null;

  const d = new Date(date);
  return d.toISOString().split('T')[0];
}
 saveAllRecords(form?: NgForm) {
  const invalid = this.forms.some(
    (f) =>
      !f.newRecord.assetName?.trim() ||
      !f.newRecord.assetType?.trim() ||
      !f.newRecord.assetModel?.trim() ||
      !f.newRecord.serialNumber?.trim()
  );

  if (invalid) {
    this.showErrors = true;
    this.toast.warning('Please fill all required fields!', 'error', 4000);
    return;
  }

  // ---------------- UPDATE ----------------
  if (this.isEditMode && this.editIndex !== null) {
    const formData = this.forms[0].newRecord;

const payload = {
  assetId: formData.assetId,
  assetName: formData.assetName,

  assetType: formData.assetType,
  assetMake: formData.assetMake,
  assetModel: formData.assetModel,

  serialNumber: formData.serialNumber,
  macAddress: formData.macAddress,
  ipAddress: formData.ipAddress,

  purchaseOrderId: formData.purchaseOrderId,
  invoiceNumber: formData.invoiceNumber,

  warrantyApplicable: formData.warrantyApplicable,

  warrantyStartDate: formData.warrantyApplicable === 'Yes'
    ? this.formatDateValue(formData.warrantyStartDate)
    : null,

  warrantyEndDate: formData.warrantyApplicable === 'Yes'
    ? this.formatDateValue(formData.warrantyEndDate)
    : null,

  amcApplicable: formData.amcApplicable,
  createdDate: formData.createdDate,   // ✅ ADD THIS
  updatedDate: this.currentDate,
  createdBy: formData.createdBy,
  status: formData.status
};
    const assetId = this.tableData[this.editIndex].assetId;

    this.commonService.updateAsset(assetId, payload).subscribe({
      next: () => {
        this.toast.success('Asset Updated Successfully!', 'success', 4000);
        this.resetAfterSave();
        this.loadAssets();
      },
      error: () => {
        this.toast.danger('Update failed!', 'error', 4000);
      },
    });

    return;
  }

  // ---------------- SAVE ----------------
const payload = this.forms.map(f => {

  const isWarrantyYes = f.newRecord.warrantyApplicable === 'Yes';

  return {
    assetId: f.newRecord.assetId,
    assetName: f.newRecord.assetName,

    assetType: f.newRecord.assetType,
    assetMake: f.newRecord.assetMake,
    assetModel: f.newRecord.assetModel,

    serialNumber: f.newRecord.serialNumber,
    macAddress: f.newRecord.macAddress,
    ipAddress: f.newRecord.ipAddress,

    purchaseOrderId: f.newRecord.purchaseOrderId,
    invoiceNumber: f.newRecord.invoiceNumber,

    warrantyApplicable: f.newRecord.warrantyApplicable,

    warrantyStartDate: isWarrantyYes
      ? this.formatDateValue(f.newRecord.warrantyStartDate)
      : null,

    warrantyEndDate: isWarrantyYes
      ? this.formatDateValue(f.newRecord.warrantyEndDate)
      : null,

    amcApplicable: f.newRecord.amcApplicable,

    status: 'Active',
    createdBy: this.loginId,
    createdDate: this.currentDate,
    updatedDate: null
  };
});

  this.commonService.submitAsset(payload).subscribe({
    next: () => {
      this.toast.success('Asset Added Successfully!', 'success', 4000);
      this.resetAfterSave();
      this.loadAssets();
    },
    error: () => {
      this.toast.danger('Save failed!', 'error', 4000);
    },
  });
}
 resetAfterSave() {
  this.forms = [
    {
      newRecord: {
        /* ========= CORE ========= */
        assetId: '0',
        assetName: '',
        assetType: '',
        assetMake: '',
        assetModel: '',

        serialNumber: '',
        macAddress: '',
        ipAddress: '',

        purchaseOrderId: '',
        invoiceNumber: '',

        /* ========= WARRANTY ========= */
        warrantyApplicable: '',
        warrantyStartDate: '',
        warrantyEndDate: '',

        /* ========= AMC ========= */
        amcApplicable: '',
        amcStartDate: '',
        amcEndDate: '',

        /* ========= META ========= */
        createdBy: this.loginId || '',   // ✅ loginId → createdBy
        createdDate: this.currentDate || '',
        updatedDate: '',

        /* ========= STATUS ========= */
        status: 'Active',

        /* ========= UI PURPOSE ========= */
        isSelected: false
      },
    },
  ];

  this.isEditMode = false;
  this.editIndex = null;
  this.activeTab = 'details';
  this.showErrors = false;
}
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
    // UI binding
    assetId: '',
    assetName: '',
    assetType: '',
    assetMake: '',
    assetModel: '',

    serialNumber: '',
    macAddress: '',
    ipAddress: '',

    purchaseOrderId: '',
    invoiceNumber: '',

    warrantyApplicable: '',
    warrantyStartDate: '',
    warrantyEndDate: '',

    amcApplicable: '',
    amcStartDate: '',
    amcEndDate: '',

    createdBy: this.loginId,
    createdDate: currentDate,
    updatedDate: '',

    status: 'Active',

    // backend save
    newRecord: {
      assetId: '0',
      assetName: '',
      assetType: '',
      assetMake: '',
      assetModel: '',

      serialNumber: '',
      macAddress: '',
      ipAddress: '',

      purchaseOrderId: '',
      invoiceNumber: '',

      warrantyApplicable: '',
      warrantyStartDate: '',
      warrantyEndDate: '',

      amcApplicable: '',
      amcStartDate: '',
      amcEndDate: '',

      createdBy: this.loginId,
      createdDate: currentDate,
      updatedDate: '',

      status: 'Active',

      isSelected: false
    },
  });
}
 cancelRecord(form?: NgForm, index?: number) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const currentDate = `${yyyy}-${mm}-${dd}`;

  if (index !== undefined) {
    this.forms[index] = {
      assetId: '',
      assetName: '',
      assetType: '',
      assetMake: '',
      assetModel: '',

      serialNumber: '',
      macAddress: '',
      ipAddress: '',

      purchaseOrderId: '',
      invoiceNumber: '',

      warrantyApplicable: '',
      warrantyStartDate: '',
      warrantyEndDate: '',

      amcApplicable: '',
      amcStartDate: '',
      amcEndDate: '',

      createdBy: this.loginId,
      createdDate: currentDate,
      updatedDate: '',

      status: 'Active',

      newRecord: {
        assetId: '0',
        assetName: '',
        assetType: '',
        assetMake: '',
        assetModel: '',

        serialNumber: '',
        macAddress: '',
        ipAddress: '',

        purchaseOrderId: '',
        invoiceNumber: '',

        warrantyApplicable: '',
        warrantyStartDate: '',
        warrantyEndDate: '',

        amcApplicable: '',
        amcStartDate: '',
        amcEndDate: '',

        createdBy: this.loginId,
        createdDate: currentDate,
        updatedDate: '',

        status: 'Active',

        isSelected: false
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

  // formatDate(event: any, type: 'start' | 'end') {
  //   let value = event.target.value.replace(/\D/g, ''); // only digits
  //   if (value.length > 8) value = value.substring(0, 8);

  //   let formatted = value;

  //   if (value.length > 2) formatted = value.slice(0, 2) + '-' + value.slice(2);
  //   if (value.length > 4)
  //     formatted =
  //       value.slice(0, 2) + '-' + value.slice(2, 4) + '-' + value.slice(4);

  //   event.target.value = formatted;

  //   // Cleasar previous error for the correct field
  //   if (type === 'start') {
  //     this.startDateError = '';
  //   } else {
  //     this.endDateError = '';
  //   }

  //   // Validate only if 8 digits entered
  //   if (value.length === 8) {
  //     const day = parseInt(value.slice(0, 2), 10);
  //     const month = parseInt(value.slice(2, 4), 10);
  //     const year = parseInt(value.slice(4, 8), 10);

  //     let errorMsg = '';

  //     if (day < 1 || day > 31) errorMsg = 'Day must be between 1 and 31.';
  //     else if (month < 1 || month > 12)
  //       errorMsg = 'Month must be between 1 and 12.';
  //     else if (year < 2000)
  //       errorMsg = 'Year must be greater than or equal to 2000.';
  //     else {
  //       const date = new Date(year, month - 1, day);
  //       if (
  //         date.getDate() !== day ||
  //         date.getMonth() + 1 !== month ||
  //         date.getFullYear() !== year
  //       ) {
  //         errorMsg = 'Invalid date.';
  //       }
  //     }
  //     if (type === 'start') this.startDateError = errorMsg;
  //     else this.endDateError = errorMsg;
  //   }
  // }

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
      this.isDateInRange(item.createdDate, this.startDate, this.endDate),
    );
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.toast.warning('Select a file first!');
      return;
    }

    this.loading = true;

    this.commonService.uploadAssetExcel(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;
        this.loadAssets();

        this.toast.success(
          'Imported ' + (Array.isArray(res) ? res.length : 'records'),
        );
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.toast.danger('Import Failed', '', 4000);
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
  //       status: values[headers.indexOf('status')] || 'Active',
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
        /* ========= CORE ========= */
        assetId: obj['Asset ID'] || '',
        assetName: obj['Asset Name'] || '',
        assetType: obj['Asset Type'] || '',
        assetMake: obj['Asset Make'] || '',
        assetModel: obj['Asset Model'] || '',

        serialNumber: obj['Serial Number'] || '',
        macAddress: obj['MAC Address'] || '',
        ipAddress: obj['IP Address'] || '',

        purchaseOrderId: obj['Purchase Order Id'] || '',
        invoiceNumber: obj['Invoice Number'] || '',

        /* ========= WARRANTY ========= */
        warrantyApplicable: obj['Warranty Applicable'] || '',
        warrantyStartDate: obj['Warranty Start Date'] || '',
        warrantyEndDate: obj['Warranty End Date'] || '',

        /* ========= AMC ========= */
        amcApplicable: obj['AMC Applicable'] || '',
        amcStartDate: obj['AMC Start Date'] || '',
        amcEndDate: obj['AMC End Date'] || '',

        /* ========= META ========= */
        createdBy: obj['Created By'] || this.loginId || '',
        createdDate: obj['Created Date'] || '',
        updatedDate: obj['Updated Date'] || '',

        /* ========= STATUS ========= */
        status: obj['Status'] || 'Active',

        /* ========= UI PURPOSE ========= */
        isSelected: false
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
    let text = (reader.result as string).trim();

    const today = new Date().toISOString().split('T')[0];

    // Remove header safely (updated header)
    text = text
      .replace(
        /Asset\s+ID\s+Asset\s+Name\s+Asset\s+Type\s+Make\s+Model\s+Serial\s+MAC\s+IP\s+Warranty\s+Status/gi,
        ''
      )
      .trim();

    // Split rows
    const rows = text
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    rows.forEach((line) => {
      const parts = line.split(/\s+/);

      if (parts.length < 10) {
        console.warn('Invalid TXT row skipped:', line);
        return;
      }

      const [
        assetId,
        assetName,
        assetType,
        assetMake,
        assetModel,
        serialNumber,
        macAddress,
        ipAddress,
        warrantyApplicable,
        status,
      ] = parts;

      const newRecord: TableRow = {
        /* ========= CORE ========= */
        assetId: assetId || '',
        assetName: assetName || '',
        assetType: assetType || '',
        assetMake: assetMake || '',
        assetModel: assetModel || '',

        serialNumber: serialNumber || '',
        macAddress: macAddress || '',
        ipAddress: ipAddress || '',

        purchaseOrderId: '',
        invoiceNumber: '',

        /* ========= WARRANTY ========= */
        warrantyApplicable: warrantyApplicable || '',
        warrantyStartDate: '',
        warrantyEndDate: '',

        /* ========= AMC ========= */
        amcApplicable: '',
        amcStartDate: '',
        amcEndDate: '',

        /* ========= META ========= */
        createdBy: this.loginId || '',
        createdDate: today,
        updatedDate: '',

        /* ========= STATUS ========= */
        status: (status as 'Active' | 'Inactive') || 'Active',

        /* ========= UI PURPOSE ========= */
        isSelected: false
      };

      // ✅ Duplicate check (based on serialNumber)
      const exists = this.tableData.some(
        (a) => a.serialNumber === newRecord.serialNumber
      );

      if (!exists) {
        this.tableData.push(newRecord);
      }
    });

    this.filteredData = [...this.tableData];

    this.toast.success('TXT imported successfully!', 'success', 4000);
  };

  reader.readAsText(file);
}
  // ---------------- DOCX Parsing ----------------
async readDOCX(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.convertToHtml({ arrayBuffer });

    const doc = new DOMParser().parseFromString(result.value, 'text/html');

    const table = doc.querySelector('table');

    if (!table) {
      this.toast.danger('No table found in DOCX!', 'Error', 3000);
      return;
    }

    const rows = table.querySelectorAll('tr');
    const today = new Date().toISOString().split('T')[0];

    rows.forEach((row, index) => {
      if (index === 0) return; // skip header

      const cells = Array.from(row.querySelectorAll('td')).map((c) =>
        (c.textContent || '').trim()
      );

      // 🔥 validation (updated count)
      if (cells.length < 10) {
        console.warn('Invalid DOCX row skipped:', cells);
        return;
      }

      const [
        assetId,
        assetName,
        assetType,
        assetMake,
        assetModel,
        serialNumber,
        macAddress,
        ipAddress,
        warrantyApplicable,
        status,
        createdDate,
        updatedDate,
        createdBy,
      ] = cells;

      const newRecord: TableRow = {
        /* ========= CORE ========= */
        assetId: assetId || '',
        assetName: assetName || '',
        assetType: assetType || '',
        assetMake: assetMake || '',
        assetModel: assetModel || '',

        serialNumber: serialNumber || '',
        macAddress: macAddress || '',
        ipAddress: ipAddress || '',

        purchaseOrderId: '',
        invoiceNumber: '',

        /* ========= WARRANTY ========= */
        warrantyApplicable: warrantyApplicable || '',
        warrantyStartDate: '',
        warrantyEndDate: '',

        /* ========= AMC ========= */
        amcApplicable: '',
        amcStartDate: '',
        amcEndDate: '',

        /* ========= META ========= */
        createdBy: createdBy || this.loginId || '',
        createdDate: createdDate || today,
        updatedDate: updatedDate || '',

        /* ========= STATUS ========= */
        status: (status as 'Active' | 'Inactive') || 'Active',

        /* ========= UI PURPOSE ========= */
        isSelected: false
      };

      // ✅ Duplicate check (serialNumber OR macAddress)
      const exists = this.tableData.some(
        (a) =>
          a.serialNumber === newRecord.serialNumber ||
          a.macAddress === newRecord.macAddress
      );

      if (!exists) {
        this.tableData.push(newRecord);
      }
    });

    this.filteredData = [...this.tableData];

    this.toast.success('DOCX table imported successfully!', 'success', 4000);
  } catch (error) {
    console.error('DOCX Read Error:', error);
    this.toast.danger('Failed to read DOCX file!', 'Error', 4000);
  }
}
  // ---------------- PDF Parsing ----------------
  extract(text: string, regex: RegExp) {
    const m = text.match(regex);
    return m ? m[1].trim() : '';
  }
async readPDF(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    }).promise;

    let fullText = '';

    // 🔥 Extract all pages text
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      fullText += content.items.map((item: any) => item.str).join(' ') + ' ';
    }

    console.log('RAW:', fullText);

    // 🔥 Fix corrupted words
    fullText = fullText.replace(/A[cç][^\s]*ve/gi, 'Active');
    fullText = fullText.replace(/In[cç][^\s]*ve/gi, 'Inactive');

    // 🔥 Remove header (updated)
    fullText = fullText.replace(
      /Asset\s+ID\s+Asset\s+Name\s+Type\s+Make\s+Model\s+Serial\s+MAC\s+IP\s+Warranty\s+Status/gi,
      ''
    );

    // 🔥 Normalize
    fullText = fullText.replace(/\s+/g, ' ').trim();

    console.log('CLEANED:', fullText);

    // 🔥 Updated REGEX (as per new structure)
    const rowRegex =
      /(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\w-]+)\s+([\w:.-]+)\s+([\d.]+)\s+(Yes|No)\s+(Active|Inactive)/g;

    let match;
    const today = new Date().toISOString().split('T')[0];

    while ((match = rowRegex.exec(fullText)) !== null) {
      const newRecord: TableRow = {
        /* ========= CORE ========= */
        assetId: match[1] || '',
        assetName: match[2] || '',
        assetType: match[3] || '',
        assetMake: match[4] || '',
        assetModel: match[5] || '',

        serialNumber: match[6] || '',
        macAddress: match[7] || '',
        ipAddress: match[8] || '',

        purchaseOrderId: '',
        invoiceNumber: '',

        /* ========= WARRANTY ========= */
        warrantyApplicable: match[9] || '',
        warrantyStartDate: '',
        warrantyEndDate: '',

        /* ========= AMC ========= */
        amcApplicable: '',
        amcStartDate: '',
        amcEndDate: '',

        /* ========= META ========= */
        createdBy: this.loginId || '',
        createdDate: today,
        updatedDate: '',

        /* ========= STATUS ========= */
        status: (match[10] as 'Active' | 'Inactive') || 'Active',

        /* ========= UI PURPOSE ========= */
        isSelected: false
      };

      // ✅ Duplicate check
      const exists = this.tableData.some(
        (a) =>
          a.serialNumber === newRecord.serialNumber ||
          a.macAddress === newRecord.macAddress
      );

      if (!exists) {
        this.tableData.push(newRecord);
      }
    }

    this.filteredData = [...this.tableData];

    this.toast.success('PDF imported successfully!', 'success', 4000);

    console.log('FINAL ROWS:', this.tableData);
  } catch (error) {
    console.error('PDF Read Error:', error);
    this.toast.danger('Failed to read PDF file!', 'Error', 4000);
  }
}
  // ---------------- Download Sample CSV ----------------
downloadSampleCSV() {
  if (!this.tableData.length) {
    this.toast.danger('No data to download!', 'error', 4000);
    return;
  }

  const headers = [
    'Asset ID',
    'Asset Name',
    'Asset Type',
    'Asset Make',
    'Asset Model',
    'Serial Number',
    'MAC Address',
    'IP Address',
    'Purchase Order Id',
    'Invoice Number',
    'Warranty Applicable',
    'Warranty Start Date',
    'Warranty End Date',
    'AMC Applicable',
    'AMC Start Date',
    'AMC End Date',
    'Status',
    'Created Date',
    'Updated Date',
    'Created By',
  ];

  const csvRows = [headers.join(',')];

  this.tableData.forEach((row) => {
    const rowData = [
      row.assetId,
      row.assetName,
      row.assetType,
      row.assetMake,
      row.assetModel,

      row.serialNumber,
      row.macAddress,
      row.ipAddress,

      row.purchaseOrderId,
      row.invoiceNumber,

      row.warrantyApplicable,
      row.warrantyStartDate,
      row.warrantyEndDate,

      row.amcApplicable,
      row.amcStartDate,
      row.amcEndDate,

      row.status,

      row.createdDate,
      row.updatedDate,
      row.createdBy,
    ];

    csvRows.push(rowData.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'asset_sample.csv';
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

  // ⭐ Row 1 → Company Name
  csvRows.push(this.headCompanyName || 'Company Name');

  // ⭐ Row 2 → Date
  csvRows.push(`Date:,${formattedDate}`);

  // Empty Row
  csvRows.push('');

  // ⭐ Header
  const headers = [
    'Asset ID',
    'Asset Name',
    'Asset Type',
    'Asset Make',
    'Asset Model',
    'Serial Number',
    'MAC Address',
    'IP Address',
    'Purchase Order Id',
    'Invoice Number',
    'Warranty Applicable',
    'Warranty Start Date',
    'Warranty End Date',
    'AMC Applicable',
    'AMC Start Date',
    'AMC End Date',
    'Status',
    'Created Date',
    'Updated Date',
    'Created By',
  ];

  csvRows.push(headers.join(','));

  // ⭐ Data rows
  data.forEach((row: TableRow) => {
    const rowData = [
      row.assetId,
      row.assetName,
      row.assetType,
      row.assetMake,
      row.assetModel,

      row.serialNumber,
      row.macAddress,
      row.ipAddress,

      row.purchaseOrderId,
      row.invoiceNumber,

      row.warrantyApplicable,
      row.warrantyStartDate,
      row.warrantyEndDate,

      row.amcApplicable,
      row.amcStartDate,
      row.amcEndDate,

      row.status,

      row.createdDate,
      row.updatedDate,
      row.createdBy,
    ];

    csvRows.push(rowData.join(','));
  });

  // Create CSV
  const csvData = csvRows.join('\n');

  const blob = new Blob([csvData], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Filtered_Asset_Report.csv');
}
exportFilteredPDF(data: TableRow[]) {
  const doc = new jsPDF('l', 'pt', 'a4');

  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Asset Records', titleX, 60, { align: 'center' });

  const titleWidth = doc.getTextWidth('Asset Records');
  doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

  doc.setFontSize(14);

  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  doc.text(this.headCompanyName || 'Company Name', 40, 100);
  doc.text(dateStr, pageWidth - 40, 100, { align: 'right' });

  autoTable(doc, {
    startY: 120,

    head: [
      [
        'Asset ID',
        'Name',
        'Type',
        'Make',
        'Model',
        'Serial No',
        'MAC Address',
        'IP Address',
        'Warranty',
        'AMC',
        'Status',
      ],
    ],

    body: data.map((row) => [
      row.assetId,
      row.assetName,
      row.assetType,
      row.assetMake,
      row.assetModel,

      row.serialNumber,
      row.macAddress,
      row.ipAddress,

      row.warrantyApplicable,
      row.amcApplicable,
      row.status,
    ]),

    theme: 'grid',

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: 255,
      fontSize: 10,
      halign: 'center',
    },

    bodyStyles: {
      fontSize: 9,
      halign: 'center',
    },
  });

  doc.save('Filtered_Asset_Report.pdf');
}
exportFilteredExcel(data: TableRow[]) {
  const wsData: any[] = [];

  wsData.push([this.headCompanyName || 'Company Name']);

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  wsData.push([]);

  wsData.push([
    'Asset ID',
    'Asset Name',
    'Asset Type',
    'Asset Make',
    'Asset Model',
    'Serial Number',
    'MAC Address',
    'IP Address',
    'Purchase Order Id',
    'Invoice Number',
    'Warranty Applicable',
    'Warranty Start Date',
    'Warranty End Date',
    'AMC Applicable',
    'AMC Start Date',
    'AMC End Date',
    'Status',
    'Created Date',
    'Updated Date',
    'Created By',
  ]);

  data.forEach((row) => {
    wsData.push([
      row.assetId,
      row.assetName,
      row.assetType,
      row.assetMake,
      row.assetModel,

      row.serialNumber,
      row.macAddress,
      row.ipAddress,

      row.purchaseOrderId,
      row.invoiceNumber,

      row.warrantyApplicable,
      row.warrantyStartDate,
      row.warrantyEndDate,

      row.amcApplicable,
      row.amcStartDate,
      row.amcEndDate,

      row.status,

      row.createdDate,
      row.updatedDate,
      row.createdBy,
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  worksheet['!cols'] = new Array(20).fill({ wch: 18 });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Assets');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Filtered_Asset_Report.xlsx');
}
}
