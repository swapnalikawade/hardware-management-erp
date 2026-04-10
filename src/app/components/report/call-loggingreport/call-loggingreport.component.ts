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
  selector: 'app-call-loggingreport',
  standalone: false,

  templateUrl: './call-loggingreport.component.html',
  styleUrl: './call-loggingreport.component.css',
})
export class CallLoggingreportComponent {
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
  employees = [
    // ===== IT =====
    { id: 101, name: 'Amit Sharma', departmentId: 1, joinDate: '2026-01-05' },
    { id: 102, name: 'Sourabh Patil', departmentId: 1, joinDate: '2026-02-10' },
    {
      id: 103,
      name: 'Pooja Kulkarni',
      departmentId: 1,
      joinDate: '2026-03-15',
    },
    {
      id: 104,
      name: 'Rohit Deshmukh',
      departmentId: 1,
      joinDate: '2026-04-01',
    },
    { id: 105, name: 'Neel Joshi', departmentId: 1, joinDate: '2026-05-20' },

    // ===== HR =====
    { id: 201, name: 'Neha Verma', departmentId: 2, joinDate: '2026-01-12' },
    { id: 202, name: 'Kiran Pawar', departmentId: 2, joinDate: '2026-02-18' },
    { id: 203, name: 'Sneha Patil', departmentId: 2, joinDate: '2026-03-22' },
    {
      id: 204,
      name: 'Aarti Kulkarni',
      departmentId: 2,
      joinDate: '2026-04-10',
    },
    { id: 205, name: 'Rahul Jadhav', departmentId: 2, joinDate: '2026-05-05' },

    // ===== Finance =====
    { id: 301, name: 'Rahul Mehta', departmentId: 3, joinDate: '2026-01-08' },
    { id: 302, name: 'Sneha Joshi', departmentId: 3, joinDate: '2026-02-14' },
    { id: 303, name: 'Vikas Shah', departmentId: 3, joinDate: '2026-03-30' },
    { id: 304, name: 'Nikita Jain', departmentId: 3, joinDate: '2026-04-18' },
    {
      id: 305,
      name: 'Prasad Kulkarni',
      departmentId: 3,
      joinDate: '2026-05-25',
    },
  ];

  callLogs = [
    {
      employeeId: 101,
      employeeName: 'Amit Sharma',
      departmentId: 1,
      departmentName: 'IT',
      callId: 5001,
      callDate: '2026-01-05',
      clientName: 'ABC Pvt Ltd',
      assetType: 'Laptop',
      priority: 'High',
      callStatus: 'Closed',
    },
    {
      employeeId: 103,
      employeeName: 'Pooja Kulkarni',
      departmentId: 1,
      departmentName: 'IT',
      callId: 5002,
      callDate: '2026-01-15',
      clientName: 'XYZ Ltd',
      assetType: 'Desktop',
      priority: 'Medium',
      callStatus: 'Open',
    },
    {
      employeeId: 201,
      employeeName: 'Neha Verma',
      departmentId: 2,
      departmentName: 'HR',
      callId: 5003,
      callDate: '2026-02-02',
      clientName: 'HR Corp',
      assetType: 'Printer',
      priority: 'Low',
      callStatus: 'Closed',
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
    {
      key: 'newRecord',
      label: 'Employee Report',
      icon: 'bi bi-plus-circle-fill',
    },
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
    // 👇 AUTO GENERATED (UI नाही)
    this.reportForm = this.fb.group({
      departmentId: ['', Validators.required],

      employeeType: ['single', Validators.required],

      employeeId: [''], // single
      employeeIds: [[]], // multiple
      employeeName: [''],

      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],

      exportType: ['PDF', Validators.required],
    });
  }

  reportDataList: any[] = [];

  /* ================= EMPLOYEE TYPE CHANGE ================= */
  //  onDepartmentSelect(deptId: number) {
  //    const dept = this.departments.find((d) => d.id == deptId);
  //
  //    this.reportForm.patchValue({
  //      departmentName: dept?.name || '',
  //      employeeId: '',
  //      employeeIds: [],
  //    });
  //
  //    this.filteredEmployees = this.employees.filter((emp) => emp.departmentId == deptId);
  //
  //
  //    this.filteredEmployeesForSelect = [...this.filteredEmployees];
  //  }
  onDepartmentSelect(deptId: number) {
    this.filteredEmployees = this.employees.filter(
      (e) => e.departmentId === Number(deptId),
    );

    this.reportForm.patchValue({
      employeeId: null,
      employeeIds: [],
    });
  }
  onEmployeeTypeChange(type: 'single' | 'multiple') {
    this.isMultipleEmployee = type === 'multiple';

    if (type === 'single') {
      this.reportForm.get('employeeId')?.setValidators(Validators.required);
      this.reportForm.get('employeeIds')?.clearValidators();
    } else {
      this.reportForm.get('employeeId')?.clearValidators();
      this.reportForm.get('employeeIds')?.clearValidators(); // ❌ NO validation
    }

    this.reportForm.get('employeeId')?.updateValueAndValidity();
    this.reportForm.get('employeeIds')?.updateValueAndValidity();

    this.reportForm.patchValue({
      employeeId: '',
      employeeIds: [],
      employeeName: '',
    });
  }

