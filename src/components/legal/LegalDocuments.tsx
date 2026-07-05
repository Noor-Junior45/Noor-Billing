import React from 'react';

interface LegalDocProps {
  standalone?: boolean;
}

export const PrivacyPolicy: React.FC<LegalDocProps> = ({ standalone = false }) => {
  return (
    <div className={`space-y-6 text-slate-700 leading-relaxed text-xs text-left ${standalone ? '' : 'max-h-[60vh] overflow-y-auto pr-2'}`}>
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Privacy Policy</h2>
        <p className="text-[10px] text-slate-400 font-mono mt-1">Last Updated: July 5, 2026</p>
      </div>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">1. Introduction</h3>
        <p>
          Welcome to <strong>Noor Billing</strong> ("we", "our", "us"). We are committed to protecting your personal information and your store's operational data. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our Point of Sale (POS) and Warehouse Billing Companion application.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">2. Data Storage & Architecture</h3>
        <p>
          Noor Billing uses a hybrid storage model designed to give you complete ownership and control over your store's database:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Local Storage & IndexedDB:</strong> By default, all your inventories, catalogs, staff profiles, customer lists, and invoice histories are stored locally within your browser's sandboxed environment. This data remains on your machine and is accessible even without an internet connection.
          </li>
          <li>
            <strong>Supabase Cloud Synchronization:</strong> If you sign in using your Admin credentials, your database is synced with your secure Supabase Cloud tenant instance. This sync transfers catalog details, sales histories, and staff pins encrypted in transit (SSL/TLS) and stored securely at rest.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">3. Information We Collect</h3>
        <p>
          To provide real-time retail billing, inventory tracking, and client ledger accounts, we process the following types of information:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Admin and Staff Accounts:</strong> Admin email addresses, full names, password hashes, registered staff usernames, roles, and access PINs.
          </li>
          <li>
            <strong>CRM & Customer Profiles:</strong> Customer names, phone numbers, email addresses, geographical locations, purchase limits, and ledger balances (active dues).
          </li>
          <li>
            <strong>Sales & Invoice Logs:</strong> Transaction summaries, payment modes, timestamp records, individual itemized lists, and applicable GST tax components.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">4. How We Use Your Information</h3>
        <p>
          We strictly utilize processed store information to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Authorize admin and staff privileges and prevent unauthorized checkout overrides.</li>
          <li>Reconcile daily shift cash logs and register drawer discrepancies.</li>
          <li>Generate sales metrics, tax summaries, and PDF receipt templates.</li>
          <li>Track credit ledgers and clear due balances for CRM contacts.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">5. Security of Your Data</h3>
        <p>
          We employ robust, industry-standard protocols to safeguard your store data. Administrative accounts are protected by multi-layered Supabase authentication guards. Password hashes are never accessible in plain text. Staff PINs are managed with custom security tokens. Offline backup archives can be exported and imported securely by the shop administrator at any time.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">6. Third-Party Sharing</h3>
        <p>
          We do not sell, rent, trade, or distribute your customer lists, sales records, or transaction ledgers to any marketing agencies or external third parties. Data is processed solely through your designated cloud databases or within your local hardware storage.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">7. Analytics & Tracking</h3>
        <p>
          We use <strong>Google Analytics</strong> (specifically Google tag ID G-X8GP03PX0T) to collect anonymous, aggregated usage statistics (such as page views, button interaction rates, session duration, and device configurations). This information helps us optimize the billing interface, enhance security, and resolve functional layout bugs. Google Analytics uses cookies to gather this data, which is governed by Google's Privacy Policy. No sensitive operational data, personal inventory logs, customer passwords, or financial transactions are ever sent to Google Analytics.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">8. Your Rights & Choice</h3>
        <p>
          You have full authority to modify, export, or erase your entire database. You can perform a complete system wipe using the <strong>"Factory Reset"</strong> feature inside the settings dropdown, which permanently removes all local cached data, user tokens, and offline inventories on your device. You may also disable cookies or use ad blockers to prevent Google Analytics tracking.
        </p>
      </section>

      <section className="space-y-2 border-t border-slate-200 pt-4">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Contact Us</h3>
        <p>
          For queries, assistance, or clarification regarding this Privacy Policy, please reach out to Noor Billing Help Desk at <strong>noorpos.alerts@gmail.com</strong>.
        </p>
      </section>
    </div>
  );
};

export const TermsOfService: React.FC<LegalDocProps> = ({ standalone = false }) => {
  return (
    <div className={`space-y-6 text-slate-700 leading-relaxed text-xs text-left ${standalone ? '' : 'max-h-[60vh] overflow-y-auto pr-2'}`}>
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Terms of Service</h2>
        <p className="text-[10px] text-slate-400 font-mono mt-1">Last Updated: July 5, 2026</p>
      </div>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">1. Agreement to Terms</h3>
        <p>
          By accessing or using <strong>Noor Billing</strong>, you agree to be bound by these Terms of Service. If you do not agree with any of these provisions, you are prohibited from utilizing this billing application.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">2. Scope of License</h3>
        <p>
          We grant you a non-exclusive, non-transferable, revocable license to use Noor Billing solely for your internal business operations, including point of sale checkout, inventory cataloging, staff management, and client accounting.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">3. User Responsibilities & Account Security</h3>
        <p>
          As an administrator of your store instance:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>You are responsible for safeguarding your master Supabase administrator credentials and staff login PINs.</li>
          <li>You must ensure all customer information collected within the CRM tab is processed in compliance with local consumer protection regulations.</li>
          <li>You agree not to exploit the application for fraudulent billing or illegal transaction tracking.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">4. Offline Sandbox Demo Mode</h3>
        <p>
          The <strong>"Run Sandbox Demo Mode"</strong> operates entirely in an offline sandboxed context. Data created during Sandbox mode is transient to your specific browser cache. Clearing your browser cache or resetting your application will permanently erase sandbox catalogs, transaction logs, and CRM ledgers. We accept no liability for data loss arising from sandbox usage.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">5. Disclaimer of Warranties</h3>
        <p>
          Noor Billing is provided on an "AS IS" and "AS AVAILABLE" basis. We make no express or implied warranties regarding continuous uptime, server synchronization accuracy, barcode scanner hardware compatibility, or printing hardware reliability. You are strongly advised to export manual backup files regularly via the <strong>"Export Backup"</strong> module.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">6. Limitation of Liability</h3>
        <p>
          To the maximum extent permitted by law, in no event shall Noor Billing or its contributors be liable for any direct, indirect, incidental, special, exemplary, or consequential damages (including, but not limited to, loss of profits, business interruption, or loss of transactional data) however caused, even if advised of the possibility of such damage.
        </p>
      </section>

      <section className="space-y-2 border-t border-slate-200 pt-4">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">7. Changes to Terms</h3>
        <p>
          We reserve the right to revise or amend these Terms of Service at any time. Continued use of the application following any modifications signifies your explicit consent to the updated terms.
        </p>
      </section>
    </div>
  );
};
