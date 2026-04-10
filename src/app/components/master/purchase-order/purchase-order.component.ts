/*
 **************************************************************************************
 * Program Name  : PurchaseOrderComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 05, 2026
 * System Name   : gswbs
 *
 * Purpose       : Angular Component for Purchase Order Management.
 *
 * Description   : This component handles Purchase Order lifecycle:
 *                 - Create / Update / Delete Purchase Orders
 *                 - Vendor & Asset Mapping (Type, Make, Model)
 *                 - Financial Calculations (Subtotal, GST, Discount, Total)
 *                 - Bulk Import (Excel, DOCX, PDF)
 *                 - Bulk Export (CSV, Excel, PDF, DOC)
 *                 - Search, Sorting, Pagination
 *                 - Date Range Filtering
 *
 * Features      :
 *   - Auto calculation of totals (GST, Discount, Balance)
 *   - Multi-record form handling
 *   - API integration using CommonService
 *   - File parsing using XLSX, Mammoth, PDF.js
 *   - Toast notifications
 *
 * Endpoints Used:
 *   - GET    /purchase-order/getAll
 *   - POST   /purchase-order/saveAll
 *   - PUT    /purchase-order/update/{id}
 *   - POST   /purchase-order/delete-multiple
 *   - POST   /purchase-order/import
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

export interface TableRow {

  purchaseOrderId: string;

  /* BASIC DETAILS */
  purchaseOrderNumber: string;
  purchaseOrderDate: string;
  expectedDeliveryDate: string;

  vendorId: string;
  vendorName: string;
  vendorContact: string;
  vendorGSTNo: string;
  shippingAddress: string;

  /* ASSET DETAILS */
  assetType: string;
  assetMake: string;
  assetModel: string;

  /* QUANTITY & PRICING */
  quantity: number;
  unitPrice: number;
  discount: number;
  gst: number;

  /* CALCULATED */
  subTotal: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  advancePaid: number;
  balanceAmount: number;

  /* PAYMENT */
  paymentStatus: string;
  paymentMode: string;
  transactionReference: string;
  paymentDueDate: string;

  /* APPROVAL */
  approvedBy: string;
  approvedDate: string;
  remarks: string;
  poStatus: string;

  /* AUDIT */
  createdBy: string;
  createdDate: string;
  updatedDate: string;

  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-purchase-order',
  standalone: false,
  templateUrl: './purchase-order.component.html',
  styleUrl: './purchase-order.component.css',
})
export class PurchaseOrderComponent implements OnInit {
  // session variable
  activeForm: number = 0;
  departments: any[] = [];
  designations: any[] = [];
  token: string | null = null;
  userName: any | null = null;
  headCompanyName: any | null = null;
  userRoles: string | null = null;
  date: string | null = null;
  headCompanyId: any | null = null;
  showViewModal: boolean = false;
  selectedRow: TableRow | null = null;
  activeTab = 'details';
  today = new Date();

  purchaseOrders: TableRow[] = [];
  searchText: string = '';
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  currentDate: any | null = null;
  assetTypes: any[] = [];
  assetMakes: any[] = [];
  assetModels: any[] = [];
  loading: any = false;
  loginId: any | null = null;

  tableData: TableRow[] = [];
  filteredData: TableRow[] = [];
  forms: any[] = [];
  constructor(
    private router: Router,
    private toast: NgToastService,
    private authService: AuthService,
    private commonService: CommonService,
  ) {
    this.filteredData = [...this.tableData];
  }
  todayDate: string = '';
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
    this.todayDate = `${yyyy}-${mm}-${dd}`;

