/*
 **************************************************************************************
 * Program Name  : DepartmentComponent.ts
 * Author        : Kawade Swapnali
 * Date          : Feb 08, 2026
 * System Name   : gswbs
 * SRF No.       :
 *
 * Purpose       : Angular Component for Department Hierarchy Management.
 *
 * Description   : This component manages hierarchical department structure including:
 *                 - Create main and sub-departments
 *                 - Multi-level hierarchy (Parent → Child → Sub-child)
 *                 - Dynamic column-based navigation UI
 *                 - Update department details
 *                 - Delete department (recursive removal)
 *                 - View department details popup
 *
 * Features      :
 *   - Tree-based hierarchical data structure
 *   - Dynamic column rendering for hierarchy navigation
 *   - Parent-child relationship handling
 *   - Auto department ID generation
 *   - Recursive delete functionality
 *   - Update popup with form binding
 *   - Checkbox-based selection per column
 *
 * Data Structure:
 *   - Each department can have multiple child departments
 *   - deptLevel → hierarchy level (0 = root)
 *   - deptParentId → parent reference
 *
 * Called From   : Department Management UI
 * Calls To      : (Currently Local Data / Can integrate API)
 *
 * Future Scope  :
 *   - Backend API integration
 *   - Role-based department access
 *   - Drag & Drop hierarchy
 *
 **************************************************************************************
 */
import { Component, OnInit } from '@angular/core';

export interface Department {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  deptLevel: number;
  deptPosn: number;
  deptParentId: string | null;
  deptStatus: 'Active' | 'Inactive';
  deptLastUpdate: string;
  children?: Department[];
}

@Component({
  selector: 'app-department',
  standalone: false,
  templateUrl: './department.component.html',
  styleUrl: './department.component.css',
})
export class DepartmentComponent implements OnInit {
  //header
  companyName = 'AMC Call Logging';
  companyEmail = 'amccalllogging@gmail.com';
  today = new Date();

  activeTab: 'details' | 'newRecord' = 'details';

  setActiveTab(tab: 'details' | 'newRecord') {
    this.activeTab = tab;

    // 🔥 When user clicks Create Department tab
    if (tab === 'newRecord') {
      this.selectedDepartment = null; // ALWAYS main department
    }
  }

  ngOnInit() {
    const dummyDept: Department = {
      departmentId: 'DEPT001',
      departmentCode: 'HR',
      departmentName: 'Human Resources',
      deptLevel: 0,
      deptPosn: 1,
      deptParentId: null,
      deptStatus: 'Active',
      deptLastUpdate: new Date().toISOString(),
      children: [],
    };

    this.departments.push(dummyDept);
    this.loadRootDepartments();
  }

  /* ---------------- DATA ---------------- */
  departments: Department[] = [];
  selectedDepartment: Department | null = null;

  /** 🔥 Columns for hierarchy UI */
  deptColumns: Department[][] = [];

  /* ---------------- FORM ---------------- */
  form = {
    departmentCode: '',
    departmentName: '',
  };

  private deptCounter = 1;
  generateDepartmentId(): string {
    return 'DEPT' + String(this.deptCounter++).padStart(3, '0');
  }

  /* ---------------- CREATE ---------------- */
  createDepartment(parent: Department | null = null) {
    const newDept: Department = {
      departmentId: this.generateDepartmentId(),
      departmentCode: this.form.departmentCode,
      departmentName: this.form.departmentName,
      deptLevel: parent ? parent.deptLevel + 1 : 0,
      deptPosn: parent?.children ? parent.children.length + 1 : 1,
      deptParentId: parent ? parent.departmentId : null,
      deptStatus: 'Active',
      deptLastUpdate: new Date().toISOString(),
      children: [],
    };

    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(newDept);

      // 🔥 rebuild columns till this parent
      this.rebuildColumnsForParent(parent);
    } else {
      this.departments.push(newDept);
      this.loadRootDepartments();
    }

    this.form.departmentCode = '';
    this.form.departmentName = '';
    this.activeTab = 'details';
  }
  rebuildColumnsForParent(parent: Department) {
    const path: Department[] = [];

    const findPath = (list: Department[], target: Department): boolean => {
      for (const d of list) {
        if (d === target) {
          path.push(d);
          return true;
        }
        if (d.children && findPath(d.children, target)) {
          path.unshift(d);
          return true;
        }
      }
      return false;
    };

    findPath(this.departments, parent);

    this.deptColumns = [];
    this.deptColumns.push(this.departments);

    path.forEach((d) => {
      if (d.children && d.children.length) {
        this.deptColumns.push(d.children);
      }
    });
  }
  openCreateSubDepartment(dept: Department) {
    this.selectedDepartment = dept; // parent fix
    this.activeTab = 'newRecord'; // just open tab
  }

  resetForm() {
    this.form.departmentCode = '';
    this.form.departmentName = '';
    this.activeTab = 'details';
  }

  /* ---------------- HIERARCHY LOGIC ---------------- */

  /** Load main departments (Level 0) */
  loadRootDepartments() {
    this.deptColumns = [];
    this.deptColumns.push(this.departments);
  }

  /** On click show next level */
  onDepartmentClick(dept: Department, columnIndex: number) {
    this.selectedDepartment = dept;
    this.selectedDeptPerColumn[columnIndex] = dept;

    this.deptColumns = this.deptColumns.slice(0, columnIndex + 1);

    if (dept.children && dept.children.length) {
      this.deptColumns.push(dept.children);
    }
  }

  /* ---------------- DELETE ---------------- */
  deleteDepartment(deptId: string) {
    const remove = (list: Department[]): Department[] =>
      list.filter((d) => {
        if (d.departmentId === deptId) return false;
        if (d.children) d.children = remove(d.children);
        return true;
      });

    this.departments = remove(this.departments);
    this.loadRootDepartments();
  }
  /* ---------------- UPDATE ---------------- */
  showUpdatePopup = false;

  updateForm = {
    departmentCode: '',
    departmentName: '',
  };

  departmentToUpdate: Department | null = null;

  openUpdatePopup(dept: Department) {
    this.departmentToUpdate = dept;

    this.updateForm.departmentCode = dept.departmentCode;
    this.updateForm.departmentName = dept.departmentName;

    this.showUpdatePopup = true;
  }
  updateDepartment() {
    if (!this.departmentToUpdate) return;

    this.departmentToUpdate.departmentCode = this.updateForm.departmentCode;
    this.departmentToUpdate.departmentName = this.updateForm.departmentName;
    this.departmentToUpdate.deptLastUpdate = new Date().toISOString();

    this.showUpdatePopup = false;
    this.departmentToUpdate = null;

    // refresh hierarchy
    this.loadRootDepartments();
  }
  closeUpdatePopup() {
    this.showUpdatePopup = false;
    this.departmentToUpdate = null;
  }

  selectedDeptPerColumn: { [index: number]: Department | null } = {};
  onDeptCheckboxChange(dept: Department, columnIndex: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      // unselect any previously selected dept in this column
      this.selectedDeptPerColumn[columnIndex] = dept;
      this.onDepartmentClick(dept, columnIndex);
    } else {
      // unchecked → clear selection
      this.selectedDeptPerColumn[columnIndex] = null;
    }
  }

  showViewPopup = false;
  departmentToView: Department | null = null;

  openViewPopup(dept: Department) {
    this.departmentToView = dept;
    this.showViewPopup = true;
  }

  closeViewPopup() {
    this.showViewPopup = false;
    this.departmentToView = null;
  }
}
