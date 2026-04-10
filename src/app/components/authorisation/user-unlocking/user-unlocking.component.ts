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

interface TableRow {
  userId: string;
  userCode: string;
  userName: string;
  role: string;
  departmentName: string;
  unLockAction: 'Manual' | 'Auto';
  unLockReason: string;
  unLockDate: string;
  unLockedBy: string;
  status: 'Locked' | 'Unlocked';
}

@Component({
  selector: 'app-user-unlocking',
  standalone: false,
  templateUrl: './user-unlocking.component.html',
  styleUrl: './user-unlocking.component.css',
})
export class UserUnlockingComponent {
  activeTab = 'details';
  today = new Date();
  tableData: TableRow[] = [
    {
      userId: '1',
      userCode: 'USR-001',
      userName: 'Amit Sharma',
      role: 'HR Admin',
      departmentName: 'Human Resources',
      unLockAction: 'Manual',
      unLockReason: 'Policy violation issue reviewed and cleared',
      unLockDate: '15-12-2024',
      unLockedBy: 'Admin',
      status: 'Locked',
    },
    {
      userId: '2',
      userCode: 'USR-002',
      userName: 'Neha Verma',
      role: 'Finance Manager',
      departmentName: 'Finance',
      unLockAction: 'Auto',
      unLockReason: 'Account auto-unlocked after lock duration expired',
      unLockDate: '27-12-2025',
      unLockedBy: 'System',
      status: 'Unlocked',
    },
    {
      userId: '3',
      userCode: 'USR-003',
      userName: 'Sourabh Patil',
      role: 'IT Support',
      departmentName: 'IT',
      unLockAction: 'Manual',
      unLockReason:
        'Multiple failed login attempts reviewed and access restored',
      unLockDate: '10-09-2025',
      unLockedBy: 'Security Admin',
      status: 'Unlocked',
    },
  ];

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

  closeViewModal() {
    this.showViewModal = false;
    this.selectedRow = null;
  }

  //search filter
  searchText: string = '';
  filteredData: TableRow[] = [];
  constructor(private cdr: ChangeDetectorRef) {
    this.filteredData = [...this.tableData];
  }
  applyFilter(event: any) {
    this.searchText = event.target.value.toLowerCase().trim();

    // Filter = tableData वरून
    this.filteredData = this.tableData.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(this.searchText),
    );

