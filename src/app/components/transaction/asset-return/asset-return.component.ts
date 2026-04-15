/*
 **************************************************************************************
 * Program Name  : AssetReturnComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 13, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Asset Return module.
 *
 * Description   : This component manages Asset Return operations including:
 *                 - Fetch all asset return records based on Login ID
 *                 - Add single/multiple asset return entries
 *                 - Update existing asset return records
 *                 - Delete single/multiple asset return records
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (CSV, Excel, TXT, DOCX)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling (multiple entries)
 *   - Validation using NgForm
 *   - Auto date handling and formatting
 *   - File parsing using XLSX, Mammoth, pdfjs
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *
 * Endpoints Used:
 *   - GET    /asset-return/getAllAssetReturnsByLoginId/{prefix}/{year}/{code}
 *   - POST   /asset-return/saveAll
 *   - PUT    /asset-return/update/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /asset-return/delete-multiple-assetReturns
 *   - POST   /asset-return/import
 *
 * Called From   : Asset Return UI (Frontend)
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

export interface TableRow {

  /* ========= PRIMARY ========= */
  returnId: string;
  returnNumber: string;

  /* ========= REFERENCES ========= */
  allocationId: string;
  employeeId: string;
  departmentId: string;
  location: string;

  /* ========= ASSET ========= */
  assetId: string;
  assetSerialNumber: string;

  /* ========= DATES ========= */
  expectedReturnDate: string;   // YYYY-MM-DD
  actualReturnDate: string;     // YYYY-MM-DD

  /* ========= CONDITION ========= */
  conditionAtReturn: string;
  damageDetails: string;

  /* ========= PENALTY ========= */
  penaltyApplicable: 'Yes' | 'No';
  penaltyAmount: number;
  reasonForPenalty: string;

  /* ========= VERIFICATION ========= */
  verifiedBy: string;
  verificationDate: string;     // YYYY-MM-DD

  /* ========= STATUS ========= */
  returnStatus: 'Active' | 'Inactive';

  /* ========= REMARKS ========= */
  remarks: string;

  /* ========= AUDIT ========= */
  createdBy: string;
  createdDate: string;          // YYYY-MM-DD
  updatedBy: string;
  updatedDate: string;          // YYYY-MM-DD;
}

@Component({
  selector: 'app-asset-make-form',
  standalone: false,
  templateUrl: './asset-return.component.html',
  styleUrls: ['./asset-return.component.css'],
})
export class AssetReturnComponent {
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
  assetMakes: any[] = [];
  assetTypes: any[] = [];
  departments: any[] = [];
employees: any[] = [];
  loading: any = false;

  tableData: TableRow[] = [];
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
    this.currentDate = this.today.toISOString().split('T')[0];

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.currentDate = this.getTodayDate();
    this.currentDate = `${yyyy}-${mm}-${dd}`;

    // Initialize form + load data
    this.initializeForm();
    this.loadAssetReturns();
    this.loadDepartments();
    this.loadEmployees();
    this.loadAssetTypes();
    this.loadAssetMakes();
    this.loadAssets();

    this.filteredData = [...this.tableData];
  }
onEmployeeChange(index: number) {
  const empId = this.forms[index].newRecord.employeeId;

  const emp = this.employees.find(e => e.employeeId === empId);

  if (emp) {
    this.forms[index].newRecord.departmentId = emp.departmentId; // 🔥 AUTO FILL
  }
}
private initializeForm(): void {
  this.forms = [
    {
      newRecord: {

        /* ========= PRIMARY ========= */
        returnId: '0',
        returnNumber: '',

        /* ========= REFERENCES ========= */
        allocationId: '',
        employeeId: '',
        departmentId: '',
        location: '',

        /* ========= ASSET ========= */
        assetId: '',
        assetSerialNumber: '',

        /* ========= DATES ========= */
        expectedReturnDate: this.currentDate,
        actualReturnDate: this.currentDate,

        /* ========= CONDITION ========= */
        conditionAtReturn: 'Good',
        damageDetails: '',

        /* ========= PENALTY ========= */
        penaltyApplicable: 'No',
        penaltyAmount: 0,
        reasonForPenalty: '',

        /* ========= VERIFICATION ========= */
        verifiedBy: '',
        verificationDate: this.currentDate,

        /* ========= STATUS ========= */
        returnStatus: 'Active',

        /* ========= REMARKS ========= */
        remarks: '',

        /* ========= AUDIT ========= */
        createdBy: this.loginId,
        createdDate: this.currentDate,
        updatedBy: '',
        updatedDate: this.currentDate,
      },
    },
  ];
}

  get editHeading(): string {
    if (this.isEditMode && this.editIndex !== null) {
      return (
        'Update Asset Return Details (ID: ' +
        this.tableData[this.editIndex].returnId +
        ')'
      );
    }
    return '';
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
  assetList: any[] = [];

  loadAssets() {
    this.commonService.fetchAssetByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        this.assetList = Array.isArray(res) ? res : res?.data || [];
        console.log('🔥 Assets:', this.assetList);
      },
    });
  }
