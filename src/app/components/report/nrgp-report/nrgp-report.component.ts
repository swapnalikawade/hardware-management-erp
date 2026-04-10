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
  selector: 'app-nrgp-report',
  standalone: false,
  templateUrl: './nrgp-report.component.html',
  styleUrl: './nrgp-report.component.css',
})
export class NrgpReportComponent {
  /* ================= HEADER ================= */
  companyName = 'AMC Call Logging';
  companyEmail = 'amccalllogging@gmail.com';
  today = new Date();
  // ================= MASTER DATA =================
  employeeSearchText = '';
  filteredEmployeesForSelect: any[] = [];

  // Employees
  // ================= DEPARTMENTS =================

  // ================= EMPLOYEES (Department Wise – 5 each) =================
  // ================= ASSETS =================
  assets = [
    {
      assetId: 'A-101',
      assetName: 'Dell Laptop',
      assetCode: 'DL-2024',
      assetType: 'Laptop',
      problemDescription:
        'Laptop is overheating frequently and battery drains quickly.',
      issueDate: '2026-01-05',
    },
    {
      assetId: 'A-102',
      assetName: 'HP Desktop',
      assetCode: 'HP-DSK',
      assetType: 'Desktop',
      problemDescription:
        'System is slow and shows frequent hanging during startup.',
      issueDate: '2026-01-12',
    },
    {
      assetId: 'A-201',
      assetName: 'Canon Printer',
      assetCode: 'CP-778',
      assetType: 'Printer',
      problemDescription:
        'Printer is not printing properly and paper jam occurs repeatedly.',
      issueDate: '2026-02-02',
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

  /* ================= FORM CREATION ================= */
  createForm() {
    this.reportForm = this.fb.group({
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],

      assetId: [''],
      assetName: [''],
      assetCode: [''],
      assetType: [''],
      problemDescription: [''],

      exportType: ['PDF', Validators.required],
    });
  }

  reportDataList: any[] = [];

  resetForm() {
    this.reportForm.reset({
      // ================= EXPORT =================
      exportType: 'PDF',

      // ================= FILTER =================

      fromDate: '',
      toDate: '',

      // ================= ASSET DETAILS =================
      assetId: '',
      assetName: '',
      assetCode: '',
      assetType: '',
      problemDescription: '',
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
      const issueDt = new Date(a.issueDate);
      return issueDt >= from && issueDt <= to;
    });

    // Optional filters
    if (form.assetId) {
      data = data.filter((a) =>
        a.assetId.toLowerCase().includes(form.assetId.toLowerCase()),
      );
    }

    if (form.assetName) {
      data = data.filter((a) =>
        a.assetName.toLowerCase().includes(form.assetName.toLowerCase()),
      );
    }

    if (form.assetCode) {
      data = data.filter((a) =>
        a.assetCode.toLowerCase().includes(form.assetCode.toLowerCase()),
      );
    }

    if (form.assetType) {
      data = data.filter((a) =>
        a.assetType.toLowerCase().includes(form.assetType.toLowerCase()),
      );
    }

    return data.map((a) => ({
      assetId: a.assetId,
      assetName: a.assetName,
      assetCode: a.assetCode,
      assetType: a.assetType,
      problemDescription: a.problemDescription,
      issueDate: a.issueDate, // 👈 optional: report मध्ये दाखवायचा असेल तर
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

    const drawHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14); // 🔽 slightly smaller
      doc.text('RGP Asset Return Report – Date Wise', pageWidth / 2, 10, {
        align: 'center',
      });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date : ${currentDate}`, 14, 15);
      doc.text(this.companyName, pageWidth - 14, 15, { align: 'right' });
    };

    drawHeader();

    autoTable(doc, {
      startY: 18, // 🔽 table closer to header

      head: [
        [
          'Asset ID',
          'Asset Name',
          'Asset Code',
          'Asset Type',
          'Issue Date',
          'Description',
        ],
      ],

      body: data.map((d) => [
        d.assetId,
        d.assetName,
        d.assetCode,
        d.assetType,
        d.issueDate,
        d.problemDescription,
      ]),

      theme: 'grid',

      styles: {
        fontSize: 8, // 🔽 smaller font
        cellPadding: 1.5, // ✅ VERY LESS padding
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
        cellPadding: 2, // 🔽 header padding reduced
        halign: 'center',
      },

      columnStyles: {
        5: {
          // Description column
          halign: 'left',
          cellPadding: 2, // readable but compact
        },
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
      <th>Asset ID</th>
      <th>Asset Code</th>
<th>Asset Name</th>
<th>Asset Type</th>

      <th>issue Date</th>
       <th>Problemn Description</th>
    </tr>
  `;

    data.forEach((d) => {
      content += `
    <tr>
      <td>${d.assetId}</td>
      <td>${d.assetCode}</td>
       <td>${d.assetName}</td>
      <td>${d.assetType}</td>
      <td>${d.issueDate}</td>
      <th>${d.problemDescription}</td>
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
      'problem Description',
    ]);

    // Table Data
    data.forEach((d: any) => {
      sheetData.push([
        d.assetId,
        d.assetName,
        d.assetCode,
        d.assetType,
        d.problemDescription,
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
      'problem Description': d.problemDescription,
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

      <th>Description</th>
    </tr>
  `;

    data.forEach((d) => {
      content += `
    <tr>
      <td>${d.assetId}</td>
      <td>${d.assetName}</td>
      <td>${d.assetCode}</td>
      <td>${d.assetType}</td>

<td>${d.problemDescription}</td>

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
