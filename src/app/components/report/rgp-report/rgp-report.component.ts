import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { NgSelectModule } from '@ng-select/ng-select';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-rgp-report',
  standalone: false,
  templateUrl: './rgp-report.component.html',
  styleUrl: './rgp-report.component.css',
})
export class RgpReportComponent {
  /* ================= HEADER ================= */
  companyName = 'AMC Call Logging';
  companyEmail = 'amccalllogging@gmail.com';
  today = new Date();
  // ================= MASTER DATA =================
  employeeSearchText = '';
  filteredEmployeesForSelect: any[] = [];

  // Employees
  // ================= DEPARTMENTS =================
  departments = [
    { id: 1, name: 'IT' },
    { id: 2, name: 'HR' },
    { id: 3, name: 'Finance' },
  ];

  // ================= EMPLOYEES (Department Wise – 5 each) =================
  // ================= ASSETS =================
  assets = [
    {
      assetId: 'AST101', // ✅ alphanumeric only
      assetName: 'Dell Laptop',
      assetCode: 'AST-101', // ✅ 3 letters - 3 digits
      assetType: 'Laptop',
      departmentId: 1,
      returnDate: '2026-01-10',
    },
    {
      assetId: 'AST102',
      assetName: 'HP Desktop',
      assetCode: 'AST-102',
      assetType: 'Desktop',
      departmentId: 1,
      returnDate: '2026-01-18',
    },
    {
      assetId: 'AST201',
      assetName: 'Canon Printer',
      assetCode: 'AST-201',
      assetType: 'Printer',
      departmentId: 2,
      returnDate: '2026-02-06',
    },
  ];

  // ================= FILTERED EMPLOYEES =================
  filteredEmployees: any[] = [];

  isMultipleEmployee = false;
  // Asset Types
  assetTypes = ['Desktop', 'Laptop', 'Printer', 'Scanner', 'Server'];

  /* ================= TABS ================= */
  activeTab = 'newRecord';
  tabs = [
    { key: 'newRecord', label: 'RGP Report', icon: 'bi bi-plus-circle-fill' },
  ];

  /* ================= FORM STATE ================= */
  reportForm!: FormGroup;

  /* ================= DYNAMIC FORM ================= */
  forms: number[] = [0]; // IMPORTANT (fixes *ngFor error)

  constructor(private fb: FormBuilder) {
    this.createForm();
  }
  generateReportId(): string {
    const d = new Date();
    const date =
      d.getFullYear().toString() +
      ('0' + (d.getMonth() + 1)).slice(-2) +
      ('0' + d.getDate()).slice(-2);

    const rand = Math.floor(100 + Math.random() * 900);

    return `REP-${date}-${rand}`;
  }
  get f() {
    return this.reportForm.controls;
  }

  /* ================= FORM CREATION ================= */
  createForm() {
    this.reportForm = this.fb.group({
      departmentId: ['', Validators.required],

      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],

      assetId: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[a-zA-Z0-9]+$'),
        ],
      ],

