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

interface TableRow {
  assetreturnEntryId: string;

  /* ================= RETURN DETAILS ================= */
  assetreturnDate: string; // YYYY-MM-DD (LocalDate → string)
  assetreturnType: string;
  assetreturnStatus: string;

  /* ================= ALLOCATION DETAILS ================= */
  allocationId: string;
  allocationDate: string; // YYYY-MM-DD
  allocationLocation: string;
  /* ================= ASSET DETAILS ================= */
  assetId: string;
  assetName: string;
  assetType: string;
  assetMake: string;
  assetModel: string;
  serialNumber: string;

  /* ================= RETURNED BY DETAILS ================= */
  returnedBy: string;
  department: string;

  assetConditionOnReturn: string;
  workingStatus: 'Working' | 'Not Working';
  inspectionDate: string; // YYYY-MM-DD
  amcStatus: 'Under AMC' | 'AMC Closed' | 'Out of AMC';
  storeLocation: string;

  /* ================= SYSTEM / RECORD STATUS ================= */
  status: 'Active' | 'Inactive';
  loginId: string;
  createdDate: string; // YYYY-MM-DD
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
    this.loadAssetTypes();
    this.loadAssetMakes();
    this.loadAssets();

    this.filteredData = [...this.tableData];
  }

  private initializeForm(): void {
    this.forms = [
      {
        newRecord: {
          assetreturnEntryId: '0',

          assetreturnDate: this.currentDate,
          assetreturnType: 'Asset Return',
          assetreturnStatus: 'Returned',

          allocationId: '',
          allocationDate: this.currentDate,
          allocationLocation: '',

          assetId: '',
          assetName: '',
          assetType: '',
          assetMake: '',
          assetModel: '',
          serialNumber: '',

          returnedBy: 'Employee',
          department: '',

          assetConditionOnReturn: 'Good',
          workingStatus: 'Working',
          inspectionDate: this.currentDate,
          amcStatus: 'Under AMC',
          storeLocation: '',

          status: 'Active',
          loginId: this.loginId,
          createdDate: this.currentDate,
        },
      },
    ];
  }

  get editHeading(): string {
    if (this.isEditMode && this.editIndex !== null) {
      return (
        'Update Asset Return Details (ID: ' +
        this.tableData[this.editIndex].assetreturnEntryId +
        ')'
      );
    }
    return '';
  }
  loadDepartments(): void {
    this.commonService.fetchAllDepartmentByCompany(this.loginId).subscribe({
      next: (res: any[]) => {
        console.log('Department API:', res);

        this.departments = res.map((d: any) => ({
          departmentName: d.departmentName || d.name || d.department,
        }));
      },
      error: (err) => console.error(err),
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

    const asset = this.assetList.find((a) => a.assetId === selectedId);

    if (asset) {
      this.forms[index].newRecord.assetName = asset.assetName;
      this.forms[index].newRecord.assetType = asset.assetType;
      this.forms[index].newRecord.assetMake = asset.assetMake;
      this.forms[index].newRecord.assetModel = asset.assetModel;
      this.forms[index].newRecord.serialNumber = asset.serialNumber;
    }
  }
  loadAssetReturns(): void {
    if (!this.loginId) return;

    this.commonService.fetchAllAssetReturnsByCompany(this.loginId).subscribe({
      next: (res: any) => {
        console.log('🔥 API RESPONSE:', res); // DEBUG

        const list = Array.isArray(res) ? res : res?.data || [];

        this.tableData = list.map((item: any) => ({
          assetreturnEntryId: item.assetreturnEntryId ?? '',

          /* ================= RETURN DETAILS ================= */
          assetreturnDate: item.assetreturnDate ?? '',
          assetreturnType: item.assetreturnType ?? '',
          assetreturnStatus: item.assetreturnStatus ?? '',

          /* ================= ALLOCATION DETAILS ================= */
          allocationId: item.allocationId || item.allocation_id || '',
          allocationDate: item.allocationDate || item.allocation_date || '',
          allocationLocation:
            item.allocationLocation ||
            item.location ||
            item.allocation_location ||
            '',

          /* ================= ASSET DETAILS ================= */
          assetId: item.assetId || item.asset_id || '',
          assetName: item.assetName || item.asset_name || '',
          assetType: item.assetType || item.asset_type || '',
          assetMake: item.assetMake || item.asset_make || '',
          assetModel: item.assetModel || item.asset_model || '',
          serialNumber: item.serialNumber || item.serial_number || '',

          /* ================= RETURNED BY DETAILS ================= */
          returnedBy: item.returnedBy ?? '',
          department: item.department ?? '',

          /* ================= INSPECTION & AMC ================= */
          assetConditionOnReturn: item.assetConditionOnReturn ?? '',
          workingStatus: item.workingStatus ?? 'Working',
          inspectionDate: item.inspectionDate ?? '',
          amcStatus: item.amcStatus ?? 'Under AMC',
          storeLocation: item.storeLocation ?? '',

          /* ================= SYSTEM ================= */
          status: item.status ?? item.recordStatus ?? 'Active',
          loginId: item.loginId ?? this.loginId,
          createdDate: item.createdDate ?? '',
        }));

        console.log('✅ FINAL TABLE DATA:', this.tableData); // DEBUG

        this.filteredData = [...this.tableData];
      },

      error: (err) => {
        console.error('❌ Asset Return API Error:', err);
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
      (row) => row.assetreturnEntryId,
    );

    this.commonService.deleteMultipleAssetReturns(ids).subscribe({
      next: () => {
        // ✅ Remove deleted rows
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.assetreturnEntryId),
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

    // ✅ Correct mapping as per interface
    const exportData = this.filteredData.map((row) => ({
      Return_ID: row.assetreturnEntryId,
      Return_Date: row.assetreturnDate,
      Return_Type: row.assetreturnType,
      Return_Status: row.assetreturnStatus,

      Allocation_ID: row.allocationId,
      Allocation_Date: row.allocationDate,
      Allocation_Location: row.allocationLocation,

      Asset_ID: row.assetId,
      Asset_Name: row.assetName,
      Asset_Type: row.assetType,
      Asset_Make: row.assetMake,
      Asset_Model: row.assetModel,
      Serial_Number: row.serialNumber,

      Returned_By: row.returnedBy,
      Department: row.department,

      Inspection_Date: row.inspectionDate,
      Asset_Condition_On_Return: row.assetConditionOnReturn,
      Working_Status: row.workingStatus,

      AMC_Status: row.amcStatus,
      Store_Location: row.storeLocation,

      Record_Status: row.status,
      Login_Id: row.loginId,
      Created_Date: row.createdDate,
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
<td class="title">Asset Return Report – AMC Call Logging</td>
</tr>
</table>

<table>

<tr>
<th>Return ID</th>
<th>Return Date</th>
<th>Return Type</th>
<th>Return Status</th>
<th>Allocation ID</th>
<th>Allocation Date</th>
<th>Location</th>
<th>Asset ID</th>
<th>Asset Name</th>
<th>Asset Type</th>
<th>Make</th>
<th>Model</th>
<th>Serial Number</th>
<th>Returned By</th>
<th>Department</th>
<th>Inspection Date</th>
<th>Condition</th>
<th>Working Status</th>
<th>AMC Status</th>
<th>Store Location</th>
<th>Status</th>
<th>Created Date</th>
</tr>
`;

    this.filteredData.forEach((row: TableRow) => {
      content += `
<tr>
<td>${row.assetreturnEntryId || ''}</td>
<td>${row.assetreturnDate || ''}</td>
<td>${row.assetreturnType || ''}</td>
<td>${row.assetreturnStatus || ''}</td>

<td>${row.allocationId || ''}</td>
<td>${row.allocationDate || ''}</td>
<td>${row.allocationLocation || ''}</td>

<td>${row.assetId || ''}</td>
<td>${row.assetName || ''}</td>
<td>${row.assetType || ''}</td>
<td>${row.assetMake || ''}</td>
<td>${row.assetModel || ''}</td>
<td>${row.serialNumber || ''}</td>

<td>${row.returnedBy || ''}</td>
<td>${row.department || ''}</td>

<td>${row.inspectionDate || ''}</td>
<td>${row.assetConditionOnReturn || ''}</td>
<td>${row.workingStatus || ''}</td>

<td>${row.amcStatus || ''}</td>
<td>${row.storeLocation || ''}</td>

<td>${row.status || ''}</td>
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

    doc.setFontSize(18);
    doc.text('Asset Return Report – AMC Call Logging', pageWidth / 2, 12, {
      align: 'center',
    });

    /* ================= TABLE ================= */

    autoTable(doc, {
      startY: 20,

      styles: {
        fontSize: 8,
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
          'Return Date',
          'Return Type',
          'Return Status',
          'Allocation ID',
          'Allocation Date',
          'Location',
          'Asset ID',
          'Asset Name',
          'Asset Type',
          'Make',
          'Model',
          'Serial Number',
          'Returned By',
          'Department',
          'Inspection Date',
          'Condition',
          'Working Status',
          'AMC Status',
          'Store Location',
          'Status',
          'Created Date',
        ],
      ],

      body: this.filteredData.map((row: TableRow) => [
        row.assetreturnEntryId || '',
        row.assetreturnDate || '',
        row.assetreturnType || '',
        row.assetreturnStatus || '',

        row.allocationId || '',
        row.allocationDate || '',
        row.allocationLocation || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetMake || '',
        row.assetModel || '',
        row.serialNumber || '',

        row.returnedBy || '',
        row.department || '',

        row.inspectionDate || '',
        row.assetConditionOnReturn || '',
        row.workingStatus || '',

        row.amcStatus || '',
        row.storeLocation || '',

        row.status || '',
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
    /* ================= PRIMARY KEY ================= */
    assetreturnEntryId: '', // backend generated

    /* ================= RETURN DETAILS ================= */
    assetreturnDate: this.getTodayDate(),
    assetreturnType: 'Asset Return',
    assetreturnStatus: 'Returned',

    /* ================= ALLOCATION DETAILS ================= */
    allocationId: '',
    allocationDate: '',
    allocationLocation: '',

    /* ================= ASSET DETAILS ================= */
    assetId: '',
    assetName: '',
    assetType: '',
    assetMake: '',
    assetModel: '',
    serialNumber: '',

    /* ================= RETURNED BY DETAILS ================= */
    returnedBy: 'Employee',
    department: '',

    /* ================= INSPECTION & AMC ================= */
    inspectionDate: '',
    assetConditionOnReturn: 'Good',
    workingStatus: 'Working',
    amcStatus: 'Under AMC',
    storeLocation: '',

    /* ================= SYSTEM / RECORD STATUS ================= */
    status: 'Active',
    loginId: this.loginId || '',
    createdDate: this.getTodayDate(),
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

        // ✅ correct field name
        assetreturnEntryId: '0', // backend generate

        // ✅ correct date field
        createdDate: this.getTodayDate(),

        // (optional but safe)
        loginId: this.loginId || '',
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
        assetreturnDate: formData.assetreturnDate || this.getTodayDate(),
        assetreturnType: 'Asset Return',
        assetreturnStatus: formData.assetreturnStatus || 'Returned',

        allocationId: formData.allocationId || '',
        allocationDate: formData.allocationDate || this.getTodayDate(),
        allocationLocation: formData.allocationLocation || '',

        assetId: formData.assetId || '',
        assetName: formData.assetName || '',
        assetType: formData.assetType || '',
        assetMake: formData.assetMake || '',
        assetModel: formData.assetModel || '',
        serialNumber: formData.serialNumber || '',

        returnedBy: formData.returnedBy || 'Employee',
        department: formData.department || '',

        inspectionDate: formData.inspectionDate || this.getTodayDate(),
        assetConditionOnReturn: formData.assetConditionOnReturn || 'Good',
        workingStatus: formData.workingStatus || 'Working',
        amcStatus: formData.amcStatus || 'Under AMC',
        storeLocation: formData.storeLocation || '',

        status: formData.status || 'Active',

        loginId: this.loginId,

        // ✅ IMPORTANT FIX
        createdDate: formData.createdDate || this.getTodayDate(),
      };

      const assetreturnEntryId =
        this.tableData[this.editIndex].assetreturnEntryId;

      this.commonService
        .updateAssetReturn(assetreturnEntryId, this.loginId, payload)
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
      assetreturnDate: f.newRecord.assetreturnDate || this.getTodayDate(),
      assetreturnType: 'Asset Return',
      assetreturnStatus: f.newRecord.assetreturnStatus || 'Returned',

      allocationId: f.newRecord.allocationId || '',
      allocationDate: f.newRecord.allocationDate || this.getTodayDate(),
      allocationLocation: f.newRecord.allocationLocation || '',

      assetId: f.newRecord.assetId || '',
      assetName: f.newRecord.assetName || '',
      assetType: f.newRecord.assetType || '',
      assetMake: f.newRecord.assetMake || '',
      assetModel: f.newRecord.assetModel || '',
      serialNumber: f.newRecord.serialNumber || '',

      returnedBy: f.newRecord.returnedBy || 'Employee',
      department: f.newRecord.department || '',

      inspectionDate: f.newRecord.inspectionDate || this.getTodayDate(),
      assetConditionOnReturn: f.newRecord.assetConditionOnReturn || 'Good',
      workingStatus: f.newRecord.workingStatus || 'Working',
      amcStatus: f.newRecord.amcStatus || 'Under AMC',
      storeLocation: f.newRecord.storeLocation || '',

      status: f.newRecord.status || 'Active',

      loginId: this.loginId,

      // ✅ IMPORTANT FIX
      createdDate: f.newRecord.createdDate || this.getTodayDate(),
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
          ...this.newRecord,

          // ✅ reset ID for new entry
          assetreturnEntryId: '0',

          // ✅ reset dates properly
          assetreturnDate: this.getTodayDate(),
          createdDate: this.getTodayDate(),

          // ✅ ensure loginId
          loginId: this.loginId || '',
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
    console.log('Edit Row:', row); // 🔥 debug

    this.activeTab = 'newRecord';
    this.isEditMode = true;
    this.editIndex = index;

    this.forms = [
      {
        newRecord: {
          // RETURN
          assetreturnEntryId: row.assetreturnEntryId,
          assetreturnDate: row.assetreturnDate,
          assetreturnType: row.assetreturnType,
          assetreturnStatus: row.assetreturnStatus,

          // ALLOCATION
          allocationId: row.allocationId || '',
          allocationDate: row.allocationDate || this.getTodayDate(),
          allocationLocation: row.allocationLocation || '',

          // ASSET
          assetId: row.assetId || '',
          assetName: row.assetName || '',
          assetType: row.assetType || '',
          assetMake: row.assetMake || '',
          assetModel: row.assetModel || '',
          serialNumber: row.serialNumber || '',

          // RETURNED
          returnedBy: row.returnedBy || 'Employee',
          department: row.department || '',

          // INSPECTION
          inspectionDate: row.inspectionDate || this.getTodayDate(),
          assetConditionOnReturn: row.assetConditionOnReturn || 'Good',
          workingStatus: row.workingStatus || 'Working',

          // AMC
          amcStatus: row.amcStatus || 'Under AMC',
          storeLocation: row.storeLocation || '',

          // SYSTEM
          status: row.status || 'Active',
          loginId: row.loginId,
          createdDate: row.createdDate || this.getTodayDate(),
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
          return 'assetreturnEntryId';

        case 'return date':
          return 'assetreturnDate';

        case 'return status':
          return 'assetreturnStatus';

        case 'allocation id':
          return 'allocationId';

        case 'allocation date':
          return 'allocationDate';

        case 'allocation location':
          return 'allocationLocation';

        case 'asset id':
          return 'assetId';

        case 'asset name':
          return 'assetName';

        case 'asset type':
          return 'assetType';

        case 'make':
          return 'assetMake';

        case 'model':
          return 'assetModel';

        case 'serial number':
          return 'serialNumber';

        case 'returned by':
          return 'returnedBy';

        case 'department':
          return 'department';

        case 'inspection date':
          return 'inspectionDate';

        case 'asset condition on return':
          return 'assetConditionOnReturn';

        case 'working status':
          return 'workingStatus';

        case 'amc status':
          return 'amcStatus';

        case 'store location':
          return 'storeLocation';

        case 'record status':
          return 'status';

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
        /* ================= PRIMARY KEY ================= */
        assetreturnEntryId:
          obj['assetreturnEntryId'] ||
          `RET-${String(this.tableData.length + results.length + 1).padStart(3, '0')}`,

        /* ================= RETURN DETAILS ================= */
        assetreturnDate: obj['assetreturnDate'] || this.getTodayDate(),
        assetreturnType: 'Asset Return',
        assetreturnStatus: obj['assetreturnStatus'] || 'Returned',

        /* ================= ALLOCATION DETAILS ================= */
        allocationId: obj['allocationId'] || '',
        allocationDate: obj['allocationDate'] || '',
        allocationLocation: obj['allocationLocation'] || '',

        /* ================= ASSET DETAILS ================= */
        assetId: obj['assetId'] || '',
        assetName: obj['assetName'] || '',
        assetType: obj['assetType'] || '',
        assetMake: obj['assetMake'] || '',
        assetModel: obj['assetModel'] || '',
        serialNumber: obj['serialNumber'] || '',

        /* ================= RETURNED BY DETAILS ================= */
        returnedBy: obj['returnedBy'] || 'Employee',
        department: obj['department'] || '',

        /* ================= INSPECTION & AMC ================= */
        inspectionDate: obj['inspectionDate'] || '',
        assetConditionOnReturn: obj['assetConditionOnReturn'] || 'Good',
        workingStatus: obj['workingStatus'] || 'Working',
        amcStatus: obj['amcStatus'] || 'Under AMC',
        storeLocation: obj['storeLocation'] || '',

        /* ================= SYSTEM / RECORD STATUS ================= */
        status: obj['status'] || 'Active',
        loginId: this.loginId || '',
        createdDate: obj['createdDate'] || this.getTodayDate(),
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
          /* ================= PRIMARY KEY ================= */
          assetreturnEntryId:
            obj['Return ID'] ||
            `RET-${String(this.tableData.length + i + 1).padStart(3, '0')}`,

          /* ================= RETURN DETAILS ================= */
          assetreturnDate: obj['Return Date'] || this.getTodayDate(),
          assetreturnType: 'Asset Return',
          assetreturnStatus: obj['Return Status'] || 'Returned',

          /* ================= ALLOCATION DETAILS ================= */
          allocationId: obj['Allocation ID'] || '',
          allocationDate: obj['Allocation Date'] || '',
          allocationLocation: obj['Allocation Location'] || '',

          /* ================= ASSET DETAILS ================= */
          assetId: obj['Asset ID'] || '',
          assetName: obj['Asset Name'] || '',
          assetType: obj['Asset Type'] || '',
          assetMake: obj['Make'] || '',
          assetModel: obj['Model'] || '',
          serialNumber: obj['Serial Number'] || '',

          /* ================= RETURNED BY ================= */
          returnedBy: obj['Returned By'] || 'Employee',
          department: obj['Department'] || '',

          /* ================= INSPECTION ================= */
          inspectionDate: obj['Inspection Date'] || '',
          assetConditionOnReturn: obj['Asset Condition On Return'] || 'Good',

          workingStatus:
            obj['Working Status'] === 'Not Working' ? 'Not Working' : 'Working',

          /* ================= AMC ================= */
          amcStatus: ['Under AMC', 'AMC Closed', 'Out of AMC'].includes(
            obj['AMC Status'],
          )
            ? obj['AMC Status']
            : 'Under AMC',

          storeLocation: obj['Store Location'] || '',

          /* ================= SYSTEM ================= */
          status: obj['Record Status'] === 'Inactive' ? 'Inactive' : 'Active',
          loginId: this.loginId || '',
          createdDate: obj['Created Date'] || this.getTodayDate(),
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

        // ✅ Ensure enough columns (now 22 fields)
        while (cols.length < 22) cols.push('');

        const newRecord: TableRow = {
          /* ================= PRIMARY KEY ================= */
          assetreturnEntryId:
            cols[0] ||
            `RET-${String(this.tableData.length + idx + 1).padStart(3, '0')}`,

          /* ================= RETURN DETAILS ================= */
          assetreturnDate: cols[1] || this.getTodayDate(),
          assetreturnType: 'Asset Return',
          assetreturnStatus: cols[2] || 'Returned',

          /* ================= ALLOCATION DETAILS ================= */
          allocationId: cols[3] || '',
          allocationDate: cols[4] || '',
          allocationLocation: cols[5] || '',

          /* ================= ASSET DETAILS ================= */
          assetId: cols[6] || '',
          assetName: cols[7] || '',
          assetType: cols[8] || '',
          assetMake: cols[9] || '',
          assetModel: cols[10] || '',
          serialNumber: cols[11] || '',

          /* ================= RETURNED BY ================= */
          returnedBy: cols[12] === 'Client' ? 'Client' : 'Employee',
          department: cols[13] || '',

          /* ================= INSPECTION ================= */
          inspectionDate: cols[14] || '',
          assetConditionOnReturn: ['Good', 'Damaged', 'Broken'].includes(
            cols[15],
          )
            ? cols[15]
            : 'Good',

          workingStatus: cols[16] === 'Not Working' ? 'Not Working' : 'Working',

          /* ================= AMC ================= */
          amcStatus: ['Under AMC', 'AMC Closed', 'Out of AMC'].includes(
            cols[17],
          )
            ? (cols[17] as 'Under AMC' | 'AMC Closed' | 'Out of AMC')
            : 'Under AMC',
          storeLocation: cols[18] || '',

          /* ================= SYSTEM ================= */
          status: cols[19] === 'Inactive' ? 'Inactive' : 'Active',
          loginId: this.loginId || '',
          createdDate: cols[20] || this.getTodayDate(),
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
          if (rowIndex === 0) return;

          const cells = Array.from(row.querySelectorAll('td')).map(
            (cell) => cell.textContent?.trim() || '',
          );

          while (cells.length < 21) cells.push('');

          const record: TableRow = {
            /* ================= PRIMARY KEY ================= */
            assetreturnEntryId:
              cells[0] ||
              `RET-${String(
                this.tableData.length + newRecords.length + 1,
              ).padStart(3, '0')}`,

            /* ================= RETURN DETAILS ================= */
            assetreturnDate: cells[1] || this.getTodayDate(),
            assetreturnType: 'Asset Return',
            assetreturnStatus: cells[2] || 'Returned',

            /* ================= ALLOCATION ================= */
            allocationId: cells[3] || '',
            allocationDate: cells[4] || '',
            allocationLocation: cells[5] || '',

            /* ================= ASSET ================= */
            assetId: cells[6] || '',
            assetName: cells[7] || '',
            assetType: cells[8] || '',
            assetMake: cells[9] || '',
            assetModel: cells[10] || '',
            serialNumber: cells[11] || '',

            /* ================= RETURNED BY ================= */
            returnedBy: cells[12] === 'Client' ? 'Client' : 'Employee',
            department: cells[13] || '',

            /* ================= INSPECTION ================= */
            inspectionDate: cells[14] || '',
            assetConditionOnReturn: ['Good', 'Damaged', 'Broken'].includes(
              cells[15],
            )
              ? (cells[15] as 'Good' | 'Damaged' | 'Broken')
              : 'Good',

            workingStatus:
              cells[16] === 'Not Working' ? 'Not Working' : 'Working',

            /* ================= AMC ================= */
            amcStatus: ['Under AMC', 'AMC Closed', 'Out of AMC'].includes(
              cells[17],
            )
              ? (cells[17] as 'Under AMC' | 'AMC Closed' | 'Out of AMC')
              : 'Under AMC',

            /* ✅ MISSING FIELD FIX */
            storeLocation: cells[18] || '',

            /* ================= SYSTEM ================= */
            status: cells[19] === 'Inactive' ? 'Inactive' : 'Active',
            loginId: this.loginId || '',
            createdDate: cells[20] || this.getTodayDate(),
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
          'success',
        );
      } catch (error) {
        console.error('DOCX Parse Error:', error);
        this.showToast('Failed to read DOCX file!', 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  }
  downloadSampleCSV() {
    if (!this.tableData || this.tableData.length === 0) {
      this.showToast('No data available to download!', 'warning');
      return;
    }

    /* ================= CSV HEADERS ================= */

    const headers = [
      'Return ID',
      'Return Date',
      'Return Status',

      'Allocation ID',
      'Allocation Date',
      'Allocation Location',

      'Asset ID',
      'Asset Name',
      'Asset Type',
      'Make',
      'Model',
      'Serial Number',

      'Returned By',
      'Department',

      'Inspection Date',
      'Asset Condition On Return',
      'Working Status',

      'AMC Status',
      'Store Location',

      'Record Status',
      'Login ID',
      'Created Date',
    ];

    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.join(','));

    /* ================= DATA ROWS ================= */

    this.tableData.forEach((row: TableRow) => {
      const rowData = [
        row.assetreturnEntryId || '',
        row.assetreturnDate || '',
        row.assetreturnStatus || '',

        row.allocationId || '',
        row.allocationDate || '',
        row.allocationLocation || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetMake || '',
        row.assetModel || '',
        row.serialNumber || '',

        row.returnedBy || '',
        row.department || '',

        row.inspectionDate || '',
        row.assetConditionOnReturn || '',
        row.workingStatus || '',

        row.amcStatus || '',
        row.storeLocation || '',

        row.status || '',
        row.loginId || '',
        row.createdDate || '',
      ];

      // Escape commas safely
      csvRows.push(
        rowData.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','),
      );
    });

    /* ================= DOWNLOAD ================= */

    const csvString = csvRows.join('\n');

    const blob = new Blob([csvString], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'Asset_Return_Sample.csv';
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

  // ---------------- CSV Export ----------------
  exportCSVfile(data: TableRow[]) {
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    const csvRows: string[] = [];

    /* ================= HEADER ================= */

    csvRows.push(this.headCompanyName || 'AMC Call Logging');
    csvRows.push(`Date:,${formattedDate}`);
    csvRows.push('');

    /* ================= CSV COLUMNS ================= */

    const headers = [
      'Return ID',
      'Return Date',
      'Return Status',

      'Allocation ID',
      'Allocation Date',
      'Allocation Location',

      'Asset ID',
      'Asset Name',
      'Asset Type',
      'Make',
      'Model',
      'Serial Number',

      'Returned By',
      'Department',

      'Inspection Date',
      'Asset Condition On Return',
      'Working Status',

      'AMC Status',
      'Store Location',

      'Record Status',
      'Login ID',
      'Created Date',
    ];

    csvRows.push(headers.join(','));

    /* ================= DATA ROWS ================= */

    data.forEach((row: TableRow) => {
      const rowData = [
        row.assetreturnEntryId || '',
        row.assetreturnDate || '',
        row.assetreturnStatus || '',

        row.allocationId || '',
        row.allocationDate || '',
        row.allocationLocation || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetMake || '',
        row.assetModel || '',
        row.serialNumber || '',

        row.returnedBy || '',
        row.department || '',

        row.inspectionDate || '',
        row.assetConditionOnReturn || '',
        row.workingStatus || '',

        row.amcStatus || '',
        row.storeLocation || '',

        row.status || '',
        row.loginId || '',
        row.createdDate || '',
      ];

      csvRows.push(
        rowData.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','),
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
      [this.headCompanyName || 'AMC Call Logging'],
      this.userName ? ['Email:', this.userName] : [],
      ['Date:', formattedDate],
      [],

      [
        'Return ID',
        'Return Date',
        'Return Status',

        'Allocation ID',
        'Allocation Date',
        'Allocation Location',

        'Asset ID',
        'Asset Name',
        'Asset Type',
        'Make',
        'Model',
        'Serial Number',

        'Returned By',
        'Department',

        'Inspection Date',
        'Asset Condition On Return',
        'Working Status',

        'AMC Status',
        'Store Location',

        'Record Status',
        'Login ID',
        'Created Date',
      ],
    ];

    /* ================= DATA ROWS ================= */

    data.forEach((row: TableRow) => {
      wsData.push([
        row.assetreturnEntryId || '',
        row.assetreturnDate || '',
        row.assetreturnStatus || '',

        row.allocationId || '',
        row.allocationDate || '',
        row.allocationLocation || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetMake || '',
        row.assetModel || '',
        row.serialNumber || '',

        row.returnedBy || '',
        row.department || '',

        row.inspectionDate || '',
        row.assetConditionOnReturn || '',
        row.workingStatus || '',

        row.amcStatus || '',
        row.storeLocation || '',

        row.status || '',
        row.loginId || '',
        row.createdDate || '',
      ]);
    });

    /* ================= CREATE WORKSHEET ================= */

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    /* ================= COLUMN WIDTH ================= */

    worksheet['!cols'] = [
      { wch: 16 }, // Return ID
      { wch: 14 }, // Return Date
      { wch: 14 }, // Return Status

      { wch: 16 }, // Allocation ID
      { wch: 14 }, // Allocation Date
      { wch: 20 }, // Allocation Location

      { wch: 14 }, // Asset ID
      { wch: 22 }, // Asset Name
      { wch: 16 }, // Asset Type
      { wch: 16 }, // Make
      { wch: 16 }, // Model
      { wch: 20 }, // Serial Number

      { wch: 14 }, // Returned By
      { wch: 18 }, // Department

      { wch: 18 }, // Inspection Date
      { wch: 24 }, // Condition
      { wch: 18 }, // Working Status

      { wch: 18 }, // AMC Status
      { wch: 22 }, // Store Location

      { wch: 14 }, // Record Status
      { wch: 18 }, // Login ID
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

    /* ================= HEADER TITLE ================= */

    const title = 'Asset Return Report – AMC Call Logging';

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

    /* ================= SUB HEADER ================= */

    const topY = 70;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    doc.text(this.headCompanyName || 'AMC Call Logging', 40, topY);

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
          'Return Date',
          'Return Status',

          'Allocation ID',
          'Allocation Date',
          'Location',

          'Asset ID',
          'Asset Name',
          'Asset Type',
          'Make',
          'Model',
          'Serial Number',

          'Returned By',
          'Department',

          'Inspection Date',
          'Condition',
          'Working Status',

          'AMC Status',
          'Store Location',

          'Record Status',
          'Login ID',
          'Created Date',
        ],
      ],

      body: data.map((row: TableRow) => [
        row.assetreturnEntryId || '',
        row.assetreturnDate || '',
        row.assetreturnStatus || '',

        row.allocationId || '',
        row.allocationDate || '',
        row.allocationLocation || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetMake || '',
        row.assetModel || '',
        row.serialNumber || '',

        row.returnedBy || '',
        row.department || '',

        row.inspectionDate || '',
        row.assetConditionOnReturn || '',
        row.workingStatus || '',

        row.amcStatus || '',
        row.storeLocation || '',

        row.status || '',
        row.loginId || '',
        row.createdDate || '',
      ]),

      theme: 'grid',
      tableWidth: 'auto',

      styles: {
        fontSize: 8,
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
