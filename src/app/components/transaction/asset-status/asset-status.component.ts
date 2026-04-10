/*
 **************************************************************************************
 * Program Name  : AssetStatusComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 11, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Asset Status Change module.
 *
 * Description   : This component handles UI operations related to Asset Status Change
 *                 including:
 *                 - Fetch all records based on Login ID
 *                 - Add single/multiple Asset Status Change records
 *                 - Update existing records
 *                 - Delete single/multiple records
 *                 - Search, Sorting, Pagination
 *                 - Bulk Import (CSV, Excel, TXT, DOCX)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *
 * Features      :
 *   - Dynamic form handling (multiple entries)
 *   - Validation handling using NgForm
 *   - File parsing using XLSX, Mammoth
 *   - Export using jsPDF & file-saver
 *   - Toast notifications using ng-angular-popup
 *
 * Endpoints Used:
 *   - GET    /asset-status-change/getAllAssetStatusChangeByLoginId/{prefix}/{year}/{code}
 *   - GET    /asset-status-change/single/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /asset-status-change/saveAll
 *   - PUT    /asset-status-change/update/{prefix}/{year}/{code}/{prefix1}/{year1}/{code1}
 *   - POST   /asset-status-change/delete-multiple-assetStatusChange
 *   - POST   /asset-status-change/import
 *
 * Called From   : Asset Status Change UI (Frontend)
 * Calls To      : CommonService (HTTP APIs)
 * Dependencies  : Angular Forms, XLSX, jsPDF, Mammoth, FileSaver, Toast
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
  assetStatusChangeId: string;
  assetStatusChangeCode: string;

  /* ================= DATES ================= */
  assetStatusCreatedDate: string;
  assetStatusChangeDate: string;

  /* ================= ASSET DETAILS ================= */
  assetId: string;
  assetName: string;
  assetType: string;
  assetSerialNumber: string;

  /* ================= STATUS ================= */
  assetCurrentStatus: string;
  assetNewStatus: string;

  /* ================= REASON ================= */
  assetStatusChangeReason: string;
  assetStatusChangeRemarks?: string;

  /* ================= USER DETAILS ================= */
  assetChangeInitiatedBy: string;
  assetChangeApprovedBy?: string;
  assetStatusChangeAssignedTo: string;

  /* ================= APPROVAL WORKFLOW 🔥 ================= */
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  approvalDate?: string;

  /* ================= REPAIR DETAILS 🔧 ================= */
  assetRepairVendor?: string;
  assetExpectedReturnDate?: string;
  repairCost?: number;

  /* ================= REPLACEMENT DETAILS 🔁 ================= */
  replacementAssetId?: string;
  replacementDate?: string;

  /* ================= SCRAP DETAILS 🗑 ================= */
  scrapReason?: string;
  scrapDate?: string;

  /* ================= MODULE REFERENCES 🔗 ================= */
  callId?: string; // Call Logging reference
  allocationId?: string; // Asset Allocation reference
  returnId?: string; // Asset Return reference
  replacementId?: string; // Replacement reference

  /* ================= AUDIT FIELDS 🔍 ================= */
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;

  /* ================= SYSTEM STATUS ================= */
  assetStatus: 'Active' | 'Inactive';

  /* ================= LOGIN ================= */
  loginId?: string;
}

@Component({
  selector: 'app-asset-status',
  standalone: false,
  templateUrl: './asset-status.component.html',
  styleUrls: ['./asset-status.component.css'],
})
export class AssetStatusComponent {
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
  employees: any[] = [];
  assets: any[] = [];
  allocations: any[] = [];
  calls: any[] = [];
  tableData: TableRow[] = [];
  filteredData: TableRow[] = [];
  todayDate: string = '';
  filteredCalls: any[] = [];
  filteredAllocations: any[] = [];
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
    this.loginId = this.authService.getEmployeeId(); // ✅ correct
    this.userRoles = this.authService.getUserRoles();
    this.date = this.authService.getCurrentDate();

    if (!this.token) {
      this.router.navigate(['/login-page']);
      return;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.currentDate = `${yyyy}-${mm}-${dd}`;

    this.initializeForm();
    this.loadEmployees();
    this.loadAssets();
    this.loadAllocations();
    this.loadCallLogging();
    this.loadAssetStatusChange();
    this.filteredData = [...this.tableData];
    this.todayDate = this.getTodayDate(); // 🔥 important
  }

  private initializeForm(): void {
    this.forms = [
      {
        /* ================= UI BINDING ================= */

        spareEntryCode: '',
        spareEntryDate: this.currentDate || '',

        /* BASIC DETAILS */
        spareEntryType: '',
        spareEntrycallId: '',
        spareEntryassetId: '',
        spareEntryclientName: '',
        spareEntryengineerName: '',
        department: '',

        /* SPARE DETAILS */
        spareEntryCategory: '',
        spareEntryName: '',
        spareEntryCompatibleAssetType: '',

        /* QUANTITY */
        spareEntryquantityUsed: 0,
        spareEntryunit: '',
        spareEntryserialNumber: '',
        spareEntrywarrantyApplicable: '',

        /* COST */
        spareEntryunitCost: 0,
        spareEntrytotalCost: 0,

        /* STOCK */
        spareEntrystockAvailable: 0,
        spareEntrystockAfterEntry: 0,

        /* EXTRA 🔥 */
        spareEntryremarks: '',

        /* APPROVAL 🔥 */
        approvalStatus: 'Pending',
        approvalDate: '',

        /* AUDIT 🔥 */
        createdBy: '',
        createdDate: this.currentDate,
        updatedBy: '',
        updatedDate: '',

        /* SYSTEM */
        spareEntryStatus: 'Active',
        loginId: this.loginId,

        /* ================= BACKEND ================= */
        newRecord: {
          spareEntryId: '0',

          spareEntryCode: '',
          spareEntryDate: this.currentDate,
          assetStatusChangeDate: this.currentDate, // 🔥 AUTO TODAY

          /* BASIC */
          spareEntryType: '',
          spareEntrycallId: '',
          spareEntryassetId: '',
          spareEntryclientName: '',
          spareEntryengineerName: '',
          department: '',

          /* SPARE */
          spareEntryCategory: '',
          spareEntryName: '',
          spareEntryCompatibleAssetType: '',

          /* QUANTITY */
          spareEntryquantityUsed: 0,
          spareEntryunit: '',
          spareEntryserialNumber: '',
          spareEntrywarrantyApplicable: '',

          /* COST */
          spareEntryunitCost: 0,
          spareEntrytotalCost: 0,

          /* STOCK */
          spareEntrystockAvailable: 0,
          spareEntrystockAfterEntry: 0,

          /* EXTRA */
          spareEntryremarks: '',

          /* APPROVAL 🔥 */
          approvalStatus: 'Pending',
          approvalDate: '',

          /* AUDIT 🔥 */
          createdBy: '',
          createdDate: this.currentDate,
          updatedBy: '',
          updatedDate: '',

          /* SYSTEM */
          spareEntryStatus: 'Active',
          loginId: this.loginId,
        },
      },
    ];
  }
  loadAssetStatusChange(): void {
    if (!this.loginId) {
      console.warn('Login ID missing');
      return;
    }

    this.loading = true;

    this.commonService
      .fetchAllAssetStatusChangeByCompany(this.loginId)
      .subscribe({
        next: (res: TableRow[]) => {
          // 🔥 SAFE MAPPING (important for optional fields)
          this.tableData = (res || []).map(
            (r: TableRow): TableRow => ({
              ...r,

              approvalStatus: r.approvalStatus || 'Pending',
              assetStatus: r.assetStatus || 'Active',

              assetStatusChangeRemarks: r.assetStatusChangeRemarks || '',
              assetRepairVendor: r.assetRepairVendor || '',
              assetExpectedReturnDate: r.assetExpectedReturnDate || '',

              // 🔥 FINAL FIX (NO null, STRICT TYPE)
              repairCost:
                typeof r.repairCost === 'number' ? r.repairCost : undefined,

              replacementAssetId: r.replacementAssetId || '',
              replacementDate: r.replacementDate || '',

              scrapReason: r.scrapReason || '',
              scrapDate: r.scrapDate || '',

              callId: r.callId || '',
              allocationId: r.allocationId || '',
              returnId: r.returnId || '',
              replacementId: r.replacementId || '',

              createdBy: r.createdBy || '',
              createdDate: r.createdDate || '',
              updatedBy: r.updatedBy || '',
              updatedDate: r.updatedDate || '',
            }),
          );

          this.filteredData = [...this.tableData];
          this.loading = false;
        },

        error: (err) => {
          console.error('API Error:', err);
          this.loading = false;

          this.toast.danger(
            'Failed to load Asset Status Change data!',
            'ERROR',
            4000,
          );
        },
      });
  }
  loadEmployees(): void {
    if (!this.loginId) return;

    this.commonService.fetchAllEmployeeByLoginId(this.loginId).subscribe({
      next: (res: any[]) => {
        this.employees = res || [];
      },
      error: (err) => {
        console.error('Employee Load Error:', err);
      },
    });
  }
  loadAssets(): void {
    if (!this.loginId) return;

    this.commonService.fetchAssetByLoginId(this.loginId).subscribe({
      next: (res: any[]) => {
        this.assets = res || [];
      },
      error: (err) => {
        console.error('Asset Load Error:', err);
      },
    });
  }