  onSingleEmployeeSelect(empId: number) {
    const emp = this.filteredEmployees.find((e) => e.id == empId);
    if (emp) {
      this.reportForm.patchValue({
        employeeName: emp.name,
      });
    }
  }
  resetForm() {
    this.reportForm.reset({
      exportType: 'PDF',
      employeeType: 'single',
    });

    this.isMultipleEmployee = false;
    this.filteredEmployees = [];
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

    let data = this.employees.filter((emp) => {
      const empDate = new Date(emp.joinDate);

      // ✅ DATE FILTER (employees[] वर)
      const dateMatch = empDate >= from && empDate <= to;

      // ✅ DEPARTMENT FILTER
      const deptMatch = emp.departmentId === Number(form.departmentId);

      return dateMatch && deptMatch;
    });

    // ✅ EMPLOYEE FILTER
    if (form.employeeType === 'single') {
      data = data.filter((emp) => emp.id === Number(form.employeeId));
    } else {
      data = data.filter((emp) => form.employeeIds.includes(emp.id));
    }

    // ✅ FINAL REPORT DATA
    return data.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      departmentName:
        this.departments.find((d) => d.id === emp.departmentId)?.name || '',
      joinDate: emp.joinDate,
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
      alert('❌ No record found for selected Employee and Date range');
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
    }
  }

  exportPDF(data: any[]) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('en-GB');

    // 🔹 HEADER FUNCTION (ALL PAGES)
    const drawHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);

      // Title (center)
      doc.text('Employee Wise Call Logging Report', pageWidth / 2, 12, {
        align: 'center',
      });

      // Date + Company (compact gap)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      doc.text(`Date : ${currentDate}`, 14, 18);
      doc.text(this.companyName, pageWidth - 14, 18, { align: 'right' });
    };

    // First page header
    drawHeader();

    /* ================= TABLE ================= */
    autoTable(doc, {
      startY: 24, // ⬆️ table closer to header

      head: [['Emp ID', 'Emp Name', 'Department', 'Join Date']],

      body: data.map((d) => [
        d.employeeId,
        d.employeeName,
        d.departmentName,
        d.joinDate,
      ]),

      theme: 'grid',

      styles: {
        fontSize: 9, // 🔽 smaller text
        cellPadding: 3, // 🔽 less padding
        halign: 'center',
        valign: 'middle',
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
      },

      headStyles: {
        fillColor: [13, 110, 253], // blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4,
        halign: 'center',
      },

      alternateRowStyles: {
        fillColor: [245, 248, 255],
      },

      // 🔥 HEADER ON EVERY PAGE
      didDrawPage: () => {
        drawHeader();
      },
    });

    doc.save('Employee_Call_Report.pdf');
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
    sheetData.push(['Employee Wise Call Logging Report']);
    sheetData.push([]); // empty row

    // Date + Company
    sheetData.push([`Date : ${currentDate}`, '', '', this.companyName]);
    sheetData.push([]); // empty row

    // Table Header
    sheetData.push(['Emp ID', 'Emp Name', 'Department', 'Join Date']);

    // Table Data
    data.forEach((d: any) => {
      sheetData.push([
        d.employeeId,
        d.employeeName,
        d.departmentName,
        d.joinDate,
      ]);
    });

    /* ================= CREATE SHEET ================= */
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    /* ================= MERGE CELLS ================= */
    worksheet['!merges'] = [
      // Title center merge
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },

      // Date row (left)
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },

      // Company name (right)
      { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
    ];

    /* ================= COLUMN WIDTH ================= */
    worksheet['!cols'] = [
      { wch: 10 }, // Emp ID
      { wch: 20 }, // Name
      { wch: 18 }, // Dept
      { wch: 15 }, // Date
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
    worksheet['D3'].s = {
      font: { bold: true },
      alignment: { horizontal: 'right' },
    };

    // Header row style (BLUE)
    ['A5', 'B5', 'C5', 'D5'].forEach((cell) => {
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Report');

    XLSX.writeFile(workbook, 'Employee_Call_Report.xlsx');
  }

  exportExcelTabular(data: any[]) {
    const currentDate = new Date().toLocaleDateString('en-GB');

    const tableData = data.map((d) => ({
      'Emp ID': d.employeeId,
      'Emp Name': d.employeeName,
      Department: d.departmentName,
      'Join Date': d.joinDate,
    }));

    const ws = XLSX.utils.json_to_sheet([]);

    // 👉 Title
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        ['Employee Wise Call Logging Report'],
        [`Date : ${currentDate}`, '', '', this.companyName],
        [],
      ],
      { origin: 'A1' },
    );

    // 👉 Table
    XLSX.utils.sheet_add_json(ws, tableData, {
      origin: 'A4',
      skipHeader: false,
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');

    XLSX.writeFile(wb, 'Employee_Call_Report.xlsx');
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

  <h2>Employee Wise Call Logging Report</h2>



  <table class="meta">
    <tr>
      <td align="left"><strong>Date :</strong> ${currentDate}</td>
      <td align="right"><strong>${this.companyName}</strong></td>
    </tr>
  </table>


  <table class="report">
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

  dropdownOpen = false;

  getEmployeeName(id: number) {
    return this.employees.find((e) => e.id === id)?.name || id;
  }

  addEmployee(empId: number) {
    const selected = this.reportForm.value.employeeIds || [];

    if (!selected.includes(empId)) {
      this.reportForm.patchValue({
        employeeIds: [...selected, empId],
      });
    }

    this.employeeSearchText = '';
    this.filterEmployeesBySearch();
  }

  removeSelectedEmployee(empId: number) {
    const updated = this.reportForm.value.employeeIds.filter(
      (id: number) => id !== empId,
    );

    this.reportForm.patchValue({
      employeeIds: updated,
    });
  }

  filterEmployeesBySearch() {
    const search = this.employeeSearchText.toLowerCase();

    this.filteredEmployeesForSelect = this.filteredEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(search) ||
        emp.id.toString().includes(search),
    );
  }
}
