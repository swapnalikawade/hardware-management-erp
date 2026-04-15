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

  /* ========= PRIMARY ========= */
  statusChangeId: string;
  changeNumber: string;

  /* ========= DATE ========= */
  changeDate: string;   // YYYY-MM-DD

  /* ========= ASSET ========= */
  assetId: string;
  assetSerialNumber: string;

  /* ========= STATUS ========= */
  oldStatus: string;
  newStatus: string;

  reasonForStatusChange: string;
  description: string;

  /* ========= REFERENCES ========= */
  allocationId: string;
  callLoggingId: string;
  replacementId: string;

  /* ========= USER ========= */
  changedBy: string;

  /* ========= CONDITION ========= */
  assetCondition: string;   // Good / Faulty / Damaged

  /* ========= REMARKS ========= */
  remarks?: string;

  /* ========= AUDIT ========= */
  createdBy: string;
  createdDate: string;

  updatedBy?: string;
  updatedDate?: string;
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

      changeNumber: '',
      changeDate: this.currentDate || '',

      /* ========= ASSET ========= */
      assetId: '',
      assetSerialNumber: '',

      /* ========= STATUS ========= */
      oldStatus: '',
      newStatus: '',

      reasonForStatusChange: '',
      description: '',

      /* ========= REFERENCES ========= */
      allocationId: '',
      callLoggingId: '',
      replacementId: '',

      /* ========= USER ========= */
      changedBy: this.loginId || '',

      /* ========= CONDITION ========= */
      assetCondition: 'Good',

      /* ========= REMARKS ========= */
      remarks: '',

      /* ========= AUDIT ========= */
      createdBy: this.loginId || '',
      createdDate: this.currentDate,

      updatedBy: '',
      updatedDate: '',

      /* ================= BACKEND ================= */
      newRecord: {

        /* ========= PRIMARY ========= */
        statusChangeId: '0',
        changeNumber: '',

        /* ========= DATE ========= */
        changeDate: this.currentDate,

        /* ========= ASSET ========= */
        assetId: '',
        assetSerialNumber: '',

        /* ========= STATUS ========= */
        oldStatus: '',
        newStatus: '',

        reasonForStatusChange: '',
        description: '',

        /* ========= REFERENCES ========= */
        allocationId: '',
        callLoggingId: '',
        replacementId: '',

        /* ========= USER ========= */
        changedBy: this.loginId || '',

        /* ========= CONDITION ========= */
        assetCondition: 'Good',

        /* ========= REMARKS ========= */
        remarks: '',

        /* ========= AUDIT ========= */
        createdBy: this.loginId || '',
        createdDate: this.currentDate,

        updatedBy: '',
        updatedDate: '',
      },
    },
  ];
}
loadAssetStatusChange(): void {

  /* ================= LOGIN CHECK ================= */
  if (!this.loginId) {
    console.warn('Login ID missing');
    return;
  }

  /* 🔥 FORMAT LOGIN ID (IMPORTANT) */
  
  // const [prefix, year, code] = formattedLoginId.split('/');

  this.loading = true;

  /* ================= API CALL ================= */
  this.commonService
    .fetchAllAssetStatusChangeByLoginId(this.loginId)
    .subscribe({

      next: (res: any[]) => {

        console.log('API RESPONSE:', res); // 🔥 debug

        this.tableData = (res || []).map((r: any) => ({

          /* ========= PRIMARY ========= */
          statusChangeId: r.statusChangeId ?? '',
          changeNumber: r.changeNumber ?? '',

          /* ========= DATE ========= */
          changeDate: r.changeDate ?? '',

          /* ========= ASSET ========= */
          assetId: r.assetId ?? '',
          assetSerialNumber: r.assetSerialNumber ?? '',

          /* ========= STATUS ========= */
          oldStatus: r.oldStatus ?? '',
          newStatus: r.newStatus ?? '',

          reasonForStatusChange: r.reasonForStatusChange ?? '',
          description: r.description ?? '',

          /* ========= REFERENCES ========= */
          allocationId: r.allocationId ?? '',
          callLoggingId: r.callLoggingId ?? '',
          replacementId: r.replacementId ?? '',

          /* ========= USER ========= */
          changedBy: r.changedBy ?? '',

          /* ========= CONDITION ========= */
          assetCondition: r.assetCondition ?? 'Good',

          /* ========= REMARKS ========= */
          remarks: r.remarks ?? '',

          /* ========= AUDIT ========= */
          createdBy: r.createdBy ?? '',
          createdDate: r.createdDate ?? '',

          updatedBy: r.updatedBy ?? '',
          updatedDate: r.updatedDate ?? '',
        }));

        this.filteredData = [...this.tableData];
        this.loading = false;
      },

      /* ================= ERROR HANDLING ================= */
      error: (err: any) => {   // ✅ FIX (TS7006)
        console.error('API Error:', err);
        this.loading = false;

        this.toast.danger(
          err?.error?.message || 'Failed to load Asset Status Change data!',
          'ERROR',
          4000
        );
      }
    });
}
 loadEmployees(): void {

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
      .map((row) => row.statusChangeId )
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
          (row) => !idSet.has(row.statusChangeId),
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

  const exportData = this.tableData.map((row: any) => ({

    /* ================= PRIMARY ================= */
    Status_Change_ID: row.statusChangeId || '',
    Change_Number: row.changeNumber || '',

    /* ================= DATE ================= */
    Change_Date: row.changeDate || '',

    /* ================= ASSET ================= */
    Asset_ID: row.assetId || '',
    Serial_Number: row.assetSerialNumber || '',

    /* ================= STATUS ================= */
    Old_Status: row.oldStatus || '',
    New_Status: row.newStatus || '',

    /* ================= DETAILS ================= */
    Reason: row.reasonForStatusChange || '',
    Description: row.description || '',

    /* ================= REFERENCES ================= */
    Allocation_ID: row.allocationId || '',
    Call_Logging_ID: row.callLoggingId || '',
    Replacement_ID: row.replacementId || '',

    /* ================= USER ================= */
    Changed_By: row.changedBy || '',

    /* ================= CONDITION ================= */
    Asset_Condition: row.assetCondition || '',

    /* ================= REMARKS ================= */
    Remarks: row.remarks || '',

    /* ================= AUDIT ================= */
    Created_By: row.createdBy || '',
    Created_Date: row.createdDate || '',
    Updated_By: row.updatedBy || '',
    Updated_Date: row.updatedDate || '',

  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  /* 🔥 AUTO WIDTH */
  worksheet['!cols'] = Object.keys(exportData[0]).map((key) => ({
    wch: Math.max(key.length + 2, 20),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset_Status_Change');

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
}

th, td {
  border: 1px solid #000;
  padding: 5px;
}

th {
  background: #d9e1f2;
  text-align: center;
}

.header-table td {
  border: none;
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

<!-- HEADER -->
<table class="header-table">
<tr>
<td>Date: ${currentDate}</td>
<td style="text-align:right;">Total Records: ${this.tableData.length}</td>
</tr>
<tr>
<td colspan="2" class="title">Asset Status Change Report</td>
</tr>
</table>

<!-- TABLE -->
<table>

<tr>
<th>ID</th>
<th>Number</th>
<th>Date</th>

<th>Asset ID</th>
<th>Serial</th>

<th>Old Status</th>
<th>New Status</th>

<th>Reason</th>
<th>Description</th>

<th>Allocation</th>
<th>Call</th>
<th>Replacement</th>

<th>Changed By</th>
<th>Condition</th>

<th>Remarks</th>

<th>Created</th>
<th>Updated</th>
</tr>
`;

  this.tableData.forEach((row: any) => {
    content += `
<tr>

<td>${row.statusChangeId || ''}</td>
<td>${row.changeNumber || ''}</td>
<td>${row.changeDate || ''}</td>

<td>${row.assetId || ''}</td>
<td>${row.assetSerialNumber || ''}</td>

<td>${row.oldStatus || ''}</td>
<td>${row.newStatus || ''}</td>

<td>${row.reasonForStatusChange || ''}</td>
<td>${row.description || ''}</td>

<td>${row.allocationId || ''}</td>
<td>${row.callLoggingId || ''}</td>
<td>${row.replacementId || ''}</td>

<td>${row.changedBy || ''}</td>
<td>${row.assetCondition || ''}</td>

<td>${row.remarks || ''}</td>

<td>${row.createdDate || ''}</td>
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

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDate = new Date().toLocaleDateString('en-GB');

  /* ================= HEADER ================= */

  doc.setFontSize(10);
  doc.text(`Date: ${currentDate}`, 10, 10);

  doc.setFontSize(18);
  doc.text('Asset Status Change Report', pageWidth / 2, 12, {
    align: 'center',
  });

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
      fillColor: [245, 245, 245],
    },

    head: [[
      'ID',
      'Number',
      'Date',

      'Asset ID',
      'Serial',

      'Old Status',
      'New Status',

      'Reason',
      'Description',

      'Allocation',
      'Call',
      'Replacement',

      'Changed By',
      'Condition',

      'Remarks',

      'Created',
      'Updated'
    ]],

    body: this.tableData.map((row: any) => [

      row.statusChangeId || '',
      row.changeNumber || '',
      row.changeDate || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.oldStatus || '',
      row.newStatus || '',

      row.reasonForStatusChange || '',
      row.description || '',

      row.allocationId || '',
      row.callLoggingId || '',
      row.replacementId || '',

      row.changedBy || '',
      row.assetCondition || '',

      row.remarks || '',

      row.createdDate || '',
      row.updatedDate || ''
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
      doc.internal.pageSize.height - 5
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
newRecord: any = {

  /* ================= PRIMARY ================= */
  statusChangeId: '0',   // auto-generate
  changeNumber: '',

  /* ================= DATE ================= */
  changeDate: this.getTodayDate(),

  /* ================= ASSET ================= */
  assetId: '',
  assetSerialNumber: '',

  /* ================= STATUS ================= */
  oldStatus: '',
  newStatus: '',

  /* ================= DETAILS ================= */
  reasonForStatusChange: '',
  description: '',

  /* ================= REFERENCES ================= */
  allocationId: '',
  callLoggingId: '',
  replacementId: '',

  /* ================= USER ================= */
  changedBy: this.loginId || '',

  /* ================= CONDITION ================= */
  assetCondition: 'Good',

  /* ================= REMARKS ================= */
  remarks: '',

  /* ================= AUDIT ================= */
  createdBy: this.loginId || '',
  createdDate: this.getTodayDate(),

  updatedBy: '',
  updatedDate: '',
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

  const newEntry: any = {

    /* ================= PRIMARY ================= */
    statusChangeId: '0',
    changeNumber: '',

    /* ================= DATE ================= */
    changeDate: this.getTodayDate(),

    /* ================= ASSET ================= */
    assetId: '',
    assetSerialNumber: '',

    /* ================= STATUS ================= */
    oldStatus: '',
    newStatus: '',

    /* ================= DETAILS ================= */
    reasonForStatusChange: '',
    description: '',

    /* ================= REFERENCES ================= */
    allocationId: '',
    callLoggingId: '',
    replacementId: '',

    /* ================= USER ================= */
    changedBy: this.loginId || '',

    /* ================= CONDITION ================= */
    assetCondition: 'Good',

    /* ================= REMARKS ================= */
    remarks: '',

    /* ================= AUDIT ================= */
    createdBy: this.loginId || '',
    createdDate: this.getTodayDate(),

    updatedBy: '',
    updatedDate: '',
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

  /* ================= PAYLOAD BUILDER ================= */
  const preparePayload = (r: any, isEdit = false, existing?: any) => {

    return {

      /* ================= PRIMARY ================= */
      changeNumber: r.changeNumber || '',

      /* ================= DATE ================= */
      changeDate: r.changeDate || this.getTodayDate(),

      /* ================= ASSET ================= */
      assetId: r.assetId || '',
      assetSerialNumber: r.assetSerialNumber || '',

      /* ================= STATUS ================= */
      oldStatus: r.oldStatus || '',
      newStatus: r.newStatus || '',

      /* ================= DETAILS ================= */
      reasonForStatusChange: r.reasonForStatusChange || '',
      description: r.description || '',

      /* ================= REFERENCES ================= */
      allocationId: r.allocationId || '',
      callLoggingId: r.callLoggingId || '',
      replacementId: r.replacementId || '',

      /* ================= USER ================= */
      changedBy: this.loginId,

      /* ================= CONDITION ================= */
      assetCondition: r.assetCondition || 'Good',

      /* ================= REMARKS ================= */
      remarks: r.remarks || '',

      /* ================= AUDIT ================= */
      createdBy: isEdit ? existing?.createdBy : this.loginId,
      createdDate: isEdit ? existing?.createdDate : this.getTodayDate(),

      updatedBy: isEdit ? this.loginId : '',
      updatedDate: isEdit ? this.getTodayDate() : '',
    };
  };

  /* ================= EDIT MODE ================= */
  if (this.isEditMode && this.editIndex !== -1) {

    const formData = this.forms[0].newRecord;
    const existing = this.tableData[this.editIndex];

    const payload = preparePayload(formData, true, existing);

    const statusChangeId = existing?.statusChangeId;

    if (!statusChangeId) {
      this.toast.danger('Invalid ID!', 'ERROR', 3000);
      return;
    }

    this.commonService
      .updateAssetStatusChange(statusChangeId, payload)
      .subscribe({

        next: () => {
          this.toast.success('Updated Successfully', 'SUCCESS', 4000);
          this.resetAfterSave();
          this.loadAssetStatusChange();
        },

        error: (err) => {
          console.error('UPDATE ERROR:', err);
          this.toast.danger('Update failed!', 'ERROR', 4000);
        },
      });

    return;
  }

  /* ================= ADD MODE ================= */

  const payload = this.forms.map((f) =>
    preparePayload(f.newRecord, false)
  );

  this.commonService.submitAssetStatusChange(payload).subscribe({

    next: () => {
      this.toast.success('Saved Successfully', 'SUCCESS', 4000);
      this.resetAfterSave();
      this.loadAssetStatusChange();
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

        /* ================= PRIMARY ================= */
        statusChangeId: '0',
        changeNumber: '',

        /* ================= DATE ================= */
        changeDate: this.getTodayDate(),

        /* ================= ASSET ================= */
        assetId: '',
        assetSerialNumber: '',

        /* ================= STATUS ================= */
        oldStatus: '',
        newStatus: '',

        /* ================= DETAILS ================= */
        reasonForStatusChange: '',
        description: '',

        /* ================= REFERENCES ================= */
        allocationId: '',
        callLoggingId: '',
        replacementId: '',

        /* ================= USER ================= */
        changedBy: this.loginId || '',

        /* ================= CONDITION ================= */
        assetCondition: 'Good',

        /* ================= REMARKS ================= */
        remarks: '',

        /* ================= AUDIT ================= */
        createdBy: this.loginId || '',
        createdDate: this.getTodayDate(),

        updatedBy: '',
        updatedDate: '',
      },
    },
  ];

  this.activeForm = 0;

  /* ================= CLEAR SELECTION ================= */
  this.selectedRows = [];

  /* ================= SUCCESS MESSAGE ================= */
  this.toast.info('Form cleared successfully', '', 3000);
}
  // --------------------------
  // EDIT EXISTING ROW
  // --------------------------
onEdit(row: any, index: number) {

  this.activeTab = 'newRecord';
  this.isEditMode = true;
  this.editIndex = index;

  /* ================= SAFE COPY ================= */
  const record = {

    /* ================= PRIMARY ================= */
    statusChangeId: row.statusChangeId || '0',
    changeNumber: row.changeNumber || '',

    /* ================= DATE ================= */
    changeDate: row.changeDate || this.getTodayDate(),

    /* ================= ASSET ================= */
    assetId: row.assetId || '',
    assetSerialNumber: row.assetSerialNumber || '',

    /* ================= STATUS ================= */
    oldStatus: row.oldStatus || '',
    newStatus: row.newStatus || '',

    /* ================= DETAILS ================= */
    reasonForStatusChange: row.reasonForStatusChange || '',
    description: row.description || '',

    /* ================= REFERENCES ================= */
    allocationId: row.allocationId || '',
    callLoggingId: row.callLoggingId || '',
    replacementId: row.replacementId || '',

    /* ================= USER ================= */
    changedBy: row.changedBy || this.loginId,

    /* ================= CONDITION ================= */
    assetCondition: row.assetCondition || 'Good',

    /* ================= REMARKS ================= */
    remarks: row.remarks || '',

    /* ================= AUDIT ================= */
    createdBy: row.createdBy || this.loginId,
    createdDate: row.createdDate || this.getTodayDate(),

    updatedBy: row.updatedBy || '',
    updatedDate: row.updatedDate || '',
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

      case 'status change id': return 'statusChangeId';
      case 'change number': return 'changeNumber';
      case 'change date': return 'changeDate';

      case 'asset id': return 'assetId';
      case 'serial number': return 'assetSerialNumber';

      case 'old status': return 'oldStatus';
      case 'new status': return 'newStatus';

      case 'reason': return 'reasonForStatusChange';
      case 'description': return 'description';

      case 'allocation id': return 'allocationId';
      case 'call logging id': return 'callLoggingId';
      case 'replacement id': return 'replacementId';

      case 'changed by': return 'changedBy';
      case 'condition': return 'assetCondition';

      case 'remarks': return 'remarks';

      case 'created by': return 'createdBy';
      case 'created date': return 'createdDate';
      case 'updated by': return 'updatedBy';
      case 'updated date': return 'updatedDate';

      default:
        return h;
    }
  };

  const csvHeaders = lines[0].split(',').map((h) => mapHeader(h.trim()));

  const results: any[] = [];

  /* ================= ROW PARSING ================= */
  for (let i = 1; i < lines.length; i++) {

    const values = lines[i].split(',');
    const obj: any = {};

    csvHeaders.forEach((h, idx) => {
      obj[h] = values[idx] ? values[idx].trim() : '';
    });

    const newRecord = {

      /* ================= PRIMARY ================= */
      statusChangeId: obj.statusChangeId || '0',
      changeNumber: obj.changeNumber || '',

      /* ================= DATE ================= */
      changeDate: obj.changeDate || this.getTodayDate(),

      /* ================= ASSET ================= */
      assetId: obj.assetId || '',
      assetSerialNumber: obj.assetSerialNumber || '',

      /* ================= STATUS ================= */
      oldStatus: obj.oldStatus || '',
      newStatus: obj.newStatus || '',

      /* ================= DETAILS ================= */
      reasonForStatusChange: obj.reasonForStatusChange || '',
      description: obj.description || '',

      /* ================= REFERENCES ================= */
      allocationId: obj.allocationId || '',
      callLoggingId: obj.callLoggingId || '',
      replacementId: obj.replacementId || '',

      /* ================= USER ================= */
      changedBy: obj.changedBy || this.loginId,

      /* ================= CONDITION ================= */
      assetCondition: obj.assetCondition || 'Good',

      /* ================= REMARKS ================= */
      remarks: obj.remarks || '',

      /* ================= AUDIT ================= */
      createdBy: obj.createdBy || this.loginId,
      createdDate: obj.createdDate || this.getTodayDate(),

      updatedBy: obj.updatedBy || '',
      updatedDate: obj.updatedDate || '',
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
    'success'
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

    const results: any[] = [];

    json.forEach((obj: any) => {

      const newRecord = {

        /* ================= PRIMARY ================= */
        statusChangeId: obj['Status Change ID'] || '0',
        changeNumber: obj['Change Number'] || '',

        /* ================= DATE ================= */
        changeDate: obj['Change Date'] || this.getTodayDate(),

        /* ================= ASSET ================= */
        assetId: obj['Asset ID'] || '',
        assetSerialNumber: obj['Serial Number'] || '',

        /* ================= STATUS ================= */
        oldStatus: obj['Old Status'] || '',
        newStatus: obj['New Status'] || '',

        /* ================= DETAILS ================= */
        reasonForStatusChange: obj['Reason'] || '',
        description: obj['Description'] || '',

        /* ================= REFERENCES ================= */
        allocationId: obj['Allocation ID'] || '',
        callLoggingId: obj['Call Logging ID'] || '',
        replacementId: obj['Replacement ID'] || '',

        /* ================= USER ================= */
        changedBy: obj['Changed By'] || this.loginId,

        /* ================= CONDITION ================= */
        assetCondition: obj['Condition'] || 'Good',

        /* ================= REMARKS ================= */
        remarks: obj['Remarks'] || '',

        /* ================= AUDIT ================= */
        createdBy: obj['Created By'] || this.loginId,
        createdDate: obj['Created Date'] || this.getTodayDate(),

        updatedBy: obj['Updated By'] || '',
        updatedDate: obj['Updated Date'] || '',
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
      'success'
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

    const results: any[] = [];

    lines.forEach((line) => {

      const cols = line.split(',').map((c) => c.trim());

      // 🔥 expected columns = 18 (clean structure)
      while (cols.length < 18) cols.push('');

      const newRecord = {

        /* ================= PRIMARY ================= */
        statusChangeId: cols[0] || '0',
        changeNumber: cols[1] || '',

        /* ================= DATE ================= */
        changeDate: cols[2] || this.getTodayDate(),

        /* ================= ASSET ================= */
        assetId: cols[3] || '',
        assetSerialNumber: cols[4] || '',

        /* ================= STATUS ================= */
        oldStatus: cols[5] || '',
        newStatus: cols[6] || '',

        /* ================= DETAILS ================= */
        reasonForStatusChange: cols[7] || '',
        description: cols[8] || '',

        /* ================= REFERENCES ================= */
        allocationId: cols[9] || '',
        callLoggingId: cols[10] || '',
        replacementId: cols[11] || '',

        /* ================= USER ================= */
        changedBy: cols[12] || this.loginId,

        /* ================= CONDITION ================= */
        assetCondition: cols[13] || 'Good',

        /* ================= REMARKS ================= */
        remarks: cols[14] || '',

        /* ================= AUDIT ================= */
        createdBy: cols[15] || this.loginId,
        createdDate: cols[16] || this.getTodayDate(),

        updatedBy: cols[17] || '',
        updatedDate: '',
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
      'success'
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
      const html = result.value;   // ✅ FIXED

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const table = doc.querySelector('table');

      if (!table) {
        this.showToast('No table found in DOCX!', 'warning');
        return;
      }

      const rows = table.querySelectorAll('tr');

      const results: any[] = [];

      rows.forEach((row, rowIndex) => {

        if (rowIndex === 0) return; // skip header

        const cells = Array.from(row.querySelectorAll('td')).map(
          (cell) => cell.textContent?.trim() || ''
        );

        // 🔥 expected columns = 18 (clean structure)
        while (cells.length < 18) cells.push('');

        const newRecord = {

          /* ================= PRIMARY ================= */
          statusChangeId: cells[0] || '0',
          changeNumber: cells[1] || '',

          /* ================= DATE ================= */
          changeDate: cells[2] || this.getTodayDate(),

          /* ================= ASSET ================= */
          assetId: cells[3] || '',
          assetSerialNumber: cells[4] || '',

          /* ================= STATUS ================= */
          oldStatus: cells[5] || '',
          newStatus: cells[6] || '',

          /* ================= DETAILS ================= */
          reasonForStatusChange: cells[7] || '',
          description: cells[8] || '',

          /* ================= REFERENCES ================= */
          allocationId: cells[9] || '',
          callLoggingId: cells[10] || '',
          replacementId: cells[11] || '',

          /* ================= USER ================= */
          changedBy: cells[12] || this.loginId,

          /* ================= CONDITION ================= */
          assetCondition: cells[13] || 'Good',

          /* ================= REMARKS ================= */
          remarks: cells[14] || '',

          /* ================= AUDIT ================= */
          createdBy: cells[15] || this.loginId,
          createdDate: cells[16] || this.getTodayDate(),

          updatedBy: cells[17] || '',
          updatedDate: '',
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
        'success'
      );

    } catch (err) {
      console.error('DOCX Parse Error:', err);
      this.showToast('Failed to read DOCX file!', 'danger');
    }
  };

  reader.readAsArrayBuffer(file);
}

downloadSampleCSV() {

  /* ================= HEADERS (CLEAN STRUCTURE) ================= */
  const headers = [
    'Status Change ID',
    'Change Number',
    'Change Date',

    'Asset ID',
    'Serial Number',

    'Old Status',
    'New Status',

    'Reason',
    'Description',

    'Allocation ID',
    'Call Logging ID',
    'Replacement ID',

    'Changed By',
    'Condition',

    'Remarks',

    'Created By',
    'Created Date',

    'Updated By',
    'Updated Date',
  ];

  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  /* ================= SAMPLE ROW ================= */
  const sampleRow = [
    'ASC-001',
    'ASC-001',
    this.getTodayDate(),

    'A-1001',
    'SN123456',

    'Active',
    'Inactive',

    'Maintenance',
    'Routine check',

    'ALLOC001',
    'CALL001',
    '',

    'EMP001',
    'Good',

    'Working fine',

    'Admin',
    this.getTodayDate(),

    '',
    '',
  ];

  csvRows.push(sampleRow.join(','));

  /* ================= OPTIONAL: EXISTING DATA ================= */
  this.tableData.forEach((row: any) => {

    const rowData = [
      row.statusChangeId || '',
      row.changeNumber || '',
      row.changeDate || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.oldStatus || '',
      row.newStatus || '',

      row.reasonForStatusChange || '',
      row.description || '',

      row.allocationId || '',
      row.callLoggingId || '',
      row.replacementId || '',

      row.changedBy || '',
      row.assetCondition || '',

      row.remarks || '',

      row.createdBy || '',
      row.createdDate || '',

      row.updatedBy || '',
      row.updatedDate || '',
    ];

    csvRows.push(rowData.join(','));
  });

  /* ================= CREATE FILE ================= */
  const csvString = '\ufeff' + csvRows.join('\n');

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
      const rowDate = this.parseDDMMYYYY(row.createdDate);
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
exportCSVfile(data: any[]) {

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

  /* ================= HEADERS (CLEAN) ================= */
  const headers = [
    'Status Change ID',
    'Change Number',
    'Change Date',

    'Asset ID',
    'Serial Number',

    'Old Status',
    'New Status',

    'Reason',
    'Description',

    'Allocation ID',
    'Call Logging ID',
    'Replacement ID',

    'Changed By',
    'Condition',

    'Remarks',

    'Created By',
    'Created Date',

    'Updated By',
    'Updated Date',
  ];

  csvRows.push(headers.join(','));

  /* ================= SAFE VALUE ================= */
  const safe = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  /* ================= DATA ================= */
  data.forEach((row: any) => {

    const rowData = [
      safe(row.statusChangeId),
      safe(row.changeNumber),
      safe(row.changeDate),

      safe(row.assetId),
      safe(row.assetSerialNumber),

      safe(row.oldStatus),
      safe(row.newStatus),

      safe(row.reasonForStatusChange),
      safe(row.description),

      safe(row.allocationId),
      safe(row.callLoggingId),
      safe(row.replacementId),

      safe(row.changedBy),
      safe(row.assetCondition),

      safe(row.remarks),

      safe(row.createdBy),
      safe(row.createdDate),

      safe(row.updatedBy),
      safe(row.updatedDate),
    ];

    csvRows.push(rowData.join(','));
  });

  /* ================= CREATE FILE ================= */
  const csvString = '\ufeff' + csvRows.join('\n');

  const blob = new Blob([csvString], {
    type: 'text/csv;charset=utf-8;',
  });

  const fileName = `Asset_Status_Change_Report_${today.toISOString().split('T')[0]}.csv`;

  saveAs(blob, fileName);
}

  // ---------------- Excel Export ----------------
exportExcelfile(data: any[]) {

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

    /* HEADERS (CLEAN) */
    [
      'Status Change ID',
      'Change Number',
      'Change Date',

      'Asset ID',
      'Serial Number',

      'Old Status',
      'New Status',

      'Reason',
      'Description',

      'Allocation ID',
      'Call Logging ID',
      'Replacement ID',

      'Changed By',
      'Condition',

      'Remarks',

      'Created By',
      'Created Date',

      'Updated By',
      'Updated Date',
    ],
  ];

  /* ================= DATA ================= */
  data.forEach((row: any) => {
    wsData.push([

      row.statusChangeId || '',
      row.changeNumber || '',
      row.changeDate || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.oldStatus || '',
      row.newStatus || '',

      row.reasonForStatusChange || '',
      row.description || '',

      row.allocationId || '',
      row.callLoggingId || '',
      row.replacementId || '',

      row.changedBy || '',
      row.assetCondition || '',

      row.remarks || '',

      row.createdBy || '',
      row.createdDate || '',

      row.updatedBy || '',
      row.updatedDate || '',
    ]);
  });

  /* ================= CREATE SHEET ================= */
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  /* ================= AUTO COLUMN WIDTH ================= */
  const headerRow = wsData[4];

  worksheet['!cols'] = headerRow.map((col, i) => ({
    wch: Math.max(
      String(col).length + 5,
      ...data.map((row: any) =>
        String(Object.values(row)[i] || '').length + 2
      )
    ),
  }));

  /* ================= WORKBOOK ================= */
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Asset Status Change Report'
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
exportPDFfile(data: any[]) {

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
    45
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

    head: [[
      'ID',
      'Number',
      'Date',

      'Asset ID',
      'Serial',

      'Old Status',
      'New Status',

      'Reason',
      'Description',

      'Allocation',
      'Call',
      'Replacement',

      'Changed By',
      'Condition',

      'Remarks',

      'Created',
      'Updated'
    ]],

    body: data.map((row: any) => [

      row.statusChangeId || '',
      row.changeNumber || '',
      row.changeDate || '',

      row.assetId || '',
      row.assetSerialNumber || '',

      row.oldStatus || '',
      row.newStatus || '',

      row.reasonForStatusChange || '',
      row.description || '',

      row.allocationId || '',
      row.callLoggingId || '',
      row.replacementId || '',

      row.changedBy || '',
      row.assetCondition || '',

      row.remarks || '',

      row.createdDate || '',
      row.updatedDate || '',
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
      fillColor: [245, 245, 245],
    },

    margin: { left: 20, right: 20 },

    didDrawPage: (dataArg) => {

      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageSize = doc.internal.pageSize;

      doc.setFontSize(8);
      doc.text(
        `Page ${dataArg.pageNumber} of ${pageCount}`,
        pageWidth - 40,
        pageSize.height - 10
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
