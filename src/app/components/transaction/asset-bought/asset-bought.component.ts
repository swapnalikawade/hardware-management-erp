/*
 **************************************************************************************
 * Program Name  : AssetBoughtComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 11, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Asset Bought (Misc Purchase) module.
 *
 * Description   : This component manages all operations related to Asset Procurement
 *                 and Miscellaneous Purchase including:
 *                 - Fetch all asset purchased records based on Login ID
 *                 - Add single/multiple asset purchase entries
 *                 - Update existing asset records
 *                 - Delete single/multiple asset records
 *                 - Department-wise asset auto-fill logic
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (CSV, Excel, TXT, DOCX)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling with multiple entries
 *   - Validation using NgForm
 *   - File parsing using XLSX, Mammoth, pdfjs
 *   - Export using jsPDF & file-saver
 *   - Department-based asset auto population
 *   - File upload with validation (PDF, JPG, PNG)
 *   - Toast notifications using ng-angular-popup
 *
 * Endpoints Used:
 *   - GET    /asset-bought/getAllAssetBoughtByLoginId/{prefix}/{year}/{code}
 *   - POST   /asset-bought/saveAll
 *   - PUT    /asset-bought/update/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /asset-bought/delete-multiple-assetBought
 *   - POST   /asset-bought/import
 *
 * Called From   : Asset Bought UI (Frontend)
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

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as mammoth from 'mammoth';
import { getDocument } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';
import { Router } from '@angular/router';
import { NgToastService } from 'ng-angular-popup';
import { AuthService } from '../../../services/auth/auth-service';
import { CommonService } from '../../../services/common/common-service';

interface TableRow {
  /* ================= PRIMARY KEY ================= */
  assetBoughtMiscPurchaseId: string; // PK – Unique Asset ID
  assetBoughtMiscPurchaseCode: string; // Asset Code / Tag

  /* ================= ASSET CLASSIFICATION ================= */
  assetBoughtAssetCategory: 'IT' | 'Non-IT' | 'Electrical' | 'Mechanical';
  assetBoughtAssetType: string; // Laptop, Printer, UPS, AC, CCTV
  assetBoughtItemName: string; // Exact Asset Name

  /* ================= OWNERSHIP / LOCATION ================= */
  assetBoughtDepartment: string; // Department using asset

  /* ================= ASSET STATUS ================= */
  assetBoughtVendor: string;
  assetBoughtSerialNumber: string;
  assetBoughtAssetStatus: 'Working' | 'Not Working' | 'Under Repair';
  assetBoughtPurchaseDate: string; // YYYY-MM-DD

  /* ================= ADMIN / SYSTEM ================= */
  assetBoughtPurchasedBy: string; // Employee / User Name
  assetBoughtRemarks?: string;

  /* ================= SYSTEM AUDIT ================= */
  assetBoughtCreatedDate?: string;
  assetBoughtUpdatedDate?: string;

  /* ================= DOCUMENTS ================= */
  assetBoughtBillInvoiceNo: string;
  assetBoughtAttachment?: string; // Invoice / Warranty File URL
  assetBoughtStatus: 'Active' | 'Inactive'; // Record Status
  loginId: string;
}

@Component({
  selector: 'app-asset-bought',
  standalone: false,
  templateUrl: './asset-bought.component.html',
  styleUrls: ['./asset-bought.component.css'],
})
export class AssetBoughtComponent implements OnInit {
  // session variable
  token: string | null = null;
  userName: any | null = null;
  loginId: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
  headCompanyName: any | null = null;
  activeTab = 'details';
  today = new Date();
  form: any = {};
  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;
  loading: any = false;

  tableData: TableRow[] = [];
  filteredData: TableRow[] = [];

  constructor(
    private router: Router,
    private toast: NgToastService,
    private authService: AuthService,
    private commonService: CommonService,
    private cdr: ChangeDetectorRef,
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
    this.loadAssetBoughts();
    this.loadAssetTypes();
    this.loadDepartments();
    this.filteredData = [...this.tableData];
  }

  private initializeForm(): void {
    this.forms = [
      {
        /* ================= UI BINDING ================= */
        assetBoughtMiscPurchaseCode: '',

        assetBoughtAssetCategory: 'IT',
        assetBoughtAssetType: '',
        assetBoughtItemName: '',

        assetBoughtDepartment: '',

        assetBoughtVendor: '',
        assetBoughtSerialNumber: '',
        assetBoughtAssetStatus: 'Working',
        assetBoughtPurchaseDate: this.currentDate || '',

        assetBoughtBillInvoiceNo: '',
        assetBoughtAttachment: undefined,

        assetBoughtPurchasedBy: '',
        assetBoughtRemarks: '',

        assetBoughtCreatedDate: this.currentDate || '',
        assetBoughtUpdatedDate: undefined,

        assetBoughtStatus: 'Active',
        loginId: this.loginId || '',

        /* ================= BACKEND ================= */
        newRecord: {
          assetBoughtMiscPurchaseId: '0',
          assetBoughtMiscPurchaseCode: '',

          assetBoughtAssetCategory: 'IT',
          assetBoughtAssetType: '',
          assetBoughtItemName: '',

          assetBoughtDepartment: '',

          assetBoughtVendor: '',
          assetBoughtSerialNumber: '',
          assetBoughtAssetStatus: 'Working',
          assetBoughtPurchaseDate: this.currentDate || '',

          assetBoughtBillInvoiceNo: '',
          assetBoughtAttachment: undefined,

          assetBoughtPurchasedBy: '',
          assetBoughtRemarks: '',

          assetBoughtCreatedDate: this.currentDate || '',
          assetBoughtUpdatedDate: undefined,

          assetBoughtStatus: 'Active',
          loginId: this.loginId || '',
        },
      },
    ];
  }

  get editHeading(): string {
    if (this.isEditMode && this.editIndex !== null) {
      return (
        'Update Asset Details (ID: ' +
        this.tableData[this.editIndex].assetBoughtMiscPurchaseId +
        ')'
      );
    }
    return '';
  }

  loadAssetBoughts(): void {
    this.commonService.fetchAllAssetBoughtByLoginId(this.loginId).subscribe({
      next: (res: TableRow[]) => {
        this.tableData = res.map((item) => ({
          ...item,
          assetBoughtCreatedDate: item.assetBoughtCreatedDate,
        }));

        this.filteredData = [...this.tableData];
      },
      error: (err) => {
        console.error('API Error:', err);
      },
    });
  }
  TableRow: TableRow[] = [];
  itemNameOptions: string[] = [];
  modelOptions: string[] = [];
  // onAssetTypeChange(assetType: string, index: number) {
  //   this.itemNameOptions = [];
  //   this.modelOptions = [];