onAssetChange(index: number) {
  const selectedId = this.forms[index].newRecord.assetId;

  const asset = this.assetList.find(a => a.assetId === selectedId);

  if (asset) {

    // ✅ BASIC AUTO FILL
    this.forms[index].newRecord.assetSerialNumber = asset.serialNumber;

    // 🔥 NEW LOGIC (IMPORTANT)
    this.forms[index].newRecord.employeeId = asset.employeeId;
    this.forms[index].newRecord.departmentId = asset.departmentId;
    this.forms[index].newRecord.location = asset.location;
  }
}
loadAssetReturns(): void {
  if (!this.loginId) return;

  this.commonService.fetchAllAssetReturnsByLoginId(this.loginId).subscribe({
    next: (res: any) => {

      console.log('🔥 API RESPONSE:', res);

      const list = Array.isArray(res) ? res : res?.data || [];

      this.tableData = list.map((item: any) => ({

        /* ========= PRIMARY ========= */
        returnId: item.returnId ?? '',
        returnNumber: item.returnNumber ?? '',

        /* ========= REFERENCES ========= */
        allocationId: item.allocationId ?? '',
        employeeId: item.employeeId ?? '',
        departmentId: item.departmentId ?? '',
        location: item.location ?? '',

        /* ========= ASSET ========= */
        assetId: item.assetId ?? '',
        assetSerialNumber: item.assetSerialNumber ?? '',

        /* ========= DATES ========= */
        expectedReturnDate: item.expectedReturnDate ?? '',
        actualReturnDate: item.actualReturnDate ?? '',

        /* ========= CONDITION ========= */
        conditionAtReturn: item.conditionAtReturn ?? '',
        damageDetails: item.damageDetails ?? '',

        /* ========= PENALTY ========= */
        penaltyApplicable: item.penaltyApplicable ?? 'No',
        penaltyAmount: item.penaltyAmount ?? 0,
        reasonForPenalty: item.reasonForPenalty ?? '',

        /* ========= VERIFICATION ========= */
        verifiedBy: item.verifiedBy ?? '',
        verificationDate: item.verificationDate ?? '',

        /* ========= STATUS ========= */
        returnStatus: item.returnStatus ?? 'Active',

        /* ========= REMARKS ========= */
        remarks: item.remarks ?? '',

        /* ========= AUDIT ========= */
        createdBy: item.createdBy ?? '',
        createdDate: item.createdDate ?? '',
        updatedBy: item.updatedBy ?? '',
        updatedDate: item.updatedDate ?? '',
      }));

      console.log('✅ FINAL TABLE DATA:', this.tableData);

      this.filteredData = [...this.tableData];
      this.currentPage = 1;

      this.cdr.detectChanges();
    },

    error: (err) => {
      console.error('❌ API Error:', err);
    },
  });
}

  loadAssetMakes(): void {
    if (!this.loginId) return;

    this.commonService.fetchAllAssetMakeByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];

        this.assetMakes = list.map((item: any) => ({
          makeId: item.makeId ?? item.assetMakeId ?? '',
          makeName: item.makeName ?? item.assetMake ?? '',
        }));
      },

      error: (err) => {
        console.error('Asset Make API Error:', err);
      },
    });
  }
  loadAssetTypes(): void {
    this.commonService.fetchAssetTypeByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        console.log('AssetType API:', res);

        const list = Array.isArray(res) ? res : res?.data || [];

        this.assetTypes = list.map((item: any) => ({
          typeName: item.assetTypeName || item.assetType || item.typeName,
        }));
      },
      error: (err) => console.error(err),
    });
  }
  tabs = [
    { key: 'details', label: 'Details', icon: 'bi bi-building-fill' },
    { key: 'newRecord', label: 'New Record', icon: 'bi bi-plus-circle-fill' },
    {
      key: 'bulkImport',
      label: 'Bulk Import',
      icon: 'bi bi-file-earmark-arrow-down-fill',
    },
    {
      key: 'bulkExport',
      label: 'Bulk Export',
      icon: 'bi bi-file-earmark-arrow-up-fill',
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

  // onDepartmentChange(department: string) {
  //   const assets: TableRow[] = this.departmentAssets[department];

  //   if (assets && assets.length > 0) {
  //     const asset = assets[0];

  //     this.forms[0].newRecord.assetId = asset.assetId;
  //     this.forms[0].newRecord.assetName = asset.assetName;
  //     this.forms[0].newRecord.assetType = asset.assetType;
  //     this.forms[0].newRecord.assetSerialNumber = asset.assetSerialNumber;

  //     this.forms[0].newRecord.department = department;
  //   } else {
  //     this.forms[0].newRecord.assetId = '';
  //     this.forms[0].newRecord.assetName = '';
  //     this.forms[0].newRecord.assetType = '';
  //     this.forms[0].newRecord.assetSerialNumber = '';
  //     this.forms[0].newRecord.department = '';
  //   }
  // }

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

  selectedRows: any[] = []; // stores selected rows

  // Toggle single row selection
  //selectedRows: TableRow[] = [];

  toggleRowSelection(row: any, event: any) {
    if (event.target.checked) {
      this.selectedRows.push(row);
    } else {
      this.selectedRows = this.selectedRows.filter((r) => r !== row);
    }
  }

  toggleAll(event: any) {
    if (event.target.checked) {
      this.selectedRows = [...this.tableData];
    } else {
      this.selectedRows = [];
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

    // ✅ Correct field name
 const ids: string[] = this.selectedRows.map(
  (row) => row.returnId,
);

    this.commonService.deleteMultipleAssetReturns(ids).subscribe({
      next: () => {
        // ✅ Remove deleted rows
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.returnId),
        );

        this.filteredData = [...this.tableData];
        this.selectedRows = [];
        this.currentPage = 1;

        this.loadAssetReturns();

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

  sortTable(column: keyof TableRow, order: 'asc' | 'desc') {
    const sorted = [...this.filteredData].sort((a, b) => {
      let valA = a[column] ?? '';
      let valB = b[column] ?? '';

      const isNumber = !isNaN(Number(valA)) && !isNaN(Number(valB));

      if (isNumber) {
        return order === 'asc'
          ? Number(valA) - Number(valB)
          : Number(valB) - Number(valA);
      }

      return order === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    this.filteredData = sorted;
  }

exportExcel() {
  if (!this.filteredData || this.filteredData.length === 0) {
    this.toast.warning('No data available to export!', 'WARNING', 4000);
    return;
  }

  const exportData = this.filteredData.map((row) => ({

    /* ========= PRIMARY ========= */
    Return_ID: row.returnId,
    Return_Number: row.returnNumber,

    /* ========= REFERENCES ========= */
    Allocation_ID: row.allocationId,
    Employee_ID: row.employeeId,
    Department_ID: row.departmentId,
    Location: row.location,

    /* ========= ASSET ========= */
    Asset_ID: row.assetId,
    Asset_Serial_Number: row.assetSerialNumber,

    /* ========= DATES ========= */
    Expected_Return_Date: row.expectedReturnDate,
    Actual_Return_Date: row.actualReturnDate,

    /* ========= CONDITION ========= */
    Condition_At_Return: row.conditionAtReturn,
    Damage_Details: row.damageDetails,

    /* ========= PENALTY ========= */
    Penalty_Applicable: row.penaltyApplicable,
    Penalty_Amount: row.penaltyAmount,
    Reason_For_Penalty: row.reasonForPenalty,

    /* ========= VERIFICATION ========= */
    Verified_By: row.verifiedBy,
    Verification_Date: row.verificationDate,

    /* ========= STATUS ========= */
    Return_Status: row.returnStatus,

    /* ========= REMARKS ========= */
    Remarks: row.remarks,

    /* ========= AUDIT ========= */
    Created_By: row.createdBy,
    Created_Date: row.createdDate,
    Updated_By: row.updatedBy,
    Updated_Date: row.updatedDate,
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Auto column width
  worksheet['!cols'] = Object.keys(exportData[0]).map(() => ({
    wch: 22,
  }));

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset_Return_Report');

  // Download Excel
  XLSX.writeFile(workbook, 'Asset_Return_Report.xlsx');
}

exportDoc() {
  if (!this.filteredData || this.filteredData.length === 0) {
    this.toast.warning('No data available to export!', 'WARNING', 4000);
    return;
  }

  const currentDate = new Date().toLocaleDateString();

  let content = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
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
  margin-bottom: 15px;
}

.header-table td {
  border: none;
  padding: 2px;
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
<td class="title">Asset Return Report</td>
</tr>
</table>

<table>

<tr>
<th>Return ID</th>
<th>Return Number</th>
<th>Allocation ID</th>
<th>Employee ID</th>
<th>Department ID</th>
<th>Location</th>
<th>Asset ID</th>
<th>Serial Number</th>
<th>Expected Date</th>
<th>Actual Date</th>
<th>Condition</th>
<th>Damage Details</th>
<th>Penalty</th>
<th>Penalty Amount</th>
<th>Reason</th>
<th>Verified By</th>
<th>Verification Date</th>
<th>Status</th>
<th>Remarks</th>
<th>Created By</th>
<th>Created Date</th>
</tr>
`;

  this.filteredData.forEach((row: TableRow) => {
    content += `
<tr>
<td>${row.returnId || ''}</td>
<td>${row.returnNumber || ''}</td>

<td>${row.allocationId || ''}</td>
<td>${row.employeeId || ''}</td>
<td>${row.departmentId || ''}</td>
<td>${row.location || ''}</td>

<td>${row.assetId || ''}</td>
<td>${row.assetSerialNumber || ''}</td>

<td>${row.expectedReturnDate || ''}</td>
<td>${row.actualReturnDate || ''}</td>

<td>${row.conditionAtReturn || ''}</td>
<td>${row.damageDetails || ''}</td>

<td>${row.penaltyApplicable || ''}</td>
<td>${row.penaltyAmount || 0}</td>
<td>${row.reasonForPenalty || ''}</td>

<td>${row.verifiedBy || ''}</td>
<td>${row.verificationDate || ''}</td>

<td>${row.returnStatus || ''}</td>
<td>${row.remarks || ''}</td>

<td>${row.createdBy || ''}</td>
<td>${row.createdDate || ''}</td>
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

  saveAs(blob, 'Asset_Return_Report.doc');
}

 exportPDF() {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDate = new Date().toLocaleDateString('en-GB');

  /* ================= HEADER ================= */

  doc.setFontSize(10);
  doc.text(`Date: ${currentDate}`, 10, 12);

  doc.setFontSize(16);
  doc.text('Asset Return Report', pageWidth / 2, 12, {
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
    },

    tableWidth: 'auto',

    head: [
      [
        'Return ID',
        'Return No',
        'Allocation ID',
        'Employee ID',
        'Department',
        'Location',
        'Asset ID',
        'Serial No',
        'Expected Date',
        'Actual Date',
        'Condition',
        'Damage',
        'Penalty',
        'Penalty Amt',
        'Reason',
        'Verified By',
        'Verification Date',
        'Status',
        'Remarks',
        'Created By',
        'Created Date',
      ],
    ],

    body: this.filteredData.map((row: TableRow) => [
      row.returnId || '',
      row.returnNumber || '',

      row.allocationId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtReturn || '',
      row.damageDetails || '',

      row.penaltyApplicable || '',
      row.penaltyAmount ?? 0,
      row.reasonForPenalty || '',

      row.verifiedBy || '',
      row.verificationDate || '',

      row.returnStatus || '',
      row.remarks || '',

      row.createdBy || '',
      row.createdDate || '',
    ]),

    didDrawCell: (data) => {
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
    },
  });

  /* ================= SAVE ================= */

  doc.save('Asset_Return_Report.pdf');
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
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`; // ✅ input[type=date] compatible
  }

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
newRecord: TableRow = {

  /* ========= PRIMARY ========= */
  returnId: '',                 // backend generate
  returnNumber: '',

  /* ========= REFERENCES ========= */
  allocationId: '',
  employeeId: '',
  departmentId: '',
  location: '',

  /* ========= ASSET ========= */
  assetId: '',
  assetSerialNumber: '',

  /* ========= DATES ========= */
  expectedReturnDate: this.getTodayDate(),
  actualReturnDate: this.getTodayDate(),

  /* ========= CONDITION ========= */
  conditionAtReturn: 'Good',
  damageDetails: '',

  /* ========= PENALTY ========= */
  penaltyApplicable: 'No',
  penaltyAmount: 0,
  reasonForPenalty: '',

  /* ========= VERIFICATION ========= */
  verifiedBy: '',
  verificationDate: this.getTodayDate(),

  /* ========= STATUS ========= */
  returnStatus: 'Active',

  /* ========= REMARKS ========= */
  remarks: '',

  /* ========= AUDIT ========= */
  createdBy: this.loginId || '',
  createdDate: this.getTodayDate(),
  updatedBy: '',
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
  if (this.isEditMode) return;

  this.forms.push({
    newRecord: {
      ...this.newRecord,

      /* ========= PRIMARY ========= */
      returnId: '0', // backend generate

      /* ========= AUDIT ========= */
      createdBy: this.loginId || '',
      createdDate: this.getTodayDate(),
      updatedBy: '',
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

  // ================= VALIDATION =================
  if (form) {
    Object.keys(form.controls).forEach((key) => {
      form.controls[key].markAsTouched();
      form.controls[key].markAsDirty();
    });
  }

  if (form && !form.valid) return;

  // ================= EDIT MODE =================
  if (this.isEditMode && this.editIndex !== -1) {
    const formData = this.forms[0].newRecord;

    const payload = {

      /* ========= PRIMARY ========= */
      returnId: formData.returnId || '',

      /* ========= REFERENCES ========= */
      allocationId: formData.allocationId || '',
      employeeId: formData.employeeId || '',
      departmentId: formData.departmentId || '',
      location: formData.location || '',

      /* ========= ASSET ========= */
      assetId: formData.assetId || '',
      assetSerialNumber: formData.assetSerialNumber || '',

      /* ========= DATES ========= */
      expectedReturnDate: formData.expectedReturnDate || this.getTodayDate(),
      actualReturnDate: formData.actualReturnDate || this.getTodayDate(),

      /* ========= CONDITION ========= */
      conditionAtReturn: formData.conditionAtReturn || 'Good',
      damageDetails: formData.damageDetails || '',

      /* ========= PENALTY ========= */
      penaltyApplicable: formData.penaltyApplicable || 'No',
      penaltyAmount: formData.penaltyAmount ?? 0,
      reasonForPenalty: formData.reasonForPenalty || '',

      /* ========= VERIFICATION ========= */
      verifiedBy: formData.verifiedBy || '',
      verificationDate: formData.verificationDate || this.getTodayDate(),

      /* ========= STATUS ========= */
      returnStatus: formData.returnStatus || 'Active',

      /* ========= REMARKS ========= */
      remarks: formData.remarks || '',

      /* ========= AUDIT ========= */
      createdBy: formData.createdBy || this.loginId,
      createdDate: formData.createdDate || this.getTodayDate(),
      updatedBy: this.loginId,
      updatedDate: this.getTodayDate(),
    };

    const returnId = this.tableData[this.editIndex].returnId;

    this.commonService
      .updateAssetReturn(returnId, this.loginId, payload)
      .subscribe({
        next: () => {
          this.toast.success('Updated successfully', 'SUCCESS', 4000);
          this.resetAfterSave();
          this.loadAssetReturns();
        },
        error: () => {
          this.toast.danger('Update failed!', 'ERROR', 4000);
        },
      });

    return;
  }

  // ================= ADD MODE =================
  const payload = this.forms.map((f) => ({

    /* ========= PRIMARY ========= */
    returnId: f.newRecord.returnId || '',

    /* ========= REFERENCES ========= */
    allocationId: f.newRecord.allocationId || '',
    employeeId: f.newRecord.employeeId || '',
    departmentId: f.newRecord.departmentId || '',
    location: f.newRecord.location || '',

    /* ========= ASSET ========= */
    assetId: f.newRecord.assetId || '',
    assetSerialNumber: f.newRecord.assetSerialNumber || '',

    /* ========= DATES ========= */
    expectedReturnDate: f.newRecord.expectedReturnDate || this.getTodayDate(),
    actualReturnDate: f.newRecord.actualReturnDate || this.getTodayDate(),

    /* ========= CONDITION ========= */
    conditionAtReturn: f.newRecord.conditionAtReturn || 'Good',
    damageDetails: f.newRecord.damageDetails || '',

    /* ========= PENALTY ========= */
    penaltyApplicable: f.newRecord.penaltyApplicable || 'No',
    penaltyAmount: f.newRecord.penaltyAmount ?? 0,
    reasonForPenalty: f.newRecord.reasonForPenalty || '',

    /* ========= VERIFICATION ========= */
    verifiedBy: f.newRecord.verifiedBy || '',
    verificationDate: f.newRecord.verificationDate || this.getTodayDate(),

    /* ========= STATUS ========= */
    returnStatus: f.newRecord.returnStatus || 'Active',

    /* ========= REMARKS ========= */
    remarks: f.newRecord.remarks || '',

    /* ========= AUDIT ========= */
    createdBy: this.loginId,
    createdDate: f.newRecord.createdDate || this.getTodayDate(),
    updatedBy: '',
    updatedDate: this.getTodayDate(),
  }));

  this.commonService.submitAssetReturn(payload).subscribe({
    next: () => {
      this.toast.success('Saved successfully', 'SUCCESS', 4000);
      this.resetAfterSave();
      this.loadAssetReturns();
    },
    error: () => {
      this.toast.danger('Save failed!', 'ERROR', 4000);
    },
  });
}
resetAfterSave() {
  this.forms = [
    {
      newRecord: {

        /* ========= PRIMARY ========= */
        returnId: '0',
        returnNumber: '',

        /* ========= REFERENCES ========= */
        allocationId: '',
        employeeId: '',
        departmentId: '',
        location: '',

        /* ========= ASSET ========= */
        assetId: '',
        assetSerialNumber: '',

        /* ========= DATES ========= */
        expectedReturnDate: this.getTodayDate(),
        actualReturnDate: this.getTodayDate(),

        /* ========= CONDITION ========= */
        conditionAtReturn: 'Good',
        damageDetails: '',

        /* ========= PENALTY ========= */
        penaltyApplicable: 'No',
        penaltyAmount: 0,
        reasonForPenalty: '',

        /* ========= VERIFICATION ========= */
        verifiedBy: '',
        verificationDate: this.getTodayDate(),

        /* ========= STATUS ========= */
        returnStatus: 'Active',

        /* ========= REMARKS ========= */
        remarks: '',

        /* ========= AUDIT ========= */
        createdBy: this.loginId || '',
        createdDate: this.getTodayDate(),
        updatedBy: '',
        updatedDate: this.getTodayDate(),
      },
    },
  ];

  // ✅ refresh table view
  this.filteredData = [...this.tableData];

  // ✅ reset flags
  this.showErrors = false;
  this.isEditMode = false;
  this.editIndex = -1;

  // ✅ go back to list tab
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
 onEdit(row: any, index: number) {
  console.log('Edit Row:', row);

  this.activeTab = 'newRecord';
  this.isEditMode = true;
  this.editIndex = index;

  this.forms = [
    {
      newRecord: {

        /* ========= PRIMARY ========= */
        returnId: row.returnId || '',
        returnNumber: row.returnNumber || '',

        /* ========= REFERENCES ========= */
        allocationId: row.allocationId || '',
        employeeId: row.employeeId || '',
        departmentId: row.departmentId || '',
        location: row.location || '',

        /* ========= ASSET ========= */
        assetId: row.assetId || '',
        assetSerialNumber: row.assetSerialNumber || '',

        /* ========= DATES ========= */
        expectedReturnDate: row.expectedReturnDate || this.getTodayDate(),
        actualReturnDate: row.actualReturnDate || this.getTodayDate(),

        /* ========= CONDITION ========= */
        conditionAtReturn: row.conditionAtReturn || 'Good',
        damageDetails: row.damageDetails || '',

        /* ========= PENALTY ========= */
        penaltyApplicable: row.penaltyApplicable || 'No',
        penaltyAmount: row.penaltyAmount ?? 0,
        reasonForPenalty: row.reasonForPenalty || '',

        /* ========= VERIFICATION ========= */
        verifiedBy: row.verifiedBy || '',
        verificationDate: row.verificationDate || this.getTodayDate(),

        /* ========= STATUS ========= */
        returnStatus: row.returnStatus || 'Active',

        /* ========= REMARKS ========= */
        remarks: row.remarks || '',

        /* ========= AUDIT ========= */
        createdBy: row.createdBy || this.loginId,
        createdDate: row.createdDate || this.getTodayDate(),
        updatedBy: this.loginId,
        updatedDate: this.getTodayDate(),
      },
    },
  ];
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

  // uploadFile() {
  //   if (!this.selectedFile) {
  //     this.showToast('Please select a file first.', 'error');
  //     return;
  //   }

  //   const fileName = this.selectedFile.name.toLowerCase();

  //   if (fileName.endsWith('.csv')) {
  //     const fileReader = new FileReader();
  //     fileReader.onload = () => {
  //       const csvText = fileReader.result as string;
  //       this.parseCSV(csvText);
  //       this.showToast('CSV file uploaded!', 'success');
  //     };
  //     fileReader.readAsText(this.selectedFile);
  //   } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
  //     this.readExcel(this.selectedFile);
  //     this.showToast('Excel file uploaded!', 'success');
  //   } else if (fileName.endsWith('.txt')) {
  //     this.readTXT(this.selectedFile);
  //     this.showToast('Text file uploaded!', 'success');
  //   } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
  //     this.readDOCX(this.selectedFile);
  //     this.showToast('Word file uploaded!', 'success');
  //   } else {
  //     this.showToast(
  //       `${this.selectedFile.name} uploaded successfully!`,
  //       'success',
  //     );
  //   }
  // }
  uploadFile() {
    if (!this.selectedFile) {
      this.toast.warning('Select a file first!', 'WARNING', 4000);
      return;
    }

    // ✅ File type validation (Excel only)
    const fileName = this.selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      this.toast.warning(
        'Only Excel files (.xlsx, .xls) are allowed!',
        'WARNING',
        4000,
      );
      return;
    }

    this.loading = true;

    this.commonService.uploadAssetReturnExcel(this.selectedFile).subscribe({
      next: (res: any) => {
        this.loading = false;

        // ✅ Clear selected file
        this.selectedFile = null;
        this.selectedFileName = null;

        // ✅ Reload latest data
        this.loadAssetReturns();

        // ✅ Success message handling
        const count = Array.isArray(res) ? res.length : res?.count || 'records';

        this.toast.success(`Imported ${count} successfully!`, 'SUCCESS', 4000);
      },

      error: (err) => {
        this.loading = false;

        console.error('Upload Error:', err);

        // ✅ Better error message
        this.toast.danger(
          err?.error?.message || 'Import Failed. Please check file format!',
          'ERROR',
          4000,
        );
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
      case 'return id':
        return 'returnId';

      case 'return number':
        return 'returnNumber';

      case 'allocation id':
        return 'allocationId';

      case 'employee id':
        return 'employeeId';

      case 'department id':
        return 'departmentId';

      case 'location':
        return 'location';

      case 'asset id':
        return 'assetId';

      case 'serial number':
        return 'assetSerialNumber';

      case 'expected return date':
        return 'expectedReturnDate';

      case 'actual return date':
        return 'actualReturnDate';

      case 'condition':
        return 'conditionAtReturn';

      case 'damage details':
        return 'damageDetails';

      case 'penalty applicable':
        return 'penaltyApplicable';

      case 'penalty amount':
        return 'penaltyAmount';

      case 'reason':
        return 'reasonForPenalty';

      case 'verified by':
        return 'verifiedBy';

      case 'verification date':
        return 'verificationDate';

      case 'status':
        return 'returnStatus';

      case 'remarks':
        return 'remarks';

      case 'created by':
        return 'createdBy';

      case 'created date':
        return 'createdDate';

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

      /* ========= PRIMARY ========= */
      returnId:
        obj['returnId'] ||
        `RET-${String(this.tableData.length + results.length + 1).padStart(3, '0')}`,
      returnNumber: obj['returnNumber'] || '',

      /* ========= REFERENCES ========= */
      allocationId: obj['allocationId'] || '',
      employeeId: obj['employeeId'] || '',
      departmentId: obj['departmentId'] || '',
      location: obj['location'] || '',

      /* ========= ASSET ========= */
      assetId: obj['assetId'] || '',
      assetSerialNumber: obj['assetSerialNumber'] || '',

      /* ========= DATES ========= */
      expectedReturnDate: obj['expectedReturnDate'] || this.getTodayDate(),
      actualReturnDate: obj['actualReturnDate'] || this.getTodayDate(),

      /* ========= CONDITION ========= */
      conditionAtReturn: obj['conditionAtReturn'] || 'Good',
      damageDetails: obj['damageDetails'] || '',

      /* ========= PENALTY ========= */
      penaltyApplicable: obj['penaltyApplicable'] || 'No',
      penaltyAmount: obj['penaltyAmount']
        ? Number(obj['penaltyAmount'])
        : 0,
      reasonForPenalty: obj['reasonForPenalty'] || '',

      /* ========= VERIFICATION ========= */
      verifiedBy: obj['verifiedBy'] || '',
      verificationDate: obj['verificationDate'] || this.getTodayDate(),

      /* ========= STATUS ========= */
      returnStatus: obj['returnStatus'] || 'Active',

      /* ========= REMARKS ========= */
      remarks: obj['remarks'] || '',

      /* ========= AUDIT ========= */
      createdBy: obj['createdBy'] || this.loginId,
      createdDate: obj['createdDate'] || this.getTodayDate(),
      updatedBy: '',
      updatedDate: this.getTodayDate(),
    };

    results.push(newRecord);
  }

  /* ================= MERGE DATA ================= */

  this.tableData = [...this.tableData, ...results];
  this.filteredData = [...this.tableData];
  this.currentPage = 1;

  this.cdr.detectChanges();

  this.showToast('Asset Return CSV imported successfully!', 'success');
}
  // ---------------- Excel Parsing ----------------
readExcel(file: File) {
  const reader = new FileReader();

  reader.onload = () => {
    const workbook = XLSX.read(reader.result, { type: 'binary' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const json = XLSX.utils.sheet_to_json<any>(sheet);

    json.forEach((obj, i) => {
      const newRecord: TableRow = {

        /* ========= PRIMARY ========= */
        returnId:
          obj['Return ID'] ||
          `RET-${String(this.tableData.length + i + 1).padStart(3, '0')}`,
        returnNumber: obj['Return Number'] || '',

        /* ========= REFERENCES ========= */
        allocationId: obj['Allocation ID'] || '',
        employeeId: obj['Employee ID'] || '',
        departmentId: obj['Department ID'] || '',
        location: obj['Location'] || '',

        /* ========= ASSET ========= */
        assetId: obj['Asset ID'] || '',
        assetSerialNumber: obj['Serial Number'] || '',

        /* ========= DATES ========= */
        expectedReturnDate:
          obj['Expected Return Date'] || this.getTodayDate(),
        actualReturnDate:
          obj['Actual Return Date'] || this.getTodayDate(),

        /* ========= CONDITION ========= */
        conditionAtReturn: obj['Condition'] || 'Good',
        damageDetails: obj['Damage Details'] || '',

        /* ========= PENALTY ========= */
        penaltyApplicable: obj['Penalty Applicable'] || 'No',
        penaltyAmount: obj['Penalty Amount']
          ? Number(obj['Penalty Amount'])
          : 0,
        reasonForPenalty: obj['Reason'] || '',

        /* ========= VERIFICATION ========= */
        verifiedBy: obj['Verified By'] || '',
        verificationDate:
          obj['Verification Date'] || this.getTodayDate(),

        /* ========= STATUS ========= */
        returnStatus:
          obj['Status'] === 'Inactive' ? 'Inactive' : 'Active',

        /* ========= REMARKS ========= */
        remarks: obj['Remarks'] || '',

        /* ========= AUDIT ========= */
        createdBy: this.loginId || '',
        createdDate: obj['Created Date'] || this.getTodayDate(),
        updatedBy: '',
        updatedDate: this.getTodayDate(),
      };

      this.tableData.push(newRecord);
    });

    /* ================= REFRESH TABLE ================= */

    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();

    this.showToast('Asset Return Excel imported successfully!', 'success');
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
      .map((line) => line.trim())
      .filter((line) => line !== '');

    lines.forEach((line, idx) => {
      const cols = line.split(',').map((c) => c.trim());

      // ✅ Ensure enough columns (now ~20+ fields)
      while (cols.length < 20) cols.push('');

      const newRecord: TableRow = {

        /* ========= PRIMARY ========= */
        returnId:
          cols[0] ||
          `RET-${String(this.tableData.length + idx + 1).padStart(3, '0')}`,
        returnNumber: cols[1] || '',

        /* ========= REFERENCES ========= */
        allocationId: cols[2] || '',
        employeeId: cols[3] || '',
        departmentId: cols[4] || '',
        location: cols[5] || '',

        /* ========= ASSET ========= */
        assetId: cols[6] || '',
        assetSerialNumber: cols[7] || '',

        /* ========= DATES ========= */
        expectedReturnDate: cols[8] || this.getTodayDate(),
        actualReturnDate: cols[9] || this.getTodayDate(),

        /* ========= CONDITION ========= */
        conditionAtReturn: ['Good', 'Damaged', 'Broken'].includes(cols[10])
          ? cols[10]
          : 'Good',
        damageDetails: cols[11] || '',

        /* ========= PENALTY ========= */
        penaltyApplicable: cols[12] === 'Yes' ? 'Yes' : 'No',
        penaltyAmount: cols[13] ? Number(cols[13]) : 0,
        reasonForPenalty: cols[14] || '',

        /* ========= VERIFICATION ========= */
        verifiedBy: cols[15] || '',
        verificationDate: cols[16] || this.getTodayDate(),

        /* ========= STATUS ========= */
        returnStatus: cols[17] === 'Inactive' ? 'Inactive' : 'Active',

        /* ========= REMARKS ========= */
        remarks: cols[18] || '',

        /* ========= AUDIT ========= */
        createdBy: this.loginId || '',
        createdDate: cols[19] || this.getTodayDate(),
        updatedBy: '',
        updatedDate: this.getTodayDate(),
      };

      this.tableData.push(newRecord);
    });

    /* ================= REFRESH TABLE ================= */

    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();

    this.showToast('Asset Return TXT imported successfully!', 'success');
  };

  reader.readAsText(file);
}
  // ---------------- DOCX Parsing (mammoth.js) ----------------

  async readDOCX(file: File) {
  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const arrayBuffer = reader.result as ArrayBuffer;

      /* ================= DOCX → HTML ================= */
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

      const newRecords: TableRow[] = [];

      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return; // skip header

        const cells = Array.from(row.querySelectorAll('td')).map(
          (cell) => cell.textContent?.trim() || '',
        );

        while (cells.length < 20) cells.push('');

        const record: TableRow = {

          /* ========= PRIMARY ========= */
          returnId:
            cells[0] ||
            `RET-${String(
              this.tableData.length + newRecords.length + 1
            ).padStart(3, '0')}`,
          returnNumber: cells[1] || '',

          /* ========= REFERENCES ========= */
          allocationId: cells[2] || '',
          employeeId: cells[3] || '',
          departmentId: cells[4] || '',
          location: cells[5] || '',

          /* ========= ASSET ========= */
          assetId: cells[6] || '',
          assetSerialNumber: cells[7] || '',

          /* ========= DATES ========= */
          expectedReturnDate: cells[8] || this.getTodayDate(),
          actualReturnDate: cells[9] || this.getTodayDate(),

          /* ========= CONDITION ========= */
          conditionAtReturn: ['Good', 'Damaged', 'Broken'].includes(cells[10])
            ? cells[10]
            : 'Good',
          damageDetails: cells[11] || '',

          /* ========= PENALTY ========= */
          penaltyApplicable: cells[12] === 'Yes' ? 'Yes' : 'No',
          penaltyAmount: cells[13] ? Number(cells[13]) : 0,
          reasonForPenalty: cells[14] || '',

          /* ========= VERIFICATION ========= */
          verifiedBy: cells[15] || '',
          verificationDate: cells[16] || this.getTodayDate(),

          /* ========= STATUS ========= */
          returnStatus: cells[17] === 'Inactive' ? 'Inactive' : 'Active',

          /* ========= REMARKS ========= */
          remarks: cells[18] || '',

          /* ========= AUDIT ========= */
          createdBy: this.loginId || '',
          createdDate: cells[19] || this.getTodayDate(),
          updatedBy: '',
          updatedDate: this.getTodayDate(),
        };

        newRecords.push(record);
      });

      /* ================= MERGE DATA ================= */
      this.tableData = [...this.tableData, ...newRecords];
      this.filteredData = [...this.tableData];
      this.currentPage = 1;

      this.cdr.detectChanges();

      this.showToast(
        `${newRecords.length} Asset Return records imported successfully!`,
        'success'
      );
    } catch (error) {
      console.error('DOCX Parse Error:', error);
      this.showToast('Failed to read DOCX file!', 'error');
    }
  };

  reader.readAsArrayBuffer(file);
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
    /* ================= RESET FILTER VALUES ================= */
    this.startDate = '';
    this.endDate = '';
    this.fileType = 'csv';

    this.startDateError = '';
    this.endDateError = '';

    /* ================= RESET FILTERED DATA ================= */
    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    /* ================= RESET DATE INPUTS ================= */
    const startInput = document.getElementById('startDate') as HTMLInputElement;
    const endInput = document.getElementById('endDate') as HTMLInputElement;

    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';

    /* ================= RESET SELECTION ================= */
    this.selectedRows = [];

    this.showToast('Filters reset successfully', 'info');
  }

  // ---------------- Date Parser ----------------
  parseDDMMYYYY(dateStr?: string): Date | null {
    if (!dateStr) return null;

    const parts = dateStr.trim().split('-').map(Number);
    if (parts.length !== 3) return null;

    const [dd, mm, yyyy] = parts;
    const date = new Date(yyyy, mm - 1, dd);

    return isNaN(date.getTime()) ? null : date;
  }

  // ---------------- Bulk Export ----------------
  getFile() {
    /* ================= BASIC VALIDATION ================= */
    if (!this.tableData || this.tableData.length === 0) {
      this.showToast('No data available to export!', 'warning');
      return;
    }

    if (!this.startDate || !this.endDate) {
      this.showToast('Please enter both Start Date and End Date!', 'warning');
      return;
    }

    const start = this.parseDDMMYYYY(this.startDate);
    const end = this.parseDDMMYYYY(this.endDate);

    if (!start || !end) {
      this.showToast('Invalid date format. Use DD-MM-YYYY', 'error');
      return;
    }

    /* ================= FILTER BY DATE RANGE ================= */
    const filteredData: TableRow[] = this.tableData.filter((row) => {
      const rowDate = this.parseDDMMYYYY(row.createdDate);
      if (!rowDate) return false;

      return rowDate >= start && rowDate <= end;
    });

    if (filteredData.length === 0) {
      this.showToast('No records found for selected date range.', 'warning');
      return;
    }

    /* ================= EXPORT ================= */
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
downloadSampleCSV() {

  /* ================= HEADERS ================= */
  const headers = [
    'Return ID',
    'Return Number',

    'Allocation ID',
    'Employee ID',
    'Department ID',
    'Location',

    'Asset ID',
    'Serial Number',

    'Expected Return Date',
    'Actual Return Date',

    'Condition',
    'Damage Details',

    'Penalty Applicable',
    'Penalty Amount',
    'Reason',

    'Verified By',
    'Verification Date',

    'Return Status',
    'Remarks',

    'Created By',
    'Created Date',
    'Updated By',
    'Updated Date',
  ];

  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  /* ================= SAMPLE ROW (🔥 IMPORTANT) ================= */
  const sampleRow = [
    'RET-001',
    'RETNO-001',

    'ALLOC-001',
    'EMP-001',
    'DEP-001',
    'Mumbai',

    'A-1001',
    'SN123456',

    this.getTodayDate(),
    this.getTodayDate(),

    'Good',
    '',

    'No',
    '0',
    '',

    'Admin',
    this.getTodayDate(),

    'Active',
    'No issues',

    this.loginId || 'Admin',
    this.getTodayDate(),
    '',
    '',
  ];

  csvRows.push(sampleRow.join(','));

  /* ================= OPTIONAL: EXISTING DATA ================= */
  this.tableData.forEach((row: TableRow) => {
    const rowData = [
      row.returnId || '',
      row.returnNumber || '',

      row.allocationId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtReturn || '',
      row.damageDetails || '',

      row.penaltyApplicable || '',
      row.penaltyAmount ?? 0,
      row.reasonForPenalty || '',

      row.verifiedBy || '',
      row.verificationDate || '',

      row.returnStatus || '',
      row.remarks || '',

      row.createdBy || '',
      row.createdDate || '',
      row.updatedBy || '',
      row.updatedDate || '',
    ];

    csvRows.push(rowData.join(','));
  });

  /* ================= DOWNLOAD ================= */
  const csvString = '\ufeff' + csvRows.join('\n');

  const blob = new Blob([csvString], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;

  const today = new Date().toISOString().split('T')[0];
  a.download = `Asset_Return_Sample_${today}.csv`;

  a.click();

  window.URL.revokeObjectURL(url);
}
  // ---------------- CSV Export ----------------
exportCSVfile(data: TableRow[]) {
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const csvRows: string[] = [];

  /* ================= HEADER ================= */

  csvRows.push(this.headCompanyName || 'Asset Return Report');
  csvRows.push(`Date:,${formattedDate}`);
  csvRows.push('');

  /* ================= CSV COLUMNS ================= */

  const headers = [
    'Return ID',
    'Return Number',

    'Allocation ID',
    'Employee ID',
    'Department ID',
    'Location',

    'Asset ID',
    'Serial Number',

    'Expected Return Date',
    'Actual Return Date',

    'Condition',
    'Damage Details',

    'Penalty Applicable',
    'Penalty Amount',
    'Reason',

    'Verified By',
    'Verification Date',

    'Status',
    'Remarks',

    'Created By',
    'Created Date',
  ];

  csvRows.push(headers.join(','));

  /* ================= DATA ROWS ================= */

  data.forEach((row: TableRow) => {
    const rowData = [
      row.returnId || '',
      row.returnNumber || '',

      row.allocationId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtReturn || '',
      row.damageDetails || '',

      row.penaltyApplicable || '',
      row.penaltyAmount ?? 0,
      row.reasonForPenalty || '',

      row.verifiedBy || '',
      row.verificationDate || '',

      row.returnStatus || '',
      row.remarks || '',

      row.createdBy || '',
      row.createdDate || '',
    ];

    csvRows.push(
      rowData.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
  });

  /* ================= DOWNLOAD ================= */

  const blob = new Blob([csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Filtered_Asset_Return_Report.csv');
}

  // ---------------- Excel Export ----------------
 exportExcelfile(data: TableRow[]) {
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  /* ================= EXCEL ROW DATA ================= */

  const wsData: any[][] = [
    [this.headCompanyName || 'Asset Return Report'],
    this.userName ? ['User:', this.userName] : [],
    ['Date:', formattedDate],
    [],

    [
      'Return ID',
      'Return Number',

      'Allocation ID',
      'Employee ID',
      'Department ID',
      'Location',

      'Asset ID',
      'Serial Number',

      'Expected Return Date',
      'Actual Return Date',

      'Condition',
      'Damage Details',

      'Penalty Applicable',
      'Penalty Amount',
      'Reason',

      'Verified By',
      'Verification Date',

      'Status',
      'Remarks',

      'Created By',
      'Created Date',
    ],
  ];

  /* ================= DATA ROWS ================= */

  data.forEach((row: TableRow) => {
    wsData.push([
      row.returnId || '',
      row.returnNumber || '',

      row.allocationId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtReturn || '',
      row.damageDetails || '',

      row.penaltyApplicable || '',
      row.penaltyAmount ?? 0,
      row.reasonForPenalty || '',

      row.verifiedBy || '',
      row.verificationDate || '',

      row.returnStatus || '',
      row.remarks || '',

      row.createdBy || '',
      row.createdDate || '',
    ]);
  });

  /* ================= CREATE WORKSHEET ================= */

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  /* ================= COLUMN WIDTH ================= */

  worksheet['!cols'] = [
    { wch: 16 }, // Return ID
    { wch: 18 }, // Return Number

    { wch: 16 }, // Allocation ID
    { wch: 16 }, // Employee ID
    { wch: 18 }, // Department ID
    { wch: 18 }, // Location

    { wch: 14 }, // Asset ID
    { wch: 20 }, // Serial Number

    { wch: 18 }, // Expected Date
    { wch: 18 }, // Actual Date

    { wch: 20 }, // Condition
    { wch: 22 }, // Damage Details

    { wch: 18 }, // Penalty Applicable
    { wch: 16 }, // Penalty Amount
    { wch: 22 }, // Reason

    { wch: 18 }, // Verified By
    { wch: 20 }, // Verification Date

    { wch: 14 }, // Status
    { wch: 22 }, // Remarks

    { wch: 18 }, // Created By
    { wch: 18 }, // Created Date
  ];

  /* ================= CREATE WORKBOOK ================= */

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset Return Report');

  /* ================= DOWNLOAD ================= */

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Filtered_Asset_Return_Report.xlsx');
}
  // ---------------- PDF Export ----------------
exportPDFfile(data: TableRow[]) {
  if (!data || data.length === 0) {
    this.showToast('No data available to export!', 'warning');
    return;
  }

  const doc = new jsPDF('l', 'pt', 'a4'); // Landscape
  const pageWidth = doc.internal.pageSize.getWidth();

  const title = 'Asset Return Report';

  doc.setFontSize(18);
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

  /* ================= SUB HEADER ================= */

  const topY = 70;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.text(this.headCompanyName || 'Asset Return', 40, topY);

  if (this.userName) {
    doc.text(this.userName, 40, topY + 14);
  }

  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 40, topY, {
    align: 'right',
  });

  /* ================= TABLE ================= */

  autoTable(doc, {
    startY: topY + 30,

    head: [
      [
        'Return ID',
        'Return No',

        'Allocation ID',
        'Employee ID',
        'Department ID',
        'Location',

        'Asset ID',
        'Serial No',

        'Expected Date',
        'Actual Date',

        'Condition',
        'Damage',

        'Penalty',
        'Penalty Amt',
        'Reason',

        'Verified By',
        'Verification Date',

        'Status',
        'Remarks',

        'Created By',
        'Created Date',
      ],
    ],

    body: data.map((row: TableRow) => [
      row.returnId || '',
      row.returnNumber || '',

      row.allocationId || '',
      row.employeeId || '',
      row.departmentId || '',
      row.location || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.expectedReturnDate || '',
      row.actualReturnDate || '',

      row.conditionAtReturn || '',
      row.damageDetails || '',

      row.penaltyApplicable || '',
      row.penaltyAmount ?? 0,
      row.reasonForPenalty || '',

      row.verifiedBy || '',
      row.verificationDate || '',

      row.returnStatus || '',
      row.remarks || '',

      row.createdBy || '',
      row.createdDate || '',
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

  /* ================= SAVE ================= */

  doc.save('Filtered_Asset_Return_Report.pdf');
}
}
