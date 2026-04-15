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
  selector: 'app-my-asset',
  standalone: false,
  templateUrl: './my-asset.component.html',
  styleUrl: './my-asset.component.css',
})
export class MyAssetComponent {
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
  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;
  assetTypes: any[] = [];
  assetMakes: any[] = [];
  assetModels: any[] = [];
  loading: any = false;
  editIndex: number | null = null;
  isEditMode: boolean = false;
  loginId: any | null = null;
  forms: any[] = [];

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

  tabs = [
    { key: 'details', label: 'Details', icon: 'bi bi-building-fill' },
    //{ key: 'newRecord', label: 'New Record', icon: 'bi bi-plus-circle-fill' },
    //{
    //  key: 'bulkImport',
    //  label: 'Bulk Import',
    //  icon: 'bi bi-file-earmark-arrow-up-fill',
    //},
    //{
    //  key: 'bulkExport',
    //  label: 'Bulk Export',
    //  icon: 'bi bi-file-earmark-arrow-down-fill',
    //},
    { key: 'help', label: 'Help', icon: 'bi bi-question-circle-fill' },
  ];

  toastMessage: string | null = null;
  toastType: string = 'success';
ngOnInit(): void {

  /* ================= AUTH ================= */
  this.token = this.authService.getToken();
  this.userName = this.authService.getUsername();
  this.userRoles = this.authService.getUserRoles();
  this.date = this.authService.getCurrentDate();
  this.headCompanyName = this.authService.getEmployeeName();

  /* 🔥 FIX 1: loginId NULL CHECK */
  const rawId = this.authService.getEmployeeId();   // string | null

  if (!rawId) {
    console.error("Employee ID is null");
    this.toast.danger('Employee ID missing!', 'ERROR', 3000);
    return;
  }

  this.loginId = this.formatLoginId(rawId);   // ✅ safe now

  console.log("FINAL LOGIN ID:", this.loginId);

  /* ================= AUTH CHECK ================= */
  if (!this.token) {
    this.router.navigate(['/login-page']);
    return;
  }

  /* 🔥 FIX 2: DATE */
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  this.currentDate = `${yyyy}-${mm}-${dd}`;

  /* ================= INIT ================= */
  this.initializeForm();

  this.filteredData = [];

  /* 🔥 DATA LOAD */
  this.loadMyAsset();       // ✅ now correct loginId जाएगा
  this.loadDepartments();
}

