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
import { CommonService } from '../../../services/common/common-service';

export interface ChangePassword {
  userId: number;

  employeeCode: string;
  userName: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-user-password',
  standalone: false,
  templateUrl: './user-password.component.html',
  styleUrl: './user-password.component.css',
})
export class UserPasswordComponent {
  activeTab = 'change password';
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
  // State Flags
  success = false;
  hasNumber: boolean = false;
  hasLength: boolean = false;
  hasSpecial: boolean = false;
  noRepeat: boolean = false;
  form: ChangePassword = {
    userId: 0,
    employeeCode: '',
    userName: '',
    newPassword: '',
    confirmPassword: '',
  };
  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;

  loading: any = false;

  tableData: ChangePassword[] = [];
  filteredData: ChangePassword[] = [];

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
    this.userRoles = this.authService.getUserRoles();
    this.date = this.authService.getCurrentDate();
    this.headCompanyName = this.authService.getEmployeeName();
    this.loginId = this.authService.getEmployeeId();

    if (!this.token) {
      this.router.navigate(['/login-page']);
      return;
    }

    // 🔥 AUTO FILL START
    if (this.loginId) {
      this.form.userId = Number(this.loginId.split('/')[2]); // 001 → 1
      this.form.employeeCode = this.loginId; // full code
      this.form.userName = this.headCompanyName || this.userName;
    }
  }
  tabs = [
    {
      key: 'change password',
      label: 'Change Password',
      icon: 'bi bi-key-fill',
    },
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
    if (!this.deleteConfirm) {
      this.deleteConfirm = true;

      this.showToast('Click delete again to confirm', 'Confirm Delete');

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

    this.showToast('Selected records deleted', 'Success');
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

  isEditMode: boolean = false;
  editIndex: number = -1; // ensures no TS errors

  activeForm: number = 0;
  showErrors: boolean = false;

  // --------------------------
  // OPEN NEW RECORD TAB
  // --------------------------
  openNewRecordTab() {
    this.activeTab = 'newRecord';
    this.isEditMode = false;
    this.editIndex = -1;

    // 🔥 RESET FORM (ONLY PASSWORD FIELDS)
    this.form.newPassword = '';
    this.form.confirmPassword = '';

    this.showErrors = false;
  }
  //  changePassword() {
  //    if (!this.form.newPassword || !this.form.confirmPassword) {
  //      this.showToast('All fields required', 'error');
  //      return;
  //    }
  //
  //    if (this.form.newPassword !== this.form.confirmPassword) {
  //      this.showToast('Passwords do not match', 'error');
  //      return;
  //    }
  //
  //    const payload = {
  //      userId: this.form.userId,
  //      newPassword: this.form.newPassword,
  //    };
  //
  //    this.commonService.changePassword(payload).subscribe({
  //      next: () => {
  //        this.showToast('Password Changed Successfully', 'success');
  //        this.success = true; // 🔥 success screen show
  //
  //        this.form.newPassword = '';
  //        this.form.confirmPassword = '';
  //      },
  //      error: () => {
  //        this.showToast('Error while changing password', 'error');
  //      },
  //    });
  //  }
  changePassword() {
    if (!this.form.newPassword || !this.form.confirmPassword) {
      this.showToast('All fields required', 'error');
      return;
    }

    if (this.form.newPassword !== this.form.confirmPassword) {
      this.showToast('Passwords do not match', 'error');
      return;
    }

    const payload = {
      userId: this.form.userId,
      newPassword: this.form.newPassword,
    };

    console.log('Payload:', payload);

    this.commonService.changePassword(payload).subscribe({
      next: (res: any) => {
        console.log('Success:', res);

        this.showToast('Password Changed Successfully', 'success');
        this.success = true;

        this.form.newPassword = '';
        this.form.confirmPassword = '';
      },
      error: (err) => {
        console.log('Error:', err);
        this.showToast('Error while changing password', 'error');
      },
    });
  }
  goBack() {
    this.router.navigate(['/dashboard']); // किंवा तुझा page route
  }
  checkPassword() {
    const pwd = this.form.newPassword || '';

    this.hasNumber = /\d/.test(pwd);
    this.hasLength = pwd.length >= 8;
    this.hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    this.noRepeat = !/(.)\1/.test(pwd);
  }
  // --------------------------
}
