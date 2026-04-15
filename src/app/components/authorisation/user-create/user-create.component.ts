import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
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
import { forkJoin } from 'rxjs';
import { CommonService } from '../../../services/common/common-service';
interface TableRow {
  userId: string;
  employeeCode: string;
  userName: string;
  userPassword: string;
  departmentCode: string;
  userRole: string;
  userAccess: string[];
  userCreatedBy: string;
  userCreatedDate: string;
  alternativeUser: string;

  userStatus: 'Active' | 'Inactive'; // 🔥 FINAL
  reason?: string | null;
}
@Component({
  selector: 'app-user-create',
  standalone: false,
  templateUrl: './user-create.component.html',
  styleUrl: './user-create.component.css',
})
export class UserCreateComponent {
  // session variable
  token: string | null = null;
  userName: any | null = null;
  loginId: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
  headCompanyName: any | null = null;
  activeTab = 'details';
  today = new Date();
  forms: { newRecord: TableRow }[] = [];
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
    private commanService: CommonService,
  ) {
    this.filteredData = [...this.tableData];
  }
  tabs = [
    { key: 'details', label: 'User Details', icon: 'bi bi-building-fill' },
    { key: 'newRecord', label: 'Add User', icon: 'bi bi-plus-circle-fill' },
    { key: 'help', label: 'Help', icon: 'bi bi-question-circle-fill' },
  ];
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
    this.loadUsers();
    this.loadDepartments();
    this.loadEmployees();
    this.filteredData = [...this.tableData];
  }
  toastMessage: string | null = null;
  toastType: string = 'success';
  private initializeForm(): void {
    this.forms = [
      {
        newRecord: {
          userId: '0',

          employeeCode: '',
          userName: '',
          userPassword: '',
          departmentCode: '',

          userRole: '',
          userAccess: [],

          userCreatedBy: this.loginId || '',
          userCreatedDate: this.getTodayDate(),

          alternativeUser: '',

          // 🔥 IMPORTANT FIX
          userStatus: 'Active',

          // ✅ OPTIONAL FIELD
          reason: null,
        } as TableRow,
      },
    ];
  }
  employeeList: any[] = [];

  loadEmployees() {
    this.commanService.fetchAllEmployee().subscribe({
      next: (res: any[]) => {
        console.log('EMPLOYEE API:', res); // 🔥 DEBUG

        this.employeeList = res;
      },
      error: (err) => {
        console.error('Employee Load Error:', err);
      },
    });
  }
  loadUsers(): void {
    this.commanService.fetchAllUsers().subscribe({
      next: (res: any[]) => {
        this.tableData = res.map((item) => ({
          userId: item.userId || '',

          employeeCode: item.employeeCode || '',
          userName: item.userName || '',
          userPassword: item.userPassword || '',

          departmentCode: item.departmentCode || '', // ✅ FIX
          userRole: item.userRole || '',

          userAccess: item.userAccess || [], // ✅ FIX

          userCreatedBy: item.userCreatedBy || '', // ✅ FIX
          userCreatedDate: item.userCreatedDate || '', // ✅ FIX

          alternativeUser: item.alternativeUser || '',
          userStatus: item.userStatus || 'Inactive',
        }));

        this.filteredData = [...this.tableData];
      },

      error: (err) => {
        console.error('User API Error:', err);
        this.showToast('Failed to load users ❌', 'error');
      },
    });
  }
  onEmployeeChange(empCode: string) {
    const emp = this.employeeList.find((e) => e.employeeCode === empCode);

    if (emp) {
      this.forms[0].newRecord.userName = emp.employeeName;

      // ✅ FIX: departmentCode use कर (departmentId नाही)
      this.forms[0].newRecord.departmentCode = emp.departmentCode || 'DEP001';

      this.forms[0].newRecord.userCreatedBy = emp.employeeCode;
      this.forms[0].newRecord.alternativeUser = emp.employeeCode;
    }
  }
  departmentList: any[] = [];

  loadDepartments() {
    this.commanService.fetchAllDepartments().subscribe({
      next: (res: any[]) => {
        this.departmentList = res;
      },
    });
  }
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
      this.showToast('No records selected', 'Warning');
      return;
    }

    // 🔥 confirm
    if (!this.deleteConfirm) {
      this.deleteConfirm = true;

      this.showToast('Click delete again to confirm', 'Confirm Delete');

      setTimeout(() => {
        this.deleteConfirm = false;
      }, 2000);

      return;
    }

    // 🔥 API calls
    const deleteCalls = this.selectedRows.map((row) => {
      const [prefix, year, code] = row.employeeCode.split('/');

      return this.commanService.deleteUser(prefix, year, code, this.loginId);
    });

    // 🔥 execute using forkJoin (BEST)
    forkJoin(deleteCalls).subscribe({
      next: () => {
        // ✅ UI update
        this.tableData = this.tableData.filter(
          (row) => !this.selectedRows.includes(row),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];
        this.currentPage = 1;

        this.showToast('Selected records deleted from DB ✅', 'success');
      },

      error: (err) => {
        console.error('Delete Error:', err);
        this.showToast('Error deleting records ❌', 'error');
      },

      complete: () => {
        this.deleteConfirm = false;
      },
    });
  }
  deleteCalls = this.selectedRows.map((row) => {
    const [prefix, year, code] = row.employeeCode.split('/');

    // 🔥 FIX HERE
    const deletedBy = this.loginId.split('/')[0]; // only EMP003

    return this.commanService.deleteUser(prefix, year, code, deletedBy);
  });
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

  accessModules = [
    { code: 'EMP', name: 'Employee' },
    { code: 'AMK', name: 'Asset Make' },
    { code: 'ATY', name: 'Asset Type' },
    { code: 'CLG', name: 'Call Logging' },
    { code: 'SPE', name: 'Spare Entry' },
    { code: 'MAB', name: 'Misc Asset Bought' },
    { code: 'ASC', name: 'Asset Status Change' },
    { code: 'RGP', name: 'RGP Returned' },
    { code: 'UCR', name: 'User Creation' },
    { code: 'ULU', name: 'User Locking/Unlocking' },
    { code: 'UPI', name: 'User Password Initialization' },
    { code: 'AST', name: 'Asset' },
    { code: 'PO', name: 'Purchase Order' },
    { code: 'MYA', name: 'My Asset' },
    { code: 'ALO', name: 'Asset Allocation' },
    { code: 'ART', name: 'Asset Returned' },
    { code: 'ARP', name: 'Asset Replacement' },
    { code: 'CLR', name: 'Call Logging Report' },
    { code: 'NRG', name: 'NRGP Returned' },
    { code: 'UPD', name: 'User Update' },
    { code: 'GUA', name: 'Grant User Authorization' },
  ];

  userList: string[] = ['Admin', 'HR', 'IT Admin', 'Manager'];

  exportExcel() {
    if (!this.tableData || this.tableData.length === 0) {
      this.showToast('No data to export ❌', 'warning');
      return;
    }

    // ✅ Strong type
    type ExportRow = {
      User_ID: string;
      Employee_Code: string;
      User_Name: string;
      Department_Code: string;
      Role: string;
      Access: string;
      Created_By: string;
      Created_Date: string;
      Status: string;
    };

    // ✅ Mapping (SAFE)
    const exportData: ExportRow[] = this.tableData.map((row) => ({
      User_ID: row.userId ?? '',
      Employee_Code: row.employeeCode ?? '',
      User_Name: row.userName ?? '',
      Department_Code: row.departmentCode ?? '',
      Role: row.userRole ?? '',
      Access: Array.isArray(row.userAccess) ? row.userAccess.join(', ') : '',
      Created_By: row.userCreatedBy ?? '',
      Created_Date: row.userCreatedDate ?? '',
      Status: row.userStatus ?? '',
    }));

    // ✅ Worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // ✅ TYPE-SAFE column width
    const keys = Object.keys(exportData[0]) as (keyof ExportRow)[];

    const columnWidths = keys.map((key) => ({
      wch:
        Math.max(
          key.length,
          ...exportData.map((row) => String(row[key] ?? '').length),
        ) + 2,
    }));

    worksheet['!cols'] = columnWidths;

    // ✅ Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'UserCreationData');

    // ✅ Download
    XLSX.writeFile(workbook, 'UserCreationData.xlsx');

    this.showToast('Excel exported successfully ✅', 'success');
  }
  exportDoc() {
    if (!this.tableData || this.tableData.length === 0) {
      this.showToast('No data to export ❌', 'warning');
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
      .date {
        text-align: left;
      }
    </style>
  </head>

  <body>
    <div class="WordSection1">
      <table class="header-table">
        <tr>
          <td class="date">Date: ${currentDate}</td>
        </tr>
        <tr>
          <td class="title">User Creation Report</td>
        </tr>
      </table>

      <table>
        <tr>
          <th>User ID</th>
          <th>Employee Code</th>
          <th>User Name</th>
          <th>Department Code</th>
          <th>Role</th>
          <th>Access</th>
          <th>Created By</th>
          <th>Created Date</th>
          <th>Status</th>
        </tr>
  `;

    this.tableData.forEach((row: TableRow) => {
      content += `
      <tr>
        <td>${row.userId}</td>
        <td>${row.employeeCode}</td>
        <td>${row.userName}</td>
        <td>${row.departmentCode}</td>
        <td>${row.userRole}</td>
        <td>${row.userAccess.join(', ')}</td>
        <td>${row.userCreatedBy}</td>
        <td>${row.userCreatedDate}</td>
        <td>${row.userStatus}</td>
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

    saveAs(blob, 'UserCreation.doc');

    this.showToast('DOC exported successfully ✅', 'success');
  }
  exportPDF() {
    if (!this.tableData || this.tableData.length === 0) {
      this.showToast('No data to export ❌', 'warning');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    const currentDate = new Date().toLocaleDateString();

    // ✅ Date
    doc.setFontSize(10);
    doc.text(`Date: ${currentDate}`, 10, 12);

    // ✅ Title
    doc.setFontSize(18);
    doc.text('User Creation Records', pageWidth / 2, 12, { align: 'center' });

    autoTable(doc, {
      startY: 20,

      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'left',
        valign: 'middle',
      },

      headStyles: {
        halign: 'center',
      },

      tableWidth: 'auto',

      // ✅ headers
      head: [
        [
          'User ID',
          'Employee Code',
          'User Name',
          'Department Code',
          'Role',
          'Access',
          'Created By',
          'Created Date',
          'Status',
        ],
      ],

      // 🔥 CLEAN (NO fallback now)
      body: this.tableData.map((row) => [
        row.userId,
        row.employeeCode,
        row.userName,
        row.departmentCode,
        row.userRole,
        row.userAccess.join(', '),
        row.userCreatedBy,
        row.userCreatedDate,
        row.userStatus,
      ]),

      // ✅ borders
      didDrawCell: (data) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
      },
    });

    doc.save('UserCreationData.pdf');

    this.showToast('PDF exported successfully ✅', 'success');
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
    //return `${d}-${m}-${y}`; // dd-mm-yyyy ✅
    return new Date().toISOString().split('T')[0];
  }

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
  newRecord: TableRow = {
    userId: '0',

    employeeCode: '',
    userName: '',
    userPassword: '',
    departmentCode: '',

    userRole: '',
    userAccess: [],

    userCreatedBy: this.loginId || '',
    userCreatedDate: this.getTodayDate(),

    alternativeUser: '',

    // 🔥 STATUS
    userStatus: 'Active',

    // ✅ IMPORTANT (add this)
    reason: null,
  };

  // --------------------------
  // STATE VARIABLES
  // --------------------------
  isEditMode: boolean = false;
  editIndex: number = -1; // ensures no TS errors

  activeForm: number = 0;
  showErrors: boolean = false;
  onAccessChange(event: any, record: any) {
    const code = event.target.value;

    if (!record.userAccess) {
      record.userAccess = [];
    }

    if (event.target.checked) {
      if (!record.userAccess.includes(code)) {
        record.userAccess.push(code);
      }
    } else {
      record.userAccess = record.userAccess.filter((c: string) => c !== code);
    }
  }
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

    const newForm: { newRecord: TableRow } = {
      newRecord: {
        userId: '0',

        employeeCode: '',
        userName: '',
        userPassword: '',
        departmentCode: '',

        userRole: '',
        userAccess: [],

        userCreatedBy: this.loginId || '',
        userCreatedDate: this.getTodayDate(),

        alternativeUser: '',

        // 🔥 STATUS
        userStatus: 'Active',

        // ✅ IMPORTANT
        reason: null,
      },
    };

    this.forms.push(newForm);

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
  // --------------------------
  // CANCEL  RESET FORM
  // --------------------------
  cancelRecord(form: NgForm) {
    if (form) form.resetForm();

    // 🔥 reset main object
    this.newRecord = {
      userId: '0',

      employeeCode: '',
      userName: '',
      userPassword: '',
      departmentCode: '',

      userRole: '',
      userAccess: [],

      userCreatedBy: this.loginId || '',
      userCreatedDate: this.getTodayDate(),

      alternativeUser: '',

      // 🔥 STATUS
      userStatus: 'Active',

      // ✅ IMPORTANT
      reason: null,
    };

    // 🔥 fresh form (no reference issue)
    this.forms = [
      {
        newRecord: {
          ...this.newRecord,
          userAccess: [], // 🔥 fresh array
        } as TableRow,
      },
    ];

    this.showErrors = false;
  }
  saveAllRecords(form?: NgForm) {
    this.showErrors = true;

    // ✅ form validation
    if (form && !form.valid) {
      this.toast.danger('Please fill all required fields!', '', 4000);
      return;
    }

    const r = this.forms[0].newRecord;

    // ✅ employeeCode safe format
    let empCode = r.employeeCode;

    // ✅ FINAL PAYLOAD (MATCH BACKEND)
    const payload = {
      employeeCode: r.employeeCode,
      userName: r.userName,
      userPassword: r.userPassword,
      departmentCode: r.departmentCode,
      userRole: r.userRole,
      userAccess: r.userAccess,
      userCreatedBy: this.loginId,
      userCreatedDate: r.userCreatedDate,
      alternativeUser: r.alternativeUser,

      // 🔥 STATUS
      userStatus: 'Active',

      // ✅ IMPORTANT (ADD THIS)
      reason: null,
    };

    console.log('FINAL PAYLOAD:', payload);

   if (this.isEditMode) {

  this.commanService.updateUser(empCode, payload).subscribe({
    next: () => {
      this.showToast('User updated successfully ✅', 'success');
      this.loadUsers();
      this.activeTab = 'details';
    },
    error: (err) => {
      console.error('UPDATE ERROR:', err);
      console.log('BACKEND ERROR:', err.error);
      this.showToast('User update failed ❌', 'error');
    },
  });

}
    
    // 🔥 CREATE MODE
    else {
      this.commanService.submitUser(payload).subscribe({
        next: () => {
          this.showToast('User created successfully ✅', 'success');
          this.loadUsers();
          this.activeTab = 'details';
        },
        error: (err) => {
          console.error('SAVE ERROR:', err);
          console.log('BACKEND ERROR:', err.error);
          this.showToast('User creation failed ❌', 'error');
        },
      });
    }
  }
  // --------------------------
  // EDIT EXISTING ROW
  // --------------------------
  onEdit(row: TableRow, index: number) {
    this.activeTab = 'newRecord';
    this.isEditMode = true;
    this.editIndex = index;

    this.forms = [
      {
        newRecord: {
          userId: row.userId, // ✅ ADD

          employeeCode: row.employeeCode,
          userName: row.userName,
          userPassword: '',
          departmentCode: row.departmentCode,

          userRole: row.userRole,

          // 🔥 safe copy
          userAccess: [...(row.userAccess || [])],

          userCreatedBy: row.userCreatedBy,
          userCreatedDate: row.userCreatedDate,

          alternativeUser: row.alternativeUser ?? '',

          userStatus: row.userStatus,

          // ✅ IMPORTANT
          reason: row.reason ?? null,
        } as TableRow,
      },
    ];

    this.activeForm = 0;
    this.showErrors = false;
  }
}