      assetName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[a-zA-Z ]+$'),
        ],
      ],

      assetCode: [
        '',
        [
          Validators.required,
          Validators.pattern('^[A-Z]{3}-[0-9]{3}$'), // AST-001
        ],
      ],

      returnDate: ['', Validators.required],

      exportType: ['PDF', Validators.required],
    });
  }

  reportDataList: any[] = [];

  onDepartmentSelect(deptId: number) {
    this.reportForm.patchValue({
      assetId: '',
      assetName: '',
      assetCode: '',
    });
  }

  resetForm() {
    this.reportForm.reset({
      exportType: 'PDF',
      departmentId: '',
      fromDate: '',
      toDate: '',
      assetId: '',
      assetName: '',
      assetCode: '',
      returnDate: '',
    });
  }

  /* ================= ADD / REMOVE FORM ================= */
  addForm() {
    this.forms.push(this.forms.length);
  }

  removeForm(index: number) {
    this.forms.splice(index, 1);
  }
  getFilteredReportData() {
    const form = this.reportForm.value;

    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);

    let data = this.assets.filter((a) => {
      if (!a.returnDate) {
        return false; // return date नसलेले records skip
      }

      const returnDt = new Date(a.returnDate);

      const dateMatch = returnDt >= from && returnDt <= to;
      const deptMatch = a.departmentId === Number(form.departmentId);

      return dateMatch && deptMatch;
    });

    // OPTIONAL FILTERS
    if (form.assetId) {
      data = data.filter((a) =>
        a.assetId.toLowerCase().includes(form.assetId.toLowerCase()),
      );
    }

    if (form.assetCode) {
      data = data.filter((a) =>
        a.assetCode.toLowerCase().includes(form.assetCode.toLowerCase()),
      );
    }

    return data.map((a) => ({
      assetId: a.assetId,
      assetName: a.assetName,
      assetCode: a.assetCode,
      assetType: a.assetType,
      returnDate: a.returnDate,
      departmentName:
        this.departments.find((d) => d.id === a.departmentId)?.name || '',
    }));
  }

  /* ================= EXPORT BUTTONS ================= */

  /* ================= SUBMIT ================= */
  submitReport() {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    const reportData = this.getFilteredReportData();

    if (reportData.length === 0) {
      alert(
        '❌ No RGP asset record found for selected Department and Date range',
      );
      return;
    }

    switch (this.reportForm.value.exportType) {
      case 'PDF':
        this.exportPDF(reportData);
        break;

      case 'EXCEL':
        this.exportExcel(reportData);
        break;

      case 'DOC':
        this.exportDOC(reportData);
        break;

      case 'EXCEL_TABULAR':
        this.exportExcelTabular(reportData);
        break;

      default:
        alert('❌ Please select export type');
    }
  }

  exportPDF(data: any[]) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('en-GB');

    // ================= HEADER =================
    const drawHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14); // 🔽 slightly reduced
      doc.setTextColor(0, 0, 0);

      doc.text(
        'RGP Asset Return Report – Date Wise',
        pageWidth / 2,
        10, // 🔽 moved up
        { align: 'center' },
      );

      doc.setFontSize(9); // 🔽 smaller
      doc.setFont('helvetica', 'normal');

      doc.text(`Date : ${currentDate}`, 14, 14);
      doc.text(this.companyName, pageWidth - 14, 14, { align: 'right' });
    };

    drawHeader();

    // ================= TABLE =================
    autoTable(doc, {
      startY: 18, // 🔽 closer to header

      head: [
        [
          'Asset ID',
          'Asset Name',
          'Asset Code',
          'Asset Type',
          'Return Date',
          'Department',
        ],
      ],

      body: data.map((d) => [
        d.assetId,
        d.assetName,
        d.assetCode,
        d.assetType,
        d.returnDate,
        d.departmentName,
      ]),

      theme: 'grid',

      styles: {
        fontSize: 8, // 🔽 smaller font
        cellPadding: 1.5, // ✅ VERY compact
        halign: 'center',
        valign: 'middle',
        lineColor: [160, 160, 160],
        lineWidth: 0.25,
      },

      headStyles: {
        fillColor: [13, 110, 253],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 2, // 🔽 reduced
        halign: 'center',
      },

      alternateRowStyles: {
        fillColor: [245, 248, 255],
      },

      didDrawPage: () => {
        drawHeader();
      },
    });

    doc.save('RGP_Asset_Return_Report.pdf');
  }

  exportDOC(data: any[]) {
    const currentDate = new Date().toLocaleDateString('en-GB');

    let content = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    padding: 20px;
  }

  h2 {
    text-align: center;
    margin: 0;
  }

  .divider {
    border-top: 2px solid #000;
    margin: 8px 0;
  }

  /* REMOVE ALL BORDERS FORCEFULLY */
  .meta-table,
  .meta-table tr,
  .meta-table td {
    border: none !important;
  }

  .meta-table td {
    font-size: 14px;
    padding: 2px 0;
  }

  table.report-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14px;
    font-size: 14px;
  }

  table.report-table th {
    background-color: #0d6efd;
    color: #fff;
    padding: 8px;
    border: 1px solid #999;
    text-align: center;
  }

  table.report-table td {
    padding: 8px;
    border: 1px solid #999;
    text-align: center;
  }

  table.report-table tr:nth-child(even) td {
    background-color: #f5f8ff;
  }
</style>
</head>

