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

interface TableRow {
  assetReplacementId: string;
  assetReplacementCode: string;
  assetReplacementDate: string;
  assetReplacementType: string;
  assetReplacementCallId: string;
  assetReplacementInitiatedBy: string;
  department: string;

  oldAssetId: string;
  oldAssetName: string;
  oldAssetType: string;
  oldAssetSerialNumber: string;
  oldAmcStatus: 'AMC' | 'Warranty' | 'Out of AMC';
  assetCondition: string;
  assetFaultDescription: string;
  newAssetId: string;
  newAssetName: string;
  newAssetSerialNumber: string;
  status: 'Active' | 'Inactive';
  loginId: string;
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

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    this.currentDate = `${yyyy}-${mm}-${dd}`;

    // Initialize form + load data
    this.initializeForm();
    this.loadAssetReplacements();
    this.loadCallLoggingList();
    this.filteredData = [...this.tableData];
  }

  private initializeForm(): void {
    this.forms = [
      {
        assetReplacementCode: '',
        assetReplacementDate: this.currentDate || '',
        assetReplacementType: '',
        assetReplacementCallId: '',
        assetReplacementInitiatedBy: '',

        /* ================= DEPARTMENT ================= */
        department: '', // UI display
        departmentId: '', // 🔥 backend use

        /* ================= OLD ASSET ================= */
        oldAssetId: '',
        oldAssetName: '',
        oldAssetType: '',
        oldAssetSerialNumber: '',
        oldAmcStatus: 'AMC',

        assetCondition: '',
        assetFaultDescription: '',

        /* ================= NEW ASSET ================= */
        newAssetId: '',
        newAssetName: '',
        newAssetSerialNumber: '',

        /* ================= SYSTEM ================= */
        status: 'Active',

        /* ================= LOGIN ================= */
        loginId: this.loginId || '',

        /* ================= NEW RECORD ================= */
        newRecord: {
          assetReplacementId: '0',
          assetReplacementCode: '',
          assetReplacementDate: this.currentDate || '',
          assetReplacementType: '',
          assetReplacementCallId: '',
          assetReplacementInitiatedBy: '',

          department: '', // UI
          departmentId: '', // 🔥 backend

          oldAssetId: '',
          oldAssetName: '',
          oldAssetType: '',
          oldAssetSerialNumber: '',
          oldAmcStatus: 'AMC',

          assetCondition: '',
          assetFaultDescription: '',

          newAssetId: '',
          newAssetName: '',
          newAssetSerialNumber: '',

          status: 'Active',
          loginId: this.loginId || '',
        },
      },
    ];
  }

  get editHeading(): string {
    if (this.isEditMode && this.editIndex !== null) {
      return (
        'Update Asset Replacement Details (ID: ' +
        this.tableData[this.editIndex].assetReplacementId +
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
  onCallSelect(callId: string, index: number) {
    const form = this.forms[index];
    const record = this.forms[index].newRecord;

    const selected = this.callList.find((c) => c.callLogId === callId);

    if (selected) {
      // 🔥 BOTH SET (UI + BACKEND)

      form.oldAssetId = record.oldAssetId = selected.assetId || '';
      form.oldAssetName = record.oldAssetName = selected.assetName || '';
      form.oldAssetType = record.oldAssetType = selected.problemType || '';
      form.oldAssetSerialNumber = record.oldAssetSerialNumber =
        selected.serialNumber || '';

      form.assetFaultDescription = record.assetFaultDescription =
        selected.problemDescription || '';

      // 🔥 MOST IMPORTANT
      form.departmentId = record.departmentId = selected.departmentId;

      this.commonService
        .fetchSingalDepartmentByDepartment(selected.departmentId)
        .subscribe((dept: any) => {
          form.department = record.department = dept.departmentName;
        });
    }
  }
  loadAssetReplacements(): void {
    this.commonService
      .fetchAllAssetReplacementByCompany(this.loginId)
      .subscribe({
        next: (res: TableRow[]) => {
          this.tableData = res.map((item) => ({
            ...item,

            assetReplacementDate: item.assetReplacementDate,
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
          (row) => !ids.includes(row.assetReplacementId),
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
    const exportData = this.tableData.map((row: TableRow) => ({
      Replacement_ID: row.assetReplacementId,

      Replacement_Code: row.assetReplacementCode,

      Replacement_Date: row.assetReplacementDate,

      Replacement_Type: row.assetReplacementType,

      Call_ID: row.assetReplacementCallId,

      Initiated_By: row.assetReplacementInitiatedBy,

      Department: row.department,

      Status: row.status,

      Old_Asset_ID: row.oldAssetId,

      Old_Asset_Name: row.oldAssetName,

      Old_Asset_Type: row.oldAssetType,

      Old_Serial_Number: row.oldAssetSerialNumber,

      Old_AMC_Status: row.oldAmcStatus,

      Fault_Description: row.assetFaultDescription,

      Asset_Condition: row.assetCondition,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto column width
    worksheet['!cols'] = Object.keys(exportData[0]).map(() => ({
      wch: 22,
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'AssetReplacementData');

    XLSX.writeFile(workbook, 'Asset_Replacement_Report.xlsx');
  }

  exportDoc() {
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
<th>Replacement Code</th>
<th>Replacement Date</th>
<th>Replacement Type</th>
<th>Call ID</th>
<th>Initiated By</th>
<th>Department</th>
<th>Status</th>

<th>Old Asset ID</th>
<th>Old Asset Name</th>
<th>Old Asset Type</th>
<th>Old Serial No</th>
<th>Old AMC Status</th>
<th>Fault Description</th>
<th>Asset Condition</th>

</tr>
`;

    this.tableData.forEach((row: TableRow) => {
      content += `

<tr>

<td>${row.assetReplacementId || ''}</td>
<td>${row.assetReplacementCode || ''}</td>
<td>${row.assetReplacementDate || ''}</td>
<td>${row.assetReplacementType || ''}</td>
<td>${row.assetReplacementCallId || ''}</td>
<td>${row.assetReplacementInitiatedBy || ''}</td>
<td>${row.department || ''}</td>
<td>${row.status || ''}</td>

<td>${row.oldAssetId || ''}</td>
<td>${row.oldAssetName || ''}</td>
<td>${row.oldAssetType || ''}</td>
<td>${row.oldAssetSerialNumber || ''}</td>
<td>${row.oldAmcStatus || ''}</td>
<td>${row.assetFaultDescription || ''}</td>
<td>${row.assetCondition || ''}</td>

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

    saveAs(blob, 'Asset_Replacement_Report.doc');
  }

  exportPDF() {
    const doc = new jsPDF('l', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();

    const currentDate = new Date().toLocaleDateString();

    // Date (left)
    doc.setFontSize(10);
    doc.text(`Date: ${currentDate}`, 10, 12);

    // Title (center)
    doc.setFontSize(18);
    doc.text('Asset Replacement Records', pageWidth / 2, 12, {
      align: 'center',
    });

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
        textColor: '#fff',
        halign: 'center',
        fontStyle: 'bold',
      },

      tableWidth: 'auto',

      head: [
        [
          'Replacement ID',
          'Code',
          'Date',
          'Type',
          'Call ID',
          'Initiated By',
          'Department',
          'Status',

          'Old Asset ID',
          'Old Name',
          'Old Type',
          'Old Serial',
          'Old AMC',

          'Fault Description',
          'Condition',
        ],
      ],

      body: this.tableData.map((row: TableRow) => [
        row.assetReplacementId || '',
        row.assetReplacementCode || '',
        row.assetReplacementDate || '',
        row.assetReplacementType || '',
        row.assetReplacementCallId || '',
        row.assetReplacementInitiatedBy || '',
        row.department || '',
        row.status || '',

        row.oldAssetId || '',
        row.oldAssetName || '',
        row.oldAssetType || '',
        row.oldAssetSerialNumber || '',
        row.oldAmcStatus || '',

        row.assetFaultDescription || '',
        row.assetCondition || '',
      ]),

      didDrawCell: (data) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);

        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
      },

      margin: { left: 5, right: 5 },

      pageBreak: 'auto',
    });

    doc.save('Asset_Replacement_Report.pdf');
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
    assetReplacementId: '', // auto generate
    assetReplacementCode: '',
    assetReplacementDate: this.getTodayDate(),
    assetReplacementType: '', // Permanent / Temporary
    assetReplacementCallId: '',
    assetReplacementInitiatedBy: '',
    department: '',
    newAssetId: '',
    newAssetName: '',
    newAssetSerialNumber: '',
    status: 'Active',
    oldAssetId: '',
    oldAssetName: '',
    oldAssetType: '',
    oldAssetSerialNumber: '',
    oldAmcStatus: 'AMC',
    assetCondition: '',
    assetFaultDescription: '',
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
    if (this.isEditMode) {
      return;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const currentDate = `${yyyy}-${mm}-${dd}`;

    this.forms.push({
      /* ================= UI BINDING ================= */
      assetReplacementCode: '',
      assetReplacementDate: currentDate,
      assetReplacementType: '',
      assetReplacementCallId: '',
      assetReplacementInitiatedBy: '',

      department: '',
      departmentId: '',
      oldAssetId: '',
      oldAssetName: '',
      oldAssetType: '',
      oldAssetSerialNumber: '',
      oldAmcStatus: 'AMC',

      assetCondition: '',
      assetFaultDescription: '',

      newAssetId: '',
      newAssetName: '',
      newAssetSerialNumber: '',

      status: 'Active',
      loginId: this.loginId,

      /* ================= BACKEND ================= */
      newRecord: {
        assetReplacementId: '0',
        assetReplacementCode: '',
        assetReplacementDate: currentDate,
        assetReplacementType: '',
        assetReplacementCallId: '',
        assetReplacementInitiatedBy: '',

        department: '',
        departmentId: '',
        oldAssetId: '',
        oldAssetName: '',
        oldAssetType: '',
        oldAssetSerialNumber: '',
        oldAmcStatus: 'AMC',

        assetCondition: '',
        assetFaultDescription: '',

        newAssetId: '',
        newAssetName: '',
        newAssetSerialNumber: '',

        status: 'Active',
        loginId: this.loginId,
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

    /* ================= COMMON FUNCTION ================= */
    const preparePayload = (data: any) => ({
      assetReplacementCode: data.assetReplacementCode || '',
      assetReplacementDate: data.assetReplacementDate || this.getTodayDate(),
      assetReplacementType: data.assetReplacementType || '',
      assetReplacementCallId: data.assetReplacementCallId || '',
      assetReplacementInitiatedBy: data.assetReplacementInitiatedBy || '',
      department: data.departmentId || '',

      /* NEW ASSET */
      newAssetId: data.newAssetId || '',
      newAssetName: data.newAssetName || '',
      newAssetSerialNumber: data.newAssetSerialNumber || '',

      status: data.status || 'Active',

      /* OLD ASSET */
      oldAssetId: data.oldAssetId || '',
      oldAssetName: data.oldAssetName || '',
      oldAssetType: data.oldAssetType || '',
      oldAssetSerialNumber: data.oldAssetSerialNumber || '',
      oldAmcStatus: data.oldAmcStatus || 'AMC',

      assetFaultDescription: data.assetFaultDescription || '',
      assetCondition: data.assetCondition || '',

      loginId: this.loginId,
    });

    /* ================= EDIT MODE ================= */
    if (this.isEditMode && this.editIndex !== -1) {
      const formData = this.forms[0].newRecord;

      const payload = preparePayload(formData);

      const replacementId = this.tableData[this.editIndex].assetReplacementId;

      this.commonService
        .updateAssetReplacement(replacementId, this.loginId, payload)
        .subscribe({
          next: () => {
            this.toast.success(
              'Asset Replacement updated successfully',
              'SUCCESS',
              4000,
            );

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

    const payload = this.forms.map((f) => preparePayload(f.newRecord));

    console.log('SAVE PAYLOAD:', payload); // 🔥 debug

    this.commonService.submitAssetReplacement(payload).subscribe({
      next: () => {
        this.toast.success(
          'Asset Replacement record added successfully!',
          'SUCCESS',
          4000,
        );

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
        case 'replacement id':
          return 'assetReplacementId';

        case 'replacement code':
          return 'assetReplacementCode';

        case 'replacement date':
          return 'assetReplacementDate';

        case 'replacement type':
          return 'assetReplacementType';

        case 'call id':
          return 'assetReplacementCallId';

        case 'initiated by':
          return 'assetReplacementInitiatedBy';

        case 'department':
          return 'department';

        case 'status':
          return 'status';

        case 'old asset id':
          return 'oldAssetId';

        case 'old asset name':
          return 'oldAssetName';

        case 'old asset type':
          return 'oldAssetType';

        case 'old serial number':
          return 'oldAssetSerialNumber';

        case 'amc status':
          return 'oldAmcStatus';

        case 'fault description':
          return 'assetFaultDescription';

        case 'asset condition':
          return 'assetCondition';

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
        assetReplacementId:
          obj['assetReplacementId'] || `AR-${this.tableData.length + i}`,

        assetReplacementCode: obj['assetReplacementCode'] || '',

        assetReplacementDate:
          obj['assetReplacementDate'] || this.getTodayDate(),

        assetReplacementType: obj['assetReplacementType'] || '',

        assetReplacementCallId: obj['assetReplacementCallId'] || '',

        assetReplacementInitiatedBy: obj['assetReplacementInitiatedBy'] || '',

        department: obj['department'] || '',

        status: (['Open', 'Approved', 'Rejected', 'Closed'].includes(
          obj['status'],
        )
          ? obj['status']
          : 'Open') as any,

        /* ================= OLD ASSET ================= */
        oldAssetId: obj['oldAssetId'] || '',
        oldAssetName: obj['oldAssetName'] || '',
        oldAssetType: obj['oldAssetType'] || '',
        oldAssetSerialNumber: obj['oldAssetSerialNumber'] || '',

        oldAmcStatus: (['AMC', 'Warranty', 'Out of AMC'].includes(
          obj['oldAmcStatus'],
        )
          ? obj['oldAmcStatus']
          : 'AMC') as any,

        assetFaultDescription: obj['assetFaultDescription'] || '',
        assetCondition: obj['assetCondition'] || '',

        /* ================= NEW ASSET ================= */
        newAssetId: obj['newAssetId'] || '',
        newAssetName: obj['newAssetName'] || '',
        newAssetSerialNumber: obj['newAssetSerialNumber'] || '',

        /* ================= LOGIN ================= */
        loginId: this.loginId || '',
      };

      results.push(newRecord);
    }

    /* ================= MERGE DATA ================= */

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

      const json = XLSX.utils.sheet_to_json(sheet);

      json.forEach((obj: any, i: number) => {
        const newRecord: TableRow = {
          assetReplacementId:
            obj['Replacement ID'] || `AR-${this.tableData.length + i + 1}`,

          assetReplacementCode: obj['Replacement Code'] || '',

          assetReplacementDate: obj['Replacement Date'] || this.getTodayDate(),

          assetReplacementType: obj['Replacement Type'] || '',

          assetReplacementCallId: obj['Call ID'] || '',

          assetReplacementInitiatedBy: obj['Initiated By'] || '',

          department: obj['Department'] || '',

          status: obj['Status'] === 'Inactive' ? 'Inactive' : 'Active',

          /* ================= OLD ASSET ================= */
          oldAssetId: obj['Old Asset ID'] || '',
          oldAssetName: obj['Old Asset Name'] || '',
          oldAssetType: obj['Old Asset Type'] || '',
          oldAssetSerialNumber: obj['Old Serial Number'] || '',

          oldAmcStatus: (['AMC', 'Warranty', 'Out of AMC'].includes(
            obj['AMC Status'],
          )
            ? obj['AMC Status']
            : 'AMC') as 'AMC' | 'Warranty' | 'Out of AMC',

          assetFaultDescription: obj['Fault Description'] || '',
          assetCondition: obj['Asset Condition'] || '',

          /* ================= NEW ASSET ================= */
          newAssetId: obj['New Asset ID'] || '',
          newAssetName: obj['New Asset Name'] || '',
          newAssetSerialNumber: obj['New Serial Number'] || '',

          /* ================= LOGIN ================= */
          loginId: this.loginId || '',
        };

        this.tableData.push(newRecord);
      });

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

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

      lines.forEach((line, idx) => {
        const cols = line.split(',').map((c) => c.trim());

        // Ensure minimum columns
        while (cols.length < 15) cols.push('');

        const newRecord: TableRow = {
          assetReplacementId:
            cols[0] || `AR-${this.tableData.length + idx + 1}`,

          assetReplacementCode: cols[1] || '',

          assetReplacementDate: cols[2] || this.getTodayDate(),

          assetReplacementType: cols[3] || '',

          assetReplacementCallId: cols[4] || '',

          assetReplacementInitiatedBy: cols[5] || '',

          department: cols[6] || '',

          status: (['Open', 'Approved', 'Rejected', 'Closed'].includes(cols[7])
            ? cols[7]
            : 'Open') as any,

          /* ================= OLD ASSET ================= */
          oldAssetId: cols[8] || '',
          oldAssetName: cols[9] || '',
          oldAssetType: cols[10] || '',
          oldAssetSerialNumber: cols[11] || '',

          oldAmcStatus: (['AMC', 'Warranty', 'Out of AMC'].includes(cols[12])
            ? cols[12]
            : 'AMC') as any,

          assetFaultDescription: cols[13] || '',
          assetCondition: cols[14] || '',

          /* ================= NEW ASSET ================= */
          newAssetId: cols[15] || '',
          newAssetName: cols[16] || '',
          newAssetSerialNumber: cols[17] || '',

          /* ================= LOGIN ================= */
          loginId: this.loginId || '',
        };

        this.tableData.push(newRecord);
      });

      this.filteredData = [...this.tableData];

      this.currentPage = 1;

      this.cdr.detectChanges();

      this.showToast('Asset Replacement TXT imported successfully!', 'success');
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
        if (rowIndex === 0) return;

        const cells = Array.from(row.querySelectorAll('td')).map(
          (cell) => cell.textContent?.trim() || '',
        );

        while (cells.length < 15) cells.push('');

        const newRecord: TableRow = {
          assetReplacementId:
            cells[0] || `AR-${this.tableData.length + rowIndex}`,

          assetReplacementCode: cells[1] || '',

          assetReplacementDate: cells[2] || this.getTodayDate(),

          assetReplacementType: cells[3] || '',

          assetReplacementCallId: cells[4] || '',

          assetReplacementInitiatedBy: cells[5] || '',

          department: cells[6] || '',

          status: cells[7] === 'Inactive' ? 'Inactive' : 'Active',

          /* ================= OLD ASSET ================= */
          oldAssetId: cells[8] || '',
          oldAssetName: cells[9] || '',
          oldAssetType: cells[10] || '',
          oldAssetSerialNumber: cells[11] || '',

          oldAmcStatus: (['AMC', 'Warranty', 'Out of AMC'].includes(cells[12])
            ? cells[12]
            : 'AMC') as 'AMC' | 'Warranty' | 'Out of AMC',

          assetFaultDescription: cells[13] || '',
          assetCondition: cells[14] || '',

          /* ================= NEW ASSET ================= */
          newAssetId: cells[15] || '',
          newAssetName: cells[16] || '',
          newAssetSerialNumber: cells[17] || '',

          /* ================= LOGIN ================= */
          loginId: this.loginId || '',
        };

        this.tableData.push(newRecord);
      });

      this.filteredData = [...this.tableData];

      this.currentPage = 1;

      this.cdr.detectChanges();

      this.showToast(
        'Asset Replacement DOCX imported successfully!',
        'success',
      );
    };

    reader.readAsArrayBuffer(file);
  }

  downloadSampleCSV() {
    // CSV headers
    const headers = [
      'Replacement ID',
      'Replacement Code',
      'Replacement Date',
      'Replacement Type',
      'Call ID',
      'Initiated By',
      'Department',
      'Status',

      'Old Asset ID',
      'Old Asset Name',
      'Old Asset Type',
      'Old Serial Number',
      'Old AMC Status',
      'Fault Description',
      'Asset Condition',
    ];

    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.join(','));

    // Sample row
    const sampleRow = [
      'AR-001',
      'REP-2026-001',
      '2026-03-10',
      'Permanent',
      'CALL-101',
      'Engineer A',
      'IT',
      'Open',

      'AST-001',
      'HP Laptop',
      'Laptop',
      'SN-HP-123',
      'AMC',
      'Screen not working',
      'Not Working',
    ];

    csvRows.push(sampleRow.join(','));

    const csvString = csvRows.join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });

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
      const rowDate = this.parseDDMMYYYY(row.assetReplacementDate);
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

    csvRows.push(this.companyName || 'Company Name');

    csvRows.push(`Date:,${formattedDate}`);

    csvRows.push('');

    /* ================= CSV HEADERS ================= */

    const headers = [
      'Replacement ID',
      'Replacement Code',
      'Replacement Date',
      'Replacement Type',

      'Call ID',
      'Initiated By',
      'Department',
      'Status',

      'Old Asset ID',
      'Old Asset Name',
      'Old Asset Type',
      'Old Serial Number',
      'Old AMC Status',

      'Fault Description',
      'Asset Condition',
    ];

    csvRows.push(headers.join(','));

    /* ================= DATA ROWS ================= */

    data.forEach((row: TableRow) => {
      csvRows.push(
        [
          row.assetReplacementId || '',
          row.assetReplacementCode || '',
          row.assetReplacementDate || '',
          row.assetReplacementType || '',

          row.assetReplacementCallId || '',
          row.assetReplacementInitiatedBy || '',
          row.department || '',
          row.status || '',

          row.oldAssetId || '',
          row.oldAssetName || '',
          row.oldAssetType || '',
          row.oldAssetSerialNumber || '',
          row.oldAmcStatus || '',

          row.assetFaultDescription || '',
          row.assetCondition || '',
        ].join(','),
      );
    });

    /* ================= DOWNLOAD ================= */

    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });

    saveAs(blob, 'Filtered_AssetReplacement_Report.csv');
  }

  // ---------------- Excel Export ----------------
  exportExcelfile(data: TableRow[]) {
    const today = new Date();

    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    const wsData: any[][] = [
      [this.companyName || 'Company Name'],

      ['Date:', formattedDate],

      [],

      [
        'Replacement ID',
        'Replacement Code',
        'Replacement Date',
        'Replacement Type',

        'Call ID',
        'Initiated By',
        'Department',
        'Status',

        'Old Asset ID',
        'Old Asset Name',
        'Old Asset Type',
        'Old Serial Number',
        'Old AMC Status',

        'Fault Description',
        'Asset Condition',
      ],
    ];

    /* ================= DATA ROWS ================= */

    data.forEach((row: TableRow) => {
      wsData.push([
        row.assetReplacementId || '',
        row.assetReplacementCode || '',
        row.assetReplacementDate || '',
        row.assetReplacementType || '',

        row.assetReplacementCallId || '',
        row.assetReplacementInitiatedBy || '',
        row.department || '',
        row.status || '',

        row.oldAssetId || '',
        row.oldAssetName || '',
        row.oldAssetType || '',
        row.oldAssetSerialNumber || '',
        row.oldAmcStatus || '',

        row.assetFaultDescription || '',
        row.assetCondition || '',
      ]);
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    /* ================= COLUMN WIDTH ================= */

    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },

      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },

      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },

      { wch: 22 },
      { wch: 16 },
    ];

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Filtered Asset Replacement',
    );

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(blob, 'Filtered_AssetReplacement_Report.xlsx');
  }

  // ---------------- PDF Export ----------------
  exportPDFfile(data: TableRow[]) {
    if (!data || data.length === 0) {
      this.showToast('No data available to export!', 'warning');
      return;
    }

    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    const title = 'Filtered Asset Replacement Records';

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

    const topY = 70;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    doc.text(this.companyName || 'Company Name', 40, topY);

    doc.text(new Date().toLocaleDateString(), pageWidth - 40, topY, {
      align: 'right',
    });

    autoTable(doc, {
      startY: topY + 20,

      head: [
        [
          'Replacement ID',
          'Replacement Code',
          'Replacement Date',
          'Replacement Type',

          'Call ID',
          'Initiated By',
          'Department',
          'Status',

          'Old Asset ID',
          'Old Asset Name',
          'Old Asset Type',
          'Old Serial No',
          'Old AMC Status',

          'Fault Description',
          'Asset Condition',
        ],
      ],

      body: data.map((row: TableRow) => [
        row.assetReplacementId || '',
        row.assetReplacementCode || '',
        row.assetReplacementDate || '',
        row.assetReplacementType || '',

        row.assetReplacementCallId || '',
        row.assetReplacementInitiatedBy || '',
        row.department || '',
        row.status || '',

        row.oldAssetId || '',
        row.oldAssetName || '',
        row.oldAssetType || '',
        row.oldAssetSerialNumber || '',
        row.oldAmcStatus || '',

        row.assetFaultDescription || '',
        row.assetCondition || '',
      ]),

      theme: 'grid',

      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
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

    doc.save('Filtered_AssetReplacement_Report.pdf');
  }
}
