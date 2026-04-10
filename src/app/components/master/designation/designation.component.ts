/*
 **************************************************************************************
 * Program Name  : DesignationComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 07, 2026
 * System Name   : gswbs
 *
 * Purpose       : Angular Component for Designation Master Management.
 *
 * Description   : This component manages Designation data including:
 *                 - Fetch all designations
 *                 - Add / Update / Delete records
 *                 - Bulk Import (Excel, TXT, DOCX, PDF)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *                 - Search, Sorting, Pagination
 *                 - Date filtering
 *
 * Features      :
 *   - Multi-record form handling
 *   - Validation using NgForm
 *   - Bulk upload via API
 *   - Dynamic export formatting
 *   - Toast notifications
 *
 * Endpoints Used:
 *   - GET    /designation/getAll
 *   - POST   /designation/saveAll
 *   - PUT    /designation/update/{id}
 *   - POST   /designation/delete-multiple
 *   - POST   /designation/import
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

interface TableRow {
  designationId: string;
  designationName: string;
  createdDate: string;
  loginId: string;
  status: 'Active' | 'Inactive';
}
// private String designationId;
//   private String designationCode;
//   private String designationName;
//   private String createdDate;
//   private String loginId;
//   private String status;
@Component({
  selector: 'app-designation',
  standalone: false,
  templateUrl: './designation.component.html',
  styleUrls: ['./designation.component.css'],
})
export class DesignationComponent implements OnInit {
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
    this.loadDesignations();
    this.filteredData = [...this.tableData];
  }

private initializeForm(): void {
  this.forms = [
    {
      // 🔹 UI binding fields (UPDATED ✅)
      designationId: '0',
      designationName: '',
      createdDate: this.currentDate || '',
           // ✅ NEW FIELD
      loginId: this.loginId,
      status: 'Active',

      // 🔥 BACKEND OBJECT (UPDATED ✅)
      newRecord: {
        designationId: '0',
        designationName: '',
        createdDate: this.currentDate,
              // ✅ NEW FIELD
        loginId: this.loginId,
        status: 'Active'
      }
    }
  ];
}
  get editHeading(): string {
    if (this.isEditMode && this.editIndex !== null) {
      return (
        'Update Designation Details (ID: ' +
        this.tableData[this.editIndex].designationId +
        ')'
      );
    }
    return '';
  }
  //  loadDesignations(): void {
  //    this.commonService.fetchAllDesignationByCompany(this.loginId).subscribe({
  //      next: (res: TableRow[]) => {
  //        this.tableData = res.map((item) => ({
  //          ...item,
  //          createdDate: item.createdDate,
  //        }));
  //
  //        this.filteredData = [...this.tableData];
  //      },
  //      error: (err) => {
  //        console.error('API Error:', err);
  //      },
  //    });
  //  }

  loadDesignations(): void {
    this.commonService.fetchAllDesignation().subscribe({
      next: (res: any[]) => {
        this.tableData = res.map((item) => ({
          designationId: item.designationId,
       
          designationName: item.designationName,
          createdDate: item.createdDate,
          loginId: item.loginId, // ⭐ IMPORTANT
          status: item.status,
        }));

        this.filteredData = [...this.tableData];
      },
      error: (err) => {
        console.error('API Error:', err);
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

  selectedRows: TableRow[] = [];
  // Toggle single row selection
  toggleRowSelection(row: TableRow, event: any) {
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

    // 🔥 Collect designationIds
    const ids: string[] = this.selectedRows.map((row) => row.designationId);

    // 🔥 Single API call
    this.commonService.deleteMultipleDesignation(ids).subscribe({
      next: () => {
        // remove deleted rows from table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.designationId),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];
        this.currentPage = 1;
        this.loadDesignations();
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
      this.selectedRows = [...this.filteredData];
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

    // Empty Row for spacing
    wsData.push([]);

    // ⭐ Header
    wsData.push([
      'ID',
      'Designation Name',
      'Created Date',
      'loginId  ',
      'status',
    ]);

    // ⭐ Rows
    this.tableData.forEach((row) => {
      wsData.push([
        row.designationId,
       
        row.designationName,
        row.createdDate,
        row.loginId,
        row.status,
      ]);
    });

    // Create worksheet
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    // Create workbook
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Designation');

    // Export
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream',
    });

    saveAs(blob, 'Designation_Report.xlsx');
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

        /* ⭐ Title Center + Underline */
        h2 {
          text-align: center;
          font-size: 26px;
          color: #00468c;
          margin-bottom: 2px;
          font-weight: bold;
          text-decoration: underline;
        }

        /* ⭐ Header Info */
       /* Header Info (company + date same line) */
        .header-info {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: bold;
          margin: 5px 0 10px 0;  /* gap */
          width: 100%;
        }

        /* Table top margin  */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;  /* gap  */
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

        /* ⭐ status Colors */
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
      <h2>Designation Records</h2>

      <div class="header-info">
        <div>${this.loginId}</div>
        <div>${formattedDate}</div>
      </div>

      <table>
        <tr>
          <th>Designation ID</th>
       
          <th>Designation Name</th>
          <th>Create Date</th>
          <th>logingId</th>
          <th>status</th>
        </tr>
  `;

    this.tableData.forEach((row) => {
      const statusClass =
        row.status === 'Active' ? 'status-active' : 'status-inactive';
      const statusIcon = row.status === 'Active' ? '✔️' : '❌';

      content += `
      <tr>
        <td>${row.designationId}</td>
        <td>${row.designationName}</td>
        <td>${row.createdDate}</td>
        <td>${row.loginId}</td>
      <td class="${statusClass}">${statusIcon} ${row.status}</td>