<body>

  <h2>Employee Wise Call Logging Report</h2>



  <!-- DATE LEFT | COMPANY RIGHT (NO BORDER AT ALL) -->
  <table class="meta-table" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="left"><strong>Date :</strong> ${currentDate}</td>
      <td align="right"><strong>${this.companyName}</strong></td>
    </tr>
  </table>



  <table class="report-table">
    <tr>
      <th>Emp ID</th>
      <th>Emp Name</th>
      <th>Department</th>
      <th>Join Date</th>
    </tr>
  `;

    data.forEach((d) => {
      content += `
    <tr>
      <td>${d.employeeId}</td>
      <td>${d.employeeName}</td>
      <td>${d.departmentName}</td>
      <td>${d.joinDate}</td>
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

    saveAs(blob, 'Employee_Call_Report.doc');
  }

  exportExcel(data: any[]) {
    const currentDate = new Date().toLocaleDateString('en-GB');

    /* ================= SHEET DATA ================= */
    const sheetData: any[][] = [];

    // Title
    sheetData.push(['RGP Asset Return Report – Date Wise']);
    sheetData.push([]); // empty row

    // Date + Company
    sheetData.push([`Date : ${currentDate}`, '', '', '', '', this.companyName]);
    sheetData.push([]); // empty row

    // Table Header
    sheetData.push([
      'Asset ID',
      'Asset Name',
      'Asset Code',
      'Asset Type',
      'RGP Date',
      'Return Date',
      'Department',
    ]);

    // Table Data
    data.forEach((d: any) => {
      sheetData.push([
        d.assetId,
        d.assetName,
        d.assetCode,
        d.assetType,
        d.rgpDate,
        d.returnDate,
        d.departmentName,
      ]);
    });

    /* ================= CREATE SHEET ================= */
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    /* ================= MERGE CELLS ================= */
    worksheet['!merges'] = [
      // Title center merge
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },

      // Date row (left)
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },

      // Company name (right)
      { s: { r: 2, c: 3 }, e: { r: 2, c: 6 } },
    ];

    /* ================= COLUMN WIDTH ================= */
    worksheet['!cols'] = [
      { wch: 12 }, // Asset ID
      { wch: 20 }, // Asset Name
      { wch: 18 }, // Asset Code
      { wch: 16 }, // Asset Type
      { wch: 14 }, // RGP Date
      { wch: 14 }, // Return Date
      { wch: 18 }, // Department
    ];

    /* ================= STYLING ================= */
    // Title style
    worksheet['A1'].s = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    // Date (left)
    worksheet['A3'].s = {
      font: { bold: true },
      alignment: { horizontal: 'left' },
    };

    // Company (right)
    worksheet['G3'].s = {
      font: { bold: true },
      alignment: { horizontal: 'right' },
    };

    // Header row style (BLUE)
    ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5'].forEach((cell) => {
      worksheet[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0D6EFD' } }, // Bootstrap blue
        alignment: { horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
    });

    /* ================= WORKBOOK ================= */
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RGP Report');

    XLSX.writeFile(workbook, 'RGP_Asset_Return_Report.xlsx');
  }

  exportExcelTabular(data: any[]) {
    const currentDate = new Date().toLocaleDateString('en-GB');

    // ✅ RGP TABULAR DATA
    const tableData = data.map((d) => ({
      'Asset ID': d.assetId,
      'Asset Name': d.assetName,
      'Asset Code': d.assetCode,
      'Asset Type': d.assetType,
      'RGP Date': d.rgpDate,
      'Return Date': d.returnDate,
      Department: d.departmentName,
    }));

    // Empty sheet first
    const ws = XLSX.utils.json_to_sheet([]);

    // 👉 Title + Meta
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        ['RGP Asset Return Report – Date Wise'],
        [`Date : ${currentDate}`, '', '', '', '', this.companyName],
        [],
      ],
      { origin: 'A1' },
    );

    // 👉 Table data
    XLSX.utils.sheet_add_json(ws, tableData, {
      origin: 'A4',
      skipHeader: false,
    });

    // 👉 Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RGP Report');

    // 👉 File save
    XLSX.writeFile(wb, 'RGP_Asset_Return_Report.xlsx');
  }

  printReport() {
    const data = this.getFilteredReportData();
    const currentDate = new Date().toLocaleDateString('en-GB');

    let content = `
<html>
<head>
  <title>Employee Wise Call Logging Report</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      padding: 20px;
      color: #000;
    }

    h2 {
      text-align: center;
      margin: 0;
    }

    .divider {
      border-top: 2px solid #000;
      margin: 8px 0;
    }

    /* META (DATE + COMPANY) */
    .meta {
      width: 100%;
      font-size: 14px;
      margin: 6px 0;
    }

    .meta td {
      border: none;
      padding: 0;
    }

    table.report {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 14px;
    }

    table.report th {
      background-color: #0d6efd;
      color: #fff;
      padding: 8px;
      border: 1px solid #000;
      text-align: center;
    }

    table.report td {
      padding: 8px;
      border: 1px solid #000;
      text-align: center;
    }

    table.report tr:nth-child(even) td {
      background-color: #f5f8ff;
    }

    @media print {
      body {
        padding: 10px;
      }
    }
  </style>
</head>

<body>

  <h2>RGP Asset Return Report – Date Wise</h2>

  <table class="meta">
    <tr>
      <td align="left"><strong>Date :</strong> ${currentDate}</td>
      <td align="right"><strong>${this.companyName}</strong></td>
    </tr>
  </table>


  <table class="report">
    <tr>
       <th>Asset ID</th>
      <th>Asset Name</th>
      <th>Asset Code</th>
      <th>Asset Type</th>

      <th>Return Date</th>
      <th>Department</th>
    </tr>
  `;

    data.forEach((d) => {
      content += `
    <tr>
      <td>${d.assetId}</td>
      <td>${d.assetName}</td>
      <td>${d.assetCode}</td>
      <td>${d.assetType}</td>

      <td>${d.returnDate}</td>
      <td>${d.departmentName}</td>
    </tr>
    `;
    });

    content += `
  </table>

</body>
</html>
`;

    const printWindow = window.open('', '', 'width=900,height=650');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(content);
      printWindow.document.close();

      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }
}
