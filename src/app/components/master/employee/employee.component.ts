/*
 **************************************************************************************
 * Program Name  : EmployeeComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 06, 2026
 * System Name   : gswbs
 *
 * Purpose       : Angular Component for Employee Management.
 *
 * Description   : This component handles employee master data:
 *                 - Add / Update / Delete employees
 *                 - Department & Designation mapping
 *                 - Age calculation from DOB
 *                 - Bulk import/export (Excel, CSV, PDF, DOC)
 *                 - Search, Sorting, Pagination
 *                 - Date range filtering
 *
 * Features      :
 *   - Multi-form support
 *   - Validation
 *   - Dynamic dropdowns (Department, Designation)
 *   - Bulk upload via API
 *   - Export reports
 *
 * Endpoints Used:
 *   - GET    /employee/getAllByLoginId
 *   - POST   /employee/saveAll
 *   - PUT    /employee/update/{id}
 *   - POST   /employee/delete-multiple
 *   - POST   /employee/import
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
  'node_modules/pdfjs-dist/build/pdf.worker.min.js';

export interface TableRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;

  employeeDOB: string;                 // LocalDate → string
  employeeAge: string;
  employeeMarriedStatus: string;

  employeeGender: 'Male' | 'Female' | 'Other';

  employeeEmail: string;
  employeeContact: string;

  employeeAddress: string;
  employeeCity: string;
  employeeState: string;
  employeePinCode: string;
  employeeCountry: string;
  employeeReligion: string;

  departmentId: string;
  designationId: string;

  employeeStatus: 'Active' | 'Inactive';

  employeeCreatedDate: string;         // backend same
  createdBy: string;                   // ✅ ADD THIS

  isSelected?: boolean;                // UI purpose
}

@Component({
  selector: 'app-employee',
  standalone: false,
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.css',
})
export class EmployeeComponent implements OnInit {
  // session variable
  activeForm: number = 0;
  departments: any[] = [];
  designations: any[] = [];
  token: string | null = null;
  userName: any | null = null;
  headCompanyName: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
  loginId: any | null = null;
  showViewModal: boolean = false;
  selectedRow: TableRow | null = null;
  activeTab = 'details';
  today = new Date();
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

    const today = new Date();
    this.currentDate = this.today.toISOString().split('T')[0];
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.currentDate = `${yyyy}-${mm}-${dd}`;

    // 🗓 Initialize form & data
    this.initializeForm();
    this.loadEmployee();
    this.loadDepartments();
    this.loadDesignations();
    this.filteredData = [...this.tableData];
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }
private initializeForm(): void {
  this.forms = [
    {
      employeeId: '0',
      employeeCode: '',
      employeeName: '',

      employeeDOB: '',
      employeeAge: '',
      employeeMarriedStatus: '',
      employeeGender: 'Male',

      employeeEmail: '',
      employeeContact: '',

      employeeAddress: '',
      employeeCity: '',
      employeeState: '',
      employeePinCode: '',
      employeeCountry: '',
      employeeReligion: '',

      departmentId: '',
      designationId: '',

      employeeStatus: 'Active',
      employeeCreatedDate: this.currentDate || '',
      createdBy: this.loginId,   // ✅ IMPORTANT (replace loginId)

      // 🔥 BACKEND OBJECT
      newRecord: {
        employeeId: '0',
        employeeCode: '',
        employeeName: '',

        employeeDOB: '',
        employeeAge: '',
        employeeMarriedStatus: '',
        employeeGender: 'Male',

        employeeEmail: '',
        employeeContact: '',

        employeeAddress: '',
        employeeCity: '',
        employeeState: '',
        employeePinCode: '',
        employeeCountry: '',
        employeeReligion: '',

        departmentId: '',
        designationId: '',

        employeeStatus: 'Active',
        employeeCreatedDate: this.currentDate || '',
        createdBy: this.loginId   // ✅ IMPORTANT
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

  loadDesignations(): void {
    this.commonService.fetchAllDesignation().subscribe({
      next: (res: any[]) => {
        this.designations = res;
      },
      error: (err) => {
        console.error('Designation API Error:', err);
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

    // 🔥 Collect departmentIds
    const ids: string[] = this.selectedRows.map((row) => row.employeeId);

    this.commonService.deleteMultipleEmployee(ids).subscribe({
      next: () => {
        // remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.employeeId),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];
        this.currentPage = 1;
        this.loadEmployee();
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

  calculateAge(dob: string, index: number) {
    if (!dob) return;

    const birthDate = new Date(dob); // दिलेला DOB Date मध्ये convert
    const today = new Date(); // आजची तारीख

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();

    // जर birthday अजून आलेला नसेल तर age -1
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    this.forms[index].employeeAge = age;
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
  wsData.push([this.headCompanyName || 'Company Name']);

  // ⭐ Row 2 → Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  // Empty Row
  wsData.push([]);

  // ⭐ Header (FIXED ORDER + FULL FIELDS ✅)
  wsData.push([
    'Employee ID',
    'Employee Code',
    'Employee Name',
    'Employee DOB',
    'Employee Age',
    'Employee Married Status',
    'Employee Gender',
    'Employee Email',
    'Employee Contact',
    'Employee Address',
    'Employee City',
    'Employee State',
    'Employee PinCode',
    'Employee Country',
    'Employee Religion',
    'Department Id',
    'Designation Id',
    'Status',
    'Created Date',
    'Created By'
  ]);

  // ⭐ Rows (MATCHED WITH HEADER ✅)
  this.tableData.forEach((row) => {
    wsData.push([
      row.employeeId,
      row.employeeCode,
      row.employeeName,
      row.employeeDOB,
      row.employeeAge,
      row.employeeMarriedStatus,
      row.employeeGender,
      row.employeeEmail,
      row.employeeContact,
      row.employeeAddress,
      row.employeeCity,
      row.employeeState,
      row.employeePinCode,
      row.employeeCountry,
      row.employeeReligion,
      row.departmentId,
      row.designationId,
      row.employeeStatus,
      row.employeeCreatedDate,
      row.createdBy
    ]);
  });

  // Create worksheet
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // Create workbook
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee');

  // Export
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Employee_Report.xlsx');
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
          font-size: 26px;
          color: #00468c;
          font-weight: bold;
          text-decoration: underline;
        }

        .header-info {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: bold;
          margin: 10px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #0066cc;
          color: white;
          padding: 6px;
          font-size: 12px;
          border: 1px solid #000;
        }

        td {
          padding: 6px;
          border: 1px solid #000;
          font-size: 12px;
          text-align: center;
        }

        .status-active { color: green; font-weight: bold; }
        .status-inactive { color: red; font-weight: bold; }
      </style>
    </head>

    <body>
      <h2>Employee Records</h2>

      <div class="header-info">
        <div>${this.headCompanyName}</div>
        <div>${formattedDate}</div>
      </div>

      <table>
        <tr>
          <th>ID</th>
          <th>Code</th>
          <th>Name</th>
          <th>DOB</th>
          <th>Age</th>
          <th>Gender</th>
          <th>Married</th>
          <th>Email</th>
          <th>Contact</th>
          <th>City</th>
          <th>State</th>
          <th>Dept</th>
          <th>Desig</th>
          <th>Status</th>
          <th>Created Date</th>
          <th>Created By</th>
        </tr>
  `;

  this.tableData.forEach((row) => {
    const statusClass =
      row.employeeStatus === 'Active' ? 'status-active' : 'status-inactive';

    const statusIcon =
      row.employeeStatus === 'Active' ? '✔️' : '❌';

    content += `
      <tr>
        <td>${row.employeeId}</td>
        <td>${row.employeeCode}</td>
        <td>${row.employeeName}</td>
        <td>${row.employeeDOB}</td>
        <td>${row.employeeAge}</td>
        <td>${row.employeeGender}</td>
        <td>${row.employeeMarriedStatus}</td>
        <td>${row.employeeEmail}</td>
        <td>${row.employeeContact}</td>
        <td>${row.employeeCity}</td>
        <td>${row.employeeState}</td>
        <td>${row.departmentId}</td>
        <td>${row.designationId}</td>
        <td class="${statusClass}">${statusIcon} ${row.employeeStatus}</td>
        <td>${row.employeeCreatedDate}</td>
        <td>${row.createdBy}</td>
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

  saveAs(blob, 'Employee_Report.doc');
}

 exportPDF() {
  const doc = new jsPDF('l', 'pt', 'a4'); // landscape

  // ⭐ TITLE
  doc.setFontSize(20);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const title = 'Employee Records';

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

  const company = this.headCompanyName || 'Company Name';
  const dateStr = new Date().toLocaleDateString();

  doc.text(company, 40, 70);
  doc.text(dateStr, pageWidth - 40, 70, { align: 'right' });

  // ⭐ TABLE
  autoTable(doc, {
    startY: 90,

    head: [[
      'ID','Code','Name','DOB','Age','Married','Gender',
      'Email','Contact','City','State','Dept','Desig',
      'Status','Created Date','Created By'
    ]],

    body: this.tableData.map((row) => [
      row.employeeId,
      row.employeeCode,
      row.employeeName,
      row.employeeDOB,
      row.employeeAge,
      row.employeeMarriedStatus,
      row.employeeGender,
      row.employeeEmail,
      row.employeeContact,
      row.employeeCity,
      row.employeeState,
      row.departmentId,
      row.designationId,
      row.employeeStatus,
      row.employeeCreatedDate,
      row.createdBy
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
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      valign: 'middle',
      cellPadding: 3
    },

    // 🔥 IMPORTANT (fix overflow)
    didDrawPage: (data) => {
      doc.setFontSize(10);
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        pageWidth - 60,
        doc.internal.pageSize.getHeight() - 10
      );
    },

    margin: { top: 90 },
  });

  doc.save('Employee_Report.pdf');
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
  selectedRecord: any = null;
  showModal: boolean = false;

  openDetails(row: any) {
    this.selectedRecord = row;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedRecord = null;
  }
  //toster

  toastMessemployeeAge: string = '';
  toastType: string = '';

  //New record
  // New record
 newRecord: TableRow = {
  employeeId: '',
  employeeCode: '',
  employeeName: '',

  employeeDOB: '',
  employeeAge: '',
  employeeMarriedStatus: '',
  employeeGender: 'Male',

  employeeEmail: '',
  employeeContact: '',

  employeeAddress: '',
  employeeCity: '',
  employeeState: '',
  employeePinCode: '',
  employeeCountry: '',
  employeeReligion: '',

  departmentId: '',
  designationId: '',

  employeeStatus: 'Active',
  employeeCreatedDate: this.currentDate || '',

  createdBy: this.loginId,   // ✅ FIX (loginId → createdBy)

  isSelected: false,
};
  isEditMode: boolean = false;
  editIndex: number | null = null;

onEdit(row: TableRow, index: number) {
  this.activeTab = 'newRecord';
  this.isEditMode = true;
  this.editIndex = index;

  this.forms = [
    {
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,

      employeeDOB: row.employeeDOB,
      employeeAge: row.employeeAge,
      employeeMarriedStatus: row.employeeMarriedStatus,
      employeeGender: row.employeeGender,

      employeeEmail: row.employeeEmail,
      employeeContact: row.employeeContact,

      employeeAddress: row.employeeAddress,
      employeeCity: row.employeeCity,
      employeeState: row.employeeState,
      employeePinCode: row.employeePinCode,
      employeeCountry: row.employeeCountry,
      employeeReligion: row.employeeReligion,

      departmentId: row.departmentId,
      designationId: row.designationId,

      employeeStatus: row.employeeStatus,
      employeeCreatedDate: row.employeeCreatedDate,

      createdBy: row.createdBy || this.loginId   // ✅ IMPORTANT FIX
    },
  ];
}

saveAllRecords(form?: NgForm) {

  // ---------------- VALIDATION ----------------
  const invalid = this.forms.some(
    (f) =>
      !f.employeeName?.trim() ||
      !f.employeeDOB?.trim() ||
      f.employeeAge === null ||
      f.employeeAge === undefined ||
      !f.employeeGender?.trim() ||
      !f.employeeEmail?.trim() ||
      !f.employeeContact?.trim() ||
      !f.departmentId?.trim() ||
      !f.designationId?.trim() ||
      !f.employeeStatus?.trim()
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
      employeeCode: form.employeeCode,
      employeeName: form.employeeName,
      employeeDOB: form.employeeDOB,
      employeeAge: form.employeeAge,
      employeeMarriedStatus: form.employeeMarriedStatus,
      employeeGender: form.employeeGender,
      employeeEmail: form.employeeEmail,
      employeeContact: form.employeeContact,
      employeeAddress: form.employeeAddress,
      employeeCity: form.employeeCity,
      employeeState: form.employeeState,
      employeePinCode: form.employeePinCode,
      employeeCountry: form.employeeCountry,
      employeeReligion: form.employeeReligion,
      departmentId: form.departmentId,
      designationId: form.designationId,
      employeeStatus: form.employeeStatus,
      employeeCreatedDate: form.employeeCreatedDate,

      createdBy: this.loginId   // ✅ FIX HERE
    };

    const employeeId = this.tableData[this.editIndex].employeeId;

    this.commonService.updateEmployee(employeeId, payload).subscribe({
      next: () => {
        this.toast.success('Record Updated Successfully!', 'success', 4000);
        this.resetAfterSave();
        this.loadEmployee();
      },
      error: () => {
        this.toast.danger('Update failed. Service unavailable!', 'error', 4000);
      },
    });

    return;
  }

  // ---------------- ADD MODE (SAVE) ----------------
  const payload = this.forms.map((f) => ({
    employeeCode: f.employeeCode,
    employeeName: f.employeeName,
    employeeDOB: f.employeeDOB,
    employeeAge: f.employeeAge,
    employeeMarriedStatus: f.employeeMarriedStatus,
    employeeGender: f.employeeGender,
    employeeEmail: f.employeeEmail,
    employeeContact: f.employeeContact,
    employeeAddress: f.employeeAddress,
    employeeCity: f.employeeCity,
    employeeState: f.employeeState,
    employeePinCode: f.employeePinCode,
    employeeCountry: f.employeeCountry,
    employeeReligion: f.employeeReligion,
    departmentId: f.departmentId,
    designationId: f.designationId,
    employeeStatus: f.employeeStatus,
    employeeCreatedDate: this.currentDate,

    createdBy: this.loginId   // ✅ FIX HERE
  }));

  this.commonService.submit_multiple_employee(payload).subscribe({
    next: (res) => {
      if (res?.dublicateMessemployeeAges?.length) {
        res.dublicateMessemployeeAges.forEach((msg: string) =>
          this.toast.warning(msg, 'warning', 4000)
        );
      }

      this.toast.success('Record Added Successfully!', 'success', 4000);
      this.resetAfterSave();
      this.loadEmployee();
    },
    error: () => {
      this.toast.danger('Save failed. Employee service down!', 'error', 4000);
    },
  });
}
resetAfterSave() {
  this.forms = [
    {
      employeeId: '',
      employeeCode: '',
      employeeName: '',

      employeeDOB: '',
      employeeAge: '',   // ✅ FIX (string)

      employeeMarriedStatus: '',
      employeeGender: 'Male',

      employeeEmail: '',
      employeeContact: '',

      employeeAddress: '',
      employeeCity: '',
      employeeState: '',
      employeePinCode: '',
      employeeCountry: '',
      employeeReligion: '',

      departmentId: '',
      designationId: '',

      employeeStatus: 'Active',
      employeeCreatedDate: this.currentDate || '',

      createdBy: this.loginId   // ✅ IMPORTANT
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
    // ✅ UI binding
    employeeId: '',
    employeeCode: '',
    employeeName: '',

    employeeDOB: '',
    employeeAge: '',   // ✅ FIX

    employeeMarriedStatus: '',
    employeeGender: 'Male',

    employeeEmail: '',
    employeeContact: '',

    employeeAddress: '',
    employeeCity: '',
    employeeState: '',
    employeePinCode: '',
    employeeCountry: '',
    employeeReligion: '',

    departmentId: '',
    designationId: '',

    employeeStatus: 'Active',
    employeeCreatedDate: currentDate,

    createdBy: this.loginId,   // ✅ IMPORTANT

    // ✅ backend save object
    newRecord: {
      employeeId: '0',
      employeeCode: '',
      employeeName: '',

      employeeDOB: '',
      employeeAge: '',   // ✅ FIX

      employeeMarriedStatus: '',
      employeeGender: 'Male',

      employeeEmail: '',
      employeeContact: '',

      employeeAddress: '',
      employeeCity: '',
      employeeState: '',
      employeePinCode: '',
      employeeCountry: '',
      employeeReligion: '',

      departmentId: '',
      designationId: '',

      employeeStatus: 'Active',
      employeeCreatedDate: currentDate,

      createdBy: this.loginId   // ✅ IMPORTANT
    },
  });
}

cancelRecord(form?: NgForm, index?: number) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const currentDate = `${yyyy}-${mm}-${dd}`;

  if (index !== undefined) {
    this.forms[index] = {
      employeeId: '',
      employeeCode: '',
      employeeName: '',

      employeeDOB: '',
      employeeAge: '',   // ✅ FIX

      employeeMarriedStatus: '',
      employeeGender: 'Male',

      employeeEmail: '',
      employeeContact: '',

      employeeAddress: '',
      employeeCity: '',
      employeeState: '',
      employeePinCode: '',
      employeeCountry: '',
      employeeReligion: '',

      departmentId: '',
      designationId: '',

      employeeStatus: 'Active',
      employeeCreatedDate: currentDate,

      createdBy: this.loginId,   // ✅ IMPORTANT

      newRecord: {
        employeeId: '0',
        employeeCode: '',
        employeeName: '',

        employeeDOB: '',
        employeeAge: '',   // ✅ FIX

        employeeMarriedStatus: '',
        employeeGender: 'Male',

        employeeEmail: '',
        employeeContact: '',

        employeeAddress: '',
        employeeCity: '',
        employeeState: '',
        employeePinCode: '',
        employeeCountry: '',
        employeeReligion: '',

        departmentId: '',
        designationId: '',

        employeeStatus: 'Active',
        employeeCreatedDate: currentDate,

        createdBy: this.loginId   // ✅ IMPORTANT
      },
    };
  }

  if (form) form.resetForm();

  this.isEditMode = false;
  this.editIndex = null;
  this.showErrors = false;
}

  removeForm(index: number) {
    this.forms.splice(index, 1);
  }

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
      const itemDate = this.convertToDate(item.employeeCreatedDate);
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
        item.employeeCreatedDate,
        this.startDate,
        this.endDate,
      ),
    );
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.toast.warning('select a file first !');
      return;
    }

    this.loading = true;
    this.commonService.employee_upload_excel(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;
        this.loadEmployee();
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

  // ---------------- Download Sample CSV ----------------
 downloadSampleCSV() {
  if (!this.tableData.length) {
    this.toast.danger('No data to download!', 'error', 4000);
    return;
  }

  // ⭐ HEADER (FULL BACKEND MATCH ✅)
  const headers = [
    'Employee ID',
    'Employee Code',
    'Employee Name',
    'DOB',
    'Age',
    'Married Status',
    'Gender',
    'Email',
    'Contact',
    'Address',
    'City',
    'State',
    'Pin Code',
    'Country',
    'Religion',
    'Department',
    'Designation',
    'Status',
    'Created Date',
    'Created By'
  ];

  const csvRows = [headers.join(',')];

  // ⭐ ROWS
  this.tableData.forEach((row) => {
    const rowData = [
      row.employeeId,
      row.employeeCode,
      row.employeeName,
      row.employeeDOB,
      row.employeeAge,
      row.employeeMarriedStatus,
      row.employeeGender,
      row.employeeEmail,
      row.employeeContact,
      row.employeeAddress,
      row.employeeCity,
      row.employeeState,
      row.employeePinCode,
      row.employeeCountry,
      row.employeeReligion,
      row.departmentId,
      row.designationId,
      row.employeeStatus,
      row.employeeCreatedDate,
      row.createdBy
    ];

    csvRows.push(rowData.join(','));
  });

  // ⭐ CREATE FILE
  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;'
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Employee_Report.csv';
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

  // ⭐ Row 1 → Company Name
  csvRows.push(this.headCompanyName || 'Company Name');

  // ⭐ Row 2 → Date
  csvRows.push(`Date:,${formattedDate}`);

  // Empty row
  csvRows.push('');

  // ⭐ HEADER (FULL BACKEND MATCH ✅)
  const headers = [
    'Employee ID',
    'Employee Code',
    'Employee Name',
    'DOB',
    'Age',
    'Married Status',
    'Gender',
    'Email',
    'Contact',
    'Address',
    'City',
    'State',
    'Pin Code',
    'Country',
    'Religion',
    'Department',
    'Designation',
    'Status',
    'Created Date',
    'Created By'
  ];

  csvRows.push(headers.join(','));

  // ⭐ DATA ROWS
  data.forEach((row) => {
    const rowData = [
      row.employeeId,
      row.employeeCode,
      row.employeeName,
      row.employeeDOB,
      row.employeeAge,
      row.employeeMarriedStatus,
      row.employeeGender,
      row.employeeEmail,
      row.employeeContact,
      row.employeeAddress,
      row.employeeCity,
      row.employeeState,
      row.employeePinCode,
      row.employeeCountry,
      row.employeeReligion,
      row.departmentId,
      row.designationId,
      row.employeeStatus,
      row.employeeCreatedDate,
      row.createdBy
    ];

    csvRows.push(rowData.join(','));
  });

  // ⭐ CREATE FILE
  const csvData = csvRows.join('\n');

  const blob = new Blob([csvData], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Filtered_Employee_Report.csv');
}

exportFilteredExcel(data: TableRow[]) {
  const wsData: any[] = [];

  // ⭐ Row 1 → Company Name
  wsData.push([this.headCompanyName || 'Company Name']);

  // ⭐ Row 2 → Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  // Empty Row
  wsData.push([]);

  // ⭐ HEADER (FULL BACKEND MATCH ✅)
  wsData.push([
    'Employee ID',
    'Employee Code',
    'Employee Name',
    'DOB',
    'Age',
    'Married Status',
    'Gender',
    'Email',
    'Contact',
    'Address',
    'City',
    'State',
    'Pin Code',
    'Country',
    'Religion',
    'Department',
    'Designation',
    'Status',
    'Created Date',
    'Created By'
  ]);

  // ⭐ DATA ROWS
  data.forEach((row) => {
    wsData.push([
      row.employeeId,
      row.employeeCode,
      row.employeeName,
      row.employeeDOB,
      row.employeeAge,
      row.employeeMarriedStatus,
      row.employeeGender,
      row.employeeEmail,
      row.employeeContact,
      row.employeeAddress,
      row.employeeCity,
      row.employeeState,
      row.employeePinCode,
      row.employeeCountry,
      row.employeeReligion,
      row.departmentId,
      row.designationId,
      row.employeeStatus,
      row.employeeCreatedDate,
      row.createdBy
    ]);
  });

  // ⭐ Worksheet
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // ⭐ Column Widths (UPDATED 🔥)
  worksheet['!cols'] = [
    { wch: 12 }, // ID
    { wch: 15 }, // Code
    { wch: 20 }, // Name
    { wch: 12 }, // DOB
    { wch: 6 },  // Age
    { wch: 15 }, // Married
    { wch: 10 }, // Gender
    { wch: 25 }, // Email
    { wch: 15 }, // Contact
    { wch: 25 }, // Address
    { wch: 15 }, // City
    { wch: 15 }, // State
    { wch: 10 }, // Pin
    { wch: 15 }, // Country
    { wch: 15 }, // Religion
    { wch: 18 }, // Dept
    { wch: 18 }, // Desig
    { wch: 10 }, // Status
    { wch: 15 }, // Created Date
    { wch: 18 }  // Created By
  ];

  // ⭐ Workbook
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Employee');

  // ⭐ Export
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Filtered_Employee_Report.xlsx');
}

exportFilteredPDF(data: TableRow[]) {
  const doc = new jsPDF('l', 'pt', 'a4'); // ✅ landscape

  // ⭐ TITLE
  doc.setFontSize(20);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const title = 'Employee Records';

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

  doc.text(this.headCompanyName || 'Company Name', 40, 70);
  doc.text(dateStr, pageWidth - 40, 70, { align: 'right' });

  // ⭐ TABLE (FULL BACKEND MATCH ✅)
  autoTable(doc, {
    startY: 90,

    head: [[
      'ID','Code','Name','DOB','Age','Married','Gender',
      'Email','Contact','Address','City','State','Pin',
      'Country','Religion','Dept','Desig','Status',
      'Created Date','Created By'
    ]],

    body: data.map((row) => [
      row.employeeId,
      row.employeeCode,
      row.employeeName,
      row.employeeDOB,
      row.employeeAge,
      row.employeeMarriedStatus,
      row.employeeGender,
      row.employeeEmail,
      row.employeeContact,
      row.employeeAddress,
      row.employeeCity,
      row.employeeState,
      row.employeePinCode,
      row.employeeCountry,
      row.employeeReligion,
      row.departmentId,
      row.designationId,
      row.employeeStatus,
      row.employeeCreatedDate,
      row.createdBy
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
      fontSize: 8,
    },

    styles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      valign: 'middle',
      cellPadding: 3
    },

    // ⭐ page number
    didDrawPage: () => {
      doc.setFontSize(10);
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        pageWidth - 60,
        doc.internal.pageSize.getHeight() - 10
      );
    }
  });

  doc.save('Filtered_Employee_Report.pdf');
}
}