  //   this.forms[index].newRecord.assetBoughtItemName = '';

  //   if (this.assetBoughtData[assetType]) {
  //     this.itemNameOptions = this.assetMasterData[assetType].items;
  //   }
  // }

  // onItemNameChange(itemName: string, index: number) {
  //   this.modelOptions = [];

  //   const assetType = this.forms[index].newRecord.assetType;

  //   if (
  //     this.assetMasterData[assetType] &&
  //     this.assetMasterData[assetType].models[itemName]
  //   ) {
  //     this.modelOptions = this.assetMasterData[assetType].models[itemName];
  //   }
  // }

  tabs = [
    { key: 'details', label: 'Details', icon: 'bi bi-building-fill' },
    { key: 'newRecord', label: 'New Record', icon: 'bi bi-plus-circle-fill' },
    {
      key: 'bulkImport',
      label: 'Bulk Import',
      icon: 'bi bi-file-earmark-arrow-down-fill',
    },
    {
      key: 'bulkExport',
      label: 'Bulk Export',
      icon: 'bi bi-file-earmark-arrow-up-fill',
    },
    { key: 'help', label: 'Help', icon: 'bi bi-question-circle-fill' },
  ];

  toastMessage: string | null = null;
  toastType: string = 'success';

  showToast(message: string, type: string = 'success') {
    this.toastMessage = message;
    this.toastType = type;

    setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }
  departments: any[] = [];

  loadDepartments() {
    this.commonService.fetchAllDepartmentByHeadCompany(this.loginId).subscribe({
      next: (res: any[]) => {
        this.departments = res;
      },
      error: (err) => {
        console.error('Department Load Error:', err);
      },
    });
  }
  assetTypes: any[] = [];

  loadAssetTypes(): void {
  if (!this.loginId) return;

  this.commonService.fetchAssetTypeByLoginId(this.loginId).subscribe({
    next: (res: any) => {
      console.log('API RESPONSE:', res);

      this.tableData = res.map((item: any) => ({
        assetTypeId: item.assetTypeId ?? '',
        assetTypeCode: item.assetTypeCode ?? '',
        assetTypeName: item.assetTypeName ?? '',
        assetCategory: item.assetCategory ?? '',

        warrantyApplicable: item.warrantyApplicable ?? '',
        warrantyDuration: item.warrantyDuration ?? '',
        warrantyUnit: item.warrantyUnit ?? '',

        createdBy: item.createdBy ?? '',
        createdDate: item.createdDate ?? '',
        updatedDate: item.updatedDate ?? '',

        status: item.status ?? 'Active',
      }));

      this.filteredData = [...this.tableData];
    },
    error: (err) => {
      console.error('API Error:', err);
    },
  });
}

  // For modal
  showViewModal: boolean = false;
  selectedRow: any = null;

  openDetails(row: any) {
    this.selectedRow = row;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }

  //search filter
  // searchText = '';
  // filteredData: TableRow[] = [];
  // ngOnInit() {
  //   this.filteredData = [...this.TableRow]; // ⭐⭐⭐ THIS IS THE FIX
  //   this.forms[0].newRecord.assetBoughtCreatedDate = this.getTodayDate();
  // }

  applyFilter(event: any) {
    this.searchText = event.target.value.toLowerCase().trim();

    // Filter = tableData
    this.filteredData = this.tableData.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(this.searchText),
    );

