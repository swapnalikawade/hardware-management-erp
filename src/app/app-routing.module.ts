import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DepartmentComponent } from './components/master/department/department.component';
import { DesignationComponent } from './components/master/designation/designation.component';
import { EmployeeComponent } from './components/master/employee/employee.component';
import { AssetsComponent } from './components/master/assets/assets.component';
import { PurchaseOrderComponent } from './components/master/purchase-order/purchase-order.component';
import { AssetsTypeComponent } from './components/master/assets-type/assets-type.component';

import { MyAssetComponent } from './components/transaction/my-asset/my-asset.component';
import { AssetAllocationComponent } from './components/transaction/asset-allocation/asset-allocation.component';
import { AssetBoughtComponent } from './components/transaction/asset-bought/asset-bought.component';
import { AssetReplacementComponent } from './components/transaction/asset-replacement/asset-replacement.component';
import { AssetReturnComponent } from './components/transaction/asset-return/asset-return.component';
import { AssetStatusComponent } from './components/transaction/asset-status/asset-status.component';
import { CallLoggingComponent } from './components/transaction/call-logging/call-logging.component';
import { SpareEntryComponent } from './components/transaction/spare-entry/spare-entry.component';

import { RgpReportComponent } from './components/report/rgp-report/rgp-report.component';
import { NrgpReportComponent } from './components/report/nrgp-report/nrgp-report.component';

import { UserCreateComponent } from './components/authorisation/user-create/user-create.component';
import { UserLockingComponent } from './components/authorisation/user-locking/user-locking.component';
import { UserUnlockingComponent } from './components/authorisation/user-unlocking/user-unlocking.component';
import { UserPasswordComponent } from './components/authorisation/user-password/user-password.component';
import { GrandUserComponent } from './components/authorisation/grand-user/grand-user.component';
import { CallLoggingreportComponent } from './components/report/call-loggingreport/call-loggingreport.component';
import { LoginComponent } from './components/auth/login/login.component';
import { AssetsMakeComponent } from './components/master/assets-make/assets-make.component';

const routes: Routes = [
  // MASTER
  { path: 'dashboard', component: EmployeeComponent }, // 👈 ही ओळ add केली

  { path: 'master/department', component: DepartmentComponent },
  { path: 'master/designation', component: DesignationComponent },
  { path: 'master/employee', component: EmployeeComponent },
  { path: 'master/assets', component: AssetsComponent },
  { path: 'master/assets-type', component: AssetsTypeComponent },
  { path: 'master/assets-make', component: AssetsMakeComponent },
  { path: 'master/purchase-order', component: PurchaseOrderComponent },

  // TRANSACTION
  { path: 'transaction/my-asset', component: MyAssetComponent },
  { path: 'transaction/asset-allocation', component: AssetAllocationComponent },
  { path: 'transaction/asset-bought', component: AssetBoughtComponent },
  {
    path: 'transaction/asset-replacement',
    component: AssetReplacementComponent,
  },
  { path: 'transaction/asset-return', component: AssetReturnComponent },
  { path: 'transaction/asset-status', component: AssetStatusComponent },
  { path: 'transaction/call-logging', component: CallLoggingComponent },
  { path: 'transaction/spare-entry', component: SpareEntryComponent },

  // REPORTS
  { path: 'report/call-logging-report', component: CallLoggingreportComponent },
  { path: 'report/rgp-report', component: RgpReportComponent },
  { path: 'report/nrgp-report', component: NrgpReportComponent },

  // AUTHORISATION
  { path: 'authorisation/user-create', component: UserCreateComponent },
  { path: 'authorisation/user-locking', component: UserLockingComponent },
  { path: 'authorisation/user-unlocking', component: UserUnlockingComponent },
  { path: 'authorisation/grand-user', component: GrandUserComponent },
  { path: 'authorisation/user-password', component: UserPasswordComponent },
  { path: 'auth/login', component: LoginComponent },
  // DEFAULT
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'master/employee' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
