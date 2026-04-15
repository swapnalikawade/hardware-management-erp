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

export interface TableRow {

  /* ========= PRIMARY ========= */
  purchaseId: string;
  purchaseNumber: string;

  /* ========= PURCHASE ========= */
  purchaseDate: string;        // YYYY-MM-DD
  vendorId: string;
  vendorName: string;

  invoiceNumber: string;
  invoiceDate: string;         // YYYY-MM-DD

  /* ========= ITEM ========= */
  itemName: string;
  itemCategory: string;
  itemDescription: string;

  /* ========= QUANTITY ========= */
  quantity: number;
  unitPrice: number;
  totalAmount: number;

  /* ========= LOCATION ========= */
  location: string;
  departmentId: string;

  /* ========= PURPOSE ========= */
  purpose: string;

  /* ========= APPROVAL ========= */
  requestedBy: string;
  approvedBy: string;
  approvalDate: string;        // YYYY-MM-DD

  /* ========= STOCK ========= */
  stockStatus: 'Active' | 'Inactive';  // 🔥 changed

  /* ========= REMARKS ========= */
  remarks?: string;

  /* ========= AUDIT ========= */
  createdBy: string;           // 🔥 loginId map
  createdDate: string;

  updatedBy?: string;
  updatedDate?: string;
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
      newRecord: {
        /* ========= PRIMARY ========= */
        purchaseId: '',                 // ✔ changed from '0'
        purchaseNumber: '',

        /* ========= PURCHASE ========= */
        purchaseDate: this.currentDate || '',
        vendorId: '',
        vendorName: '',

        invoiceNumber: '',
        invoiceDate: this.currentDate || '',

        /* ========= ITEM ========= */
        itemName: '',
        itemCategory: '',
        itemDescription: '',

        /* ========= QUANTITY ========= */
        quantity: 1,
        unitPrice: 0,
        totalAmount: 0,

        /* ========= LOCATION ========= */
        location: '',
        departmentId: '',

        /* ========= PURPOSE ========= */
        purpose: '',

        /* ========= APPROVAL ========= */
        requestedBy: '',
        approvedBy: '',
        approvalDate: this.currentDate || '',

        /* ========= STOCK ========= */
        stockStatus: 'Active',   // ✔ matches union type

        /* ========= REMARKS ========= */
        remarks: undefined,      // ✔ optional

        /* ========= AUDIT ========= */
        createdBy: this.loginId || '',
        createdDate: this.currentDate || '',

        updatedBy: undefined,    // ✔ optional
        updatedDate: undefined,  // ✔ optional
      },
    },
  ];
}

  get editHeading(): string {
    if (this.isEditMode && this.editIndex !== null) {
      return (
        'Update Asset Details (ID: ' +
        this.tableData[this.editIndex].purchaseId +
        ')'
      );
    }
    return '';
  }