 private initializeForm(): void {
  this.forms = [
    {
      /* ========= PRIMARY ========= */
      allocationId: '',
      allocationNumber: '',

      /* ========= EMPLOYEE ========= */
      employeeId: '',
      departmentId: '',
      location: '',

      /* ========= ASSET ========= */
      assetId: '',

      /* ========= DATES ========= */
      allocationDate: this.currentDate,
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
      createdBy: this.loginId,   // 🔥 VERY IMPORTANT
      createdDate: this.currentDate,
      updatedBy: '',
      updatedDate: '',

      /* ========= STATUS ========= */
      allocationStatus: 'Active'
    }
  ];
}
  loadDepartments(): void {
    this.commonService.fetchAllDepartments().subscribe({
      next: (res: any) => {
        console.log('Department Response:', res);

        const list = Array.isArray(res) ? res : res?.data || [];

        this.departments = list.map((item: any) => ({
          departmentCode: item.departmentCode ?? '',
          departmentName: item.departmentName ?? '',
        }));
      },

      error: (err) => {
        console.error('Department API Error:', err);
        this.toast.danger('Failed to load departments', 'Error', 3000);
      },
    });
  }
formatLoginId(id: string): string {
  if (!id) return '';

  // EMP002 → EMP/2026/002
  const prefix = id.substring(0, 3);
  const code = id.substring(3).padStart(3, '0');
  const year = new Date().getFullYear();

  return `${prefix}/${year}/${code}`;
}
loadMyAsset(): void {
  if (!this.loginId) {
    console.warn('Login ID missing');
    return;
  }

  this.commonService.fetchMyAssetByLoginId(this.loginId).subscribe({
    next: (res: any) => {
      console.log('My Asset Response:', res);

      const list = Array.isArray(res) ? res : res?.data || [];

      // ✅ FIXED MAPPING (TableRow interface अनुसार)
      this.tableData = list.map((item: any) => ({
        
        /* ========= PRIMARY ========= */
        allocationId: item.allocationId || '',
        allocationNumber: item.allocationNumber || '',

        /* ========= EMPLOYEE ========= */
        employeeId: item.employeeId || '',
        departmentId: item.departmentId || '',
        location: item.location || '',

        /* ========= ASSET ========= */
        assetId: item.assetId || '',

        /* ========= DATES ========= */
        allocationDate: item.allocationDate || '',
        expectedReturnDate: item.expectedReturnDate || '',
        actualReturnDate: item.actualReturnDate || '',

        /* ========= CONDITION ========= */
        conditionAtIssue: item.conditionAtIssue || '',
        conditionAtReturn: item.conditionAtReturn || '',

        /* ========= BUSINESS ========= */
        purpose: item.purpose || '',
        approvalBy: item.approvalBy || '',
        approvalDate: item.approvalDate || '',

        /* ========= REMARKS ========= */
        remarks: item.remarks || '',

        /* ========= AUDIT (🔥 IMPORTANT) ========= */
createdBy: item.createdBy || '',        createdDate: item.createdDate || '',
        updatedBy: item.updatedBy || '',
        updatedDate: item.updatedDate || '',

        /* ========= STATUS ========= */
        allocationStatus: item.allocationStatus || 'Active',
      }));

      this.filteredData = [...this.tableData];
    },

    error: (err) => {
      console.error('My Asset API Error:', err);
    },
  });
}
  formatDate(date: any): string {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }
  //  loadMyAsset(): void {
  //    if (!this.loginId) {
  //      console.warn('Login ID missing');
  //      return;
  //    }
  //
  //    this.commonService.fetchMyAssetByLoginId(this.loginId).subscribe({
  //      next: (res: any) => {
  //        console.log('My Asset (LoginId) Response:', res);
  //
  //        const list = Array.isArray(res) ? res : res?.data || [];
  //
  //        this.tableData = list.map((item: any) => ({
  //          myassetId: item.myassetId ?? '',
  //          myassetCode: item.myassetCode ?? '',
  //          myassetName: item.myassetName ?? '',
  //          myassetType: item.myassetType ?? '',
  //          myassetCategory: item.myassetCategory ?? '',
  //
  //          departmentCode: item.departmentCode ?? '',
  //          departmentName: item.departmentName ?? '',
  //
  //          assetMake: item.assetMake ?? '',
  //          assetModel: item.assetModel ?? '',
  //
  //          myassetLocation: item.myassetLocation ?? '',
  //          myassetTag: item.myassetTag ?? '',
  //
  //          myassetPurchaseDate: item.myassetPurchaseDate ?? '',
  //          myassetVendorName: item.myassetVendorName ?? '',
  //          myassetInvoiceNo: item.myassetInvoiceNo ?? '',
  //
  //          myassetStatus: item.myassetStatus ?? 'PENDING',
  //          myassetWorkingStatus: item.myassetWorkingStatus ?? '',
  //
  //          myassetCreatedDate: item.myassetCreatedDate ?? '',
  //          loginId: item.loginId ?? '',
  //        }));
  //      },
  //
  //      error: (err) => {
  //        console.error('My Asset API Error:', err);
  //      },
  //    });
  //  }

  onDepartmentChange(code: string, i: number) {
    const dept = this.departments.find((d) => d.departmentCode === code);

    if (dept) {
      this.forms[i].newRecord.departmentName = dept.departmentName;
    } else {
      this.forms[i].newRecord.departmentName = '';
    }
  }

  showToast(message: string, type: string = 'success') {
    this.toastMessage = message;
    this.toastType = type;

    setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }
  // For modal