    this.currentPage = 1; // pagination reset
  }

  //header
  companyName = 'AMC Call Logging';
  companyEmail = 'amccalllogging@gmail.com';

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

  exportExcel() {
    // Final export order
    const exportData = this.tableData.map((row) => ({
      User_ID: row.userId,
      User_Code: row.userCode,
      User_Name: row.userName,
      Role: row.role,
      Department_Name: row.departmentName,
      Unlock_Action: row.unLockAction,
      Unlock_Reason: row.unLockReason,
      Unlock_Date: row.unLockDate,
      Unlocked_By: row.unLockedBy,
      Status: row.status,
    }));

    // Create worksheet from JSON
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-adjust column width
    worksheet['!cols'] = Object.keys(exportData[0]).map((key) => ({
      wch: 20, // simple fixed width (easy + readable)
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'UserUnLockingData');

    // Download file
    XLSX.writeFile(workbook, 'UserUnLockingData.xlsx');
  }

  exportDoc() {
    const currentDate = new Date().toLocaleDateString(); // Current date

    let content = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <style>
      @page WordSection1 {
        size: 842pt 595pt; /* LANDSCAPE MODE */
        mso-page-orientation: landscape;
      }
      div.WordSection1 { page: WordSection1; }

      table {
        border-collapse: collapse;
        width: 100%;
        table-layout: fixed;
        font-size: 11px;
        word-wrap: break-word;
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

      /* Header Table */
      .header-table {
        width: 100%;
        margin-bottom: 20px;
      }
      .header-table td {
        border: none;
        padding: 0;
        font-size: 12px;
        vertical-align: middle;
      }
      .header-table .title {
        text-align: center;
        vertical-align: middle;
        font-size: 20px;
        font-weight: bold;
      }
      .header-table .date {
        text-align: left;
        font-size: 12px;
      }
    </style>
  </head>

  <body>
    <div class="WordSection1">
      <table class="header-table">
        <tr>
          <td class="date">Date: ${currentDate}</td>
        </tr>
        <tr>
          <td class="title">UserUnLocking Report</td>
        </tr>
      </table>

      <table>
     <tr>
  <th>User ID</th>
  <th>User Code</th>
  <th>User Name</th>
  <th>Role</th>
  <th>Department</th>
  <th>Unlock Action</th>
  <th>Unlock Reason</th>
  <th>Unlock Date</th>
  <th>Unlocked By</th>
  <th>Status</th>
</tr>


  `;

    this.tableData.forEach((row: any) => {
      content += `
  <tr>
  <td>${row.userId || ''}</td>
  <td>${row.userCode || ''}</td>
  <td>${row.userName || ''}</td>
  <td>${row.role || ''}</td>
  <td>${row.departmentName || ''}</td>
  <td>${row.unLockAction || ''}</td>
  <td>${row.unLockReason || ''}</td>
  <td>${row.unLockDate || ''}</td>
  <td>${row.unLockedBy || ''}</td>
  <td>${row.status || ''}</td>
</tr>
    `;
    });

    content += `
      </table>
    </div>
  </body>
  </html>
  `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    saveAs(blob, 'UserUnLocking.doc');
  }

  exportPDF() {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape
    const pageWidth = doc.internal.pageSize.getWidth();

    const currentDate = new Date().toLocaleDateString();

    // Date left
    doc.setFontSize(10);
    doc.text(`Date: ${currentDate}`, 10, 12);

    // Title center
    doc.setFontSize(18);
    doc.text('UserUnLocking Records', pageWidth / 2, 12, { align: 'center' });

    // Table
    autoTable(doc, {
      startY: 20,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'left',
        valign: 'middle',
        lineColor: [0, 0, 0], // table border color
        lineWidth: 0.2, // table border width
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: '#fff',
        halign: 'center',
      },
      tableWidth: 'auto',
      head: [
        [
          'User ID',
          'User Code',
          'User Name',
          'Role',
          'Department',
          'Unlock Action',
          'Unlock Reason',
          'Unlock Date',
          'Unlocked By',
          'Status',
        ],
      ],

      body: this.tableData.map((row) => [
        row.userId || '',
        row.userCode || '',
        row.userName || '',
        row.role || '',
        row.departmentName || '',
        row.unLockAction || '',
        row.unLockReason || '',
        row.unLockDate || '',
        row.unLockedBy || '',
        row.status || '',
      ]),

      didDrawCell: (data) => {
        // प्रत्येक cell border visible
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
      },
    });

    doc.save('UserUnLockingiData.pdf');
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

  ngOnInit() {
    this.forms[0].newRecord.unLockDate = this.getTodayDate();
  }

  // --------------------------
  // INITIAL RECORD STRUCTURE
  // --------------------------
  newRecord: TableRow = {
    userId: '',
    userCode: '',
    userName: '',
    role: '',
    departmentName: '',
    unLockAction: 'Manual',
    unLockReason: '',
    unLockDate: '',
    unLockedBy: '',
    status: 'Locked',
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
    if (this.isEditMode) return; // disable adding while editing

    this.forms.push({
      newRecord: {
        ...this.newRecord,
        unLockDate: this.getTodayDate(), // auto-fill current date
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

    // Step 2 → Mark form controls as touched to show HTML errors
    if (form) {
      Object.keys(form.controls).forEach((key) => {
        form.controls[key].markAsTouched();
        form.controls[key].markAsDirty();
      });
    }

    // Step 3 → STOP HERE IF FORM INVALID
    if (form && !form.valid) return;

    if (this.isEditMode && this.editIndex !== -1) {
      // --------------------------
      // EDIT EXISTING
      // --------------------------
      this.tableData[this.editIndex] = {
        userId: this.tableData[this.editIndex].userId, // keep same ID
        userCode: this.forms[0].newRecord.userCode,
        userName: this.forms[0].newRecord.userName,
        role: this.forms[0].newRecord.role,
        departmentName: this.forms[0].newRecord.departmentName,
        unLockAction: this.forms[0].newRecord.unLockAction,
        unLockReason: this.forms[0].newRecord.unLockReason,
        unLockDate: this.forms[0].newRecord.unLockDate,
        unLockedBy: this.forms[0].newRecord.unLockedBy,
        status: this.forms[0].newRecord.status,
      };

      this.isEditMode = false;
      this.editIndex = -1;
      this.showToast('Record updated successfully', 'success');
    } else {
      // --------------------------
      // ADD NEW RECORDS
      // --------------------------
      let savedCount = 0;

      this.forms.forEach((formItem) => {
        if (!formItem.newRecord.unLockDate) {
          formItem.newRecord.unLockDate = this.getTodayDate();
        }

        // Assign ID dynamically
        const newId = this.tableData.length + 1;

        this.tableData.push({
          userId: String(newId),
          userCode: formItem.newRecord.userCode,
          userName: formItem.newRecord.userName,
          role: formItem.newRecord.role,
          departmentName: formItem.newRecord.departmentName,
          unLockAction: formItem.newRecord.unLockAction,
          unLockReason: formItem.newRecord.unLockReason,
          unLockDate: formItem.newRecord.unLockDate,
          unLockedBy: formItem.newRecord.unLockedBy,
          status: formItem.newRecord.status || 'Locked',
        });
        savedCount++;
      });

      if (savedCount > 0) {
        this.showToast(
          `${savedCount} record(s) saved successfully!`,
          'success',
        );
      }
    }

    // --------------------------
    // RESET FORMS & TABLE
    // --------------------------
    this.filteredData = [...this.tableData];
    this.forms = [{ newRecord: { ...this.newRecord } }];
    this.showErrors = false;
    this.isEditMode = false;
    this.editIndex = -1;
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
  onEdit(row: TableRow, index: number) {
    this.activeTab = 'newRecord';
    this.isEditMode = true;
    this.editIndex = index;

    // Prefill form with selected row
    this.forms[0].newRecord = { ...row };

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
  selectedFile: File | null = null;
  // Trigger when file is selected
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.showToast('Please select a file first.', 'error');
      return;
    }

    const fileName = this.selectedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const csvText = fileReader.result as string;
        this.parseCSV(csvText);
        this.showToast('CSV file uploaded!', 'success');
      };
      fileReader.readAsText(this.selectedFile);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      this.readExcel(this.selectedFile);
      this.showToast('Excel file uploaded!', 'success');
    } else if (fileName.endsWith('.txt')) {
      this.readTXT(this.selectedFile);
      this.showToast('Text file uploaded!', 'success');
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      this.readDOCX(this.selectedFile);
      this.showToast('Word file uploaded!', 'success');
    } else {
      this.showToast(
        `${this.selectedFile.name} uploaded successfully!`,
        'success',
      );
    }
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

    // Header mapping
    const mapHeader = (h: string) => {
      switch (h.toLowerCase()) {
        case 'user id':
          return 'userId';
        case 'user code':
          return 'userCode';
        case 'user name':
          return 'userName';
        case 'role':
          return 'role';
        case 'department':
        case 'department name':
          return 'departmentName';
        case 'unlock action':
          return 'unLockAction';
        case 'unlock reason':
          return 'unLockReason';
        case 'unlock date':
          return 'unLockDate';
        case 'unlocked by':
          return 'unLockedBy';
        case 'status':
          return 'status';
        default:
          return h;
      }
    };

    const csvHeaders = lines[0].split(',').map((h) => mapHeader(h.trim()));
    const results: TableRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj: any = {};

      csvHeaders.forEach((h, idx) => {
        obj[h] = values[idx] ? values[idx].trim() : '';
      });

      const newRecord: TableRow = {
        userId: String(obj['userId'] ?? ''),
        userCode: obj['userCode'] || '',
        userName: obj['userName'] || '',
        role: obj['role'] || '',
        departmentName: obj['departmentName'] || '',
        unLockAction: (obj['unLockAction'] as 'Manual' | 'Auto') || 'Manual',
        unLockReason: obj['unLockReason'] || '',
        unLockDate: obj['unLockDate'] || '',
        unLockedBy: obj['unLockedBy'] || '',
        status: (obj['status'] as 'Locked' | 'Unlocked') || 'Locked',
      };

      results.push(newRecord);
    }

    this.tableData = [...this.tableData, ...results];
    this.filteredData = [...this.tableData];
    this.currentPage = 1;

    this.cdr.detectChanges();
    this.showToast('CSV imported successfully!', 'success');
  }

  // ---------------- Excel Parsing ----------------
  readExcel(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const workbook = XLSX.read(reader.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      json.forEach((obj: any, i: number) => {
        const newRecord: TableRow = {
          userId: String(this.tableData.length + i + 1),
          userCode: obj['User Code'] || '',
          userName: obj['User Name'] || '',
          role: obj['Role'] || '',
          departmentName: obj['Department'] || obj['Department Name'] || '',
          unLockAction: (obj['Unlock Action'] as 'Manual' | 'Auto') || 'Manual',
          unLockReason: obj['Unlock Reason'] || '',
          unLockDate: obj['Unlock Date'] || '',
          unLockedBy: obj['Unlocked By'] || '',
          status: (obj['Status'] as 'Locked' | 'Unlocked') || 'Locked',
        };

        // 🔐 Safety: clear unlock data if still Locked
        if (newRecord.status === 'Locked') {
          newRecord.unLockReason = '';
          newRecord.unLockDate = '';
          newRecord.unLockedBy = '';
        }

        this.tableData.push(newRecord);
      });

      this.filteredData = [...this.tableData];
      this.currentPage = 1;
      this.cdr.detectChanges();
      this.showToast('Excel imported successfully!', 'success');
    };
    reader.readAsBinaryString(file);
  }

  // ---------------- TXT Parsing ----------------
  readTXT(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

      lines.forEach((line, idx) => {
        const cols = line.split(',').map((c) => c.trim());
        while (cols.length < 13) cols.push(''); // Ensure 13 columns

        this.tableData.push({
          userId: String(Number(cols[0]) || idx + 1),
          userCode: cols[1] || '',
          userName: cols[2] || '',
          role: cols[3] || '',
          departmentName: cols[4] || '',
          unLockAction: ['Manual', 'Auto'].includes(cols[5])
            ? (cols[5] as 'Manual' | 'Auto')
            : 'Manual',
          unLockReason: cols[6] || '',
          unLockDate: cols[7] || '',
          unLockedBy: cols[8] || '',
          status: ['Locked', 'Unlocked'].includes(cols[9])
            ? (cols[9] as 'Locked' | 'Unlocked')
            : 'Locked',
        });
      });

      this.filteredData = [...this.tableData];
      this.showToast('TXT imported!', 'success');
    };
    reader.readAsText(file);
  }

  // ---------------- DOCX Parsing (mammoth.js) ----------------
  async readDOCX(file: File) {
    const reader = new FileReader();

    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;

      // DOCX → HTML
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      // Create DOM to parse tables
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');

      if (!table) {
        this.showToast('No table found in DOCX!', 'warning');
        return;
      }

      // Extract rows
      const rows = table.querySelectorAll('tr');

      rows.forEach((row, rowIndex) => {
        // Skip header row (assuming first row is header)
        if (rowIndex === 0) return;

        const cells = Array.from(row.querySelectorAll('td')).map(
          (cell) => cell.textContent?.trim() || '',
        );

        const newRecord: TableRow = {
          userId: String(Number(cells[0]) || this.tableData.length + 1),
          userCode: cells[1]?.trim() || '',
          userName: cells[2]?.trim() || '',
          role: cells[3]?.trim() || '',
          departmentName: cells[4]?.trim() || '',
          unLockAction: ['Manual', 'Auto'].includes(cells[5])
            ? (cells[5] as 'Manual' | 'Auto')
            : 'Manual',
          unLockReason: cells[6]?.trim() || '',
          unLockDate: cells[7]?.trim() || '',
          unLockedBy: cells[8]?.trim() || '',
          status: ['Locked', 'Unlocked'].includes(cells[9])
            ? (cells[9] as 'Locked' | 'Unlocked')
            : 'Locked',
        };

        this.tableData.push(newRecord);
      });

      this.filteredData = [...this.tableData];
      this.cdr.detectChanges();
      this.showToast('DOCX table imported successfully!', 'success');
    };

    reader.readAsArrayBuffer(file);
  }

  downloadSampleCSV() {
    if (!this.tableData || this.tableData.length === 0) {
      this.showToast('No data available to download!', 'warning');
      return;
    }

    // CSV headers
    const headers = [
      'User ID',
      'User Code',
      'User Name',
      'Role',
      'Department Name',
      'Unlock Action',
      'Unlock Reason',
      'Unlock Date',
      'Unlocked By',
      'Status',
    ];

    // Create CSV rows
    const csvRows: string[] = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add table data rows
    this.tableData.forEach((row: TableRow) => {
      const rowData = [
        row.userId || '',
        row.userCode || '',
        row.userName || '',
        row.role || '',
        row.departmentName || '',
        row.unLockAction || '',
        row.unLockReason || '',
        row.unLockDate || '',
        row.unLockedBy || '',
        row.status || '',
      ];

      csvRows.push(rowData.join(','));
    });

    // Convert CSV array → string
    const csvString = csvRows.join('\n');

    // Create blob & download
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-data.csv';
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
      const rowDate = this.parseDDMMYYYY(row.unLockDate);
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
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const csvRows: string[] = [];

    csvRows.push(this.companyName || 'Company Name');
    csvRows.push(`Date:,${formattedDate}`);
    csvRows.push('');

    const headers = [
      'User ID',
      'User Code',
      'User Name',
      'Role',
      'Department Name',
      'Unlock Action',
      'Unlock Reason',
      'Unlock Date',
      'Unlocked By',
      'Status',
    ];

    csvRows.push(headers.join(','));

    data.forEach((row: TableRow) => {
      csvRows.push(
        [
          row.userId || '',
          row.userCode || '',
          row.userName || '',
          row.role || '',
          row.departmentName || '',
          row.unLockAction || '',
          row.unLockReason || '',
          row.unLockDate || '',
          row.unLockedBy || '',
          row.status || '',
        ].join(','),
      );
    });

    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    saveAs(blob, 'Filtered_UserUnLocking_Report.csv');
  }

  // ---------------- Excel Export ----------------
  exportExcelfile(data: TableRow[]) {
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    const wsData = [
      [this.companyName || 'Company Name'],
      ['Date:', formattedDate],
      [],
      [
        'User ID',
        'User Code',
        'User Name',
        'Role',
        'Department Name',
        'Unlock Action',
        'Unlock Reason',
        'Unlock Date',
        'Unlocked By',
        'Status',
      ],
    ];

    data.forEach((row: TableRow) => {
      wsData.push([
        row.userId.toString(),
        row.userCode || '',
        row.userName || '',
        row.role || '',
        row.departmentName || '',
        row.unLockAction || '',
        row.unLockReason || '',
        row.unLockDate || '',
        row.unLockedBy || '',
        row.status || '',
      ]);
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
    ];

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered UserUnLocking');

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'Filtered_UserUnLocking_Report.xlsx');
  }

  // ---------------- PDF Export ----------------
  exportPDFfile(data: TableRow[]) {
    if (!data || data.length === 0) {
      this.showToast('No data available to export!', 'warning');
      return;
    }

    // 👉 Landscape to fit many columns
    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --------------------------
    // HEADER TITLE
    // --------------------------
    const title = 'Filtered User Lock Records';
    doc.setFontSize(22);
    doc.setTextColor(0, 70, 140);
    doc.text(title, pageWidth / 2, 50, { align: 'center' });

    doc.setDrawColor(0, 70, 140);
    doc.setLineWidth(1);
    doc.line(
      pageWidth / 2 - doc.getTextWidth(title) / 2,
      55,
      pageWidth / 2 + doc.getTextWidth(title) / 2,
      55,
    );

    // --------------------------
    // SUBTITLE
    // --------------------------
    const topY = 85;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(this.companyName || 'Company Name', 40, topY);
    doc.text(new Date().toLocaleDateString(), pageWidth - 40, topY, {
      align: 'right',
    });

    // --------------------------
    // TABLE
    // --------------------------
    autoTable(doc, {
      startY: topY + 25,
      showHead: 'everyPage',

      head: [
        [
          'User ID',
          'User Code',
          'User Name',
          'Role',
          'Department Name',
          'Unlock Action',
          'Unlock Reason',
          'Unlock Date',
          'Unlocked By',
          'Status',
        ],
      ],

      body: data.map((row: TableRow) => [
        row.userId,
        row.userCode,
        row.userName,
        row.role,
        row.departmentName,
        row.unLockAction,
        row.unLockReason,
        row.unLockDate,
        row.unLockedBy,
        row.status,
      ]),

      theme: 'grid',
      tableWidth: 'auto',

      styles: {
        fontSize: 8,
        cellPadding: 5,
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

      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 55 },
        2: { cellWidth: 90 },
        3: { cellWidth: 80 },
        4: { cellWidth: 90 },
        5: { cellWidth: 75 },
        6: { cellWidth: 130 },
        7: { cellWidth: 80 },
        8: { cellWidth: 90 },
        9: { cellWidth: 55 },
      },

      margin: { left: 20, right: 20 },

      // --------------------------
      // FOOTER (Page Number) ✅ FINAL FIX
      // --------------------------
      didDrawPage: () => {
        const totalPages = doc.internal.pages.length - 1;

        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${totalPages}`, pageWidth / 2, pageHeight - 10, {
          align: 'center',
        });
      },
    });

    // --------------------------
    // SAVE
    // --------------------------
    doc.save('Filtered_UserUnLocking_Report.pdf');
  }
}
