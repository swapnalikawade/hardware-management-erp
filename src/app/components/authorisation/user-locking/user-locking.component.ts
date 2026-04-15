import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';

import autoTable from 'jspdf-autotable';
import * as mammoth from 'mammoth';
import { getDocument } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';
import { FormsModule, NgForm } from '@angular/forms';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { NgToastService } from 'ng-angular-popup';
import { Router } from '@angular/router';

import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth/auth-service';
import { CommonService } from '../../../services/common/common-service';
import { ModalService } from '../../../services/modal.service';
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'node_modules/pdfjs-dist/build/pdf.worker.min.js';

// src/app/models/user-locking.model.ts

interface TableRow {
  // 🔹 PRIMARY KEY
  userId: number;

  // 🔹 USER DETAILS (Backend matching)
  employeeCode: string;
  userName: string;
  departmentCode?: string;

  userCreatedBy: string;
  userCreatedDate?: string;

  userAccess: string[];
  userRole: string;

  // ❌ password काढला ✔

  userStatus: 'Active' | 'Inactive';

  // 🔥 ONE COMMON REASON (Lock + Unlock)
  reason?: string;

  updatedDate?: string;
}
@Component({
  selector: 'app-user-locking',
  standalone: false,
  templateUrl: './user-locking.component.html',
  styleUrl: './user-locking.component.css',
})
export class UserLockingComponent {
  activeTab = 'details';
  today = new Date();

