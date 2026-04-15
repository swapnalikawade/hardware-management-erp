import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8300/api/users/sign-in';
  private tokenKey = 'authToken';
  private rolesKey = 'userRoles';
  private usernameKey = 'userName';
  private currentDateKey = 'currentDate';
  private employeeIdKey = 'employeeId';
  private employeeCodeKey = 'employeeCode';
  private employeeNameKey = 'employeeName';
  private sessionExpiryKey = 'sessionExpiry';

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(employeeCode: string, userPassword: string): Observable<any> {
    const encodedCredentials = btoa(
      unescape(encodeURIComponent(`${employeeCode}:${userPassword}`)),
    );

    const headers = new HttpHeaders({
      Authorization: `Basic ${encodedCredentials}`,
      'Content-Type': 'application/json',
    });

    return this.http.post<any>(this.apiUrl, {}, { headers }).pipe(
      tap((response) => {
        // Set session duration: 2 minutes = 2 * 60 * 1000 ms
        const sessionDuration = 24 * 60 * 1000;
        const expiryTime = Date.now() + sessionDuration;

        // Store token and user info in cookies
        this.setCookie(this.tokenKey, response.accessToken, 1);
        // this.setCookie(this.rolesKey, JSON.stringify(response.user_name), 1);
        this.setCookie(this.rolesKey, JSON.stringify(response.user_role), 1); // 🔥 FIX
        this.setCookie(this.usernameKey, employeeCode, 1);
        this.setCookie(this.employeeIdKey, employeeCode, 1); // 🔥 FIX
        this.setCookie(this.currentDateKey, new Date().toDateString(), 1);
        this.setCookie(this.sessionExpiryKey, expiryTime.toString(), 1);
localStorage.setItem('token', response.accessToken);
        this.isLoggedInSubject.next(true);

        // Role-based redirection
        this.redirectUser(response.user_role);

        // Fetch and store company data
        this.fetchAndStoreCompanyData(employeeCode);

        // Optional: Auto logout timer (for real-time expiry)
        this.startAutoLogoutTimer(sessionDuration);
      }),
      catchError((error) => {
        console.error('Login failed:', error);
        this.clearAuthState();
        return throwError(() => error);
      }),
    );
  }

  private fetchAndStoreCompanyData(employeeCode: string): void {
    this.http
      .get<
        any[]
      >(`http://localhost:8300/employee_service/username/${employeeCode}`)
      .subscribe({
        next: (data) => {
          const employees = Array.isArray(data) ? data : [data];
          if (employees.length) {
            const employee = employees[0];
            this.setCookie(this.employeeIdKey, String(employee.employeeId), 1);
            this.setCookie(
              this.employeeCodeKey,
              String(employee.employeeCode),
              1,
            );
            this.setCookie(
              this.employeeNameKey,
              employee.employeeName || '',
              1,
            );
            this.setCookie('employeeDOB', employee.employeeDOB || '', 1);
            this.setCookie('employeeAge', employee.employeeAge || '', 1);
            this.setCookie(
              'employeeMarriedStatus',
              employee.employeeMarriedStatus || '',
              1,
            );
            this.setCookie('employeeGender', employee.employeeGender || '', 1);
            this.setCookie('employeeEmail', employee.employeeEmail || '', 1);
            this.setCookie(
              'employeeAddress',
              employee.employeeAddress || '',
              1,
            );
            this.setCookie('employeeStatus', employee.employeeStatus || '', 1);
          }
        },
        error: (error) => {
          console.error('Error fetching company data:', error);
        },
      });
  }

  logout(): void {
    this.clearAuthState();
    this.router.navigate(['/login-page'], {
      queryParams: { sessionExpired: true },
    });
  }

  private clearAuthState(): void {
    [
      this.tokenKey,
      this.rolesKey,
      this.usernameKey,
      this.employeeIdKey,
      this.employeeNameKey,
      this.currentDateKey,
      this.sessionExpiryKey,
    ].forEach((key) => this.deleteCookie(key));
    sessionStorage.clear();
    this.isLoggedInSubject.next(false);
  }

  isLoggedIn(): Observable<boolean> {
    return this.isLoggedInSubject.asObservable();
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !this.isSessionExpired();
  }

  private hasToken(): boolean {
    return !!this.getToken() && !this.isSessionExpired();
  }

  isSessionExpired(): boolean {
    const expiry = this.getCookie(this.sessionExpiryKey);
    if (!expiry) return true;
    const expiryTime = parseInt(expiry, 10);
    return Date.now() > expiryTime;
  }

  private startAutoLogoutTimer(duration: number): void {
    setTimeout(() => {
      if (this.isSessionExpired()) {
        this.logout();
      }
    }, duration);
  }

  getToken(): string | null {
    return this.getCookie(this.tokenKey);
  }

  getUsername(): string | null {
    return this.getCookie(this.usernameKey);
  }

  getEmployeeId(): string | null {
    return this.getCookie(this.employeeIdKey);
  }
  getEmployeeCode(): string | null {
    return this.getCookie(this.employeeCodeKey);
  }
  getEmployeeName(): string | null {
    return this.getCookie(this.employeeNameKey);
  }

  getCurrentDate(): string | null {
    return this.getCookie(this.currentDateKey);
  }

  getUserRoles(): string | null {
    const roles = this.getCookie(this.rolesKey);
    try {
      return roles ? JSON.parse(roles) : null;
    } catch (e) {
      console.error('Error parsing roles:', e);
      return null;
    }
  }

  hasRole(role: string): boolean {
    const roles = this.getUserRoles();
    return roles ? roles.includes(role) : false;
  }

  private redirectUser(roles: string[] | string): void {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    alert('user role: ' + roleArray);
    if (roleArray.includes('ROLE_ADMIN')) {
      this.router.navigate(['master/department']);
    } else if (roleArray.includes('ROLE_USER')) {
      this.router.navigate(['master/designation']);
    } else if (roleArray.includes('ROLE_MANAGER')) {
      this.router.navigate(['master/employee']);
    } else {
      this.clearAuthState();
      this.router.navigate(['/unauthorized']);
    }
  }

  // ---------------- Cookie Helpers ----------------

  private setCookie(name: string, value: string, days: number): void {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${d.toUTCString()}`;
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Strict`;
  }

  private getCookie(name: string): string | null {
    const nameEq = `${name}=`;
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(nameEq)) {
        return decodeURIComponent(cookie.substring(nameEq.length));
      }
    }
    return null;
  }

  private deleteCookie(name: string): void {
    this.setCookie(name, '', -1);
  }
}
