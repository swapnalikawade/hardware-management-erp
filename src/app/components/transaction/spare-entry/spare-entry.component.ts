/*
 **************************************************************************************
 * Program Name  : SpareEntryComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 10, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Spare Entry module.
 *
 * Description   : This component manages Spare Entry operations including:
 *                 - Fetch all spare entries based on Login ID
 *                 - Add single/multiple spare entries
 *                 - Update existing spare entries
 *                 - Delete single/multiple spare entries
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (Excel, TXT, DOCX, PDF)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling (multiple records)
 *   - Validation for mandatory fields
 *   - Auto calculation (Total Cost, Stock After Entry)
 *   - File parsing using XLSX, Mammoth, pdfjs
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *
 * Endpoints Used:
 *   - GET    /spare-entry/getAllSpareEntryByLoginId/{prefix}/{year}/{code}
 *   - GET    /spare-entry/single/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /spare-entry/saveAll
 *   - PUT    /spare-entry/update/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /spare-entry/delete-multiple-spareEntry
 *   - POST   /spare-entry/import
 *
 * Called From   : Spare Entry UI (Frontend)
 * Calls To      : CommonService (HTTP APIs)
 *
 * Dependencies  :
 *   - Angular Forms (NgForm)
 *   - XLSX (Excel handling)
 *   - jsPDF (PDF generation)
 *   - pdfjs-dist (PDF reading)
 *   - Mammoth (DOCX reading)
 *   - FileSaver (File download)
 *   - ng-angular-popup (Toast messages)
 *
 **************************************************************************************
 */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// pdf-reader.component.ts
import * as pdfjsLib from 'pdfjs-dist';
import autoTable from 'jspdf-autotable';
import * as mammoth from 'mammoth';
import { Router } from '@angular/router';
import { NgToastService } from 'ng-angular-popup';
import { AuthService } from '../../../services/auth/auth-service';
import { CommonService } from '../../../services/common/common-service';
import { CommonModule } from '@angular/common';
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'node_modules/pdfjs-dist/build/pdf.worker.min.js';
 interface TableRow {

  spareEntryId: string;
  spareEntryNumber: string;

  entryDate: string;

  callLoggingId: string;
  assetId: string;

  sparePartId: string;
  sparePartName: string;
  sparePartCode: string;

  category: string;

  quantity: number;
  unitPrice: number;
  totalCost: number;

  vendorName: string;
  purchaseReferenceNo: string;

  spareType: string;
  replacementType: string;

  engineerName: string;
  replacementDate: string;

  spareStatus: 'Active' | 'Inactive';

  remarks: string;

  createdBy: string;
  createdDate?: string;

  updatedBy?: string;
  updatedDate?: string;
}
@Component({
  selector: 'app-spare-entry',
  standalone: false,
  templateUrl: './spare-entry.component.html',
  styleUrl: './spare-entry.component.css',
})
export class SpareEntryComponent implements OnInit {
  activeTab = 'details';
  // session variable
  token: string | null = null;
  userName: any | null = null;
  loginId: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
  headCompanyName: any | null = null;
  today = new Date();
  forms: any[] = [];
  assetTypes: any[] = [];
  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;
  department: any[] = [];
  asset: any[] = [];
  assetType: any[] = [];
  loading: any = false;
  departmentList: any[] = [];
  assetList: any[] = [];
  assetTypeList: any[] = [];
  tableData: TableRow[] = [];
  spare: any[] = [];
  callList: any[] = [];
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
    // 🔥 MUST ADD THESE
    this.loadDepartments();
    this.loadAssets();
    this.loadAssetTypes();
    this.loadSpareEntry();
    this.loadCallList();

    this.filteredData = [...this.tableData];
  }

