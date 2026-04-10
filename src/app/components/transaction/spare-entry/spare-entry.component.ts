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
  spareEntryCode: string;

  spareEntryDate: string;
  spareEntryType: string;
  spareEntrycallId: string;

  spareEntryassetId: string;
  spareEntryclientName: string;
  spareEntryengineerName: string;

  department: string;

  spareEntryCategory: string;
  spareEntryName: string;
  spareEntryCompatibleAssetType: string;
  spareEntryquantityUsed: number;
  spareEntryunit: string;

  spareEntryserialNumber: string;
  spareEntrywarrantyApplicable: string;

  spareEntryremarks: string;

  spareEntryunitCost: number;
  spareEntrytotalCost: number;

  spareEntrystockAvailable: number;
  spareEntrystockAfterEntry: number;

  spareEntryStatus: string;

  loginId: string;

  createdDate?: string;
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
        spareEntryCode: '',
        spareEntryDate: this.currentDate || '',
        spareEntryType: '',
        spareEntrycallId: '',
        spareEntryassetId: '',
        spareEntryclientName: '',
        spareEntryengineerName: '',
        department: '',
        spareEntryCategory: '',
        spareEntryName: '',
        spareEntryCompatibleAssetType: '',
        spareEntryquantityUsed: 0,
        spareEntryunit: '',
        spareEntryserialNumber: '',
        spareEntrywarrantyApplicable: 'No',
        spareEntryremarks: '',
        spareEntryunitCost: 0,
        spareEntrytotalCost: 0,
        spareEntrystockAvailable: 0,
        spareEntrystockAfterEntry: 0,
        spareEntryStatus: 'Active',
        loginId: this.loginId || '',

        newRecord: {
          spareEntryId: '',
          spareEntryCode: '',
          spareEntryDate: this.currentDate,
          spareEntryType: '',
          spareEntrycallId: '',
          spareEntryassetId: '',
          spareEntryclientName: '',
          spareEntryengineerName: '',
          department: '',
          spareEntryCategory: '',
          spareEntryName: '',
          spareEntryCompatibleAssetType: '',
          spareEntryquantityUsed: 0,
          spareEntryunit: '',
          spareEntryserialNumber: '',
          spareEntrywarrantyApplicable: 'No',
          spareEntryremarks: '',
          spareEntryunitCost: 0,
          spareEntrytotalCost: 0,
          spareEntrystockAvailable: 0,
          spareEntrystockAfterEntry: 0,
          spareEntryStatus: 'Active',
          loginId: this.loginId || '',
        },
      },
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
    const wsData = [];

    // ⭐ Row 1 → Company Name
    wsData.push([this.loginId || 'Company Name']);

    // ⭐ Row 2 → Date
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    wsData.push(['Date:', formattedDate]);

    // Empty Row
    wsData.push([]);

    // ⭐ Header
    wsData.push([
      'Spare Entry ID',
      'Code',
      'Date',
      'Type',
      'Asset ID',
      'Client Name',
      'Engineer Name',
      'Department',
      'Category',
      'Spare Name',
      'Quantity Used',
      'Unit',
      'Serial Number',
      'Warranty',
      'Unit Cost',
      'Total Cost',
      'Stock Available',
      'Stock After Entry',
      'Status',
    ]);

    // ⭐ Rows
    this.tableData.forEach((row) => {
      wsData.push([
        row.spareEntryId,
        row.spareEntryCode,
        row.spareEntryDate,
        row.spareEntryType,
        row.spareEntryassetId,
        row.spareEntryclientName,
        row.spareEntryengineerName,
        row.department,
        row.spareEntryCategory,
        row.spareEntryName,
        row.spareEntryquantityUsed,
        row.spareEntryunit,
        row.spareEntryserialNumber,
        row.spareEntrywarrantyApplicable,
        row.spareEntryunitCost,
        row.spareEntrytotalCost,
        row.spareEntrystockAvailable,
        row.spareEntrystockAfterEntry,
        row.spareEntryStatus,
      ]);
    });

    // Create worksheet
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    // Create workbook
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Spare Entry');

    // Export
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

        /* ⭐ Status Colors */
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
      <h2>Spare Entry Records</h2>

      <div class="header-info">
        <div>${this.loginId}</div>
        <div>${formattedDate}</div>
      </div>

      <table>
        <tr>
          <th>ID</th>
          <th>Code</th>
          <th>Date</th>
          <th>Type</th>
          <th>Asset ID</th>
          <th>Client</th>
          <th>Engineer</th>
          <th>Department</th>
          <th>Category</th>
          <th>Spare Name</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Serial No</th>
          <th>Warranty</th>
          <th>Unit Cost</th>
          <th>Total Cost</th>
          <th>Stock</th>
          <th>After Entry</th>
          <th>Status</th>
        </tr>
  `;

    this.tableData.forEach((row) => {
      const statusClass =
        row.spareEntryStatus === 'Active' || row.spareEntryStatus === 'Closed'
          ? 'status-active'
          : 'status-inactive';

      const statusIcon =
        row.spareEntryStatus === 'Active' || row.spareEntryStatus === 'Closed'
          ? '✔️'
          : '❌';

      content += `
      <tr>
        <td>${row.spareEntryId}</td>
        <td>${row.spareEntryCode}</td>
        <td>${row.spareEntryDate}</td>
        <td>${row.spareEntryType}</td>
        <td>${row.spareEntryassetId}</td>
        <td>${row.spareEntryclientName}</td>
        <td>${row.spareEntryengineerName}</td>
        <td>${row.department}</td>
        <td>${row.spareEntryCategory}</td>
        <td>${row.spareEntryName}</td>
        <td>${row.spareEntryquantityUsed}</td>
        <td>${row.spareEntryunit}</td>
        <td>${row.spareEntryserialNumber}</td>
        <td>${row.spareEntrywarrantyApplicable}</td>
        <td>${row.spareEntryunitCost}</td>
        <td>${row.spareEntrytotalCost}</td>
        <td>${row.spareEntrystockAvailable}</td>
        <td>${row.spareEntrystockAfterEntry}</td>
        <td class="${statusClass}">${statusIcon} ${row.spareEntryStatus}</td>
      </tr>
    `;
    });

    content += `
      </table>
    </body>
  </html>
  `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    saveAs(blob, 'Spare_Entry_Report.doc');
  }

  exportPDF() {
    const doc = new jsPDF('p', 'pt', 'a4');

    // ⭐ TITLE (Center + Underline)
    doc.setFontSize(22);
    doc.setTextColor(0, 70, 140);

    const pageWidth = doc.internal.pageSize.getWidth();
    const titleX = pageWidth / 2;

    doc.text('Spare Entry Records', titleX, 60, { align: 'center' });

    // Underline
    const titleWidth = doc.getTextWidth('Spare Entry Records');
    doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

    // ⭐ Company Name + Date
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);

    const company = this.loginId || 'Company Name';
    const dateStr = new Date().toLocaleDateString();

    const leftX = 40;
    const topY = 100;

    // Company Name
    doc.text(company, leftX, topY);

    // Date Right
    doc.text(dateStr, pageWidth - 40, topY, { align: 'right' });

    // ⭐ TABLE
    autoTable(doc, {
      startY: 110,
      head: [
        [
          'ID',
          'Code',
          'Date',
          'Type',
          'Asset ID',
          'Client',
          'Engineer',
          'Dept',
          'Category',
          'Spare Name',
          'Qty',
          'Unit',
          'Serial No',
          'Warranty',
          'Unit Cost',
          'Total Cost',
          'Stock',
          'After Entry',
          'Status',
        ],
      ],

      body: this.tableData.map((row) => [
        row.spareEntryId,
        row.spareEntryCode,
        row.spareEntryDate,
        row.spareEntryType,
        row.spareEntryassetId,
        row.spareEntryclientName,
        row.spareEntryengineerName,
        row.department,
        row.spareEntryCategory,
        row.spareEntryName,
        row.spareEntryquantityUsed,
        row.spareEntryunit,
        row.spareEntryserialNumber,
        row.spareEntrywarrantyApplicable,
        row.spareEntryunitCost,
        row.spareEntrytotalCost,
        row.spareEntrystockAvailable,
        row.spareEntrystockAfterEntry,
        row.spareEntryStatus,
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

      // ✅ Auto wrap (important for many columns)
      columnStyles: {
        0: { cellWidth: 70 }, // ID
        1: { cellWidth: 50 }, // Code
        2: { cellWidth: 60 }, // Date
      },
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
    spareEntryId: '0',
    spareEntryCode: '',
    spareEntryDate: '',

    spareEntryType: '',

    spareEntrycallId: '', // ✅ ADD THIS
    spareEntryassetId: '',
    spareEntryclientName: '',
    spareEntryengineerName: '',

    department: '',

    spareEntryCategory: '',
    spareEntryName: '',

    spareEntryCompatibleAssetType: '', // ✅ ADD THIS

    spareEntryquantityUsed: 0,
    spareEntryunit: '',

    spareEntryserialNumber: '',
    spareEntrywarrantyApplicable: '',

    spareEntryremarks: '',

    spareEntryunitCost: 0,
    spareEntrytotalCost: 0,

    spareEntrystockAvailable: 0,
    spareEntrystockAfterEntry: 0,

    spareEntryStatus: 'Open',

    loginId: this.loginId || '',
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

  onEdit(row: any, index: number) {
    this.activeTab = 'newRecord';
    this.isEditMode = true;
    this.editIndex = index; // 🔥 MUST

    this.forms = [
      {
        spareEntryCode: row.spareEntryCode,
        spareEntryDate: row.spareEntryDate,
        spareEntryType: row.spareEntryType,
        spareEntrycallId: row.spareEntrycallId,
        spareEntryassetId: row.spareEntryassetId,
        spareEntryclientName: row.spareEntryclientName,
        spareEntryengineerName: row.spareEntryengineerName,
        department: row.department,
        spareEntryCategory: row.spareEntryCategory,
        spareEntryName: row.spareEntryName,
        spareEntryCompatibleAssetType: row.spareEntryCompatibleAssetType,
        spareEntryquantityUsed: row.spareEntryquantityUsed,
        spareEntryunit: row.spareEntryunit,
        spareEntryserialNumber: row.spareEntryserialNumber,
        spareEntrywarrantyApplicable: row.spareEntrywarrantyApplicable,
        spareEntryremarks: row.spareEntryremarks,
        spareEntryunitCost: row.spareEntryunitCost,
        spareEntrytotalCost: row.spareEntrytotalCost,
        spareEntrystockAvailable: row.spareEntrystockAvailable,
        spareEntrystockAfterEntry: row.spareEntrystockAfterEntry,
        spareEntryStatus: row.spareEntryStatus,
        loginId: row.loginId,
      },
    ];
  }
  // --------------------------
  // SAVE RECORD (SINGLE OR MULTIPLE)
  // --------------------------
  saveAllRecords() {
    // ---------------- VALIDATION ----------------
    const invalid = this.forms.some(
      (f) =>
        !f.spareEntryCode?.trim() ||
        !f.spareEntryDate ||
        !f.spareEntryType ||
        !f.spareEntrycallId ||
        !f.spareEntryassetId ||
        !f.spareEntryclientName ||
        !f.spareEntryengineerName ||
        !f.department ||
        !f.spareEntryCategory ||
        !f.spareEntryName ||
        f.spareEntryquantityUsed == null ||
        !f.spareEntryserialNumber,
    );

    if (invalid) {
      this.showErrors = true;
      this.toast.warning('Please fill all required fields!', 'error', 4000);
      return;
    }

    // ---------------- EDIT MODE (UPDATE) ----------------
    if (this.isEditMode && this.editIndex !== null) {
      const form = this.forms[0];

      const payload = {
        spareEntryCode: form.spareEntryCode,
        spareEntryDate: form.spareEntryDate,
        spareEntryType: form.spareEntryType,
        spareEntrycallId: form.spareEntrycallId,
        spareEntryassetId: form.spareEntryassetId,
        spareEntryclientName: form.spareEntryclientName,
        spareEntryengineerName: form.spareEntryengineerName,
        department: form.department,
        spareEntryCategory: form.spareEntryCategory,
        spareEntryName: form.spareEntryName,
        spareEntryCompatibleAssetType: form.spareEntryCompatibleAssetType,
        spareEntryquantityUsed: form.spareEntryquantityUsed,
        spareEntryunit: form.spareEntryunit,
        spareEntryserialNumber: form.spareEntryserialNumber,
        spareEntrywarrantyApplicable: form.spareEntrywarrantyApplicable,
        spareEntryremarks: form.spareEntryremarks,
        spareEntryunitCost: form.spareEntryunitCost,
        spareEntrytotalCost: form.spareEntrytotalCost,
        spareEntrystockAvailable: form.spareEntrystockAvailable,
        spareEntrystockAfterEntry: form.spareEntrystockAfterEntry,
        spareEntryStatus: form.spareEntryStatus,
        loginId: form.loginId || this.loginId,
      };

      const spareEntryId = this.tableData[this.editIndex].spareEntryId;

      this.commonService
        .updateSpareEntry(spareEntryId, this.loginId, payload)
        .subscribe({
          next: () => {
            this.toast.success(
              'Spare Entry Updated Successfully!',
              'success',
              4000,
            );
            this.resetAfterSave();
            this.loadSpareEntry();
          },
          error: () => {
            this.toast.danger('Update failed!', 'error', 4000);
          },
        });

      return;
    }

    // ---------------- ADD MODE (SAVE) ----------------
    const payload = this.forms.map((f) => ({
      spareEntryCode: f.spareEntryCode,
      spareEntryDate: f.spareEntryDate,
      spareEntryType: f.spareEntryType,
      spareEntrycallId: f.spareEntrycallId,
      spareEntryassetId: f.spareEntryassetId,
      spareEntryclientName: f.spareEntryclientName,
      spareEntryengineerName: f.spareEntryengineerName,
      department: f.department,
      spareEntryCategory: f.spareEntryCategory,
      spareEntryName: f.spareEntryName,
      spareEntryCompatibleAssetType: f.spareEntryCompatibleAssetType, // 🔥 IMPORTANT
      spareEntryquantityUsed: f.spareEntryquantityUsed,
      spareEntryunit: f.spareEntryunit,
      spareEntryserialNumber: f.spareEntryserialNumber,
      spareEntrywarrantyApplicable: f.spareEntrywarrantyApplicable,
      spareEntryremarks: f.spareEntryremarks,
      spareEntryunitCost: f.spareEntryunitCost,
      spareEntrytotalCost: f.spareEntrytotalCost,
      spareEntrystockAvailable: f.spareEntrystockAvailable,
      spareEntrystockAfterEntry: f.spareEntrystockAfterEntry,
      spareEntryStatus: f.spareEntryStatus,
      loginId: f.loginId || this.loginId,
    }));

    console.log('SPARE ENTRY PAYLOAD 👉', payload); // 🔥 DEBUG

    this.commonService.submit_multiple_spare_entry(payload).subscribe({
      next: (res) => {
        if (res?.dublicateMessages?.length) {
          res.dublicateMessages.forEach((msg: string) =>
            this.toast.warning(msg, 'warning', 4000),
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
        spareEntryCode: '',
        spareEntryDate: '',
        spareEntryType: '',
        spareEntrycallId: '',
        spareEntryassetId: '',
        spareEntryclientName: '',
        spareEntryengineerName: '',
        department: '',
        spareEntryCategory: '',
        spareEntryName: '',
        spareEntryCompatibleAssetType: '',
        spareEntryquantityUsed: null,
        spareEntryunit: '',
        spareEntryserialNumber: '',
        spareEntrywarrantyApplicable: '',
        spareEntryremarks: '',
        spareEntryunitCost: null,
        spareEntrytotalCost: null,
        spareEntrystockAvailable: null,
        spareEntrystockAfterEntry: null,
        spareEntryStatus: 'Active',
        loginId: '',
      },
    ];

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
      spareEntryCode: '',
      spareEntryDate: today,
      spareEntryType: '',
      spareEntrycallId: '',
      spareEntryassetId: '',
      spareEntryclientName: '',
      spareEntryengineerName: '',
      department: '',
      spareEntryCategory: '',
      spareEntryName: '',
      spareEntryCompatibleAssetType: '',
      spareEntryquantityUsed: null,
      spareEntryunit: '',
      spareEntryserialNumber: '',
      spareEntrywarrantyApplicable: '',
      spareEntryremarks: '',
      spareEntryunitCost: null,
      spareEntrytotalCost: null,
      spareEntrystockAvailable: null,
      spareEntrystockAfterEntry: null,
      spareEntryStatus: 'Active',
      loginId: this.loginId,
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
        // ✅ UI Binding
        spareEntryCode: '',
        spareEntryDate: currentDate,
        spareEntryType: '',
        spareEntrycallId: '',
        spareEntryassetId: '',
        spareEntryclientName: '',
        spareEntryengineerName: '',
        department: '',
        spareEntryCategory: '',
        spareEntryName: '',
        spareEntryCompatibleAssetType: '',
        spareEntryquantityUsed: null,
        spareEntryunit: '',
        spareEntryserialNumber: '',
        spareEntrywarrantyApplicable: '',
        spareEntryremarks: '',
        spareEntryunitCost: null,
        spareEntrytotalCost: null,
        spareEntrystockAvailable: null,
        spareEntrystockAfterEntry: null,
        spareEntryStatus: 'Active',
        loginId: '',

        // ✅ Backend Save Logic
        newRecord: {
          spareEntryId: '',
          spareEntryCode: '',
          spareEntryDate: currentDate,
          spareEntryType: '',
          spareEntrycallId: '',
          spareEntryassetId: '',
          spareEntryclientName: '',
          spareEntryengineerName: '',
          department: '',
          spareEntryCategory: '',
          spareEntryName: '',
          spareEntryCompatibleAssetType: '',
          spareEntryquantityUsed: null,
          spareEntryunit: '',
          spareEntryserialNumber: '',
          spareEntrywarrantyApplicable: '',
          spareEntryremarks: '',
          spareEntryunitCost: null,
          spareEntrytotalCost: null,
          spareEntrystockAvailable: null,
          spareEntrystockAfterEntry: null,
          spareEntryStatus: 'Active',
          loginId: '',
        },
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
    // जर start किंवा end date नाही दिली तर संपूर्ण data दाखवा
    if (!this.startDate || !this.endDate) {
      this.filteredData = [...this.tableData];
      return;
    }

    const start = this.convertToDate(this.startDate);
    const end = this.convertToDate(this.endDate);

    this.filteredData = this.tableData.filter((item: TableRow) => {
      // 🔹 Spare Entry साठी date field वापरा
      const itemDate = this.convertToDate(item.spareEntryDate);
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

      json.forEach((obj: any, i) => {
        const row: TableRow = {
          spareEntryId: obj['ID'] || '',
          spareEntryCode: obj['Spare Entry Code'] || '',
          spareEntryDate: obj['Date'] || '',
          spareEntryType: obj['Entry Type'] || '',
          spareEntrycallId: obj['Call ID'] || '',
          spareEntryassetId: obj['Asset ID'] || '',
          spareEntryclientName: obj['Client Name'] || '',
          spareEntryengineerName: obj['Engineer Name'] || '',
          department: obj['Department'] || '',
          spareEntryCategory: obj['Spare Category'] || '',
          spareEntryName: obj['Spare Name'] || '',
          spareEntryCompatibleAssetType: obj['Compatible Asset Type'] || '',
          spareEntryquantityUsed: obj['Quantity Used'] || 0,
          spareEntryunit: obj['Unit'] || '',
          spareEntryserialNumber: obj['Serial Number'] || '',
          spareEntrywarrantyApplicable: obj['Warranty Applicable'] || 'No',
          spareEntryremarks: obj['Remarks'] || '',
          spareEntryunitCost: obj['Unit Cost'] || 0,
          spareEntrytotalCost: obj['Total Cost'] || 0,
          spareEntrystockAvailable: obj['Stock Available'] || 0,
          spareEntrystockAfterEntry: obj['Stock After Entry'] || 0,
          spareEntryStatus: obj['Status'] || 'Active',
          loginId: this.loginId || '',
        };

        this.tableData.push(row);
      });

      this.filteredData = [...this.tableData];
      this.toast.success(
        'Spare Entry Excel imported successfully!',
        'success',
        4000,
      );
    };

    reader.readAsBinaryString(file);
  }

  // ---------------- TXT Parsing ----------------
  readTXT(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      let text = reader.result as string;

      // Remove header line (update column names for Spare Entry)
      text = text
        .replace(
          /ID\s+Spare Entry Code\s+Entry Type\s+Call ID\s+Asset ID\s+Client Name\s+Engineer Name\s+Department\s+Spare Category\s+Spare Name\s+Compatible Asset Type\s+Quantity Used\s+Unit\s+Serial Number\s+Warranty Applicable\s+Remarks\s+Unit Cost\s+Total Cost\s+Stock Available\s+Stock After Entry\s+Status/i,
          '',
        )
        .trim();

      // Split rows based on Status (Active / Inactive)
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

        if (parts.length < 21) {
          // check number of fields
          console.warn('Invalid row:', r);
          return;
        }

        const [
          spareEntryId,
          spareEntryCode,
          spareEntryType,
          spareEntryDate,
          spareEntrycallId,
          spareEntryassetId,
          spareEntryclientName,
          spareEntryengineerName,
          department,
          spareEntryCategory,
          spareEntryName,
          spareEntryCompatibleAssetType,
          spareEntryquantityUsed,
          spareEntryunit,
          spareEntryserialNumber,
          spareEntrywarrantyApplicable,
          spareEntryremarks,
          spareEntryunitCost,
          spareEntrytotalCost,
          spareEntrystockAvailable,
          spareEntrystockAfterEntry,
          spareEntryStatus,
        ] = parts;

        const row: TableRow = {
          spareEntryId,
          spareEntryCode,
          spareEntryType,
          spareEntrycallId,
          spareEntryassetId,
          spareEntryclientName,
          spareEntryengineerName,
          department,
          spareEntryCategory,
          spareEntryName,
          spareEntryCompatibleAssetType,
          spareEntryquantityUsed: Number(spareEntryquantityUsed),
          spareEntryunit,
          spareEntryserialNumber,
          spareEntrywarrantyApplicable,
          spareEntryremarks,
          spareEntryunitCost: Number(spareEntryunitCost),
          spareEntrytotalCost: Number(spareEntrytotalCost),
          spareEntrystockAvailable: Number(spareEntrystockAvailable),
          spareEntrystockAfterEntry: Number(spareEntrystockAfterEntry),
          spareEntryStatus: spareEntryStatus as 'Active' | 'Inactive',

          // 🔥 ADD THIS LINE
          spareEntryDate: spareEntryDate || '', // <-- assign from TXT / default ''

          loginId: this.loginId || '',
        };

        this.tableData.push(row);
      });

      this.filteredData = [...this.tableData];
      this.toast.success(
        'Spare Entry TXT imported successfully!',
        'success',
        4000,
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
      if (i === 0) return; // Skip header

      const cells = Array.from(row.querySelectorAll('td')).map(
        (c) => c.textContent?.trim() || '',
      );

      // Ensure minimum required columns
      while (cells.length < 23) cells.push(''); // 23 fields in TableRow

      const newRecord: TableRow = {
        spareEntryId: cells[0],
        spareEntryCode: cells[1],
        spareEntryDate: cells[2],
        spareEntryType: cells[3],
        spareEntrycallId: cells[4],
        spareEntryassetId: cells[5],
        spareEntryclientName: cells[6],
        spareEntryengineerName: cells[7],
        department: cells[8],
        spareEntryStatus: cells[9],
        spareEntryCategory: cells[10],
        spareEntryName: cells[11],
        spareEntryCompatibleAssetType: cells[12],
        spareEntryquantityUsed: Number(cells[13]) || 0,
        spareEntryunit: cells[14],
        spareEntryserialNumber: cells[15],
        spareEntrywarrantyApplicable: cells[16],
        spareEntryremarks: cells[17],
        spareEntryunitCost: Number(cells[18]) || 0,
        spareEntrytotalCost: Number(cells[19]) || 0,
        spareEntrystockAvailable: Number(cells[20]) || 0,
        spareEntrystockAfterEntry: Number(cells[21]) || 0,
        loginId: cells[22],
      };

      this.tableData.push(newRecord);
    });

    this.filteredData = [...this.tableData];

    this.toast.success(
      'DOCX Spare Entries imported successfully!',
      'success',
      4000,
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

    // Normalize some corrupted text if needed
    fullText = fullText.replace(/\s+/g, ' ').trim();

    // ⚡ Expected Row Format in PDF (23 columns for SpareEntry):
    // spareEntryId spareEntryCode spareEntryDate spareEntryType spareEntrycallId
    // spareEntryassetId spareEntryclientName spareEntryengineerName spareEntrydepartment
    // spareEntryStatus spareEntryCategory spareEntryName spareEntryCompatibleAssetType
    // spareEntryquantityUsed spareEntryunit spareEntryserialNumber spareEntrywarrantyApplicable
    // spareEntryremarks spareEntryunitCost spareEntrytotalCost spareEntrystockAvailable
    // spareEntrystockAfterEntry loginId

    const rowRegex =
      /(\S+)\s+(\S+)\s+(\d{2}-\d{2}-\d{4})\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\d+)\s+(\S+)/g;

    let match;
    while ((match = rowRegex.exec(fullText)) !== null) {
      const row: TableRow = {
        spareEntryId: match[1],
        spareEntryCode: match[2],
        spareEntryDate: match[3],
        spareEntryType: match[4],
        spareEntrycallId: match[5],
        spareEntryassetId: match[6],
        spareEntryclientName: match[7],
        spareEntryengineerName: match[8],
        department: match[9],
        spareEntryStatus: match[10],
        spareEntryCategory: match[11],
        spareEntryName: match[12],
        spareEntryCompatibleAssetType: match[13],
        spareEntryquantityUsed: Number(match[14]) || 0,
        spareEntryunit: match[15],
        spareEntryserialNumber: match[16],
        spareEntrywarrantyApplicable: match[17],
        spareEntryremarks: match[18],
        spareEntryunitCost: Number(match[19]) || 0,
        spareEntrytotalCost: Number(match[20]) || 0,
        spareEntrystockAvailable: Number(match[21]) || 0,
        spareEntrystockAfterEntry: Number(match[22]) || 0,
        loginId: match[23],
      };

      this.tableData.push(row);
    }

    this.filteredData = [...this.tableData];

    this.toast.success(
      'PDF Spare Entries imported successfully!',
      'success',
      4000,
    );

    console.log('FINAL SPARE ENTRY ROWS:', this.tableData);
  }
  // ---------------- Download Sample CSV ----------------

  downloadSampleCSV() {
    if (!this.tableData.length) {
      this.toast.danger('No data to download!', 'error', 4000);
      return;
    }

    // CSV Headers as per SpareEntry TableRow
    const headers = [
      'Spare Entry ID',
      'Spare Entry Code',
      'Entry Date',
      'Entry Type',
      'Call ID',
      'Asset ID',
      'Client Name',
      'Engineer Name',
      'Department',
      'Spare Entry Status',
      'Spare Category',
      'Spare Name',
      'Compatible Asset Type',
      'Quantity Used',
      'Unit',
      'Serial Number',
      'Warranty Applicable',
      'Remarks',
      'Unit Cost',
      'Total Cost',
      'Stock Available',
      'Stock After Entry',
      'Login ID',
    ];

    const csvRows = [headers.join(',')];

    this.tableData.forEach((row: TableRow) => {
      const rowData = [
        row.spareEntryId,
        row.spareEntryCode,
        row.spareEntryDate,
        row.spareEntryType,
        row.spareEntrycallId,
        row.spareEntryassetId,
        row.spareEntryclientName,
        row.spareEntryengineerName,
        row.department,
        row.spareEntryStatus,
        row.spareEntryCategory,
        row.spareEntryName,
        row.spareEntryCompatibleAssetType,
        row.spareEntryquantityUsed,
        row.spareEntryunit,
        row.spareEntryserialNumber,
        row.spareEntrywarrantyApplicable,
        row.spareEntryremarks,
        row.spareEntryunitCost,
        row.spareEntrytotalCost,
        row.spareEntrystockAvailable,
        row.spareEntrystockAfterEntry,
        row.loginId,
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

    // ⭐ Row 1 → Company / Login ID
    csvRows.push(this.loginId || 'Company Name');

    // ⭐ Row 2 → Date
    csvRows.push(`Date:,${formattedDate}`);

    // Empty row for spacing
    csvRows.push('');

    // ⭐ Header (as per SpareEntry TableRow)
    const headers = [
      'Spare Entry ID',
      'Spare Entry Code',
      'Entry Date',
      'Entry Type',
      'Call ID',
      'Asset ID',
      'Client Name',
      'Engineer Name',
      'Department',
      'Spare Entry Status',
      'Spare Category',
      'Spare Name',
      'Compatible Asset Type',
      'Quantity Used',
      'Unit',
      'Serial Number',
      'Warranty Applicable',
      'Remarks',
      'Unit Cost',
      'Total Cost',
      'Stock Available',
      'Stock After Entry',
      'Login ID',
    ];
    csvRows.push(headers.join(','));

    // ⭐ Data rows
    data.forEach((row: TableRow) => {
      const rowData = [
        row.spareEntryId,
        row.spareEntryCode,
        row.spareEntryDate,
        row.spareEntryType,
        row.spareEntrycallId,
        row.spareEntryassetId,
        row.spareEntryclientName,
        row.spareEntryengineerName,
        row.department,
        row.spareEntryStatus,
        row.spareEntryCategory,
        row.spareEntryName,
        row.spareEntryCompatibleAssetType,
        row.spareEntryquantityUsed,
        row.spareEntryunit,
        row.spareEntryserialNumber,
        row.spareEntrywarrantyApplicable,
        row.spareEntryremarks,
        row.spareEntryunitCost,
        row.spareEntrytotalCost,
        row.spareEntrystockAvailable,
        row.spareEntrystockAfterEntry,
        row.loginId,
      ];

      csvRows.push(rowData.join(','));
    });

    // Create CSV and trigger download
    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'Filtered_Spare_Entries_Report.csv');
  }

  // ---------------- Excel Export ----------------
  exportFilteredExcel(data: TableRow[]) {
    const wsData: any[][] = [];

    // ⭐ Row 1 → Company Name
    wsData.push([this.loginId || 'Company Name']);

    // ⭐ Row 2 → Date
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    wsData.push(['Date:', formattedDate]);

    // ⭐ Empty Row
    wsData.push([]);

    // ⭐ Header (as per Spare Entry TableRow)
    wsData.push([
      'Spare Entry ID',
      'Spare Entry Code',
      'Entry Date',
      'Entry Type',
      'Call ID',
      'Asset ID',
      'Client Name',
      'Engineer Name',
      'Department',
      'Spare Entry Status',
      'Spare Category',
      'Spare Name',
      'Compatible Asset Type',
      'Quantity Used',
      'Unit',
      'Serial Number',
      'Warranty Applicable',
      'Remarks',
      'Unit Cost',
      'Total Cost',
      'Stock Available',
      'Stock After Entry',
      'Login ID',
    ]);

    // ⭐ Data Rows
    data.forEach((row: TableRow) => {
      wsData.push([
        row.spareEntryId,
        row.spareEntryCode,
        row.spareEntryDate,
        row.spareEntryType,
        row.spareEntrycallId,
        row.spareEntryassetId,
        row.spareEntryclientName,
        row.spareEntryengineerName,
        row.department,
        row.spareEntryStatus,
        row.spareEntryCategory,
        row.spareEntryName,
        row.spareEntryCompatibleAssetType,
        row.spareEntryquantityUsed,
        row.spareEntryunit,
        row.spareEntryserialNumber,
        row.spareEntrywarrantyApplicable,
        row.spareEntryremarks,
        row.spareEntryunitCost,
        row.spareEntrytotalCost,
        row.spareEntrystockAvailable,
        row.spareEntrystockAfterEntry,
        row.loginId,
      ]);
    });

    // Create worksheet
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    // ⭐ Adjust column widths (example)
    worksheet['!cols'] = [
      { wch: 15 }, // Spare Entry ID
      { wch: 20 }, // Spare Entry Code
      { wch: 15 }, // Entry Date
      { wch: 15 }, // Entry Type
      { wch: 12 }, // Call ID
      { wch: 12 }, // Asset ID
      { wch: 20 }, // Client Name
      { wch: 20 }, // Engineer Name
      { wch: 18 }, // Department
      { wch: 18 }, // Spare Entry Status
      { wch: 15 }, // Spare Category
      { wch: 20 }, // Spare Name
      { wch: 20 }, // Compatible Asset Type
      { wch: 12 }, // Quantity Used
      { wch: 10 }, // Unit
      { wch: 18 }, // Serial Number
      { wch: 18 }, // Warranty Applicable
      { wch: 25 }, // Remarks
      { wch: 12 }, // Unit Cost
      { wch: 12 }, // Total Cost
      { wch: 12 }, // Stock Available
      { wch: 12 }, // Stock After Entry
      { wch: 15 }, // Login ID
    ];

    // Create workbook
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Spare Entries');

    // Export
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
    const doc = new jsPDF('p', 'pt', 'a4');

    // ⭐ Title
    doc.setFontSize(22);
    doc.setTextColor(0, 70, 140);

    const pageWidth = doc.internal.pageSize.getWidth();
    const titleX = pageWidth / 2;

    doc.text('Spare Entry Records', titleX, 60, { align: 'center' });

    const titleWidth = doc.getTextWidth('Spare Entry Records');
    doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

    // ⭐ Company + Date
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);

    const today = new Date();
    const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    doc.text(this.loginId || 'Company Name', 40, 100);
    doc.text(dateStr, pageWidth - 40, 100, { align: 'right' });

    // ⭐ Table
    autoTable(doc, {
      startY: 120,
      head: [
        [
          'Spare Entry ID',
          'Code',
          'Entry Date',
          'Type',
          'Call ID',
          'Asset ID',
          'Client Name',
          'Engineer Name',
          'Department',
          'Status',
          'Category',
          'Spare Name',
          'Compatible Asset Type',
          'Qty Used',
          'Unit',
          'Serial No.',
          'Warranty',
          'Remarks',
          'Unit Cost',
          'Total Cost',
          'Stock Available',
          'Stock After Entry',
          'Login ID',
        ],
      ],
      body: data.map((row: TableRow) => [
        row.spareEntryId,
        row.spareEntryCode,
        row.spareEntryDate,
        row.spareEntryType,
        row.spareEntrycallId,
        row.spareEntryassetId,
        row.spareEntryclientName,
        row.spareEntryengineerName,
        row.department,
        row.spareEntryStatus,
        row.spareEntryCategory,
        row.spareEntryName,
        row.spareEntryCompatibleAssetType,
        row.spareEntryquantityUsed,
        row.spareEntryunit,
        row.spareEntryserialNumber,
        row.spareEntrywarrantyApplicable,
        row.spareEntryremarks,
        row.spareEntryunitCost,
        row.spareEntrytotalCost,
        row.spareEntrystockAvailable,
        row.spareEntrystockAfterEntry,
        row.loginId,
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
        cellPadding: 2,
      },
      // Optional: Split table across pages automatically
      didDrawPage: (dataArg) => {
        // Could add page numbers here if needed
      },
    });

    doc.save('Filtered_Spare_Entries_Report.pdf');
  }
}
