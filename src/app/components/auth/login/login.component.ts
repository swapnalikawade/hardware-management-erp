import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { NgToastService } from 'ng-angular-popup';
import { AuthService } from '../../../services/auth/auth-service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  employeeCode: any;
  userPassword: any;
  companyRecords: any = null;
  eventTitle: string = 'Welcome Back!';
  eventSubtitle: string = 'Sign in to your account.';
  leftBg: string = '#ffffff'; // default white
  rightBg: string = '#ffffff';

  isLoading = false;
  errorMsg = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: NgToastService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['sessionExpired']) {
        this.toast.danger(
          'Your session has expired. Please log in again.',
          '',
          4000,
        );
      }
    });
  }

  //  login(): void {
  //    this.isLoading = true;
  //    this.errorMsg = '';
  //
  //    this.authService.login(this.employeeCode, this.userPassword).subscribe(
  //      () => {
  //        this.toast.success('Login successful!.', '', 3500);
  //      },
  //      (error) => {
  //        setTimeout(() => {
  //          this.errorMsg = 'Invalid Email or Password!';
  //          this.isLoading = false;
  //        }, 800);
  //        this.toast.danger('Invalid credentials. Please try again.', '', 4000);
  //      },
  //    );
  //  }
  login(): void {
    this.isLoading = true;
    this.errorMsg = '';

    this.authService.login(this.employeeCode, this.userPassword).subscribe(
      (res: any) => {
        // ✅ RESPONSE घ्यायचा

        console.log('LOGIN RESPONSE:', res); // 🔥 DEBUG

        // ✅ TOKEN SAVE (MOST IMPORTANT)
        localStorage.setItem('accessToken', res.accessToken);

        this.toast.success('Login successful!.', '', 3500);

        this.router.navigate(['/dashboard']);
      },
      (error) => {
        setTimeout(() => {
          this.errorMsg = 'Invalid Email or Password!';
          this.isLoading = false;
        }, 800);
        this.toast.danger('Invalid credentials. Please try again.', '', 4000);
      },
    );
  }
  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