</tr>
    `;
    });

    content += `
      </table>
    </body>
  </html>
  `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    saveAs(blob, 'Designation_Report.doc');
  }

  exportPDF() {
    const doc = new jsPDF('p', 'pt', 'a4');

    // ⭐ TITLE (Center + Underline)
    doc.setFontSize(22);
    doc.setTextColor(0, 70, 140);

    const pageWidth = doc.internal.pageSize.getWidth();
    const titleX = pageWidth / 2;

    doc.text('Designation Records', titleX, 60, { align: 'center' });

    // Underline

    const titleWidth = doc.getTextWidth('Designation Records');
    doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

    // ⭐ Company Name (Left) + Date (Right)
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);

    const company = this.headCompanyName || 'Company Name';
    const dateStr = new Date().toLocaleDateString();

    const leftX = 40;
    const topY = 100;

    // Company Name Left
    doc.text(company, leftX, topY);

    // Date Right Side (perfect right)
    doc.text(dateStr, pageWidth - 40, topY, { align: 'right' });

    // ⭐ TABLE (Blue Header)
    autoTable(doc, {
      startY: 110,
      head: [
        [
          'ID',
       
          'Designation Name',
          'created Date',
          'Reporting To',
          'status',
        ],
      ],
      body: this.tableData.map((row) => [
        row.designationId,
        
        row.designationName,
        row.createdDate,
        row.loginId,
        row.status,
      ]),

      theme: 'grid',

      headStyles: {
        fillColor: [0, 92, 179],
        textColor: [255, 255, 255],
        halign: 'center',
        fontSize: 12,
      },

      bodyStyles: {
        fontSize: 11,
        halign: 'center',
        textColor: [0, 0, 0],
      },

      styles: {
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        valign: 'middle',
      },
    });

    doc.save('Designation_Report.pdf');
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

  toastMessage: string = '';
  toastType: string = '';

  //New record
  newRecord: TableRow = {
    designationId: '0',
  
    designationName: '',
    createdDate: '',
    loginId: this.loginId,

    status: 'Active',
  };

  isEditMode: boolean = false;
  editIndex: number | null = null;

  onEdit(row: TableRow, index: number) {
    this.activeTab = 'newRecord';
    this.isEditMode = true;

    this.editIndex = this.tableData.findIndex(
      (r) => r.designationId === row.designationId,
    );

    // form bind for editing
    this.forms[0] = {
      designationId: row.designationId, // optional if needed
    
      designationName: row.designationName,
      createdDate: row.createdDate, // ✅ corrected
      loginId: row.loginId,
      status: row.status,
    };
  }

  saveAllRecords() {
    // ---------------- VALIDATION ----------------
const invalid = this.forms.some(
  (f) =>
    !f.designationName?.trim() ||
    !f.createdDate?.trim() ||
    !f.status ||
    !f.loginId
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
        designationName: form.designationName,
        createdDate: form.createdDate,
        loginId: form.loginId || this.loginId, // ✅ FIX
        status: form.status,
      };

      const designationId = this.tableData[this.editIndex].designationId;

      //this.commonService
      //  .updateItem(designationId, this.loginId, payload)
      this.commonService.updateDesignation(designationId, payload).subscribe({
        next: () => {
          this.toast.success('Record Updated Successfully!', 'success', 4000);
          this.resetAfterSave();
          this.loadDesignations();
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

    // ---------------- ADD MODE (SAVE) ----------------
    const payload = this.forms.map((f) => ({
     
      designationName: f.designationName,
      createdDate: f.createdDate,
      loginId: f.loginId || this.loginId, // ✅ FIX
      status: f.status,
    }));
    this.commonService.submitDesignation(payload).subscribe({
      next: (res) => {
        if (res?.dublicateMessages?.length) {
          res.dublicateMessages.forEach((msg: string) =>
            this.toast.warning(msg, 'warning', 4000),
          );
        }

        this.toast.success('Record Added Successfully!', 'success', 4000);
        this.resetAfterSave();
        this.loadDesignations();
      },
      error: () => {
        this.toast.danger(
          'Save failed. Designation service down!',
          'error',
          4000,
        );
      },
    });
  }

  resetAfterSave() {
    this.forms = [
      {
      
        designationName: '',
        createdDate: this.currentDate,
        loginId: this.loginId, // ⭐ important
        status: 'Active',
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
      // ✅ for UI binding
    
      designationName: '',
      createdDate: currentDate,
      loginId: this.loginId,
      status: 'Active',

      // ✅ for backend save logic
      newRecord: {
        designationId: 0,
       
        designationName: '',
        createdDate: currentDate,
        loginId: this.loginId,

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

    if (index !== undefined) {
      this.forms[index] = {
       
        designationName: '',
        createdDate: currentDate,
        loginId: this.loginId,
        status: 'Active',

        newRecord: {
          designationId: '0',
          
          designationName: '',
          createdDate: currentDate,
          loginId: this.loginId,
          status: 'Active',
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
      this.isDateInRange(item.createdDate, this.startDate, this.endDate),
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
        this.loadDesignations();
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
  //       designationId: values[headers.indexOf('id')] || '',
  //       designationName: values[headers.indexOf('Designation name')] || '',
  //       loginId: values[headers.indexOf('company name')] || '',
  //       designationCode values[headers.indexOf('phone number')] || '',
  //       createdDate: values[headers.indexOf('date')] || '',
  //       DesignationCurrentEmployee: values[headers.indexOf('employee')] || '0',
  //       status: values[headers.indexOf('status')] || 'Active',
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

      json.forEach((obj: any, i) => {
        const row: TableRow = {
          designationId: obj['ID'] || '',
        
          designationName: obj['Designation Name'] || '',
          createdDate: obj['Date'] || '',
          loginId: obj['Reporting To'] || '0',
          status: obj['status'] || 'Active',
        };
        this.tableData.push(row);
      });

      this.filteredData = [...this.tableData];
      this.toast.success('Excel imported successfully!', 'success', 4000); // green color for success
    };
    reader.readAsBinaryString(file);
  }

  // ---------------- TXT Parsing ----------------
  readTXT(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      let text = reader.result as string;

      // Remove header line
      text = text
        .replace(
          /Designation\s+ID\s+\s+Designation\s+Name\s+Created\s+Date\s+Reporting\s+To\s+status/i,
          '',
        )
        .trim();

      // Split rows based on status (Active / Inactive)
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

        if (parts.length < 6) {
          console.warn('Invalid row:', r);
          return;
        }

        const [
          designationId,
         
          designationName,
          createdDate,
          loginId,
          status,
        ] = parts;

        const row: TableRow = {
          designationId,
         
          designationName,
          createdDate, // ✅ correct field name
          loginId,
          status: status as 'Active' | 'Inactive',
        };

        this.tableData.push(row);
      });

      this.filteredData = [...this.tableData];
      this.toast.success('TXT imported successfully!', 'success', 4000);
    };

    reader.readAsText(file);
  }

  // ---------------- DOCX Parsing ----------------
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
      while (cells.length < 6) cells.push('');

      const newRecord: TableRow = {
        designationId: cells[0] || '',
      
        designationName: cells[1] || '',
        createdDate: cells[2] || '', // ✅ FIXED NAME
        loginId: cells[3] || '',
        status: cells[4] === 'Inactive' ? 'Inactive' : 'Active', // ✅ Safe Enum Handling
      };

      this.tableData.push(newRecord);
    });

    this.filteredData = [...this.tableData];

    this.toast.success('DOCX table imported successfully!', 'success', 4000);
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

    console.log('RAW:', fullText);

    // Normalize corrupted status text
    fullText = fullText.replace(/A[cç][^\s]*ve/gi, 'Active');
    fullText = fullText.replace(/In[cç][^\s]*ve/gi, 'Inactive');

    // Remove header (New Interface)
    fullText = fullText.replace(/Designation\s*ID.*?status/i, '');

    // Fix spaced dates → 12-11-2022
    fullText = fullText.replace(
      /(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{4})/g,
      '$1-$2-$3',
    );

    // Remove extra spaces
    fullText = fullText.replace(/\s+/g, ' ').trim();

    console.log('CLEANED:', fullText);

    /*
    Expected Row Format:
    designationId designationCode designationName createdDate loginId status
  */

    const rowRegex =
      /(\d+)\s+([A-Za-z0-9-]+)\s+([A-Za-z ]+)\s+(\d{2}-\d{2}-\d{4})\s+(\d+)\s+(Active|Inactive)/g;

    let match;

    while ((match = rowRegex.exec(fullText)) !== null) {
      const row: TableRow = {
        designationId: match[1],
      
        designationName: match[2].trim(),
        createdDate: match[3],
        loginId: match[4],
        status: match[5] === 'Inactive' ? 'Inactive' : 'Active',
      };

      this.tableData.push(row);
    }

    this.filteredData = [...this.tableData];

    this.toast.success('PDF imported successfully!', 'success', 4000);

    console.log('FINAL ROWS:', this.tableData);
  }
  // ---------------- Download Sample CSV ----------------
  downloadSampleCSV() {
    if (!this.tableData.length) {
      this.toast.danger('No data to download!', 'error', 4000);
      return;
    }

    // CSV Headers as per TableRow interface
    const headers = [
      'Designation ID',
      
      'Designation Name',
      'Created Date',
      'Reporting To',
      'status',
    ];

    const csvRows = [headers.join(',')];

    this.tableData.forEach((row: TableRow) => {
      const rowData = [
        row.designationId,
       
        row.designationName,
        row.createdDate,
        row.loginId,
        row.status,
      ];

      csvRows.push(rowData.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Designations.csv';
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

    // ⭐ Row 1 → Company Name (if you store separately)
    csvRows.push(this.loginId || 'Company Name');

    // ⭐ Row 2 → Date
    csvRows.push(`Date:,${formattedDate}`);

    // Empty row for spacing
    csvRows.push('');

    // ⭐ Header (as per TableRow interface)
    const headers = [
      'Designation ID',
     
      'Designation Name',
      'Created Date',
      'Reporting To',
      'status',
    ];
    csvRows.push(headers.join(','));

    // ⭐ Data rows
    data.forEach((row: TableRow) => {
      const rowData = [
        row.designationId,
       
        row.designationName,
        row.createdDate,
        row.loginId,
        row.status,
      ];

      csvRows.push(rowData.join(','));
    });

    // Create CSV and trigger download
    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'Filtered_Designation_Report.csv');
  }

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

    // ⭐ Header (As per TableRow interface)
    wsData.push([
      'Designation ID',
     
      'Designation Name',
      'Created Date',
      'Reporting To',
      'status',
    ]);

    // ⭐ Data Rows
    data.forEach((row: TableRow) => {
      wsData.push([
        row.designationId,
       
        row.designationName,
        row.createdDate,
        row.loginId,
        row.status,
      ]);
    });

    // Create worksheet
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    // ⭐ Adjust column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Designation ID
      { wch: 20 }, // Designation Code
      { wch: 25 }, // Designation Name
      { wch: 18 }, // Created Date
      { wch: 20 }, // Reporting To
      { wch: 12 }, // status
    ];

    // Create workbook
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Designation');

    // Export
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, 'Filtered_Designation_Report.xlsx');
  }

  exportFilteredPDF(data: TableRow[]) {
    const doc = new jsPDF('p', 'pt', 'a4');

    // ⭐ Title
    doc.setFontSize(22);
    doc.setTextColor(0, 70, 140);

    const pageWidth = doc.internal.pageSize.getWidth();
    const titleX = pageWidth / 2;

    doc.text('Designation Records', titleX, 60, { align: 'center' });

    const titleWidth = doc.getTextWidth('Designation Records');
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
          'Designation ID',
         
          'Designation Name',
          'Created Date',
          'Reporting To',
          'status',
        ],
      ],
      body: data.map((row: TableRow) => [
        row.designationId,
        
        row.designationName,
        row.createdDate,
        row.loginId,
        row.status,
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 92, 179],
        textColor: [255, 255, 255],
        halign: 'center',
      },
      bodyStyles: {
        halign: 'center',
        textColor: [0, 0, 0],
      },
    });

    doc.save('Filtered_Designation_Report.pdf');
  }
}
