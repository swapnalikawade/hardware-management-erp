/*
 **************************************************************************************
 * Program Name  : AssetReplacementComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 12, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Asset Replacement module.
 *
 * Description   : This component manages Asset Replacement operations including:
 *                 - Fetch all asset replacement records based on Login ID
 *                 - Add single/multiple asset replacement entries
 *                 - Update existing asset replacement records
 *                 - Delete single/multiple asset replacement records
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (CSV, Excel, TXT, DOCX)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling (multiple entries)
 *   - Validation using NgForm
 *   - Old & New Asset tracking (replacement flow)
 *   - File parsing using XLSX, Mammoth
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *
 * Endpoints Used:
 *   - GET    /asset-replacement/getAllAssetReplacementByLoginId/{prefix}/{year}/{code}
 *   - POST   /asset-replacement/saveAll
 *   - PUT    /asset-replacement/update/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /asset-replacement/delete-multiple-assetReplacement
 *   - POST   /asset-replacement/import
 *
 * Called From   : Asset Replacement UI (Frontend)
 * Calls To      : CommonService (HTTP APIs)
 *
 * Dependencies  :
 *   - Angular Forms (NgForm)
 *   - XLSX (Excel handling)
 *   - jsPDF & jspdf-autotable (PDF generation)
 *   - Mammoth (DOCX parsing)
 *   - FileSaver (File download)
 *   - ng-angular-popup (Toast messages)
 *
 **************************************************************************************
 */
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as mammoth from 'mammoth';
import { Router } from '@angular/router';
import { NgToastService } from 'ng-angular-popup';
import { AuthService } from '../../../services/auth/auth-service';
import { CommonService } from '../../../services/common/common-service';

export interface TableRow {

  /* ================= PRIMARY ================= */
  replacementId: string;
  replacementNumber: string;

  /* ================= BASIC ================= */
  replacementDate: string; // YYYY-MM-DD
  allocationId: string;
  callLoggingId: string;
  employeeId: string;
  departmentId: string;
  location: string;

  /* ================= OLD ASSET ================= */
  oldAssetId: string;
  oldAssetSerialNumber: string;
  oldAssetCondition: string;   // Faulty / Damaged / Obsolete
  oldAssetReturnStatus: string; // Returned / Not Returned

  /* ================= NEW ASSET ================= */
  newAssetId: string;
  newAssetSerialNumber: string;

  /* ================= REPLACEMENT DETAILS ================= */
  assetCategory: string;
  replacementType: string; // Warranty / Upgrade / Damage / Breakdown
  reasonForReplacement: string;
  replacementCost: number;

  /* ================= APPROVAL ================= */
  approvedBy: string;
  approvalDate: string;

  /* ================= TECHNICAL ================= */
  technicianName: string;

  /* ================= STATUS ================= */
  replacementStatus: 'Active' | 'Inactive';   // 🔥 REQUIRED FIX

  /* ================= REMARKS ================= */
  remarks?: string;

  /* ================= AUDIT ================= */
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
}

@Component({
  selector: 'app-asset-replacement',
  standalone: false,
  templateUrl: './asset-replacement.component.html',
  styleUrls: ['./asset-replacement.component.css'],
})
export class AssetReplacementComponent {
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
  callList: any[] = [];
  loading: any = false;
employeeList: any[] = [];
departmentList: any[] = [];
  filteredData: TableRow[] = [];
assetList: any[] = [];
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

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    this.currentDate = `${yyyy}-${mm}-${dd}`;

    // Initialize form + load data
    this.initializeForm();
    this.loadAssetReplacements();
    this.loadCallLoggingList();
    this.loadEmployees()
    this.loadAssets();  ;
this.loadDepartments();
    this.filteredData = [...this.tableData];
  }

private initializeForm(): void {
  this.forms = [
    {
      newRecord: {

        /* ================= PRIMARY ================= */
        replacementId: '0',
        replacementNumber: '',

        /* ================= BASIC ================= */
        replacementDate: this.currentDate || '',
        allocationId: '',
        callLoggingId: '',
        employeeId: '',
        departmentId: '',
        location: '',

        /* ================= OLD ASSET ================= */
        oldAssetId: '',
        oldAssetSerialNumber: '',
        oldAssetCondition: '',      // Faulty / Damaged / Obsolete
        oldAssetReturnStatus: '',   // Returned / Not Returned

        /* ================= NEW ASSET ================= */
        newAssetId: '',
        newAssetSerialNumber: '',

        /* ================= REPLACEMENT DETAILS ================= */
        assetCategory: '',
        replacementType: '',
        reasonForReplacement: '',
        replacementCost: 0,

        /* ================= APPROVAL ================= */
        approvedBy: '',
        approvalDate: this.currentDate || '',

        /* ================= TECHNICAL ================= */
        technicianName: '',

        /* ================= STATUS ================= */
        replacementStatus: 'Active',

        /* ================= REMARKS ================= */
        remarks: '',

        /* ================= AUDIT ================= */
        createdBy: this.loginId || '',   // 🔥 IMPORTANT
        createdDate: this.currentDate || '',

        updatedBy: '',
        updatedDate: '',
      },
    },
  ];
}
  get editHeading(): string {
    if (this.isEditMode && this.editIndex !== null) {
      return (
        'Update Asset Replacement Details (ID: ' +
        this.tableData[this.editIndex].replacementId +
        ')'
      );
    }

    return '';
  }
  loadCallLoggingList(): void {
    if (!this.loginId) return;

    this.commonService.fetchAllCallLoggingByLoginId(this.loginId).subscribe({
      next: (res: any[]) => {
        this.callList = res;
        console.log('Call List Loaded:', this.callList);
      },
      error: (err) => {
        console.error('Call Logging Load Error:', err);
      },
    });
  }