private initializeForm(): void {

  this.forms = [
    {
      spareEntryId: '',
      spareEntryNumber: '',

      entryDate: this.currentDate || '',

      callLoggingId: '',
      assetId: '',

      sparePartId: '',
      sparePartName: '',
      sparePartCode: '',

      category: '',

      quantity: 0,
      unitPrice: 0,
      totalCost: 0,

      vendorName: '',
      purchaseReferenceNo: '',

      spareType: '',
      replacementType: '',

      engineerName: '',
      replacementDate: '',

      spareStatus: 'Active',

      remarks: '',

      createdBy: this.loginId || '',
      createdDate: this.currentDate || '',

      updatedBy: '',
      updatedDate: '',

      // 🔥 IMPORTANT (FORM BINDING)
      newRecord: {
        spareEntryId: '',
        spareEntryNumber: '',

        entryDate: this.currentDate || '',

        callLoggingId: '',
        assetId: '',

        sparePartId: '',
        sparePartName: '',
        sparePartCode: '',

        category: '',

        quantity: 0,
        unitPrice: 0,
        totalCost: 0,

        vendorName: '',
        purchaseReferenceNo: '',

        spareType: '',
        replacementType: '',

        engineerName: '',
        replacementDate: '',

        spareStatus: 'Active',

        remarks: '',

        createdBy: this.loginId || '',
        createdDate: this.currentDate || '',

        updatedBy: '',
        updatedDate: ''
      }
    }
  ];
}
  spareCategoryList = ['Electrical', 'Mechanical', 'IT', 'Hardware'];
  loadDepartments(): void {
    this.commonService.fetchAllDepartmentByCompany(this.loginId).subscribe({
      next: (res: any[]) => {
        this.departmentList = res;
        console.log('Department Loaded:', res);
      },
      error: (err) => console.error('Department Error:', err),
    });
  }
  loadAssets(): void {
    this.commonService.fetchAssetByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        console.log('RAW ASSET RESPONSE:', res);

        this.assetList = res.data || res || [];

        console.log('FINAL ASSET LIST:', this.assetList);
      },
      error: (err) => console.error('ASSET ERROR:', err),
    });
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
  get editHeading(): string {
    if (this.isEditMode && this.editIndex !== null) {
      return (
        'Update Spare Entry Details (ID: ' +
        this.tableData[this.editIndex].spareEntryId +
        ')'
      );
    }
    return '';
  }

  loadCallList(): void {
    if (!this.loginId) {
      console.warn('Login ID missing');
      return;
    }

    this.commonService.fetchAllCallLoggingByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        this.callList = res.data || res || [];
        console.log('CALL LIST:', this.callList);
      },
      error: () => {
        this.callList = [];
      },
    });
  }
  loadSpareEntry(): void {
    if (!this.loginId) return;

    this.commonService.fetchAllSpareEntryByCompany(this.loginId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || [];

        this.tableData = data;

        this.filteredData = [...this.tableData];

        // ❌ REMOVE THIS LINE
        // this.forms = data.map(...)
      },
      error: (err) => {
        console.error('Load Spare Entry Error:', err);
      },
    });
  }
  onSpareChange(spareName: string, index: number) {
    const selectedSpare = this.spare.find((s: any) => s.name === spareName);

    if (selectedSpare) {
      const form = this.forms[index];

      form.spareEntryCompatibleAssetType = selectedSpare.assetTypeName || '';
      form.spareEntryunit = selectedSpare.unit || '';
      form.spareEntryunitCost = selectedSpare.unitCost || 0;
      form.spareEntrystockAvailable = selectedSpare.stock || 0;

      this.calculateTotal();
    }
  }
  tabs = [
    { key: 'details', label: 'Details', icon: 'bi bi-building-fill' },
    { key: 'newRecord', label: 'New Record', icon: 'bi bi-plus-circle-fill' },
    {
      key: 'bulkImport',
      label: 'Bulk Import',
      icon: 'bi bi-file-earmark-arrow-up-fill',
    },
    {
      key: 'bulkExport',
      label: 'Bulk Export',
      icon: 'bi bi-file-earmark-arrow-down-fill',
    },
    { key: 'help', label: 'Help', icon: 'bi bi-question-circle-fill' },
  ];
  calculateTotal() {
    const r = this.forms[0]; // ✅ FIX

    r.spareEntrytotalCost =
      (r.spareEntryquantityUsed || 0) * (r.spareEntryunitCost || 0);

    r.spareEntrystockAfterEntry =
      (r.spareEntrystockAvailable || 0) - (r.spareEntryquantityUsed || 0);
  }

  toastMessage: string | null = null;
  toastType: string = 'success';

  showToast(message: string, type: string = 'success') {
    this.toastMessage = message;
    this.toastType = type;

    setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
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

  applyFilter(event: any) {
    this.searchText = event.target.value.toLowerCase().trim();

    // Filter = tableData वरून
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
  toggleRowSelection(row: any, event: any) {
    if (event.target.checked) {
      this.selectedRows.push(row);
    } else {
      this.selectedRows = this.selectedRows.filter((r) => r !== row);
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

    // 🔥 Collect spareEntryIds
    const ids: string[] = this.selectedRows.map((row) => row.spareEntryId);

    // 🔥 Single API call
    this.commonService.deleteMultipleSpareEntry(ids).subscribe({
      next: () => {
        // remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.spareEntryId),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];
        this.currentPage = 1;

        // reload data
        this.loadSpareEntry();

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
  wsData.push([this.loginId || 'Company Name']);

  // ⭐ Row 2 → Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  // Empty Row
  wsData.push([]);

  // ⭐ Header (NEW CLEAN)
  wsData.push([
    'Spare Entry ID',
    'Spare Entry Number',
    'Entry Date',
    'Call Logging ID',
    'Asset ID',
    'Spare Part ID',
    'Spare Part Name',
    'Spare Part Code',
    'Category',
    'Quantity',
    'Unit Price',
    'Total Cost',
    'Vendor Name',
    'Purchase Ref No',
    'Spare Type',
    'Replacement Type',
    'Engineer Name',
    'Replacement Date',
    'Status',
    'Remarks',
    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date'
  ]);

  // ⭐ Rows
  this.tableData.forEach((row) => {
    wsData.push([
      row.spareEntryId,
      row.spareEntryNumber,
      row.entryDate,
      row.callLoggingId,
      row.assetId,

      row.sparePartId,
      row.sparePartName,
      row.sparePartCode,

      row.category,

      row.quantity,
      row.unitPrice,
      row.totalCost,

      row.vendorName,
      row.purchaseReferenceNo,

      row.spareType,
      row.replacementType,

      row.engineerName,
      row.replacementDate,

      row.spareStatus,

      row.remarks,

      row.createdBy,
      row.createdDate,

      row.updatedBy,
      row.updatedDate
    ]);
  });

  // ⭐ Create worksheet
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // ⭐ Column width (auto professional)
  worksheet['!cols'] = new Array(24).fill({ wch: 20 });

  // ⭐ Workbook
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Spare Entry');

  // ⭐ Export
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Spare_Entry_Report.xlsx');
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
          text-align: center;
          font-size: 24px;
          color: #00468c;
          margin-bottom: 10px;
          font-weight: bold;
          text-decoration: underline;
        }

        .header-info {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #0066cc;
          color: white;
          padding: 6px;
          font-size: 11px;
          border: 1px solid #000;
        }

        td {
          padding: 6px;
          font-size: 11px;
          border: 1px solid #000;
          text-align: center;
        }

        .status-active { color: green; font-weight: bold; }
        .status-inactive { color: red; font-weight: bold; }
      </style>
    </head>

    <body>

      <h2>Spare Entry Report</h2>

      <div class="header-info">
        <div><b>User:</b> ${this.loginId}</div>
        <div><b>Date:</b> ${formattedDate}</div>
      </div>

      <table>
        <tr>
          <th>ID</th>
          <th>Number</th>
          <th>Date</th>
          <th>Call ID</th>
          <th>Asset</th>
          <th>Spare Name</th>
          <th>Category</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
          <th>Vendor</th>
          <th>Type</th>
          <th>Engineer</th>
          <th>Status</th>
          <th>Created</th>
          <th>Updated</th>
        </tr>
  `;

  this.tableData.forEach((row) => {

    const statusClass =
      row.spareStatus === 'Active'
        ? 'status-active'
        : 'status-inactive';

    const statusIcon =
      row.spareStatus === 'Active' ? '✔️' : '❌';

    content += `
      <tr>
        <td>${row.spareEntryId}</td>
        <td>${row.spareEntryNumber}</td>
        <td>${row.entryDate}</td>
        <td>${row.callLoggingId}</td>
        <td>${row.assetId}</td>

        <td>${row.sparePartName}</td>
        <td>${row.category}</td>

        <td>${row.quantity}</td>
        <td>${row.unitPrice}</td>
        <td>${row.totalCost}</td>

        <td>${row.vendorName}</td>
        <td>${row.spareType}</td>

        <td>${row.engineerName}</td>

        <td class="${statusClass}">${statusIcon} ${row.spareStatus}</td>

        <td>${row.createdDate || ''}</td>
        <td>${row.updatedDate || ''}</td>
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

  saveAs(blob, 'Spare_Entry_Report.doc');
}

exportPDF() {
  const doc = new jsPDF('l', 'pt', 'a4');

  // ⭐ TITLE
  doc.setFontSize(20);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const title = 'Spare Entry Report';

  doc.text(title, pageWidth / 2, 40, { align: 'center' });

  const titleWidth = doc.getTextWidth(title);
  doc.line(
    pageWidth / 2 - titleWidth / 2,
    45,
    pageWidth / 2 + titleWidth / 2,
    45
  );

  // ⭐ HEADER
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  const company = this.loginId || 'Company Name';
  const dateStr = new Date().toLocaleDateString();

  doc.text(`User: ${company}`, 40, 70);
  doc.text(`Date: ${dateStr}`, pageWidth - 40, 70, { align: 'right' });

  // ⭐ TABLE
  autoTable(doc, {
    startY: 80,

    head: [[
      'ID',
      'Number',
      'Date',
      'Call ID',
      'Asset',
      'Spare Name',
      'Category',
      'Qty',
      'Unit Price',
      'Total',
      'Vendor',
      'Type',
      'Engineer',
      'Status',
      'Created',
      'Updated'
    ]],

    body: this.tableData.map((row) => [
      row.spareEntryId,
      row.spareEntryNumber,
      row.entryDate,
      row.callLoggingId,
      row.assetId,

      row.sparePartName,
      row.category,

      row.quantity,
      row.unitPrice,
      row.totalCost,

      row.vendorName,
      row.spareType,

      row.engineerName,

      row.spareStatus,

      row.createdDate || '',
      row.updatedDate || ''
    ]),

    theme: 'grid',

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: [255, 255, 255],
      halign: 'center',
      fontSize: 9,
    },

    bodyStyles: {
      fontSize: 8,
      halign: 'center',
    },

    styles: {
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },

    // ✅ STATUS COLOR FIX
    didParseCell: function (data) {
      if (data.column.index === 13) {
        if (data.cell.raw === 'Active') {
          data.cell.styles.textColor = [0, 150, 0];
        } else {
          data.cell.styles.textColor = [200, 0, 0];
        }
      }
    },

    // ✅ PAGE NUMBER
    didDrawPage: function (data) {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(10);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 100,
        doc.internal.pageSize.getHeight() - 10
      );
    }
  });

  doc.save('Spare_Entry_Report.pdf');
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
    return this.tableData.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Calculate total pages
  get totalPages() {
    return Math.ceil(this.tableData.length / this.itemsPerPage);
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

  // ngOnInit() {
  //   this.forms[0].newRecord.entryDate = this.getTodayDate();
  // }

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
newRecord: TableRow = {

  /* ========= PRIMARY ========= */
  spareEntryId: '0',
  spareEntryNumber: '',

  /* ========= ENTRY ========= */
  entryDate: this.currentDate || '',

  callLoggingId: '',
  assetId: '',

  /* ========= SPARE ========= */
  sparePartId: '',
  sparePartName: '',
  sparePartCode: '',

  category: '',

  /* ========= COST ========= */
  quantity: 0,
  unitPrice: 0,
  totalCost: 0,

  /* ========= VENDOR ========= */
  vendorName: '',
  purchaseReferenceNo: '',

  /* ========= TYPE ========= */
  spareType: '',
  replacementType: '',

  /* ========= PEOPLE ========= */
  engineerName: '',
  replacementDate: '',

  /* ========= STATUS ========= */
  spareStatus: 'Active',

  /* ========= EXTRA ========= */
  remarks: '',

  /* ========= AUDIT ========= */
  createdBy: this.loginId || '',
  createdDate: this.currentDate || '',

  updatedBy: '',
  updatedDate: ''
};
  // --------------------------
  // STATE VARIABLES
  // --------------------------
  isEditMode: boolean = false;
  editIndex: number | null = null;

  activeForm: number = 0;
  showErrors: boolean = false;

  // --------------------------
  // EDIT EXISTING ROW
  // --------------------------

onEdit(row: TableRow, index: number) {

  this.activeTab = 'newRecord';
  this.isEditMode = true;
  this.editIndex = index;

  this.forms = [
    {
      spareEntryId: row.spareEntryId,
      spareEntryNumber: row.spareEntryNumber,

      entryDate: row.entryDate,

      callLoggingId: row.callLoggingId,
      assetId: row.assetId,

      sparePartId: row.sparePartId,
      sparePartName: row.sparePartName,
      sparePartCode: row.sparePartCode,

      category: row.category,

      quantity: row.quantity,
      unitPrice: row.unitPrice,
      totalCost: row.totalCost,

      vendorName: row.vendorName,
      purchaseReferenceNo: row.purchaseReferenceNo,

      spareType: row.spareType,
      replacementType: row.replacementType,

      engineerName: row.engineerName,
      replacementDate: row.replacementDate,

      spareStatus: row.spareStatus,

      remarks: row.remarks,

      createdBy: row.createdBy,
      createdDate: row.createdDate,

      updatedBy: this.loginId || '',
      updatedDate: this.currentDate,

      // 🔥 IMPORTANT (FORM BINDING)
      newRecord: {
        ...row,
        updatedBy: this.loginId || '',
        updatedDate: this.currentDate
      }
    }
  ];
}
  // --------------------------
  // SAVE RECORD (SINGLE OR MULTIPLE)
  // --------------------------
saveAllRecords() {

  // ---------------- VALIDATION ----------------
  const invalid = this.forms.some(
    (f) =>
      !f.newRecord.spareEntryNumber?.trim() ||
      !f.newRecord.entryDate ||
      !f.newRecord.callLoggingId ||
      !f.newRecord.assetId ||
      !f.newRecord.sparePartName ||
      f.newRecord.quantity == null
  );

  if (invalid) {
    this.showErrors = true;
    this.toast.warning('Please fill all required fields!', 'error', 4000);
    return;
  }

  // ---------------- EDIT MODE ----------------
  if (this.isEditMode && this.editIndex !== null) {

    const form = this.forms[0].newRecord;

    const payload = {
      spareEntryId: form.spareEntryId,
      spareEntryNumber: form.spareEntryNumber,

      entryDate: form.entryDate,
      callLoggingId: form.callLoggingId,
      assetId: form.assetId,

      sparePartId: form.sparePartId,
      sparePartName: form.sparePartName,
      sparePartCode: form.sparePartCode,

      category: form.category,

      quantity: form.quantity,
      unitPrice: form.unitPrice,
      totalCost: form.totalCost,

      vendorName: form.vendorName,
      purchaseReferenceNo: form.purchaseReferenceNo,

      spareType: form.spareType,
      replacementType: form.replacementType,

      engineerName: form.engineerName,
      replacementDate: form.replacementDate,

      spareStatus: form.spareStatus,

      remarks: form.remarks,

      createdBy: form.createdBy,
      createdDate: form.createdDate,

      updatedBy: this.loginId || '',
      updatedDate: this.currentDate
    };

    this.commonService
      .updateSpareEntry(form.spareEntryId, this.loginId, payload)
      .subscribe({
        next: () => {
          this.toast.success('Spare Entry Updated!', 'success', 4000);
          this.resetAfterSave();
          this.loadSpareEntry();
        },
        error: () => {
          this.toast.danger('Update failed!', 'error', 4000);
        },
      });

    return;
  }

  // ---------------- ADD MODE ----------------
  const payload = this.forms.map((f) => {

    const form = f.newRecord;

    return {
      spareEntryNumber: form.spareEntryNumber,

      entryDate: form.entryDate,
      callLoggingId: form.callLoggingId,
      assetId: form.assetId,

      sparePartId: form.sparePartId,
      sparePartName: form.sparePartName,
      sparePartCode: form.sparePartCode,

      category: form.category,

      quantity: form.quantity,
      unitPrice: form.unitPrice,
      totalCost: form.totalCost,

      vendorName: form.vendorName,
      purchaseReferenceNo: form.purchaseReferenceNo,

      spareType: form.spareType,
      replacementType: form.replacementType,

      engineerName: form.engineerName,
      replacementDate: form.replacementDate,

      spareStatus: form.spareStatus,

      remarks: form.remarks,

      createdBy: this.loginId || '',
      createdDate: this.currentDate,

      updatedBy: null,
      updatedDate: null
    };
  });

  console.log('SPARE ENTRY PAYLOAD 👉', payload);

  this.commonService.submit_multiple_spare_entry(payload).subscribe({
    next: (res) => {

      if (res?.duplicateMessages?.length) {
        res.duplicateMessages.forEach((msg: string) =>
          this.toast.warning(msg, 'warning', 4000)
        );
      }

      this.toast.success('Spare Entry Added Successfully!', 'success', 4000);
      this.resetAfterSave();
      this.loadSpareEntry();
    },
    error: () => {
      this.toast.danger('Save failed!', 'error', 4000);
    },
  });
}
resetAfterSave() {

  this.forms = [
    {
      spareEntryId: '',
      spareEntryNumber: '',

      entryDate: this.currentDate || '',

      callLoggingId: '',
      assetId: '',

      sparePartId: '',
      sparePartName: '',
      sparePartCode: '',

      category: '',

      quantity: 0,
      unitPrice: 0,
      totalCost: 0,

      vendorName: '',
      purchaseReferenceNo: '',

      spareType: '',
      replacementType: '',

      engineerName: '',
      replacementDate: '',

      spareStatus: 'Active',

      remarks: '',

      createdBy: this.loginId || '',
      createdDate: this.currentDate || '',

      updatedBy: '',
      updatedDate: '',

      // 🔥 FORM BINDING
      newRecord: {
        spareEntryId: '',
        spareEntryNumber: '',

        entryDate: this.currentDate || '',

        callLoggingId: '',
        assetId: '',

        sparePartId: '',
        sparePartName: '',
        sparePartCode: '',

        category: '',

        quantity: 0,
        unitPrice: 0,
        totalCost: 0,

        vendorName: '',
        purchaseReferenceNo: '',

        spareType: '',
        replacementType: '',

        engineerName: '',
        replacementDate: '',

        spareStatus: 'Active',

        remarks: '',

        createdBy: this.loginId || '',
        createdDate: this.currentDate || '',

        updatedBy: '',
        updatedDate: ''
      }
    }
  ];

  // ✅ RESET FLAGS
  this.isEditMode = false;
  this.editIndex = null;
  this.activeTab = 'details';
  this.showErrors = false;
}
  // --------------------------
  // OPEN NEW RECORD TAB
  // --------------------------
  openNewRecordTab() {
    this.activeTab = 'newRecord';
    this.isEditMode = false;
    this.editIndex = null;

    this.initializeForm(); // 🔥 BEST
  }

  // --------------------------
  // ADD NEW FORM
  // --------------------------
addForm() {

  if (this.isEditMode) return;

  const today = new Date().toISOString().split('T')[0];

  this.forms.push({

    spareEntryId: '',
    spareEntryNumber: '',

    entryDate: today,

    callLoggingId: '',
    assetId: '',

    sparePartId: '',
    sparePartName: '',
    sparePartCode: '',

    category: '',

    quantity: 0,
    unitPrice: 0,
    totalCost: 0,

    vendorName: '',
    purchaseReferenceNo: '',

    spareType: '',
    replacementType: '',

    engineerName: '',
    replacementDate: '',

    spareStatus: 'Active',

    remarks: '',

    createdBy: this.loginId || '',
    createdDate: today,

    updatedBy: '',
    updatedDate: '',

    // 🔥 FORM BINDING
    newRecord: {
      spareEntryId: '',
      spareEntryNumber: '',

      entryDate: today,

      callLoggingId: '',
      assetId: '',

      sparePartId: '',
      sparePartName: '',
      sparePartCode: '',

      category: '',

      quantity: 0,
      unitPrice: 0,
      totalCost: 0,

      vendorName: '',
      purchaseReferenceNo: '',

      spareType: '',
      replacementType: '',

      engineerName: '',
      replacementDate: '',

      spareStatus: 'Active',

      remarks: '',

      createdBy: this.loginId || '',
      createdDate: today,

      updatedBy: '',
      updatedDate: ''
    }
  });
}

  // --------------------------
  // CANCEL / RESET FORM
  // --------------------------

cancelRecord(form?: NgForm, index?: number) {

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const currentDate = `${yyyy}-${mm}-${dd}`;

  if (index !== undefined) {

    this.forms[index] = {

      spareEntryId: '',
      spareEntryNumber: '',

      entryDate: currentDate,

      callLoggingId: '',
      assetId: '',

      sparePartId: '',
      sparePartName: '',
      sparePartCode: '',

      category: '',

      quantity: 0,
      unitPrice: 0,
      totalCost: 0,

      vendorName: '',
      purchaseReferenceNo: '',

      spareType: '',
      replacementType: '',

      engineerName: '',
      replacementDate: '',

      spareStatus: 'Active',

      remarks: '',

      // ✅ KEEP LOGIN
      createdBy: this.loginId || '',
      createdDate: currentDate,

      updatedBy: '',
      updatedDate: '',

      // 🔥 FORM BINDING
      newRecord: {
        spareEntryId: '',
        spareEntryNumber: '',

        entryDate: currentDate,

        callLoggingId: '',
        assetId: '',

        sparePartId: '',
        sparePartName: '',
        sparePartCode: '',

        category: '',

        quantity: 0,
        unitPrice: 0,
        totalCost: 0,

        vendorName: '',
        purchaseReferenceNo: '',

        spareType: '',
        replacementType: '',

        engineerName: '',
        replacementDate: '',

        spareStatus: 'Active',

        remarks: '',

        createdBy: this.loginId || '',
        createdDate: currentDate,

        updatedBy: '',
        updatedDate: ''
      }
    };
  }

  if (form) form.resetForm();

  this.isEditMode = false;
  this.editIndex = null;
  this.showErrors = false;
}

  // --------------------------
  // REMOVE FORM
  // --------------------------
  removeForm(index: number) {
    this.forms.splice(index, 1);
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

    // Filter data by date
    this.filterByDate(); // Make sure this works for spareEntryDate

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
        this.exportFilteredCSV(this.filteredData); // Use spare entry fields
        break;
      case 'xlsx':
        this.exportFilteredExcel(this.filteredData); // Use spare entry fields
        break;
      case 'pdf':
        this.exportFilteredPDF(this.filteredData); // Use spare entry fields
        break;
      default:
        this.toast.danger('Invalid file type selected!', 'error');
    }
  }
  //bulk export date format
  startDateError: string = '';
  endDateError: string = '';
filterByDate() {

  // ❗ If no dates → show all
  if (!this.startDate || !this.endDate) {
    this.filteredData = [...this.tableData];
    return;
  }

  const start = this.convertToDate(this.startDate);
  const end = this.convertToDate(this.endDate);

  this.filteredData = this.tableData.filter((item: TableRow) => {

    // 🔥 USE entryDate (NOT createdDate)
    if (!item.entryDate) return false;

    const itemDate = this.convertToDate(item.entryDate);

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
  editForm(index: number) {
    this.isEditMode = true;
    this.forms[index].isEdit = true;
  }
  // Trigger when file is selected
  onFileSelected(event: any) {
    const f = event.target.files && event.target.files[0];
    if (f) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
        this.toast.warning(
          'Please select a valid Spare Entry excel file (.xlsx or .xls)',
        );
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
      this.isDateInRange(item.date, this.startDate, this.endDate),
    );
  }
  uploadFile() {
    if (!this.selectedFile) {
      this.toast.warning('select a file first !');
      return;
    }

    this.loading = true;
    this.commonService.uploadDesignationExcel(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;
        this.loadSpareEntry();
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

  // ---------------- Excel Parsing ----------------
readExcel(file: File) {

  const reader = new FileReader();

  reader.onload = () => {

    const workbook = XLSX.read(reader.result, { type: 'binary' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    json.forEach((obj: any) => {

      const row: TableRow = {

        spareEntryId: obj['Spare Entry ID'] || '',
        spareEntryNumber: obj['Spare Entry Number'] || '',

        entryDate: obj['Entry Date'] || '',

        callLoggingId: obj['Call Logging ID'] || '',
        assetId: obj['Asset ID'] || '',

        sparePartId: obj['Spare Part ID'] || '',
        sparePartName: obj['Spare Part Name'] || '',
        sparePartCode: obj['Spare Part Code'] || '',

        category: obj['Category'] || '',

        quantity: Number(obj['Quantity']) || 0,
        unitPrice: Number(obj['Unit Price']) || 0,
        totalCost: Number(obj['Total Cost']) || 0,

        vendorName: obj['Vendor Name'] || '',
        purchaseReferenceNo: obj['Purchase Reference No'] || '',

        spareType: obj['Spare Type'] || '',
        replacementType: obj['Replacement Type'] || '',

        engineerName: obj['Engineer Name'] || '',
        replacementDate: obj['Replacement Date'] || '',

        spareStatus: obj['Spare Status'] || 'Active',

        remarks: obj['Remarks'] || '',

        createdBy: this.loginId || '',
        createdDate: obj['Created Date'] || '',

        updatedBy: obj['Updated By'] || '',
        updatedDate: obj['Updated Date'] || ''
      };

      this.tableData.push(row);
    });

    this.filteredData = [...this.tableData];

    this.toast.success(
      'Spare Entry Excel imported successfully!',
      'success',
      4000
    );
  };

  reader.readAsBinaryString(file);
}

  // ---------------- TXT Parsing ----------------
readTXT(file: File) {

  const reader = new FileReader();

  reader.onload = () => {

    let text = reader.result as string;

    // ⭐ Remove header (NEW FORMAT)
    text = text
      .replace(
        /Spare Entry ID\s+Spare Entry Number\s+Entry Date\s+Call Logging ID\s+Asset ID\s+Spare Part ID\s+Spare Part Name\s+Spare Part Code\s+Category\s+Quantity\s+Unit Price\s+Total Cost\s+Vendor Name\s+Purchase Reference No\s+Spare Type\s+Replacement Type\s+Engineer Name\s+Replacement Date\s+Spare Status\s+Remarks/i,
        ''
      )
      .trim();

    // ⭐ Split rows based on Status
    const rawRows = text
      .split(/(Active|Inactive)/)
      .reduce((acc: string[], curr, index, arr) => {
        if (curr === 'Active' || curr === 'Inactive') {
          acc[acc.length - 1] += ' ' + curr;
        } else if (curr.trim() !== '') {
          acc.push(curr.trim());
        }
        return acc;
      }, []);

    rawRows.forEach((r) => {

      const parts = r.split(/\s+/);

      if (parts.length < 19) {
        console.warn('Invalid row:', r);
        return;
      }

      const [
        spareEntryId,
        spareEntryNumber,
        entryDate,
        callLoggingId,
        assetId,
        sparePartId,
        sparePartName,
        sparePartCode,
        category,
        quantity,
        unitPrice,
        totalCost,
        vendorName,
        purchaseReferenceNo,
        spareType,
        replacementType,
        engineerName,
        replacementDate,
        spareStatus,
        ...rest
      ] = parts;

      const remarks = rest.join(' '); // ⭐ remaining text

      const row: TableRow = {

        spareEntryId,
        spareEntryNumber,

        entryDate,

        callLoggingId,
        assetId,

        sparePartId,
        sparePartName,
        sparePartCode,

        category,

        quantity: Number(quantity) || 0,
        unitPrice: Number(unitPrice) || 0,
        totalCost: Number(totalCost) || 0,

        vendorName,
        purchaseReferenceNo,

        spareType,
        replacementType,

        engineerName,
        replacementDate,

        spareStatus: spareStatus as 'Active' | 'Inactive',

        remarks,

        createdBy: this.loginId || '',
        createdDate: '',

        updatedBy: '',
        updatedDate: ''
      };

      this.tableData.push(row);
    });

    this.filteredData = [...this.tableData];

    this.toast.success(
      'Spare Entry TXT imported successfully!',
      'success',
      4000
    );
  };

  reader.readAsText(file);
}

  // ---------------- DOCX Parsing (mammoth.js) ----------------
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

    while (cells.length < 24) cells.push('');

    const newRecord: TableRow = {

      spareEntryId: cells[0],
      spareEntryNumber: cells[1],

      entryDate: cells[2],

      callLoggingId: cells[3],
      assetId: cells[4],

      sparePartId: cells[5],
      sparePartName: cells[6],
      sparePartCode: cells[7],

      category: cells[8],

      quantity: Number(cells[9]) || 0,
      unitPrice: Number(cells[10]) || 0,
      totalCost: Number(cells[11]) || 0,

      vendorName: cells[12],
      purchaseReferenceNo: cells[13],

      spareType: cells[14],
      replacementType: cells[15],

      engineerName: cells[16],
      replacementDate: cells[17],

      spareStatus: (cells[18] as 'Active' | 'Inactive') || 'Active',

      remarks: cells[19],

      createdBy: this.loginId || '',
      createdDate: cells[20] || '',

      updatedBy: cells[21] || '',
      updatedDate: cells[22] || ''
    };

    this.tableData.push(newRecord);
  });

  this.filteredData = [...this.tableData];

  this.toast.success(
    'DOCX Spare Entries imported successfully!',
    'success',
    4000
  );
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

  console.log('RAW PDF TEXT:', fullText);

  fullText = fullText.replace(/\s+/g, ' ').trim();

  // ⭐ NEW FORMAT (backend structure)
  const rowRegex =
    /(\S+)\s+(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(Active|Inactive)\s+(.*?)(?=\s+\S+\s+\S+\s+\d{4}-\d{2}-\d{2}|$)/g;

  let match;

  while ((match = rowRegex.exec(fullText)) !== null) {

    const row: TableRow = {

      spareEntryId: match[1],
      spareEntryNumber: match[2],

      entryDate: match[3],

      callLoggingId: match[4],
      assetId: match[5],

      sparePartId: match[6],
      sparePartName: match[7],
      sparePartCode: match[8],

      category: match[9],

      quantity: Number(match[10]) || 0,
      unitPrice: Number(match[11]) || 0,
      totalCost: Number(match[12]) || 0,

      vendorName: match[13],
      purchaseReferenceNo: match[14],

      spareType: match[15],
      replacementType: match[16],

      engineerName: match[17],
      replacementDate: match[18],

      spareStatus: match[19] as 'Active' | 'Inactive',

      remarks: match[20]?.trim() || '',

      createdBy: this.loginId || '',
      createdDate: '',

      updatedBy: '',
      updatedDate: ''
    };

    this.tableData.push(row);
  }

  this.filteredData = [...this.tableData];

  this.toast.success(
    'PDF Spare Entries imported successfully!',
    'success',
    4000
  );

  console.log('FINAL SPARE ENTRY ROWS:', this.tableData);
}
  // ---------------- Download Sample CSV ----------------

 downloadSampleCSV() {

  if (!this.tableData.length) {
    this.toast.danger('No data to download!', 'error', 4000);
    return;
  }

  // ⭐ HEADERS (FINAL STRUCTURE)
  const headers = [
    'Spare Entry ID',
    'Spare Entry Number',
    'Entry Date',
    'Call Logging ID',
    'Asset ID',
    'Spare Part ID',
    'Spare Part Name',
    'Spare Part Code',
    'Category',
    'Quantity',
    'Unit Price',
    'Total Cost',
    'Vendor Name',
    'Purchase Reference No',
    'Spare Type',
    'Replacement Type',
    'Engineer Name',
    'Replacement Date',
    'Spare Status',
    'Remarks',
    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date'
  ];

  const csvRows = [headers.join(',')];

  this.tableData.forEach((row: TableRow) => {

    const rowData = [
      row.spareEntryId,
      row.spareEntryNumber,
      row.entryDate,
      row.callLoggingId,
      row.assetId,

      row.sparePartId,
      row.sparePartName,
      row.sparePartCode,

      row.category,

      row.quantity,
      row.unitPrice,
      row.totalCost,

      row.vendorName,
      row.purchaseReferenceNo,

      row.spareType,
      row.replacementType,

      row.engineerName,
      row.replacementDate,

      row.spareStatus,

      row.remarks,

      row.createdBy,
      row.createdDate,

      row.updatedBy,
      row.updatedDate
    ];

    csvRows.push(rowData.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Spare_Entries.csv';
  a.click();

  URL.revokeObjectURL(a.href);
}

  // ---------------- CSV Export ----------------
 exportFilteredCSV(data: TableRow[]) {

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const csvRows: string[] = [];

  // ⭐ Row 1 → Company
  csvRows.push(this.loginId || 'Company Name');

  // ⭐ Row 2 → Date
  csvRows.push(`Date:,${formattedDate}`);

  // Empty row
  csvRows.push('');

  // ⭐ HEADERS (FINAL STRUCTURE)
  const headers = [
    'Spare Entry ID',
    'Spare Entry Number',
    'Entry Date',
    'Call Logging ID',
    'Asset ID',
    'Spare Part ID',
    'Spare Part Name',
    'Spare Part Code',
    'Category',
    'Quantity',
    'Unit Price',
    'Total Cost',
    'Vendor Name',
    'Purchase Reference No',
    'Spare Type',
    'Replacement Type',
    'Engineer Name',
    'Replacement Date',
    'Spare Status',
    'Remarks',
    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date'
  ];

  csvRows.push(headers.join(','));

  // ⭐ DATA
  data.forEach((row: TableRow) => {

    const rowData = [
      row.spareEntryId,
      row.spareEntryNumber,
      row.entryDate,
      row.callLoggingId,
      row.assetId,

      row.sparePartId,
      row.sparePartName,
      row.sparePartCode,

      row.category,

      row.quantity,
      row.unitPrice,
      row.totalCost,

      row.vendorName,
      row.purchaseReferenceNo,

      row.spareType,
      row.replacementType,

      row.engineerName,
      row.replacementDate,

      row.spareStatus,

      row.remarks,

      row.createdBy,
      row.createdDate,

      row.updatedBy,
      row.updatedDate
    ];

    csvRows.push(rowData.join(','));
  });

  // ⭐ EXPORT
  const csvData = csvRows.join('\n');

  const blob = new Blob([csvData], {
    type: 'text/csv;charset=utf-8;'
  });

  saveAs(blob, 'Filtered_Spare_Entries_Report.csv');
}

  // ---------------- Excel Export ----------------
exportFilteredExcel(data: TableRow[]) {

  const wsData: any[][] = [];

  // ⭐ Row 1 → Company
  wsData.push([this.loginId || 'Company Name']);

  // ⭐ Row 2 → Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  // ⭐ Empty row
  wsData.push([]);

  // ⭐ HEADERS (FINAL STRUCTURE)
  wsData.push([
    'Spare Entry ID',
    'Spare Entry Number',
    'Entry Date',
    'Call Logging ID',
    'Asset ID',
    'Spare Part ID',
    'Spare Part Name',
    'Spare Part Code',
    'Category',
    'Quantity',
    'Unit Price',
    'Total Cost',
    'Vendor Name',
    'Purchase Reference No',
    'Spare Type',
    'Replacement Type',
    'Engineer Name',
    'Replacement Date',
    'Spare Status',
    'Remarks',
    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date'
  ]);

  // ⭐ DATA
  data.forEach((row: TableRow) => {

    wsData.push([
      row.spareEntryId,
      row.spareEntryNumber,
      row.entryDate,
      row.callLoggingId,
      row.assetId,

      row.sparePartId,
      row.sparePartName,
      row.sparePartCode,

      row.category,

      row.quantity,
      row.unitPrice,
      row.totalCost,

      row.vendorName,
      row.purchaseReferenceNo,

      row.spareType,
      row.replacementType,

      row.engineerName,
      row.replacementDate,

      row.spareStatus,

      row.remarks,

      row.createdBy,
      row.createdDate,

      row.updatedBy,
      row.updatedDate
    ]);
  });

  // ⭐ Create worksheet
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // ⭐ Column width (professional)
  worksheet['!cols'] = new Array(24).fill({ wch: 18 });

  // ⭐ Workbook
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Spare Entries');

  // ⭐ Export
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, 'Filtered_Spare_Entries_Report.xlsx');
}
  // ---------------- PDF Export ----------------
exportFilteredPDF(data: TableRow[]) {

  const doc = new jsPDF('l', 'pt', 'a4'); // 🔥 landscape (more columns)

  // ⭐ Title
  doc.setFontSize(20);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const title = 'Filtered Spare Entry Report';

  doc.text(title, pageWidth / 2, 40, { align: 'center' });

  const titleWidth = doc.getTextWidth(title);
  doc.line(
    pageWidth / 2 - titleWidth / 2,
    45,
    pageWidth / 2 + titleWidth / 2,
    45
  );

  // ⭐ Company + Date
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  doc.text(`User: ${this.loginId || 'Company Name'}`, 40, 70);
  doc.text(`Date: ${dateStr}`, pageWidth - 40, 70, { align: 'right' });

  // ⭐ TABLE
  autoTable(doc, {
    startY: 80,

    head: [[
      'ID',
      'Number',
      'Entry Date',
      'Call ID',
      'Asset ID',
      'Spare Part ID',
      'Spare Part Name',
      'Code',
      'Category',
      'Qty',
      'Unit Price',
      'Total Cost',
      'Vendor',
      'PO Ref',
      'Spare Type',
      'Replacement',
      'Engineer',
      'Replace Date',
      'Status',
      'Remarks',
      'Created',
      'Updated'
    ]],

    body: data.map((row: TableRow) => [
      row.spareEntryId,
      row.spareEntryNumber,
      row.entryDate,
      row.callLoggingId,
      row.assetId,

      row.sparePartId,
      row.sparePartName,
      row.sparePartCode,

      row.category,

      row.quantity,
      row.unitPrice,
      row.totalCost,

      row.vendorName,
      row.purchaseReferenceNo,

      row.spareType,
      row.replacementType,

      row.engineerName,
      row.replacementDate,

      row.spareStatus,

      row.remarks,

      row.createdDate || '',
      row.updatedDate || ''
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
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
      cellPadding: 2,
      valign: 'middle',
    },

    // ⭐ Status color highlight
    didParseCell: function (data) {
      if (data.column.index === 18) {
        if (data.cell.raw === 'Active') {
          data.cell.styles.textColor = [0, 150, 0];
        } else {
          data.cell.styles.textColor = [200, 0, 0];
        }
      }
    },

    // ⭐ Page number footer
    didDrawPage: function (dataArg) {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(10);
      doc.text(
        `Page ${dataArg.pageNumber} of ${pageCount}`,
        pageWidth - 100,
        doc.internal.pageSize.getHeight() - 10
      );
    }
  });

  doc.save('Filtered_Spare_Entries_Report.pdf');
}
}
