import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { AuthService } from '../auth/auth-service';
import { TableRow } from '../../components/master/assets/assets.component';
@Injectable({
  providedIn: 'root',
})
export class CommonService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  // IMPORT SHIFT PATTERN API URL
  departmentUrl = 'http://localhost:8300/department_service';
  // ==============================
  // Fetch All Departments
  // ==============================
  fetchAllDepartments() {
    return this.http.get<any[]>(`${this.departmentUrl}/fetch-all-department`);
  }

  // ==============================
  // Fetch Departments By Head Company
  // ==============================
  fetchAllDepartmentByHeadCompany(loginId: string) {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get<any[]>(
      `${this.departmentUrl}/fetchAllDepartmentByHeadCompany/${prefix}/${year}/${code}`,
    );
  }

  // ==============================
  // Save Departments
  // ==============================
  saveAllDepartments(payload: any) {
    return this.http.post(`${this.departmentUrl}/saveAll`, payload);
  }

  // ==============================
  // Update Department
  // ==============================
  updateDepartment(departmentId: string, payload: any) {
    return this.http.put(
      `${this.departmentUrl}/update/${departmentId}`,
      payload,
    );
  }

  // ==============================
  // Delete Department
  // ==============================
  deleteDepartment(departmentId: string) {
    return this.http.delete(`${this.departmentUrl}/delete/${departmentId}`);
  }

  // ==============================
  // Fetch Single Department
  // ==============================
  //fetchDepartmentById(departmentId: string) {
  //  return this.http.get(`${this.departmentUrl}/fetch/${departmentId}`);
  //}
  fetchDepartmentById(departmentId: string) {
    const [prefix, year, code] = departmentId.split('/');

    return this.http.get(
      `${this.departmentUrl}/singal_records/${prefix}/${year}/${code}`,
    );
  }
  // ==4==============================
  // A
  // SSET MAKE APIs
  // ================================

  // IMPORT ASSET MAKE EXCEL API
  private importAssetMakeApi = 'http://localhost:8307/asset_make_service';

  uploadAssetMakeExcel(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post(`${this.importAssetMakeApi}/import`, form);
  }
  // SAVE ASSET MAKE
  private saveAssetMakeApiUrl =
    'http://localhost:8300/asset_make_service/saveAll';

  submitAssetMake(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.saveAssetMakeApiUrl, formData, { headers });
  }
  // UPDATE ASSET MAKE
  private updateAssetMakeApi =
    'http://localhost:8300/asset_make_service/update';

  updateAssetMake(assetMakeId: string, data: any): Observable<any> {
    return this.http.put(`${this.updateAssetMakeApi}/${assetMakeId}`, data);
  }

  // ================================
  // ASSET MAKE APIs
  // ================================

  // GET ALL ASSET MAKE BY COMPANY
  private getAllAssetMakeByCompanyUrl =
    'http://localhost:8300/asset_make_service/getAllAssetMakeByCompanywise';

  fetchAllAssetMakeByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllAssetMakeByCompanyUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }
  // DELETE MULTIPLE ASSET MAKE
  private deleteMultipleAssetMakeApi =
    'http://localhost:8300/asset_make_service';

  deleteMultipleAssetMake(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.deleteMultipleAssetMakeApi}/delete-multiple`,
      ids,
    );
  }

  // GET LATE COMING RECORDS BY EMPLOYEE AND DATE WISE FOR ATTENDANCE API
  private readonly attendanceLateComingApiUrl =
    'http://localhost:8307/late_coming_reason_microservice/fetchLateComingData';
  fetchLateComingByEmployee(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Observable<any> {
    const url = `${this.attendanceLateComingApiUrl}/${employeeId}/${fromDate}/${toDate}`;
    return this.http.get<any>(url);
  }

  // LATE COMING REASON POST API
  private postApiUrl1 =
    'http://localhost:8300/late_coming_reason_microservice/saveAll';
  submitLateComingReason(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.postApiUrl1, formData, { headers });
  }

  // LATE COMING REASON GET API
  private getAllApiUrl1 =
    'http://localhost:8300/late_coming_reason_microservice/all';
  getAllLateComingReason(): Observable<any> {
    return this.http.get<any>(this.getAllApiUrl1);
  }

  // LATE COMING REASON UPDATE API
  private apiUpdate1 =
    'http://localhost:8300/late_coming_reason_microservice/update';
  updateLateComingReason(id: string, data: any): Observable<any> {
    alert('id: ' + id);
    return this.http.put(`${this.apiUpdate1}/${id}`, data);
  }

  // LATE COMING REASON DELETE API
  private apiDelete1 =
    'http://localhost:8300/late_coming_reason_microservice/delete';
  deleteLateComingReason(lateComingReasonId: String): Observable<any> {
    return this.http.delete(`${this.apiDelete1}/${lateComingReasonId}`);
  }

  // GET ALL LATE COMING REASON BY COMPANY RECORDS API
  private getAllLateComingReasonByCompnayUrl =
    'http://localhost:8300/late_coming_reason_microservice/getAllLateComingReasonByCompanywise';
  fetchAllLateComingReasonByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllLateComingReasonByCompnayUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // ADD COMPANY REASON POST API
  private addCompanyPostApi = 'http://localhost:8300/api/users/sign-up';
  submitCompanyInfo(formData: any): Observable<any> {
    return this.http.post<any>(this.addCompanyPostApi, formData);
  }

  // ALL COMPANY GET API
  private getAllCompanyUrl = 'http://localhost:8300/company';
  getAllBranchCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllCompanyUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // GET ALL DEPARTMENT RECORDS API
  private getAllDepartmentApiUrl =
    'http://localhost:8300/department_service/all_records';
  getDepartment(): Observable<any> {
    return this.http.get<any>(this.getAllDepartmentApiUrl);
  }

  // SAVE DEPARTMENT API URL
  private saveDepartmentApiUrl =
    'http://localhost:8300/department_service/saveAll';
  submitDepartment(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.saveDepartmentApiUrl, formData, {
      headers,
    });
  }

  // IMPORT DEPARTMENT API URL
  private importDepartmentApi = 'http://localhost:8300/department_service';
  uploadDepartmentExcel(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post(`${this.importDepartmentApi}/import`, form);
  }

  // DELETE DEPARTMENT API
  private deleteAllDepartmentApiUrl =
    'http://localhost:8300/department_service';
  deleteMultipleDepartments(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.deleteAllDepartmentApiUrl}/delete-multiple`,
      ids,
    );
  }

  // UPDATE DEPARTMENT API
  private updateDepartmentApiUrl =
    'http://localhost:8300/department_service/update';
  updateItem(id: string, headCompanyId: string, data: any): Observable<any> {
    alert('id: ' + id);
    return this.http.put(
      `${this.updateDepartmentApiUrl}/${id}/${headCompanyId}`,
      data,
    );
  }

  // GET ALL DEPARTMENT WITH COMPANY API
  private getAllDepartmentByCompnayUrl =
    'http://localhost:8300/department_service/fetchAllDepartmentByHeadCompany';
  fetchAllDepartmentByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllDepartmentByCompnayUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // GET SINGAL DEPARTMENT BY DEPARTMENT ID API
  private getSingleEmployeeByDepartmentUrl =
    'http://localhost:8300/department_service/singal_records';
  fetchSingalDepartmentByDepartment(departmentId: string): Observable<any> {
    const url = `${this.getSingleEmployeeByDepartmentUrl}/${departmentId}`;
    return this.http.get<any>(url);
  }
  // ================================
  // DESIGNATION APIs
  // ================================

  // BASE URL
  // ================================
  // DESIGNATION APIs
  // ================================

  // GET ALL DESIGNATION
  private getDesignationApiUrl =
    'http://localhost:8300/designation_service/fetch-all-designation';

  fetchAllDesignation(): Observable<any> {
    return this.http.get<any>(this.getDesignationApiUrl);
  }

  // SAVE DESIGNATION
  private saveDesignationApiUrl =
    'http://localhost:8300/designation_service/saveAll';

  submitDesignation(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.saveDesignationApiUrl, formData, {
      headers,
    });
  }

  // FETCH SINGLE DESIGNATION
  private fetchSingleDesignationApi =
    'http://localhost:8300/designation_service/fetchAllDesignation';

  fetchSingleDesignation(designationId: string): Observable<any> {
    const [prefix, year, code] = designationId.split('/');
    return this.http.get(
      `${this.fetchSingleDesignationApi}/${prefix}/${year}/${code}`,
    );
  }

  // UPDATE DESIGNATION
  private updateDesignationApi =
    'http://localhost:8300/designation_service/update';

  updateDesignation(designationId: string, data: any): Observable<any> {
    const [prefix, year, code] = designationId.split('/');
    return this.http.put(
      `${this.updateDesignationApi}/${prefix}/${year}/${code}`,
      data,
    );
  }

  // DELETE MULTIPLE DESIGNATION
  private deleteMultipleDesignationApi =
    'http://localhost:8300/designation_service/delete-multiple-designation';

  deleteMultipleDesignation(ids: string[]): Observable<any> {
    return this.http.post(this.deleteMultipleDesignationApi, ids);
  }

  // IMPORT DESIGNATION EXCEL
  private importDesignationApi = 'http://localhost:8300/designation_service';

  uploadDesignationExcel(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file, file.name);

    return this.http.post(`${this.importDesignationApi}/import`, form);
  }

  // 🔹 UPDATE DESIGNATION

  // GET ALL DESIGNATION WITH COMPANY API
  private getAllDesignationByCompnayUrl =
    'http://localhost:8300/designation_service/getAllDesignationWithCompanyId';
  fetchAllDesignationByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllDesignationByCompnayUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // GET ALL SHIFT API
  private getShiftApiUrl = 'http://localhost:8300/shift_service/all';
  getAllShift(): Observable<any> {
    return this.http.get<any>(this.getShiftApiUrl);
  }

  private getSingleShiftByShiftIdUrl =
    'http://localhost:8300/shift_service/single';

  fetchSingleShiftByShift(shiftId: string): Observable<any> {
    const [prefix, year, code] = shiftId.split('/');
    return this.http.get<any>(
      `${this.getSingleShiftByShiftIdUrl}/${prefix}/${year}/${code}`,
    );
  }
  // POST SHIFT API
  private postShiftApiUrl = 'http://localhost:8300/shift_service/saveAll';
  submitShift(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.postShiftApiUrl, formData, { headers });
  }

  // IMPORT THE SHIFT INFO
  private uploadShiftExcelApi = 'http://localhost:8300/shift_service';
  uploadShiftExcel(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post(`${this.uploadShiftExcelApi}/import`, form);
  }

  // UPDATE SHIFT API
  private updateShiftApiUrl = 'http://localhost:8300/shift_service/update';
  updateShift(
    shiftId: string,
    headCompanyId: string,
    data: any,
  ): Observable<any> {
    alert('shiftId: ' + shiftId);
    return this.http.put(
      `${this.updateShiftApiUrl}/${shiftId}/${headCompanyId}`,
      data,
    );
  }
  // ================================
  // ASSET TYPE APIs
  // ================================
  private assetTypePrefix = 'http://localhost:8300/asset_type_service';

  // 1️⃣ SAVE MULTIPLE ASSET TYPE
 submitAssetType(data: any[]): Observable<any> {
  return this.http.post(`${this.assetTypePrefix}/saveAll`, data);
}

  // 2️⃣ FETCH SINGLE ASSET TYPE
  fetchSingleAssetType(assetTypeId: string): Observable<any> {
    return this.http.get(`${this.assetTypePrefix}/single/${assetTypeId}`);
  }

  // 3️⃣ FETCH ALL ASSET TYPES