  openDetails(row: any) {
    this.selectedRow = row;
    this.showViewModal = true;
  }
  onStatusChange(row: any) {
    const payload = {
      myassetStatus: row.myassetStatus,
      myassetUpdatedDate: this.getTodayDate(),
      loginId: this.loginId,
    };

    this.commonService.updateMyAsset(row.myassetId, payload).subscribe({
      next: () => {
        this.toast.success('Status Updated Successfully!', 'Success', 3000);
      },
      error: () => {
        this.toast.danger('Status update failed!', 'Error', 3000);
      },
    });
  }
  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }

  applyFilter(event: any) {
    const value = event.target.value.toLowerCase().trim();

    this.filteredData = this.tableData.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(value),
      ),
    );

    this.currentPage = 1;
  }

  //header

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
    if (!this.selectedRows || this.selectedRows.length === 0) {
      this.toast.danger('No records selected to delete!', '', 4000);
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${this.selectedRows.length} record(s)?`,
    );

    if (!confirmed) return;

    // ✅ Filter valid IDs only
    const ids: string[] = this.selectedRows
      .map((row) => row.myassetId)
      .filter((id) => !!id);

    if (ids.length === 0) {
      this.toast.danger('Invalid asset IDs!', '', 4000);
      return;
    }

    this.commonService.deleteMultipleMyAssets(ids).subscribe({
      next: (res) => {
        console.log('Delete Response:', res);

        // ✅ UI update (instant)
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.allocationId),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];

        // ✅ Pagination reset (optional)
        this.currentPage = 1;

        // ✅ Reload from server (sync data)
        //this.loadMyAsset();

        this.toast.success(
          `${ids.length} record(s) deleted successfully!`,
          'Success',
          4000,
        );
      },

      error: (err) => {
        console.error('Delete Error:', err);
        this.toast.danger('Failed to delete records!', 'Error', 4000);
      },
    });
  }
  // Toggle select all rows
  toggleAll(event: any) {
    if (event.target.checked) {
      this.selectedRows = [...this.filteredData];
    } else {
      this.selectedRows = [];
    }
  }

  sortTable(column: string, order: 'asc' | 'desc') {
    console.log('Sorting:', column, order);

    const sorted = [...this.filteredData].sort((a: any, b: any) => {
      let valA = a[column];
      let valB = b[column];

      if (valA == null) valA = '';
      if (valB == null) valB = '';

      const isNumeric = !isNaN(Number(valA)) && !isNaN(Number(valB));

      if (isNumeric) {
        valA = Number(valA);
        valB = Number(valB);

        return order === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      return order === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });

    this.filteredData = sorted; // UI uses this
    // keep main data updated
  }

  getTodayDate(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }
  formatDateForExcel(date: any): string {
    if (!date) return '';

    const d = new Date(date);

    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }
 exportExcel(): void {
  if (!this.tableData || this.tableData.length === 0) {
    this.toast.warning('No data available to export!', '', 3000);
    return;
  }

  const exportData = this.tableData.map((row: TableRow) => ({

    /* ========= PRIMARY ========= */
    Allocation_ID: row.allocationId ?? '',
    Allocation_Number: row.allocationNumber ?? '',

    /* ========= EMPLOYEE ========= */
    Employee_ID: row.employeeId ?? '',
    Department_ID: row.departmentId ?? '',
    Location: row.location ?? '',

    /* ========= ASSET ========= */
    Asset_ID: row.assetId ?? '',

    /* ========= DATES ========= */
    Allocation_Date: this.formatDateForExcel(row.allocationDate),
    Expected_Return_Date: this.formatDateForExcel(row.expectedReturnDate),
    Actual_Return_Date: this.formatDateForExcel(row.actualReturnDate),

    /* ========= CONDITION ========= */
    Condition_Issue: row.conditionAtIssue ?? '',
    Condition_Return: row.conditionAtReturn ?? '',

    /* ========= BUSINESS ========= */
    Purpose: row.purpose ?? '',
    Approval_By: row.approvalBy ?? '',
    Approval_Date: this.formatDateForExcel(row.approvalDate),

    /* ========= REMARKS ========= */
    Remarks: row.remarks ?? '',

    /* ========= AUDIT ========= */
    Created_By: row.createdBy ?? '',
    Created_Date: this.formatDateForExcel(row.createdDate),

    /* ========= STATUS ========= */
    Status: row.allocationStatus ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // ✅ column width auto सेट
  worksheet['!cols'] = Object.keys(exportData[0]).map((key) => ({
    wch: Math.max(key.length + 2, 20),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AssetAllocation');

  const fileName = `Asset_Allocation_${this.getTodayDate()}.xlsx`;

  XLSX.writeFile(workbook, fileName);

  this.toast.success('Excel exported successfully!', 'Success', 3000);
}
 exportDoc(): void {
  if (!this.tableData || this.tableData.length === 0) {
    this.toast.warning('No data available to export!', '', 3000);
    return;
  }

  const currentDate = this.getTodayDate();

  let content = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">

<head>
<meta charset="utf-8" />
<title>Asset Allocation Report</title>

<style>
@page WordSection1 { size: 842pt 595pt; mso-page-orientation: landscape; margin: 20pt; }
div.WordSection1 { page: WordSection1; }

table{
border-collapse: collapse;
width:100%;
table-layout: fixed;
font-size:9px;
}

th,td{
border:1px solid #000;
padding:3px;
text-align:center;
}

th{
background:#f2f2f2;
font-weight:bold;
}

.title{
text-align:center;
font-size:16px;
font-weight:bold;
}
</style>

</head>

<body>
<div class="WordSection1">

<p class="title">Asset Allocation Report</p>
<p>Date: ${currentDate}</p>

<table>

<tr>
<th>Allocation ID</th>
<th>Allocation Number</th>

<th>Employee</th>
<th>Department</th>
<th>Location</th>

<th>Asset</th>

<th>Allocation Date</th>
<th>Expected Return</th>
<th>Actual Return</th>

<th>Condition Issue</th>
<th>Condition Return</th>

<th>Purpose</th>
<th>Approval By</th>
<th>Approval Date</th>

<th>Remarks</th>

<th>Created By</th>
<th>Created Date</th>

<th>Status</th>
</tr>
`;

  this.tableData.forEach((row: TableRow) => {
    content += `
<tr>
<td>${row.allocationId ?? ''}</td>
<td>${row.allocationNumber ?? ''}</td>

<td>${row.employeeId ?? ''}</td>
<td>${row.departmentId ?? ''}</td>
<td>${row.location ?? ''}</td>

<td>${row.assetId ?? ''}</td>

<td>${this.formatDateForExcel(row.allocationDate)}</td>
<td>${this.formatDateForExcel(row.expectedReturnDate)}</td>
<td>${this.formatDateForExcel(row.actualReturnDate)}</td>

<td>${row.conditionAtIssue ?? ''}</td>
<td>${row.conditionAtReturn ?? ''}</td>

<td>${row.purpose ?? ''}</td>
<td>${row.approvalBy ?? ''}</td>
<td>${this.formatDateForExcel(row.approvalDate)}</td>

<td>${row.remarks ?? ''}</td>

<td>${row.createdBy ?? ''}</td>
<td>${this.formatDateForExcel(row.createdDate)}</td>

<td>${row.allocationStatus ?? ''}</td>
</tr>
`;
  });

  content += `</table></div></body></html>`;

  const blob = new Blob(['\ufeff', content], {
    type: 'application/msword',
  });

  saveAs(blob, `Asset_Allocation_Report_${currentDate}.doc`);

  this.toast.success('DOC exported successfully!', 'Success', 3000);
}

  exportPDF(): void {
  if (!this.tableData || this.tableData.length === 0) {
    this.toast.warning('No data available to export!', '', 3000);
    return;
  }

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDate = this.getTodayDate();

  // 🔹 Header
  doc.setFontSize(10);
  doc.text(`Date: ${currentDate}`, 10, 10);

  doc.setFontSize(14);
  doc.text('Asset Allocation Report', pageWidth / 2, 10, { align: 'center' });

  autoTable(doc, {
    startY: 16,

    styles: {
      fontSize: 7,
      cellPadding: 2,
      valign: 'middle',
      overflow: 'linebreak',
    },

    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 8,
      halign: 'center',
    },

    tableWidth: 'auto',
    margin: { left: 5, right: 5 },

    // ✅ UPDATED HEADERS
    head: [[
      'Allocation ID',
      'Allocation No',

      'Employee',
      'Department',
      'Location',

      'Asset',

      'Allocation Date',
      'Expected Return',
      'Actual Return',

      'Cond Issue',
      'Cond Return',

      'Purpose',
      'Approval By',
      'Approval Date',

      'Remarks',

      'Created By',
      'Created Date',

      'Status'
    ]],

    // ✅ UPDATED BODY
    body: this.tableData.map((row: TableRow) => [
      row.allocationId ?? '',
      row.allocationNumber ?? '',

      row.employeeId ?? '',
      row.departmentId ?? '',
      row.location ?? '',

      row.assetId ?? '',

      this.formatDateForExcel(row.allocationDate),
      this.formatDateForExcel(row.expectedReturnDate),
      this.formatDateForExcel(row.actualReturnDate),

      row.conditionAtIssue ?? '',
      row.conditionAtReturn ?? '',

      row.purpose ?? '',
      row.approvalBy ?? '',
      this.formatDateForExcel(row.approvalDate),

      row.remarks ?? '',

      row.createdBy ?? '',
      this.formatDateForExcel(row.createdDate),

      row.allocationStatus ?? '',
    ]),
  });

  // 🔹 Save
  doc.save(`Asset_Allocation_Report_${currentDate}.pdf`);

  this.toast.success('PDF exported successfully!', 'Success', 3000);
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
  //current date format
  // Converts Date → "dd-mm-yyyy"
  //getTodayDate(): string {
  //  const today = new Date();
  //  const d = String(today.getDate()).padStart(2, '0');
  //  const m = String(today.getMonth() + 1).padStart(2, '0');
  //  const y = today.getFullYear();
  //  return `${d}-${m}-${y}`; // dd-mm-yyyy ✅
  //}

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
newRecord: TableRow = {

  /* ========= PRIMARY ========= */
  allocationId: '',
  allocationNumber: '',

  /* ========= EMPLOYEE ========= */
  employeeId: '',
  departmentId: '',
  location: '',

  /* ========= ASSET ========= */
  assetId: '',

  /* ========= DATES ========= */
  allocationDate: this.getTodayDate(),
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

  /* ========= AUDIT (🔥 IMPORTANT) ========= */
  createdBy: this.loginId,                 // 🔥 login wise data
  createdDate: this.getTodayDate(),
  updatedBy: '',
  updatedDate: '',

  /* ========= STATUS ========= */
  allocationStatus: 'Active'
};

  // --------------------------
  // STATE VARIABLES
  // --------------------------

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
 cancelRecord(form?: NgForm, index?: number): void {
  const currentDate = this.getTodayDate();

  if (index !== undefined) {
    this.forms[index] = {

      /* ========= PRIMARY ========= */
      allocationId: '',
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

      /* ========= AUDIT (🔥 IMPORTANT) ========= */
      createdBy: this.loginId,
      createdDate: currentDate,
      updatedBy: '',
      updatedDate: '',

      /* ========= STATUS ========= */
      allocationStatus: 'Active'
    };
  }

  // ✅ Reset Angular form
  if (form) {
    form.resetForm();
  }

  this.isEditMode = false;
  this.editIndex = null;
  this.showErrors = false;
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
saveAllRecords(form?: NgForm): void {

  // ---------------- VALIDATION ----------------
  const invalid = this.forms.some((f) =>
    !f.allocationNumber?.trim() ||
    !f.employeeId?.trim() ||
    !f.departmentId?.trim() ||
    !f.assetId?.trim()
  );

  if (invalid) {
    this.showErrors = true;
    this.toast.warning('Please fill all required fields!', 'Warning', 4000);
    return;
  }

  // 🔥 Common mapper
  const mapPayload = (data: TableRow) => ({

    allocationId: data.allocationId,
    allocationNumber: data.allocationNumber,

    employeeId: data.employeeId,
    departmentId: data.departmentId,
    location: data.location,

    assetId: data.assetId,

    allocationDate: data.allocationDate,
    expectedReturnDate: data.expectedReturnDate,
    actualReturnDate: data.actualReturnDate,

    conditionAtIssue: data.conditionAtIssue,
    conditionAtReturn: data.conditionAtReturn,

    purpose: data.purpose,
    approvalBy: data.approvalBy,
    approvalDate: data.approvalDate,

    remarks: data.remarks,

    // 🔥 IMPORTANT
    createdBy: this.loginId,
    createdDate: this.getTodayDate(),

    allocationStatus: data.allocationStatus || 'Active'
  });

  // ---------------- EDIT MODE ----------------
  if (this.isEditMode && this.editIndex !== null) {

    const formData = this.forms[0];

    const payload = {
      ...mapPayload(formData),
      updatedBy: this.loginId,
      updatedDate: this.getTodayDate()
    };

    const allocationId = this.tableData[this.editIndex].allocationId;

    // ✅ FIXED (3 params)
    this.commonService.updateAssetAllocation(
      allocationId,
      this.loginId,
      payload
    ).subscribe({
      next: () => {
        this.toast.success('Allocation Updated Successfully!', 'Success', 4000);
        this.resetAfterSave();
      },
      error: () => {
        this.toast.danger('Update failed!', 'Error', 4000);
      },
    });

    return;
  }

  // ---------------- ADD MODE ----------------
  const payload = this.forms.map((f) => ({
    ...mapPayload(f),
    createdBy: this.loginId,
    createdDate: this.getTodayDate(),
  }));

  // ✅ FIXED METHOD NAME
  this.commonService.submitAssetAllocation(payload).subscribe({
    next: () => {
      this.toast.success('Allocation Added Successfully!', 'Success', 4000);
      this.resetAfterSave();
    },
    error: () => {
      this.toast.danger('Save failed!', 'Error', 4000);
    },
  });
}
resetAfterSave(): void {
  const currentDate = this.getTodayDate();

  this.forms = [
    {
      /* ========= PRIMARY ========= */
      allocationId: '',
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

      /* ========= AUDIT (🔥 IMPORTANT) ========= */
      createdBy: this.loginId,
      createdDate: currentDate,
      updatedBy: '',
      updatedDate: '',

      /* ========= STATUS ========= */
      allocationStatus: 'Active'
    }
  ];

  this.isEditMode = false;
  this.editIndex = null;
  this.activeTab = 'details';
  this.showErrors = false;
}
addForm(): void {
  if (this.isEditMode) {
    return;
  }

  const currentDate = this.getTodayDate();

  this.forms.push({

    /* ========= PRIMARY ========= */
    allocationId: '',
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

    /* ========= AUDIT (🔥 IMPORTANT) ========= */
    createdBy: this.loginId,
    createdDate: currentDate,
    updatedBy: '',
    updatedDate: '',

    /* ========= STATUS ========= */
    allocationStatus: 'Active'
  });
}
  // --------------------------
  // CANCEL / RESET FORM
  // --------------------------

  // --------------------------
  // EDIT EXISTING ROW
  // --------------------------
  onEdit(row: TableRow, index: number) {
    this.activeTab = 'newRecord';
    this.isEditMode = true;
    this.editIndex = index;

    // Prefill form with selected row
    this.forms[0].newRecord = { ...row };

    this.activeForm = 0;
    this.showErrors = false;
  }

  //bulk export date format
  startDateError: string = '';
  endDateError: string = '';

  formatInputDate(event: any, type: 'start' | 'end'): void {
    let input = event.target.value || '';

    let value = input.replace(/\D/g, '').slice(0, 8);

    let formatted = value;

    if (value.length >= 3 && value.length <= 4) {
      formatted = value.slice(0, 2) + '-' + value.slice(2);
    } else if (value.length > 4) {
      formatted =
        value.slice(0, 2) + '-' + value.slice(2, 4) + '-' + value.slice(4);
    }

    event.target.value = formatted;

    this.setDateError(type, '');

    if (value.length === 8) {
      const day = +value.slice(0, 2);
      const month = +value.slice(2, 4);
      const year = +value.slice(4, 8);

      let errorMsg = '';

      if (day < 1 || day > 31) {
        errorMsg = 'Day must be between 1 and 31.';
      } else if (month < 1 || month > 12) {
        errorMsg = 'Month must be between 1 and 12.';
      } else if (year < 2000) {
        errorMsg = 'Year must be >= 2000.';
      } else {
        const date = new Date(year, month - 1, day);

        const isValid =
          date.getDate() === day &&
          date.getMonth() + 1 === month &&
          date.getFullYear() === year;

        if (!isValid) {
          errorMsg = 'Invalid date.';
        }

        const today = new Date();
        if (!errorMsg && date > today) {
          errorMsg = 'Future date not allowed.';
        }
      }

      this.setDateError(type, errorMsg);
    }
  }
  setDateError(type: 'start' | 'end', message: string): void {
    if (type === 'start') {
      this.startDateError = message;
    } else {
      this.endDateError = message;
    }
  }
  //bulk import buttons function
  // Trigger when file is selected
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.toast.warning('Please select a file first!', 'Warning', 4000);
      return;
    }

    const file = this.selectedFile;

    // ✅ Allowed extensions
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();

    const isValidExtension = allowedExtensions.some((ext) =>
      fileName.endsWith(ext),
    );

    // ✅ Allowed MIME types
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!isValidExtension || !allowedTypes.includes(file.type)) {
      this.toast.danger(
        'Only Excel files (.xlsx, .xls) are allowed!',
        'Error',
        4000,
      );
      return;
    }

    // ✅ File size check (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toast.warning('File size must be less than 5MB!', 'Warning', 4000);
      return;
    }

    // ✅ Prevent multiple uploads
    if (this.loading) {
      return;
    }

    this.loading = true;

    this.commonService.uploadMyAssetExcel(file).subscribe({
      next: (res: any) => {
        this.loading = false;

        console.log('Upload Response:', res);

        // ✅ Reload latest data
        //this.loadMyAsset();

        const count = Array.isArray(res) ? res.length : res?.data?.length || 0;

        this.toast.success(
          `Imported ${count} record(s) successfully!`,
          'Success',
          4000,
        );

        // ✅ Reset file
        this.selectedFile = null;
      },

      error: (err) => {
        this.loading = false;

        console.error('Upload Error:', err);

        this.toast.danger(
          err?.error?.message || 'Import failed. Please check the file.',
          'Error',
          4000,
        );
      },
    });
  }

  csvHeaders: string[] = [];
  csvRecords: any[] = [];

  // ---------------- CSV Parsing ----------------
  //  parseCSV(csv: string) {
  //    const lines = csv
  //      .split('\n')
  //      .map((l) => l.trim())
  //      .filter((l) => l);
  //
  //    if (lines.length <= 1) {
  //      this.showToast('CSV has no data', 'warning');
  //      return;
  //    }
  //
  //    const mapHeader = (h: string) => {
  //      switch (h.toLowerCase()) {
  //        case 'asset id':
  //          return 'myassetId';
  //
  //        case 'created date':
  //          return 'myassetCreatedDate';
  //
  //        case 'asset code':
  //          return 'myassetCode';
  //
  //        case 'asset name':
  //          return 'myassetName';
  //
  //        case 'asset type':
  //          return 'myassetType';
  //
  //        case 'asset category':
  //          return 'myassetCategory';
  //
  //        case 'department code':
  //          return 'departmentCode';
  //
  //        case 'department name':
  //          return 'departmentName';
  //
  //        case 'asset make':
  //          return 'assetMake';
  //
  //        case 'asset model':
  //          return 'assetModel';
  //
  //        case 'location':
  //          return 'myassetLocation';
  //
  //        case 'asset tag':
  //          return 'myassetTag';
  //
  //        case 'purchase date':
  //          return 'myassetPurchaseDate';
  //
  //        case 'vendor name':
  //          return 'myassetVendorName';
  //
  //        case 'invoice no':
  //          return 'myassetInvoiceNo';
  //
  //        case 'asset status':
  //          return 'myassetStatus';
  //
  //        case 'working status':
  //          return 'myassetWorkingStatus';
  //
  //        default:
  //          return h;
  //      }
  //    };
  //
  //    const csvHeaders = lines[0].split(',').map((h) => mapHeader(h.trim()));
  //
  //    const results: TableRow[] = [];
  //
  //    for (let i = 1; i < lines.length; i++) {
  //      const values = lines[i].split(',');
  //
  //      const obj: any = {};
  //
  //      csvHeaders.forEach((h, idx) => {
  //        obj[h] = values[idx] ? values[idx].trim() : '';
  //      });
  //
  //      const newRecord: TableRow = {
  //        myassetId:
  //          obj['myassetId'] ||
  //          `A-${String(this.tableData.length + i).padStart(3, '0')}`,
  //
  //        myassetCreatedDate: obj['myassetCreatedDate'] || this.getTodayDate(),
  //
  //        myassetCode: obj['myassetCode'] || '',
  //        myassetName: obj['myassetName'] || '',
  //        myassetType: obj['myassetType'] || '',
  //        myassetCategory: obj['myassetCategory'] || '',
  //
  //        departmentCode: obj['departmentCode'] || '',
  //        departmentName: obj['departmentName'] || '',
  //
  //        assetMake: obj['assetMake'] || '',
  //        assetModel: obj['assetModel'] || '',
  //
  //        myassetLocation: obj['myassetLocation'] || '',
  //
  //        myassetTag: obj['myassetTag'] || '',
  //
  //        myassetPurchaseDate: obj['myassetPurchaseDate'] || this.getTodayDate(),
  //
  //        myassetVendorName: obj['myassetVendorName'] || '',
  //
  //        myassetInvoiceNo: obj['myassetInvoiceNo'] || '',
  //
  //        myassetStatus:
  //          (obj['myassetStatus'] as 'Active' | 'Inactive') || 'Active',
  //
  //        myassetWorkingStatus:
  //          (obj['myassetWorkingStatus'] as
  //            | 'Working'
  //            | 'Not Working'
  //            | 'Under Repair') || 'Working',
  //      };
  //
  //      results.push(newRecord);
  //    }
  //
  //    this.tableData = [...this.tableData, ...results];
  //
  //    this.filteredData = [...this.tableData];
  //
  //    this.currentPage = 1;
  //
  //    this.cdr.detectChanges();
  //
  //    this.showToast('CSV imported successfully!', 'success');
  //  }

  // ---------------- Excel Parsing ----------------
  // ---------------- Excel Parsing ----------------
  

  // ---------------- TXT Parsing ----------------
  //  readTXT(file: File) {
  //    const reader = new FileReader();
  //
  //    reader.onload = () => {
  //      const text = reader.result as string;
  //
  //      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  //
  //      lines.forEach((line, idx) => {
  //        const cols = line.split(',').map((c) => c.trim());
  //
  //        // Ensure required columns exist
  //        while (cols.length < 17) cols.push('');
  //
  //        const newRecord: TableRow = {
  //          myassetId: `A-${String(this.tableData.length + idx + 1).padStart(3, '0')}`,
  //
  //          myassetCreatedDate: cols[16] || this.getTodayDate(),
  //
  //          myassetCode: cols[0] || '',
  //
  //          myassetName: cols[1] || '',
  //
  //          myassetType: cols[2] || '',
  //
  //          myassetCategory: cols[3] || '',
  //
  //          departmentCode: cols[4] || '',
  //
  //          departmentName: cols[5] || '',
  //
  //          assetMake: cols[6] || '',
  //
  //          assetModel: cols[7] || '',
  //
  //          myassetLocation: cols[8] || '',
  //
  //          myassetTag: cols[9] || '',
  //
  //          myassetPurchaseDate: cols[10] || this.getTodayDate(),
  //
  //          myassetVendorName: cols[11] || '',
  //
  //          myassetInvoiceNo: cols[12] || '',
  //
  //          myassetStatus: (cols[13] as 'Active' | 'Inactive') || 'Active',
  //
  //          myassetWorkingStatus:
  //            (cols[14] as 'Working' | 'Not Working' | 'Under Repair') ||
  //            'Working',
  //        };
  //
  //        this.tableData.push(newRecord);
  //      });
  //
  //      this.filteredData = [...this.tableData];
  //
  //      this.currentPage = 1;
  //
  //      this.cdr.detectChanges();
  //
  //      this.showToast('TXT imported successfully!', 'success');
  //    };
  //
  //    reader.readAsText(file);
  //  }

  // ---------------- DOCX Parsing (mammoth.js) ----------------
  // ---------------- DOCX Parsing ----------------
  normalizeStatus(status: any): 'PENDING' | 'ACTIVE' | 'APPROVAL' {
    if (!status) return 'PENDING';

    const s = status.toString().toUpperCase();

    if (s.includes('ACTIVE')) return 'ACTIVE';
    if (s.includes('APPROVAL')) return 'APPROVAL';

    return 'PENDING';
  }
  parseExcelDate(value: any): string {
    if (!value) return '';

    const date = new Date(value);

    if (isNaN(date.getTime())) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }
  // async readDOCX(file: File): Promise<void> {
  //   const arrayBuffer = await file.arrayBuffer();

  //   const result = await mammoth.convertToHtml({ arrayBuffer });

  //   const doc = new DOMParser().parseFromString(result.value, 'text/html');

  //   const table = doc.querySelector('table');

  //   if (!table) {
  //     this.toast.danger('No table found in DOCX!', 'Error', 4000);
  //     return;
  //   }

  //   const rows = table.querySelectorAll('tr');

  //   const newData: TableRow[] = [];

  //   rows.forEach((row, i) => {
  //     if (i === 0) return; // skip header

  //     const cells = Array.from(row.querySelectorAll('td')).map(
  //       (c) => c.textContent?.trim() || '',
  //     );

  //     while (cells.length < 17) cells.push('');

  //     const record: TableRow = {
  //       myassetId: `A-${String(this.tableData.length + newData.length + 1).padStart(3, '0')}`,

  //       myassetCreatedDate:
  //         this.parseExcelDate(cells[16]) || this.getTodayDate(),

  //       myassetCode: cells[0] ?? '',
  //       myassetName: cells[1] ?? '',
  //       myassetType: cells[2] ?? '',
  //       myassetCategory: cells[3] ?? '',

  //       departmentCode: cells[4] ?? '',
  //       departmentName: cells[5] ?? '',

  //       assetMake: cells[6] ?? '',
  //       assetModel: cells[7] ?? '',

  //       myassetLocation: cells[8] ?? '',
  //       myassetTag: cells[9] ?? '',

  //       myassetPurchaseDate:
  //         this.parseExcelDate(cells[10]) || this.getTodayDate(),

  //       myassetVendorName: cells[11] ?? '',
  //       myassetInvoiceNo: cells[12] ?? '',

  //       // ✅ FIXED STATUS
  //       myassetStatus: this.normalizeStatus(cells[13]),

  //       myassetWorkingStatus: cells[14] ?? 'Working',

  //       // ✅ REQUIRED
  //       loginId: this.loginId,
  //     };

  //     newData.push(record);
  //   });

  //   // ✅ merge data safely
  //   this.tableData = [...this.tableData, ...newData];
  //   this.filteredData = [...this.tableData];

  //   this.toast.success(
  //     `DOCX imported ${newData.length} record(s) successfully!`,
  //     'Success',
  //     4000,
  //   );
  // }
  // ---------------- CSV Download ----------------
  // downloadSampleCSV(): void {
  //   if (!this.tableData || this.tableData.length === 0) {
  //     this.toast.warning('No data available to download!', 'Warning', 3000);
  //     return;
  //   }

  //   const headers = [
  //     'Asset ID',
  //     'Created Date',
  //     'Asset Code',
  //     'Asset Name',
  //     'Asset Type',
  //     'Asset Category',
  //     'Department Code',
  //     'Department Name',
  //     'Asset Make',
  //     'Asset Model',
  //     'Location',
  //     'Asset Tag',
  //     'Purchase Date',
  //     'Vendor Name',
  //     'Invoice No',
  //     'Asset Status',
  //     'Working Status',
  //   ];

  //   const csvRows: string[] = [];

  //   // ✅ Add headers
  //   csvRows.push(headers.join(','));

  //   // ✅ Escape function (IMPORTANT 🔥)
  //   const escapeCSV = (value: any): string => {
  //     if (!value) return '';

  //     const str = value.toString();

  //     // wrap with "" if contains comma/newline/quote
  //     if (str.includes(',') || str.includes('\n') || str.includes('"')) {
  //       return `"${str.replace(/"/g, '""')}"`;
  //     }

  //     return str;
  //   };

  //   // ✅ Data rows
  //   this.tableData.forEach((row: TableRow) => {
  //     const rowData = [
  //       row.myassetId,
  //       this.formatDate(row.myassetCreatedDate),

  //       row.myassetCode,
  //       row.myassetName,
  //       row.myassetType,
  //       row.myassetCategory,

  //       row.departmentCode,
  //       row.departmentName,

  //       row.assetMake,
  //       row.assetModel,

  //       row.myassetLocation,
  //       row.myassetTag,

  //       this.formatDate(row.myassetPurchaseDate),

  //       row.myassetVendorName,
  //       row.myassetInvoiceNo,

  //       row.myassetStatus,
  //       row.myassetWorkingStatus,
  //     ].map(escapeCSV);

  //     csvRows.push(rowData.join(','));
  //   });

  //   const csvString = '\ufeff' + csvRows.join('\n'); // ✅ UTF-8 fix

  //   const blob = new Blob([csvString], {
  //     type: 'text/csv;charset=utf-8;',
  //   });

  //   const url = window.URL.createObjectURL(blob);

  //   const a = document.createElement('a');
  //   a.href = url;

  //   // ✅ Dynamic filename
  //   a.download = `My_Asset_${this.getTodayDate()}.csv`;

  //   a.click();

  //   window.URL.revokeObjectURL(url);

  //   this.toast.success('CSV downloaded successfully!', 'Success', 3000);
  // }

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
    if (!dateStr) return null;
    const parts = dateStr.trim().split('-').map(Number);
    if (parts.length !== 3) return null;
    const date = new Date(parts[2], parts[1] - 1, parts[0]);
    return isNaN(date.getTime()) ? null : date;
  }

  // ---------------- Bulk Export ----------------
 
  // ---------------- CSV Export ----------------


  showTimelineModal = false;

  openStatusTimeline(row: any) {
    this.selectedRow = row;
    this.showTimelineModal = true;
  }

  closeTimelineModal() {
    this.showTimelineModal = false;
  }
}
