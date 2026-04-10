import { Component, computed, Input, signal } from '@angular/core';

export type MenuItem = {
  icon: string;
  label: string;
  route?: string;
  subItems?: MenuItem[];
};

@Component({
  selector: 'app-custom-sidenav',
  standalone: false,
  template: `
    <div class="scrollwrap scrollwrap_delayed">
      <div class="sidenav-header">
        <img
          [width]="profilePicSize()"
          [height]="profilePicSize()"
          src="/assets/images/logo.jpeg"
        />
        <div class="header-text" [class.hide-header-text]="sideNavCollapsed()">
          <!-- <h6>MV Bramhangaon</h6> -->
          <span class="typewriter"></span>
          <p>Ship Builders, Ship Repairers & Enginners</p>
        </div>
      </div>
      <mat-nav-list style="border-radius: 0">
        @for (item of menuItems(); track item.label) {
          <app-menu-item [item]="item" [collapsed]="sideNavCollapsed()" />
        }
      </mat-nav-list>
    </div>
  `,
  styles: [
    `
      :host * {
        transition: all 500ms ease-in-out;
      }

      /* ===== Typewriter Animation ===== */
      @keyframes typing {
        0% {
          content: '';
        }
        5% {
          content: 'G';
        }
        10% {
          content: 'GO';
        }
        15% {
          content: 'GOA';
        }
        20% {
          content: 'S';
        }
        25% {
          content: 'SH';
        }
        30% {
          content: 'SHI';
        }
        35% {
          content: 'SHIP';
        }

        40% {
          content: '';
        }
        45% {
          content: 'Y';
        }
        50% {
          content: 'YA';
        }
        55% {
          content: 'YAR';
        }
        60% {
          content: 'YARD';
        }
        65% {
          content: '';
        }

        70% {
          content: 'L';
        }
        75% {
          content: 'LI';
        }
        80% {
          content: 'LIM';
        }
        85% {
          content: 'LIMI';
        }
        90% {
          content: 'LIMIT';
        }
        95% {
          content: 'LIMITE';
        }
        100% {
          content: 'LIMITED';
        }
      }

      /* ===== Text display element ===== */
      .typewriter::after {
        content: '';
        animation: typing 20s steps(20) infinite;
        white-space: nowrap;
        font-weight: bold;
        color: #3f51b5;
        font-size: 18px;
      }

      .typewriter {
        display: inline-block;
        position: relative;
      }

      .typewriter::after {
        border-right: 2px solid #3f51b5;
        padding-right: 4px;
        animation:
          typing 8s steps(20) infinite,
          blink 0.7s step-end infinite alternate;
      }

      @keyframes blink {
        50% {
          border-color: transparent;
        }
      }

      @media (prefers-reduced-motion) {
        .typewriter::after {
          animation: none;
        }

        @keyframes sequencePopup {
          0%,
          100% {
            content: 'developer';
          }
          25% {
            content: 'writer';
          }
          50% {
            content: 'reader';
          }
          75% {
            content: 'human';
          }
        }

        .typewriter::before {
          content: 'developer';
          animation: sequencePopup 12s linear infinite;
        }
      }

      .sidenav-header {
        padding-top: 24px;
        text-align: center;

        > img {
          border-radius: 100%;
          object-fit: cover;
          margin-bottom: 8px;
        }

        .header-text {
          height: 2.4rem;

          > h6 {
            margin: 0;
            font-size: 17px;
            line-height: 0.7rem;
          }

          > p {
            margin: 0;
            font-size: 0.8rem;
          }
        }
      }

      .hide-header-text {
        opacity: 0;
        height: 0px !important;
      }

      .mat-mdc-nav-list .mat-mdc-list-item {
        border-radius: 0 !important;
      }

      /* scrollbar and visibility on hover and facus */

      .scrollwrap {
        overflow-y: auto;
        visibility: hidden;
        height: calc(100% - 0.65rem);
      }

      .sidenav-header,
      mat-nav-list,
      .scrollwrap:hover,
      .scrollwrap:focus {
        visibility: visible;
      }

      .scrollwrap_delayed {
        transition: visibility 0.5s 0.2s;
      }
      .scrollwrap_delayed:hover {
        transition: visibility 0.2s 0.2s;
      }
      .scrollwrap::-webkit-scrollbar {
        width: 10px;
      }
      .scrollwrap::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollwrap::-webkit-scrollbar-thumb {
        background-color: #556268;
        border-radius: 20px;
      }
      .scrollwrap {
        scrollbar-width: thin;
        scrollbar-color: #556268 transparent;
      }
    `,
  ],
})
export class CustomSidenavComponent {
  sideNavCollapsed = signal(false);
  @Input() set collapsed(val: boolean) {
    this.sideNavCollapsed.set(val);
  }

  menuItems = signal<MenuItem[]>([
    {
      icon: 'message',
      label: 'Inbox',
    },
    {
      icon: 'dashboard',
      label: 'Dashboard',
    },
    {
      icon: 'poll',
      label: 'Master',
      route: 'master',
      subItems: [
        {
          icon: 'subdirectory_arrow_right',
          label: 'Department',
          route: '/department',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Designation',
          route: '/designation',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Employee',
          route: '/employee',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Assets',
          route: '/assets',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Assets Make',
          route: '/assets-make',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Purchase Order',
          route: '/purchase-order',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Assets Type',
          route: '/assets-type',
        },
      ],
    },
    {
      icon: 'supervisor_account',
      label: 'Transaction',
      route: '/transaction',
      subItems: [
        {
          icon: 'subdirectory_arrow_right',
          label: 'My Assets',
          route: '/my-asset',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Call Logging',
          route: '/call-logging',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Assets Allocation',
          route: '/asset-allocation',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Spare Entry',
          route: '/spare-entry',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Assets Returned',
          route: '/asset-return',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Miscellaneous Assets Bought',
          route: '/asset-bought',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Assets Replacement',
          route: '/asset-replacement',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Assets Status Change',
          route: '/asset-status',
        },
      ],
    },
    {
      icon: 'supervisor_account',
      label: 'Reports',
      route: '/report',
      subItems: [
        {
          icon: 'subdirectory_arrow_right',
          label: 'Call Logging Report',
          route: '/call-logging-report',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Material Returned Through RGP',
          route: '/rgp-report',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'Material Returned Through NRGP',
          route: '/nrgp-report',
        },
      ],
    },
    {
      icon: 'table',
      label: 'Authorisation',
      route: '/authorisation',
      subItems: [
        {
          icon: 'subdirectory_arrow_right',
          label: 'User Creation',
          route: '/user-create',
        },
        {
          icon: 'subdirectory_arrow_right',
          label: 'User Locking',
          route: '/user-locking',
        },
        //{
        //  icon: 'subdirectory_arrow_right',
        //  label: 'Grant User Authorisation',
        //  route: '/grand-user',
        //},
        //{
        //  icon: 'subdirectory_arrow_right',
        //  label: 'User Unlocking Initialization',
        //  route: '/user-unlocking',
        //},
        {
          icon: 'subdirectory_arrow_right',
          label: 'User Password Initialization',
          route: '/user-password',
        },
      ],
    },
  ]);

  profilePicSize = computed(() => (this.sideNavCollapsed() ? 32 : 100));
}
