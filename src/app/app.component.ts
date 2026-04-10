import { Component, computed, signal, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Router, NavigationEnd } from '@angular/router';
import { TOAST_POSITIONS } from 'ng-angular-popup';
@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <ng-container *ngIf="showLayout">
      <mat-toolbar class="mat-elevation-z3 top-toolbar">
        <div class="left-section">
          <button mat-icon-button (click)="collapsed.set(!collapsed())">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="menu-title">Goa Shipyard Gov.Ltd</span>
        </div>
        <span class="spacer"></span>
        <div class="right-section">
          <div class="search-box">
            <i class="bi bi-search" style="color: gray; font-size: 14px;"></i>
            <input type="text" placeholder="Search..." />
          </div>

          <button mat-icon-button>
            <mat-icon>center_focus_weak</mat-icon>
          </button>

          <button mat-icon-button>
            <mat-icon>notifications</mat-icon>
          </button>

          <button mat-icon-button>
            <mat-icon>mail</mat-icon>
          </button>

          <button mat-icon-button [matMenuTriggerFor]="profileMenu">
            <mat-icon>account_box</mat-icon>
          </button>

          <mat-menu #profileMenu="matMenu">
            <button mat-menu-item>profile</button>
            <button mat-menu-item>setting</button>
            <button mat-menu-item>Logout</button>
          </mat-menu>

          <button mat-icon-button (click)="toggleCard()">
            <mat-icon>settings</mat-icon>
          </button>
          <!-- Logout Icon -->
          <button mat-icon-button (click)="logout()">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </mat-toolbar>

      <mat-sidenav-container>
        <mat-sidenav opened mode="side" [style.width]="sidenavWidth()">
          <app-custom-sidenav [collapsed]="collapsed()" />
        </mat-sidenav>

        <mat-sidenav-content
          class="content"
          [style.marginLeft]="sidenavWidth()"
        >
          <ng-toast
            [position]="TOAST_POSITIONS.BOTTOM_RIGHT"
            [width]="400"
          ></ng-toast>
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>

      <!-- Card sliding from right -->
      <div
        class="card-container"
        [@slideCard]="cardOpen ? 'visible' : 'hidden'"
      >
        <mat-card class="slide-card">
          <mat-card-header class="flex-content matCardHeader">
            <mat-card-title>Switcher</mat-card-title>
            <button mat-icon-button (click)="toggleCard()">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>

          <mat-tab-group>
            <!-- (तुझं existing tabs content जसंच्या तसं ठेऊ शकतोस) -->
          </mat-tab-group>
        </mat-card>
      </div>
    </ng-container>

    <!-- Login page only -->
    <router-outlet *ngIf="!showLayout"></router-outlet>
  `,

  styleUrls: ['./app.component.css'],
  animations: [
    trigger('slideCard', [
      state(
        'hidden',
        style({
          transform: 'translateX(100%)',
          opacity: 0,
          visibility: 'hidden',
        }),
      ),
      state(
        'visible',
        style({
          transform: 'translateX(0)',
          opacity: 1,
          visibility: 'visible',
        }),
      ),
      transition('hidden => visible', [
        style({ visibility: 'visible' }),
        animate('400ms ease-out'),
      ]),
      transition('visible => hidden', [animate('300ms ease-in')]),
    ]),
  ],
})
export class AppComponent {
  showLayout = true; // 👈 login वर layout hide करण्यासाठी
  TOAST_POSITIONS = TOAST_POSITIONS;
  // left sidenav
  collapsed = signal(false);
  sidenavWidth = computed(() => (this.collapsed() ? '0px' : '250px'));

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const currentUrl = event.urlAfterRedirects;
        this.showLayout = !currentUrl.startsWith('/auth/login');
      }
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.onResize();
    }
  }

  // Automatically collapse when screen < 768px
  @HostListener('window:resize', [])
  onResize() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (window.innerWidth < 768) {
      this.collapsed.set(true);
    } else {
      this.collapsed.set(false);
    }
  }

  // right setting card
  cardOpen = false;
  toggleCard() {
    this.cardOpen = !this.cardOpen;
  }

  colors: string[] = ['green', 'pink', 'red', 'yellow'];
  selectedColor: string = '';

  selectColor(color: string) {
    this.selectedColor = color;
  }

  onColorPicked(event: any) {
    this.selectedColor = event.target.value;
  }

  logout() {
    // clear login data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // redirect to login page
    this.router.navigate(['/auth/login']);
  }
}