    this.currentPage = 1; // pagination reset
  }

  //header
  companyName = 'AMC Call Logging';
  companyEmail = 'amccalllogging@gmail.com';

  selectedRows: any[] = []; // stores selected rows

  // Toggle single row selection
  //selectedRows: AssetReturnRow[] = [];

  toggleRowSelection(row: any, event: any) {
    if (event.target.checked) {
      this.selectedRows.push(row);
    } else {
      this.selectedRows = this.selectedRows.filter((r) => r !== row);
    }
  }

  toggleAll(event: any) {
    if (event.target.checked) {
      this.selectedRows = [...this.tableData];
    } else {
      this.selectedRows = [];
    }
  }

  //delete selected rows
  deleteConfirm = false;

  deleteSelectedRows(): void {
    if (!this.selectedRows.length) {
      this.toast.danger('No records selected to delete!', '', 4000);
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${this.selectedRows.length} record(s)?`,
    );

    if (!confirmed) return;

    // 🔥 Collect Asset IDs
    const ids: string[] = this.selectedRows.map(
      (row) => row.assetBoughtMiscPurchaseId,
    );

    // 🔥 Single API call
    this.commonService.deleteMultipleAssetBought(ids).subscribe({
      next: () => {
        // remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.assetBoughtMiscPurchaseId),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];
        this.currentPage = 1;

        this.loadAssetBoughts();
        this.loadDepartments();

        this.loadAssetTypes();

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

  sortTable(column: keyof TableRow, order: 'asc' | 'desc') {
    const sorted = [...this.filteredData].sort((a, b) => {
      let valA = a[column] ?? '';
      let valB = b[column] ?? '';

      // 🔢 Number check
      const numA = Number(valA);
      const numB = Number(valB);
      const isNumber = !isNaN(numA) && !isNaN(numB);

      if (isNumber) {
        return order === 'asc' ? numA - numB : numB - numA;
      }

      // 📅 Date check (YYYY-MM-DD)
      const dateA = Date.parse(String(valA));
      const dateB = Date.parse(String(valB));
      const isDate = !isNaN(dateA) && !isNaN(dateB);

      if (isDate) {
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // 🔤 String compare (default)
      return order === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    this.filteredData = sorted;
  }

  exportExcel() {
    const dataToExport: TableRow[] =
      this.filteredData && this.filteredData.length > 0
        ? this.filteredData
        : [];

    if (dataToExport.length === 0) {
      this.showToast('No data available to export', 'Warning');
      return;
    }

    // ✅ Export data strictly as per TableRow interface
    const exportData = dataToExport.map((row: TableRow) => ({
      Asset_ID: row.assetBoughtMiscPurchaseId,
      Asset_Code: row.assetBoughtMiscPurchaseCode,

      Asset_Category: row.assetBoughtAssetCategory,
      Asset_Type: row.assetBoughtAssetType,

      Department: row.assetBoughtDepartment,

      Asset_Status: row.assetBoughtAssetStatus,

      Purchase_Date: row.assetBoughtPurchaseDate,

      Bill_Invoice_No: row.assetBoughtBillInvoiceNo,

      Purchased_By: row.assetBoughtPurchasedBy,
      Record_Status: row.assetBoughtStatus,

      Remarks: row.assetBoughtRemarks ?? '',
      Created_Date: row.assetBoughtCreatedDate ?? '',
      Updated_Date: row.assetBoughtUpdatedDate ?? '',
    }));
    // 📄 Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 📐 Auto column width
    worksheet['!cols'] = Object.keys(exportData[0]).map(() => ({
      wch: 24,
    }));

    // 📘 Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AMC_AssetBought');

    // ⬇ Download Excel (date-wise file name)
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `AMC_AssetBought${today}.xlsx`);

    this.showToast('Excel exported successfully', 'Success');
  }

  exportDoc() {
    if (!this.filteredData || this.filteredData.length === 0) {
      this.showToast('No data available to export', 'Warning');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-GB');

    let content = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    @page WordSection1 {
      size: 842pt 595pt;
      mso-page-orientation: landscape;
    }
    div.WordSection1 { page: WordSection1; }

    table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
      font-size: 11px;
      word-wrap: break-word;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px;
      text-align: left;
    }
    th {
      background: #f2f2f2;
      font-weight: bold;
    }

    .header-table {
      width: 100%;
      margin-bottom: 15px;
    }
    .header-table td {
      border: none;
      padding: 2px;
      font-size: 12px;
    }
    .title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <div class="WordSection1">

    <table class="header-table">
      <tr>
        <td>Date: ${currentDate}</td>
      </tr>
      <tr>
        <td class="title">AMC Asset Bought </td>
      </tr>
    </table>

    <table>
      <tr>
  <th>Asset ID</th>
  <th>Asset Code</th>
  <th>Category</th>
  <th>Type</th>
  <th>Item Name</th>
  <th>Department</th>
  <th>Asset Status</th>
  <th>Purchase Date</th>
  <th>Invoice No</th>
  <th>Purchased By</th>
  <th>Record Status</th>
  <th>Remarks</th>
</tr>
  `;

    this.filteredData.forEach((row: TableRow) => {
      content += `
     <tr>
  <td>${row.assetBoughtMiscPurchaseId || ''}</td>
  <td>${row.assetBoughtMiscPurchaseCode || ''}</td>
  <td>${row.assetBoughtAssetCategory || ''}</td>
  <td>${row.assetBoughtAssetType || ''}</td>
  <td>${row.assetBoughtItemName || ''}</td>
  <td>${row.assetBoughtDepartment || ''}</td>
  <td>${row.assetBoughtAssetStatus || ''}</td>
  <td>${row.assetBoughtPurchaseDate || ''}</td>
  <td>${row.assetBoughtBillInvoiceNo || ''}</td>
  <td>${row.assetBoughtPurchasedBy || ''}</td>
  <td>${row.assetBoughtStatus || ''}</td>
  <td>${row.assetBoughtRemarks ?? ''}</td>
</tr>
    `;
    });

    content += `
    </table>
  </div>
</body>
</html>
`;

    const blob = new Blob(['\ufeff', content], {
      type: 'application/msword',
    });

    const today = new Date().toISOString().split('T')[0];
    saveAs(blob, `AMC_Asset_Bought_${today}.doc`);

    this.showToast('Word document exported successfully', 'Success');
  }

  exportPDF() {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('en-GB');

    /* ================= HEADER ================= */
    doc.setFontSize(10);
    doc.text(`Date: ${currentDate}`, 10, 12);

    doc.setFontSize(18);
    doc.text('AMC Asset Bought Report', pageWidth / 2, 12, { align: 'center' });

    /* ================= TABLE ================= */
    autoTable(doc, {
      startY: 20,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'left',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: '#ffffff',
        halign: 'center',
      },
      tableWidth: 'auto',

      head: [
        [
          'Asset ID',
          'Asset Code',
          'Category',
          'Type',
          'Item Name',
          'Department',
          'Asset Status',
          'Purchase Date',
          'Invoice No',
          'Purchased By',
          'Record Status',
          'Remarks',
        ],
      ],

      body: this.filteredData.map((row: TableRow) => [
        row.assetBoughtMiscPurchaseId || '',
        row.assetBoughtMiscPurchaseCode || '',
        row.assetBoughtAssetCategory || '',
        row.assetBoughtAssetType || '',
        row.assetBoughtItemName || '',
        row.assetBoughtDepartment || '',
        row.assetBoughtAssetStatus || '',
        row.assetBoughtPurchaseDate || '',
        row.assetBoughtBillInvoiceNo || '',
        row.assetBoughtPurchasedBy || '',
        row.assetBoughtStatus || '',
        row.assetBoughtRemarks ?? '',
      ]),

      didDrawCell: (data) => {
        // 🔲 Strong visible borders
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
      },
    });

    /* ================= SAVE ================= */
    const today = new Date().toISOString().split('T')[0];
    doc.save(`AMC_Asset_Bought_${today}.pdf`);
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
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Calculate total pages
  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  onFileSelect(event: Event, index: number) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Optional: file type validation
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.showToast('Only PDF, JPG, PNG files are allowed', 'warning');
      input.value = '';
      return;
    }

    // Optional: file size validation (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('File size should be less than 5MB', 'warning');
      input.value = '';
      return;
    }

    // Store file name or URL (as per your interface)
    this.forms[index].newRecord.assetBoughtAttachment = file.name;

    // 👉 If later you want base64 / upload to server, we can extend this
  }

  // Page change function
  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  //current date format
  // Converts Date → "dd-mm-yyyy"
  getTodayDate(): string {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}-${m}-${y}`; // dd-mm-yyyy ✅
  }

  // --------------------------
  // INITIAL RECORD STRUCTURE

  newRecord: TableRow = {
    /* ================= PRIMARY KEY ================= */
    assetBoughtMiscPurchaseId: '',
    assetBoughtMiscPurchaseCode: '',

    /* ================= ASSET CLASSIFICATION ================= */
    assetBoughtAssetCategory: 'IT',
    assetBoughtAssetType: '',
    assetBoughtItemName: '',

    /* ================= OWNERSHIP ================= */
    assetBoughtDepartment: '',

    /* ================= ASSET STATUS ================= */
    assetBoughtVendor: '',
    assetBoughtSerialNumber: '',
    assetBoughtAssetStatus: 'Working',

    /* ================= PURCHASE ================= */
    assetBoughtPurchaseDate: this.getTodayDate(),

    /* ================= DOCUMENTS ================= */
    assetBoughtBillInvoiceNo: '',
    assetBoughtAttachment: undefined,

    /* ================= ADMIN ================= */
    assetBoughtPurchasedBy: '',
    assetBoughtStatus: 'Active',
    assetBoughtRemarks: '',

    /* ================= AUDIT ================= */
    assetBoughtCreatedDate: this.getTodayDate(),
    assetBoughtUpdatedDate: undefined,

    /* ================= LOGIN ================= */
    loginId: this.loginId || '',
  };

  // --------------------------
  // STATE VARIABLES
  // --------------------------
  isEditMode: boolean = false;
  editIndex: number = -1; // ensures no TS errors
  forms: any[] = [{ newRecord: {} }];
  activeForm: number = 0;
  showErrors: boolean = false;

  // --------------------------
  // OPEN NEW RECORD TAB
  // --------------------------
  openNewRecordTab() {
    this.activeTab = 'newRecord';
    this.isEditMode = false;
    this.editIndex = -1;

    // Reset to single blank form
    this.forms = [{ newRecord: { ...this.newRecord } }];
    this.activeForm = 0;
    this.showErrors = false;
  }

  // --------------------------
  // ADD NEW FORM
  // --------------------------
  addForm() {
    if (this.isEditMode) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const currentDate = `${yyyy}-${mm}-${dd}`;

    this.forms.push({
      newRecord: {
        /* ================= PRIMARY KEY ================= */
        assetBoughtMiscPurchaseId: '0',
        assetBoughtMiscPurchaseCode: '',

        /* ================= ASSET CLASSIFICATION ================= */
        assetBoughtAssetCategory: 'IT',
        assetBoughtAssetType: '',
        assetBoughtItemName: '',

        /* ================= OWNERSHIP ================= */
        assetBoughtDepartment: '',

        /* ================= ASSET STATUS ================= */
        assetBoughtVendor: '',
        assetBoughtSerialNumber: '',
        assetBoughtAssetStatus: 'Working',

        /* ================= PURCHASE ================= */
        assetBoughtPurchaseDate: currentDate,

        /* ================= DOCUMENTS ================= */
        assetBoughtBillInvoiceNo: '',
        assetBoughtAttachment: '',

        /* ================= ADMIN ================= */
        assetBoughtPurchasedBy: '',
        assetBoughtRemarks: '',

        /* ================= AUDIT ================= */
        assetBoughtCreatedDate: currentDate,
        assetBoughtUpdatedDate: undefined,

        /* ================= STATUS ================= */
        assetBoughtStatus: 'Active',

        /* ================= LOGIN ================= */
        loginId: this.loginId || '',
      },
    });
  }

  // --------------------------
  // REMOVE FORM
  // --------------------------
  removeForm(index: number) {
    if (index === 0 && this.forms.length === 1) return; // cannot remove the only form
    this.forms.splice(index, 1);
    if (this.activeForm >= this.forms.length) {
      this.activeForm = this.forms.length - 1;
    }
  }

  // --------------------------
  // SAVE RECORD (SINGLE OR MULTIPLE)
  // --------------------------
  saveAllRecords() {
    /* ---------------- VALIDATION ---------------- */
    const invalid = this.forms.some(
      (f) =>
        !f.newRecord.assetBoughtMiscPurchaseCode?.trim() ||
        !f.newRecord.assetBoughtAssetCategory ||
        !f.newRecord.assetBoughtAssetType?.trim() ||
        !f.newRecord.assetBoughtItemName?.trim() ||
        !f.newRecord.assetBoughtDepartment?.trim() ||
        !f.newRecord.assetBoughtAssetStatus ||
        !f.newRecord.assetBoughtPurchaseDate ||
        !f.newRecord.assetBoughtBillInvoiceNo?.trim() ||
        !f.newRecord.assetBoughtPurchasedBy?.trim() ||
        !f.newRecord.assetBoughtStatus,
    );

    if (invalid) {
      this.showErrors = true;
      this.toast.warning('Please fill all required fields!', 'WARNING', 4000);
      return;
    }

    /* ---------------- EDIT MODE ---------------- */
    if (this.isEditMode && this.editIndex !== null) {
      const form = this.forms[0].newRecord;

      const payload = {
        assetBoughtMiscPurchaseCode: form.assetBoughtMiscPurchaseCode,

        assetBoughtAssetCategory: form.assetBoughtAssetCategory,
        assetBoughtAssetType: form.assetBoughtAssetType,
        assetBoughtItemName: form.assetBoughtItemName,

        assetBoughtDepartment: form.assetBoughtDepartment,

        // 🔥 ADD THIS (IMPORTANT)
        assetBoughtVendor: form.assetBoughtVendor,
        assetBoughtSerialNumber: form.assetBoughtSerialNumber,

        assetBoughtAssetStatus: form.assetBoughtAssetStatus,
        assetBoughtPurchaseDate: form.assetBoughtPurchaseDate,

        assetBoughtBillInvoiceNo: form.assetBoughtBillInvoiceNo,
        assetBoughtAttachment: form.assetBoughtAttachment,

        assetBoughtPurchasedBy: form.assetBoughtPurchasedBy,
        assetBoughtRemarks: form.assetBoughtRemarks,

        assetBoughtStatus: form.assetBoughtStatus,

        loginId: this.loginId,
      };

      const assetId = this.tableData[this.editIndex].assetBoughtMiscPurchaseId;

      this.commonService
        .updateAssetBought(assetId, this.loginId, payload)
        .subscribe({
          next: () => {
            this.toast.success('Record Updated Successfully!', 'SUCCESS', 4000);
            this.resetAfterSave();
            this.loadAssetBoughts();
          },
          error: () => {
            this.toast.danger(
              'Update failed. Service unavailable!',
              'ERROR',
              4000,
            );
          },
        });

      return;
    }

    /* ---------------- ADD MODE ---------------- */

    const payload = this.forms.map((f) => ({
      assetBoughtMiscPurchaseCode: f.newRecord.assetBoughtMiscPurchaseCode,

      assetBoughtAssetCategory: f.newRecord.assetBoughtAssetCategory,
      assetBoughtAssetType: f.newRecord.assetBoughtAssetType,
      assetBoughtItemName: f.newRecord.assetBoughtItemName,

      assetBoughtDepartment: f.newRecord.assetBoughtDepartment,

      // ✅ ADD THIS
      assetBoughtVendor: f.newRecord.assetBoughtVendor,
      assetBoughtSerialNumber: f.newRecord.assetBoughtSerialNumber,

      assetBoughtAssetStatus: f.newRecord.assetBoughtAssetStatus,

      assetBoughtPurchaseDate: f.newRecord.assetBoughtPurchaseDate,

      assetBoughtBillInvoiceNo: f.newRecord.assetBoughtBillInvoiceNo,

      assetBoughtAttachment: f.newRecord.assetBoughtAttachment,

      assetBoughtPurchasedBy: f.newRecord.assetBoughtPurchasedBy,
      assetBoughtRemarks: f.newRecord.assetBoughtRemarks,

      assetBoughtStatus: f.newRecord.assetBoughtStatus,

      loginId: this.loginId,
    }));

    this.commonService.submitAssetBought(payload).subscribe({
      next: (res) => {
        if (res?.dublicateMessages?.length) {
          res.dublicateMessages.forEach((msg: string) =>
            this.toast.warning(msg, 'WARNING', 4000),
          );
        }

        this.toast.success('Record Added Successfully!', 'SUCCESS', 4000);

        this.resetAfterSave();
        this.loadAssetBoughts();
      },

      error: () => {
        this.toast.danger(
          'Save failed. AssetBought service down!',
          'ERROR',
          4000,
        );
      },
    });
  }

  resetAfterSave() {
    this.initializeForm(); // 🔥 BEST WAY

    this.isEditMode = false;
    this.editIndex = -1;

    this.activeTab = 'details';
    this.showErrors = false;

    this.cdr.detectChanges(); // 🔥 IMPORTANT
  }

  // --------------------------
  // CANCEL / RESET FORM
  // --------------------------
  cancelRecord(form: NgForm) {
    if (form) {
      form.resetForm();
    }

    this.initializeForm(); // 🔥 FULL RESET

    this.isEditMode = false;
    this.editIndex = -1;

    this.showErrors = false;

    this.cdr.detectChanges();
  }

  // --------------------------
  // EDIT EXISTING ROW
  // --------------------------
  onEdit(row: TableRow, index: number) {
    this.activeTab = 'newRecord';
    this.isEditMode = true;
    this.editIndex = index;

    console.log('EDIT DATA:', row);

    this.forms = [
      {
        newRecord: {
          ...row,
          assetBoughtPurchaseDate: row.assetBoughtPurchaseDate?.split('T')[0],
        },
      },
    ];

    this.activeForm = 0;
    this.showErrors = false;
  }

  //bulk export date format
  startDateError: string = '';
  endDateError: string = '';

  formatDate(event: any, type: 'start' | 'end') {
    let value = event.target.value.replace(/\D/g, ''); // only digits
    if (value.length > 8) value = value.substring(0, 8);

    let formatted = value;

    if (value.length > 2) formatted = value.slice(0, 2) + '-' + value.slice(2);
    if (value.length > 4)
      formatted =
        value.slice(0, 2) + '-' + value.slice(2, 4) + '-' + value.slice(4);

    event.target.value = formatted;

    // Clear previous error for the correct field
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

  //bulk import buttons function
  // Trigger when file is selected
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.toast.warning('Select a file first!');
      return;
    }

    this.loading = true;

    this.commonService.uploadAssetBoughtExcel(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;

        // reload table
        this.loadAssetBoughts();

        this.toast.success(
          'Imported ' + (Array.isArray(res) ? res.length : 'records'),
          'SUCCESS',
          4000,
        );
      },

      error: (err) => {
        this.loading = false;

        console.error(err);

        this.toast.danger('Import Failed', 'ERROR', 4000);
      },
    });
  }

  csvHeaders: string[] = [];
  csvRecords: any[] = [];

  // Convert CSV → JSON and store in tableData
  parseCSV(csv: string) {
    const lines = csv
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);

    if (lines.length <= 1) {
      this.showToast('CSV has no data', 'warning');
      return;
    }

    /* ================= HEADER MAPPING ================= */
    const mapHeader = (h: string) => {
      switch (h.toLowerCase()) {
        case 'asset id':
          return 'assetBoughtMiscPurchaseId';

        case 'asset code':
          return 'assetBoughtMiscPurchaseCode';

        case 'asset category':
          return 'assetBoughtAssetCategory';

        case 'asset type':
          return 'assetBoughtAssetType';

        case 'item name':
          return 'assetBoughtItemName';

        case 'department':
          return 'assetBoughtDepartment';

        case 'asset status':
          return 'assetBoughtAssetStatus';

        case 'purchase date':
          return 'assetBoughtPurchaseDate';

        case 'bill invoice no':
        case 'invoice no':
          return 'assetBoughtBillInvoiceNo';

        case 'purchased by':
          return 'assetBoughtPurchasedBy';

        case 'record status':
          return 'assetBoughtStatus';

        case 'remarks':
          return 'assetBoughtRemarks';

        case 'created date':
          return 'assetBoughtCreatedDate';

        case 'updated date':
          return 'assetBoughtUpdatedDate';

        default:
          return h;
      }
    };

    const csvHeaders = lines[0].split(',').map((h) => mapHeader(h.trim()));
    const results: TableRow[] = [];

    /* ================= ROW PARSING ================= */
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj: any = {};

      csvHeaders.forEach((h, idx) => {
        obj[h] = values[idx] ? values[idx].trim() : '';
      });

      const newAssetId =
        obj['miscPurchaseId'] ||
        `AST-${String(this.TableRow.length + results.length + 1).padStart(3, '0')}`;

      const newRecord: TableRow = {
        assetBoughtMiscPurchaseId: newAssetId,
        assetBoughtMiscPurchaseCode: obj['assetBoughtMiscPurchaseCode'] || '',

        assetBoughtAssetCategory:
          (obj['assetBoughtAssetCategory'] as any) || 'IT',

        assetBoughtAssetType: obj['assetBoughtAssetType'] || '',
        assetBoughtItemName: obj['assetBoughtItemName'] || '',

        assetBoughtDepartment: obj['assetBoughtDepartment'] || '',

        /* ================= VENDOR / SERIAL ================= */
        assetBoughtVendor: obj['assetBoughtVendor'] || '',
        assetBoughtSerialNumber: obj['assetBoughtSerialNumber'] || '',

        /* ================= STATUS ================= */
        assetBoughtAssetStatus:
          (obj['assetBoughtAssetStatus'] as any) || 'Working',

        assetBoughtPurchaseDate:
          obj['assetBoughtPurchaseDate'] || this.getTodayDate(),

        /* ================= DOCUMENT ================= */
        assetBoughtBillInvoiceNo: obj['assetBoughtBillInvoiceNo'] || '',
        assetBoughtAttachment: undefined,

        /* ================= ADMIN ================= */
        assetBoughtPurchasedBy: obj['assetBoughtPurchasedBy'] || '',

        assetBoughtStatus:
          (obj['assetBoughtStatus'] as 'Active' | 'Inactive') || 'Active',

        assetBoughtRemarks: obj['assetBoughtRemarks'] || '',

        /* ================= AUDIT ================= */
        assetBoughtCreatedDate:
          obj['assetBoughtCreatedDate'] || this.getTodayDate(),

        assetBoughtUpdatedDate: obj['assetBoughtUpdatedDate'] || undefined,

        /* ================= LOGIN ================= */
        loginId: this.loginId || '',
      };

      results.push(newRecord);
    }

    /* ================= MERGE DATA ================= */
    this.TableRow = [...this.TableRow, ...results];
    this.filteredData = [...this.TableRow];
    this.currentPage = 1;

    this.cdr.detectChanges();
    this.showToast('AMC Asset CSV imported successfully!', 'success');
  }

  // ---------------- Excel Parsing ----------------
  readExcel(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      const workbook = XLSX.read(reader.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json<any>(sheet);

      json.forEach((obj, i) => {
        const newAssetId =
          obj['Asset ID'] ||
          `AST-${String(this.TableRow.length + i + 1).padStart(3, '0')}`;

        const newRecord: TableRow = {
          assetBoughtMiscPurchaseId: newAssetId,
          assetBoughtMiscPurchaseCode: obj['assetBoughtMiscPurchaseCode'] || '',

          assetBoughtAssetCategory:
            (obj['assetBoughtAssetCategory'] as any) || 'IT',

          assetBoughtAssetType: obj['assetBoughtAssetType'] || '',
          assetBoughtItemName: obj['assetBoughtItemName'] || '',

          assetBoughtDepartment: obj['assetBoughtDepartment'] || '',

          /* ===== MISSING FIELDS ADDED ===== */
          assetBoughtVendor: obj['assetBoughtVendor'] || '',
          assetBoughtSerialNumber: obj['assetBoughtSerialNumber'] || '',

          assetBoughtAssetStatus:
            (obj['assetBoughtAssetStatus'] as any) || 'Working',

          assetBoughtPurchaseDate:
            obj['assetBoughtPurchaseDate'] || this.getTodayDate(),

          assetBoughtBillInvoiceNo: obj['assetBoughtBillInvoiceNo'] || '',
          assetBoughtAttachment: undefined,

          assetBoughtPurchasedBy: obj['assetBoughtPurchasedBy'] || '',

          assetBoughtStatus:
            (obj['assetBoughtStatus'] as 'Active' | 'Inactive') || 'Active',

          assetBoughtRemarks: obj['assetBoughtRemarks'] || '',

          assetBoughtCreatedDate:
            obj['assetBoughtCreatedDate'] || this.getTodayDate(),

          assetBoughtUpdatedDate: obj['assetBoughtUpdatedDate'] || undefined,

          /* ===== LOGIN FIELD ===== */
          loginId: this.loginId || '',
        };
        this.TableRow.push(newRecord);
      });

      /* ================= REFRESH VIEW ================= */
      this.filteredData = [...this.TableRow];
      this.currentPage = 1;

      this.cdr.detectChanges();
      this.showToast('AMC Asset Excel imported successfully!', 'success');
    };

    reader.readAsBinaryString(file);
  }

  // ---------------- TXT Parsing ----------------
  readTXT(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '');

      lines.forEach((line, idx) => {
        const cols = line.split(',').map((c) => c.trim());

        // Ensure minimum columns (18)
        while (cols.length < 18) cols.push('');

        const newAssetId =
          cols[0] ||
          `AST-${String(this.TableRow.length + idx + 1).padStart(3, '0')}`;

        const newRecord: TableRow = {
          /* ================= PRIMARY KEY ================= */
          assetBoughtMiscPurchaseId: newAssetId,
          assetBoughtMiscPurchaseCode: cols[1] || '',

          /* ================= ASSET CLASSIFICATION ================= */
          assetBoughtAssetCategory: ([
            'IT',
            'Non-IT',
            'Electrical',
            'Mechanical',
          ].includes(cols[2])
            ? cols[2]
            : 'IT') as 'IT' | 'Non-IT' | 'Electrical' | 'Mechanical',

          assetBoughtAssetType: cols[3] || '',
          assetBoughtItemName: cols[4] || '',

          /* ================= OWNERSHIP ================= */
          assetBoughtDepartment: cols[7] || '',

          /* ================= VENDOR / SERIAL ================= */
          assetBoughtVendor: cols[5] || '',
          assetBoughtSerialNumber: cols[6] || '',

          /* ================= ASSET STATUS ================= */
          assetBoughtAssetStatus: ([
            'Working',
            'Not Working',
            'Under Repair',
          ].includes(cols[9])
            ? cols[9]
            : 'Working') as 'Working' | 'Not Working' | 'Under Repair',

          /* ================= PURCHASE ================= */
          assetBoughtPurchaseDate: cols[12] || this.getTodayDate(),

          /* ================= DOCUMENTS ================= */
          assetBoughtBillInvoiceNo: cols[14] || '',
          assetBoughtAttachment: undefined,

          /* ================= ADMIN ================= */
          assetBoughtPurchasedBy: cols[15] || '',

          assetBoughtStatus: (cols[16] === 'Inactive'
            ? 'Inactive'
            : 'Active') as 'Active' | 'Inactive',

          assetBoughtRemarks: cols[17] || '',

          /* ================= SYSTEM AUDIT ================= */
          assetBoughtCreatedDate: this.getTodayDate(),
          assetBoughtUpdatedDate: undefined,

          /* ================= LOGIN ================= */
          loginId: this.loginId || '',
        };

        this.TableRow.push(newRecord);
      });

      this.filteredData = [...this.TableRow];
      this.currentPage = 1;

      this.cdr.detectChanges();
      this.showToast('AMC Asset TXT imported successfully!', 'success');
    };

    reader.readAsText(file);
  }

  // ---------------- DOCX Parsing (mammoth.js) ----------------
  async readDOCX(file: File) {
    const reader = new FileReader();

    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;

      // DOCX → HTML
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');

      if (!table) {
        this.showToast('No table found in DOCX!', 'warning');
        return;
      }

      const rows = table.querySelectorAll('tr');

      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return; // skip header

        const cells = Array.from(row.querySelectorAll('td')).map(
          (cell) => cell.textContent?.trim() || '',
        );

        // Ensure minimum columns (18)
        while (cells.length < 18) cells.push('');

        const newAssetId =
          cells[0] ||
          `AST-${String(this.TableRow.length + rowIndex).padStart(3, '0')}`;

        const newRecord: TableRow = {
          /* ================= PRIMARY KEY ================= */
          assetBoughtMiscPurchaseId: newAssetId,
          assetBoughtMiscPurchaseCode: cells[1] || '',

          /* ================= ASSET CLASSIFICATION ================= */
          assetBoughtAssetCategory: ([
            'IT',
            'Non-IT',
            'Electrical',
            'Mechanical',
          ].includes(cells[2])
            ? cells[2]
            : 'IT') as 'IT' | 'Non-IT' | 'Electrical' | 'Mechanical',

          assetBoughtAssetType: cells[3] || '',
          assetBoughtItemName: cells[4] || '',

          /* ================= OWNERSHIP ================= */
          assetBoughtDepartment: cells[7] || '',

          /* ================= VENDOR / SERIAL ================= */
          assetBoughtVendor: cells[5] || '',
          assetBoughtSerialNumber: cells[6] || '',

          /* ================= ASSET STATUS ================= */
          assetBoughtAssetStatus: ([
            'Working',
            'Not Working',
            'Under Repair',
          ].includes(cells[9])
            ? cells[9]
            : 'Working') as 'Working' | 'Not Working' | 'Under Repair',

          /* ================= PURCHASE ================= */
          assetBoughtPurchaseDate: cells[12] || this.getTodayDate(),

          /* ================= DOCUMENTS ================= */
          assetBoughtBillInvoiceNo: cells[14] || '',
          assetBoughtAttachment: undefined,

          /* ================= ADMIN ================= */
          assetBoughtPurchasedBy: cells[15] || '',

          assetBoughtStatus: (cells[16] === 'Inactive'
            ? 'Inactive'
            : 'Active') as 'Active' | 'Inactive',

          assetBoughtRemarks: cells[17] || '',

          /* ================= SYSTEM AUDIT ================= */
          assetBoughtCreatedDate: this.getTodayDate(),
          assetBoughtUpdatedDate: undefined,

          /* ================= LOGIN ================= */
          loginId: this.loginId || '',
        };

        this.TableRow.push(newRecord);
      });

      this.filteredData = [...this.TableRow];
      this.currentPage = 1;

      this.cdr.detectChanges();
      this.showToast('AMC Asset DOCX imported successfully!', 'success');
    };

    reader.readAsArrayBuffer(file);
  }

  //onAssetTypeChange(type: string) {
  //  if (!this.form.newRecord.itemName) {
  //    this.form.newRecord.itemName = type;
  //  }
  //}

  downloadSampleCSV() {
    /* ================= CSV HEADERS ================= */
    const headers = [
      'Asset ID',
      'Asset Code',
      'Asset Category',
      'Asset Type',
      'Item Name',
      'Department',
      'Asset Status',
      'Purchase Date',
      'Bill / Invoice No',
      'Purchased By',
      'Record Status',
      'Remarks',
      'Created Date',
    ];

    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.join(','));

    /* ================= SAMPLE DATA ROW ================= */
    const sampleRow = [
      'AST-001',
      'ASSET-IT-001',
      'IT',
      'Laptop',
      'Dell Latitude 5420',
      'IT',
      'Working',
      '2024-10-01',
      'INV-DEL-001',
      'IT Admin',
      'Active',
      'Sample asset record',
      this.getTodayDate(),
    ];

    csvRows.push(
      sampleRow.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','),
    );

    /* ================= DOWNLOAD ================= */
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'Asset_Bought_Sample.csv';
    a.click();

    window.URL.revokeObjectURL(url);

    this.showToast('Sample CSV downloaded successfully', 'success');
  }
  //bulk export
  // ---------------- Component Variables ----------------
  startDate: string = '';
  endDate: string = '';
  fileType: string = 'csv';
  // startDateError: string = '';
  // endDateError: string = '';

  // ---------------- Reset Filters ----------------
  resetFilters() {
    /* ================= RESET FILTER VALUES ================= */
    this.startDate = '';
    this.endDate = '';
    this.fileType = 'csv';

    this.startDateError = '';
    this.endDateError = '';

    /* ================= RESET FILTERED DATA ================= */
    this.filteredData = [...this.TableRow];
    this.currentPage = 1;

    /* ================= RESET DATE INPUTS ================= */
    const startInput = document.getElementById('startDate') as HTMLInputElement;
    const endInput = document.getElementById('endDate') as HTMLInputElement;

    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';

    /* ================= RESET SELECTION ================= */
    this.selectedRows = [];

    this.showToast('Filters reset successfully', 'info');
  }

  // ---------------- Date Parser ----------------
  parseDDMMYYYY(dateStr?: string): Date | null {
    if (!dateStr) return null;

    const parts = dateStr.trim().split('-').map(Number);
    if (parts.length !== 3) return null;

    const [dd, mm, yyyy] = parts;
    const date = new Date(yyyy, mm - 1, dd);

    return isNaN(date.getTime()) ? null : date;
  }

  // ---------------- Bulk Export ----------------
  getFile() {
    /* ================= BASIC VALIDATION ================= */
    if (!this.TableRow || this.TableRow.length === 0) {
      this.showToast('No data available to export!', 'warning');
      return;
    }

    if (!this.startDate || !this.endDate) {
      this.showToast('Please enter both Start Date and End Date!', 'warning');
      return;
    }

    const start = this.parseDDMMYYYY(this.startDate);
    const end = this.parseDDMMYYYY(this.endDate);

    if (!start || !end) {
      this.showToast('Invalid date format. Use DD-MM-YYYY', 'error');
      return;
    }

    /* ================= FILTER BY DATE RANGE ================= */
    const filteredData: TableRow[] = this.TableRow.filter((row) => {
      if (!row.assetBoughtCreatedDate) return false;

      const rowDate = this.parseDDMMYYYY(row.assetBoughtCreatedDate);
      if (!rowDate) return false;

      return rowDate >= start && rowDate <= end;
    });

    if (filteredData.length === 0) {
      this.showToast('No records found for selected date range.', 'warning');
      return;
    }

    /* ================= EXPORT ================= */
    switch (this.fileType) {
      case 'csv':
        this.exportCSVfile(filteredData); // expects TableRow[]
        break;

      case 'xlsx':
        this.exportExcelfile(filteredData); // expects TableRow[]
        break;

      case 'pdf':
        this.exportPDFfile(filteredData); // expects TableRow[]
        break;

      default:
        this.showToast('Invalid file type selected!', 'error');
    }
  }

  // ---------------- CSV Export ----------------
  exportCSVfile(data: TableRow[]) {
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    const csvRows: string[] = [];

    /* ================= HEADER ================= */
    csvRows.push(this.companyName || 'AMC Asset Master');
    csvRows.push(`Date:,${formattedDate}`);
    csvRows.push('');

    /* ================= CSV COLUMNS ================= */
    const headers = [
      'Asset ID',
      'Asset Code',
      'Asset Category',
      'Asset Type',
      'Item Name',
      'Department',
      'Asset Status',
      'Purchase Date',
      'Bill / Invoice No',
      'Purchased By',
      'Record Status',
      'Remarks',
      'Created Date',
      'Updated Date',
    ];

    csvRows.push(headers.join(','));

    /* ================= DATA ROWS ================= */
    data.forEach((row: TableRow) => {
      const rowData = [
        row.assetBoughtMiscPurchaseId || '',
        row.assetBoughtMiscPurchaseCode || '',

        row.assetBoughtAssetCategory || '',
        row.assetBoughtAssetType || '',
        row.assetBoughtItemName || '',

        row.assetBoughtDepartment || '',

        row.assetBoughtAssetStatus || '',

        row.assetBoughtPurchaseDate || '',

        row.assetBoughtBillInvoiceNo || '',
        row.assetBoughtPurchasedBy || '',

        row.assetBoughtStatus || '',
        row.assetBoughtRemarks || '',

        row.assetBoughtCreatedDate || '',
        row.assetBoughtUpdatedDate || '',
      ];

      csvRows.push(
        rowData.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','),
      );
    });

    /* ================= DOWNLOAD ================= */
    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });

    saveAs(blob, 'Asset_Bought_Report.csv');
  }
  // ---------------- Excel Export ----------------
  exportExcelfile(data: TableRow[]) {
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    /* ================= EXCEL ROW DATA ================= */
    const wsData: any[][] = [
      [this.companyName || 'AMC Asset Master'],
      this.companyEmail ? ['Email:', this.companyEmail] : [],
      ['Date:', formattedDate],
      [],
      [
        'Asset ID',
        'Asset Code',
        'Asset Category',
        'Asset Type',
        'Item Name',
        'Department',
        'Asset Status',
        'Purchase Date',
        'Bill / Invoice No',
        'Purchased By',
        'Record Status',
        'Remarks',
        'Created Date',
        'Updated Date',
      ],
    ];

    /* ================= DATA ROWS ================= */
    data.forEach((row: TableRow) => {
      wsData.push([
        row.assetBoughtMiscPurchaseId || '',
        row.assetBoughtMiscPurchaseCode || '',

        row.assetBoughtAssetCategory || '',
        row.assetBoughtAssetType || '',
        row.assetBoughtItemName || '',

        row.assetBoughtDepartment || '',

        row.assetBoughtAssetStatus || '',

        row.assetBoughtPurchaseDate || '',

        row.assetBoughtBillInvoiceNo || '',
        row.assetBoughtPurchasedBy || '',

        row.assetBoughtStatus || '',
        row.assetBoughtRemarks || '',

        row.assetBoughtCreatedDate || '',
        row.assetBoughtUpdatedDate || '',
      ]);
    });

    /* ================= CREATE WORKSHEET ================= */
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    /* ================= COLUMN WIDTH ================= */
    worksheet['!cols'] = [
      { wch: 14 }, // Asset ID
      { wch: 18 }, // Asset Code
      { wch: 18 }, // Asset Category
      { wch: 18 }, // Asset Type
      { wch: 24 }, // Item Name
      { wch: 20 }, // Department
      { wch: 18 }, // Asset Status
      { wch: 18 }, // Purchase Date
      { wch: 22 }, // Bill / Invoice No
      { wch: 18 }, // Purchased By
      { wch: 18 }, // Record Status
      { wch: 26 }, // Remarks
      { wch: 18 }, // Created Date
      { wch: 18 }, // Updated Date
    ];

    /* ================= CREATE WORKBOOK ================= */
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset_Bought_Master');

    /* ================= DOWNLOAD ================= */
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream',
    });

    saveAs(blob, 'Asset_Bought_Report.xlsx');
  }
  // ---------------- PDF Export ----------------
  exportPDFfile(data: TableRow[]) {
    if (!data || data.length === 0) {
      this.showToast('No data available to export!', 'warning');
      return;
    }

    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    /* ================= HEADER TITLE ================= */
    const title = 'Asset Bought Master Report';

    doc.setFontSize(20);
    doc.setTextColor(0, 70, 140);
    doc.text(title, pageWidth / 2, 40, { align: 'center' });

    doc.setDrawColor(0, 70, 140);
    doc.setLineWidth(1);
    doc.line(
      pageWidth / 2 - doc.getTextWidth(title) / 2,
      45,
      pageWidth / 2 + doc.getTextWidth(title) / 2,
      45,
    );

    /* ================= SUB HEADER ================= */
    const topY = 70;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    doc.text(this.companyName || 'Asset Management', 40, topY);

    if (this.companyEmail) {
      doc.text(this.companyEmail, 40, topY + 14);
    }

    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 40, topY, {
      align: 'right',
    });

    /* ================= TABLE ================= */

    autoTable(doc, {
      startY: topY + 30,

      head: [
        [
          'Asset ID',
          'Asset Code',
          'Category',
          'Type',
          'Item Name',
          'Department',
          'Asset Status',
          'Purchase Date',
          'Invoice No',
          'Purchased By',
          'Record Status',
          'Created Date',
        ],
      ],

      body: data.map((row: TableRow) => [
        row.assetBoughtMiscPurchaseId || '',
        row.assetBoughtMiscPurchaseCode || '',

        row.assetBoughtAssetCategory || '',
        row.assetBoughtAssetType || '',
        row.assetBoughtItemName || '',

        row.assetBoughtDepartment || '',

        row.assetBoughtAssetStatus || '',

        row.assetBoughtPurchaseDate || '',

        row.assetBoughtBillInvoiceNo || '',

        row.assetBoughtPurchasedBy || '',

        row.assetBoughtStatus || '',

        row.assetBoughtCreatedDate || '',
      ]),

      theme: 'grid',
      tableWidth: 'auto',

      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: 'center',
        valign: 'middle',
      },

      headStyles: {
        fillColor: [0, 92, 179],
        textColor: 255,
        fontStyle: 'bold',
      },

      margin: { left: 20, right: 20 },
      pageBreak: 'auto',
    });

    /* ================= SAVE ================= */

    doc.save('Asset_Bought_Report.pdf');
  }
}