  showStatusModal = false;
  statusReason: string = '';
  statusRow: any = null; // session variable
  token: string | null = null;
  userName: any | null = null;
  loginId: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
  headCompanyName: any | null = null;

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
    private modalService: ModalService
  ) {
    this.filteredData = [...this.tableData];
  }

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
    this.loadUserLockingData();
    this.filteredData = [...this.tableData];
  }
  private initializeForm(): void {
    this.forms = [
      {
        newRecord: {
          userId: 0,

          // 🔹 USER DETAILS
          employeeCode: '',
          userName: '',
          departmentCode: '',

          userCreatedBy: this.loginId,
          userCreatedDate: this.getTodayDate(),

          userAccess: [],
          userRole: '',

          // 🔹 STATUS
          userStatus: 'Active',

          // 🔥 ONE COMMON REASON
          reason: '',

          // 🔹 AUDIT
          updatedDate: this.getTodayDate(),
        },
      },
    ];
  }
  loadUserLockingData(): void {
    this.commonService.fetchAllUsers().subscribe({
      next: (res: any[]) => {
        console.log('API RESPONSE:', res);

        this.tableData = res.map((item) => ({
          userId: item.userId,
          employeeCode: item.employeeCode,
          userName: item.userName,
          departmentCode: item.departmentCode,

          userCreatedBy: item.userCreatedBy,
          userCreatedDate: item.userCreatedDate,

          userAccess: item.userAccess || [],
          userRole: item.userRole,

          // 🔥 IMPORTANT FIX
          userStatus: item.userStatus, // 🔥 direct use
          reason: item.reason || '',
          updatedDate: item.userCreatedDate,
        }));

        this.filteredData = [...this.tableData];
      },

      error: (err) => {
        console.error('API ERROR:', err);
      },
    });
  }
  tabs = [
    { key: 'details', label: 'Details', icon: 'bi bi-building-fill' },

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
  
  toggleStatus() {
    const empCode = this.statusRow.employeeCode;

    // 🔒 LOCK
    if (this.statusRow.userStatus === 'Active') {
      if (!this.statusReason.trim()) {
        this.showToast('Enter reason!', 'warning');
        return;
      }

      this.commonService.lockUser(empCode, this.statusReason).subscribe({
        next: () => {
          this.showToast('User Locked ✅');
          this.loadUserLockingData();
        },
        error: (err) => console.error(err),
      });
    }
    // 🔓 UNLOCK
    else {
      this.commonService.unlockUser(empCode).subscribe({
        next: () => {
          this.showToast('User Unlocked ✅');
          this.loadUserLockingData();
        },
        error: (err) => console.error(err),
      });
    }
  }
  getStatusLabel(status: string) {
    return status === 'Active' ? 'Unlocked' : 'Locked';
  }
  applyFilter(event: any) {
    this.searchText = event.target.value.toLowerCase().trim();

    this.filteredData = this.tableData.filter((row) => {
      return JSON.stringify(row).toLowerCase().includes(this.searchText);
    });

    this.currentPage = 1;
  }
  filterStatus(event: any) {
    const value = event.target.value;

    if (!value) {
      this.filteredData = [...this.tableData];
    } else {
      this.filteredData = this.tableData.filter(
        (row) => row.userStatus === value,
      );
    }

    this.currentPage = 1;
  }
  //search filter

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
  deleteSelectedRows() {
    if (this.selectedRows.length === 0) {
      this.toast.danger('No records selected to delete!', '', 4000);
    }
    if (!this.deleteConfirm) {
      this.deleteConfirm = true;

      this.toast.warning('Click delete again to confirm', 'Confirm Delete');

      setTimeout(() => {
        this.deleteConfirm = false;
      }, 2000);

      return;
    }
    // ---- Actual delete ----
    this.tableData = this.tableData.filter(
      (row) => !this.selectedRows.includes(row),
    );

    this.selectedRows = [];
    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.toast.success(
      'Selected records deleted successfully!',
      'SUCCESS',
      4000,
    );
    this.deleteConfirm = false;
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
    const exportData = this.tableData.map((row) => ({
      // 🔹 USER DETAILS
      User_ID: row.userId,
      Employee_Code: row.employeeCode,
      User_Name: row.userName,
      Role: row.userRole,
      Department: row.departmentCode || '',

      // 🔹 STATUS + REASON
      Status: row.userStatus,
      Reason: row.reason || '',

      // 🔹 AUDIT
      Created_By: row.userCreatedBy,
      Created_Date: row.userCreatedDate || '',
      Updated_Date: row.updatedDate || '',
    }));

    // ✅ Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // ✅ Auto column width
    worksheet['!cols'] = Object.keys(exportData[0]).map(() => ({
      wch: 22,
    }));

    // ✅ Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'UserLockingData');

    // ✅ Download
    XLSX.writeFile(workbook, 'UserLockingData.xlsx');
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
        margin-bottom: 20px;
      }
      .header-table td {
        border: none;
        padding: 0;
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
          <td class="title">User Locking Report</td>
        </tr>
      </table>

      <table>
        <tr>
          <th>User ID</th>
          <th>Employee Code</th>
          <th>User Name</th>
          <th>Role</th>
          <th>Department</th>
          <th>Status</th>
          <th>Reason</th>
          <th>Created By</th>
          <th>Created Date</th>
          <th>Updated Date</th>
        </tr>
  `;

    this.tableData.forEach((row: any) => {
      content += `
      <tr>
        <td>${row.userId || ''}</td>
        <td>${row.employeeCode || ''}</td>
        <td>${row.userName || ''}</td>
        <td>${row.userRole || ''}</td>
        <td>${row.departmentCode || ''}</td>

        <td>${row.userStatus || ''}</td>
        <td>${row.reason || ''}</td>

        <td>${row.userCreatedBy || ''}</td>
        <td>${row.userCreatedDate || ''}</td>
        <td>${row.updatedDate || ''}</td>
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
    saveAs(blob, 'UserLocking_Report.doc');
  }
  exportPDF() {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape
    const pageWidth = doc.internal.pageSize.getWidth();

    const currentDate = new Date().toLocaleDateString();

    // 🔹 Date (left)
    doc.setFontSize(10);
    doc.text(`Date: ${currentDate}`, 10, 12);

    // 🔹 Title (center)
    doc.setFontSize(18);
    doc.text('User Locking Report', pageWidth / 2, 12, { align: 'center' });

    // 🔹 Table
    autoTable(doc, {
      startY: 20,

      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: 'left',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: '#fff',
        halign: 'center',
      },

      tableWidth: 'auto',

      // ✅ UPDATED HEADERS
      head: [
        [
          'User ID',
          'Employee Code',
          'User Name',
          'Role',
          'Department',
          'Status',
          'Reason',
          'Created By',
          'Created Date',
          'Updated Date',
        ],
      ],

      // ✅ UPDATED BODY
      body: this.tableData.map((row) => [
        row.userId || '',
        row.employeeCode || '',
        row.userName || '',
        row.userRole || '',
        row.departmentCode || '',

        row.userStatus || '',
        row.reason || '',

        row.userCreatedBy || '',
        row.userCreatedDate || '',
        row.updatedDate || '',
      ]),

      // 🔹 Border styling
      didDrawCell: (data) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
      },
    });

    // 🔹 Download
    doc.save('UserLocking_Report.pdf');
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
  getEmptyRecord(): TableRow {
    return {
      userId: 0,

      // 🔹 USER DETAILS
      employeeCode: '',
      userName: '',
      departmentCode: '',

      userCreatedBy: this.loginId,
      userCreatedDate: this.getTodayDate(),

      userAccess: [],
      userRole: '',

      // 🔹 STATUS
      userStatus: 'Active',

      // 🔥 ONE COMMON REASON
      reason: '',

      // 🔹 AUDIT
      updatedDate: this.getTodayDate(),
    };
  }
  isEndDateInvalid(record: any): boolean {
    if (!record.userLockingStartDate || !record.userLockingEndDate) {
      return false;
    }

    const start = new Date(record.userLockingStartDate);
    const end = new Date(record.userLockingEndDate);

    return end < start;
  }
  //  ngOnInit() {
  //    if (!this.forms || this.forms.length === 0) {
  //      this.forms = [{ newRecord: this.getEmptyRecord() }];
  //    }
  //
  //    this.forms[0].newRecord.userLockingDate = this.getTodayDate();
  //    this.forms[0].newRecord.userLockingCreatedDate = this.getTodayDate();
  //    this.forms[0].newRecord.userLockingUpdatedDate = this.getTodayDate();
  //
  //    this.filteredData = [...this.tableData];
  //  }

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
  newRecord: TableRow = {
    userId: 0,

    // 🔹 USER DETAILS
    employeeCode: '',
    userName: '',
    departmentCode: '',

    userCreatedBy: '',
    userCreatedDate: this.getTodayDate(),

    userAccess: [],
    userRole: '',

    // 🔹 STATUS
    userStatus: 'Active',

    // 🔥 ONE COMMON REASON
    reason: '',

    // 🔹 AUDIT
    updatedDate: this.getTodayDate(),
  };
  // --------------------------
  // STATE VARIABLES
  // --------------------------
  isEditMode: boolean = false;
  editIndex: number = -1; // ensures no TS errors
  forms: { newRecord: TableRow }[] = [{ newRecord: { ...this.newRecord } }];
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
    if (this.isEditMode) return; // ❌ edit mode मध्ये add नाही

    this.forms.push({
      newRecord: {
        ...this.newRecord,

        // 🔹 USER DEFAULTS
        userCreatedBy: this.loginId,
        userCreatedDate: this.getTodayDate(),

        // 🔹 STATUS DEFAULT
        userStatus: 'Active',

        // 🔥 REASON EMPTY
        reason: '',

        // 🔹 AUDIT
        updatedDate: this.getTodayDate(),
      },
    });

    this.activeForm = this.forms.length - 1;
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
    this.showErrors = true;

    // 🔹 Mark fields touched
    if (form) {
      Object.keys(form.controls).forEach((key) => {
        form.controls[key].markAsTouched();
        form.controls[key].markAsDirty();
      });
    }

    // 🔹 Stop if invalid
    if (form && !form.valid) return;

    const today = this.getTodayDate();

    // ==========================
    // ✏️ EDIT MODE
    // ==========================
    if (this.isEditMode && this.editIndex !== -1) {
      this.tableData[this.editIndex] = {
        ...this.forms[0].newRecord,

        // 🔥 keep same ID
        userId: this.tableData[this.editIndex].userId,

        // 🔥 update audit
        updatedDate: today,
      };

      this.toast.success('Record Updated Successfully!', 'success', 4000);
    }

    // ==========================
    // ➕ ADD MODE
    // ==========================
    else {
      let savedCount = 0;

      this.forms.forEach((formItem) => {
        const newId = this.tableData.length + 1;

        this.tableData.push({
          ...formItem.newRecord,

          // 🔥 Assign ID
          userId: newId,

          // 🔹 Defaults
          userStatus: formItem.newRecord.userStatus || 'Locked',

          // 🔥 Audit
          userCreatedDate: today,
          updatedDate: today,
        });

        savedCount++;
      });

      if (savedCount > 0) {
        this.toast.success('Record Added Successfully!', 'success', 4000);
      }
    }

    // ==========================
    // 🔄 RESET
    // ==========================
    this.filteredData = [...this.tableData];

    this.forms = [{ newRecord: this.getEmptyRecord() }];

    this.showErrors = false;
    this.isEditMode = false;
    this.editIndex = -1;
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

    // 🔥 Ensure form exists
    if (!this.forms || this.forms.length === 0) {
      this.forms = [{ newRecord: this.getEmptyRecord() }];
    }

    // 🔥 Prefill with selected row
    this.forms[0].newRecord = {
      ...row,

      // 🔥 Update audit date
      updatedDate: this.getTodayDate(),
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

  csvHeaders: string[] = [];
  csvRecords: any[] = [];

  // Convert CSV → JSON and store in tableData

openStatusModal(row: any) {
  this.statusRow = row;
  this.statusReason = '';
  this.showStatusModal = true;

  this.modalService.isModalOpen$.next(true);
}

closeStatusModal() {
  this.showStatusModal = false;

  this.modalService.isModalOpen$.next(false);
}

confirmAndClose() {
  this.toggleStatus(); // API call

  this.showStatusModal = false;

  this.modalService.isModalOpen$.next(false);
}
}