  loadAllocations(): void {
    if (!this.loginId) return;

    this.commonService
      .fetchAllAssetAllocationsByCompany(this.loginId)
      .subscribe({
        next: (res: any[]) => {
          this.allocations = res || [];
        },
        error: (err) => {
          console.error('Allocation Load Error:', err);
        },
      });
  }
  loadCallLogging(): void {
    if (!this.loginId) return;

    this.commonService.fetchAllCallLoggingByLoginId(this.loginId).subscribe({
      next: (res: any[]) => {
        this.calls = res || [];
      },
      error: (err) => {
        console.error('Call Logging Error:', err);
      },
    });
  }
  onAssetChange(index: number) {
    const assetId = this.forms[index].newRecord.assetId;

    const asset = this.assets.find((a) => a.assetId === assetId);

    if (asset) {
      this.forms[index].newRecord.assetName = asset.assetName;
      this.forms[index].newRecord.assetType = asset.assetType;
      this.forms[index].newRecord.assetSerialNumber = asset.assetSerialNumber;
      this.forms[index].newRecord.assetCurrentStatus = asset.assetStatus;
    }
  }
  onAssetSelect(assetId: string, index: number) {
    const form = this.forms[index].newRecord;

    console.log('SELECTED ASSET:', assetId);
    console.log('CALLS DATA:', this.calls);
    console.log('ALLOCATIONS DATA:', this.allocations);

    // 🔥 Asset details fill
    const asset = this.assets.find((a) => a.assetId === assetId);

    if (asset) {
      form.assetName = asset.assetName;
      form.assetType = asset.assetType;
      form.assetSerialNumber = asset.assetSerialNumber;
      form.assetCurrentStatus = asset.assetStatus;

      form.assetChangeInitiatedBy = this.userName;
      form.assetChangeApprovedBy = this.userName;
      form.assetStatusCreatedDate = asset.createdDate || this.getTodayDate();

      form.assetStatusChangeDate = this.getTodayDate(); // optional
    }

    // 🔥 RESET
    form.callId = '';
    form.allocationId = '';

    // 🔥 ✅ CORRECT FILTER (NO JSON)
    this.filteredCalls = this.calls.filter((c) => c.assetId === assetId);

    this.filteredAllocations = this.allocations.filter(
      (a) => a.assetallocationAssetId === assetId,
    );

    // 🔥 AUTO SELECT
    if (this.filteredCalls.length > 0) {
      form.callId = this.filteredCalls[0].callLogId;
    }

    if (this.filteredAllocations.length > 0) {
      form.allocationId = this.filteredAllocations[0].assetallocationId;
    }

    console.log('FILTERED CALLS:', this.filteredCalls);
    console.log('FILTERED ALLOCATIONS:', this.filteredAllocations);
  }
  onStatusChange(i: number) {
    const r = this.forms[i].newRecord;

    if (r.assetNewStatus !== 'Under Repair') {
      r.assetRepairVendor = '';
      r.assetExpectedReturnDate = '';
      r.repairCost = undefined;
    }

    if (r.assetNewStatus !== 'Replaced') {
      r.replacementAssetId = '';
      r.replacementDate = '';
    }

    if (r.assetNewStatus !== 'Scrapped') {
      r.scrapReason = '';
      r.scrapDate = '';
    }
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

  // onStatusChange(i: number) {
  //   const r = this.forms[i].newRecord;

  //   if (r.newStatus !== 'Under Repair') {
  //     r.repairVendor = '';
  //     r.expectedReturnDate = '';
  //   }
  //   if (r.newStatus !== 'Replaced') {
  //     r.replacementReference = '';
  //   }
  //   if (r.newStatus !== 'Scrapped') {
  //     r.scrapReference = '';
  //     r.disposalDate = '';
  //   }
  // }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }

  //search filter
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
  deleteSelectedRows(): void {
    if (!this.selectedRows || this.selectedRows.length === 0) {
      this.toast.danger('No records selected to delete!', '', 4000);
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${this.selectedRows.length} record(s)?`,
    );
    if (!confirmed) return;

    this.loading = true;

    // 🔥 Collect valid IDs safely
    const ids: string[] = this.selectedRows
      .map((row) => row.assetStatusChangeId)
      .filter((id) => !!id);

    if (ids.length === 0) {
      this.toast.warning('Invalid records selected!', '', 3000);
      this.loading = false;
      return;
    }

    this.commonService.deleteMultipleAssetStatusChange(ids).subscribe({
      next: () => {
        // 🔥 Remove deleted rows (safe)
        const idSet = new Set(ids);

        this.tableData = this.tableData.filter(
          (row) => !idSet.has(row.assetStatusChangeId),
        );

        this.filteredData = [...this.tableData];

        // 🔥 Reset selection
        this.selectedRows = [];
        this.currentPage = 1;

        // 🔥 Optional reload (avoid duplicate API if not needed)
        // this.loadAssetStatusChange();

        this.toast.success(
          `${ids.length} record(s) deleted successfully!`,
          'SUCCESS',
          4000,
        );

        this.loading = false;
      },

      error: (err) => {
        console.error('Delete Error:', err);

        this.toast.danger(
          'Failed to delete records! Please try again.',
          'ERROR',
          4000,
        );

        this.loading = false;
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
      this.toast.warning('No data available to export!', '', 3000);
      return;
    }

    const exportData = this.tableData.map((row: TableRow) => ({
      /* ================= PRIMARY ================= */
      Status_Change_ID: row.assetStatusChangeId || '',
      Status_Change_Code: row.assetStatusChangeCode || '',

      /* ================= DATES ================= */
      Created_Date: row.assetStatusCreatedDate || '',
      Change_Date: row.assetStatusChangeDate || '',

      /* ================= ASSET ================= */
      Asset_ID: row.assetId || '',
      Asset_Name: row.assetName || '',
      Asset_Type: row.assetType || '',
      Serial_Number: row.assetSerialNumber || '',

      /* ================= STATUS ================= */
      Current_Status: row.assetCurrentStatus || '',
      New_Status: row.assetNewStatus || '',

      /* ================= REASON ================= */
      Change_Reason: row.assetStatusChangeReason || '',
      Remarks: row.assetStatusChangeRemarks || '',

      /* ================= USERS ================= */
      Initiated_By: row.assetChangeInitiatedBy || '',
      Approved_By: row.assetChangeApprovedBy || '',
      Assigned_To: row.assetStatusChangeAssignedTo || '',

      /* ================= APPROVAL ================= */
      Approval_Status: row.approvalStatus || '',
      Approval_Date: row.approvalDate || '',

      /* ================= REPAIR ================= */
      Repair_Vendor: row.assetRepairVendor || '',
      Expected_Return_Date: row.assetExpectedReturnDate || '',
      Repair_Cost: row.repairCost ?? '',

      /* ================= REPLACEMENT ================= */
      Replacement_Asset_ID: row.replacementAssetId || '',
      Replacement_Date: row.replacementDate || '',

      /* ================= SCRAP ================= */
      Scrap_Reason: row.scrapReason || '',
      Scrap_Date: row.scrapDate || '',

      /* ================= REFERENCES ================= */
      Call_ID: row.callId || '',
      Allocation_ID: row.allocationId || '',
      Return_ID: row.returnId || '',
      Replacement_ID: row.replacementId || '',

      /* ================= AUDIT ================= */
      Created_By: row.createdBy || '',
      Created_Date_Audit: row.createdDate || '',
      Updated_By: row.updatedBy || '',
      Updated_Date: row.updatedDate || '',

      /* ================= SYSTEM ================= */
      Record_Status: row.assetStatus || '',

      /* ================= LOGIN ================= */
      Login_ID: row.loginId || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 🔥 Auto column width (dynamic)
    worksheet['!cols'] = Object.keys(exportData[0]).map((key) => ({
      wch: Math.max(key.length + 2, 20),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset_Status_Change');

    // 🔥 Dynamic file name with date
    const today = new Date().toISOString().split('T')[0];

    XLSX.writeFile(workbook, `Asset_Status_Change_Report_${today}.xlsx`);
  }
  exportDoc() {
    if (!this.tableData || this.tableData.length === 0) {
      this.toast.warning('No data available to export!', '', 3000);
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-GB');

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

body {
  font-family: Arial, sans-serif;
}

table {
  border-collapse: collapse;
  width: 100%;
  table-layout: fixed;
  font-size: 10px;
  word-wrap: break-word;
}

th, td {
  border: 1px solid #000;
  padding: 5px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #d9e1f2;
  font-weight: bold;
  text-align: center;
}

.header-table {
  width: 100%;
  margin-bottom: 15px;
}

.header-table td {
  border: none;
  padding: 0;
}

.title {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
}

.sub-header {
  font-size: 12px;
}

</style>
</head>

<body>
<div class="WordSection1">

<!-- HEADER -->
<table class="header-table">
<tr>
<td class="sub-header">Date: ${currentDate}</td>
<td class="sub-header" style="text-align:right;">Total Records: ${this.tableData.length}</td>
</tr>
<tr>
<td colspan="2" class="title">Asset Status Change Report</td>
</tr>
</table>

<!-- TABLE -->
<table>
<tr>
<th>ID</th>
<th>Code</th>
<th>Created</th>
<th>Change Date</th>

<th>Asset ID</th>
<th>Asset Name</th>
<th>Type</th>
<th>Serial</th>

<th>Current</th>
<th>New</th>

<th>Reason</th>

<th>Initiated</th>
<th>Approved</th>
<th>Assigned</th>

<th>Approval Status</th>

<th>Vendor</th>
<th>Return Date</th>
<th>Cost</th>

<th>Replacement</th>
<th>Scrap</th>

<th>Remarks</th>
<th>Status</th>
</tr>
`;

    this.tableData.forEach((row: TableRow) => {
      content += `
<tr>
<td>${row.assetStatusChangeId || ''}</td>
<td>${row.assetStatusChangeCode || ''}</td>
<td>${row.assetStatusCreatedDate || ''}</td>
<td>${row.assetStatusChangeDate || ''}</td>

<td>${row.assetId || ''}</td>
<td>${row.assetName || ''}</td>
<td>${row.assetType || ''}</td>
<td>${row.assetSerialNumber || ''}</td>

<td>${row.assetCurrentStatus || ''}</td>
<td>${row.assetNewStatus || ''}</td>

<td>${row.assetStatusChangeReason || ''}</td>

<td>${row.assetChangeInitiatedBy || ''}</td>
<td>${row.assetChangeApprovedBy || ''}</td>
<td>${row.assetStatusChangeAssignedTo || ''}</td>

<td>${row.approvalStatus || ''}</td>

<td>${row.assetRepairVendor || ''}</td>
<td>${row.assetExpectedReturnDate || ''}</td>
<td>${row.repairCost ?? ''}</td>

<td>${row.replacementAssetId || ''}</td>
<td>${row.scrapReason || ''}</td>

<td>${row.assetStatusChangeRemarks || ''}</td>
<td>${row.assetStatus || ''}</td>
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

    saveAs(blob, `Asset_Status_Change_Report_${today}.doc`);
  }

  exportPDF() {
    if (!this.tableData || this.tableData.length === 0) {
      this.toast.warning('No data available to export!', '', 3000);
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('en-GB');

    /* ================= HEADER ================= */

    // Date (Left)
    doc.setFontSize(10);
    doc.text(`Date: ${currentDate}`, 10, 10);

    // Title (Center)
    doc.setFontSize(18);
    doc.text('Asset Status Change Report', pageWidth / 2, 12, {
      align: 'center',
    });

    // Subheading
    doc.setFontSize(10);
    doc.text(`Total Records: ${this.tableData.length}`, pageWidth - 60, 10);

    /* ================= TABLE ================= */

    autoTable(doc, {
      startY: 18,

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
        fontSize: 8,
      },

      alternateRowStyles: {
        fillColor: [245, 245, 245], // zebra striping
      },

      tableWidth: 'auto',

      head: [
        [
          'ID',
          'Code',
          'Created',
          'Change Date',

          'Asset ID',
          'Asset Name',
          'Type',
          'Serial',

          'Current',
          'New',

          'Reason',

          'Initiated',
          'Approved',
          'Assigned',

          'Approval Status',

          'Vendor',
          'Return Date',
          'Cost',

          'Replacement',
          'Scrap',

          'Remarks',
          'Status',
        ],
      ],

      body: this.tableData.map((row: TableRow) => [
        row.assetStatusChangeId || '',
        row.assetStatusChangeCode || '',
        row.assetStatusCreatedDate || '',
        row.assetStatusChangeDate || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetSerialNumber || '',

        row.assetCurrentStatus || '',
        row.assetNewStatus || '',

        row.assetStatusChangeReason || '',

        row.assetChangeInitiatedBy || '',
        row.assetChangeApprovedBy || '',
        row.assetStatusChangeAssignedTo || '',

        row.approvalStatus || '',

        row.assetRepairVendor || '',
        row.assetExpectedReturnDate || '',
        row.repairCost ?? '',

        row.replacementAssetId || '',
        row.scrapReason || '',

        row.assetStatusChangeRemarks || '',
        row.assetStatus || '',
      ]),

      didDrawCell: (data) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
      },
    });

    /* ================= FOOTER ================= */

    const pageCount = (doc as any).internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 30,
        doc.internal.pageSize.height - 5,
      );
    }

    /* ================= SAVE ================= */

    const today = new Date().toISOString().split('T')[0];
    doc.save(`Asset_Status_Change_Report_${today}.pdf`);
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
  

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
  getTodayDate(): string {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();

    return `${y}-${m}-${d}`; // ✅ FIXED
  }
  newRecord: TableRow = {
    /* ================= PRIMARY ================= */
    assetStatusChangeId: '0', // auto-generate
    assetStatusChangeCode: '',

    /* ================= DATES ================= */
    assetStatusCreatedDate: this.getTodayDate(),
    assetStatusChangeDate: this.getTodayDate(),

    /* ================= ASSET ================= */
    assetId: '',
    assetName: '',
    assetType: '',
    assetSerialNumber: '',

    /* ================= STATUS ================= */
    assetCurrentStatus: '',
    assetNewStatus: '',

    /* ================= REASON ================= */
    assetStatusChangeReason: '',
    assetStatusChangeRemarks: '',

    /* ================= USERS ================= */
    assetChangeInitiatedBy: '',
    assetChangeApprovedBy: '',
    assetStatusChangeAssignedTo: '',

    /* ================= APPROVAL ================= */
    approvalStatus: 'Pending',
    approvalDate: '',

    /* ================= REPAIR ================= */
    assetRepairVendor: '',
    assetExpectedReturnDate: '',
    repairCost: undefined,

    /* ================= REPLACEMENT ================= */
    replacementAssetId: '',
    replacementDate: '',

    /* ================= SCRAP ================= */
    scrapReason: '',
    scrapDate: '',

    /* ================= REFERENCES ================= */
    callId: '',
    allocationId: '',
    returnId: '',
    replacementId: '',

    /* ================= AUDIT ================= */
    createdBy: '',
    createdDate: this.getTodayDate(),
    updatedBy: '',
    updatedDate: '',

    /* ================= SYSTEM ================= */
    assetStatus: 'Active',

    /* ================= LOGIN ================= */
    loginId: this.loginId,
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
    if (this.isEditMode) return; // ❌ edit mode मध्ये add नको

    const newEntry: TableRow = {
      ...this.newRecord,

      /* ================= DEFAULTS ================= */
      assetStatusChangeId: '0',
      assetStatusCreatedDate: this.getTodayDate(),

      // ✅ FIXED (no function call)
      assetStatusChangeDate: this.getTodayDate(),

      approvalStatus: 'Pending',

      /* ================= RESET FIELDS ================= */
      assetId: '',
      assetName: '',
      assetType: '',
      assetSerialNumber: '',

      assetCurrentStatus: '',
      assetNewStatus: '',

      assetStatusChangeReason: '',
      assetStatusChangeRemarks: '',

      // ✅ IMPORTANT (auto set user)
      assetChangeInitiatedBy: this.userName || '',
      assetChangeApprovedBy: '',
      assetStatusChangeAssignedTo: this.userName || '',

      /* ================= REPAIR ================= */
      assetRepairVendor: '',
      assetExpectedReturnDate: '',
      repairCost: undefined,

      /* ================= REPLACEMENT ================= */
      replacementAssetId: '',
      replacementDate: '',

      /* ================= SCRAP ================= */
      scrapReason: '',
      scrapDate: '',

      /* ================= REFERENCES ================= */
      callId: '',
      allocationId: '',
      returnId: '',
      replacementId: '',

      /* ================= AUDIT ================= */
      createdBy: this.userName || '',
      createdDate: this.getTodayDate(),
      updatedBy: '',
      updatedDate: '',

      /* ================= SYSTEM ================= */
      assetStatus: 'Active',

      /* ================= LOGIN ================= */
      loginId: this.loginId,
    };

    this.forms.push({
      newRecord: newEntry,
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

    /* ================= VALIDATION ================= */
    if (form) {
      Object.keys(form.controls).forEach((key) => {
        form.controls[key].markAsTouched();
        form.controls[key].markAsDirty();
      });
    }

    if (form && !form.valid) return;

    /* ================= LOGIN CHECK ================= */
    if (!this.loginId) {
      this.toast.danger('Login ID missing!', 'ERROR', 3000);
      return;
    }

    /* ================= EDIT MODE ================= */
    if (this.isEditMode && this.editIndex !== -1) {
      const r = this.forms[0].newRecord;

      const formData: TableRow = {
        ...r,

        assetStatusChangeDate: r.assetStatusChangeDate || this.getTodayDate(),

        approvalStatus: r.approvalStatus || 'Pending',
        assetStatus: r.assetStatus || 'Active',

        assetStatusChangeAssignedTo:
          r.assetStatusChangeAssignedTo || this.userName,

        loginId: this.loginId,
      };

      // 🔥 STATUS VALIDATION (EDIT)
      if (
        formData.assetNewStatus === 'Under Repair' &&
        !formData.assetRepairVendor
      ) {
        this.toast.danger('Repair vendor required!', 'ERROR', 3000);
        return;
      }

      if (
        formData.assetNewStatus === 'Under Repair' &&
        !formData.assetExpectedReturnDate
      ) {
        this.toast.danger('Expected return date required!', 'ERROR', 3000);
        return;
      }

      if (
        formData.assetNewStatus === 'Replaced' &&
        !formData.replacementAssetId
      ) {
        this.toast.danger('Replacement Asset ID required!', 'ERROR', 3000);
        return;
      }

      if (formData.assetNewStatus === 'Scrapped' && !formData.scrapReason) {
        this.toast.danger('Scrap reason required!', 'ERROR', 3000);
        return;
      }

      const statusChangeId = this.tableData[this.editIndex].assetStatusChangeId;

      console.log('UPDATE DATA:', formData);

      this.commonService
        .updateAssetStatusChange(statusChangeId, this.loginId, formData)
        .subscribe({
          next: (res) => {
            console.log('UPDATE SUCCESS:', res);

            this.toast.success(
              'Asset Status Change updated successfully',
              'SUCCESS',
              4000,
            );

            this.resetAfterSave();
            this.loadAssetStatusChange();
          },

          error: (err) => {
            console.error('UPDATE ERROR:', err);

            this.toast.danger(
              err?.error?.message || 'Update failed!',
              'ERROR',
              4000,
            );
          },
        });

      return;
    }

    /* ================= ADD MODE ================= */

    const payload: TableRow[] = this.forms.map((f) => {
      const r = f.newRecord;

      return {
        ...r,

        assetStatusChangeDate: r.assetStatusChangeDate || this.getTodayDate(),

        approvalStatus: r.approvalStatus || 'Pending',
        assetStatus: r.assetStatus || 'Active',

        assetStatusChangeAssignedTo:
          r.assetStatusChangeAssignedTo || this.userName,

        loginId: this.loginId,
      };
    });

    // 🔥 STATUS VALIDATION (ADD)
    if (
      payload.some(
        (p) => p.assetNewStatus === 'Under Repair' && !p.assetRepairVendor,
      )
    ) {
      this.toast.danger('Repair vendor required!', 'ERROR', 3000);
      return;
    }

    if (
      payload.some(
        (p) =>
          p.assetNewStatus === 'Under Repair' && !p.assetExpectedReturnDate,
      )
    ) {
      this.toast.danger('Expected return date required!', 'ERROR', 3000);
      return;
    }

    if (
      payload.some(
        (p) => p.assetNewStatus === 'Replaced' && !p.replacementAssetId,
      )
    ) {
      this.toast.danger('Replacement Asset ID required!', 'ERROR', 3000);
      return;
    }

    if (
      payload.some((p) => p.assetNewStatus === 'Scrapped' && !p.scrapReason)
    ) {
      this.toast.danger('Scrap reason required!', 'ERROR', 3000);
      return;
    }

    console.log('SAVE PAYLOAD:', payload);

    this.commonService.submitAssetStatusChange(payload).subscribe({
      next: (res) => {
        console.log('SAVE SUCCESS:', res);

        this.toast.success(
          'Asset Status Change record added successfully!',
          'SUCCESS',
          4000,
        );

        this.resetAfterSave();
        this.loadAssetStatusChange();
      },

      error: (err) => {
        console.error('SAVE ERROR:', err);

        this.toast.danger(
          err?.error?.message || 'Backend API Error!',
          'ERROR',
          4000,
        );
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

  // validateByStatus(row: TableRow): boolean {
  //   if (row.newStatus === 'Under Repair') {
  //     return !!row.repairVendor && !!row.expectedReturnDate;
  //   }
  //   if (row.newStatus === 'Replaced') {
  //     return !!row.replacementReference;
  //   }
  //   if (row.newStatus === 'Scrapped') {
  //     return !!row.scrapReference && !!row.disposalDate;
  //   }
  //   return true;
  // }

  // --------------------------
  // CANCEL / RESET FORM
  // --------------------------
  cancelRecord(form?: NgForm) {
    /* ================= RESET FORM UI ================= */
    if (form) {
      form.resetForm();
    }

    /* ================= RESET STATE ================= */
    this.showErrors = false;
    this.isEditMode = false;
    this.editIndex = -1;

    /* ================= RESET FORMS ================= */
    this.forms = [
      {
        newRecord: {
          ...this.newRecord,

          // 🔥 reset important defaults
          assetStatusChangeId: '0',
          assetStatusCreatedDate: this.getTodayDate(),
          assetStatusChangeDate: this.getTodayDate(),

          approvalStatus: 'Pending',

          assetStatus: 'Active',
          loginId: this.loginId,
        },
      },
    ];

    this.activeForm = 0;

    /* ================= OPTIONAL: SWITCH TAB ================= */
    // this.activeTab = 'details';

    /* ================= OPTIONAL: CLEAR SELECTION ================= */
    this.selectedRows = [];

    /* ================= SUCCESS MESSAGE ================= */
    this.toast.info('Form cleared successfully', '', 3000);
  }

  // --------------------------
  // EDIT EXISTING ROW
  // --------------------------
  onEdit(row: TableRow, index: number) {
    this.activeTab = 'newRecord';
    this.isEditMode = true;
    this.editIndex = index;

    /* ================= SAFE COPY (IMPORTANT 🔥) ================= */
    const record: TableRow = {
      ...this.newRecord, // default structure
      ...row, // override with actual data

      // 🔥 fallback defaults (avoid undefined issues)
      approvalStatus: row.approvalStatus || 'Pending',
      assetStatus: row.assetStatus || 'Active',
      loginId: this.loginId,
    };

    /* ================= RESET FORMS ================= */
    this.forms = [
      {
        newRecord: record,
      },
    ];

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
      this.toast.warning('Please select a file first!', '', 3000);
      return;
    }

    /* ================= FILE VALIDATION 🔥 ================= */
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
    ];

    if (!allowedTypes.includes(this.selectedFile.type)) {
      this.toast.danger('Invalid file type! Upload Excel/CSV only.', '', 4000);
      return;
    }

    /* ================= FILE SIZE CHECK 🔥 ================= */
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (this.selectedFile.size > maxSize) {
      this.toast.warning('File size should be less than 5MB!', '', 4000);
      return;
    }

    this.loading = true;

    this.commonService
      .uploadAssetStatusChangeExcel(this.selectedFile)
      .subscribe({
        next: (res: any) => {
          this.loading = false;

          /* ================= SAFE RESPONSE HANDLE 🔥 ================= */
          let count = 0;

          if (Array.isArray(res)) {
            count = res.length;
          } else if (res?.count) {
            count = res.count;
          } else {
            count = 0;
          }

          /* ================= REFRESH DATA ================= */
          this.loadAssetStatusChange();

          /* ================= RESET FILE INPUT 🔥 ================= */
          this.selectedFile = null;

          this.toast.success(
            `${count} record(s) imported successfully!`,
            'SUCCESS',
            4000,
          );
        },

        error: (err) => {
          this.loading = false;

          console.error('Upload Error:', err);

          /* ================= ERROR MESSAGE HANDLE 🔥 ================= */
          const msg =
            err?.error?.message ||
            err?.message ||
            'Import failed. Please check file format.';

          this.toast.danger(msg, 'ERROR', 4000);
        },
      });
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
        case 'status change id':
          return 'assetStatusChangeId';
        case 'status change code':
          return 'assetStatusChangeCode';

        case 'created date':
          return 'assetStatusCreatedDate';
        case 'change date':
          return 'assetStatusChangeDate';

        case 'asset id':
          return 'assetId';
        case 'asset name':
          return 'assetName';
        case 'asset type':
          return 'assetType';

        case 'serial number':
        case 'serial no':
          return 'assetSerialNumber';

        case 'current status':
          return 'assetCurrentStatus';
        case 'new status':
          return 'assetNewStatus';

        case 'change reason':
          return 'assetStatusChangeReason';
        case 'remarks':
          return 'assetStatusChangeRemarks';

        case 'initiated by':
          return 'assetChangeInitiatedBy';
        case 'approved by':
          return 'assetChangeApprovedBy';
        case 'assigned to':
          return 'assetStatusChangeAssignedTo';

        case 'approval status':
          return 'approvalStatus';
        case 'approval date':
          return 'approvalDate';

        case 'repair vendor':
          return 'assetRepairVendor';
        case 'expected return date':
          return 'assetExpectedReturnDate';
        case 'repair cost':
          return 'repairCost';

        case 'replacement asset id':
          return 'replacementAssetId';
        case 'replacement date':
          return 'replacementDate';

        case 'scrap reason':
          return 'scrapReason';
        case 'scrap date':
          return 'scrapDate';

        case 'call id':
          return 'callId';
        case 'allocation id':
          return 'allocationId';
        case 'return id':
          return 'returnId';
        case 'replacement id':
          return 'replacementId';

        case 'created by':
          return 'createdBy';
        case 'created date audit':
          return 'createdDate';
        case 'updated by':
          return 'updatedBy';
        case 'updated date':
          return 'updatedDate';

        case 'status':
          return 'assetStatus';

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
        /* PRIMARY */
        assetStatusChangeId:
          obj.assetStatusChangeId || `ASC-${this.tableData.length + i}`,
        assetStatusChangeCode: obj.assetStatusChangeCode || '',

        /* DATES */
        assetStatusCreatedDate:
          obj.assetStatusCreatedDate || this.getTodayDate(),
        assetStatusChangeDate: obj.assetStatusChangeDate || this.getTodayDate(),

        /* ASSET */
        assetId: obj.assetId || '',
        assetName: obj.assetName || '',
        assetType: obj.assetType || '',
        assetSerialNumber: obj.assetSerialNumber || '',

        /* STATUS */
        assetCurrentStatus: obj.assetCurrentStatus || '',
        assetNewStatus: obj.assetNewStatus || '',

        /* REASON */
        assetStatusChangeReason: obj.assetStatusChangeReason || '',
        assetStatusChangeRemarks: obj.assetStatusChangeRemarks || '',

        /* USERS */
        assetChangeInitiatedBy: obj.assetChangeInitiatedBy || '',
        assetChangeApprovedBy: obj.assetChangeApprovedBy || '',
        assetStatusChangeAssignedTo: obj.assetStatusChangeAssignedTo || '',

        /* APPROVAL */
        approvalStatus: obj.approvalStatus || 'Pending',
        approvalDate: obj.approvalDate || '',

        /* REPAIR */
        assetRepairVendor: obj.assetRepairVendor || '',
        assetExpectedReturnDate: obj.assetExpectedReturnDate || '',
        repairCost: obj.repairCost ? Number(obj.repairCost) : undefined,

        /* REPLACEMENT */
        replacementAssetId: obj.replacementAssetId || '',
        replacementDate: obj.replacementDate || '',

        /* SCRAP */
        scrapReason: obj.scrapReason || '',
        scrapDate: obj.scrapDate || '',

        /* REFERENCES */
        callId: obj.callId || '',
        allocationId: obj.allocationId || '',
        returnId: obj.returnId || '',
        replacementId: obj.replacementId || '',

        /* AUDIT */
        createdBy: obj.createdBy || '',
        createdDate: obj.createdDate || this.getTodayDate(),
        updatedBy: obj.updatedBy || '',
        updatedDate: obj.updatedDate || '',

        /* SYSTEM */
        assetStatus: (obj.assetStatus as 'Active' | 'Inactive') || 'Active',

        /* LOGIN */
        loginId: this.loginId,
      };

      results.push(newRecord);
    }

    /* ================= SAVE ================= */
    this.tableData = [...this.tableData, ...results];
    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();

    this.showToast(
      `${results.length} record(s) imported successfully!`,
      'success',
    );
  }

  // ---------------- Excel Parsing ----------------
  // ---------------- Excel Parsing ----------------
  readExcel(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      const workbook = XLSX.read(reader.result, { type: 'binary' });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!json || json.length === 0) {
        this.showToast('Excel file is empty!', 'warning');
        return;
      }

      const results: TableRow[] = [];

      json.forEach((obj: any, i: number) => {
        const newId = this.tableData.length + i + 1;

        const newRecord: TableRow = {
          /* ================= PRIMARY ================= */
          assetStatusChangeId: obj['Status Change ID'] || `ASC-${newId}`,

          assetStatusChangeCode:
            obj['Status Change Code'] ||
            `ASC-${String(newId).padStart(3, '0')}`,

          /* ================= DATES ================= */
          assetStatusCreatedDate: obj['Created Date'] || this.getTodayDate(),

          assetStatusChangeDate: obj['Change Date'] || this.getTodayDate(),

          /* ================= ASSET ================= */
          assetId: obj['Asset ID'] || '',
          assetName: obj['Asset Name'] || '',
          assetType: obj['Asset Type'] || '',
          assetSerialNumber: obj['Serial Number'] || obj['Serial No'] || '',

          /* ================= STATUS ================= */
          assetCurrentStatus: obj['Current Status'] || '',
          assetNewStatus: obj['New Status'] || '',

          /* ================= REASON ================= */
          assetStatusChangeReason: obj['Change Reason'] || '',
          assetStatusChangeRemarks: obj['Remarks'] || '',

          /* ================= USERS ================= */
          assetChangeInitiatedBy: obj['Initiated By'] || '',
          assetChangeApprovedBy: obj['Approved By'] || '',
          assetStatusChangeAssignedTo: obj['Assigned To'] || '',

          /* ================= APPROVAL ================= */
          approvalStatus: obj['Approval Status'] || 'Pending',
          approvalDate: obj['Approval Date'] || '',

          /* ================= REPAIR ================= */
          assetRepairVendor: obj['Repair Vendor'] || '',
          assetExpectedReturnDate: obj['Expected Return Date'] || '',
          repairCost: obj['Repair Cost']
            ? Number(obj['Repair Cost'])
            : undefined,

          /* ================= REPLACEMENT ================= */
          replacementAssetId: obj['Replacement Asset ID'] || '',
          replacementDate: obj['Replacement Date'] || '',

          /* ================= SCRAP ================= */
          scrapReason: obj['Scrap Reason'] || '',
          scrapDate: obj['Scrap Date'] || '',

          /* ================= REFERENCES ================= */
          callId: obj['Call ID'] || '',
          allocationId: obj['Allocation ID'] || '',
          returnId: obj['Return ID'] || '',
          replacementId: obj['Replacement ID'] || '',

          /* ================= AUDIT ================= */
          createdBy: obj['Created By'] || '',
          createdDate: obj['Created Date Audit'] || this.getTodayDate(),
          updatedBy: obj['Updated By'] || '',
          updatedDate: obj['Updated Date'] || '',

          /* ================= SYSTEM ================= */
          assetStatus: (obj['Status'] as 'Active' | 'Inactive') || 'Active',

          /* ================= LOGIN ================= */
          loginId: this.loginId,
        };

        results.push(newRecord);
      });

      /* ================= SAVE ================= */
      this.tableData = [...this.tableData, ...results];
      this.filteredData = [...this.tableData];
      this.currentPage = 1;

      this.cdr.detectChanges();

      this.showToast(
        `${results.length} record(s) imported successfully!`,
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

      if (lines.length === 0) {
        this.showToast('TXT file is empty!', 'warning');
        return;
      }

      const results: TableRow[] = [];

      lines.forEach((line, idx) => {
        const cols = line.split(',').map((c) => c.trim());

        // 🔥 ensure enough columns (now full interface ~30 fields)
        while (cols.length < 30) cols.push('');

        const newId = this.tableData.length + idx + 1;

        const newRecord: TableRow = {
          /* ================= PRIMARY ================= */
          assetStatusChangeId: cols[0] || `ASC-${newId}`,
          assetStatusChangeCode:
            cols[1] || `ASC-${String(newId).padStart(3, '0')}`,

          /* ================= DATES ================= */
          assetStatusCreatedDate: cols[2] || this.getTodayDate(),
          assetStatusChangeDate: cols[3] || this.getTodayDate(),

          /* ================= ASSET ================= */
          assetId: cols[4] || '',
          assetName: cols[5] || '',
          assetType: cols[6] || '',
          assetSerialNumber: cols[7] || '',

          /* ================= STATUS ================= */
          assetCurrentStatus: cols[8] || '',
          assetNewStatus: cols[9] || '',

          /* ================= REASON ================= */
          assetStatusChangeReason: cols[10] || '',
          assetStatusChangeRemarks: cols[11] || '',

          /* ================= USERS ================= */
          assetChangeInitiatedBy: cols[12] || '',
          assetChangeApprovedBy: cols[13] || '',
          assetStatusChangeAssignedTo: cols[14] || '',

          /* ================= APPROVAL ================= */
          approvalStatus: ['Approved', 'Pending', 'Rejected'].includes(cols[15])
            ? (cols[15] as 'Approved' | 'Pending' | 'Rejected')
            : 'Pending',

          approvalDate: cols[16] || '',

          /* ================= REPAIR ================= */
          assetRepairVendor: cols[17] || '',
          assetExpectedReturnDate: cols[18] || '',
          repairCost: cols[19] ? Number(cols[19]) : undefined,

          /* ================= REPLACEMENT ================= */
          replacementAssetId: cols[20] || '',
          replacementDate: cols[21] || '',

          /* ================= SCRAP ================= */
          scrapReason: cols[22] || '',
          scrapDate: cols[23] || '',

          /* ================= REFERENCES ================= */
          callId: cols[24] || '',
          allocationId: cols[25] || '',
          returnId: cols[26] || '',
          replacementId: cols[27] || '',

          /* ================= AUDIT ================= */
          createdBy: cols[28] || '',
          createdDate: this.getTodayDate(),
          updatedBy: '',
          updatedDate: '',

          /* ================= SYSTEM ================= */
          assetStatus: ['Active', 'Inactive'].includes(cols[29])
            ? (cols[29] as 'Active' | 'Inactive')
            : 'Active',

          /* ================= LOGIN ================= */
          loginId: this.loginId,
        };

        results.push(newRecord);
      });

      /* ================= SAVE ================= */
      this.tableData = [...this.tableData, ...results];
      this.filteredData = [...this.tableData];
      this.currentPage = 1;

      this.cdr.detectChanges();

      this.showToast(
        `${results.length} record(s) imported successfully!`,
        'success',
      );
    };

    reader.readAsText(file);
  }

  // ---------------- DOCX Parsing (mammoth.js) ----------------
  async readDOCX(file: File) {
    const reader = new FileReader();

    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;

      try {
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

        const results: TableRow[] = [];

        rows.forEach((row, rowIndex) => {
          if (rowIndex === 0) return; // skip header

          const cells = Array.from(row.querySelectorAll('td')).map(
            (cell) => cell.textContent?.trim() || '',
          );

          // 🔥 ensure enough columns (full interface ~30)
          while (cells.length < 30) cells.push('');

          const newId = this.tableData.length + rowIndex;

          const newRecord: TableRow = {
            /* ================= PRIMARY ================= */
            assetStatusChangeId: cells[0] || `ASC-${newId}`,
            assetStatusChangeCode:
              cells[1] || `ASC-${String(newId).padStart(3, '0')}`,

            /* ================= DATES ================= */
            assetStatusCreatedDate: cells[2] || this.getTodayDate(),
            assetStatusChangeDate: cells[3] || this.getTodayDate(),

            /* ================= ASSET ================= */
            assetId: cells[4] || '',
            assetName: cells[5] || '',
            assetType: cells[6] || '',
            assetSerialNumber: cells[7] || '',

            /* ================= STATUS ================= */
            assetCurrentStatus: cells[8] || '',
            assetNewStatus: cells[9] || '',

            /* ================= REASON ================= */
            assetStatusChangeReason: cells[10] || '',
            assetStatusChangeRemarks: cells[11] || '',

            /* ================= USERS ================= */
            assetChangeInitiatedBy: cells[12] || '',
            assetChangeApprovedBy: cells[13] || '',
            assetStatusChangeAssignedTo: cells[14] || '',

            /* ================= APPROVAL ================= */
            approvalStatus: ['Approved', 'Pending', 'Rejected'].includes(
              cells[15],
            )
              ? (cells[15] as 'Approved' | 'Pending' | 'Rejected')
              : 'Pending',
            approvalDate: cells[16] || '',

            /* ================= REPAIR ================= */
            assetRepairVendor: cells[17] || '',
            assetExpectedReturnDate: cells[18] || '',
            repairCost: cells[19] ? Number(cells[19]) : undefined,

            /* ================= REPLACEMENT ================= */
            replacementAssetId: cells[20] || '',
            replacementDate: cells[21] || '',

            /* ================= SCRAP ================= */
            scrapReason: cells[22] || '',
            scrapDate: cells[23] || '',

            /* ================= REFERENCES ================= */
            callId: cells[24] || '',
            allocationId: cells[25] || '',
            returnId: cells[26] || '',
            replacementId: cells[27] || '',

            /* ================= AUDIT ================= */
            createdBy: cells[28] || '',
            createdDate: this.getTodayDate(),
            updatedBy: '',
            updatedDate: '',

            /* ================= SYSTEM ================= */
            assetStatus: ['Active', 'Inactive'].includes(cells[29])
              ? (cells[29] as 'Active' | 'Inactive')
              : 'Active',

            /* ================= LOGIN ================= */
            loginId: this.loginId,
          };

          results.push(newRecord);
        });

        /* ================= SAVE ================= */
        this.tableData = [...this.tableData, ...results];
        this.filteredData = [...this.tableData];
        this.currentPage = 1;

        this.cdr.detectChanges();

        this.showToast(
          `${results.length} record(s) imported successfully!`,
          'success',
        );
      } catch (err) {
        console.error('DOCX Parse Error:', err);
        this.showToast('Failed to read DOCX file!', 'danger');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  downloadSampleCSV() {
    /* ================= HEADERS (FULL INTERFACE) ================= */
    const headers = [
      'Status Change ID',
      'Status Change Code',
      'Created Date',
      'Change Date',

      'Asset ID',
      'Asset Name',
      'Asset Type',
      'Serial Number',

      'Current Status',
      'New Status',

      'Change Reason',
      'Remarks',

      'Initiated By',
      'Approved By',
      'Assigned To',

      'Approval Status',
      'Approval Date',

      'Repair Vendor',
      'Expected Return Date',
      'Repair Cost',

      'Replacement Asset ID',
      'Replacement Date',

      'Scrap Reason',
      'Scrap Date',

      'Call ID',
      'Allocation ID',
      'Return ID',
      'Replacement ID',

      'Created By',
      'Created Date Audit',
      'Updated By',
      'Updated Date',

      'Status',
    ];

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    /* ================= SAMPLE ROW (IMPORTANT 🔥) ================= */
    const sampleRow = [
      'ASC-001',
      'ASC-001',
      this.getTodayDate(),
      this.getTodayDate(),

      'A-1001',
      'Dell Laptop',
      'Laptop',
      'SN123456',

      'Active',
      'Under Repair',

      'Hardware Issue',
      'Fan not working',

      'EMP001',
      'MGR001',
      'ENG001',

      'Pending',
      '',

      'ABC Vendor',
      this.getTodayDate(),
      '1500',

      '',
      '',

      '',
      '',

      'CALL001',
      'ALLOC001',
      '',
      '',

      'Admin',
      this.getTodayDate(),
      '',
      '',

      'Active',
    ];

    csvRows.push(sampleRow.join(','));

    /* ================= OPTIONAL: ADD EXISTING DATA ================= */
    this.tableData.forEach((row: TableRow) => {
      const rowData = [
        row.assetStatusChangeId || '',
        row.assetStatusChangeCode || '',
        row.assetStatusCreatedDate || '',
        row.assetStatusChangeDate || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetSerialNumber || '',

        row.assetCurrentStatus || '',
        row.assetNewStatus || '',

        row.assetStatusChangeReason || '',
        row.assetStatusChangeRemarks || '',

        row.assetChangeInitiatedBy || '',
        row.assetChangeApprovedBy || '',
        row.assetStatusChangeAssignedTo || '',

        row.approvalStatus || '',
        row.approvalDate || '',

        row.assetRepairVendor || '',
        row.assetExpectedReturnDate || '',
        row.repairCost ?? '',

        row.replacementAssetId || '',
        row.replacementDate || '',

        row.scrapReason || '',
        row.scrapDate || '',

        row.callId || '',
        row.allocationId || '',
        row.returnId || '',
        row.replacementId || '',

        row.createdBy || '',
        row.createdDate || '',
        row.updatedBy || '',
        row.updatedDate || '',

        row.assetStatus || '',
      ];

      csvRows.push(rowData.join(','));
    });

    /* ================= CREATE FILE ================= */
    const csvString = '\ufeff' + csvRows.join('\n'); // UTF-8 BOM fix

    const blob = new Blob([csvString], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;

    const today = new Date().toISOString().split('T')[0];
    a.download = `Asset_Status_Change_Sample_${today}.csv`;

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
    // Check if both dates are entered
    if (!this.startDate || !this.endDate) {
      this.showToast('Please enter both Start Date and End Date!', 'warning');
      return;
    }

    const start = this.startDate ? this.parseDDMMYYYY(this.startDate) : null;
    const end = this.endDate ? this.parseDDMMYYYY(this.endDate) : null;

    const filteredData = this.tableData.filter((row) => {
      const rowDate = this.parseDDMMYYYY(row.assetStatusCreatedDate);
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
    if (!data || data.length === 0) {
      this.toast.warning('No data available to export!', '', 3000);
      return;
    }

    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    const csvRows: string[] = [];

    /* ================= HEADER INFO ================= */
    csvRows.push(this.headCompanyName || 'Company Name');
    csvRows.push(`Date:,${formattedDate}`);
    csvRows.push(`Total Records:,${data.length}`);
    csvRows.push('');

    /* ================= HEADERS ================= */
    const headers = [
      'Status Change ID',
      'Status Change Code',
      'Created Date',
      'Change Date',

      'Asset ID',
      'Asset Name',
      'Asset Type',
      'Serial Number',

      'Current Status',
      'New Status',

      'Change Reason',
      'Remarks',

      'Initiated By',
      'Approved By',
      'Assigned To',

      'Approval Status',
      'Approval Date',

      'Repair Vendor',
      'Expected Return Date',
      'Repair Cost',

      'Replacement Asset ID',
      'Replacement Date',

      'Scrap Reason',
      'Scrap Date',

      'Call ID',
      'Allocation ID',
      'Return ID',
      'Replacement ID',

      'Created By',
      'Created Date Audit',
      'Updated By',
      'Updated Date',

      'Status',
    ];

    csvRows.push(headers.join(','));

    /* ================= SAFE CSV VALUE FUNCTION 🔥 ================= */
    const safe = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`; // 🔥 wrap to avoid comma issues
    };

    /* ================= DATA ================= */
    data.forEach((row: TableRow) => {
      const rowData = [
        safe(row.assetStatusChangeId),
        safe(row.assetStatusChangeCode),
        safe(row.assetStatusCreatedDate),
        safe(row.assetStatusChangeDate),

        safe(row.assetId),
        safe(row.assetName),
        safe(row.assetType),
        safe(row.assetSerialNumber),

        safe(row.assetCurrentStatus),
        safe(row.assetNewStatus),

        safe(row.assetStatusChangeReason),
        safe(row.assetStatusChangeRemarks),

        safe(row.assetChangeInitiatedBy),
        safe(row.assetChangeApprovedBy),
        safe(row.assetStatusChangeAssignedTo),

        safe(row.approvalStatus),
        safe(row.approvalDate),

        safe(row.assetRepairVendor),
        safe(row.assetExpectedReturnDate),
        safe(row.repairCost ?? ''),

        safe(row.replacementAssetId),
        safe(row.replacementDate),

        safe(row.scrapReason),
        safe(row.scrapDate),

        safe(row.callId),
        safe(row.allocationId),
        safe(row.returnId),
        safe(row.replacementId),

        safe(row.createdBy),
        safe(row.createdDate),
        safe(row.updatedBy),
        safe(row.updatedDate),

        safe(row.assetStatus),
      ];

      csvRows.push(rowData.join(','));
    });

    /* ================= CREATE FILE ================= */
    const csvString = '\ufeff' + csvRows.join('\n'); // UTF-8 BOM

    const blob = new Blob([csvString], {
      type: 'text/csv;charset=utf-8;',
    });

    const fileName = `Asset_Status_Change_Report_${today.toISOString().split('T')[0]}.csv`;

    saveAs(blob, fileName);
  }

  // ---------------- Excel Export ----------------
  exportExcelfile(data: TableRow[]) {
    if (!data || data.length === 0) {
      this.toast.warning('No data available to export!', '', 3000);
      return;
    }

    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    /* ================= SHEET DATA ================= */
    const wsData = [
      [this.headCompanyName || 'Company Name'],
      ['Date:', formattedDate],
      ['Total Records:', data.length],
      [],

      /* HEADERS */
      [
        'Status Change ID',
        'Status Change Code',
        'Created Date',
        'Change Date',

        'Asset ID',
        'Asset Name',
        'Asset Type',
        'Serial Number',

        'Current Status',
        'New Status',

        'Change Reason',
        'Remarks',

        'Initiated By',
        'Approved By',
        'Assigned To',

        'Approval Status',
        'Approval Date',

        'Repair Vendor',
        'Expected Return Date',
        'Repair Cost',

        'Replacement Asset ID',
        'Replacement Date',

        'Scrap Reason',
        'Scrap Date',

        'Call ID',
        'Allocation ID',
        'Return ID',
        'Replacement ID',

        'Created By',
        'Created Date Audit',
        'Updated By',
        'Updated Date',

        'Status',
      ],
    ];

    /* ================= DATA ================= */
    data.forEach((row: TableRow) => {
      wsData.push([
        row.assetStatusChangeId || '',
        row.assetStatusChangeCode || '',
        row.assetStatusCreatedDate || '',
        row.assetStatusChangeDate || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetSerialNumber || '',

        row.assetCurrentStatus || '',
        row.assetNewStatus || '',

        row.assetStatusChangeReason || '',
        row.assetStatusChangeRemarks || '',

        row.assetChangeInitiatedBy || '',
        row.assetChangeApprovedBy || '',
        row.assetStatusChangeAssignedTo || '',

        row.approvalStatus || '',
        row.approvalDate || '',

        row.assetRepairVendor || '',
        row.assetExpectedReturnDate || '',
        row.repairCost ?? '',

        row.replacementAssetId || '',
        row.replacementDate || '',

        row.scrapReason || '',
        row.scrapDate || '',

        row.callId || '',
        row.allocationId || '',
        row.returnId || '',
        row.replacementId || '',

        row.createdBy || '',
        row.createdDate || '',
        row.updatedBy || '',
        row.updatedDate || '',

        row.assetStatus || '',
      ]);
    });

    /* ================= CREATE SHEET ================= */
    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

    /* ================= AUTO COLUMN WIDTH 🔥 ================= */
    worksheet['!cols'] = wsData[4].map((col, i) => ({
      wch: Math.max(
        col.length + 5,
        ...data.map((row) => String(Object.values(row)[i] || '').length + 2),
      ),
    }));

    /* ================= WORKBOOK ================= */
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Asset Status Change Report',
    );

    /* ================= FILE EXPORT ================= */
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream',
    });

    const fileName = `Asset_Status_Change_Report_${
      today.toISOString().split('T')[0]
    }.xlsx`;

    saveAs(blob, fileName);
  }
  // ---------------- PDF Export ----------------
  exportPDFfile(data: TableRow[]) {
    if (!data || data.length === 0) {
      this.showToast('No data available to export!', 'warning');
      return;
    }

    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');

    /* ================= HEADER ================= */
    const title = 'Asset Status Change Report';

    doc.setFontSize(20);
    doc.setTextColor(0, 70, 140);
    doc.text(title, pageWidth / 2, 40, { align: 'center' });

    // underline
    doc.setDrawColor(0, 70, 140);
    doc.setLineWidth(1);
    doc.line(
      pageWidth / 2 - doc.getTextWidth(title) / 2,
      45,
      pageWidth / 2 + doc.getTextWidth(title) / 2,
      45,
    );

    /* ================= SUB HEADER ================= */
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    doc.text(this.headCompanyName || 'Company Name', 40, 70);
    doc.text(`Date: ${today}`, pageWidth - 40, 70, { align: 'right' });
    doc.text(`Total Records: ${data.length}`, 40, 85);

    /* ================= TABLE ================= */
    autoTable(doc, {
      startY: 100,

      head: [
        [
          'ID',
          'Code',
          'Created',
          'Change',

          'Asset ID',
          'Asset Name',
          'Type',
          'Serial',

          'Current',
          'New',

          'Reason',
          'Remarks',

          'Initiated',
          'Approved',
          'Assigned',

          'Approval',

          'Vendor',
          'Return',
          'Cost',

          'Replace',
          'Scrap',

          'Status',
        ],
      ],

      body: data.map((row: TableRow) => [
        row.assetStatusChangeId || '',
        row.assetStatusChangeCode || '',
        row.assetStatusCreatedDate || '',
        row.assetStatusChangeDate || '',

        row.assetId || '',
        row.assetName || '',
        row.assetType || '',
        row.assetSerialNumber || '',

        row.assetCurrentStatus || '',
        row.assetNewStatus || '',

        row.assetStatusChangeReason || '',
        row.assetStatusChangeRemarks || '',

        row.assetChangeInitiatedBy || '',
        row.assetChangeApprovedBy || '',
        row.assetStatusChangeAssignedTo || '',

        row.approvalStatus || '',

        row.assetRepairVendor || '',
        row.assetExpectedReturnDate || '',
        row.repairCost ?? '',

        row.replacementAssetId || '',
        row.scrapReason || '',

        row.assetStatus || '',
      ]),

      theme: 'grid',

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
      },

      alternateRowStyles: {
        fillColor: [245, 245, 245], // zebra
      },

      margin: { left: 20, right: 20 },

      didDrawPage: (dataArg) => {
        /* ================= FOOTER ================= */
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageSize = doc.internal.pageSize;

        doc.setFontSize(8);
        doc.text(
          `Page ${dataArg.pageNumber} of ${pageCount}`,
          pageWidth - 40,
          pageSize.height - 10,
        );
      },
    });

    /* ================= SAVE ================= */
    const fileName = `Asset_Status_Change_Report_${
      new Date().toISOString().split('T')[0]
    }.pdf`;

    doc.save(fileName);
  }
}