    this.initializeForm();
    this.loadPurchaseOrders();
    this.loadAssetTypes();
    this.loadAssetMake();
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }
  paymentModes = [
  { name: 'Cash' },
  { name: 'Bank Transfer' },
  { name: 'UPI' },
  { name: 'Cheque' },
  { name: 'Credit Card' },
  { name: 'Debit Card' }
];
private initializeForm(): void {
  this.forms = [
    {
      // ✅ UI Binding
      purchaseOrderNumber: '',
      purchaseOrderDate: this.currentDate,
      expectedDeliveryDate: '',

      vendorId: '',
      vendorName: '',
      vendorContact: '',
      vendorGSTNo: '',
      shippingAddress: '',

      assetType: '',
      assetMake: '',
      assetModel: '',

      quantity: 0,
      unitPrice: 0,
      discount: 0,
      gst: 0,

      subTotal: 0,
      totalTax: 0,
      totalDiscount: 0,
      grandTotal: 0,

      advancePaid: 0,
      balanceAmount: 0,

      paymentStatus: '',
      paymentMode: '',
      transactionReference: '',
      paymentDueDate: '',

      approvedBy: '',
      approvedDate: '',
      remarks: '',
      poStatus: '',

      createdBy: this.loginId,
      createdDate: this.currentDate,
      updatedDate: '',

      status: 'Active',

      // ✅ Backend Payload
      newRecord: {
        purchaseOrderId: '0',

        purchaseOrderNumber: '',
        purchaseOrderDate: this.currentDate,
        expectedDeliveryDate: '',

        vendorId: '',
        vendorName: '',
        vendorContact: '',
        vendorGSTNo: '',
        shippingAddress: '',

        assetType: '',
        assetMake: '',
        assetModel: '',

        quantity: 0,
        unitPrice: 0,
        discount: 0,
        gst: 0,

        subTotal: 0,
        totalTax: 0,
        totalDiscount: 0,
        grandTotal: 0,

        advancePaid: 0,
        balanceAmount: 0,

        paymentStatus: '',
        paymentMode: '',
        transactionReference: '',
        paymentDueDate: '',

        approvedBy: '',
        approvedDate: '',
        remarks: '',
        poStatus: '',

        createdBy: this.loginId,
        createdDate: this.currentDate,
        updatedDate: '',

        status: 'Active',
      },
    },
  ];
}
  loadPurchaseOrders(): void {
    this.commonService.getAllPurchaseOrderByLoginId(this.loginId).subscribe({
      next: (res: TableRow[]) => {
        this.tableData = res || [];
        this.filteredData = [...this.tableData];
      },

      error: () => {
        this.tableData = [];
        this.filteredData = [];
      },
    });
  }
  loadAssetTypes() {
    this.commonService.fetchAssetTypeByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        this.assetTypes = res;
      },

      error: (err) => {
        console.error(err);
      },
    });
  }
  loadAssetMake(): void {
    if (!this.loginId) {
      console.error('Login ID missing!');
      return;
    }

    this.commonService.fetchAllAssetMakeByLoginId(this.loginId).subscribe({
      next: (res: any[]) => {
        console.log('Asset Make Response:', res);

        this.assetMakes = res || [];
      },

      error: (err) => {
        console.error('Asset Make API Error:', err);
        this.assetMakes = [];
      },
    });
  }
  loadAssetModels(): void {
    this.commonService.getAllPurchaseOrderByLoginId(this.loginId).subscribe({
      next: (res: any) => {
        this.assetModels = res || [];
      },

      error: () => {
        this.assetModels = [];
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

    // 🔹 Collect purchaseOrderIds
    const ids: string[] = this.selectedRows.map((row) => row.purchaseOrderId);

    this.commonService.deleteMultiplePurchaseOrders(ids).subscribe({
      next: () => {
        // Remove deleted rows from UI table
        this.tableData = this.tableData.filter(
          (row) => !ids.includes(row.purchaseOrderId),
        );

        this.filteredData = [...this.tableData];

        this.selectedRows = [];
        this.currentPage = 1;

        // reload from API
        this.loadPurchaseOrders();

        this.toast.success(
          'Selected Purchase Orders deleted successfully!',
          'SUCCESS',
          4000,
        );
      },

      error: (err) => {
        console.error('Delete Purchase Order Error:', err);

        this.toast.danger('Failed to delete purchase orders!', 'ERROR', 4000);
      },
    });
  }
  //  calculateAge(dob: string, index: number) {
  //    if (!dob) return;
  //
  //    const birthDate = new Date(dob);
  //    const today = new Date();
  //
  //    let age = today.getFullYear() - birthDate.getFullYear();
  //
  //    const m = today.getMonth() - birthDate.getMonth();
  //
  //    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
  //      age--;
  //    }
  //
  //    this.forms[index].newRecord.age = age;
  //  }
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
  const wsData: any[] = [];

  wsData.push([this.headCompanyName || 'Company Name']);

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  wsData.push(['Date:', formattedDate]);
  wsData.push([]);

  // ✅ HEADER (same as before ok)
  wsData.push([
    'PO ID',
    'PO Number',
    'Expected Delivery Date',
    'Vendor Name',
    'Vendor Contact',
    'Vendor GST No',
    'Shipping Address',
    'Asset Type',
    'Asset Make',
    'Asset Model',
    'Quantity',
    'Unit Price',
    'Discount %',
    'GST %',
    'Sub Total',
    'Total Discount',
    'Total Tax',
    'Grand Total',
    'Advance Paid',
    'Balance Amount',
    'Approved By',
    'Approved Date',
    'Remarks',
    'Payment Status',
    'Payment Mode',
    'Transaction Reference',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ]);

  // ✅ DATA MAPPING (FIXED)
  this.tableData.forEach((row) => {
    wsData.push([
      row.purchaseOrderId,
      row.purchaseOrderNumber,
      row.expectedDeliveryDate,

      row.vendorName,
      row.vendorContact,
      row.vendorGSTNo,
      row.shippingAddress,

      row.assetType,
      row.assetMake,
      row.assetModel,

      row.quantity,
      row.unitPrice,
      row.discount,
      row.gst,

      row.subTotal,
      row.totalDiscount,
      row.totalTax,
      row.grandTotal,

      row.advancePaid,
      row.balanceAmount,

      row.approvedBy,
      row.approvedDate,
      row.remarks,

      row.paymentStatus,
      row.paymentMode,
      row.transactionReference,

      row.createdDate,
      row.updatedDate,
      row.createdBy,

      row.status,
    ]);
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // ✅ Column width (same use karu shakto)
  worksheet['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 18 },
    { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 10 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Purchase_Order_Report.xlsx');
}
exportDoc() {
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  let content = `
  <html>
    <head>
      <style>

        body{
          font-family: Arial, sans-serif;
        }

        h2{
          text-align:center;
          font-size:26px;
          color:#00468c;
          margin-bottom:2px;
          font-weight:bold;
          text-decoration: underline;
        }

        .header-info{
          display:flex;
          justify-content:space-between;
          font-size:16px;
          font-weight:bold;
          margin:5px 0 10px 0;
          width:100%;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:5px;
        }

        th{
          background:#0066cc;
          color:white;
          padding:8px;
          font-size:14px;
          border:1px solid #000;
          text-align:center;
        }

        td{
          background:#ffffff;
          padding:8px;
          border:1px solid #000;
          font-size:14px;
          text-align:center;
        }

        .status-active{
          color:green;
          font-weight:bold;
        }

        .status-inactive{
          color:red;
          font-weight:bold;
        }

      </style>
    </head>

    <body>

      <h2>Purchase Order Records</h2>

      <div class="header-info">
        <div>${this.headCompanyName || ''}</div>
        <div>${formattedDate}</div>
      </div>

      <table>

        <tr>
          <th>PO ID</th>
          <th>PO Number</th>
          <th>Vendor Name</th>
          <th>Asset Type</th>
          <th>Asset Make</th>
          <th>Asset Model</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>GST %</th>
          <th>Grand Total</th>
          <th>Payment Status</th>
          <th>Status</th>
        </tr>
  `;

  this.tableData.forEach((row) => {
    const statusClass =
      row.status === 'Active'
        ? 'status-active'
        : 'status-inactive';

    const statusIcon = row.status === 'Active' ? '✔️' : '❌';

    content += `
      <tr>
        <td>${row.purchaseOrderId}</td>
        <td>${row.purchaseOrderNumber}</td>
        <td>${row.vendorName}</td>
        <td>${row.assetType}</td>
        <td>${row.assetMake}</td>
        <td>${row.assetModel}</td>
        <td>${row.quantity}</td>
        <td>${row.unitPrice}</td>
        <td>${row.gst}</td>
        <td>${row.grandTotal}</td>
        <td>${row.paymentStatus}</td>
        <td class="${statusClass}">
          ${statusIcon} ${row.status}
        </td>
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

  saveAs(blob, 'Purchase_Order_Report.doc');
}
exportPDF() {
  const doc = new jsPDF('l', 'pt', 'a4'); // landscape

  // ⭐ TITLE
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Purchase Order Records', titleX, 60, { align: 'center' });

  const titleWidth = doc.getTextWidth('Purchase Order Records');
  doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

  // ⭐ Company + Date
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);

  const company = this.headCompanyName || 'Company Name';
  const dateStr = new Date().toLocaleDateString();

  doc.text(company, 40, 100);
  doc.text(dateStr, pageWidth - 40, 100, { align: 'right' });

  // ⭐ TABLE
  autoTable(doc, {
    startY: 120,

    head: [
      [
        'PO ID',
        'PO Number',
        'Vendor Name',
        'Asset Type',
        'Asset Make',
        'Asset Model',
        'Qty',
        'Unit Price',
        'Discount %',
        'GST %',
        'Sub Total',
        'Total Tax',
        'Grand Total',
        'Payment Status',
        'Status',
      ],
    ],

    body: this.tableData.map((row) => [
      row.purchaseOrderId,
      row.purchaseOrderNumber,
      row.vendorName,
      row.assetType,
      row.assetMake,
      row.assetModel,
      row.quantity,
      row.unitPrice,
      row.discount,
      row.gst,
      row.subTotal,
      row.totalTax,
      row.grandTotal,
      row.paymentStatus,
      row.status,
    ]),

    theme: 'grid',

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: [255, 255, 255],
      halign: 'center',
      fontSize: 11,
    },

    bodyStyles: {
      fontSize: 10,
      halign: 'center',
      textColor: [0, 0, 0],
    },

    styles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      valign: 'middle',
    },
  });

  doc.save('Purchase_Order_Report.pdf');
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
  // New record
 newRecord: TableRow = {

  purchaseOrderId: '',

  /* BASIC */
  purchaseOrderNumber: '',
  purchaseOrderDate: '',
  expectedDeliveryDate: '',

  vendorId: '',
  vendorName: '',
  vendorContact: '',
  vendorGSTNo: '',
  shippingAddress: '',

  /* ASSET */
  assetType: '',
  assetMake: '',
  assetModel: '',

  /* QUANTITY & PRICING */
  quantity: 0,
  unitPrice: 0,
  discount: 0,
  gst: 0,

  /* CALCULATED */
  subTotal: 0,
  totalTax: 0,
  totalDiscount: 0,
  grandTotal: 0,
  advancePaid: 0,
  balanceAmount: 0,

  /* PAYMENT */
  paymentStatus: '',
  paymentMode: '',
  transactionReference: '',
  paymentDueDate: '',

  /* APPROVAL */
  approvedBy: '',
  approvedDate: '',
  remarks: '',
  poStatus: '',

  /* AUDIT */
  createdBy: '',
  createdDate: '',
  updatedDate: '',

  status: 'Active'
};
  isEditMode: boolean = false;
  editIndex: number | null = null;

onEdit(row: TableRow, index: number) {
  this.activeTab = 'newRecord';
  this.isEditMode = true;
  this.editIndex = index;

  this.forms = [
    {
      newRecord: {
        purchaseOrderId: row.purchaseOrderId,

        /* BASIC */
        purchaseOrderNumber: row.purchaseOrderNumber,
        purchaseOrderDate: row.purchaseOrderDate,
        expectedDeliveryDate: row.expectedDeliveryDate,

        vendorId: row.vendorId,
        vendorName: row.vendorName,
        vendorContact: row.vendorContact,
        vendorGSTNo: row.vendorGSTNo,
        shippingAddress: row.shippingAddress,

        /* ASSET */
        assetType: row.assetType,
        assetMake: row.assetMake,
        assetModel: row.assetModel,

        /* QUANTITY & PRICING */
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        discount: row.discount,
        gst: row.gst,

        /* CALCULATED */
        subTotal: row.subTotal,
        totalTax: row.totalTax,
        totalDiscount: row.totalDiscount,
        grandTotal: row.grandTotal,
        advancePaid: row.advancePaid,
        balanceAmount: row.balanceAmount,

        /* PAYMENT */
        paymentStatus: row.paymentStatus,
        paymentMode: row.paymentMode,
        transactionReference: row.transactionReference,
        paymentDueDate: row.paymentDueDate,

        /* APPROVAL */
        approvedBy: row.approvedBy,
        approvedDate: row.approvedDate,
        remarks: row.remarks,
        poStatus: row.poStatus,

        /* AUDIT */
        createdBy: row.createdBy,
        createdDate: row.createdDate,
        updatedDate: row.updatedDate,

        status: row.status,
      },
    },
  ];
}
saveAllRecords(form?: NgForm) {

  // ---------------- VALIDATION ----------------
  const invalid = this.forms.some(
    (f) =>
      !f.newRecord.purchaseOrderNumber?.trim() ||
      !f.newRecord.vendorName?.trim() ||
      !f.newRecord.assetType?.trim() ||
      !f.newRecord.assetMake?.trim() ||
      !f.newRecord.assetModel?.trim() ||
      !f.newRecord.quantity ||
      !f.newRecord.unitPrice ||
      !f.newRecord.paymentStatus?.trim() ||
      !f.newRecord.status?.trim()
  );

  if (invalid) {
    this.showErrors = true;
    this.toast.warning('Please fill all required fields!', 'error', 4000);
    return;
  }

  // ================= EDIT MODE =================
  if (this.isEditMode && this.editIndex !== null) {

    const f = this.forms[0].newRecord;

    const payload = {

      purchaseOrderNumber: f.purchaseOrderNumber,
      purchaseOrderDate: f.purchaseOrderDate,
      expectedDeliveryDate: f.expectedDeliveryDate,

      vendorId: f.vendorId,
      vendorName: f.vendorName,
      vendorContact: f.vendorContact,
      vendorGSTNo: f.vendorGSTNo,
      shippingAddress: f.shippingAddress,

      assetType: f.assetType,
      assetMake: f.assetMake,
      assetModel: f.assetModel,

      // ✅ FORCE NUMBER
      quantity: Number(f.quantity),
      unitPrice: Number(f.unitPrice),
      discount: Number(f.discount),
      gst: Number(f.gst),

      subTotal: Number(f.subTotal),
      totalTax: Number(f.totalTax),
      totalDiscount: Number(f.totalDiscount),
      grandTotal: Number(f.grandTotal),

      advancePaid: Number(f.advancePaid),
      balanceAmount: Number(f.balanceAmount),

      paymentStatus: f.paymentStatus,
      paymentMode: f.paymentMode,
      transactionReference: f.transactionReference,

      // ✅ DATE FIX
      paymentDueDate: f.paymentDueDate || null,
      approvedBy: f.approvedBy,
      approvedDate: f.approvedDate || null,

      remarks: f.remarks,
      poStatus: f.poStatus,

      // ❌ REMOVE createdDate (backend auto set karto)
      // ❌ REMOVE updatedDate (backend auto set karto)

      createdBy: this.loginId,
      status: f.status
    };

    const purchaseOrderId = this.tableData[this.editIndex].purchaseOrderId;

    this.commonService.updatePurchaseOrder(purchaseOrderId, payload).subscribe({
      next: () => {
        this.toast.success('Purchase Order Updated Successfully!', 'success', 4000);
        this.resetAfterSave();
        this.loadPurchaseOrders();
      },
      error: (err) => {
        console.error('UPDATE ERROR:', err);
        this.toast.danger('Update failed!', 'error', 4000);
      },
    });

    return;
  }

  // ================= ADD MODE =================
  const payload = this.forms.map((f) => ({

    purchaseOrderId: '0',

    purchaseOrderNumber: f.newRecord.purchaseOrderNumber,
    purchaseOrderDate: f.newRecord.purchaseOrderDate,
    expectedDeliveryDate: f.newRecord.expectedDeliveryDate,

    vendorId: f.newRecord.vendorId,
    vendorName: f.newRecord.vendorName,
    vendorContact: f.newRecord.vendorContact,
    vendorGSTNo: f.newRecord.vendorGSTNo,
    shippingAddress: f.newRecord.shippingAddress,

    assetType: f.newRecord.assetType,
    assetMake: f.newRecord.assetMake,
    assetModel: f.newRecord.assetModel,

    // ✅ NUMBER FIX
    quantity: Number(f.newRecord.quantity),
    unitPrice: Number(f.newRecord.unitPrice),
    discount: Number(f.newRecord.discount),
    gst: Number(f.newRecord.gst),

    subTotal: Number(f.newRecord.subTotal),
    totalTax: Number(f.newRecord.totalTax),
    totalDiscount: Number(f.newRecord.totalDiscount),
    grandTotal: Number(f.newRecord.grandTotal),

    advancePaid: Number(f.newRecord.advancePaid),
    balanceAmount: Number(f.newRecord.balanceAmount),

    paymentStatus: f.newRecord.paymentStatus,
    paymentMode: f.newRecord.paymentMode,
    transactionReference: f.newRecord.transactionReference,

    // ✅ DATE FIX
    paymentDueDate: f.newRecord.paymentDueDate || null,
    approvedBy: f.newRecord.approvedBy,
    approvedDate: f.newRecord.approvedDate || null,

    remarks: f.newRecord.remarks,
    poStatus: f.newRecord.poStatus,

    // ❌ REMOVE createdDate & updatedDate
    createdBy: this.loginId,

    status: f.newRecord.status
  }));

  console.log('FINAL PAYLOAD:', JSON.stringify(payload, null, 2));

  this.commonService.submitPurchaseOrder(payload).subscribe({
    next: (res) => {

      if (res?.dublicateMessages?.length) {
        res.dublicateMessages.forEach((msg: string) =>
          this.toast.warning(msg, 'warning', 4000)
        );
      }

      this.toast.success('Purchase Order Added Successfully!', 'success', 4000);

      this.resetAfterSave();
      this.loadPurchaseOrders();
    },

    error: (err) => {
      console.error('SAVE ERROR:', err);
      this.toast.danger('Save failed. Backend error!', 'error', 4000);
    },
  });
}
resetAfterSave() {
  this.forms = [
    {
      newRecord: {

        purchaseOrderId: '',

        /* BASIC */
        purchaseOrderNumber: '',
        purchaseOrderDate: this.currentDate || '',
        expectedDeliveryDate: '',

        vendorId: '',
        vendorName: '',
        vendorContact: '',
        vendorGSTNo: '',
        shippingAddress: '',

        /* ASSET */
        assetType: '',
        assetMake: '',
        assetModel: '',

        /* QUANTITY & PRICING */
        quantity: 0,
        unitPrice: 0,
        discount: 0,
        gst: 0,

        /* CALCULATED */
        subTotal: 0,
        totalTax: 0,
        totalDiscount: 0,
        grandTotal: 0,

        advancePaid: 0,
        balanceAmount: 0,

        /* PAYMENT */
        paymentStatus: '',
        paymentMode: '',
        transactionReference: '',
        paymentDueDate: '',

        /* APPROVAL */
        approvedBy: '',
        approvedDate: '',
        remarks: '',
        poStatus: '',

        /* AUDIT */
        createdDate: this.currentDate || '',
        updatedDate: '',
        createdBy: this.loginId,

        status: 'Active',
      },
    },
  ];

  this.isEditMode = false;
  this.editIndex = null;
  this.activeTab = 'details';
  this.showErrors = false;
}
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
    newRecord: {

      purchaseOrderId: '0',

      /* BASIC */
      purchaseOrderNumber: '',
      purchaseOrderDate: currentDate,
      expectedDeliveryDate: '',

      vendorId: '',
      vendorName: '',
      vendorContact: '',
      vendorGSTNo: '',
      shippingAddress: '',

      /* ASSET */
      assetType: '',
      assetMake: '',
      assetModel: '',

      /* QUANTITY & PRICING */
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      gst: 0,

      /* CALCULATED */
      subTotal: 0,
      totalTax: 0,
      totalDiscount: 0,
      grandTotal: 0,

      advancePaid: 0,
      balanceAmount: 0,

      /* PAYMENT */
      paymentStatus: '',
      paymentMode: '',
      transactionReference: '',
      paymentDueDate: '',

      /* APPROVAL */
      approvedBy: '',
      approvedDate: '',
      remarks: '',
      poStatus: '',

      /* AUDIT */
      createdDate: currentDate,
      updatedDate: '',
      createdBy: this.loginId,

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
      newRecord: {

        purchaseOrderId: '0',

        /* BASIC */
        purchaseOrderNumber: '',
        purchaseOrderDate: currentDate,
        expectedDeliveryDate: '',

        vendorId: '',
        vendorName: '',
        vendorContact: '',
        vendorGSTNo: '',
        shippingAddress: '',

        /* ASSET */
        assetType: '',
        assetMake: '',
        assetModel: '',

        /* QUANTITY & PRICING */
        quantity: 0,
        unitPrice: 0,
        discount: 0,
        gst: 0,

        /* CALCULATED */
        subTotal: 0,
        totalTax: 0,
        totalDiscount: 0,
        grandTotal: 0,

        advancePaid: 0,
        balanceAmount: 0,

        /* PAYMENT */
        paymentStatus: '',
        paymentMode: '',
        transactionReference: '',
        paymentDueDate: '',

        /* APPROVAL */
        approvedBy: '',
        approvedDate: '',
        remarks: '',
        poStatus: '',

        /* AUDIT */
        createdDate: currentDate,
        updatedDate: '',
        createdBy: this.loginId,

        status: 'Active',
      },
    };
  }

  if (form) {
    form.resetForm();
  }

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

  //editForm(index: number) {
  //  this.isEditMode = true;
  //  this.forms[index].isEdit = true;
  //}
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
        item.purchaseOrdercreatedDate,
        this.startDate,
        this.endDate,
      ),
    );
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.toast.warning('Please select a file first!', 'Warning', 4000);
      return;
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedTypes.includes(this.selectedFile.type)) {
      this.toast.danger(
        'Only Excel files (.xlsx, .xls) are allowed!',
        'Error',
        4000,
      );

      return;
    }

    this.loading = true;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('loginId', this.loginId);

    // ✅ Purchase Order API
    this.commonService.uploadPurchaseOrderExcel(formData).subscribe({
      next: (res: any) => {
        this.loading = false;

        // reload table
        this.loadPurchaseOrders();

        const count = res?.length || res?.data?.length || 0;

        this.toast.success(
          `Imported ${count} Purchase Orders successfully!`,
          'Success',
          4000,
        );

        this.selectedFile = null;
      },

      error: (err) => {
        this.loading = false;

        console.error('Purchase Order Excel Upload Error:', err);

        this.toast.danger(
          'Import failed. Please check the Excel format.',
          'Error',
          4000,
        );
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
  //       departmentId: values[headers.indexOf('id')] || '',
  //       departmentName: values[headers.indexOf('department name')] || '',
  //       headCompanyName: values[headers.indexOf('company name')] || '',
  //       departmentPhone: values[headers.indexOf('phone number')] || '',
  //       departmentCreateDate: values[headers.indexOf('date')] || '',
  //       departmentCurrentEmployee: values[headers.indexOf('employee')] || '0',
  //       purchaseOrderstatus: values[headers.indexOf('purchaseOrderstatus')] || 'Active',
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

    const newRows: TableRow[] = [];

    json.forEach((obj: any) => {

      const quantity = Number(obj['Quantity'] || 0);
      const unitPrice = Number(obj['Unit Price'] || 0);
      const discount = Number(obj['Discount %'] || 0);
      const gst = Number(obj['GST %'] || 0);

      const subTotal = quantity * unitPrice;
      const totalDiscount = (subTotal * discount) / 100;
      const taxableAmount = subTotal - totalDiscount;
      const totalTax = (taxableAmount * gst) / 100;
      const grandTotal = taxableAmount + totalTax;

      const advancePaid = Number(obj['Advance Paid'] || 0);
      const balanceAmount = grandTotal - advancePaid;

      const row: TableRow = {

        purchaseOrderId: obj['PO ID'] || '',

        /* BASIC */
        purchaseOrderNumber: obj['PO Number'] || '',
        purchaseOrderDate: obj['PO Date'] || '',
        expectedDeliveryDate: obj['Expected Delivery Date'] || '',

        vendorId: '',
        vendorName: obj['Vendor Name'] || '',
        vendorContact: obj['Vendor Contact No'] || '',
        vendorGSTNo: obj['Vendor GST No'] || '',
        shippingAddress: obj['Shipping Address'] || '',

        /* ASSET */
        assetType: obj['Asset Type'] || '',
        assetMake: obj['Asset Make'] || '',
        assetModel: obj['Asset Model'] || '',

        /* PRICING */
        quantity: quantity,
        unitPrice: unitPrice,
        discount: discount,
        gst: gst,

        /* CALCULATED */
        subTotal: subTotal,
        totalDiscount: totalDiscount,
        totalTax: totalTax,
        grandTotal: grandTotal,

        advancePaid: advancePaid,
        balanceAmount: balanceAmount,

        /* PAYMENT */
        paymentStatus: obj['Payment Status'] || 'Pending',
        paymentMode: obj['Payment Mode'] || '',
        transactionReference: obj['Transaction Reference'] || '',
        paymentDueDate: obj['Payment Due Date'] || '',

        /* APPROVAL */
        approvedBy: obj['Approved By'] || '',
        approvedDate: obj['Approved Date'] || '',
        remarks: obj['Remarks'] || '',
        poStatus: '',

        /* AUDIT */
        createdDate:
          obj['Created Date'] || new Date().toISOString().split('T')[0],
        updatedDate: obj['Updated Date'] || '',
        createdBy: obj['Created By'] || 'System',

        status: obj['Status'] || 'Active',
      };

      newRows.push(row);
    });

    this.tableData = [...this.tableData, ...newRows];
    this.filteredData = [...this.tableData];

    this.toast.success(
      `${newRows.length} Purchase Orders imported successfully!`,
      'Success',
      4000
    );
  };

  reader.readAsBinaryString(file);
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
  const newRows: TableRow[] = [];

  rows.forEach((row, i) => {
    if (i === 0) return;

    const cells = Array.from(row.querySelectorAll('td')).map(
      (c) => c.textContent?.trim() || ''
    );

    const quantity = Number(cells[10] || 0);
    const unitPrice = Number(cells[11] || 0);
    const discount = Number(cells[12] || 0);
    const gst = Number(cells[13] || 0);

    const subTotal = quantity * unitPrice;
    const totalDiscount = (subTotal * discount) / 100;
    const taxableAmount = subTotal - totalDiscount;
    const totalTax = (taxableAmount * gst) / 100;

    const shippingCharges = Number(cells[16] || 0);
    const grandTotal = taxableAmount + totalTax + shippingCharges;

    const advancePaid = Number(cells[18] || 0);
    const balanceAmount = grandTotal - advancePaid;

    const newRecord: TableRow = {

      purchaseOrderId: cells[0] || '',

      /* BASIC */
      purchaseOrderNumber: cells[1] || '',
      purchaseOrderDate: '',
      expectedDeliveryDate: cells[2] || '',

      vendorId: '',
      vendorName: cells[3] || '',
      vendorContact: cells[4] || '',
      vendorGSTNo: cells[5] || '',
      shippingAddress: cells[6] || '',

      /* ASSET */
      assetType: cells[7] || '',
      assetMake: cells[8] || '',
      assetModel: cells[9] || '',

      /* PRICING */
      quantity: quantity,
      unitPrice: unitPrice,
      discount: discount,
      gst: gst,

      /* CALCULATED */
      subTotal: subTotal,
      totalDiscount: totalDiscount,
      totalTax: totalTax,
      grandTotal: grandTotal,

      advancePaid: advancePaid,
      balanceAmount: balanceAmount,

      /* PAYMENT */
      paymentStatus: cells[23] || '',
      paymentMode: cells[24] || '',
      transactionReference: cells[25] || '',
      paymentDueDate: '',

      /* APPROVAL */
      approvedBy: cells[20] || '',
      approvedDate: cells[21] || '',
      remarks: cells[22] || '',
      poStatus: '',

      /* AUDIT */
      createdDate: cells[26] || '',
      updatedDate: cells[27] || '',
      createdBy: cells[28] || '',

      status: (cells[29] as 'Active' | 'Inactive') || 'Active',
    };

    newRows.push(newRecord);
  });

  this.tableData = [...this.tableData, ...newRows];
  this.filteredData = [...this.tableData];

  this.toast.success(
    `${newRows.length} Purchase Orders imported from DOCX!`,
    'Success',
    4000
  );
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

  // Fix corrupted words
  fullText = fullText.replace(/A[cç][^\s]*ve/gi, 'Active');
  fullText = fullText.replace(/In[cç][^\s]*ve/gi, 'Inactive');

  // Clean header
  fullText = fullText.replace(/\s+/g, ' ').trim();

  const rowRegex =
    /(\d+)\s+(PO\d+)\s+([A-Za-z]+)\s+([A-Za-z]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(Active|Inactive)/g;

  let match;
  const newRows: TableRow[] = [];

  while ((match = rowRegex.exec(fullText)) !== null) {

    const quantity = Number(match[5]);
    const unitPrice = Number(match[6]);
    const gst = Number(match[7]);

    const subTotal = quantity * unitPrice;
    const totalTax = (subTotal * gst) / 100;
    const grandTotal = subTotal + totalTax;

    const row: TableRow = {

      purchaseOrderId: match[1],

      /* BASIC */
      purchaseOrderNumber: match[2],
      purchaseOrderDate: '',
      expectedDeliveryDate: '',

      vendorId: '',
      vendorName: match[3],
      vendorContact: '',
      vendorGSTNo: '',
      shippingAddress: '',

      /* ASSET */
      assetType: match[4],
      assetMake: '',
      assetModel: '',

      /* PRICING */
      quantity: quantity,
      unitPrice: unitPrice,
      discount: 0,
      gst: gst,

      /* CALCULATED */
      subTotal: subTotal,
      totalDiscount: 0,
      totalTax: totalTax,
      grandTotal: grandTotal,

      advancePaid: 0,
      balanceAmount: grandTotal,

      /* PAYMENT */
      paymentStatus: '',
      paymentMode: '',
      transactionReference: '',
      paymentDueDate: '',

      /* APPROVAL */
      approvedBy: '',
      approvedDate: '',
      remarks: '',
      poStatus: '',

      /* AUDIT */
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: '',
      createdBy: 'System',

      status: match[8] as 'Active' | 'Inactive',
    };

    newRows.push(row);
  }

  this.tableData = [...this.tableData, ...newRows];
  this.filteredData = [...this.tableData];

  this.toast.success(
    `${newRows.length} Purchase Orders imported from PDF!`,
    'Success',
    4000
  );
}
  // ---------------- Download Sample CSV ----------------
downloadSampleCSV() {
  if (!this.tableData.length) {
    this.toast.danger('No data to download!', 'Error', 4000);
    return;
  }

  const headers = [
    'PO ID',
    'PO Number',
    'Expected Delivery Date',
    'Vendor Name',
    'Vendor Contact',
    'Vendor GST No',
    'Shipping Address',
    'Asset Type',
    'Asset Make',
    'Asset Model',
    'Quantity',
    'Unit Price',
    'Discount %',
    'GST %',
    'Sub Total',
    'Total Discount',
    'Total Tax',
    'Grand Total',
    'Advance Paid',
    'Balance Amount',
    'Approved By',
    'Approved Date',
    'Remarks',
    'Payment Status',
    'Payment Mode',
    'Transaction Reference',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ];

  const csvRows = [headers.join(',')];

  this.tableData.forEach((row) => {
    const rowData = [
      row.purchaseOrderId,
      row.purchaseOrderNumber,
      row.expectedDeliveryDate,

      row.vendorName,
      row.vendorContact,
      row.vendorGSTNo,
      row.shippingAddress,

      row.assetType,
      row.assetMake,
      row.assetModel,

      row.quantity,
      row.unitPrice,
      row.discount,
      row.gst,

      row.subTotal,
      row.totalDiscount,
      row.totalTax,
      row.grandTotal,

      row.advancePaid,
      row.balanceAmount,

      row.approvedBy,
      row.approvedDate,
      row.remarks,

      row.paymentStatus,
      row.paymentMode,
      row.transactionReference,

      row.createdDate,
      row.updatedDate,
      row.createdBy,

      row.status,
    ];

    csvRows.push(rowData.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'purchase_orders.csv';

  link.click();
  URL.revokeObjectURL(link.href);
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

  // ⭐ Company Name
  csvRows.push(this.headCompanyName || 'Company Name');

  // ⭐ Date
  csvRows.push(`Date:,${formattedDate}`);

  // Empty row
  csvRows.push('');

  // ⭐ Header
  const headers = [
    'PO ID',
    'PO Number',
    'Expected Delivery Date',
    'Vendor Name',
    'Vendor Contact',
    'Vendor GST No',
    'Shipping Address',
    'Asset Type',
    'Asset Make',
    'Asset Model',
    'Quantity',
    'Unit Price',
    'Discount %',
    'GST %',
    'Sub Total',
    'Total Discount',
    'Total Tax',
    'Grand Total',
    'Advance Paid',
    'Balance Amount',
    'Approved By',
    'Approved Date',
    'Remarks',
    'Payment Status',
    'Payment Mode',
    'Transaction Reference',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ];

  csvRows.push(headers.join(','));

  // ⭐ Data rows
  data.forEach((row) => {
    const rowData = [
      row.purchaseOrderId,
      row.purchaseOrderNumber,
      row.expectedDeliveryDate,

      row.vendorName,
      row.vendorContact,
      row.vendorGSTNo,
      row.shippingAddress,

      row.assetType,
      row.assetMake,
      row.assetModel,

      row.quantity,
      row.unitPrice,
      row.discount,
      row.gst,

      row.subTotal,
      row.totalDiscount,
      row.totalTax,
      row.grandTotal,

      row.advancePaid,
      row.balanceAmount,

      row.approvedBy,
      row.approvedDate,
      row.remarks,

      row.paymentStatus,
      row.paymentMode,
      row.transactionReference,

      row.createdDate,
      row.updatedDate,
      row.createdBy,

      row.status,
    ];

    csvRows.push(rowData.join(','));
  });

  // ⭐ Create CSV
  const csvData = csvRows.join('\n');

  const blob = new Blob([csvData], {
    type: 'text/csv;charset=utf-8;',
  });

  saveAs(blob, 'Filtered_Purchase_Order_Report.csv');
}

exportFilteredExcel(data: TableRow[]) {
  const wsData: any[] = [];

  // ⭐ Company Name
  wsData.push([this.headCompanyName || 'Company Name']);

  // ⭐ Date
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  wsData.push(['Date:', formattedDate]);

  // Empty row
  wsData.push([]);

  // ⭐ Header
  wsData.push([
    'PO ID',
    'PO Number',
    'Expected Delivery Date',
    'Vendor Name',
    'Vendor Contact',
    'Vendor GST No',
    'Shipping Address',
    'Asset Type',
    'Asset Make',
    'Asset Model',
    'Quantity',
    'Unit Price',
    'Discount %',
    'GST %',
    'Sub Total',
    'Total Discount',
    'Total Tax',
    'Grand Total',
    'Advance Paid',
    'Balance Amount',
    'Approved By',
    'Approved Date',
    'Remarks',
    'Payment Status',
    'Payment Mode',
    'Transaction Reference',
    'Created Date',
    'Updated Date',
    'Created By',
    'Status',
  ]);

  // ⭐ Data rows
  data.forEach((row) => {
    wsData.push([
      row.purchaseOrderId,
      row.purchaseOrderNumber,
      row.expectedDeliveryDate,

      row.vendorName,
      row.vendorContact,
      row.vendorGSTNo,
      row.shippingAddress,

      row.assetType,
      row.assetMake,
      row.assetModel,

      row.quantity,
      row.unitPrice,
      row.discount,
      row.gst,

      row.subTotal,
      row.totalDiscount,
      row.totalTax,
      row.grandTotal,

      row.advancePaid,
      row.balanceAmount,

      row.approvedBy,
      row.approvedDate,
      row.remarks,

      row.paymentStatus,
      row.paymentMode,
      row.transactionReference,

      row.createdDate,
      row.updatedDate,
      row.createdBy,

      row.status,
    ]);
  });

  // ⭐ Worksheet
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  // ⭐ Column width (same)
  worksheet['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 },
    { wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
    { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 10 },
  ];

  // ⭐ Workbook
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Filtered Purchase Orders'
  );

  // ⭐ Export
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream',
  });

  saveAs(blob, 'Filtered_Purchase_Order_Report.xlsx');
}

exportFilteredPDF(data: TableRow[]) {
  const doc = new jsPDF('l', 'pt', 'a4');

  // ⭐ Title
  doc.setFontSize(22);
  doc.setTextColor(0, 70, 140);

  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = pageWidth / 2;

  doc.text('Purchase Order Records', titleX, 60, { align: 'center' });

  const titleWidth = doc.getTextWidth('Purchase Order Records');
  doc.line(titleX - titleWidth / 2, 65, titleX + titleWidth / 2, 65);

  // ⭐ Company + Date
  doc.setFontSize(14);

  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  doc.text(this.headCompanyName || 'Company Name', 40, 100);
  doc.text(dateStr, pageWidth - 40, 100, { align: 'right' });

  // ⭐ Table
  autoTable(doc, {
    startY: 120,

    head: [[
      'PO ID',
      'PO Number',
      'Expected Delivery Date',
      'Vendor Name',
      'Vendor Contact',
      'Vendor GST No',
      'Shipping Address',
      'Asset Type',
      'Asset Make',
      'Asset Model',
      'Quantity',
      'Unit Price',
      'Discount %',
      'GST %',
      'Sub Total',
      'Total Discount',
      'Total Tax',
      'Grand Total',
      'Advance Paid',
      'Balance Amount',
      'Approved By',
      'Approved Date',
      'Remarks',
      'Payment Status',
      'Payment Mode',
      'Transaction Reference',
      'Created Date',
      'Updated Date',
      'Created By',
      'Status',
    ]],

    body: data.map((row) => [
      row.purchaseOrderId,
      row.purchaseOrderNumber,
      row.expectedDeliveryDate,

      row.vendorName,
      row.vendorContact,
      row.vendorGSTNo,
      row.shippingAddress,

      row.assetType,
      row.assetMake,
      row.assetModel,

      row.quantity,
      row.unitPrice,
      row.discount,
      row.gst,

      row.subTotal,
      row.totalDiscount,
      row.totalTax,
      row.grandTotal,

      row.advancePaid,
      row.balanceAmount,

      row.approvedBy,
      row.approvedDate,
      row.remarks,

      row.paymentStatus,
      row.paymentMode,
      row.transactionReference,

      row.createdDate,
      row.updatedDate,
      row.createdBy,

      row.status,
    ]),

    theme: 'grid',

    headStyles: {
      fillColor: [0, 92, 179],
      textColor: [255, 255, 255],
      halign: 'center',
      fontSize: 10,
    },

    bodyStyles: {
      halign: 'center',
      textColor: [0, 0, 0],
      fontSize: 9,
    },

    styles: {
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      valign: 'middle',
    },

    margin: { top: 120, left: 20, right: 20 },
  });

  doc.save('Filtered_Purchase_Order_Report.pdf');
}
calculateAmounts(index: number) {

  const f = this.forms[index].newRecord;

  const quantity = Number(f.quantity || 0);
  const unitPrice = Number(f.unitPrice || 0);
  const discount = Number(f.discount || 0);
  const gst = Number(f.gst || 0);
  const advance = Number(f.advancePaid || 0);

  // ✅ Sub Total
  f.subTotal = quantity * unitPrice;

  // ✅ Discount
  f.totalDiscount = (f.subTotal * discount) / 100;

  // ✅ Taxable Amount
  const taxableAmount = f.subTotal - f.totalDiscount;

  // ✅ GST Tax
  f.totalTax = (taxableAmount * gst) / 100;

  // ✅ Grand Total
  f.grandTotal = taxableAmount + f.totalTax;

  // ✅ Balance
  f.balanceAmount = f.grandTotal - advance;
}
}
