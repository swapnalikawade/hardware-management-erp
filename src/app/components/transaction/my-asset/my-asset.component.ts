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

interface TableRow {
  myassetId: string;
  myassetCode: string;
  myassetName: string;
  myassetType: string;
  myassetCategory: string;

  departmentCode: string;
  departmentName: string;

  assetMake?: string;
  assetModel?: string;

  myassetLocation?: string;
  myassetTag?: string;

  myassetPurchaseDate?: string;
  myassetVendorName?: string;
  myassetInvoiceNo?: string;

  myassetStatus: 'PENDING' | 'ACTIVE' | 'APPROVAL';
  myassetWorkingStatus?: string;

  myassetCreatedDate: string;
  loginId: string;
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
    this.token = this.authService.getToken();
    this.userName = this.authService.getUsername();
    this.userRoles = this.authService.getUserRoles();
    this.date = this.authService.getCurrentDate();
    this.headCompanyName = this.authService.getEmployeeName();
    this.loginId = this.authService.getEmployeeId();
    alert(this.loginId);
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
    this.filteredData = [...this.tableData];

    // Table Data
    //this.loadMyAsset();
    // 🔥 ADD THIS LINE
    this.loadMyAsset();
    // Department dropdown
    this.loadDepartments();

    // Dropdown APIs together
  }

  private initializeForm(): void {
    this.forms = [
      {
        // ✅ UI binding
        myassetCode: '',
        myassetName: '',
        myassetType: '',
        myassetCategory: '',

        departmentCode: '',
        departmentName: '',

        assetMake: '',
        assetModel: '',

        myassetLocation: '',
        myassetTag: '',

        myassetPurchaseDate: this.currentDate,
        myassetVendorName: '',
        myassetInvoiceNo: '',

        myassetStatus: 'PENDING',
        myassetWorkingStatus: '',

        myassetCreatedDate: this.currentDate,
        loginId: this.loginId,

        // ✅ backend
        newRecord: {
          myassetId: '0',
          myassetCode: '',
          myassetName: '',
          myassetType: '',
          myassetCategory: '',

          departmentCode: '',
          departmentName: '',

          assetMake: '',
          assetModel: '',

          myassetLocation: '',
          myassetTag: '',

          myassetPurchaseDate: this.currentDate,
          myassetVendorName: '',
          myassetInvoiceNo: '',

          myassetStatus: 'PENDING',
          myassetWorkingStatus: '',

          myassetCreatedDate: this.currentDate,
          loginId: this.loginId,
        },
      },
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

  loadMyAsset(): void {
    if (!this.loginId) {
      console.warn('Login ID missing');
      return;
    }

    this.commonService.fetchMyAssetByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        console.log('My Asset Response:', res);

        const list = Array.isArray(res) ? res : res?.data || [];

        // 🔥 FIX START (IMPORTANT)
        this.tableData = list.map((item: any) => ({
          myassetId: item.myassetId || item.assetallocationAssetId || '',
          myassetCode: item.myassetCode || item.assetallocationCode || '',
          myassetName: item.myassetName || item.assetallocationAssetName || '',
          myassetType: item.myassetType || item.assetallocationAssetType || '',
          myassetCategory: item.myassetCategory || '',

          departmentCode:
            item.departmentCode || item.assetallocationDepartment || '',
          departmentName:
            item.departmentName || item.assetallocationDepartment || '',

          assetMake: item.assetMake || item.assetallocationAssetMake || '',
          assetModel: item.assetModel || item.assetallocationModel || '',

          myassetLocation:
            item.myassetLocation || item.assetallocationLocation || '',
          myassetTag: item.myassetTag || item.assetallocationSerialNumber || '',

          myassetPurchaseDate:
            item.myassetPurchaseDate || item.assetallocationStartDate || '',
          myassetVendorName: item.myassetVendorName || '',
          myassetInvoiceNo: item.myassetInvoiceNo || '',

          myassetStatus:
            item.myassetStatus || item.assetallocationStatus || 'PENDING',
          myassetWorkingStatus: item.myassetWorkingStatus || '',

          myassetCreatedDate: item.myassetCreatedDate || item.createdDate || '',
          loginId: item.loginId || '',
        }));
        // 🔥 FIX END

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
          (row) => !ids.includes(row.myassetId),
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
      Asset_ID: row.myassetId ?? '',
      Created_Date: this.formatDateForExcel(row.myassetCreatedDate),

      Asset_Code: row.myassetCode ?? '',
      Asset_Name: row.myassetName ?? '',
      Asset_Type: row.myassetType ?? '',
      Asset_Category: row.myassetCategory ?? '',

      Department_Code: row.departmentCode ?? '',
      Department_Name: row.departmentName ?? '',

      Asset_Make: row.assetMake ?? '',
      Asset_Model: row.assetModel ?? '',

      Location: row.myassetLocation ?? '',
      Asset_Tag: row.myassetTag ?? '',

      Purchase_Date: this.formatDateForExcel(row.myassetPurchaseDate),
      Vendor_Name: row.myassetVendorName ?? '',
      Invoice_No: row.myassetInvoiceNo ?? '',

      Asset_Status: row.myassetStatus ?? '',
      Working_Status: row.myassetWorkingStatus ?? '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet['!cols'] = Object.keys(exportData[0]).map((key) => ({
      wch: Math.max(key.length + 2, 20),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MyAssetData');

    const fileName = `My_Asset_Data_${this.getTodayDate()}.xlsx`;

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
<title>My Asset Report</title>

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

<p class="title">My Asset Report</p>
<p>Date: ${currentDate}</p>

<table>

<tr>
<th>ID</th>
<th>Code</th>
<th>Name</th>
<th>Type</th>
<th>Category</th>

<th>Dept Code</th>
<th>Dept Name</th>

<th>Make</th>
<th>Model</th>

<th>Location</th>
<th>Tag</th>

<th>Purchase Date</th>
<th>Vendor</th>
<th>Invoice</th>

<th>Status</th>
<th>Working Status</th>

<th>Created Date</th>
</tr>
`;

    this.tableData.forEach((row: TableRow) => {
      content += `
<tr>
<td>${row.myassetId ?? ''}</td>
<td>${row.myassetCode ?? ''}</td>
<td>${row.myassetName ?? ''}</td>
<td>${row.myassetType ?? ''}</td>
<td>${row.myassetCategory ?? ''}</td>

<td>${row.departmentCode ?? ''}</td>
<td>${row.departmentName ?? ''}</td>

<td>${row.assetMake ?? ''}</td>
<td>${row.assetModel ?? ''}</td>

<td>${row.myassetLocation ?? ''}</td>
<td>${row.myassetTag ?? ''}</td>

<td>${this.formatDateForExcel(row.myassetPurchaseDate)}</td>
<td>${row.myassetVendorName ?? ''}</td>
<td>${row.myassetInvoiceNo ?? ''}</td>

<td>${row.myassetStatus ?? ''}</td>
<td>${row.myassetWorkingStatus ?? ''}</td>

<td>${this.formatDateForExcel(row.myassetCreatedDate)}</td>
</tr>
`;
    });

    content += `</table></div></body></html>`;

    const blob = new Blob(['\ufeff', content], {
      type: 'application/msword',
    });

    saveAs(blob, `My_Asset_Report_${currentDate}.doc`);

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
    doc.text('My Asset Report', pageWidth / 2, 10, { align: 'center' });

    autoTable(doc, {
      startY: 16,

      styles: {
        fontSize: 8,
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

      head: [
        [
          'ID',
          'Code',
          'Name',
          'Type',
          'Category',

          'Dept Code',
          'Dept Name',

          'Make',
          'Model',

          'Location',
          'Tag',

          'Purchase Date',
          'Vendor',
          'Invoice',

          'Asset Status',
          'Working Status',

          'Created Date',
        ],
      ],

      body: this.tableData.map((row: TableRow) => [
        row.myassetId ?? '',
        row.myassetCode ?? '',
        row.myassetName ?? '',
        row.myassetType ?? '',
        row.myassetCategory ?? '',

        row.departmentCode ?? '',
        row.departmentName ?? '',

        row.assetMake ?? '',
        row.assetModel ?? '',

        row.myassetLocation ?? '',
        row.myassetTag ?? '',

        this.formatDateForExcel(row.myassetPurchaseDate),
        row.myassetVendorName ?? '',
        row.myassetInvoiceNo ?? '',

        row.myassetStatus ?? '',
        row.myassetWorkingStatus ?? '',

        this.formatDateForExcel(row.myassetCreatedDate),
      ]),
    });

    // 🔹 Save with date
    doc.save(`My_Asset_Report_${currentDate}.pdf`);

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
    // System
    myassetId: '',
    myassetCreatedDate: this.getTodayDate(),

    // Core Mandatory
    myassetCode: '',
    myassetName: '',
    myassetType: '',
    myassetCategory: '',

    departmentCode: '',
    departmentName: '',

    assetMake: '',
    assetModel: '',

    myassetLocation: '',
    myassetTag: '',

    myassetPurchaseDate: this.getTodayDate(),
    myassetVendorName: '',
    myassetInvoiceNo: '',

    // ✅ FIXED (IMPORTANT 🔥)
    myassetStatus: 'PENDING',
    myassetWorkingStatus: 'Working',

    // ✅ Missing field add
    loginId: this.loginId,
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
    const currentDate = this.getTodayDate(); // ✅ reuse function

    if (index !== undefined) {
      this.forms[index] = {
        newRecord: {
          myassetId: '0',
          myassetCreatedDate: currentDate,

          myassetCode: '',
          myassetName: '',
          myassetType: '',
          myassetCategory: '',

          departmentCode: '',
          departmentName: '',

          assetMake: '',
          assetModel: '',

          myassetLocation: '',
          myassetTag: '',

          myassetPurchaseDate: currentDate,

          myassetVendorName: '',
          myassetInvoiceNo: '',

          // ✅ FIXED
          myassetStatus: 'PENDING',
          myassetWorkingStatus: 'Working',

          // ✅ REQUIRED FIELD
          loginId: this.loginId,
        },
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
    const invalid = this.forms.some(
      (f) =>
        !f.newRecord.myassetCode?.trim() ||
        !f.newRecord.myassetName?.trim() ||
        !f.newRecord.myassetType?.trim() ||
        !f.newRecord.myassetCategory?.trim() ||
        !f.newRecord.departmentCode?.trim() ||
        !f.newRecord.assetMake?.trim() ||
        !f.newRecord.assetModel?.trim() ||
        !f.newRecord.myassetLocation?.trim() ||
        !f.newRecord.myassetTag?.trim(),
    );

    if (invalid) {
      this.showErrors = true;
      this.toast.warning('Please fill all required fields!', 'Warning', 4000);
      return;
    }

    // 🔥 Common mapper (reuse)
    const mapPayload = (data: TableRow) => ({
      myassetCode: data.myassetCode,
      myassetName: data.myassetName,
      myassetType: data.myassetType,
      myassetCategory: data.myassetCategory,

      departmentCode: data.departmentCode,
      departmentName: data.departmentName,

      assetMake: data.assetMake,
      assetModel: data.assetModel,

      myassetLocation: data.myassetLocation,
      myassetTag: data.myassetTag,

      myassetPurchaseDate: data.myassetPurchaseDate,
      myassetVendorName: data.myassetVendorName,
      myassetInvoiceNo: data.myassetInvoiceNo,

      myassetStatus: data.myassetStatus || 'PENDING',
      myassetWorkingStatus: data.myassetWorkingStatus,

      loginId: this.loginId, // ✅ important
    });

    // ---------------- EDIT MODE ----------------
    if (this.isEditMode && this.editIndex !== null) {
      const formData = this.forms[0].newRecord;

      const payload = {
        ...mapPayload(formData),
        myassetUpdatedDate: this.getTodayDate(),
      };

      const myassetId = this.tableData[this.editIndex].myassetId;

      this.commonService.updateMyAsset(myassetId, payload).subscribe({
        next: () => {
          this.toast.success('Asset Updated Successfully!', 'Success', 4000);

          this.resetAfterSave();
          //this.loadMyAsset();
        },
        error: () => {
          this.toast.danger(
            'Update failed. Service unavailable!',
            'Error',
            4000,
          );
        },
      });

      return;
    }

    // ---------------- ADD MODE ----------------
    const payload = this.forms.map((f) => ({
      ...mapPayload(f.newRecord),
      myassetCreatedDate: this.getTodayDate(),
    }));

    this.commonService.submitMyAsset(payload).subscribe({
      next: (res) => {
        if (res?.dublicateMessages?.length) {
          res.dublicateMessages.forEach((msg: string) =>
            this.toast.warning(msg, 'Warning', 4000),
          );
        }

        this.toast.success('Asset Added Successfully!', 'Success', 4000);

        this.resetAfterSave();
        //this.loadMyAsset();
      },

      error: () => {
        this.toast.danger('Save failed. Asset service down!', 'Error', 4000);
      },
    });
  }
  resetAfterSave(): void {
    const currentDate = this.getTodayDate();

    this.forms = [
      {
        newRecord: {
          myassetId: '0',

          myassetCreatedDate: currentDate,

          myassetCode: '',
          myassetName: '',
          myassetType: '',
          myassetCategory: '',

          departmentCode: '',
          departmentName: '',

          assetMake: '',
          assetModel: '',

          myassetLocation: '',
          myassetTag: '',

          myassetPurchaseDate: currentDate,

          myassetVendorName: '',
          myassetInvoiceNo: '',

          // ✅ FIXED
          myassetStatus: 'PENDING',
          myassetWorkingStatus: 'Working',

          // ✅ REQUIRED
          loginId: this.loginId,
        },
      },
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
      newRecord: {
        myassetId: '0',
        myassetCreatedDate: currentDate,

        myassetCode: '',
        myassetName: '',
        myassetType: '',
        myassetCategory: '',

        departmentCode: '',
        departmentName: '',

        assetMake: '',
        assetModel: '',

        myassetLocation: '',
        myassetTag: '',

        myassetPurchaseDate: currentDate,

        myassetVendorName: '',
        myassetInvoiceNo: '',

        // ✅ FIXED
        myassetStatus: 'PENDING',
        myassetWorkingStatus: 'Working',

        // ✅ REQUIRED
        loginId: this.loginId,
      },
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
  readExcel(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      const workbook = XLSX.read(reader.result, { type: 'binary' });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const newData: TableRow[] = [];

      json.forEach((obj: any, i: number) => {
        const row: TableRow = {
          myassetId:
            obj['Asset ID'] ||
            `A-${String(this.tableData.length + i + 1).padStart(3, '0')}`,

          myassetCreatedDate:
            this.parseExcelDate(obj['Created Date']) || this.getTodayDate(),

          myassetCode: obj['Asset Code'] ?? '',
          myassetName: obj['Asset Name'] ?? '',
          myassetType: obj['Asset Type'] ?? '',
          myassetCategory: obj['Asset Category'] ?? '',

          departmentCode: obj['Department Code'] ?? '',
          departmentName: obj['Department Name'] ?? '',

          assetMake: obj['Asset Make'] ?? '',
          assetModel: obj['Asset Model'] ?? '',

          myassetLocation: obj['Location'] ?? '',
          myassetTag: obj['Asset Tag'] ?? '',

          myassetPurchaseDate:
            this.parseExcelDate(obj['Purchase Date']) || this.getTodayDate(),

          myassetVendorName: obj['Vendor Name'] ?? '',
          myassetInvoiceNo: obj['Invoice No'] ?? '',

          // ✅ FIXED STATUS
          myassetStatus: this.normalizeStatus(obj['Asset Status']),

          myassetWorkingStatus: obj['Working Status'] ?? 'Working',

          // ✅ REQUIRED
          loginId: this.loginId,
        };

        newData.push(row);
      });

      // ✅ merge safely
      this.tableData = [...this.tableData, ...newData];
      this.filteredData = [...this.tableData];
      this.currentPage = 1;

      this.toast.success(
        `Imported ${newData.length} record(s) successfully!`,
        'Success',
        4000,
      );
    };

    reader.readAsBinaryString(file);
  }

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
  async readDOCX(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.convertToHtml({ arrayBuffer });

    const doc = new DOMParser().parseFromString(result.value, 'text/html');

    const table = doc.querySelector('table');

    if (!table) {
      this.toast.danger('No table found in DOCX!', 'Error', 4000);
      return;
    }

    const rows = table.querySelectorAll('tr');

    const newData: TableRow[] = [];

    rows.forEach((row, i) => {
      if (i === 0) return; // skip header

      const cells = Array.from(row.querySelectorAll('td')).map(
        (c) => c.textContent?.trim() || '',
      );

      while (cells.length < 17) cells.push('');

      const record: TableRow = {
        myassetId: `A-${String(this.tableData.length + newData.length + 1).padStart(3, '0')}`,

        myassetCreatedDate:
          this.parseExcelDate(cells[16]) || this.getTodayDate(),

        myassetCode: cells[0] ?? '',
        myassetName: cells[1] ?? '',
        myassetType: cells[2] ?? '',
        myassetCategory: cells[3] ?? '',

        departmentCode: cells[4] ?? '',
        departmentName: cells[5] ?? '',

        assetMake: cells[6] ?? '',
        assetModel: cells[7] ?? '',

        myassetLocation: cells[8] ?? '',
        myassetTag: cells[9] ?? '',

        myassetPurchaseDate:
          this.parseExcelDate(cells[10]) || this.getTodayDate(),

        myassetVendorName: cells[11] ?? '',
        myassetInvoiceNo: cells[12] ?? '',

        // ✅ FIXED STATUS
        myassetStatus: this.normalizeStatus(cells[13]),

        myassetWorkingStatus: cells[14] ?? 'Working',

        // ✅ REQUIRED
        loginId: this.loginId,
      };

      newData.push(record);
    });

    // ✅ merge data safely
    this.tableData = [...this.tableData, ...newData];
    this.filteredData = [...this.tableData];

    this.toast.success(
      `DOCX imported ${newData.length} record(s) successfully!`,
      'Success',
      4000,
    );
  }
  // ---------------- CSV Download ----------------
  downloadSampleCSV(): void {
    if (!this.tableData || this.tableData.length === 0) {
      this.toast.warning('No data available to download!', 'Warning', 3000);
      return;
    }

    const headers = [
      'Asset ID',
      'Created Date',
      'Asset Code',
      'Asset Name',
      'Asset Type',
      'Asset Category',
      'Department Code',
      'Department Name',
      'Asset Make',
      'Asset Model',
      'Location',
      'Asset Tag',
      'Purchase Date',
      'Vendor Name',
      'Invoice No',
      'Asset Status',
      'Working Status',
    ];

    const csvRows: string[] = [];

    // ✅ Add headers
    csvRows.push(headers.join(','));

    // ✅ Escape function (IMPORTANT 🔥)
    const escapeCSV = (value: any): string => {
      if (!value) return '';

      const str = value.toString();

      // wrap with "" if contains comma/newline/quote
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }

      return str;
    };

    // ✅ Data rows
    this.tableData.forEach((row: TableRow) => {
      const rowData = [
        row.myassetId,
        this.formatDate(row.myassetCreatedDate),

        row.myassetCode,
        row.myassetName,
        row.myassetType,
        row.myassetCategory,

        row.departmentCode,
        row.departmentName,

        row.assetMake,
        row.assetModel,

        row.myassetLocation,
        row.myassetTag,

        this.formatDate(row.myassetPurchaseDate),

        row.myassetVendorName,
        row.myassetInvoiceNo,

        row.myassetStatus,
        row.myassetWorkingStatus,
      ].map(escapeCSV);

      csvRows.push(rowData.join(','));
    });

    const csvString = '\ufeff' + csvRows.join('\n'); // ✅ UTF-8 fix

    const blob = new Blob([csvString], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;

    // ✅ Dynamic filename
    a.download = `My_Asset_${this.getTodayDate()}.csv`;

    a.click();

    window.URL.revokeObjectURL(url);

    this.toast.success('CSV downloaded successfully!', 'Success', 3000);
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
    if (!dateStr) return null;
    const parts = dateStr.trim().split('-').map(Number);
    if (parts.length !== 3) return null;
    const date = new Date(parts[2], parts[1] - 1, parts[0]);
    return isNaN(date.getTime()) ? null : date;
  }

  // ---------------- Bulk Export ----------------
  getFile() {
    if (!this.tableData || this.tableData.length === 0) {
      this.showToast('No data available to export!', 'warning');
      return;
    }

    if (!this.startDate || !this.endDate) {
      this.showToast('Please enter both Start Date and End Date!', 'warning');
      return;
    }

    const start = this.startDate ? this.parseDDMMYYYY(this.startDate) : null;

    const end = this.endDate ? this.parseDDMMYYYY(this.endDate) : null;

    // Filter based on Created Date
    const filteredData = this.tableData.filter((row: TableRow) => {
      if (!row.myassetCreatedDate) return false;

      const rowDate = this.parseDDMMYYYY(row.myassetCreatedDate);

      if (!rowDate) return false;

      const includeStart = start && rowDate.getTime() === start.getTime();

      const includeEnd = end && rowDate.getTime() === end.getTime();

      const inRange = (!start || rowDate >= start) && (!end || rowDate <= end);

      return inRange || includeStart || includeEnd;
    });

    if (filteredData.length === 0) {
      this.showToast(
        'No records found for the selected date range.',
        'warning',
      );
      return;
    }

    // Export based on selected file type
    switch (this.fileType) {
      case 'csv':
        this.exportCSVfile(filteredData);
        break;

      case 'xlsx':
        this.exportExcelfile(filteredData);
        break;

      case 'pdf':
        this.exportPDFfile(filteredData);
        break;

      default:
        this.showToast('Invalid file type selected!', 'error');
    }
  }

  // ---------------- CSV Export ----------------
  exportCSVfile(data: TableRow[]): void {
    if (!data || data.length === 0) {
      this.toast.warning('No data available!', 'Warning', 3000);
      return;
    }

    const formattedDate = this.getTodayDate();

    const escapeCSV = (val: any): string => {
      if (!val) return '';
      const str = val.toString();
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const csvRows: string[] = [];

    csvRows.push(this.headCompanyName || 'Company Name');
    csvRows.push(`Date:,${formattedDate}`);
    csvRows.push('');

    const headers = [
      'Asset ID',
      'Created Date',
      'Asset Code',
      'Asset Name',
      'Asset Type',
      'Asset Category',
      'Department Code',
      'Department Name',
      'Asset Make',
      'Asset Model',
      'Location',
      'Asset Tag',
      'Purchase Date',
      'Vendor Name',
      'Invoice No',
      'Asset Status',
      'Working Status',
    ];

    csvRows.push(headers.join(','));

    data.forEach((row: TableRow) => {
      const rowData = [
        row.myassetId,
        this.formatDate(row.myassetCreatedDate),

        row.myassetCode,
        row.myassetName,
        row.myassetType,
        row.myassetCategory,

        row.departmentCode,
        row.departmentName,

        row.assetMake,
        row.assetModel,

        row.myassetLocation,
        row.myassetTag,

        this.formatDate(row.myassetPurchaseDate),

        row.myassetVendorName,
        row.myassetInvoiceNo,

        row.myassetStatus,
        row.myassetWorkingStatus,
      ].map(escapeCSV);

      csvRows.push(rowData.join(','));
    });

    const blob = new Blob(['\ufeff' + csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });

    saveAs(blob, `Filtered_My_Asset_${formattedDate}.csv`);
  }

  // ---------------- Excel Export ----------------
  exportExcelfile(data: TableRow[]): void {
    if (!data || data.length === 0) {
      this.toast.warning('No data available!', 'Warning', 3000);
      return;
    }

    const formattedDate = this.getTodayDate();

    const wsData = [
      [this.headCompanyName || 'Company Name'],
      ['Date:', formattedDate],
      [],
      [
        'Asset ID',
        'Created Date',
        'Asset Code',
        'Asset Name',
        'Asset Type',
        'Asset Category',
        'Department Code',
        'Department Name',
        'Asset Make',
        'Asset Model',
        'Location',
        'Asset Tag',
        'Purchase Date',
        'Vendor Name',
        'Invoice No',
        'Asset Status',
        'Working Status',
      ],
    ];

    data.forEach((row: TableRow) => {
      wsData.push([
        row.myassetId || '',
        this.formatDate(row.myassetCreatedDate),

        row.myassetCode || '',
        row.myassetName || '',
        row.myassetType || '',
        row.myassetCategory || '',

        row.departmentCode || '',
        row.departmentName || '',

        row.assetMake || '',
        row.assetModel || '',

        row.myassetLocation || '',
        row.myassetTag || '',

        this.formatDate(row.myassetPurchaseDate),

        row.myassetVendorName || '',
        row.myassetInvoiceNo || '',

        row.myassetStatus || '',
        row.myassetWorkingStatus || '',
      ]);
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    worksheet['!cols'] = wsData[3].map((h: any) => ({
      wch: Math.max(String(h).length + 2, 18),
    }));

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered My Assets');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `Filtered_My_Asset_${formattedDate}.xlsx`);
  }
  // ---------------- PDF Export ----------------
  exportPDFfile(data: TableRow[]): void {
    if (!data || data.length === 0) {
      this.toast.warning('No data available!', 'Warning', 3000);
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    const formattedDate = this.getTodayDate();

    // TITLE
    doc.setFontSize(14);
    doc.text('Filtered My Asset Report', pageWidth / 2, 10, {
      align: 'center',
    });

    // HEADER
    doc.setFontSize(9);
    doc.text(this.headCompanyName || 'Company Name', 10, 10);
    doc.text(formattedDate, pageWidth - 10, 10, { align: 'right' });

    autoTable(doc, {
      startY: 16,

      head: [
        [
          'ID',
          'Created',
          'Code',
          'Name',
          'Type',
          'Category',
          'Dept Code',
          'Dept Name',
          'Make',
          'Model',
          'Location',
          'Tag',
          'Purchase',
          'Vendor',
          'Invoice',
          'Status',
          'Working',
        ],
      ],

      body: data.map((row) => [
        row.myassetId || '',
        this.formatDate(row.myassetCreatedDate),

        row.myassetCode || '',
        row.myassetName || '',
        row.myassetType || '',
        row.myassetCategory || '',

        row.departmentCode || '',
        row.departmentName || '',

        row.assetMake || '',
        row.assetModel || '',

        row.myassetLocation || '',
        row.myassetTag || '',

        this.formatDate(row.myassetPurchaseDate),

        row.myassetVendorName || '',
        row.myassetInvoiceNo || '',

        row.myassetStatus || '',
        row.myassetWorkingStatus || '',
      ]),

      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    doc.save(`Filtered_My_Asset_${formattedDate}.pdf`);
  }

  showTimelineModal = false;

  openStatusTimeline(row: any) {
    this.selectedRow = row;
    this.showTimelineModal = true;
  }

  closeTimelineModal() {
    this.showTimelineModal = false;
  }
}