fetchAllAssetType(): Observable<any> {
  return this.http.get(`${this.assetTypePrefix}/fetch-all-asset-type`);
}
fetchAssetTypeByLoginId(loginId: string) {
  return this.http.get(
    `http://localhost:8300/asset_type_service/getAllAssetTypeByCreatedBy/${loginId}`
  );
}
 
  // 5️⃣ UPDATE ASSET TYPE
 updateAssetType(assetTypeId: string, data: any): Observable<any> {
  const [prefix, year, code] = assetTypeId.split('/');

  return this.http.put(
    `${this.assetTypePrefix}/update/${prefix}/${year}/${code}`,
    data
  );
}

  // 6️⃣ DELETE MULTIPLE ASSET TYPES
  deleteMultipleAssetType(ids: string[]): Observable<any> {
  return this.http.post(
    `${this.assetTypePrefix}/delete-multipal-assetType`,
    ids
  );
}

  // 7️⃣ EXCEL UPLOAD (Bulk Import)
  uploadAssetTypeExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.assetTypePrefix}/upload-excel`, formData);
  }

  // GET ALL ASSET TYPE
  private getAssetTypeApiUrl = 'http://localhost:8300/asset_type_service/all';

  getAssetType(): Observable<any> {
    return this.http.get<any>(this.getAssetTypeApiUrl);
  }

  private deleteAssetTypeApiUrl =
    'http://localhost:8300/asset_type_service/delete';

  deleteAssetType(assetTypeId: string): Observable<any> {
    return this.http.delete(`${this.deleteAssetTypeApiUrl}/${assetTypeId}`);
  }

  // GET ALL ASSET TYPE BY COMPANY
  private getAllAssetTypeByCompanyUrl =
    'http://localhost:8300/asset_type_service/getAllAssetTypeByCompanywise';

  fetchAllAssetTypeByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllAssetTypeByCompanyUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // ================================
  // GET ALL ASSET MAKE BY LOGIN ID
  // ================================
fetchAllAssetMakeByLoginId(loginId: string): Observable<any> {
  return this.http.get(
    `http://localhost:8300/asset_make_service/getAllAssetMakeByLoginId/${loginId}`
  );
}

  // ================================
  // EMPLOYEE APIs
  // ================================
  private employeePrefix = 'http://localhost:8300/employee_service';

  // ✅ save multiple employee
  submit_multiple_employee(data: any): Observable<any> {
    return this.http.post(`${this.employeePrefix}/saveAll`, data);
  }

  // ✅ fetch all employee
  fetchAllEmployee(): Observable<any> {
    return this.http.get(`${this.employeePrefix}/fetch-all-employee`);
  }

  // ✅ fetch employee by loginId
 fetchAllEmployeeByLoginId(loginId: string): Observable<any> {
  return this.http.get(
    `${this.employeePrefix}/all/${loginId}`
  );
}

  // ✅ fetch single employee
  fetchSingleEmployee(employeeId: string): Observable<any> {
    return this.http.get(`${this.employeePrefix}/single/${employeeId}`);
  }

  // ✅ update employee
  updateEmployee(employeeId: string, data: any): Observable<any> {
    return this.http.put(`${this.employeePrefix}/update/${employeeId}`, data);
  }

  // ✅ delete multiple employee
  deleteMultipleEmployee(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.employeePrefix}/delete-multiple-employee`,
      ids,
    );
  }

  // FETCH ALL DESIGNATION BY LOGIN ID
  private getAllDesignationByLoginIdApi =
    'http://localhost:8300/designation_service/getAllDesignationWithCompanyId';

  fetch_all_designation_by_login_id(loginId: string): Observable<any> {
    return this.http.get<any>(
      `${this.getAllDesignationByLoginIdApi}/${loginId}`,
    );
  }

  // IMPORT THE EMPLOYEE INFO

  // IMPORT EMPLOYEE EXCEL
  private importEmployeeApi = 'http://localhost:8300/employee_service';

  employee_upload_excel(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file, file.name);

    return this.http.post(`${this.importEmployeeApi}/import`, form);
  }
  // DELETE MULTIPLE EMPLOYEE API
  private deleteAllEmployeeApiUrl = 'http://localhost:8300/employee_service';

  deleteMultipleEmployees(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.deleteAllEmployeeApiUrl}/delete-multiple`,
      ids,
    );
  }
  // GET WEEK OFF RECORDS BY EMPLOYEE AND DATE WISE FOR ATTENDANCE API
  private readonly attendanceWeekOffApiUrl =
    'http://localhost:8300/employee_service/fetchWeekOffByEmployeeAndDate';
  fetchWeekOffByEmployee(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Observable<any> {
    const url = `${this.attendanceWeekOffApiUrl}/${employeeId}/${fromDate}/${toDate}`;
    return this.http.get<any>(url);
  }

  // POST EMPLOYEE RECORDS API
  private postEmployeeApiUrl = 'http://localhost:8300/employee_service/saveAll';
  submitEmployee(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.postEmployeeApiUrl, formData, { headers });
  }

  // PUT EMPLOYEE RECORDS API
  private putEmployeeApiUrl =
    'http://localhost:8300/employee_service/update-employee';
  updateEmployeeRecords(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<any>(this.putEmployeeApiUrl, formData, { headers });
  }

  // GET ALL EMPLOYEE BY COMPANY API
  private getAllEmployeeByCompnayUrl =
    'http://localhost:8300/employee_service/fetchAllEmployeeByCompanywise';
  fetchAllEmployeeByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllEmployeeByCompnayUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // GET SINGAL EMPLOYEE BY EMPLOYEE ID API
  private getSingleEmployeeByEmployeeIdUrl =
    'http://localhost:8300/employee_service/single';
  fetchSingalEmployeeByEmployee(employeeId: string, headCompanyId: string) {
    const [prefix, year, code] = employeeId.split('/');
    return this.http.get(
      `http://localhost:8300/employee_service/single/${prefix}/${year}/${code}/${headCompanyId}`,
    );
  }

  // GET ALL EMPLOYEE BY DEPARTMENT ID API
  private getAllEmployeeByDepartmentUrl =
    'http://localhost:8300/employee_service/fetchAllEmployeeByDepartmentwise';
  fetchAllEmployeeByDepartment(
    departmentId: string,
    headCompanyId: string,
  ): Observable<any> {
    const url = `${this.getAllEmployeeByDepartmentUrl}/${departmentId}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // ================================
  // PURCHASE ORDER APIs
  // ================================

  private purchaseOrderPrefix = 'http://localhost:8300/purchase_order_service';

  // 1️⃣ SAVE MULTIPLE PURCHASE ORDERS
  submitPurchaseOrder(data: any[]): Observable<any> {
    return this.http.post(`${this.purchaseOrderPrefix}/saveAll`, data);
  }

  // 2️⃣ FETCH SINGLE PURCHASE ORDER
  fetchSinglePurchaseOrder(purchaseOrderId: string): Observable<any> {
    return this.http.get(
      `${this.purchaseOrderPrefix}/single/${purchaseOrderId}`,
    );
  }

  // 3️⃣ FETCH ALL PURCHASE ORDERS
  fetchAllPurchaseOrders(): Observable<any> {
    return this.http.get(
      `${this.purchaseOrderPrefix}/fetch-all-purchase-order`,
    );
  }

  // 4️⃣ FETCH PURCHASE ORDERS BY LOGIN ID
 getAllPurchaseOrderByLoginId(loginId: string): Observable<any> {
  return this.http.get(
    `http://localhost:8300/purchase_order_service/getAllPurchaseOrderByLoginId/${loginId}`
  );
}
  // 5️⃣ UPDATE PURCHASE ORDER
  updatePurchaseOrder(purchaseOrderId: string, data: any): Observable<any> {
    const [prefix, year, code] = purchaseOrderId.split('/');

    return this.http.put(
      `${this.purchaseOrderPrefix}/update/${prefix}/${year}/${code}`,
      data,
    );
  }

  // 6️⃣ DELETE MULTIPLE PURCHASE ORDERS
  deleteMultiplePurchaseOrders(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.purchaseOrderPrefix}/delete-multipal-purchaseOrder`,
      ids,
    );
  }

  // GET ALL PURCHASE ORDERS
  private getAllPurchaseOrderApi =
    'http://localhost:8300/purchase_order_service/all';

  getPurchaseOrders(): Observable<any> {
    return this.http.get<any>(this.getAllPurchaseOrderApi);
  }

  // GET ALL PURCHASE ORDERS BY COMPANY
  private getAllPurchaseOrderByCompanyUrl =
    'http://localhost:8300/purchase_order_service/getAllPurchaseOrderByCompanywise';

  fetchAllPurchaseOrderByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllPurchaseOrderByCompanyUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }
  uploadPurchaseOrderExcel(formData: FormData): Observable<any> {
    return this.http.post(`${this.purchaseOrderPrefix}/upload-excel`, formData);
  }
  // ================================
  // ASSET APIs
  // ================================
  /* ===================== ASSET ===================== */
  /* ===================== ASSET APIs (FINAL FIXED) ===================== */

  private assetBaseUrl = 'http://localhost:8300/asset_service';

  /* ===================== SAVE ===================== */
  submitAsset(data: any[]): Observable<any> {
    return this.http.post(`${this.assetBaseUrl}/saveAll`, data);
  }

  /* ===================== FETCH ALL ===================== */
  fetchAllAssets(): Observable<any> {
    return this.http.get(`${this.assetBaseUrl}/fetch-all-asset`);
  }

  /* ===================== FETCH BY LOGIN ID ===================== */
fetchAssetByLoginId(loginId: string): Observable<any[]> {
  return this.http.get<any[]>(
    `http://localhost:8300/asset_service/getAllAssetByLoginId/${loginId}`
  );
}
  /* ===================== FETCH SINGLE ===================== */
  fetchSingleAsset(assetId: string, loginId: string): Observable<any> {
    const [p1, y1, c1] = assetId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.get(
      `${this.assetBaseUrl}/single/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
    );
  }

  /* ===================== UPDATE ===================== */
updateAsset(assetId: string, data: any): Observable<any> {
  const [p1, y1, c1] = assetId.split('/');

  return this.http.put(
    `${this.assetBaseUrl}/update/${p1}/${y1}/${c1}`,
    data
  );
}

  /* ===================== DELETE MULTIPLE ===================== */
  deleteMultipleAssets(ids: string[]): Observable<any> {
    return this.http.post(`${this.assetBaseUrl}/delete-multipal-asset`, ids);
  }

  /* ===================== BULK IMPORT ===================== */

  // Upload Excel for asset import
  uploadAssetExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${this.assetBaseUrl}/asset_service/upload-excel`,
      formData,
    );
  }
  // GET ALL ASSETS
  private getAllAssetApiUrl = 'http://localhost:8300/asset_service/all';

  getAssets(): Observable<any> {
    return this.http.get<any>(this.getAllAssetApiUrl);
  }

  // GET ALL ASSETS BY COMPANY
  private getAllAssetByCompanyUrl =
    'http://localhost:8300/asset_service/getAllAssetByCompanywise';

  fetchAllAssetByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllAssetByCompanyUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // ================================
  // ASSET MODEL APIs
  // ================================

  // GET ALL ASSET MODEL BY COMPANY
  private getAllAssetModelByCompanyUrl =
    'http://localhost:8300/asset_model_service/getAllAssetModelByCompanywise';

  fetchAllAssetModelByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllAssetModelByCompanyUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // ================================
  // PURCHASE ORDER APIs
  // ================================

  // ================================
  // MY ASSET APIs
  // ================================

  // GET ALL MY ASSET BY COMPANY
  private getAllMyAssetByCompanyUrl =
    'http://localhost:8300/my_asset_service/getAllMyAssetByCompanywise';

  fetchAllMyAssetByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllMyAssetByCompanyUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }

  // SAVE MY ASSET
  private saveMyAssetApiUrl = 'http://localhost:8300/my_asset_service/saveAll';

  submitMyAsset(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(this.saveMyAssetApiUrl, formData, {
      headers,
    });
  }

  // UPDATE MY ASSET
  private updateMyAssetApi = 'http://localhost:8300/my_asset_service/update';

  updateMyAsset(myassetId: string, data: any): Observable<any> {
    return this.http.put(`${this.updateMyAssetApi}/${myassetId}`, data);
  }

  // DELETE MULTIPLE MY ASSET
  private deleteMultipleMyAssetApi = 'http://localhost:8300/my_asset_service';

  deleteMultipleMyAssets(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.deleteMultipleMyAssetApi}/delete-multiple`,
      ids,
    );
  }

  // IMPORT MY ASSET EXCEL
  private importMyAssetApi = 'http://localhost:8300/my_asset_service';

  uploadMyAssetExcel(file: File): Observable<any> {
    const form = new FormData();

    form.append('file', file, file.name);

    return this.http.post(`${this.importMyAssetApi}/import`, form);
  }
  // ================================
  // ================================
  // CALL LOGGING APIs
  // ================================

  private callLoggingBaseUrl = 'http://localhost:8300/call_logging_service';

  // FETCH ALL CALL LOGGING
  fetchAllCallLogging(): Observable<any> {
    return this.http.get(`${this.callLoggingBaseUrl}/fetch-all-call-logging`);
  }

  // FETCH CALL LOGGING BY LOGIN ID
  fetchAllCallLoggingByLoginId(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `${this.callLoggingBaseUrl}/getAllCallLoggingByLoginId/${prefix}/${year}/${code}`,
    );
  }
  // FETCH SINGLE CALL LOGGING
  fetchSingleCallLogging(callId: string, loginId: string): Observable<any> {
    const [p1, y1, c1] = callId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.get(
      `${this.callLoggingBaseUrl}/single/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
    );
  }

  // SAVE CALL LOGGING
  submitCallLogging(data: any[]): Observable<any> {
    return this.http.post(`${this.callLoggingBaseUrl}/saveAll`, data);
  }

  // UPDATE CALL LOGGING
  updateCallLogging(
    callId: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    const [p1, y1, c1] = callId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.put(
      `${this.callLoggingBaseUrl}/update/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
      data,
    );
  }

  // DELETE MULTIPLE CALL LOGGING
  deleteMultipleCallLogging(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.callLoggingBaseUrl}/delete-multipal-callLogging`,
      ids,
    );
  }
  // IMPORT CALL LOGGING EXCEL
  private importCallLoggingApi = 'http://localhost:8300/call_logging_service';

  uploadCallLoggingExcel(file: File): Observable<any> {
    const form = new FormData();

    form.append('file', file, file.name);

    return this.http.post(`${this.importCallLoggingApi}/import`, form);
  }
  // ================================
  // ASSET ALLOCATION APIs
  // ================================

  // ================================
  // ASSET ALLOCATION APIs (FINAL FIXED)
  // ================================

  // ✅ BASE URL (ONLY ONE USE THIS)
  private assetAllocationBaseUrl = 'http://localhost:8300/asset-allocation';
  // ==============================
  // GET ALL BY LOGIN ID
  // ==============================
  fetchAllAssetAllocationsByCompany(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `${this.assetAllocationBaseUrl}/all/${prefix}/${year}/${code}`,
    );
  }
  fetchMyAssetByLoginId(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `http://localhost:8300/asset-allocation/my-assets/${prefix}/${year}/${code}`,
    );
  }
  // ==============================
  // GET ALL (Simple)
  // ==============================
  fetchAllAssetAllocation(): Observable<any> {
    return this.http.get(
      `${this.assetAllocationBaseUrl}/fetch-all-asset-allcation`,
    );
  }

  // ==============================
  // GET MY ASSETS
  // ==============================
  fetchMyAllocatedAssets(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `${this.assetAllocationBaseUrl}/my-assets/${prefix}/${year}/${code}`,
    );
  }

  // ==============================
  // SAVE
  // ==============================
  submitAssetAllocation(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post(`${this.assetAllocationBaseUrl}/saveAll`, formData, {
      headers,
    });
  }

  // ==============================
  // UPDATE
  // ==============================
  updateAssetAllocation(
    allocationId: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    const [p1, y1, c1] = allocationId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.put(
      `${this.assetAllocationBaseUrl}/update/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
      data,
    );
  }

  // ==============================
  // DELETE MULTIPLE
  // ==============================
  deleteMultipleAssetAllocation(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.assetAllocationBaseUrl}/delete-multiple`,
      ids,
    );
  }

  // ==============================
  // IMPORT EXCEL
  // ==============================
  uploadAssetAllocationExcel(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file, file.name);

    return this.http.post(`${this.assetAllocationBaseUrl}/import`, form);
  }
  // ================================
  // ASSET ALLOCATION APIs
  // ================================

  // ==============================
  // GET BY COMPANY (LOGIN ID)
  // ==============================

  // ==============================
  // SAVE (MULTIPLE)

  // ================================
  // SPARE ENTRY APIs
  // ================================
  // ================================
  // SPARE ENTRY APIs (FIXED)
  // ================================
  //private spareEntryBaseUrl =
  //  'http://localhost:8300/spare_entry_service/spare-entry';
  private spareEntryBaseUrl =
    'http://localhost:8300/spare_entry_service/spare-entry';
  // ==============================
  // GET ALL BY LOGIN ID

  // ==============================
  fetchAllSpareEntryByCompany(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `${this.spareEntryBaseUrl}/all/${prefix}/${year}/${code}`,
    );
  }
  // ==============================
  // GET SINGLE
  // ==============================
  fetchSingleSpareEntry(
    spareEntryId: string,
    loginId: string,
  ): Observable<any> {
    const [p1, y1, c1] = spareEntryId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.get(
      `${this.spareEntryBaseUrl}/single/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
    );
  }

  // ==============================
  // SAVE MULTIPLE
  // ==============================
  submit_multiple_spare_entry(data: any[]): Observable<any> {
    return this.http.post(`${this.spareEntryBaseUrl}/saveAll`, data);
  }

  // ==============================
  // UPDATE
  // ==============================
  updateSpareEntry(
    spareEntryId: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    const [p1, y1, c1] = spareEntryId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.put(
      `${this.spareEntryBaseUrl}/update/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
      data,
    );
  }

  // ==============================
  // DELETE MULTIPLE
  // ==============================
  deleteMultipleSpareEntry(ids: string[]): Observable<any> {
    return this.http.post(`${this.spareEntryBaseUrl}/delete-multiple`, ids);
  }

  uploadSpareEntryExcel(file: File): Observable<any> {
    const form = new FormData();

    form.append('file', file, file.name);

    return this.http.post(`${this.spareEntryBaseUrl}/import`, form);
  }
  // ================================
  // ASSET BOUGHT APIs (FINAL FIXED)
  // ================================

  // ================================
  // ASSET BOUGHT APIs (ADD THIS)
  // ================================

  // ================================
  // ASSET BOUGHT APIs ✅
  // ================================
  private assetBoughtBaseUrl = 'http://localhost:8300/asset_bought_service';

  // GET BY LOGIN ID
  // ✅ ADD THIS METHOD
  fetchAllAssetBoughtByLoginId(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `http://localhost:8300/asset_bought_service/getAllAssetBoughtByLoginId/${prefix}/${year}/${code}`,
    );
  }
  // DELETE MULTIPLE
  deleteMultipleAssetBought(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.assetBoughtBaseUrl}/delete-multiple-asset-bought`,
      ids,
    );
  }

  // SAVE
  submitAssetBought(data: any[]): Observable<any> {
    return this.http.post(`${this.assetBoughtBaseUrl}/saveAll`, data);
  }

  // UPDATE
  updateAssetBought(
    assetId: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    const [p1, y1, c1] = assetId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.put(
      `${this.assetBoughtBaseUrl}/update/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
      data,
    );
  }

  // ==============================
  // IMPORT EXCEL
  // ==============================
  uploadAssetBoughtExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(`${this.assetBoughtBaseUrl}/import`, formData);
  }

  // ================================
  // ASSET REPLACEMENT APIs (FINAL)
  // ================================

  private assetReplacementBaseUrl =
    'http://localhost:8300/asset_replacement_service';

  // ==============================
  // GET ALL BY LOGIN ID
  // ==============================
  fetchAllAssetReplacementByCompany(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `${this.assetReplacementBaseUrl}/getAllAssetReplacementByLoginId/${prefix}/${year}/${code}`,
    );
  }

  // ==============================
  // GET SINGLE
  // ==============================
  fetchSingleAssetReplacement(
    replacementId: string,
    loginId: string,
  ): Observable<any> {
    const [p1, y1, c1] = replacementId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.get(
      `${this.assetReplacementBaseUrl}/single/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
    );
  }

  // ==============================
  // SAVE MULTIPLE
  // ==============================
  submitAssetReplacement(data: any[]): Observable<any> {
    return this.http.post(`${this.assetReplacementBaseUrl}/saveAll`, data);
  }

  // ==============================
  // UPDATE
  // ==============================
  updateAssetReplacement(
    replacementId: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    const [p1, y1, c1] = replacementId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.put(
      `${this.assetReplacementBaseUrl}/update/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
      data,
    );
  }

  // ==============================
  // DELETE MULTIPLE
  // ==============================
  deleteMultipleAssetReplacement(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.assetReplacementBaseUrl}/delete-multiple-assetReplacements`,
      ids,
    );
  }

  // ==============================
  // IMPORT EXCEL
  // ==============================
  uploadAssetReplacementExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(`${this.assetReplacementBaseUrl}/import`, formData);
  }

  // ================================
  // ASSET STATUS CHANGE APIs (FINAL)
  // ================================

  private assetStatusChangeBaseUrl =
    'http://localhost:8300/asset_status_change_service/asset-status-change';

  // ==============================
  // GET ALL BY LOGIN ID
  // ==============================
  fetchAllAssetStatusChangeByCompany(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `${this.assetStatusChangeBaseUrl}/getAllAssetStatusChangeByLoginId/${prefix}/${year}/${code}`,
    );
  }

  // ==============================
  // GET SINGLE
  // ==============================
  fetchSingleAssetStatusChange(
    statusChangeId: string,
    loginId: string,
  ): Observable<any> {
    const [p1, y1, c1] = statusChangeId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.get(
      `${this.assetStatusChangeBaseUrl}/single/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
    );
  }

  // ==============================
  // SAVE MULTIPLE
  // ==============================
  submitAssetStatusChange(data: any[]): Observable<any> {
    return this.http.post(`${this.assetStatusChangeBaseUrl}/saveAll`, data);
  }

  // ==============================
  // UPDATE
  // ==============================
  updateAssetStatusChange(
    statusChangeId: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    const [p1, y1, c1] = statusChangeId.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.put(
      `${this.assetStatusChangeBaseUrl}/update/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
      data,
    );
  }

  // ==============================
  // DELETE MULTIPLE
  // ==============================
  deleteMultipleAssetStatusChange(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.assetStatusChangeBaseUrl}/delete-multiple`,
      ids,
    );
  }

  // ==============================
  // IMPORT EXCEL
  // ==============================
  uploadAssetStatusChangeExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(`${this.assetStatusChangeBaseUrl}/import`, formData);
  }

  // ==========================================
  // ASSET RETURN APIs
  // ==========================================
  // ==========================================
  // ASSET RETURN APIs (FIXED AS PER CONTROLLER)
  // ==========================================

  // ================================
  // ASSET RETURN APIs (FINAL)
  // ================================

  private assetReturnBaseUrl =
    'http://localhost:8300/asset_returned_service/asset-return';
  // GET ALL
  fetchAllAssetReturnsByCompany(loginId: string): Observable<any> {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get(
      `${this.assetReturnBaseUrl}/all/${prefix}/${year}/${code}`,
    );
  }

  // SAVE
  submitAssetReturn(data: any[]): Observable<any> {
    return this.http.post(`${this.assetReturnBaseUrl}/saveAll`, data);
  }

  // UPDATE
  updateAssetReturn(id: string, loginId: string, data: any): Observable<any> {
    const [p1, y1, c1] = id.split('/');
    const [p2, y2, c2] = loginId.split('/');

    return this.http.put(
      `${this.assetReturnBaseUrl}/update/${p1}/${y1}/${c1}/${p2}/${y2}/${c2}`,
      data,
    );
  }

  // DELETE
  deleteMultipleAssetReturns(ids: string[]): Observable<any> {
    return this.http.post(`${this.assetReturnBaseUrl}/delete-multiple`, ids);
  }

  /* ==========================================
   UPDATE
   PUT /asset-return/update/{p}/{y}/{c}/{p1}/{y1}/{c1}



  /* ==========================================
   IMPORT EXCEL (BULK UPLOAD)
========================================== */

  uploadAssetReturnExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<any>(`${this.assetReturnBaseUrl}/import`, formData);
  }

  // ================================
  // GRAND USER APIs
  // ================================

  // GET ALL GRAND USERS BY LOGIN ID
  private getAllGrandUserApiUrl = 'http://localhost:8300/grand-user/all';

  fetchAllGrandUserByLoginId(loginId: string): Observable<any> {
    return this.http.get<any>(`${this.getAllGrandUserApiUrl}/${loginId}`);
  }

  // SAVE GRAND USERS
  private saveGrandUserApiUrl = 'http://localhost:8300/grand-user/save-all';

  submitGrandUser(formData: any[]): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.saveGrandUserApiUrl, formData, { headers });
  }

  // UPDATE GRAND USER
  private updateGrandUserApiUrl = 'http://localhost:8300/grand-user/update';

  updateGrandUser(
    prefix: string,
    year: string,
    code: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    return this.http.put(
      `${this.updateGrandUserApiUrl}/${prefix}/${year}/${code}/${loginId}`,
      data,
    );
  }

  // DELETE MULTIPLE GRAND USERS
  private deleteMultipleGrandUserApi = 'http://localhost:8300/grand-user';

  deleteMultipleGrandUser(ids: string[]): Observable<any> {
    return this.http.post(
      `${this.deleteMultipleGrandUserApi}/delete-multiple`,
      ids,
    );
  }

  // ================================
  // USER CREATION APIs
  // ================================

  // GET ALL USERS

  private getAllUserApi = 'http://localhost:8300/api/users/all';
  fetchAllUsersByLoginId(loginId: string): Observable<any> {
    return this.http.get<any>(`${this.getAllUserApi}/${loginId}`);
  }

  private getSingleUserApi = 'http://localhost:8300/user-creation/single';
  fetchSingleUser(
    prefix: string,
    year: string,
    code: string,
    loginId: string,
  ): Observable<any> {
    return this.http.get<any>(
      `${this.getSingleUserApi}/${prefix}/${year}/${code}/${loginId}`,
    );
  }

  deleteUser(prefix: string, year: string, code: string, deletedBy: string) {
    const token = localStorage.getItem('token'); // किंवा authService

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.delete(
      `http://localhost:8300/api/users/delete/${prefix}/${year}/${code}/${deletedBy}`,
      { headers },
    );
  }
  login(data: any) {
    return this.http.post(
      'http://localhost:8300/api/users/sign-in', // ✅ CORRECT
      data,
    );
  }
  fetchAllLocks() {
    return this.http.get('/locking_unlocking_service/fetch-all');
  }

  toggleStatus(data: any) {
    return this.http.post('/locking_unlocking_service/toggle', data);
  }
  private deleteMultipleUserApi = 'http://localhost:8300/user-creation';
  deleteMultipleUsers(ids: string[]): Observable<any> {
    return this.http.post<any>(
      `${this.deleteMultipleUserApi}/delete-multiple`,
      ids,
    );
  }
  lockUser(empCode: string, reason: string) {
    const token = this.authService.getToken();

    return this.http.put(
      `http://localhost:8300/api/users/lock/${empCode}`,
      reason,
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        }),
      },
    );
  }
  unlockUser(empCode: string) {
    //const token = localStorage.getItem('accessToken');
    const token = this.authService.getToken();
    return this.http.put(
      `http://localhost:8300/api/users/unlock/${empCode}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  }
  // GET ALL USER LOCKINGS BY LOGIN ID
  private getAllUserLockingApi = 'http://localhost:8300/user-locking/all';

  // GET SINGLE USER LOCKING
  private getSingleUserLockingApi = 'http://localhost:8300/user-locking/single';
  fetchSingleUserLocking(
    prefix: string,
    year: string,
    code: string,
    loginId: string,
  ): Observable<any> {
    return this.http.get<any>(
      `${this.getSingleUserLockingApi}/${prefix}/${year}/${code}/${loginId}`,
    );
  }

  submitUser(data: any) {
    return this.http.post('http://localhost:8300/api/users/sign-up', data);
  }
  // UPDATE SINGLE USER LOCKING
  private updateUserLockingApi = 'http://localhost:8300/user-locking/update';
  updateUserLocking(
    prefix: string,
    year: string,
    code: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    return this.http.put<any>(
      `${this.updateUserLockingApi}/${prefix}/${year}/${code}/${loginId}`,
      data,
    );
  }

  // DELETE MULTIPLE USER LOCKINGS
  private deleteMultipleUserLockingApi =
    'http://localhost:8300/user-locking/delete-multiple';
  deleteMultipleUserLockings(ids: string[]): Observable<any> {
    return this.http.post<any>(`${this.deleteMultipleUserLockingApi}`, ids);
  }

  // Optional: DELETE SINGLE USER LOCKING (if you enable in controller)
  // private deleteUserLockingApi = 'http://localhost:8300/user-locking/delete';
  // deleteUserLocking(prefix: string, year: string, code: string, loginId: string): Observable<any> {
  //   return this.http.delete<any>(`${this.deleteUserLockingApi}/${prefix}/${year}/${code}/${loginId}`);
  // }

  //UserPassword API
  // GET ALL USER PASSWORDS BY LOGIN ID
  private getAllUserPasswordApi = 'http://localhost:8300/user-password/all';
  fetchAllUserPasswordsByLoginId(loginId: string): Observable<any> {
    return this.http.get<any>(`${this.getAllUserPasswordApi}/${loginId}`);
  }

  // GET SINGLE USER PASSWORD
  private getSingleUserPasswordApi =
    'http://localhost:8300/user-password/single';
  fetchSingleUserPassword(
    prefix: string,
    year: string,
    code: string,
    loginId: string,
  ): Observable<any> {
    return this.http.get<any>(
      `${this.getSingleUserPasswordApi}/${prefix}/${year}/${code}/${loginId}`,
    );
  }

  // SAVE MULTIPLE USER PASSWORDS
  private saveUserPasswordApi = 'http://localhost:8300/user-password/save-all';
  submitUserPasswords(users: any[] | any): Observable<any> {
    const payload = Array.isArray(users) ? users : [users];
    return this.http.post<any>(this.saveUserPasswordApi, payload);
  }

  // UPDATE SINGLE USER PASSWORD
  private updateUserPasswordApi = 'http://localhost:8300/user-password/update';
  updateUserPassword(
    prefix: string,
    year: string,
    code: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    return this.http.put<any>(
      `${this.updateUserPasswordApi}/${prefix}/${year}/${code}/${loginId}`,
      data,
    );
  }

  // DELETE MULTIPLE USER PASSWORDS
  private deleteMultipleUserPasswordApi =
    'http://localhost:8300/user-password/delete-multiple';
  deleteMultipleUserPasswords(ids: string[]): Observable<any> {
    return this.http.post<any>(`${this.deleteMultipleUserPasswordApi}`, ids);
  }

  //UserUnlocking API

  // GET ALL USER UNLOCKINGS BY LOGIN ID
  private getAllUserUnlockingApi = 'http://localhost:8300/user-Unlocking/all';
  fetchAllUserUnlockingsByLoginId(loginId: string): Observable<any> {
    return this.http.get<any>(`${this.getAllUserUnlockingApi}/${loginId}`);
  }

  // GET SINGLE USER UNLOCKING
  private getSingleUserUnlockingApi =
    'http://localhost:8300/user-Unlocking/single';
  fetchSingleUserUnlocking(
    prefix: string,
    year: string,
    code: string,
    loginId: string,
  ): Observable<any> {
    return this.http.get<any>(
      `${this.getSingleUserUnlockingApi}/${prefix}/${year}/${code}/${loginId}`,
    );
  }

  // SAVE MULTIPLE USER UNLOCKINGS
  private saveUserUnlockingApi =
    'http://localhost:8300/user-Unlocking/save-all';
  submitUserUnlockings(users: any[] | any): Observable<any> {
    const payload = Array.isArray(users) ? users : [users];
    return this.http.post<any>(this.saveUserUnlockingApi, payload);
  }

  // UPDATE SINGLE USER UNLOCKING
  private updateUserUnlockingApi =
    'http://localhost:8300/user-Unlocking/update';
  updateUserUnlocking(
    prefix: string,
    year: string,
    code: string,
    loginId: string,
    data: any,
  ): Observable<any> {
    return this.http.put<any>(
      `${this.updateUserUnlockingApi}/${prefix}/${year}/${code}/${loginId}`,
      data,
    );
  }

  // DELETE MULTIPLE USER UNLOCKINGS
  private deleteMultipleUserUnlockingApi =
    'http://localhost:8300/user-Unlocking/delete-multiple';
  deleteMultipleUserUnlockings(ids: string[]): Observable<any> {
    return this.http.post<any>(`${this.deleteMultipleUserUnlockingApi}`, ids);
  }

  // Optional: DELETE SINGLE USER UNLOCKING (if you enable in controller)
  // private deleteUserUnlockingApi = 'http://localhost:8300/user-Unlocking/delete';
  // deleteUserUnlocking(prefix: string, year: string, code: string, loginId: string): Observable<any> {
  //   return this.http.delete<any>(`${this.deleteUserUnlockingApi}/${prefix}/${year}/${code}/${loginId}`);
  // }
  // GET ALL ASSIGN SHIFT EMPLOYEEWISE RECORDS API
  private getAllAssignShiftEmpByCompnayUrl =
    'http://129.121.79.121:8300/assign_employeewise_shift/getAllAssignShiftByCompanywise';
  fetchAllAssignShiftEmployeewiseByCompany(
    headCompanyId: string,
  ): Observable<any> {
    const url = `${this.getAllAssignShiftEmpByCompnayUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }
  getAllAssignShiftByCompany(headCompanyId: string) {
    return this.http.get<any>(
      `http://129.121.79.121:8300/api/assign-shifts?headCompanyId=${headCompanyId}`,
    );
  }
  // GET SHIFT ID && EMPLOYEE NAME FROM ASSIGN SHIFT EMPLOYEEWISE API
  private getShiftIdAndEmployeeFromAssignShiftEmployeewiseUrl =
    'http://129.121.79.121:8300/assign_employeewise_shift/getShiftByDate';
  fetchShiftIdAndEmployeeFromAssignShiftEmployeewise(
    employeeId: string,
    currentDate: String,
  ): Observable<any> {
    const url = `${this.getShiftIdAndEmployeeFromAssignShiftEmployeewiseUrl}/${employeeId}/${currentDate}`;
    return this.http.get<any>(url);
  }

  // GET SHIFT ID && DEPARTMENT NAME FROM ASSIGN SHIFT DEPARTMENT API
  private getShiftIdAndDepartmentFromAssignShiftDepartmentwiseUrl =
    'http://129.121.79.121:8300/assign_shift_departmentwise/checkAssignShiftDepartmentwise';
  fetchShiftIdAndDepartmentFromAssignShiftDepartment(
    employeeId: string,
    currentDate: String,
  ): Observable<any> {
    const url = `${this.getShiftIdAndDepartmentFromAssignShiftDepartmentwiseUrl}/${employeeId}/${currentDate}`;
    return this.http.get<any>(url);
  }

  private getAllAssignShiftDepartmentByCompnayUrl =
    'http://129.121.79.121:8300/assign_shift_departmentwise/getAllAssignShiftDepartmentByCompanywise';
  fetchAllAssignShiftDepartmentwiseByCompany(
    headCompanyId: string,
  ): Observable<any> {
    const url = `${this.getAllAssignShiftDepartmentByCompnayUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }
  // GET ALL ASSIGN SHIFT DAYWISE RECORDS API
  private getAllAssignShiftDaywiseByCompnayUrl =
    'http://129.121.79.121:8300/assign_shift_daywise/getAllAssignShiftDaywiseByHeadCompany';
  fetchAllAssignShiftDaywiseByCompany(headCompanyId: string): Observable<any> {
    const url = `${this.getAllAssignShiftDaywiseByCompnayUrl}/${headCompanyId}`;
    return this.http.get<any>(url);
  }
  // ================================
  // USER LOCKING / UNLOCKING APIs
  // ================================

  private userBaseUrl = 'http://localhost:8300/api/users';
  // 🔥 ADD THIS METHOD
  private userApiUrl = 'http://localhost:8300/api/users';

  //fetchAllUsers(): Observable<any> {
  //  return this.http.get(`${this.userApiUrl}/all`);
  //}
  fetchAllUsers() {
    return this.http.get<any[]>('http://localhost:8300/api/users/all');
  }
  // ✅ Update User Status (Lock / Unlock)
  updateUserStatus(data: any): Observable<any> {
    return this.http.put(
      `${this.userBaseUrl}/update-user-status/${data.userId}`,
      data,
    );
  }

  // ✅ Get Single User by Employee Code
  fetchUserByEmployeeCode(employeeCode: string): Observable<any> {
    return this.http.get(`${this.userBaseUrl}/username/${employeeCode}`);
  }
  fetchUserLockingData() {
    return this.http.get('http://localhost:8300/fetch-all-user');
  }
changePassword(data: any) {
  const token = localStorage.getItem('token'); // 🔥 IMPORTANT FIX

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  return this.http.post(
    'http://localhost:8300/api/users/change-password',
    data,
    { headers },
  );
}
  updateUser(prefix: string, year: string, code: string, data: any) {
    //const token = localStorage.getItem('token');
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    return this.http.put(
      `http://localhost:8300/api/users/update/${prefix}/${year}/${code}`,
      data,
      { headers },
    );
  }
  // 🔥 USER LOCKING FETCH API
  private userLockingApi = 'http://localhost:8300/user_locking_service';

  fetchAllUserLockingsByLoginId(loginId: string) {
    const [prefix, year, code] = loginId.split('/');

    return this.http.get<any[]>(
      `${this.userLockingApi}/getAllUserLockingByLoginId/${prefix}/${year}/${code}`,
    );
  }
  getAllShiftChanges(companyId: string): Observable<{
    empWise: any[];
    deptWise: any[];
    dayWise: any[];
  }> {
    return forkJoin({
      empWise: this.fetchAllAssignShiftEmployeewiseByCompany(companyId),
      deptWise: this.fetchAllAssignShiftDepartmentwiseByCompany(companyId),
      dayWise: this.fetchAllAssignShiftDaywiseByCompany(companyId),
    });
  }
}