loadEmployees() {
  this.commonService.fetchAllEmployee().subscribe((res: any[]) => {
    this.employeeList = res;
  });
}

loadDepartments() {
  this.commonService.fetchAllDepartments().subscribe((res: any[]) => {
    this.departmentList = res;
  });
}
loadAssets() {
  this.commonService.fetchAllAssets().subscribe((res: any[]) => {
    this.assetList = res;
  });
}
onCallSelect(callId: string, index: number) {

  const record = this.forms[index].newRecord;

  const selected = this.callList.find(
    (c) => c.callLoggingId === callId
  );

  if (selected) {

    // OLD ASSET
    record.oldAssetId = selected.assetId || '';
    record.oldAssetSerialNumber = selected.serialNumber || '';
    record.oldAssetCondition = selected.assetCondition || '';

    // 🔥 AUTO FILL
    record.employeeId = selected.employeeId || '';
    record.departmentId = selected.departmentId || '';
    record.location = selected.location || '';

    // Optional
    record.reasonForReplacement = selected.problemDescription || '';
  }
}
  loadAssetReplacements(): void {
    this.commonService
      .fetchAllAssetReplacementByCompany(this.loginId)
      .subscribe({
        next: (res: TableRow[]) => {
          this.tableData = res.map((item) => ({
            ...item,

            assetReplacementDate: item.replacementDate,
          }));

          this.filteredData = [...this.tableData];
        },

        error: (err) => {
          console.error('API Error:', err);
        },
      });
  }

  tableData: TableRow[] = [];
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

  //search filter
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

    // 🔥 Collect replacement IDs
    const ids: string[] = this.selectedRows.map(
      (row) => row.assetReplacementId,
    );

    // 🔥 Single API call
    this.commonService.deleteMultipleAssetReplacement(ids).subscribe({
      next: () => {
        // remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.replacementId),
        );

        this.filteredData = [...this.tableData];

        this.selectedRows = [];

        this.currentPage = 1;

        this.loadAssetReplacements();

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
    this.tableData = sorted; // keep main data updated
  }

exportExcel() {

  if (!this.tableData || this.tableData.length === 0) {
    this.showToast('No data available to export', 'Warning');
    return;
  }

  const exportData = this.tableData.map((row: TableRow) => ({

    /* ================= PRIMARY ================= */
    Replacement_ID: row.replacementId,
    Replacement_Number: row.replacementNumber,

    /* ================= BASIC ================= */
    Replacement_Date: row.replacementDate,
    Allocation_ID: row.allocationId,
    Call_Logging_ID: row.callLoggingId,
    Employee_ID: row.employeeId,
    Department_ID: row.departmentId,
    Location: row.location,

    /* ================= OLD ASSET ================= */
    Old_Asset_ID: row.oldAssetId,
    Old_Serial_Number: row.oldAssetSerialNumber,
    Old_Condition: row.oldAssetCondition,
    Old_Return_Status: row.oldAssetReturnStatus,

    /* ================= NEW ASSET ================= */
    New_Asset_ID: row.newAssetId,
    New_Serial_Number: row.newAssetSerialNumber,

    /* ================= REPLACEMENT DETAILS ================= */
    Asset_Category: row.assetCategory,
    Replacement_Type: row.replacementType,
    Reason: row.reasonForReplacement,
    Replacement_Cost: row.replacementCost,

    /* ================= APPROVAL ================= */
    Approved_By: row.approvedBy,
    Approval_Date: row.approvalDate,

    /* ================= TECHNICAL ================= */
    Technician: row.technicianName,

    /* ================= STATUS ================= */
    Status: row.replacementStatus,

    /* ================= REMARKS ================= */
    Remarks: row.remarks ?? '',

    /* ================= AUDIT ================= */
    Created_By: row.createdBy,
    Created_Date: row.createdDate,
    Updated_By: row.updatedBy ?? '',
    Updated_Date: row.updatedDate ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  /* ================= AUTO WIDTH ================= */
  worksheet['!cols'] = Object.keys(exportData[0]).map(() => ({
    wch: 22,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset_Replacement');

  /* ================= DOWNLOAD ================= */
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Asset_Replacement_Report_${today}.xlsx`);

  this.showToast('Excel exported successfully', 'Success');
}

 exportDoc() {

  if (!this.tableData || this.tableData.length === 0) {
    this.showToast('No data available to export', 'Warning');
    return;
  }

  const currentDate = new Date().toLocaleDateString();

  let content = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>

<head>
<meta charset="utf-8">

<style>

@page WordSection1 {
  size: 842pt 595pt;
  mso-page-orientation: landscape;
}

div.WordSection1 { page: WordSection1; }

table{
  border-collapse:collapse;
  width:100%;
  table-layout:fixed;
  font-size:10px;
}

th,td{
  border:1px solid #000;
  padding:5px;
  word-wrap:break-word;
}

th{
  background:#f2f2f2;
  font-weight:bold;
}

</style>
</head>

<body>

<div class="WordSection1">

<h2 style="text-align:center;">Asset Replacement Report</h2>

<p>Date: ${currentDate}</p>

<table>

<tr>

<th>Replacement ID</th>
<th>Replacement No</th>
<th>Date</th>
<th>Type</th>
<th>Call ID</th>
<th>Employee</th>
<th>Department</th>
<th>Status</th>

<th>Old Asset ID</th>
<th>Old Serial</th>
<th>Condition</th>
<th>Return Status</th>

<th>New Asset ID</th>
<th>New Serial</th>

<th>Category</th>
<th>Reason</th>
<th>Cost</th>

<th>Approved By</th>
<th>Approval Date</th>

<th>Technician</th>

<th>Remarks</th>

</tr>
`;

  this.tableData.forEach((row: TableRow) => {
    content += `
<tr>

<td>${row.replacementId || ''}</td>
<td>${row.replacementNumber || ''}</td>
<td>${row.replacementDate || ''}</td>
<td>${row.replacementType || ''}</td>
<td>${row.callLoggingId || ''}</td>
<td>${row.employeeId || ''}</td>
<td>${row.departmentId || ''}</td>
<td>${row.replacementStatus || ''}</td>

<td>${row.oldAssetId || ''}</td>
<td>${row.oldAssetSerialNumber || ''}</td>
<td>${row.oldAssetCondition || ''}</td>
<td>${row.oldAssetReturnStatus || ''}</td>

<td>${row.newAssetId || ''}</td>
<td>${row.newAssetSerialNumber || ''}</td>

<td>${row.assetCategory || ''}</td>
<td>${row.reasonForReplacement || ''}</td>
<td>${row.replacementCost || ''}</td>

<td>${row.approvedBy || ''}</td>
<td>${row.approvalDate || ''}</td>

<td>${row.technicianName || ''}</td>

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
  saveAs(blob, `Asset_Replacement_Report_${today}.doc`);

  this.showToast('Word document exported successfully', 'Success');
}

 exportPDF() {

  if (!this.tableData || this.tableData.length === 0) {
    this.showToast('No data available to export', 'Warning');
    return;
  }

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDate = new Date().toLocaleDateString();

  /* ================= HEADER ================= */
  doc.setFontSize(10);
  doc.text(`Date: ${currentDate}`, 10, 12);

  doc.setFontSize(18);
  doc.text('Asset Replacement Records', pageWidth / 2, 12, {
    align: 'center',
  });

  /* ================= TABLE ================= */
  autoTable(doc, {
    startY: 20,

    styles: {
      fontSize: 7,
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
      fontStyle: 'bold',
    },

    tableWidth: 'auto',

    head: [[
      'Replacement ID',
      'Number',
      'Date',
      'Type',
      'Call ID',
      'Employee',
      'Department',
      'Status',

      'Old Asset ID',
      'Old Serial',
      'Condition',
      'Return Status',

      'New Asset ID',
      'New Serial',

      'Category',
      'Reason',
      'Cost',

      'Approved By',
      'Approval Date',

      'Technician',
      'Remarks',
    ]],

    body: this.tableData.map((row: TableRow) => [
      row.replacementId || '',
      row.replacementNumber || '',
      row.replacementDate || '',
      row.replacementType || '',
      row.callLoggingId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.replacementStatus || '',

      row.oldAssetId || '',
      row.oldAssetSerialNumber || '',
      row.oldAssetCondition || '',
      row.oldAssetReturnStatus || '',

      row.newAssetId || '',
      row.newAssetSerialNumber || '',

      row.assetCategory || '',
      row.reasonForReplacement || '',
      row.replacementCost || '',

      row.approvedBy || '',
      row.approvalDate || '',

      row.technicianName || '',
      row.remarks ?? '',
    ]),

    didDrawCell: (data) => {
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
    },

    margin: { left: 5, right: 5 },
    pageBreak: 'auto',
  });

  /* ================= SAVE ================= */
  const today = new Date().toISOString().split('T')[0];
  doc.save(`Asset_Replacement_Report_${today}.pdf`);

  this.showToast('PDF exported successfully', 'Success');
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
  return new Date().toISOString().split('T')[0]; // ✅ yyyy-MM-dd
}

  // ngOnInit() {
  //   // Ensure first form has today's date
  //   if (this.forms && this.forms.length > 0) {
  //     this.forms[0].newRecord.replacementDate = this.getTodayDate();
  //   }
  // }

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
newRecord: TableRow = {

  /* ================= PRIMARY ================= */
  replacementId: '',          // auto generate
  replacementNumber: '',

  /* ================= BASIC ================= */
  replacementDate: this.getTodayDate(),
  allocationId: '',
  callLoggingId: '',
  employeeId: '',
  departmentId: '',
  location: '',

  /* ================= OLD ASSET ================= */
  oldAssetId: '',
  oldAssetSerialNumber: '',
  oldAssetCondition: 'Faulty',        // default
  oldAssetReturnStatus: 'Not Returned',

  /* ================= NEW ASSET ================= */
  newAssetId: '',
  newAssetSerialNumber: '',

  /* ================= REPLACEMENT DETAILS ================= */
  assetCategory: '',
  replacementType: '',                // Warranty / Upgrade / Damage / Breakdown
  reasonForReplacement: '',
  replacementCost: 0,

  /* ================= APPROVAL ================= */
  approvedBy: '',
  approvalDate: this.getTodayDate(),

  /* ================= TECHNICAL ================= */
  technicianName: '',

  /* ================= STATUS ================= */
  replacementStatus: 'Active',

  /* ================= REMARKS ================= */
  remarks: '',

  /* ================= AUDIT ================= */
  createdBy: this.loginId || '',   // 🔥 IMPORTANT
  createdDate: this.getTodayDate(),

  updatedBy: '',
  updatedDate: '',
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

    /* ================= BACKEND STRUCTURE ================= */
    newRecord: {

      /* ================= PRIMARY ================= */
      replacementId: '0',
      replacementNumber: '',

      /* ================= BASIC ================= */
      replacementDate: currentDate,
      allocationId: '',
      callLoggingId: '',
      employeeId: '',
      departmentId: '',
      location: '',

      /* ================= OLD ASSET ================= */
      oldAssetId: '',
      oldAssetSerialNumber: '',
      oldAssetCondition: 'Faulty',
      oldAssetReturnStatus: 'Not Returned',

      /* ================= NEW ASSET ================= */
      newAssetId: '',
      newAssetSerialNumber: '',

      /* ================= REPLACEMENT DETAILS ================= */
      assetCategory: '',
      replacementType: '',
      reasonForReplacement: '',
      replacementCost: 0,

      /* ================= APPROVAL ================= */
      approvedBy: '',
      approvalDate: currentDate,

      /* ================= TECHNICAL ================= */
      technicianName: '',

      /* ================= STATUS ================= */
      replacementStatus: 'Active',

      /* ================= REMARKS ================= */
      remarks: '',

      /* ================= AUDIT ================= */
      createdBy: this.loginId || '',
      createdDate: currentDate,

      updatedBy: '',
      updatedDate: '',
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
saveAllRecords(form?: NgForm) {

  this.showErrors = true;

  /* ================= VALIDATION ================= */
  if (form) {
    Object.keys(form.controls).forEach((key) => {
      form.controls[key].markAsTouched();
      form.controls[key].markAsDirty();
    });
  }

  if (form && !form.valid) return;

  /* ================= PAYLOAD BUILDER ================= */
  const preparePayload = (data: any, isEdit = false, existing?: any) => {

    return {

      /* ================= PRIMARY ================= */
      replacementNumber: (data.replacementNumber || '').trim(),

      /* ================= BASIC ================= */
      replacementDate: data.replacementDate || this.getTodayDate(),
      callLoggingId: data.callLoggingId || '',
      employeeId: data.employeeId || '',
      departmentId: data.departmentId || '',
      location: data.location || '',

      /* ================= OLD ASSET ================= */
      oldAssetId: data.oldAssetId || '',
      oldAssetSerialNumber: data.oldAssetSerialNumber || '',
      oldAssetCondition: data.oldAssetCondition || 'Faulty',
      oldAssetReturnStatus: data.oldAssetReturnStatus || 'Not Returned',

      /* ================= NEW ASSET ================= */
      newAssetId: data.newAssetId || '',
      newAssetSerialNumber: data.newAssetSerialNumber || '',

      /* ================= DETAILS ================= */
      replacementType: data.replacementType || '',
      reasonForReplacement: data.reasonForReplacement || '',
      replacementCost: Number(data.replacementCost) || 0,

      /* ================= APPROVAL ================= */
      approvedBy: data.approvedBy || '',
      approvalDate: data.approvalDate || this.getTodayDate(),

      /* ================= TECH ================= */
      technicianName: data.technicianName || '',

      /* ================= STATUS ================= */
      replacementStatus: data.replacementStatus || 'Active',

      /* ================= AUDIT ================= */
      createdBy: isEdit ? existing?.createdBy : this.loginId,
      createdDate: isEdit ? existing?.createdDate : this.getTodayDate(),

      updatedBy: isEdit ? this.loginId : '',   // ✅ FIX
      updatedDate: isEdit ? this.getTodayDate() : '', // ✅ FIX
    };
  };

  /* ================= EDIT MODE ================= */
  if (this.isEditMode && this.editIndex !== -1) {

    const formData = this.forms[0].newRecord;
    const existing = this.tableData[this.editIndex];

    const payload = preparePayload(formData, true, existing);

    const replacementId = existing?.replacementId;

    if (!replacementId) {
      this.toast.danger('Invalid Replacement ID!', 'ERROR', 3000);
      return;
    }

    console.log('UPDATE PAYLOAD:', payload);

    this.commonService
      .updateAssetReplacement(replacementId, this.loginId, payload)
      .subscribe({
        next: () => {
          this.toast.success('Updated Successfully', 'SUCCESS', 4000);
          this.resetAfterSave();
          this.loadAssetReplacements();
        },
        error: (err) => {
          console.error('UPDATE ERROR:', err);
          this.toast.danger('Update failed!', 'ERROR', 4000);
        },
      });

    return;
  }

  /* ================= ADD MODE ================= */

  const payload = this.forms.map((f) =>
    preparePayload(f.newRecord, false)
  );

  console.log('FINAL SAVE PAYLOAD:', payload);

  this.commonService.submitAssetReplacement(payload).subscribe({
    next: () => {
      this.toast.success('Saved Successfully', 'SUCCESS', 4000);
      this.resetAfterSave();
      this.loadAssetReplacements();
    },
    error: (err) => {
      console.error('SAVE ERROR:', err);
      this.toast.danger('Save failed!', 'ERROR', 4000);
    },
  });
}
  resetAfterSave() {
    this.forms = [
      {
        newRecord: { ...this.newRecord },
      },
    ];

    this.filteredData = [...this.tableData];

    this.showErrors = false;

    this.isEditMode = false;

    this.editIndex = -1;

    this.activeTab = 'details';
  }
  // --------------------------
  // CANCEL / RESET FORM
  // --------------------------
  cancelRecord(form: NgForm) {
    if (form) form.resetForm();
    this.forms = [{ newRecord: { ...this.newRecord } }];
    this.showErrors = false;
  }

  // --------------------------
  // EDIT EXISTING ROW
  // --------------------------
  onEdit(row: TableRow, index: number) {
    this.activeTab = 'newRecord';
    this.isEditMode = true;
    this.editIndex = index;

    // Prefill form with selected row
    this.forms[0] = {
      ...row,
      newRecord: { ...row },
    };

    this.activeForm = 0;
    this.showErrors = false;
  }

  //bulk export date format
  startDateError: string = '';
  endDateError: string = '';
formatDate(event: any, type?: 'start' | 'end') {

  if (!event) return null;

  let date;

  // if event from input
  if (event?.target?.value) {
    date = new Date(event.target.value);
  } else {
    date = new Date(event);
  }

  if (isNaN(date.getTime())) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
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

    this.commonService
      .uploadAssetReplacementExcel(this.selectedFile)
      .subscribe({
        next: (res) => {
          this.loading = false;

          // Reload table
          this.loadAssetReplacements();

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

      case 'replacement id': return 'replacementId';
      case 'replacement number': return 'replacementNumber';
      case 'replacement date': return 'replacementDate';

      case 'allocation id': return 'allocationId';
      case 'call id': return 'callLoggingId';
      case 'employee id': return 'employeeId';
      case 'department id': return 'departmentId';
      case 'location': return 'location';

      case 'old asset id': return 'oldAssetId';
      case 'old serial': return 'oldAssetSerialNumber';
      case 'condition': return 'oldAssetCondition';
      case 'return status': return 'oldAssetReturnStatus';

      case 'new asset id': return 'newAssetId';
      case 'new serial': return 'newAssetSerialNumber';

      case 'category': return 'assetCategory';
      case 'replacement type': return 'replacementType';
      case 'reason': return 'reasonForReplacement';
      case 'cost': return 'replacementCost';

      case 'approved by': return 'approvedBy';
      case 'approval date': return 'approvalDate';

      case 'technician': return 'technicianName';

      case 'status': return 'replacementStatus';
      case 'remarks': return 'remarks';

      case 'created by': return 'createdBy';
      case 'created date': return 'createdDate';
      case 'updated by': return 'updatedBy';
      case 'updated date': return 'updatedDate';

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

    const newRecord: TableRow = {

      /* ================= PRIMARY ================= */
      replacementId:
        obj['replacementId'] || `AR-${this.tableData.length + i}`,

      replacementNumber: obj['replacementNumber'] || '',

      /* ================= BASIC ================= */
      replacementDate: obj['replacementDate'] || this.getTodayDate(),
      allocationId: obj['allocationId'] || '',
      callLoggingId: obj['callLoggingId'] || '',
      employeeId: obj['employeeId'] || '',
      departmentId: obj['departmentId'] || '',
      location: obj['location'] || '',

      /* ================= OLD ASSET ================= */
      oldAssetId: obj['oldAssetId'] || '',
      oldAssetSerialNumber: obj['oldAssetSerialNumber'] || '',
      oldAssetCondition: obj['oldAssetCondition'] || 'Faulty',
      oldAssetReturnStatus: obj['oldAssetReturnStatus'] || 'Not Returned',

      /* ================= NEW ASSET ================= */
      newAssetId: obj['newAssetId'] || '',
      newAssetSerialNumber: obj['newAssetSerialNumber'] || '',

      /* ================= REPLACEMENT DETAILS ================= */
      assetCategory: obj['assetCategory'] || '',
      replacementType: obj['replacementType'] || '',
      reasonForReplacement: obj['reasonForReplacement'] || '',
      replacementCost: Number(obj['replacementCost']) || 0,

      /* ================= APPROVAL ================= */
      approvedBy: obj['approvedBy'] || '',
      approvalDate: obj['approvalDate'] || this.getTodayDate(),

      /* ================= TECHNICAL ================= */
      technicianName: obj['technicianName'] || '',

      /* ================= STATUS ================= */
      replacementStatus: (obj['replacementStatus'] === 'Inactive'
        ? 'Inactive'
        : 'Active') as 'Active' | 'Inactive',

      /* ================= REMARKS ================= */
      remarks: obj['remarks'] || '',

      /* ================= AUDIT ================= */
      createdBy: this.loginId || '',
      createdDate: obj['createdDate'] || this.getTodayDate(),
      updatedBy: obj['updatedBy'] || '',
      updatedDate: obj['updatedDate'] || '',
    };

    results.push(newRecord);
  }

  /* ================= MERGE ================= */
  this.tableData = [...this.tableData, ...results];
  this.filteredData = [...this.tableData];
  this.currentPage = 1;

  this.cdr.detectChanges();

  this.showToast('Asset Replacement CSV imported successfully!', 'success');
}

  // ---------------- Excel Parsing ----------------
readExcel(file: File) {

  const reader = new FileReader();

  reader.onload = () => {

    const workbook = XLSX.read(reader.result, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const json = XLSX.utils.sheet_to_json<any>(sheet);

    json.forEach((obj: any, i: number) => {

      const newRecord: TableRow = {

        /* ================= PRIMARY ================= */
        replacementId:
          obj['Replacement ID'] || `AR-${this.tableData.length + i + 1}`,

        replacementNumber: obj['Replacement Number'] || '',

        /* ================= BASIC ================= */
        replacementDate: obj['Replacement Date'] || this.getTodayDate(),
        allocationId: obj['Allocation ID'] || '',
        callLoggingId: obj['Call ID'] || '',
        employeeId: obj['Employee ID'] || '',
        departmentId: obj['Department ID'] || '',
        location: obj['Location'] || '',

        /* ================= OLD ASSET ================= */
        oldAssetId: obj['Old Asset ID'] || '',
        oldAssetSerialNumber: obj['Old Serial Number'] || '',
        oldAssetCondition: obj['Old Condition'] || 'Faulty',
        oldAssetReturnStatus: obj['Return Status'] || 'Not Returned',

        /* ================= NEW ASSET ================= */
        newAssetId: obj['New Asset ID'] || '',
        newAssetSerialNumber: obj['New Serial Number'] || '',

        /* ================= REPLACEMENT DETAILS ================= */
        assetCategory: obj['Category'] || '',
        replacementType: obj['Replacement Type'] || '',
        reasonForReplacement: obj['Reason'] || '',
        replacementCost: Number(obj['Cost']) || 0,

        /* ================= APPROVAL ================= */
        approvedBy: obj['Approved By'] || '',
        approvalDate: obj['Approval Date'] || this.getTodayDate(),

        /* ================= TECHNICAL ================= */
        technicianName: obj['Technician'] || '',

        /* ================= STATUS ================= */
        replacementStatus:
          obj['Status'] === 'Inactive' ? 'Inactive' : 'Active',

        /* ================= REMARKS ================= */
        remarks: obj['Remarks'] || '',

        /* ================= AUDIT ================= */
        createdBy: this.loginId || '',
        createdDate: obj['Created Date'] || this.getTodayDate(),
        updatedBy: obj['Updated By'] || '',
        updatedDate: obj['Updated Date'] || '',
      };

      this.tableData.push(newRecord);
    });

    /* ================= REFRESH ================= */
    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();

    this.showToast(
      'Asset Replacement Excel imported successfully!',
      'success',
    );
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
      .map((l) => l.trim())
      .filter((l) => l !== '');

    lines.forEach((line, idx) => {

      const cols = line.split(',').map((c) => c.trim());

      // Ensure minimum columns
      while (cols.length < 20) cols.push('');

      const newRecord: TableRow = {

        /* ================= PRIMARY ================= */
        replacementId:
          cols[0] || `AR-${this.tableData.length + idx + 1}`,

        replacementNumber: cols[1] || '',

        /* ================= BASIC ================= */
        replacementDate: cols[2] || this.getTodayDate(),
        allocationId: cols[3] || '',
        callLoggingId: cols[4] || '',
        employeeId: cols[5] || '',
        departmentId: cols[6] || '',
        location: cols[7] || '',

        /* ================= OLD ASSET ================= */
        oldAssetId: cols[8] || '',
        oldAssetSerialNumber: cols[9] || '',
        oldAssetCondition: cols[10] || 'Faulty',
        oldAssetReturnStatus: cols[11] || 'Not Returned',

        /* ================= NEW ASSET ================= */
        newAssetId: cols[12] || '',
        newAssetSerialNumber: cols[13] || '',

        /* ================= REPLACEMENT DETAILS ================= */
        assetCategory: cols[14] || '',
        replacementType: cols[15] || '',
        reasonForReplacement: cols[16] || '',
        replacementCost: Number(cols[17]) || 0,

        /* ================= APPROVAL ================= */
        approvedBy: cols[18] || '',
        approvalDate: cols[19] || this.getTodayDate(),

        /* ================= TECHNICAL ================= */
        technicianName: cols[20] || '',

        /* ================= STATUS ================= */
        replacementStatus:
          cols[21] === 'Inactive' ? 'Inactive' : 'Active',

        /* ================= REMARKS ================= */
        remarks: cols[22] || '',

        /* ================= AUDIT ================= */
        createdBy: this.loginId || '',
        createdDate: this.getTodayDate(),
        updatedBy: '',
        updatedDate: '',
      };

      this.tableData.push(newRecord);
    });

    /* ================= REFRESH ================= */
    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();

    this.showToast(
      'Asset Replacement TXT imported successfully!',
      'success'
    );
  };

  reader.readAsText(file);
}

  // ---------------- DOCX Parsing (mammoth.js) ----------------
async readDOCX(file: File) {

  const reader = new FileReader();

  reader.onload = async () => {

    const arrayBuffer = reader.result as ArrayBuffer;

    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

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

      // Ensure minimum columns
      while (cells.length < 22) cells.push('');

      const newRecord: TableRow = {

        /* ================= PRIMARY ================= */
        replacementId:
          cells[0] || `AR-${this.tableData.length + rowIndex}`,

        replacementNumber: cells[1] || '',

        /* ================= BASIC ================= */
        replacementDate: cells[2] || this.getTodayDate(),
        allocationId: cells[3] || '',
        callLoggingId: cells[4] || '',
        employeeId: cells[5] || '',
        departmentId: cells[6] || '',
        location: cells[7] || '',

        /* ================= OLD ASSET ================= */
        oldAssetId: cells[8] || '',
        oldAssetSerialNumber: cells[9] || '',
        oldAssetCondition: cells[10] || 'Faulty',
        oldAssetReturnStatus: cells[11] || 'Not Returned',

        /* ================= NEW ASSET ================= */
        newAssetId: cells[12] || '',
        newAssetSerialNumber: cells[13] || '',

        /* ================= REPLACEMENT DETAILS ================= */
        assetCategory: cells[14] || '',
        replacementType: cells[15] || '',
        reasonForReplacement: cells[16] || '',
        replacementCost: Number(cells[17]) || 0,

        /* ================= APPROVAL ================= */
        approvedBy: cells[18] || '',
        approvalDate: cells[19] || this.getTodayDate(),

        /* ================= TECHNICAL ================= */
        technicianName: cells[20] || '',

        /* ================= STATUS ================= */
        replacementStatus:
          cells[21] === 'Inactive' ? 'Inactive' : 'Active',

        /* ================= REMARKS ================= */
        remarks: cells[22] || '',

        /* ================= AUDIT ================= */
        createdBy: this.loginId || '',
        createdDate: this.getTodayDate(),
        updatedBy: '',
        updatedDate: '',
      };

      this.tableData.push(newRecord);
    });

    /* ================= REFRESH ================= */
    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();

    this.showToast(
      'Asset Replacement DOCX imported successfully!',
      'success'
    );
  };

  reader.readAsArrayBuffer(file);
}
 downloadSampleCSV() {

  /* ================= HEADERS ================= */
  const headers = [

    'Replacement ID',
    'Replacement Number',
    'Replacement Date',

    'Allocation ID',
    'Call ID',
    'Employee ID',
    'Department ID',
    'Location',

    'Old Asset ID',
    'Old Serial Number',
    'Old Condition',
    'Return Status',

    'New Asset ID',
    'New Serial Number',

    'Category',
    'Replacement Type',
    'Reason',
    'Cost',

    'Approved By',
    'Approval Date',

    'Technician',

    'Status',
    'Remarks'
  ];

  const csvRows: string[] = [];

  /* ================= HEADER ROW ================= */
  csvRows.push(headers.join(','));

  /* ================= SAMPLE DATA ================= */
  const sampleRow = [

    'AR-001',
    'REP-2026-001',
    '2026-03-10',

    'ALLOC-001',
    'CALL-101',
    'EMP-001',
    'DEPT-IT',
    'Pune',

    'AST-001',
    'SN-OLD-123',
    'Faulty',
    'Returned',

    'AST-NEW-001',
    'SN-NEW-999',

    'IT',
    'Replacement',
    'Motherboard failure',
    '15000',

    'Manager A',
    '2026-03-11',

    'Technician X',

    'Active',
    'Sample record'
  ];

  csvRows.push(
    sampleRow.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
  );

  /* ================= DOWNLOAD ================= */
  const csvString = csvRows.join('\n');

  const blob = new Blob([csvString], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'Asset_Replacement_Sample.csv';
  a.click();

  window.URL.revokeObjectURL(url);

  this.showToast('Sample CSV downloaded successfully!', 'success');
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
    // Check if both dates are entered
    if (!this.startDate || !this.endDate) {
      this.showToast('Please enter both Start Date and End Date!', 'warning');
      return;
    }

    const start = this.startDate ? this.parseDDMMYYYY(this.startDate) : null;
    const end = this.endDate ? this.parseDDMMYYYY(this.endDate) : null;

    const filteredData = this.tableData.filter((row) => {
      const rowDate = this.parseDDMMYYYY(row.replacementDate);
      if (!rowDate) return false;

      const includeStart = start && rowDate.getTime() === start.getTime();
      const includeEnd = end && rowDate.getTime() === end.getTime();

      const inRange = (!start || rowDate >= start) && (!end || rowDate <= end);

      return inRange || includeStart || includeEnd;
    });

    if (filteredData.length === 0) {
      this.showToast('No records found for selected date range.', 'warning');
      return;
    }

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
exportCSVfile(data: TableRow[]) {

  const today = new Date();

  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const csvRows: string[] = [];

  /* ================= HEADER INFO ================= */

  csvRows.push(this.companyName || 'Asset Replacement Report');

  if (this.companyEmail) {
    csvRows.push(`Email:,${this.companyEmail}`);
  }

  csvRows.push(`Date:,${formattedDate}`);
  csvRows.push('');

  /* ================= CSV HEADERS ================= */

  const headers = [

    'Replacement ID',
    'Replacement Number',
    'Replacement Date',

    'Allocation ID',
    'Call ID',
    'Employee ID',
    'Department ID',
    'Location',

    'Old Asset ID',
    'Old Serial Number',
    'Old Condition',
    'Return Status',

    'New Asset ID',
    'New Serial Number',

    'Category',
    'Replacement Type',
    'Reason',
    'Cost',

    'Approved By',
    'Approval Date',

    'Technician',

    'Status',
    'Remarks'
  ];

  csvRows.push(headers.join(','));

  /* ================= DATA ROWS ================= */

  data.forEach((row: TableRow) => {

    const rowData = [

      row.replacementId || '',
      row.replacementNumber || '',
      row.replacementDate || '',

      row.allocationId || '',
      row.callLoggingId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.oldAssetId || '',
      row.oldAssetSerialNumber || '',
      row.oldAssetCondition || '',
      row.oldAssetReturnStatus || '',

      row.newAssetId || '',
      row.newAssetSerialNumber || '',

      row.assetCategory || '',
      row.replacementType || '',
      row.reasonForReplacement || '',
      row.replacementCost ?? 0,

      row.approvedBy || '',
      row.approvalDate || '',

      row.technicianName || '',

      row.replacementStatus || '',
      row.remarks || '',
    ];

    csvRows.push(
      rowData.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
  });

  /* ================= DOWNLOAD ================= */

  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Asset_Replacement_Report.csv');
}
  // ---------------- Excel Export ----------------
exportExcelfile(data: TableRow[]) {

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const wsData: any[][] = [

    [this.companyName || 'Asset Replacement Report'],

    this.companyEmail ? ['Email:', this.companyEmail] : [],

    ['Date:', formattedDate],

    [],

    [
      'Replacement ID',
      'Replacement Number',
      'Replacement Date',

      'Allocation ID',
      'Call ID',
      'Employee ID',
      'Department ID',
      'Location',

      'Old Asset ID',
      'Old Serial Number',
      'Old Condition',
      'Return Status',

      'New Asset ID',
      'New Serial Number',

      'Category',
      'Replacement Type',
      'Reason',
      'Cost',

      'Approved By',
      'Approval Date',

      'Technician',

      'Status',
      'Remarks'
    ],
  ];

  /* ================= DATA ROWS ================= */

  data.forEach((row: TableRow) => {

    wsData.push([

      row.replacementId || '',
      row.replacementNumber || '',
      row.replacementDate || '',

      row.allocationId || '',
      row.callLoggingId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.oldAssetId || '',
      row.oldAssetSerialNumber || '',
      row.oldAssetCondition || '',
      row.oldAssetReturnStatus || '',

      row.newAssetId || '',
      row.newAssetSerialNumber || '',

      row.assetCategory || '',
      row.replacementType || '',
      row.reasonForReplacement || '',
      row.replacementCost ?? 0,

      row.approvedBy || '',
      row.approvalDate || '',

      row.technicianName || '',

      row.replacementStatus || '',
      row.remarks || '',
    ]);
  });

  /* ================= CREATE SHEET ================= */

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  /* ================= COLUMN WIDTH ================= */

  worksheet['!cols'] = [

    { wch: 15 }, // ID
    { wch: 20 }, // Number
    { wch: 15 }, // Date

    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },

    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },

    { wch: 16 },
    { wch: 18 },

    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 14 },

    { wch: 18 },
    { wch: 18 },

    { wch: 18 },

    { wch: 14 },
    { wch: 26 },
  ];

  /* ================= CREATE WORKBOOK ================= */

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Asset_Replacement_Report'
  );

  /* ================= DOWNLOAD ================= */

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Asset_Replacement_Report.xlsx');
}

  // ---------------- PDF Export ----------------
exportPDFfile(data: TableRow[]) {

  if (!data || data.length === 0) {
    this.showToast('No data available to export!', 'warning');
    return;
  }

  const doc = new jsPDF('l', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const title = 'Asset Replacement Report';

  /* ================= TITLE ================= */
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

  /* ================= HEADER ================= */
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

    head: [[
      'ID',
      'Number',
      'Date',

      'Allocation',
      'Call ID',
      'Employee',
      'Department',
      'Location',

      'Old Asset',
      'Old Serial',
      'Condition',
      'Return',

      'New Asset',
      'New Serial',

      'Category',
      'Type',
      'Reason',
      'Cost',

      'Approved By',
      'Approval Date',

      'Technician',

      'Status',
      'Remarks'
    ]],

    body: data.map((row: TableRow) => [

      row.replacementId || '',
      row.replacementNumber || '',
      row.replacementDate || '',

      row.allocationId || '',
      row.callLoggingId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.oldAssetId || '',
      row.oldAssetSerialNumber || '',
      row.oldAssetCondition || '',
      row.oldAssetReturnStatus || '',

      row.newAssetId || '',
      row.newAssetSerialNumber || '',

      row.assetCategory || '',
      row.replacementType || '',
      row.reasonForReplacement || '',
      row.replacementCost ?? 0,

      row.approvedBy || '',
      row.approvalDate || '',

      row.technicianName || '',

      row.replacementStatus || '',
      row.remarks || '',
    ]),

    theme: 'grid',
    tableWidth: 'auto',

    styles: {
      fontSize: 7,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
    },

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: 255,
      fontStyle: 'bold',
    },

    margin: { left: 10, right: 10 },

    pageBreak: 'auto',
  });

  /* ================= SAVE ================= */
  doc.save('Asset_Replacement_Report.pdf');
}
// Call select → OLD asset auto fill
onCallChange(callId: string, index: number) {
  const selectedCall = this.callList.find(c => c.callLoggingId === callId);

  if (selectedCall) {
    this.forms[index].newRecord.oldAssetId = selectedCall.assetId;
    this.forms[index].newRecord.oldAssetSerialNumber = selectedCall.serialNumber;
    this.forms[index].newRecord.oldAssetCondition = selectedCall.assetCondition;
    this.forms[index].newRecord.employeeId = selectedCall.employeeId;
    this.forms[index].newRecord.departmentId = selectedCall.departmentId;
    this.forms[index].newRecord.location = selectedCall.location;
  }
}onNewAssetChange(assetId: string, index: number) {
  const asset = this.assetList.find(a => a.assetId === assetId);

  if (asset) {
    this.forms[index].newRecord.newAssetId = asset.assetId;
    this.forms[index].newRecord.newAssetSerialNumber = asset.serialNumber;
  }
}
}
