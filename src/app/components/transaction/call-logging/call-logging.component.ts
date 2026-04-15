/*
 **************************************************************************************
 * Program Name  : CallLoggingComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 12, 2026
 * SRF No.       :
 *
 * Purpose       : Angular Component for Call Logging module.
 *
 * Description   : This component handles all operations related to Call Logging,
 *                 including:
 *                 - Fetch all call logs based on Login ID
 *                 - Add single/multiple call logging records
 *                 - Update existing call logs
 *                 - Delete single/multiple call logs
 *                 - Dynamic form handling with validation
 *                 - Dropdown integration (Employee, Department, Asset)
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (Excel, DOCX)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *                 - Timeline view for call status tracking
 *
 * Features      :
 *   - Auto-fill employee & asset details based on selection
 *   - Multi-record form support
 *   - Date handling & formatting
 *   - File parsing using XLSX, Mammoth, pdfjs
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *
 * Endpoints Used:
 *   - GET    /call-logging/getAllCallLoggingByLoginId/{prefix}/{year}/{code}
 *   - POST   /call-logging/saveAll
 *   - PUT    /call-logging/update/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /call-logging/delete-multiple-callLogging
 *   - POST   /call-logging/import
 *
 * Called From   : Call Logging UI (Frontend)
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

  // 🔹 Primary Key
  callLoggingId: string;

  // 🔹 Basic Info
  departmentId: string;
  employeeId: string;

  // 🔹 Contact Info
  contactNumber: string;
  emailAddress: string;
  location: string;

  // 🔹 Asset Info
  assetId: string;

  // 🔹 Problem Info
  problemCategory: string;
  problemType: string;
  problemDescription: string;

  // 🔹 Call Details
  callPriority: string;

  // ✅ FIXED (Active / Inactive only)
  callStatus: 'Active' | 'Inactive';

  assignedTechnician: string;

  // 🔹 Date & Time
  callDateTime: string;
  expectedResolutionTime: string;

  // 🔹 Resolution
  resolutionDetails: string;
  remarks: string;

  // 🔹 Closing Info
  closeDate: string;
  isReopened: string;

  // 🔹 Audit Fields
  createdBy: string;
  createdDate: string;
  updatedDate: string;
}
@Component({
  selector: 'app-call-logging',
  standalone: false,
  templateUrl: './call-logging.component.html',
  styleUrl: './call-logging.component.css',
})
export class CallLoggingComponent {
  // session variable
  activeForm: number = 0;
  departments: any[] = [];
  designations: any[] = [];
  token: string | null = null;
  userName: any | null = null;
  headCompanyName: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
callList: any[] = [];
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
  assets: any[] = [];
  tableData: TableRow[] = [];
  filteredData: TableRow[] = [];
  employees: any[] = [];
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
  ngOnInit(): void {
    this.token = this.authService.getToken();
    this.userName = this.authService.getUsername();
    this.headCompanyName = this.authService.getEmployeeName();
    this.userRoles = this.authService.getUserRoles();
    this.date = this.authService.getCurrentDate();
    this.loginId = this.authService.getEmployeeId();

    const today = new Date();
    this.currentDate = this.today.toISOString().split('T')[0];
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.currentDate = `${yyyy}-${mm}-${dd}`;

    // 🗓 Initialize form & data
    this.initializeForm();
    this.loadEmployees();
    this.loadDepartments();
    this.loadCallLogging();
    // Department dropdown
    this.loadAssets();

    this.filteredData = [...this.tableData];
  }
private initializeForm(): void {
  this.forms = [
    {
      // 🔹 Primary Key
      callLoggingId: '0',

      // 🔹 Basic Info
      departmentId: '',
      employeeId: '',

      // 🔹 Contact Info
      contactNumber: '',
      emailAddress: '',
      location: '',

      // 🔹 Asset Info
      assetId: '',

      // 🔹 Problem Info
      problemCategory: '',
      problemType: '',
      problemDescription: '',

      // 🔹 Call Details
      callPriority: 'Low',
      callStatus: 'Active',
      assignedTechnician: '',

      // 🔹 Date & Time
      callDateTime: this.currentDate || '',
      expectedResolutionTime: '',

      // 🔹 Resolution
      resolutionDetails: '',
      remarks: '',

      // 🔹 Closing Info
      closeDate: '',
      isReopened: 'No',

      // 🔹 Audit
      createdBy: this.loginId,
      createdDate: this.currentDate || '',
      updatedDate: this.currentDate || '',

      // 🔥 Backend payload
      newRecord: {
        callLoggingId: '0',
        departmentId: '',
        employeeId: '',
        contactNumber: '',
        emailAddress: '',
        location: '',
        assetId: '',
        problemCategory: '',
        problemType: '',
        problemDescription: '',
        callPriority: 'Low',
        callStatus: 'Active',
        assignedTechnician: '',
        callDateTime: this.currentDate || '',
        expectedResolutionTime: '',
        resolutionDetails: '',
        remarks: '',
        closeDate: '',
        isReopened: 'No',
        createdBy: this.loginId,
        createdDate: this.currentDate || '',
        updatedDate: this.currentDate || ''
      }
    }
  ];
}
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

loadEmployees(): void {
  this.commonService.fetchAllEmployee()
    .subscribe({
      next: (res: any[]) => {
        console.log('Employee API Response:', res);

        this.employees = res;   // ✅ CORRECT
      },
      error: (err) => {
        console.error('Employee API Error:', err);
      }
    });
}
  onAssetChange(assetId: string, i: number) {
    const asset = this.assets.find((a: any) => a.assetId === assetId);

    if (asset) {
      this.forms[i].assetName = asset.assetName;
    }
  }
  
loadCallLogging(): void {
  this.loading = true;

  // 🔥 FIX: loginId clean कर
  let loginId = this.loginId;

  console.log('ORIGINAL LOGIN ID:', loginId);

  // जर EMP002 असेल → backend ला तसंच पाठव
  // जर EMP/2026/002 असेल → तसंच ठेव
  if (!loginId) {
    console.error('LOGIN ID is missing!');
    this.loading = false;
    return;
  }

 
  console.log('FINAL LOGIN ID:', loginId);

  this.commonService.fetchAllCallLoggingByLoginId(loginId).subscribe({
    next: (res: any[]) => {
      this.loading = false;

      this.tableData = (res || []).map((item) => ({

        // 🔹 Primary Key
        callLoggingId: item.callLoggingId ?? '',

        // 🔹 Basic Info
        departmentId: item.departmentId ?? '',
        employeeId: item.employeeId ?? '',

        // 🔹 Contact Info
        contactNumber: item.contactNumber ?? '',
        emailAddress: item.emailAddress ?? '',
        location: item.location ?? '',

        // 🔹 Asset Info
        assetId: item.assetId ?? '',

        // 🔹 Problem Info
        problemCategory: item.problemCategory ?? '',
        problemType: item.problemType ?? '',
        problemDescription: item.problemDescription ?? '',

        // 🔹 Call Details
        callPriority: item.callPriority ?? '',
        callStatus: item.callStatus ?? 'Active',

        assignedTechnician: item.assignedTechnician ?? '',

        // 🔹 Date & Time
        callDateTime: item.callDateTime ?? '',
        expectedResolutionTime: item.expectedResolutionTime ?? '',

        // 🔹 Resolution
        resolutionDetails: item.resolutionDetails ?? '',
        remarks: item.remarks ?? '',

        // 🔹 Closing Info
        closeDate: item.closeDate ?? '',
        isReopened: item.isReopened ?? 'No',

        // 🔹 Audit
        createdBy: item.createdBy ?? '',
        createdDate: item.createdDate ?? '',
        updatedDate: item.updatedDate ?? ''

      }));

      this.filteredData = [...this.tableData];
      this.currentPage = 1;

      console.log('FINAL TABLE DATA:', this.tableData);
    },

    error: (err) => {
      this.loading = false;

      console.error('Call Logging API Error:', err);

      this.toast.danger(
        'Failed to load call logging records!',
        'Error',
        4000
      );
    },
  });
}
  loadAssets(): void {
    this.commonService.fetchAssetByLoginId(this.loginId).subscribe({
      next: (res: any[]) => {
        this.assets = res;
      },
      error: (err) => {
        console.error('Asset API Error:', err);
      },
    });
  }
 loadEmployee(): void {

  this.commonService.fetchAllEmployee()
    .subscribe({
      next: (res) => {
        console.log('Employee API Response:', res);

        this.tableData = res;
        this.filteredData = [...this.tableData];
      },
      error: (err) => {
        console.error('Employee API Error:', err);
      }
    });
}
 onEmployeeChange(i: number) {
  const empId = this.forms[i].employeeId; // ✅ correct

  const emp = this.employees.find((e: any) => e.employeeId === empId);

  if (emp) {
    this.forms[i].employeeId = emp.employeeId;
    this.forms[i].contactNumber = emp.contactNumber;
  }
}
  onDepartmentChange(event: any, i: number) {
    const deptId = event.target.value;

    const dept = this.departments.find((d: any) => d.departmentId === deptId);

    if (dept) {
      this.forms[i].departmentId = dept.departmentId;
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
    `Are you sure you want to delete ${this.selectedRows.length} record(s)?`
  );

  if (!confirmed) return;

  // ✅ Correct field name
  const ids: string[] = this.selectedRows.map(
    (row) => row.callLoggingId
  );

  // ✅ Direct list send करायची (backend requirement)
  this.commonService.deleteMultipleCallLogging(ids).subscribe({
    next: () => {

      // ✅ correct field use
      this.tableData = this.tableData.filter(
        (row) => !ids.includes(row.callLoggingId)
      );

      this.filteredData = [...this.tableData];
      this.selectedRows = [];
      this.currentPage = 1;

      // reload
      this.loadCallLogging();

      this.toast.success(
        'Selected records deleted successfully!',
        'Success',
        4000
      );
    },

    error: () => {
      this.toast.danger('Failed to delete records!', 'Error', 4000);
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
    this.toast.warning('No data available to export!', 'Warning', 4000);
    return;
  }

  const exportData = this.tableData.map((row: TableRow) => ({

    // 🔹 Primary
    Call_Logging_ID: row.callLoggingId,

    // 🔹 Basic
    Department_ID: row.departmentId,
    Employee_ID: row.employeeId,

    // 🔹 Contact
    Contact_Number: row.contactNumber,
    Email_Address: row.emailAddress,
    Location: row.location,

    // 🔹 Asset
    Asset_ID: row.assetId,

    // 🔹 Problem
    Problem_Category: row.problemCategory,
    Problem_Type: row.problemType,
    Problem_Description: row.problemDescription,

    // 🔹 Call Details
    Call_Priority: row.callPriority,
    Call_Status: row.callStatus,
    Assigned_Technician: row.assignedTechnician,

    // 🔹 Date & Time
    Call_Date_Time: row.callDateTime,
    Expected_Resolution_Time: row.expectedResolutionTime,

    // 🔹 Resolution
    Resolution_Details: row.resolutionDetails,
    Remarks: row.remarks,

    // 🔹 Closing
    Close_Date: row.closeDate,
    Is_Reopened: row.isReopened,

    // 🔹 Audit
    Created_By: row.createdBy,
    Created_Date: row.createdDate,
    Updated_Date: row.updatedDate,

  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // ✅ Auto column width
  const columnWidths = Object.keys(exportData[0]).map((key) => ({
    wch:
      Math.max(
        key.length,
        ...exportData.map((row) =>
          (row as any)[key] ? (row as any)[key].toString().length : 10
        )
      ) + 2,
  }));

  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CallLoggingData');

  const today = new Date().toISOString().split('T')[0];

  XLSX.writeFile(workbook, `Call_Logging_${today}.xlsx`);
}
 exportDoc() {
  const currentDate = new Date().toLocaleDateString();

  let content = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">

<head>
<meta charset="utf-8" />
<title>Call Logging Report</title>

<style>
@page WordSection1 {
  size: 842pt 595pt;
  mso-page-orientation: landscape;
  margin: 20pt;
}
div.WordSection1 { page: WordSection1; }

table{
  border-collapse: collapse;
  width:100%;
  table-layout: fixed;
  font-size:10px;
}

th,td{
  border:1px solid #000;
  padding:4px;
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

<p class="title">Call Logging Report</p>
<p>Date: ${currentDate}</p>

<table>

<tr>
<th>Call Logging ID</th>
<th>Department ID</th>
<th>Employee ID</th>
<th>Contact Number</th>
<th>Email</th>
<th>Location</th>
<th>Asset ID</th>
<th>Problem Category</th>
<th>Problem Type</th>
<th>Problem Description</th>
<th>Priority</th>
<th>Status</th>
<th>Assigned Technician</th>
<th>Call Date Time</th>
<th>Expected Resolution</th>
<th>Resolution Details</th>
<th>Remarks</th>
<th>Close Date</th>
<th>Reopened</th>
<th>Created By</th>
</tr>
`;

  this.tableData.forEach((row: TableRow) => {
    content += `
<tr>
<td>${row.callLoggingId || ''}</td>
<td>${row.departmentId || ''}</td>
<td>${row.employeeId || ''}</td>
<td>${row.contactNumber || ''}</td>
<td>${row.emailAddress || ''}</td>
<td>${row.location || ''}</td>
<td>${row.assetId || ''}</td>
<td>${row.problemCategory || ''}</td>
<td>${row.problemType || ''}</td>
<td>${row.problemDescription || ''}</td>
<td>${row.callPriority || ''}</td>
<td>${row.callStatus || ''}</td>
<td>${row.assignedTechnician || ''}</td>
<td>${row.callDateTime || ''}</td>
<td>${row.expectedResolutionTime || ''}</td>
<td>${row.resolutionDetails || ''}</td>
<td>${row.remarks || ''}</td>
<td>${row.closeDate || ''}</td>
<td>${row.isReopened || ''}</td>
<td>${row.createdBy || ''}</td>
</tr>
`;
  });

  content += `
</table>
</div>
</body>
</html>
`;

  const blob = new Blob(['\ufeff', content], { type: 'application/msword' });

  saveAs(blob, 'Call_Logging_Report.doc');
}
exportPDF() {
  const doc = new jsPDF('l', 'mm', 'a4');

  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDate = new Date().toLocaleDateString();

  doc.setFontSize(9);
  doc.text(`Date: ${currentDate}`, 10, 10);

  doc.setFontSize(14);
  doc.text('Call Logging Report', pageWidth / 2, 10, { align: 'center' });

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

    head: [[
      'Call Logging ID',
      'Department ID',
      'Employee ID',
      'Contact Number',
      'Email',
      'Location',
      'Asset ID',
      'Problem Category',
      'Problem Type',
      'Problem Description',
      'Priority',
      'Status',
      'Assigned Technician',
      'Call Date Time',
      'Expected Resolution',
      'Resolution Details',
      'Remarks',
      'Close Date',
      'Reopened',
      'Created By'
    ]],

    body: this.tableData.map((row: TableRow) => [
      row.callLoggingId || '',
      row.departmentId || '',
      row.employeeId || '',
      row.contactNumber || '',
      row.emailAddress || '',
      row.location || '',
      row.assetId || '',
      row.problemCategory || '',
      row.problemType || '',
      row.problemDescription || '',
      row.callPriority || '',
      row.callStatus || '',
      row.assignedTechnician || '',
      row.callDateTime || '',
      row.expectedResolutionTime || '',
      row.resolutionDetails || '',
      row.remarks || '',
      row.closeDate || '',
      row.isReopened || '',
      row.createdBy || ''
    ]),
  });

  doc.save('Call_Logging_Report.pdf');
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

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
newRecord: TableRow = {

  // 🔹 Primary Key
  callLoggingId: '',

  // 🔹 Basic Info
  departmentId: '',
  employeeId: '',

  // 🔹 Contact Info
  contactNumber: '',
  emailAddress: '',
  location: '',

  // 🔹 Asset Info
  assetId: '',

  // 🔹 Problem Info
  problemCategory: '',
  problemType: '',
  problemDescription: '',

  // 🔹 Call Details
  callPriority: 'Low',
  callStatus: 'Active',
  assignedTechnician: '',

  // 🔹 Date & Time
callDateTime: this.currentDate,
  expectedResolutionTime: '',

  // 🔹 Resolution
  resolutionDetails: '',
  remarks: '',

  // 🔹 Closing Info
  closeDate: '',
  isReopened: 'No',

  // 🔹 Audit Fields
  createdBy: this.loginId,
  createdDate: this.getTodayDate(),
  updatedDate: this.getTodayDate()
};
  // --------------------------
  // STATE VARIABLES
  // --------------------------
  forms: any[] = [];
  showErrors: boolean = false;

  // --------------------------
  // OPEN NEW RECORD TAB
  // --------------------------
  openNewRecordTab() {
    this.activeTab = 'newRecord';
    this.isEditMode = false;
    this.editIndex = -1;
    this.initializeForm(); // ✅ FIX

    // Reset to single blank form
    this.activeForm = 0;
    this.showErrors = false;
  }

  // --------------------------
  // ADD NEW FORM
  // --------------------------
cancelRecord(form?: NgForm, index?: number) {

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const currentDate = `${yyyy}-${mm}-${dd}`;

  if (index !== undefined) {
    this.forms[index] = {

      // 🔹 Primary
      callLoggingId: '0',

      // 🔹 Basic
      departmentId: '',
      employeeId: '',

      // 🔹 Contact
      contactNumber: '',
      emailAddress: '',
      location: '',

      // 🔹 Asset
      assetId: '',

      // 🔹 Problem
      problemCategory: '',
      problemType: '',
      problemDescription: '',

      // 🔹 Call Details
      callPriority: 'Low',
      callStatus: 'Active',
      assignedTechnician: '',

      // 🔹 Date
      callDateTime: currentDate,
      expectedResolutionTime: '',

      // 🔹 Resolution
      resolutionDetails: '',
      remarks: '',

      // 🔹 Closing
      closeDate: '',
      isReopened: 'No',

      // 🔹 Audit
      createdBy: this.loginId,
      createdDate: currentDate,
      updatedDate: currentDate,

      // 🔥 Backend payload
      newRecord: {
        callLoggingId: '0',
        departmentId: '',
        employeeId: '',
        contactNumber: '',
        emailAddress: '',
        location: '',
        assetId: '',
        problemCategory: '',
        problemType: '',
        problemDescription: '',
        callPriority: 'Low',
        callStatus: 'Active',
        assignedTechnician: '',
        callDateTime: currentDate,
        expectedResolutionTime: '',
        resolutionDetails: '',
        remarks: '',
        closeDate: '',
        isReopened: 'No',
        createdBy: this.loginId,
        createdDate: currentDate,
        updatedDate: currentDate
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

  // ---------------- VALIDATION ----------------
  const invalid = this.forms.some(
    (f) =>
      !f.departmentId?.trim() ||
      !f.employeeId?.trim() ||
      !f.contactNumber?.trim() ||
      !f.assetId?.trim() ||
      !f.problemDescription?.trim() ||
      !f.callPriority?.trim() ||
      !f.assignedTechnician?.trim()
  );

  if (invalid) {
    this.showErrors = true;
    this.toast.warning('Please fill all required fields!', 'Warning', 4000);
    return;
  }

  // ---------------- EDIT MODE ----------------
// ---------------- EDIT MODE ----------------
if (this.isEditMode && this.editIndex !== null) {

  const formData = this.forms[0];

  // ✅ FIX LOGIN ID FORMAT
  const formattedLoginId = this.commonService.formatLoginId(this.loginId);

  console.log("CALL ID:", formData.callLoggingId);
  console.log("LOGIN ID:", formattedLoginId);

  const payload = {

    callLoggingId: formData.callLoggingId,

    departmentId: formData.departmentId,
    employeeId: formData.employeeId,

    contactNumber: formData.contactNumber,
    emailAddress: formData.emailAddress,
    location: formData.location,

    assetId: formData.assetId,

    problemCategory: formData.problemCategory,
    problemType: formData.problemType,
    problemDescription: formData.problemDescription,

    callPriority: formData.callPriority,
    callStatus: formData.callStatus,

    assignedTechnician: formData.assignedTechnician,

    callDateTime: formData.callDateTime,
    expectedResolutionTime: formData.expectedResolutionTime || null,

    resolutionDetails: formData.resolutionDetails,
    remarks: formData.remarks,

    closeDate: formData.closeDate || null,
    isReopened: formData.isReopened || 'No',

    createdBy: formData.createdBy || formattedLoginId,
    createdDate: formData.createdDate,
    updatedDate: this.currentDate
  };

  const callLoggingId = this.tableData[this.editIndex].callLoggingId;

  this.commonService
    .updateCallLogging(callLoggingId, payload) // ✅ FIXED
    .subscribe({
      next: () => {
        this.toast.success('Call Logging Updated Successfully!', 'Success', 4000);
        this.resetAfterSave();
        this.loadCallLogging();
      },
      error: (err) => {
        console.error("UPDATE ERROR:", err);
        this.toast.danger('Update failed. Service unavailable!', 'Error', 4000);
      },
    });

  return;
}

  // ---------------- ADD MODE ----------------
 const payload = this.forms.map((f) => ({
  callLoggingId: f.callLoggingId || '0',

  departmentId: f.departmentId,
  employeeId: f.employeeId,

  contactNumber: f.contactNumber,
  emailAddress: f.emailAddress,
  location: f.location,

  assetId: f.assetId,

  problemCategory: f.problemCategory,
  problemType: f.problemType,
  problemDescription: f.problemDescription,

  callPriority: f.callPriority,
  callStatus: f.callStatus,

  assignedTechnician: f.assignedTechnician,

  // ✅ FIXED
  callDateTime: f.callDateTime,
  expectedResolutionTime: f.expectedResolutionTime || null,

  resolutionDetails: f.resolutionDetails,
  remarks: f.remarks,

  closeDate: f.closeDate || null,
  isReopened: f.isReopened,

  createdBy: f.createdBy || this.loginId,
  createdDate: this.currentDate,
  updatedDate: this.currentDate
}));

  console.log('FINAL PAYLOAD:', payload);

  this.commonService.submitCallLogging(payload).subscribe({
    next: (res) => {

      if (res?.dublicateMessages?.length) {
        res.dublicateMessages.forEach((msg: string) =>
          this.toast.warning(msg, 'Warning', 4000)
        );
      }

      this.toast.success('Call Logging Added Successfully!', 'Success', 4000);

      this.resetAfterSave();
      this.loadCallLogging();
    },

    error: () => {
      this.toast.danger('Save failed. Call Logging service down!', 'Error', 4000);
    },
  });
}
  resetAfterSave() {
    this.initializeForm(); // ✅ BEST

    this.isEditMode = false;
    this.editIndex = null;
    this.activeTab = 'details';
    this.showErrors = false;
  }
addForm() {
  if (this.isEditMode) return;

  const currentDate = this.currentDate;

  this.forms.push({

    // 🔹 Primary
    callLoggingId: '0',

    // 🔹 Basic
    departmentId: '',
    employeeId: '',

    // 🔹 Contact
    contactNumber: '',
    emailAddress: '',
    location: '',

    // 🔹 Asset
    assetId: '',

    // 🔹 Problem
    problemCategory: '',
    problemType: '',
    problemDescription: '',

    // 🔹 Call Details
    callPriority: 'Low',
    callStatus: 'Active',
    assignedTechnician: '',

    // 🔹 Date
    callDateTime: currentDate,
    expectedResolutionTime: '',

    // 🔹 Resolution
    resolutionDetails: '',
    remarks: '',

    // 🔹 Closing
    closeDate: '',
    isReopened: 'No',

    // 🔹 Audit
    createdBy: this.loginId,
    createdDate: currentDate,
    updatedDate: currentDate,

    // 🔥 Backend payload
    newRecord: {
      callLoggingId: '0',
      departmentId: '',
      employeeId: '',
      contactNumber: '',
      emailAddress: '',
      location: '',
      assetId: '',
      problemCategory: '',
      problemType: '',
      problemDescription: '',
      callPriority: 'Low',
      callStatus: 'Active',
      assignedTechnician: '',
      callDateTime: currentDate,
      expectedResolutionTime: '',
      resolutionDetails: '',
      remarks: '',
      closeDate: '',
      isReopened: 'No',
      createdBy: this.loginId,
      createdDate: currentDate,
      updatedDate: currentDate
    }
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

    // ✅ Direct assign (NO newRecord)
    this.forms[0] = {
      ...row,
      newRecord: { ...row }, // 🔥 MUST
    };
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
      this.toast.warning('Please select a file first!', 'Warning', 4000);
      return;
    }

    // Allowed Excel file types
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedTypes.includes(this.selectedFile.type)) {
      this.toast.danger(
        'Only Excel files (.xlsx, .xls) are allowed!',
        'Error',
        4000,
      );
      return;
    }

    this.loading = true;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('loginId', this.newRecord.createdBy);

    this.commonService.uploadCallLoggingExcel(this.selectedFile).subscribe({
      next: (res: any) => {
        this.loading = false;

        // Reload table
        this.loadCallLogging();

        const count = Array.isArray(res) ? res.length : 0;

        this.toast.success(
          `Imported ${count} records successfully!`,
          'Success',
          4000,
        );

        // Clear file input
        this.selectedFile = null;
      },

      error: (err) => {
        this.loading = false;

        console.error('Upload Error:', err);

        this.toast.danger(
          'Import failed. Please check the Excel format.',
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
  // ---------------- Excel Parsing ----------------
readExcel(file: File) {
  const reader = new FileReader();

  reader.onload = () => {
    const workbook = XLSX.read(reader.result, { type: 'binary' });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    json.forEach((obj: any, i: number) => {

      const row: TableRow = {

        // 🔹 Primary
        callLoggingId:
          obj['Call Logging ID'] ||
          `CALL-${String(this.tableData.length + i + 1).padStart(3, '0')}`,

        // 🔹 Basic
        departmentId: obj['Department ID'] || '',
        employeeId: obj['Employee ID'] || '',

        // 🔹 Contact
        contactNumber: obj['Contact Number'] || '',
        emailAddress: obj['Email Address'] || '',
        location: obj['Location'] || '',

        // 🔹 Asset
        assetId: obj['Asset ID'] || '',

        // 🔹 Problem
        problemCategory: obj['Problem Category'] || '',
        problemType: obj['Problem Type'] || '',
        problemDescription: obj['Problem Description'] || '',

        // 🔹 Call Details
        callPriority:
          (obj['Call Priority'] as 'Low' | 'Medium' | 'High' | 'Critical') || 'Low',

        callStatus:
          (obj['Call Status'] as 'Active' | 'Inactive') || 'Active',

        assignedTechnician: obj['Assigned Technician'] || '',

        // 🔹 Date
        callDateTime: obj['Call Date Time'] || this.getTodayDate(),
        expectedResolutionTime: obj['Expected Resolution Time'] || '',

        // 🔹 Resolution
        resolutionDetails: obj['Resolution Details'] || '',
        remarks: obj['Remarks'] || '',

        // 🔹 Closing
        closeDate: obj['Close Date'] || '',
        isReopened: obj['Is Reopened'] || 'No',

        // 🔹 Audit
        createdBy: this.loginId || '',
        createdDate: this.getTodayDate(),
        updatedDate: this.getTodayDate()
      };

      this.tableData.push(row);
    });

    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.toast.success('Excel imported successfully!', 'Success', 4000);
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
async readDOCX(file: File) {

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml({ arrayBuffer });

  const doc = new DOMParser().parseFromString(result.value, 'text/html');

  const table = doc.querySelector('table');

  if (!table) {
    this.toast.danger('No table found in DOCX!', 'Error', 4000);
    return;
  }

  const rows = table.querySelectorAll('tr');

  rows.forEach((row, i) => {
    if (i === 0) return; // skip header

    const cells = Array.from(row.querySelectorAll('td')).map(
      (c) => c.textContent?.trim() || ''
    );

    // 🔥 Ensure full columns (20 fields)
    while (cells.length < 20) cells.push('');

    const newRecord: TableRow = {

      // 🔹 Primary
      callLoggingId:
        cells[0] ||
        `CALL-${String(this.tableData.length + i).padStart(3, '0')}`,

      // 🔹 Basic
      departmentId: cells[1] || '',
      employeeId: cells[2] || '',

      // 🔹 Contact
      contactNumber: cells[3] || '',
      emailAddress: cells[4] || '',
      location: cells[5] || '',

      // 🔹 Asset
      assetId: cells[6] || '',

      // 🔹 Problem
      problemCategory: cells[7] || '',
      problemType: cells[8] || '',
      problemDescription: cells[9] || '',

      // 🔹 Call Details
      callPriority:
        (cells[10] as 'Low' | 'Medium' | 'High' | 'Critical') || 'Low',

      callStatus:
        (cells[11] as 'Active' | 'Inactive') || 'Active',

      assignedTechnician: cells[12] || '',

      // 🔹 Date
      callDateTime: cells[13] || this.getTodayDate(),
      expectedResolutionTime: cells[14] || '',

      // 🔹 Resolution
      resolutionDetails: cells[15] || '',
      remarks: cells[16] || '',

      // 🔹 Closing
      closeDate: cells[17] || '',
      isReopened: cells[18] || 'No',

      // 🔹 Audit
      createdBy: this.loginId || '',
      createdDate: this.getTodayDate(),
      updatedDate: this.getTodayDate()
    };

    this.tableData.push(newRecord);
  });

  this.filteredData = [...this.tableData];
  this.currentPage = 1;

  this.toast.success('DOCX table imported successfully!', 'Success', 4000);
}
  // ---------------- CSV Download ----------------
 downloadSampleCSV() {
  if (!this.tableData || this.tableData.length === 0) {
    this.toast.warning('No data available to download!', 'Warning', 4000);
    return;
  }

  const headers = [
    'Call Logging ID',
    'Department ID',
    'Employee ID',
    'Contact Number',
    'Email Address',
    'Location',
    'Asset ID',
    'Problem Category',
    'Problem Type',
    'Problem Description',
    'Call Priority',
    'Call Status',
    'Assigned Technician',
    'Call Date Time',
    'Expected Resolution Time',
    'Resolution Details',
    'Remarks',
    'Close Date',
    'Is Reopened',
    'Created By'
  ];

  const csvRows: string[] = [];

  // Header
  csvRows.push(headers.join(','));

  // Data
  this.tableData.forEach((row: TableRow) => {
    const rowData = [
      row.callLoggingId || '',
      row.departmentId || '',
      row.employeeId || '',
      row.contactNumber || '',
      row.emailAddress || '',
      row.location || '',
      row.assetId || '',
      row.problemCategory || '',
      row.problemType || '',
      row.problemDescription || '',
      row.callPriority || '',
      row.callStatus || '',
      row.assignedTechnician || '',
      row.callDateTime || '',
      row.expectedResolutionTime || '',
      row.resolutionDetails || '',
      row.remarks || '',
      row.closeDate || '',
      row.isReopened || '',
      row.createdBy || ''
    ];

    csvRows.push(rowData.join(','));
  });

  const csvString = csvRows.join('\n');

  const blob = new Blob([csvString], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'Call_Logging_Data.csv';

  a.click();

  window.URL.revokeObjectURL(url);
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

    const start = this.startDate ? new Date(this.startDate) : null;
    const end = this.endDate ? new Date(this.endDate) : null;

    // Filter based on Call Date Time
    const filteredData = this.tableData.filter((row: TableRow) => {
      if (!row.callDateTime) return false;

      const rowDate = new Date(row.callDateTime);

      if (isNaN(rowDate.getTime())) return false;

      const inRange = (!start || rowDate >= start) && (!end || rowDate <= end);

      return inRange;
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

 exportCSVfile(data: TableRow[]) {

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const csvRows: string[] = [];

  // --------------------------
  // HEADER
  // --------------------------

  csvRows.push(this.headCompanyName || 'Company Name');
  csvRows.push(`Date:,${formattedDate}`);
  csvRows.push('');

  const headers = [
    'Call Logging ID',
    'Department ID',
    'Employee ID',
    'Contact Number',
    'Email Address',
    'Location',
    'Asset ID',
    'Problem Category',
    'Problem Type',
    'Problem Description',
    'Call Priority',
    'Call Status',
    'Assigned Technician',
    'Call Date Time',
    'Expected Resolution Time',
    'Resolution Details',
    'Remarks',
    'Close Date',
    'Is Reopened',
    'Created By'
  ];

  csvRows.push(headers.join(','));

  // --------------------------
  // DATA ROWS
  // --------------------------

  data.forEach((row: TableRow) => {

    const sanitize = (val: any) =>
      (val || '').toString().replace(/,/g, ' ');

    csvRows.push([
      sanitize(row.callLoggingId),
      sanitize(row.departmentId),
      sanitize(row.employeeId),
      sanitize(row.contactNumber),
      sanitize(row.emailAddress),
      sanitize(row.location),
      sanitize(row.assetId),
      sanitize(row.problemCategory),
      sanitize(row.problemType),
      sanitize(row.problemDescription),
      sanitize(row.callPriority),
      sanitize(row.callStatus),
      sanitize(row.assignedTechnician),
      sanitize(row.callDateTime),
      sanitize(row.expectedResolutionTime),
      sanitize(row.resolutionDetails),
      sanitize(row.remarks),
      sanitize(row.closeDate),
      sanitize(row.isReopened),
      sanitize(row.createdBy)
    ].join(','));

  });

  // --------------------------
  // SAVE CSV
  // --------------------------

  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Filtered_Call_Logging_Report.csv');
}

  // ---------------- Excel Export ----------------
  // ---------------- Excel Export ----------------
 exportExcelfile(data: TableRow[]) {

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  // --------------------------
  // HEADER
  // --------------------------

  const wsData = [
    [this.headCompanyName || 'Company Name'],
    ['Date:', formattedDate],
    [],
    [
      'Call Logging ID',
      'Department ID',
      'Employee ID',
      'Contact Number',
      'Email Address',
      'Location',
      'Asset ID',
      'Problem Category',
      'Problem Type',
      'Problem Description',
      'Call Priority',
      'Call Status',
      'Assigned Technician',
      'Call Date Time',
      'Expected Resolution Time',
      'Resolution Details',
      'Remarks',
      'Close Date',
      'Is Reopened',
      'Created By'
    ],
  ];

  // --------------------------
  // DATA ROWS
  // --------------------------

  data.forEach((row: TableRow) => {

    const safe = (val: any) => val || '';

    wsData.push([
      safe(row.callLoggingId),
      safe(row.departmentId),
      safe(row.employeeId),
      safe(row.contactNumber),
      safe(row.emailAddress),
      safe(row.location),
      safe(row.assetId),
      safe(row.problemCategory),
      safe(row.problemType),
      safe(row.problemDescription),
      safe(row.callPriority),
      safe(row.callStatus),
      safe(row.assignedTechnician),
      safe(row.callDateTime),
      safe(row.expectedResolutionTime),
      safe(row.resolutionDetails),
      safe(row.remarks),
      safe(row.closeDate),
      safe(row.isReopened),
      safe(row.createdBy)
    ]);
  });

  // --------------------------
  // CREATE WORKSHEET
  // --------------------------

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  worksheet['!cols'] = wsData[3].map((h: any) => ({
    wch: Math.max(String(h).length + 2, 20),
  }));

  // --------------------------
  // CREATE WORKBOOK
  // --------------------------

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Call Logs');

  // --------------------------
  // SAVE FILE
  // --------------------------

  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, 'Filtered_Call_Logging_Report.xlsx');
}

  // ---------------- PDF Export ----------------
exportPDFfile(data: TableRow[]) {

  if (!data || data.length === 0) {
    this.showToast('No data available to export!', 'warning');
    return;
  }

  const doc = new jsPDF('l', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // --------------------------
  // TITLE
  // --------------------------

  const title = 'Filtered Call Logging Records';

  doc.setFontSize(20);
  doc.setTextColor(0, 70, 140);
  doc.text(title, pageWidth / 2, 50, { align: 'center' });

  doc.setDrawColor(0, 70, 140);
  doc.setLineWidth(1);
  doc.line(
    pageWidth / 2 - doc.getTextWidth(title) / 2,
    55,
    pageWidth / 2 + doc.getTextWidth(title) / 2,
    55
  );

  // --------------------------
  // SUBTITLE
  // --------------------------

  const topY = 85;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  doc.text(this.headCompanyName || 'Company Name', 40, topY);

  doc.text(new Date().toLocaleDateString(), pageWidth - 40, topY, {
    align: 'right',
  });

  // --------------------------
  // TABLE
  // --------------------------

  autoTable(doc, {
    startY: topY + 25,

    head: [[
      'Call Logging ID',
      'Department ID',
      'Employee ID',
      'Contact Number',
      'Email',
      'Location',
      'Asset ID',
      'Problem Category',
      'Problem Type',
      'Problem Description',
      'Priority',
      'Status',
      'Assigned Technician',
      'Call Date Time',
      'Expected Resolution',
      'Resolution Details',
      'Remarks',
      'Close Date',
      'Reopened',
      'Created By'
    ]],

    body: data.map((row: TableRow) => [

      row.callLoggingId || '',
      row.departmentId || '',
      row.employeeId || '',
      row.contactNumber || '',
      row.emailAddress || '',
      row.location || '',
      row.assetId || '',
      row.problemCategory || '',
      row.problemType || '',
      row.problemDescription || '',
      row.callPriority || '',
      row.callStatus || '',
      row.assignedTechnician || '',
      row.callDateTime || '',
      row.expectedResolutionTime || '',
      row.resolutionDetails || '',
      row.remarks || '',
      row.closeDate || '',
      row.isReopened || '',
      row.createdBy || ''

    ]),

    theme: 'grid',

    tableWidth: 'auto',

    styles: {
      fontSize: 7,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle',
    },

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },

    margin: { left: 20, right: 20 },

    pageBreak: 'auto',
  });

  // --------------------------
  // SAVE
  // --------------------------

  doc.save('Filtered_Call_Logging_Report.pdf');
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
