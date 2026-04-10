import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatTab, MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import {
  MatCard,
  MatCardHeader,
  MatCardModule,
  MatCardTitle,
} from '@angular/material/card';
import { NgToastModule } from 'ng-angular-popup';
import { MatRadioModule } from '@angular/material/radio';
import { MatListModule, MatNavList } from '@angular/material/list';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CustomSidenavComponent } from './navbar/custom-sidenav/custom-sidenav.component';
import { MenuItemComponent } from './navbar/menu-item/menu-item.component';
import { DepartmentComponent } from './components/master/department/department.component';
import { DesignationComponent } from './components/master/designation/designation.component';
import { EmployeeComponent } from './components/master/employee/employee.component';
import { AssetsComponent } from './components/master/assets/assets.component';
import { PurchaseOrderComponent } from './components/master/purchase-order/purchase-order.component';

import { MyAssetComponent } from './components/transaction/my-asset/my-asset.component';
import { CallLoggingComponent } from './components/transaction/call-logging/call-logging.component';
import { AssetAllocationComponent } from './components/transaction/asset-allocation/asset-allocation.component';
import { SpareEntryComponent } from './components/transaction/spare-entry/spare-entry.component';
import { AssetReturnComponent } from './components/transaction/asset-return/asset-return.component';
import { AssetBoughtComponent } from './components/transaction/asset-bought/asset-bought.component';
import { AssetStatusComponent } from './components/transaction/asset-status/asset-status.component';
import { AssetReplacementComponent } from './components/transaction/asset-replacement/asset-replacement.component';
import { RgpReportComponent } from './components/report/rgp-report/rgp-report.component';
import { NrgpReportComponent } from './components/report/nrgp-report/nrgp-report.component';
import { UserCreateComponent } from './components/authorisation/user-create/user-create.component';
import { UserLockingComponent } from './components/authorisation/user-locking/user-locking.component';
import { GrandUserComponent } from './components/authorisation/grand-user/grand-user.component';
import { UserPasswordComponent } from './components/authorisation/user-password/user-password.component';
import { UserUnlockingComponent } from './components/authorisation/user-unlocking/user-unlocking.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { CallLoggingreportComponent } from './components/report/call-loggingreport/call-loggingreport.component';
import { LoginComponent } from './components/auth/login/login.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AssetsMakeComponent } from './components/master/assets-make/assets-make.component';
import { AssetsTypeComponent } from './components/master/assets-type/assets-type.component';

@NgModule({
  declarations: [
    AppComponent,
    CustomSidenavComponent,
    MenuItemComponent,
    DepartmentComponent,
    DesignationComponent,
    EmployeeComponent,
    AssetsComponent,
    PurchaseOrderComponent,
    AssetsTypeComponent,
    AssetsMakeComponent,
    MyAssetComponent,
    CallLoggingComponent,
    AssetAllocationComponent,
    SpareEntryComponent,
    AssetReturnComponent,
    AssetBoughtComponent,
    AssetStatusComponent,
    AssetReplacementComponent,
    RgpReportComponent,
    NrgpReportComponent,
    UserCreateComponent,
    UserLockingComponent,
    GrandUserComponent,
    UserPasswordComponent,
    UserUnlockingComponent,
    CallLoggingreportComponent,
    LoginComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    NgSelectModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatMenuModule,
    MatCard,
    FormsModule,
    MatCardHeader,
    MatCardTitle,
    MatTabGroup,
    MatTab,
    MatCardModule,
    NgToastModule,
    MatRadioModule,
    MatNavList,
    MatListModule,
    RouterModule,
    MatIcon,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
