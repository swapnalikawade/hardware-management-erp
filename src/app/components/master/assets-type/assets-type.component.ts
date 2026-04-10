/*
 **************************************************************************************
 * Program Name  : AssetsTypeComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 09, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Asset Type Master Management.
 *
 * Description   : This component manages Asset Type master data including:
 *                 - Fetch all asset types based on Login ID
 *                 - Add single/multiple asset type records
 *                 - Update existing asset type records
 *                 - Delete single/multiple records
 *                 - Warranty management (Start/End/Duration)
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (CSV, Excel, TXT, DOCX, PDF)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling (multi-record support)
 *   - Validation using NgForm
 *   - Warranty calculation (auto duration)
 *   - Date validation and formatting (DD-MM-YYYY)
 *   - File parsing using XLSX, Mammoth, pdfjs
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *
 * Endpoints Used:
 *   - GET    /asset-type/getAllAssetTypeByLoginId/{prefix}/{year}/{code}
 *   - POST   /asset-type/saveAll
 *   - PUT    /asset-type/update/{prefix}/{year}/{code}
 *   - POST   /asset-type/delete-multiple-assetType
 *   - POST   /asset-type/import
 *
 * Called From   : Asset Type UI (Frontend)
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

import { AuthService } from '../../../services/auth/auth-service';
import { CommonService } from '../../../services/common/common-service';
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
export interface TableRow {
  assetTypeId: string;
  assetTypeCode: string;
  assetTypeName: string;
  assetCategory: string;

  warrantyApplicable: string;      // Yes / No
  warrantyDuration: string;        // e.g. 12
  warrantyUnit: string;            // Months / Years

  createdBy: string;
  createdDate: string;             // LocalDate → string
  updatedDate: string;

  status: 'Active' | 'Inactive';   // ✅ correct mapping
}

@Component({
  selector: 'app-assets-type',
  standalone: false,
  templateUrl: './assets-type.component.html',
  styleUrls: ['./assets-type.component.css'],
})
export class AssetsTypeComponent implements OnInit {
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
  headCompanyId: any | null = null;
  loginId: any | null = null;

  activeTab = 'details';
  today = new Date();
  form: any = {};
  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;
  assetTypes: TableRow[] = [];
  loading: any = false;

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

    this.filteredData = [...this.tableData];
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }
private initializeForm(): void {
  this.forms = [
    {
      assetTypeId: '',
      assetTypeCode: '',
      assetTypeName: '',
      assetCategory: '',

      warrantyApplicable: '',      // Yes / No
      warrantyDuration: '',
      warrantyUnit: '',

        createdBy: this.loginId,   // ✅ FIX|| '',
      createdDate: this.currentDate || '',
      updatedDate: '',

      status: 'Active',

      newRecord: {
        assetTypeId: '0',
        assetTypeCode: '',
        assetTypeName: '',
        assetCategory: '',

        warrantyApplicable: '',
        warrantyDuration: '',
        warrantyUnit: '',

        createdBy: this.loginId || '',
        createdDate: this.currentDate || '',
        updatedDate: '',

        status: 'Active',
      },
    },
  ];
}
 loadAssetTypes(): void {
  if (!this.loginId) return;

  this.commonService.fetchAssetTypeByLoginId(this.loginId).subscribe({
    next: (res: any) => {
      console.log('API RESPONSE:', res);

      const list = Array.isArray(res) ? res : res?.data || [];

      this.tableData = list.map((item: any) => ({
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

        status: item.status ?? 'Active',   // ✅ correct field
      }));

      this.filteredData = [...this.tableData];
    },

    error: (err) => {
      console.error('Asset Type API Error:', err);
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

    // 🔥 Collect assetTypeIds
    const ids: string[] = this.selectedRows.map((row) => row.assetTypeId);

    this.commonService.deleteMultipleAssetType(ids).subscribe({
      next: () => {
        // remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.assetTypeId),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];
        this.currentPage = 1;

        this.loadAssetTypes(); // reload list

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

  // Company Name
  wsData.push([this.headCompanyName || 'Company Name']);

  // Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  wsData.push([]);

  // ✅ Header (updated)
  wsData.push([
    'Asset Type ID',
    'Asset Type Code',
    'Asset Type Name',
    'Asset Category',
    'Warranty Applicable',
    'Warranty Duration',
    'Warranty Unit',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ]);

  // ✅ Rows (updated mapping)
  this.tableData.forEach((row) => {
    wsData.push([
      row.assetTypeId,
      row.assetTypeCode,
      row.assetTypeName,
      row.assetCategory,
      row.warrantyApplicable,
      row.warrantyDuration,
      row.warrantyUnit,
      row.createdDate,
      row.updatedDate,
      row.createdBy,
      row.status,
    ]);
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset Type');

  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Asset_Type_Report.xlsx');
}
 exportDoc() {
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

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

      <h2>Asset Type Records</h2>

      <div class="header-info">
        <div>${this.headCompanyName}</div>
        <div>${formattedDate}</div>
      </div>

      <table>

        <tr>
          <th>Asset Type ID</th>
          <th>Code</th>
          <th>Name</th>
          <th>Category</th>
          <th>Warranty Applicable</th>
          <th>Warranty Duration</th>
          <th>Warranty Unit</th>
          <th>Created Date</th>
          <th>Updated Date</th>
          <th>Created By</th>
          <th>Status</th>
        </tr>
  `;

  this.tableData.forEach((row) => {
    const statusClass =
      row.status === 'Active'
        ? 'status-active'
        : 'status-inactive';

    const statusIcon = row.status === 'Active' ? '✔️' : '❌';

    content += `
      <tr>

        <td>${row.assetTypeId}</td>
        <td>${row.assetTypeCode}</td>
        <td>${row.assetTypeName}</td>
        <td>${row.assetCategory}</td>
        <td>${row.warrantyApplicable}</td>
        <td>${row.warrantyDuration}</td>
        <td>${row.warrantyUnit}</td>
        <td>${row.createdDate}</td>
        <td>${row.updatedDate}</td>
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

  const blob = new Blob(['\ufeff', content], { type: 'application/msword' });

  saveAs(blob, 'Asset_Type_Report.doc');
}

 exportPDF() {
  const doc = new jsPDF('p', 'pt', 'a4');

  // TITLE
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Asset Type Records', titleX, 60, { align: 'center' });

  // Underline
  const titleWidth = doc.getTextWidth('Asset Type Records');
  doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

  // Company + Date
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);

  const company = this.headCompanyName || 'Company Name';
  const dateStr = new Date().toLocaleDateString();

  const leftX = 40;
  const topY = 100;

  doc.text(company, leftX, topY);
  doc.text(dateStr, pageWidth - 40, topY, { align: 'right' });

  // ✅ TABLE (Updated)
  autoTable(doc, {
    startY: 120,

    head: [
      [
        'Asset Type ID',
        'Code',
        'Name',
        'Category',
        'Warranty Applicable',
        'Warranty Duration',
        'Warranty Unit',
        'Created Date',
        'Updated Date',
        'Created By',
        'Status',
      ],
    ],

    body: this.tableData.map((row) => [
      row.assetTypeId,
      row.assetTypeCode,
      row.assetTypeName,
      row.assetCategory,
      row.warrantyApplicable,
      row.warrantyDuration,
      row.warrantyUnit,
      row.createdDate,
      row.updatedDate,
      row.createdBy,
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

    // ✅ Status color logic
    didParseCell: function (data) {
      if (data.column.index === 10) {
        if (data.cell.raw === 'Active') {
          data.cell.styles.textColor = [0, 150, 0];
        } else {
          data.cell.styles.textColor = [200, 0, 0];
        }
      }
    },
  });

  doc.save('Asset_Type_Report.pdf');
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

 newRecord: TableRow = {
  assetTypeId: '0',
  assetTypeCode: '',
  assetTypeName: '',
  assetCategory: '',

  warrantyApplicable: '',   // Yes / No
  warrantyDuration: '',
  warrantyUnit: '',

  createdBy: this.loginId || '',
  createdDate: this.currentDate || '',
  updatedDate: '',

  status: 'Active',
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
        assetTypeId: row.assetTypeId,
        assetTypeCode: row.assetTypeCode,
        assetTypeName: row.assetTypeName,
        assetCategory: row.assetCategory,

        warrantyApplicable: row.warrantyApplicable,
        warrantyDuration: row.warrantyDuration,
        warrantyUnit: row.warrantyUnit,

        createdBy: row.createdBy,
        createdDate: row.createdDate,
        updatedDate: row.updatedDate,

        status: row.status,
      },
    },
  ];
}
saveAllRecords(form?: NgForm) {

  // ---------------- VALIDATION ----------------
  const invalid = this.forms.some((f) => {
    const rec = f.newRecord;

    if (
      !rec.assetTypeCode?.trim() ||
      !rec.assetTypeName?.trim() ||
      !rec.assetCategory?.trim() ||
      !rec.warrantyApplicable?.trim() ||
      !rec.status?.trim()
    ) {
      return true;
    }

    // 👉 Warranty YES असेल तर duration & unit required
  if (rec.warrantyApplicable === 'Yes') {
  if (
    !rec.warrantyDuration ||   // ✅ FIX
    !rec.warrantyUnit?.trim()
  ) {
    return true;
  }
}
    return false;
  });

  if (invalid) {
    this.showErrors = true;
    this.toast.warning('Please fill all required fields!', 'error', 4000);
    return;
  }

  // ---------------- EDIT MODE ----------------
  if (this.isEditMode && this.editIndex !== null) {
    const rec = this.forms[0].newRecord;

    const payload = {
      assetTypeCode: rec.assetTypeCode,
      assetTypeName: rec.assetTypeName,
      assetCategory: rec.assetCategory,

      warrantyApplicable: rec.warrantyApplicable,

      warrantyDuration:
        rec.warrantyApplicable === 'Yes'
          ? rec.warrantyDuration
          : null,

      warrantyUnit:
        rec.warrantyApplicable === 'Yes'
          ? rec.warrantyUnit
          : null,

     status: 'Active',
      updatedDate: this.currentDate,
      createdBy: this.userName,
    };

    const assetTypeId = this.tableData[this.editIndex].assetTypeId;

    this.commonService.updateAssetType(assetTypeId, payload).subscribe({
      next: () => {
        this.toast.success('Record Updated Successfully!', 'success', 4000);
        this.resetAfterSave();
        this.loadAssetTypes();
      },
      error: () => {
        this.toast.danger(
          'Update failed. Service unavailable!',
          'error',
          4000,
        );
      },
    });

    return;
  }

  // ---------------- ADD MODE ----------------
  const payload = this.forms.map((f) => {
    const rec = f.newRecord;

    return {
      assetTypeCode: rec.assetTypeCode,
      assetTypeName: rec.assetTypeName,
      assetCategory: rec.assetCategory,

      warrantyApplicable: rec.warrantyApplicable,

      warrantyDuration:
        rec.warrantyApplicable === 'Yes'
          ? rec.warrantyDuration
          : null,

      warrantyUnit:
        rec.warrantyApplicable === 'Yes'
          ? rec.warrantyUnit
          : null,

status: 'Active',
      createdDate: this.currentDate,
      createdBy: this.userName,
    };
  });

  this.commonService.submitAssetType(payload).subscribe({
    next: (res) => {
      if (res?.dublicateMessages?.length) {
        res.dublicateMessages.forEach((msg: string) =>
          this.toast.warning(msg, 'warning', 4000),
        );
      }

      this.toast.success('Record Added Successfully!', 'success', 4000);
      this.resetAfterSave();
      this.loadAssetTypes();
    },
    error: () => {
      this.toast.danger(
        'Save failed. Asset Type service down!',
        'error',
        4000,
      );
    },
  });
}
resetAfterSave() {
  this.forms = [
    {
      newRecord: {
        assetTypeId: '0',
        assetTypeCode: '',
        assetTypeName: '',
        assetCategory: '',

        warrantyApplicable: '',   // Yes / No
        warrantyDuration: '',
        warrantyUnit: '',

        createdDate: this.currentDate,
        updatedDate: '',
        createdBy: this.userName,

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
      assetTypeId: '0',
      assetTypeCode: '',
      assetTypeName: '',
      assetCategory: '',

      warrantyApplicable: '',   // Yes / No
      warrantyDuration: '',
      warrantyUnit: '',

      createdDate: currentDate,
      updatedDate: '',
      createdBy: this.userName,

      status: 'Active',
    },
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
        assetTypeId: '0',
        assetTypeCode: '',
        assetTypeName: '',
        assetCategory: '',

        warrantyApplicable: '',   // Yes / No
        warrantyDuration: '',
        warrantyUnit: '',

        createdDate: currentDate,
        updatedDate: '',
        createdBy: this.userName,

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
        item.assetTypecreatedDate,
        this.startDate,
        this.endDate,
      ),
    );
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.toast.warning('Please select a file first!', 'warning', 4000);
      return;
    }

    this.loading = true;

    this.commonService.uploadAssetTypeExcel(this.selectedFile).subscribe({
      next: () => {
        this.loading = false;

        this.loadAssetTypes();

        this.toast.success('File imported successfully!', 'SUCCESS', 4000);
      },

      error: (err) => {
        this.loading = false;

        console.error(err);

        this.toast.danger('Import failed!', 'ERROR', 4000);
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
  //        assetstatus: values[headers.indexOf(' assetstatus')] || 'Active',
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
        assetTypeId: obj['Asset Type ID'] || '',

        assetTypeCode: obj['Asset Type Code'] || '',
        assetTypeName: obj['Asset Type Name'] || '',
        assetCategory: obj['Asset Category'] || '',

        warrantyApplicable: obj['Warranty Applicable'] || '',

        warrantyDuration: obj['Warranty Duration'] || '',
        warrantyUnit: obj['Warranty Unit'] || '',

        createdDate: obj['Created Date'] || this.currentDate,
        updatedDate: obj['Updated Date'] || '',

        createdBy: obj['Created By'] || this.userName,

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

  // ---------------- DOCX Parsing ----------------
readTXT(file: File) {
  const reader = new FileReader();

  reader.onload = () => {
    let text = reader.result as string;

    // Remove header (updated)
    text = text
      .replace(
        /Asset\s+Type\s+ID\s+Code\s+Name\s+Category\s+Warranty\s+Applicable\s+Duration\s+Unit\s+Created\s+Updated\s+By\s+Status/i,
        '',
      )
      .trim();

    // Split rows
    const rows = text
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r !== '');

    rows.forEach((r) => {
      const parts = r.split(/\s+/);

      if (parts.length < 7) {
        console.warn('Invalid row:', r);
        return;
      }

      const [
        assetTypeId,
        assetTypeCode,
        assetTypeName,
        assetCategory,
        warrantyApplicable,
        warrantyDuration,
        warrantyUnit,
      ] = parts;

      const row: TableRow = {
        assetTypeId: assetTypeId || '',
        assetTypeCode: assetTypeCode || '',
        assetTypeName: assetTypeName || '',
        assetCategory: assetCategory || '',

        warrantyApplicable: warrantyApplicable || '',
        warrantyDuration: warrantyDuration || '',
        warrantyUnit: warrantyUnit || '',

        createdDate: this.currentDate,
        updatedDate: '',
        createdBy: this.userName,

        status: 'Active',
      };

      this.tableData.push(row);
    });

    this.filteredData = [...this.tableData];

    this.toast.success('TXT imported successfully!', 'success', 4000);
  };

  reader.readAsText(file);
}

  // ---------------- PDF Parsing ----------------
  extract(text: string, regex: RegExp) {
    const m = text.match(regex);
    return m ? m[1].trim() : '';
  }
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
      (c) => c.textContent?.trim() || '',
    );

    const newRecord: TableRow = {
      assetTypeId: cells[0] || '',

      assetTypeCode: cells[1] || '',
      assetTypeName: cells[2] || '',
      assetCategory: cells[3] || '',

      warrantyApplicable: cells[4] || '',
      warrantyDuration: cells[5] || '',
      warrantyUnit: cells[6] || '',

      createdDate: this.currentDate,
      updatedDate: '',

      createdBy: this.userName,

      status: (cells[7] as 'Active' | 'Inactive') || 'Active',
    };

    this.tableData.push(newRecord);
  });

  this.filteredData = [...this.tableData];

  this.toast.success('DOCX table imported successfully!', 'success', 4000);
}
  // ---------------- Download Sample CSV ----------------
downloadSampleCSV() {
  if (!this.tableData.length) {
    this.toast.danger('No data to download!', 'error', 4000);
    return;
  }

  const headers = [
    'Asset Type ID',
    'Asset Type Code',
    'Asset Type Name',
    'Asset Category',
    'Warranty Applicable',
    'Warranty Duration',
    'Warranty Unit',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ];

  const csvRows = [headers.join(',')];

  // Table data export
  this.tableData.forEach((row) => {
    const rowData = [
      row.assetTypeId,
      row.assetTypeCode,
      row.assetTypeName,
      row.assetCategory,
      row.warrantyApplicable,
      row.warrantyDuration,
      row.warrantyUnit,
      row.createdDate,
      row.updatedDate,
      row.createdBy,
      row.status,
    ];

    csvRows.push(rowData.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);
  a.download = 'asset_type_data.csv';

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

  // Company Name
  csvRows.push(this.headCompanyName || 'Company Name');

  // Date
  csvRows.push(`Date:,${formattedDate}`);

  // Empty row
  csvRows.push('');

  // ✅ Header (updated)
  const headers = [
    'Asset Type ID',
    'Asset Type Code',
    'Asset Type Name',
    'Asset Category',
    'Warranty Applicable',
    'Warranty Duration',
    'Warranty Unit',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ];

  csvRows.push(headers.join(','));

  // ✅ Data rows (updated mapping)
  data.forEach((row) => {
    const rowData = [
      row.assetTypeId,
      row.assetTypeCode,
      row.assetTypeName,
      row.assetCategory,
      row.warrantyApplicable,
      row.warrantyDuration,
      row.warrantyUnit,
      row.createdDate,
      row.updatedDate,
      row.createdBy,
      row.status,
    ];

    csvRows.push(rowData.join(','));
  });

  const csvData = csvRows.join('\n');

  const blob = new Blob([csvData], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Filtered_Asset_Type_Report.csv');
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

  // ✅ Header (updated)
  wsData.push([
    'Asset Type ID',
    'Asset Type Code',
    'Asset Type Name',
    'Asset Category',
    'Warranty Applicable',
    'Warranty Duration',
    'Warranty Unit',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ]);

  // ✅ Data rows (updated mapping)
  data.forEach((row) => {
    wsData.push([
      row.assetTypeId,
      row.assetTypeCode,
      row.assetTypeName,
      row.assetCategory,
      row.warrantyApplicable,
      row.warrantyDuration,
      row.warrantyUnit,
      row.createdDate,
      row.updatedDate,
      row.createdBy,
      row.status,
    ]);
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Asset Type');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Filtered_Asset_Type_Report.xlsx');
}
exportFilteredPDF(data: TableRow[]) {
  const doc = new jsPDF('l', 'pt', 'a4'); // landscape

  // Title
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Asset Type Records', titleX, 60, { align: 'center' });

  const titleWidth = doc.getTextWidth('Asset Type Records');
  doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

  // Company Name + Date
  doc.setFontSize(14);

  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  doc.text(this.headCompanyName || 'Company Name', 40, 100);
  doc.text(dateStr, pageWidth - 40, 100, { align: 'right' });

  // ✅ Table (updated)
  autoTable(doc, {
    startY: 120,

    head: [
      [
        'Asset Type ID',
        'Asset Type Code',
        'Asset Type Name',
        'Asset Category',
        'Warranty Applicable',
        'Warranty Duration',
        'Warranty Unit',
        'Created Date',
        'Updated Date',
        'Created By',
        'Status',
      ],
    ],

    body: data.map((row) => [
      row.assetTypeId,
      row.assetTypeCode,
      row.assetTypeName,
      row.assetCategory,
      row.warrantyApplicable,
      row.warrantyDuration,
      row.warrantyUnit,
      row.createdDate,
      row.updatedDate,
      row.createdBy,
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

    // ✅ Status color
    didParseCell: function (data) {
      if (data.column.index === 10) {
        if (data.cell.raw === 'Active') {
          data.cell.styles.textColor = [0, 150, 0];
        } else {
          data.cell.styles.textColor = [200, 0, 0];
        }
      }
    },
  });

  doc.save('Filtered_Asset_Type_Report.pdf');
}
  calculateWarrantyDuration(record: any) {
    if (record.assetTypeWarrantyStartDate && record.assetTypeWarrantyEndDate) {
      const start = new Date(record.assetTypeWarrantyStartDate);
      const end = new Date(record.assetTypeWarrantyEndDate);

      const diffTime = end.getTime() - start.getTime();

      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      const months = Math.floor(diffDays / 30);

      record.assetTypeWarrantyDuration = months + ' Months';
    }
  }
}