loadAssetTypes(): void {
  if (!this.loginId) return;

  this.commonService.fetchAssetTypeByLoginId(this.loginId).subscribe({
    next: (res: any) => {
      console.log('Asset Type API RESPONSE:', res);

      this.assetTypes = res;   // ✅ FIXED
    },
    error: (err) => {
      console.error('API Error:', err);
    },
  });
}
loadAssetBoughts(): void {

  if (!this.loginId) {
    this.toast.danger('Login ID missing!', 'ERROR', 3000);
    return;
  }

  const formattedLoginId = this.loginId;

  this.commonService
    .fetchAllAssetBoughtByLoginId(formattedLoginId)
    .subscribe({

      next: (res: any) => {   // 🔥 IMPORTANT FIX

        console.log('API RESPONSE:', res);

        // 🔥 Ensure array
        const data = Array.isArray(res) ? res : [];

        if (data.length === 0) {
          this.tableData = [];
          this.filteredData = [];
          return;
        }

        this.tableData = data.map((item: any) => ({

          purchaseId: item.purchaseId ?? '',
          purchaseNumber: item.purchaseNumber ?? '',

          purchaseDate: item.purchaseDate ?? '',
          vendorId: item.vendorId ?? '',
          vendorName: item.vendorName ?? '',

          invoiceNumber: item.invoiceNumber ?? '',
          invoiceDate: item.invoiceDate ?? '',

          itemName: item.itemName ?? '',
          itemCategory: item.itemCategory ?? '',
          itemDescription: item.itemDescription ?? '',

          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          totalAmount: Number(item.totalAmount) || 0,

          location: item.location ?? '',
          departmentId: item.departmentId ?? '',

          purpose: item.purpose ?? '',

          requestedBy: item.requestedBy ?? '',
          approvedBy: item.approvedBy ?? '',
          approvalDate: item.approvalDate ?? '',

          stockStatus: item.stockStatus ?? 'Active',

          remarks: item.remarks ?? '',

          createdBy: item.createdBy ?? '',
          createdDate: item.createdDate ?? '',

          updatedBy: item.updatedBy ?? '',
          updatedDate: item.updatedDate ?? '',
        }));

        this.filteredData = [...this.tableData];
        this.currentPage = 1;

        this.cdr.detectChanges();
      },

      error: (err: any) => {
        console.error('API Error:', err);

        this.tableData = [];
        this.filteredData = [];

        this.toast.danger(
          err?.error?.message || 'Failed to load Asset Bought data!',
          'ERROR',
          4000
        );
      }
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

  assetTypes: any[] = [];



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
      (row) => row.purchaseId,
    );

    // 🔥 Single API call
    this.commonService.deleteMultipleAssetBought(ids).subscribe({
      next: () => {
        // remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.purchaseId),
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
    Purchase_ID: row.purchaseId,
    Purchase_Number: row.purchaseNumber,

    Purchase_Date: row.purchaseDate,
    Vendor_ID: row.vendorId,
    Vendor_Name: row.vendorName,

    Invoice_Number: row.invoiceNumber,
    Invoice_Date: row.invoiceDate,

    Item_Name: row.itemName,
    Item_Category: row.itemCategory,
    Item_Description: row.itemDescription,

    Quantity: row.quantity,
    Unit_Price: row.unitPrice,
    Total_Amount: row.totalAmount,

    Location: row.location,
    Department_ID: row.departmentId,

    Purpose: row.purpose,

    Requested_By: row.requestedBy,
    Approved_By: row.approvedBy,
    Approval_Date: row.approvalDate,

    Stock_Status: row.stockStatus,

    Remarks: row.remarks ?? '',

    Created_By: row.createdBy,
    Created_Date: row.createdDate,

    Updated_By: row.updatedBy ?? '',
    Updated_Date: row.updatedDate ?? '',
  }));

  // 📄 Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // 📐 Auto column width
  worksheet['!cols'] = Object.keys(exportData[0]).map(() => ({
    wch: 24,
  }));

  // 📘 Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase_Data');

  // ⬇ Download Excel (date-wise file name)
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Purchase_Data_${today}.xlsx`);

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
        <td class="title">Purchase Report</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>Purchase ID</th>
        <th>Purchase No</th>
        <th>Vendor</th>
        <th>Item</th>
        <th>Category</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Total</th>
        <th>Location</th>
        <th>Department</th>
        <th>Status</th>
        <th>Purchase Date</th>
        <th>Remarks</th>
      </tr>
  `;

  this.filteredData.forEach((row: TableRow) => {
    content += `
      <tr>
        <td>${row.purchaseId || ''}</td>
        <td>${row.purchaseNumber || ''}</td>
        <td>${row.vendorName || ''}</td>
        <td>${row.itemName || ''}</td>
        <td>${row.itemCategory || ''}</td>
        <td>${row.quantity ?? 0}</td>
        <td>${row.unitPrice ?? 0}</td>
        <td>${row.totalAmount ?? 0}</td>
        <td>${row.location || ''}</td>
        <td>${row.departmentId || ''}</td>
        <td>${row.stockStatus || ''}</td>
        <td>${row.purchaseDate || ''}</td>
        <td>${row.remarks ?? ''}</td>
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
  saveAs(blob, `Purchase_Report_${today}.doc`);

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
  doc.text('Purchase Report', pageWidth / 2, 12, { align: 'center' });

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
        'Purchase ID',
        'Purchase No',
        'Vendor',
        'Item',
        'Category',
        'Qty',
        'Unit Price',
        'Total',
        'Location',
        'Department',
        'Status',
        'Purchase Date',
        'Remarks',
      ],
    ],

    body: this.filteredData.map((row: TableRow) => [
      row.purchaseId || '',
      row.purchaseNumber || '',
      row.vendorName || '',
      row.itemName || '',
      row.itemCategory || '',
      row.quantity ?? 0,
      row.unitPrice ?? 0,
      row.totalAmount ?? 0,
      row.location || '',
      row.departmentId || '',
      row.stockStatus || '',
      row.purchaseDate || '',
      row.remarks ?? '',
    ]),

    didDrawCell: (data) => {
      // 🔲 Strong borders
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
    },
  });

  /* ================= SAVE ================= */
  const today = new Date().toISOString().split('T')[0];
  doc.save(`Purchase_Report_${today}.pdf`);
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
  /* ========= PRIMARY ========= */
  purchaseId: '0',
  purchaseNumber: '',

  /* ========= PURCHASE ========= */
  purchaseDate: this.getTodayDate(),
  vendorId: '',
  vendorName: '',

  invoiceNumber: '',
  invoiceDate: this.getTodayDate(),

  /* ========= ITEM ========= */
  itemName: '',
  itemCategory: 'IT',
  itemDescription: '',

  /* ========= QUANTITY ========= */
  quantity: 1,
  unitPrice: 0,
  totalAmount: 0,

  /* ========= LOCATION ========= */
  location: '',
  departmentId: '',

  /* ========= PURPOSE ========= */
  purpose: '',

  /* ========= APPROVAL ========= */
  requestedBy: '',
  approvedBy: '',
  approvalDate: this.getTodayDate(),

  /* ========= STOCK ========= */
  stockStatus: 'Active',

  /* ========= REMARKS ========= */
  remarks: '',

  /* ========= AUDIT ========= */
  createdBy: this.loginId || '',
  createdDate: this.getTodayDate(),

  updatedBy: '',
  updatedDate: ''
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
    newRecord: <TableRow>{
      /* ========= PRIMARY ========= */
      purchaseId: '0',
      purchaseNumber: '',

      /* ========= PURCHASE ========= */
      purchaseDate: currentDate,
      vendorId: '',
      vendorName: '',

      invoiceNumber: '',
      invoiceDate: currentDate,

      /* ========= ITEM ========= */
      itemName: '',
      itemCategory: 'IT',
      itemDescription: '',

      /* ========= QUANTITY ========= */
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,

      /* ========= LOCATION ========= */
      location: '',
      departmentId: '',

      /* ========= PURPOSE ========= */
      purpose: '',

      /* ========= APPROVAL ========= */
      requestedBy: '',
      approvedBy: '',
      approvalDate: currentDate,

      /* ========= STOCK ========= */
      stockStatus: 'Active',

      /* ========= REMARKS ========= */
      remarks: '',

      /* ========= AUDIT ========= */
      createdBy: this.loginId || '',
      createdDate: currentDate,

      updatedBy: '',
      updatedDate: ''
    }
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
      !f.newRecord.purchaseNumber?.trim() ||
      !f.newRecord.itemCategory ||
      !f.newRecord.itemName?.trim() ||
      !f.newRecord.vendorName?.trim() ||
      !f.newRecord.departmentId?.trim() ||
      !f.newRecord.purchaseDate ||
      !f.newRecord.invoiceNumber?.trim() ||
      !this.loginId ||   // 🔥 FIX (createdBy remove करून loginId वापर)
      !f.newRecord.stockStatus
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
      purchaseNumber: form.purchaseNumber,

      purchaseDate: form.purchaseDate,
      vendorId: form.vendorId,
      vendorName: form.vendorName,

      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,

      itemName: form.itemName,
      itemCategory: form.itemCategory,
      itemDescription: form.itemDescription,

      quantity: form.quantity,
      unitPrice: form.unitPrice,
      totalAmount: form.quantity * form.unitPrice,

      location: form.location,
      departmentId: form.departmentId,

      purpose: form.purpose,

      requestedBy: form.requestedBy,
      approvedBy: form.approvedBy,
      approvalDate: form.approvalDate,

      stockStatus: form.stockStatus,

      remarks: form.remarks,

      createdBy: this.loginId,
      updatedBy: this.loginId,
      updatedDate: new Date().toISOString().split('T')[0],
    };

    /* 🔥 SAFE FIX (IMPORTANT) */
    const purchaseId = this.tableData[this.editIndex]?.purchaseId;

    console.log("EDIT purchaseId:", purchaseId);

    if (!purchaseId || !purchaseId.includes('/')) {
      this.toast.danger("Invalid Purchase ID!", "ERROR", 3000);
      return;
    }


    this.commonService
      .updateAssetBought(purchaseId, payload)
      .subscribe({
        next: () => {
          this.toast.success('Record Updated Successfully!', 'SUCCESS', 4000);
          this.resetAfterSave();
          this.loadAssetBoughts();
        },
        error: () => {
          this.toast.danger('Update failed. Service unavailable!', 'ERROR', 4000);
        },
      });

    return;
  }

  /* ---------------- ADD MODE ---------------- */

  const payload = this.forms.map((f) => ({
    purchaseNumber: f.newRecord.purchaseNumber,

    purchaseDate: f.newRecord.purchaseDate,
    vendorId: f.newRecord.vendorId,
    vendorName: f.newRecord.vendorName,

    invoiceNumber: f.newRecord.invoiceNumber,
    invoiceDate: f.newRecord.invoiceDate,

    itemName: f.newRecord.itemName,
    itemCategory: f.newRecord.itemCategory,
    itemDescription: f.newRecord.itemDescription,

    quantity: f.newRecord.quantity,
    unitPrice: f.newRecord.unitPrice,
    totalAmount: f.newRecord.quantity * f.newRecord.unitPrice,

    location: f.newRecord.location,
    departmentId: f.newRecord.departmentId,

    purpose: f.newRecord.purpose,

    requestedBy: f.newRecord.requestedBy,
    approvedBy: f.newRecord.approvedBy,
    approvalDate: f.newRecord.approvalDate,

    stockStatus: f.newRecord.stockStatus,

    remarks: f.newRecord.remarks,

    createdBy: this.loginId,
    createdDate: new Date().toISOString().split('T')[0],
  }));

 this.commonService.saveAllAssetBought(payload).subscribe({
    next: (res: any) => {

      if (res?.dublicateMessages?.length) {
        res.dublicateMessages.forEach((msg: string) =>
          this.toast.warning(msg, 'WARNING', 4000)
        );
      }

      this.toast.success('Record Added Successfully!', 'SUCCESS', 4000);

      this.resetAfterSave();
      this.loadAssetBoughts();
    },

    error: () => {
      this.toast.danger('Save failed. Service down!', 'ERROR', 4000);
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
          assetBoughtPurchaseDate: row.purchaseDate?.split('T')[0],
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
      case 'purchase id':
        return 'purchaseId';

      case 'purchase number':
      case 'purchase no':
        return 'purchaseNumber';

      case 'vendor':
      case 'vendor name':
        return 'vendorName';

      case 'vendor id':
        return 'vendorId';

      case 'invoice number':
      case 'invoice no':
        return 'invoiceNumber';

      case 'invoice date':
        return 'invoiceDate';

      case 'item name':
        return 'itemName';

      case 'category':
        return 'itemCategory';

      case 'description':
        return 'itemDescription';

      case 'quantity':
        return 'quantity';

      case 'unit price':
        return 'unitPrice';

      case 'total':
      case 'total amount':
        return 'totalAmount';

      case 'location':
        return 'location';

      case 'department':
        return 'departmentId';

      case 'purpose':
        return 'purpose';

      case 'requested by':
        return 'requestedBy';

      case 'approved by':
        return 'approvedBy';

      case 'approval date':
        return 'approvalDate';

      case 'status':
      case 'stock status':
        return 'stockStatus';

      case 'remarks':
        return 'remarks';

      case 'created by':
        return 'createdBy';

      case 'created date':
        return 'createdDate';

      case 'updated by':
        return 'updatedBy';

      case 'updated date':
        return 'updatedDate';

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

    const newId =
      obj['purchaseId'] ||
      `PUR-${String(this.tableData.length + results.length + 1).padStart(3, '0')}`;

    const quantity = Number(obj['quantity'] || 0);
    const unitPrice = Number(obj['unitPrice'] || 0);

    const newRecord: TableRow = {
      /* ========= PRIMARY ========= */
      purchaseId: newId,
      purchaseNumber: obj['purchaseNumber'] || '',

      /* ========= PURCHASE ========= */
      purchaseDate: obj['purchaseDate'] || this.getTodayDate(),
      vendorId: obj['vendorId'] || '',
      vendorName: obj['vendorName'] || '',

      invoiceNumber: obj['invoiceNumber'] || '',
      invoiceDate: obj['invoiceDate'] || this.getTodayDate(),

      /* ========= ITEM ========= */
      itemName: obj['itemName'] || '',
      itemCategory: obj['itemCategory'] || 'IT',
      itemDescription: obj['itemDescription'] || '',

      /* ========= QUANTITY ========= */
      quantity: quantity,
      unitPrice: unitPrice,
      totalAmount: quantity * unitPrice, // 🔥 auto calc

      /* ========= LOCATION ========= */
      location: obj['location'] || '',
      departmentId: obj['departmentId'] || '',

      /* ========= PURPOSE ========= */
      purpose: obj['purpose'] || '',

      /* ========= APPROVAL ========= */
      requestedBy: obj['requestedBy'] || '',
      approvedBy: obj['approvedBy'] || '',
      approvalDate: obj['approvalDate'] || this.getTodayDate(),

      /* ========= STOCK ========= */
      stockStatus:
        (obj['stockStatus'] as 'Active' | 'Inactive') || 'Active',

      /* ========= REMARKS ========= */
      remarks: obj['remarks'] || '',

      /* ========= AUDIT ========= */
      createdBy: obj['createdBy'] || this.loginId || '',
      createdDate: obj['createdDate'] || this.getTodayDate(),

      updatedBy: obj['updatedBy'] || '',
      updatedDate: obj['updatedDate'] || '',
    };

    results.push(newRecord);
  }

  /* ================= MERGE DATA ================= */
  this.tableData = [...this.tableData, ...results];
  this.filteredData = [...this.tableData];
  this.currentPage = 1;

  this.cdr.detectChanges();
  this.showToast('Purchase CSV imported successfully!', 'success');
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
      const newId =
        obj['Purchase ID'] ||
        `PUR-${String(this.tableData.length + i + 1).padStart(3, '0')}`;

      const quantity = Number(obj['Quantity'] || 0);
      const unitPrice = Number(obj['Unit Price'] || 0);

      const newRecord: TableRow = {
        /* ========= PRIMARY ========= */
        purchaseId: newId,
        purchaseNumber: obj['Purchase Number'] || '',

        /* ========= PURCHASE ========= */
        purchaseDate: obj['Purchase Date'] || this.getTodayDate(),
        vendorId: obj['Vendor ID'] || '',
        vendorName: obj['Vendor Name'] || '',

        invoiceNumber: obj['Invoice Number'] || '',
        invoiceDate: obj['Invoice Date'] || this.getTodayDate(),

        /* ========= ITEM ========= */
        itemName: obj['Item Name'] || '',
        itemCategory: obj['Category'] || 'IT',
        itemDescription: obj['Description'] || '',

        /* ========= QUANTITY ========= */
        quantity: quantity,
        unitPrice: unitPrice,
        totalAmount: quantity * unitPrice, // 🔥 auto calc

        /* ========= LOCATION ========= */
        location: obj['Location'] || '',
        departmentId: obj['Department'] || '',

        /* ========= PURPOSE ========= */
        purpose: obj['Purpose'] || '',

        /* ========= APPROVAL ========= */
        requestedBy: obj['Requested By'] || '',
        approvedBy: obj['Approved By'] || '',
        approvalDate: obj['Approval Date'] || this.getTodayDate(),

        /* ========= STOCK ========= */
        stockStatus:
          (obj['Stock Status'] as 'Active' | 'Inactive') || 'Active',

        /* ========= REMARKS ========= */
        remarks: obj['Remarks'] || '',

        /* ========= AUDIT ========= */
        createdBy: obj['Created By'] || this.loginId || '',
        createdDate: obj['Created Date'] || this.getTodayDate(),

        updatedBy: obj['Updated By'] || '',
        updatedDate: obj['Updated Date'] || '',
      };

      this.tableData.push(newRecord);
    });

    /* ================= REFRESH VIEW ================= */
    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();
    this.showToast('Purchase Excel imported successfully!', 'success');
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

      // Ensure minimum columns (15)
      while (cols.length < 15) cols.push('');

      const newId =
        cols[0] ||
        `PUR-${String(this.tableData.length + idx + 1).padStart(3, '0')}`;

      const quantity = Number(cols[5] || 0);
      const unitPrice = Number(cols[6] || 0);

      const newRecord: TableRow = {
        /* ========= PRIMARY ========= */
        purchaseId: newId,
        purchaseNumber: cols[1] || '',

        /* ========= PURCHASE ========= */
        purchaseDate: cols[2] || this.getTodayDate(),
        vendorId: cols[3] || '',
        vendorName: cols[4] || '',

        invoiceNumber: cols[7] || '',
        invoiceDate: cols[8] || this.getTodayDate(),

        /* ========= ITEM ========= */
        itemName: cols[9] || '',
        itemCategory: cols[10] || 'IT',
        itemDescription: cols[11] || '',

        /* ========= QUANTITY ========= */
        quantity: quantity,
        unitPrice: unitPrice,
        totalAmount: quantity * unitPrice, // 🔥 auto calc

        /* ========= LOCATION ========= */
        location: cols[12] || '',
        departmentId: cols[13] || '',

        /* ========= PURPOSE ========= */
        purpose: cols[14] || '',

        /* ========= APPROVAL ========= */
        requestedBy: '',
        approvedBy: '',
        approvalDate: this.getTodayDate(),

        /* ========= STOCK ========= */
        stockStatus:
          (cols[15] === 'Inactive' ? 'Inactive' : 'Active') as
            | 'Active'
            | 'Inactive',

        /* ========= REMARKS ========= */
        remarks: cols[16] || '',

        /* ========= AUDIT ========= */
        createdBy: this.loginId || '',
        createdDate: this.getTodayDate(),

        updatedBy: '',
        updatedDate: '',
      };

      this.tableData.push(newRecord);
    });

    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();
    this.showToast('Purchase TXT imported successfully!', 'success');
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
        (cell) => cell.textContent?.trim() || ''
      );

      // Ensure minimum columns (15)
      while (cells.length < 15) cells.push('');

      const newId =
        cells[0] ||
        `PUR-${String(this.tableData.length + rowIndex).padStart(3, '0')}`;

      const quantity = Number(cells[5] || 0);
      const unitPrice = Number(cells[6] || 0);

      const newRecord: TableRow = {
        /* ========= PRIMARY ========= */
        purchaseId: newId,
        purchaseNumber: cells[1] || '',

        /* ========= PURCHASE ========= */
        purchaseDate: cells[2] || this.getTodayDate(),
        vendorId: cells[3] || '',
        vendorName: cells[4] || '',

        invoiceNumber: cells[7] || '',
        invoiceDate: cells[8] || this.getTodayDate(),

        /* ========= ITEM ========= */
        itemName: cells[9] || '',
        itemCategory: cells[10] || 'IT',
        itemDescription: cells[11] || '',

        /* ========= QUANTITY ========= */
        quantity: quantity,
        unitPrice: unitPrice,
        totalAmount: quantity * unitPrice, // 🔥 auto calc

        /* ========= LOCATION ========= */
        location: cells[12] || '',
        departmentId: cells[13] || '',

        /* ========= PURPOSE ========= */
        purpose: cells[14] || '',

        /* ========= APPROVAL ========= */
        requestedBy: '',
        approvedBy: '',
        approvalDate: this.getTodayDate(),

        /* ========= STOCK ========= */
        stockStatus:
          (cells[15] === 'Inactive' ? 'Inactive' : 'Active') as
            | 'Active'
            | 'Inactive',

        /* ========= REMARKS ========= */
        remarks: cells[16] || '',

        /* ========= AUDIT ========= */
        createdBy: this.loginId || '',
        createdDate: this.getTodayDate(),

        updatedBy: '',
        updatedDate: '',
      };

      this.tableData.push(newRecord);
    });

    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();
    this.showToast('Purchase DOCX imported successfully!', 'success');
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
    'Purchase ID',
    'Purchase Number',
    'Purchase Date',
    'Vendor ID',
    'Vendor Name',
    'Quantity',
    'Unit Price',
    'Invoice Number',
    'Invoice Date',
    'Item Name',
    'Category',
    'Description',
    'Location',
    'Department',
    'Purpose',
    'Stock Status',
    'Remarks',
  ];

  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.join(','));

  /* ================= SAMPLE DATA ROW ================= */
  const sampleRow = [
    'PUR-001',
    'PUR-IT-001',
    this.getTodayDate(),
    'V001',
    'Dell Supplier',
    '2',
    '55000',
    'INV-001',
    this.getTodayDate(),
    'Dell Laptop',
    'IT',
    'Business Laptop',
    'Pune Office',
    'IT',
    'Office Use',
    'Active',
    'Sample purchase record',
  ];

  csvRows.push(
    sampleRow.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
  );

  /* ================= DOWNLOAD ================= */
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'Purchase_Sample.csv';
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
      if (!row.createdDate) return false;

      const rowDate = this.parseDDMMYYYY(row.createdDate);
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
  csvRows.push(this.companyName || 'Purchase Report');
  csvRows.push(`Date:,${formattedDate}`);
  csvRows.push('');

  /* ================= CSV COLUMNS ================= */
  const headers = [
    'Purchase ID',
    'Purchase Number',
    'Purchase Date',
    'Vendor ID',
    'Vendor Name',
    'Quantity',
    'Unit Price',
    'Total Amount',
    'Invoice Number',
    'Invoice Date',
    'Item Name',
    'Category',
    'Description',
    'Location',
    'Department',
    'Purpose',
    'Stock Status',
    'Remarks',
    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date',
  ];

  csvRows.push(headers.join(','));

  /* ================= DATA ROWS ================= */
  data.forEach((row: TableRow) => {
    const rowData = [
      row.purchaseId || '',
      row.purchaseNumber || '',

      row.purchaseDate || '',
      row.vendorId || '',
      row.vendorName || '',

      row.quantity ?? 0,
      row.unitPrice ?? 0,
      row.totalAmount ?? 0,

      row.invoiceNumber || '',
      row.invoiceDate || '',

      row.itemName || '',
      row.itemCategory || '',
      row.itemDescription || '',

      row.location || '',
      row.departmentId || '',

      row.purpose || '',

      row.stockStatus || '',
      row.remarks ?? '',

      row.createdBy || '',
      row.createdDate || '',

      row.updatedBy ?? '',
      row.updatedDate ?? '',
    ];

    csvRows.push(
      rowData.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
  });

  /* ================= DOWNLOAD ================= */
  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Purchase_Report.csv');
}
  // ---------------- Excel Export ----------------
exportExcelfile(data: TableRow[]) {
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  /* ================= EXCEL ROW DATA ================= */
  const wsData: any[][] = [
    [this.companyName || 'Purchase Report'],
    this.companyEmail ? ['Email:', this.companyEmail] : [],
    ['Date:', formattedDate],
    [],
    [
      'Purchase ID',
      'Purchase Number',
      'Purchase Date',
      'Vendor ID',
      'Vendor Name',
      'Quantity',
      'Unit Price',
      'Total Amount',
      'Invoice Number',
      'Invoice Date',
      'Item Name',
      'Category',
      'Description',
      'Location',
      'Department',
      'Purpose',
      'Stock Status',
      'Remarks',
      'Created By',
      'Created Date',
      'Updated By',
      'Updated Date',
    ],
  ];

  /* ================= DATA ROWS ================= */
  data.forEach((row: TableRow) => {
    wsData.push([
      row.purchaseId || '',
      row.purchaseNumber || '',

      row.purchaseDate || '',
      row.vendorId || '',
      row.vendorName || '',

      row.quantity ?? 0,
      row.unitPrice ?? 0,
      row.totalAmount ?? 0,

      row.invoiceNumber || '',
      row.invoiceDate || '',

      row.itemName || '',
      row.itemCategory || '',
      row.itemDescription || '',

      row.location || '',
      row.departmentId || '',

      row.purpose || '',

      row.stockStatus || '',
      row.remarks ?? '',

      row.createdBy || '',
      row.createdDate || '',

      row.updatedBy ?? '',
      row.updatedDate ?? '',
    ]);
  });

  /* ================= CREATE WORKSHEET ================= */
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  /* ================= COLUMN WIDTH ================= */
  worksheet['!cols'] = [
    { wch: 14 }, // Purchase ID
    { wch: 18 }, // Purchase Number
    { wch: 18 }, // Purchase Date
    { wch: 14 }, // Vendor ID
    { wch: 22 }, // Vendor Name
    { wch: 10 }, // Quantity
    { wch: 12 }, // Unit Price
    { wch: 14 }, // Total Amount
    { wch: 18 }, // Invoice Number
    { wch: 18 }, // Invoice Date
    { wch: 24 }, // Item Name
    { wch: 18 }, // Category
    { wch: 26 }, // Description
    { wch: 18 }, // Location
    { wch: 18 }, // Department
    { wch: 18 }, // Purpose
    { wch: 14 }, // Stock Status
    { wch: 26 }, // Remarks
    { wch: 18 }, // Created By
    { wch: 18 }, // Created Date
    { wch: 18 }, // Updated By
    { wch: 18 }, // Updated Date
  ];

  /* ================= CREATE WORKBOOK ================= */
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase_Master');

  /* ================= DOWNLOAD ================= */
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Purchase_Report.xlsx');
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
  const title = 'Purchase Report';

  doc.setFontSize(20);
  doc.setTextColor(0, 70, 140);
  doc.text(title, pageWidth / 2, 40, { align: 'center' });

  doc.setDrawColor(0, 70, 140);
  doc.setLineWidth(1);
  doc.line(
    pageWidth / 2 - doc.getTextWidth(title) / 2,
    45,
    pageWidth / 2 + doc.getTextWidth(title) / 2,
    45
  );

  /* ================= SUB HEADER ================= */
  const topY = 70;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.text(this.companyName || 'Purchase Management', 40, topY);

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
        'Purchase ID',
        'Purchase No',
        'Vendor',
        'Item',
        'Category',
        'Qty',
        'Unit Price',
        'Total',
        'Department',
        'Status',
        'Purchase Date',
        'Created Date',
      ],
    ],

    body: data.map((row: TableRow) => [
      row.purchaseId || '',
      row.purchaseNumber || '',

      row.vendorName || '',
      row.itemName || '',
      row.itemCategory || '',

      row.quantity ?? 0,
      row.unitPrice ?? 0,
      row.totalAmount ?? 0,

      row.departmentId || '',
      row.stockStatus || '',

      row.purchaseDate || '',
      row.createdDate || '',
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
  doc.save('Purchase_Report.pdf');
}
}
